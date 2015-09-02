############# ############# ############# ############# #############
# refindSimilarPlaces
# by JAG3
#
# v2.0 - Analyze structured social media data to
#       identify similar places, using models trained on
#       alternate data sets
#
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext
from pyspark.mllib.regression import LabeledPoint
from pyspark.mllib.tree import  RandomForestModel
import sys
import argparse
sys.path.insert(0, './lib/')
import clustering
import aggregatedComparison
import time

def run(jobNm, sc, sqlContext, inputFile, dictFile,
        bByDate=False,
        inputPartitions=-1,
        sNum=30,
        modelPath=None,
        bWriteMonitor=False,
        writeFileOutput=False):

    # import monitoring if needed
    if bWriteMonitor:
        import  plotting

    #Create monitoring plot and associated vectors
    mPX = range(8)
    mPY = [0.]*8
    mSL = ["Create Feature Map", "Read in Data", "Aggregate for M.L.", "Read in Model", "Apply Model", "Output Results"]
    mInd = 0

    t0 = time.time()
    #Find the word document frequency for the corpus
    #this is used for an idf score used in feature vector formation
    t1 = time.time()
    revLookup = []
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

    nVecLen = len(revLookup)
    t2 = time.time()
    diff = t2-t1
    print "Time to read dict", diff

    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    #Read in data and filter out entries with no valid words
    t1 = time.time()
    print 'inputFile ',inputFile
    print 'inputPartitions ',inputPartitions
    records = aggregatedComparison.loadPoint(sc, sqlContext, inputFile, inputPartitions)
    nGoodTweets = records.count()
    t2 = time.time()
    print "Number of good tweets:",nGoodTweets
    diff = t2-t1
    print "Time to read in data", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    #Format data for ML input
    t1 = time.time()
    mlApply = None
    if bByDate:
        mlApply = records.map(lambda x: (x.key, [LabeledPoint(1.0, x.vector), x.lat, x.lon, x.size, x.binSize, x.dt])).cache()
    else:
        mlApply = records.map(lambda x: (x.key, [LabeledPoint(1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()
    nApp = mlApply.count()
    t2 = time.time()
    print "Number of collapsed points:", nApp
    diff = t2-t1
    print "Time to map points", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
        plotting.updateMonitorPlot(mPX, mPY, mSL, jobNm)

    # Read in Model
    t1 = time.time()
    model_Tree = RandomForestModel.load(sc, modelPath)
    t2 = time.time()
    diff = t2-t1
    print "Time to read in model", diff
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
    resultSet = clustering.locationBasedOutputV2(bByDate, jobNm, vecAndPredictions, sNum, revLookup, writeFileOutput, [])
    t2 = time.time()
    diff = t2-t1
    print "Time to create json objects for output: ", diff
    if bWriteMonitor:
        mPY[mInd] = diff
        mInd = mInd+1
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
    parser.add_argument("modelSavePath", help="Path where model data is stored")
    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Events'",default='findEvents')
    parser.add_argument("-dictFile", help="Dictionary file to read in", default="dictFiles/dict_combinedIDF")
    parser.add_argument("-sThresh", type=float, help="ordered percentage describing the number of scored entries to return. default=1.0",default=30)
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("-bByDate", help="Bool to switch on date partitioning", default=False)
    parser.add_argument("-bWriteMonitor", help="Write monitoring histogram(s)", type=bool, default=False)
    args = parser.parse_args()

    inputFile = args.inputFile
    modelPath = args.modelSavePath
    jobNm = args.jobNm
    dictFile = args.dictFile
    nDataType = args.datTyp
    sNum = args.sThresh
    inputPartitions = args.partitions
    bByDate = args.bByDate
    bWriteMonitor = args.bWriteMonitor

    conf = SparkConf().setAppName(jobNm)
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    run(jobNm, sc, sqlContext, inputFile, dictFile,
        inputPartitions=inputPartitions,
        sNum=sNum,
        modelPath=modelPath,
        bWriteMonitor=bWriteMonitor,
        bByDate = bByDate,
        writeFileOutput=True)
