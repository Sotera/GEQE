############# ############# ############# ############# #############
# timeWald_fsp.py
# by JAG3
#
# v1.0 - Analyze structured social media data to
#       identify similar events.
#
#           
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext, Row
from pyspark.sql.types import BooleanType
from pyspark.mllib.tree import RandomForest, RandomForestModel
from operator import add
import json
import sys
import argparse
import codecs
sys.path.insert(0, './lib/')
from to_parquet import csvToDataFrame
import clustering
import shapeReader
import fspLib
import traceback

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("polygonShapeFile", help="csv file specifying the bounding box for areas of interest")
    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Events'",default='findEvents')
    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)
    parser.add_argument("-dropPoly", type=int, help="Do not train on specified polygon number, default = -1",default=-1)
    parser.add_argument("-cNum", type=int, help="Number of processes to coalesce initial input data to, default = 1200",default=1200)
    parser.add_argument("-sThresh", type=float, help="ordered percentage describing the number of scored entries to return. default=1.0",default=1.0)
    parser.add_argument("-nFeatures", type=int, help="Max Length for training feature vector. default=500",default=500)
    parser.add_argument("-sCustStop", help="Comma seperated list of stop words to add include on this run",default='')
    parser.add_argument("-timeMin", help="Minimum date for tweets, format 'YYYYMMDD'")
    parser.add_argument("-timeMax", help="Maximum date for tweets, format 'YYYYMMDD'")
    parser.add_argument("--sit", "--scoreIndividualTweets", dest="bScoreIndividualTweets", action="store_true", help="Scores individual tweets instead of aggregating into grids of 0.02 in lat/lon.")
    parser.set_defaults(bScoreIndividualTweets=False)
    parser.add_argument("--dap", "--dontApplyStop", dest="bUseStopFilter", action="store_false", help="Specified such that stop words are not filtered out.")
    parser.set_defaults(bUseStopFilter=True)
    parser.add_argument("-nMinClusterPoints", type=int, help="The minimum number of points that will be accepted as a cluster, default is 5",default=5)
    parser.add_argument("-fClusterSearchEpsilon", type=float, help="The search epsilon for cluster formation (using DB scan), default is 0.003",default=0.003)
    parser.add_argument("-nMinClusterUnique", type=int, help="The minimum number of unique users that are accepted for a cluster, default is 3",default=3)
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("-modelSavePath", help="Save Random Forest Model for reuse", default=None)
    parser.add_argument("--stopWordsFile",help="File path to a stop words list. One word per line. default=inputFiles/stopWordList.txt",default="inputFiles/stopWordList.txt")
    parser.add_argument("--utcoffset",type=int,help='correct all time by x hours',default=0)
    args = parser.parse_args()

    inputPartitions = args.partitions
    inputFile = args.inputFile
    shapeFile = args.polygonShapeFile
    jobNm = args.jobNm
    nDataType = args.datTyp
    pToDrop = args.dropPoly
    cNum = args.cNum
    sNum = args.sThresh
    nFeatures = args.nFeatures
    sCustStop=args.sCustStop
    nMinClusterPoints = args.nMinClusterPoints
    fClusterSearchEpsilon = args.fClusterSearchEpsilon
    nMinClusterUnique = args.nMinClusterUnique
    bUseStopFilter = args.bUseStopFilter
    bScoreIndPosts = args.bScoreIndividualTweets
    modelSavePath = args.modelSavePath
    stopWordsPath = args.stopWordsFile
    utcoffset = args.utcoffset

    #Declare Spark Context
    conf = SparkConf().setAppName(jobNm)
    conf.set('spark.driver.maxResultSize','0')
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    #Read in stop word list early to get notified of issues early in process
    bc_lStopWords = fspLib.load_stopwords(sc,stopWordsPath,sCustStop)

    #Create polygon list and broadcast variable based on it
    lPolygon = shapeReader.readInShapeJson(shapeFile)
    bc_lTargetPolygons = sc.broadcast(lPolygon)


    #Read in data and filter out entries with no valid words
    records = sqlContext.parquetFile(inputFile) if 0 == nDataType else csvToDataFrame(sc,sqlContext,inputFile,nDataType)
    if inputPartitions != -1:
        records = records.repartition(inputPartitions)
    if utcoffset != 0:
        records = sqlContext.inferSchema(records.map(lambda row: fspLib.offsetdatetime(row,utcoffset)))
    records.cache()
    records.registerTempTable('records')
    sqlContext.registerFunction("hasScorableWord", lambda text: fspLib.hasScorableWord(text,bUseStopFilter,bc_lStopWords),returnType=BooleanType())
    records = sqlContext.sql("SELECT * from records WHERE hasScorableWord(records.text) ")
    nGoodTweets = records.count()


    #Find the word document frequency for the corpus
    #this is used for an idf score used in feature vector formation
    dIDF = fspLib.wordCorpusCount(records, bUseStopFilter, bc_lStopWords)
    bc_dIDF = sc.broadcast(dIDF)

    sqlContext.registerFunction("inRegionOfInterest", lambda lat,lon: fspLib.inROI(lat,lon,bc_lTargetPolygons),returnType=BooleanType())
    sqlContext.registerFunction("inEventOfInterest", lambda lat,lon,dt: fspLib.inEOI(lat,lon,dt,bc_lTargetPolygons),returnType=BooleanType())
    sqlContext.registerFunction("outOfEventOfInterest", lambda lat,lon,dt: fspLib.outEOI(lat,lon,dt,bc_lTargetPolygons),returnType=BooleanType())

    # Split data into training and apply samples
    # training data is 2 parts
    # i.)  In both the region, and in the time window
    # ii.) In the region, but outside the time window
    df1 = sqlContext.sql("SELECT * from records WHERE inRegionOfInterest(records.lat,records.lon)").cache()
    df1.registerTempTable("df1")
    df1_inTime = sqlContext.sql("SELECT * from df1 WHERE inEventOfInterest(df1.lat,df1.lon,df1.dt)").cache()
    df1_outTime = sqlContext.sql("SELECT * from df1 where outOfEventOfInterest(df1.lat,df1.lon,df1.dt)").cache()
    df1_inTime.registerTempTable("df1_inTime")
    df1_outTime.registerTempTable("df1_outTime")

    #map intersecting words to a position to constructqak(x['caption'], bUseStopFilter, bc_lStopWords))
    dArrPos = fspLib.createBalancedFeatureVector(df1_inTime, df1_outTime, bUseStopFilter, bc_lStopWords, nFeatures, "dictFiles/dict_" + jobNm, bc_dIDF, nGoodTweets)
    bc_dArrPos = sc.broadcast(dArrPos)

    # filter out entries with no common words, partition data so that 
    # signal isn't washed out by background
    sqlContext.registerFunction("filterZeroScores", lambda caption: fspLib.filterZeroScores(caption,bc_dArrPos),returnType=BooleanType())
    df2_inTime = sqlContext.sql("SELECT * from df1_inTime where filterZeroScores(df1_inTime.text)").map(lambda x: fspLib.placeToLP(x, 1, bc_dArrPos))
    df2_inTime.cache()
    df2_outTime = sqlContext.sql("SELECT * from df1_outTime where filterZeroScores(df1_outTime.text)").map(lambda x: fspLib.placeToLP(x, -1, bc_dArrPos))
    df2_outTime.cache()

    # Use only a portion of the out of region data so that scores are not scaled too low
    nSignal = float(df2_inTime.count())
    nBack = float(df2_outTime.count())
    scaleFactor = 10.*nSignal/nBack
    trainSample = df2_outTime.sample(False, scaleFactor)

    # combine partitioned out of region with all in region entries
    mlTrain = df2_inTime.union(trainSample)
    mlTrain.cache()
    mlTrain.count()

    # train model & use it
    model_Tree = RandomForest.trainRegressor(mlTrain.map(lambda x: x[0]), categoricalFeaturesInfo={}, numTrees=100, featureSubsetStrategy="auto", impurity="variance", maxDepth=4, maxBins=32)
    if modelSavePath is not None:
        if modelSavePath[-1] != "/": modelSavePath = modelSavePath+"/"
        model_Tree.save(sc, modelSavePath + jobNm)

    # get the out of region data to apply the model to
    dfn1 = sqlContext.sql("SELECT * from records WHERE NOT inRegionOfInterest(records.lat,records.lon) AND filterZeroScores(records.text)").cache()

    nOut = dfn1.count()
    dfnApply = dfn1.map(lambda x: fspLib.placeToLP(x, -1, bc_dArrPos))
    predictions_Tree = model_Tree.predict(dfnApply.map(lambda x: x[0].features))
    vecAndPredictions = dfnApply.zip(predictions_Tree)
    vecAndPredictions.cache()
    nNonZeros = vecAndPredictions.count()
    nToTake = int(nNonZeros*sNum)
    if sNum>1.:
        nToTake=int(sNum)
    outCol = vecAndPredictions.sortBy(lambda x: x[1], False).take(nToTake)


    # cluster the results and write output to file
    if bScoreIndPosts:
        clustering.scoreIndPosts(jobNm,outCol)
    else:
        clustering.clusterByDayAndLocation(sc,records,outCol,fClusterSearchEpsilon,nMinClusterPoints,nMinClusterUnique,jobNm)