############# ############# ############# ############# ############## findSimilarPlaces# by JAG3## v2.0 - Analyze structured social media data to#       identify similar places.############## ############# ############# ############# #############from pyspark import SparkConf, SparkContextfrom pyspark.sql import SQLContextfrom pyspark.sql.types import BooleanTypefrom pyspark.mllib.regression import LabeledPointfrom pyspark.mllib.tree import RandomForestimport sysimport argparseimport jsonimport codecssys.path.insert(0, './lib/')import clusteringimport pointClassimport aggregatedComparisonimport shapeReaderimport fspLibimport timedef testPoly(sqlContext, sc, lTest, lTrain, lStop, bTDU):    #Partition data into 3 parts: train (positive examples), train (negative examples), and test (this polygon)    t1 = time.time()    bc_lTestPoly  = sc.broadcast(lTest)    bc_lTrainPoly = sc.broadcast(lTrain)    sqlContext.registerFunction("inRegionOfTrain", lambda lat, lon: fspLib.inROI(lat, lon, bc_lTrainPoly), returnType=BooleanType())    sqlContext.registerFunction("inRegionOfTest", lambda lat, lon: fspLib.inROI(lat, lon, bc_lTestPoly), returnType=BooleanType())    sqlContext.registerFunction("inEventOfTrain", lambda lat, lon, dt: fspLib.inEOI(lat, lon, dt, bc_lTrainPoly), returnType=BooleanType())    sqlContext.registerFunction("inEventOfTest", lambda lat, lon, dt: fspLib.inEOI(lat, lon, dt, bc_lTestPoly), returnType=BooleanType())    sqlContext.registerFunction("outOfEventOfTain", lambda lat, lon, dt: fspLib.outEOI(lat, lon, dt, bc_lTrainPoly),returnType=BooleanType())    sqlContext.registerFunction("outOfEventOfTest", lambda lat, lon, dt: fspLib.outEOI(lat, lon, dt, bc_lTestPoly),returnType=BooleanType())    df1 = sqlContext.sql("SELECT * FROM records WHERE inRegionOfTrain(records.lat, records.lon) OR inRegionOfTest(records.lat, records.lon)").cache()    df1.registerTempTable("df1")    nTotal = df1.count()    df1_pos = sqlContext.sql("SELECT * FROM df1 WHERE inEventOfTrain(df1.lat, df1.lon, df1.dt)").cache()    nIn = df1_pos.count()    df1_neg = sqlContext.sql("SELECT * FROM df1 WHERE (outOfEventOfTain(df1.lat, df1.lon, df1.dt) AND outOfEventOfTest(df1.lat, df1.lon, df1.dt)) OR ((outOfEventOfTain(df1.lat, df1.lon, df1.dt) OR outOfEventOfTest(df1.lat, df1.lon, df1.dt)) AND NOT inRegionOfTest(df1.lat, df1.lon))")    if bTDU:        df1_neg = sqlContext.sql("SELECT * FROM df1 WHERE outOfEventOfTain(df1.lat, df1.lon, df1.dt) OR outOfEventOfTest(df1.lat, df1.lon, df1.dt)")    df1_neg.cache()    nOut = df1_neg.count()    dfAp = sqlContext.sql("SELECT * from df1 WHERE inEventOfTest(df1.lat, df1.lon, df1.dt)").cache()    nAp = dfAp.count()    diff = time.time()-t1    print "Time to find in and out of ROI", diff    print "NTotal:", nTotal, "N in:", nIn, ", N out:", nOut, ", N ap:", nAp    retList = [None,[]]    if nAp == 0:        return retList    #format all data for use in ML model    t1 = time.time()    groupedIn = df1_pos.map(lambda x: (x.key, [LabeledPoint(1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()    groupedOut = df1_neg.map(lambda x: (x.key, [LabeledPoint(-1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()    mlApply    = dfAp.map(lambda x: (x.key, [LabeledPoint(-1.0, x.vector), x.lat, x.lon, x.size, x.binSize, x.dt])).cache()    scaleFactor = (10.*nIn)/float(nOut)    (junk, groupedUse) = groupedOut.randomSplit([1-scaleFactor,scaleFactor])    mlTrain = groupedIn.union(groupedUse)    if len(lStop) != 0:        mlTrain = mlTrain.map(lambda x: aggregatedComparison.removeStopWords(x,lStop))    mlTrain.cache()    nTotTrain = mlTrain.count()    mlApply.cache()    nApply = mlApply.count()    t2 = time.time()    print nTotTrain, "entries for training"    diff = t2-t1    print "Time to get data ready for model by time", diff    #train model    t1 = time.time()    model_Tree = RandomForest.trainRegressor(mlTrain.map(lambda x: x[1][0]), categoricalFeaturesInfo={}, numTrees=25, featureSubsetStrategy="auto", impurity="variance", maxDepth=4, maxBins=32)    diff = time.time()-t1    print "Time to train model", diff    #apply model to polygon of interest, get results    t1 = time.time()    predictions_Tree = model_Tree.predict(mlApply.map(lambda x: x[1][0].features))    vecAndPredictions = mlApply.zip(predictions_Tree)    vecAndPredictions.cache()    vecAndPredictions.count()    results = vecAndPredictions.collect()    retList[0] = results[0][0][1][5].date().isoformat()    for point in results:        record = point[0][1]        off = record[4]/2.        lat = record[1] + off if record[1] > 0 else record[1] - off        lon = record[2] + off if record[2] > 0 else record[2] - off        thisCluster = {"score":point[1], "dict":[], "lat":lat, "lon":lon, "nTotal":record[3]}        thisCluster["poly"] = [[lat+off,lon+off],[lat+off,lon-off],[lat-off,lon-off],[lat-off,lon+off]]        retList[1].append(thisCluster)    diff = time.time()-t1    print "Time to apply model and format results", diff    return retListdef run(jobNm,sc,sqlContext,inputFile,lPolygon,dictFile,        nDataType=0,        inputPartitions=-1,        writeFileOutput=True,        strStop=''):    stopSet = set(strStop.split(',')) if strStop !='' else set()    t0 = time.time()    #Read in data, done once for all data    t1 = time.time()    records = aggregatedComparison.loadPoint(sc, sqlContext, inputFile, inputPartitions).cache()    nGoodTweets = records.count()    #Read in dictionary, once for all data    revLookup = []    lStop = []    fDict = None    if dictFile[:3] == 's3:' or dictFile[:5] == 'hdfs:':        # read dict file from hdfs        fDict = sc.textFile(dictFile).collect()    else:        # read from local file        fDict = open(dictFile,"r")    for line in fDict:        terms = line.split("\t")        revLookup.append(terms[0])        if terms[0] in stopSet:            lStop.append(terms[1])    diff = time.time() - t1    print "Time to read in data & dict", diff    #Itterate over the inputPolygons, train model on other areas,    #apply to polygon under inspection, then add them to the list    #of scored points.    dates = {}    for p in range(len(lPolygon)):        if len(lPolygon[p].dates)>1:            for t in range(len(lPolygon[p].dates)):                lTest = [pointClass.spaceTimePlane(lPolygon[p].poly, [lPolygon[p].dates[t]], lPolygon[p].name, fromPoly=True)]                otherDates = lPolygon[p].dates[:t]                otherDates.extend(lPolygon[p].dates[t+1:])                lTrain = [pointClass.spaceTimePlane(lPolygon[p].poly,                                                    otherDates,                                                    lPolygon[p].name,                                                    fromPoly=True)]                lTrain.extend(lPolygon[:p])                lTrain.extend(lPolygon[p+1:])                date = testPoly(sqlContext,sc,lTest,lTrain,lStop,False)                if len(date[1])==0:                    print lTest[0],"has no scorable points"                else:                    if date[0] in dates.keys():                        dates[date[0]]["clusters"].extend(date[1])                    else:                        dates[date[0]]={}                        dates[date[0]]["clusters"] = date[1]        else:            lTest = [lPolygon[p]]            lTrain = lPolygon[:p]            lTrain.extend(lPolygon[p+1:])            date = testPoly(sqlContext,sc,lTest,lTrain,lStop,True)            if len(date[1])==0:                print lTest[0],"has no scoreable points"            else:                if date[0] in dates.keys():                    dates[date[0]]["clusters"].extend(date[1])                else:                    dates[date[0]]={}                    dates[date[0]]["clusters"] = date[1]    retDict = {"type":"event", "dates":dates, "modelDict":[]}    with codecs.open("scoreFiles/"+jobNm, encoding="utf-8",mode="wb") as fOut:        json.dump(retDict, fOut)    nVecLen = len(revLookup)    t2 = time.time()    diff = t2-t1    print "Time to read dict:", diff    diff = time.time() - t0    print "<----------BOOM GOES THE DYNOMITE!---------->"    print "< total number of tweets:,", nGoodTweets    print "< total process Time:", diff    print "<------------------------------------------->"if __name__ == "__main__":    parser = argparse.ArgumentParser()    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")    parser.add_argument("polygonShapeFile", help="csv file specifying the bounding box for areas of interest")    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Events'",default='findEvents')    parser.add_argument("-dictFile", help="Dictionary file to read in", default="dictFiles/dict_combinedIDF")    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)    parser.add_argument("-strStop", help="Comma delimited list of stop words to be removed from training", default="")    args = parser.parse_args()    inputFile = args.inputFile    shapeFile = args.polygonShapeFile    jobNm = args.jobNm    dictFile = args.dictFile    nDataType = args.datTyp    inputPartitions = args.partitions    strStop = args.strStop    conf = SparkConf().setAppName(jobNm)    sc = SparkContext(conf = conf)    sqlContext = SQLContext(sc)    #Create polygon list and broadcast variable based on it    lPolygon = shapeReader.readInShapeJson(shapeFile)    outList = []    run(jobNm, sc, sqlContext, inputFile, lPolygon, dictFile,        nDataType=nDataType,        inputPartitions=inputPartitions,        strStop=strStop)