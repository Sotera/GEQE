############# ############# ############# ############# #############
# findSimilarEvents
# by JAG3
#
# v2.0 - Analyze structured social media data to
#       identify similar events.
#
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext, Row
from pyspark.sql.types import BooleanType
from operator import add
from pyspark.mllib.regression import LabeledPoint
from pyspark.mllib.tree import RandomForest, RandomForestModel
import json
import sys
import argparse
import codecs
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
        import monitoring

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
    records = aggregatedComparison.loadPoint(sc, sqlContext, inputFile, inputPartitions)
    nGoodTweets = records.count()
    t2 = time.time()
    print "Number of good points:", nGoodTweets
    diff = t2-t1
    print "Time to read in and filter nonscorable words", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        monitoring.updatePlot(mPX, mPY, mSL, jobNm)


    #Find the word document frequency for the corpus
    #this is used for an idf score used in feature vector formation
    t1 = time.time()
    revLookup = []
    lStop = []
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
    print "Time to read dict: ", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        monitoring.updatePlot(mPX, mPY, mSL, jobNm)

    # Split data into training and apply samples
    # training data is 2 parts, as well as prepare application data
    # i.)  In both the region, and in the time window
    # ii.) In the region, but outside the time window
    # iii.) Out of region, data to apply model to
    t1 = time.time()
    sqlContext.registerFunction("inRegionOfInterest", lambda lat,lon: fspLib.inROI(lat,lon,bc_lTargetPolygons),returnType=BooleanType())
    sqlContext.registerFunction("inEventOfInterest", lambda lat,lon,date: fspLib.inEOI(lat,lon,date,bc_lTargetPolygons),returnType=BooleanType())
    sqlContext.registerFunction("outOfEventOfInterest", lambda lat,lon,dt: fspLib.outEOI(lat,lon,dt,bc_lTargetPolygons),returnType=BooleanType())
    df1 = sqlContext.sql("SELECT * from records WHERE inRegionOfInterest(records.lat,records.lon)").cache()
    df1.registerTempTable("df1")
    df1_inTime = sqlContext.sql("SELECT * from df1 WHERE inEventOfInterest(df1.lat,df1.lon,df1.dt)").cache()
    #df1_outTime = sqlContext.sql("SELECT * from df1 WHERE outOfEventOfInterest(df1.lat,df1.lon,df1.dt)").cache()
    dfn1 =  sqlContext.sql("SELECT * from records WHERE NOT inRegionOfInterest(records.lat,records.lon)")
    df1_inTime.registerTempTable("df1_inTime")
    #df1_outTime.registerTempTable("df1_outTime")
    #nL1T1 = df1_inTime.count()
    #nL1T0 = df1_outTime.count()
    exempDict = aggregatedComparison.exemplarDict(df1_inTime, revLookup)
    t2 = time.time()
    #print nL1T1, "events in region in time,", nL1T0, "events in region out of time"
    diff = t2-t1
    print "Time to partition by time", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        monitoring.updatePlot(mPX, mPY, mSL, jobNm)

    # Create training vectors from in region data
    t1 = time.time()
    groupedIn  = df1_inTime.map(lambda x: (x.key, [LabeledPoint(1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()
    #groupedOut = df1_outTime.map(lambda x: (x.key, [LabeledPoint(-1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()
    groupedOut = dfn1.map(lambda x: (x.key, [LabeledPoint(-1.0, x.vector), x.lat, x.lon, x.size, x.binSize, x.dt])).cache()
    nSignal = float(groupedIn.count())
    nBack = float(groupedOut.count())
    scaleFactor = 10.*nSignal/nBack
    (mlApply, groupedUse) = groupedOut.randomSplit([1-scaleFactor,scaleFactor])
    mlApply.cache()
    mlTrain = groupedIn.union(groupedUse).cache()
    if len(lStop) != 0:
        mlTrain = mlTrain.map(lambda x: aggregatedComparison.removeStopWords(x, lStop))
    mlTrain.cache()
    nTotTrain = mlTrain.count()
    t2 = time.time()
    print nTotTrain, "entries for training"
    diff = t2-t1
    print "Time to get data ready for model by time", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        monitoring.updatePlot(mPX, mPY, mSL, jobNm)

    # train model
    t1 = time.time()
    model_Tree = RandomForest.trainRegressor(mlTrain.map(lambda x: x[1][0]), categoricalFeaturesInfo={}, numTrees=2000, featureSubsetStrategy="auto", impurity="variance", maxDepth=4, maxBins=32)
    if modelSavePath is not None:
        if modelSavePath[-1] != "/": modelSavePath = modelSavePath+"/"
        model_Tree.save(sc, modelSavePath + jobNm)
    t2 = time.time()
    diff = t2-t1
    print "Time to train model", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        monitoring.updatePlot(mPX, mPY, mSL, jobNm)

    # Apply Model to out of region data
    t1 = time.time()
    predictions_Tree = model_Tree.predict(mlApply.map(lambda x: x[1][0].features))
    vecAndPredictions = mlApply.zip(predictions_Tree)
    vecAndPredictions.cache()
    vecAndPredictions.count()
    t2 = time.time()
    #print "Number of points to score:", nApply
    diff = t2-t1
    print "Time aggregate and label points: ", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        monitoring.updatePlot(mPX, mPY, mSL, jobNm)

    #Get the results
    t1 = time.time()
    resultSet = clustering.locationBasedOutputV2(True, jobNm, vecAndPredictions, sNum, revLookup, writeFileOutput, exempDict)
    t2 = time.time()
    diff = t2-t1
    print "Time to create json objects for output: ", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        monitoring.updatePlot(mPX, mPY, mSL, jobNm)

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
