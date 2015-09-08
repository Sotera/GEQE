############# ############# ############# ############# #############
# locationROC
# by JAG3
#
# v1.0 -  Generate ROC curves for location based models
#
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext
from pyspark.sql.types import BooleanType
from pyspark.mllib.regression import LabeledPoint
from pyspark.mllib.tree import RandomForest
import sys
import argparse
import json
import codecs
sys.path.insert(0, './lib/')
import aggregatedComparison
import shapeReader
import fspLib
import plotting
import time

def locationTest(sc, sqlContext, lPolygon, lStop):
    #Partition data into 4 parts: train (positive examples), train (negative examples), test (pos), test (neg)
    t1 = time.time()
    lAllPoly = lPolygon[0]
    lAllPoly.extend(lPolygon[1])
    lAllPoly.extend(lPolygon[2])
    bc_AllPoly = sc.broadcast(lAllPoly)
    bc_PosTrainPoly = sc.broadcast(lPolygon[0])
    bc_PosTestPoly  = sc.broadcast(lPolygon[1])
    bc_NegTestPoly  = sc.broadcast(lPolygon[2])
    sqlContext.registerFunction("posTrain", lambda lat, lon: fspLib.inROI(lat, lon, bc_PosTrainPoly), returnType=BooleanType())
    sqlContext.registerFunction("negTrain", lambda lat, lon: fspLib.inROI(lat, lon, bc_AllPoly), returnType=BooleanType())
    sqlContext.registerFunction("posTest",  lambda lat, lon: fspLib.inROI(lat, lon, bc_PosTestPoly), returnType=BooleanType())
    sqlContext.registerFunction("negTest",  lambda lat, lon: fspLib.inROI(lat, lon, bc_NegTestPoly), returnType=BooleanType())
    df1  = sqlContext.sql("SELECT * FROM records WHERE posTrain(records.lat, records.lon)").cache()
    dfn1 = sqlContext.sql("SELECT * FROM records WHERE NOT negTrain(records.lat, records.lon)").cache()
    dap  = sqlContext.sql("SELECT * FROM records WHERE posTest(records.lat, records.lon)").cache()
    dan  = sqlContext.sql("SELECT * FROM records WHERE negTest(records.lat, records.lon)").cache()
    nInTrain = df1.count()
    nOutTrain = dfn1.count()
    nInApply = dap.count()
    nOutApply = dan.count()
    diff = time.time() - t1
    print "GEQE: Time to partition data by region", diff
    print "GEQE: Positive training points:", nInTrain, ".  Negative training points:", nOutTrain
    print "GEQE: Positive test points:", nInApply, ".  Negative test points:", nOutApply

    #Map data for training
    t1 = time.time()
    trainIn  = df1.map(lambda x: (x.key, [LabeledPoint(1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()
    trainOut = dfn1.map(lambda x: (x.key, [LabeledPoint(-1.0, x.vector), x.lat, x.lon, x.size, x.binSize])).cache()
    scaleFactor = (10.*nInTrain)/float(nOutTrain)
    mlTrain = trainIn.union(trainOut.sample(False, scaleFactor))
    if len(lStop) != 0:
        mlTrain = mlTrain.map(lambda x: aggregatedComparison.removeStopWords(x, lStop))
    mlTrain.cache()
    applyPos = dap.map(lambda x: LabeledPoint(1.0, x.vector)).cache()
    applyNeg = dan.map(lambda x: LabeledPoint(-1.0, x.vector)).cache()
    mlApply = applyPos.union(applyNeg)
    diff = time.time() - t1
    print "GEQE: Time to prepare training data", diff

    #train model
    t1 = time.time()
    model_Tree = RandomForest.trainRegressor(mlTrain.map(lambda x: x[1][0]), categoricalFeaturesInfo={}, numTrees=2000, featureSubsetStrategy="auto", impurity="variance", maxDepth=4, maxBins=32)
    diff = time.time() - t1
    print "GEQE: Time to train model", diff

    #apply model
    t1 = time.time()
    predictions_Tree = model_Tree.predict(mlApply.map(lambda x: x.features))
    tAndP = mlApply.map(lambda x: x.label).zip(predictions_Tree)
    diff = time.time() - t1
    print "GEQE: Time to apply model", diff
    return (tAndP.collect(), nInApply, nOutApply)

def run(jobNm, sc, sqlContext, inputFile, lPolygon, dictFile,
        inputPartitions=-1,
        writeFileOutput=True,
        bByDate=False,
        strStop=''):

    stopSet = set(strStop.split(',')) if strStop !='' else set()
    t0 = time.time()

    #Read in data
    t1 = time.time()
    records = aggregatedComparison.loadPoint(sc, sqlContext, inputFile, inputPartitions).cache()
    nGoodTweets = records.count()
    diff = time.time() - t1
    print "GEQE: Time to read in data:", diff

    #Read in dictionary
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
    diff = time.time() - t1
    print "GEQE: Time to read in dict:", diff

    tAndP, nInApply, nOutApply = None, 0, 0
    if bByDate == True:
        print "GEQE: Generating event model"

    else:
        print "GEQE: Generating location model"
        (tAndP, nInApply, nOutApply) = locationTest(sc, sqlContext, lPolygon, lStop)

    t1 = time.time()
    print "GEQE: Generating ROC from Truth and predictions"
    plotting.generateROCCurve(tAndP, nInApply, nOutApply, jobNm)
    diff = time.time() - t1
    print "GEQE: Time to make ROC:", diff

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("polygonShapeFile", help="csv file specifying the bounding box for areas of interest")
    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Events'",default='findEvents')
    parser.add_argument("-dictFile", help="Dictionary file to read in", default="dictFiles/dict_combinedIDF")
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("-bByDate", help="Bool to switch on date partitioning", default=False)
    parser.add_argument("-strStop", help="Comma delimited list of stop words to be removed from training", default="")
    args = parser.parse_args()

    jobNm = args.jobNm

    #create a tuple of polygon lists
    lPolygon = shapeReader.createTestSiteList(args.polygonShapeFile)

    conf = SparkConf().setAppName(jobNm)
    sc = SparkContext(conf=conf)
    sqlContext = SQLContext(sc)

    run(jobNm, sc, sqlContext, args.inputFile, lPolygon, args.dictFile,
                    inputPartitions = args.partitions,
                    bByDate = args.bByDate,
                    strStop = args.strStop
                )