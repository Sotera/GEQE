############# ############# ############# ############# #############
# findSimilarPlaces
# by JAG3
#
# v2.0 - Analyze structured social media data to
#       identify similar places.
#
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext
from pyspark.sql.types import BooleanType
from pyspark.mllib.regression import LabeledPoint
from pyspark.mllib.tree import RandomForest
import sys
import argparse
sys.path.insert(0, './lib/')
import clustering
import aggregatedComparison
import shapeReader
import fspLib
import time


def run(jobNm,sc,sqlContext,inputFile,lPolygon,dictFile,
        nDataType=0,
        inputPartitions=-1,
        sNum=30,
        modelSavePath=None,
        bWriteMonitor=False,
        writeFileOutput=True,
        strStop=''):

    if bWriteMonitor:
        import plotting

    bc_lTargetPolygons = sc.broadcast(lPolygon)
    stopSet = set(strStop.split(',')) if strStop !='' else set()


    #Create monitoring plot and associated vectors
    mPX = range(7)
    mPY = [0.]*7
    mSL = ["Initial Read", "Calculate IDF", "Partition for M.L.", "Create Training Vector", "Train Model", "Apply Model", "Prepare Output Data"]
    mInd = 0

    t0 = time.time()
    #Read in data and filter out entries with no valid words
    t1 = time.time()
    print 'inputFile ',inputFile
    print 'inputPartitions ',inputPartitions
    records = aggregatedComparison.loadPoint(sc, sqlContext, inputFile, inputPartitions)
    nGoodTweets = records.count()
    t2 = time.time()
    print "Number of good tweets:",nGoodTweets
    diff = t2-t1
    print "Time to read in and filter nonscorable words", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    #Find the word document frequency for the corpus
    #this is used for an idf score used in feature vector formation
    t1 = time.time()
    revLookup = []
    lStop = []
    fDict = None
    if dictFile[:3] == 's3:' or dictFile[:5] == 'hdfs:':
        # read dict file from hdfs
        fDict = sc.textFile(dictFile).collect()
    else:
        # read from local file
        fDict = open(dictFile,"r")
    for line in fDict:
        terms = line.split("\t")
        revLookup.append(terms[0])
        if terms[0] in stopSet:
            lStop.append(terms[1])

    nVecLen = len(revLookup)
    t2 = time.time()
    diff = t2-t1
    print "Time to read dict:", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    # Split data into training and apply samples
    # training data is 2 parts, inside r.o.i., and a sample of the areas outside the r.o.i.
    t1 = time.time()
    sqlContext.registerFunction("inRegionOfInterest", lambda lat,lon: fspLib.inROI(lat,lon,bc_lTargetPolygons),returnType=BooleanType())
    df1 = sqlContext.sql("SELECT * from records WHERE inRegionOfInterest(records.lat,records.lon)").cache()
    df1.registerTempTable("df1")
    nIn = df1.count()
    dfn1 = sqlContext.sql("SELECT * from records WHERE NOT inRegionOfInterest(records.lat,records.lon)").cache()
    dfn1.registerTempTable("dfn1")
    nOut = dfn1.count()
    modelDict = aggregatedComparison.exemplarDict(df1, revLookup)
    t2 = time.time()
    diff = t2-t1
    print "Time to find in and out of ROI", diff
    print "N in:", nIn, ", N out:", nOut
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    # Create training vectors from in region data, and sample of out region data
    t1 = time.time()
    #grouped = aggregatedComparison.createAggregatedLabledPoint(df1, False, fBinSize, bc_dIDF, True, bc_lStopWords, nGoodTweets, 1.0)
    #grouped2 = aggregatedComparison.createAggregatedLabledPoint(dfn1, False, fBinSize, bc_dIDF, True, bc_lStopWords, nGoodTweets, -1.0)
    #nSignal = float(grouped.count())
    #nBack = float(grouped2.count())
    groupedIn = df1.map(lambda x: (x.key, [LabeledPoint(1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()
    groupedOut = dfn1.map(lambda x: (x.key, [LabeledPoint(-1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()
    scaleFactor = (10.*nIn)/float(nOut)
    (mlApply, groupedUse) = groupedOut.randomSplit([1-scaleFactor,scaleFactor])
    mlTrain = groupedIn.union(groupedUse).cache()
    if len(lStop) != 0:
        mlTrain = mlTrain.map(lambda x: aggregatedComparison.removeStopWords(x,lStop))
    nTotTrain = mlTrain.count()
    mlApply.cache()
    nApply = mlApply.count()
    t2 = time.time()
    print nTotTrain, "entries for training"
    diff = t2-t1
    print "Time to get data ready for model by time", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    # train model
    t1 = time.time()
    model_Tree = RandomForest.trainRegressor(mlTrain.map(lambda x: x[1][0]), categoricalFeaturesInfo={}, numTrees=100, featureSubsetStrategy="auto", impurity="variance", maxDepth=4, maxBins=32)
    if modelSavePath is not None:
        if modelSavePath[-1] != "/": modelSavePath = modelSavePath+"/"
        model_Tree.save(sc, modelSavePath + jobNm)
    t2 = time.time()
    diff = t2-t1
    print "Time to train model", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    # apply model
    t1 = time.time()
    predictions_Tree = model_Tree.predict(mlApply.map(lambda x: x[1][0].features))
    vecAndPredictions = mlApply.zip(predictions_Tree)
    vecAndPredictions.cache()
    vecAndPredictions.count()
    t2 = time.time()
    diff = t2-t1
    print "Time to apply model: ", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    #Get the results
    t1 = time.time()
    resultSet = clustering.locationBasedOutputV2(False, jobNm, vecAndPredictions, sNum, revLookup, writeFileOutput, modelDict)
    t2 = time.time()
    diff = t2-t1
    print "Time to create json objects for output: ", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    diff = time.time() - t0
    print "<----------BOOM GOES THE DYNOMITE!---------->"
    print "< total number of tweets:,", nGoodTweets
    print "< total process Time:", diff
    print "< total idf vector length:", nVecLen
    print "<------------------------------------------->"
    return resultSet

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("polygonShapeFile", help="csv file specifying the bounding box for areas of interest")
    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Events'",default='findEvents')
    parser.add_argument("-dictFile", help="Dictionary file to read in", default="dictFiles/dict_combinedIDF")
    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)
    parser.add_argument("-sThresh", type=float, help="ordered percentage describing the number of scored entries to return. default=1.0",default=1.0)
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("-modelSavePath", help="Save Random Forest Model for reuse", default=None)
    parser.add_argument("-bWriteMonitor", help="Write monitoring histogram(s)", type=bool, default=False)
    parser.add_argument("-strStop", help="Comma delimited list of stop words to be removed from training", default="")
    args = parser.parse_args()

    inputFile = args.inputFile
    shapeFile = args.polygonShapeFile
    jobNm = args.jobNm
    dictFile = args.dictFile
    nDataType = args.datTyp
    sNum = args.sThresh
    inputPartitions = args.partitions
    modelSavePath = args.modelSavePath
    bWriteMonitor = args.bWriteMonitor
    strStop = args.strStop

    conf = SparkConf().setAppName(jobNm)
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    #Create polygon list and broadcast variable based on it
    lPolygon = shapeReader.readInShapeJson(shapeFile)

    run(jobNm, sc, sqlContext, inputFile, lPolygon, dictFile,
        nDataType=nDataType,
        inputPartitions=inputPartitions,
        sNum=sNum,
        modelSavePath=modelSavePath,
        bWriteMonitor=bWriteMonitor,
        strStop=strStop)
