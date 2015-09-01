############# ############# ############# ############# #############
# aynWald_fsp.py
# by JAG3
#
# v1.0 - Analyze structured social media data to
#       identify similar places.
#
#       * Note: when executing this file, you must use 
#           the spark-submit configuration option:
#           --py-files lib/shapeReader.py,lib/pointClass.py
#           to specify that these libraries must be 
#           distributed to be called on by RDD 
#           operations
#
#       * Input:
#           * see arg parser
#
#       * Output:
#           * dictFile.txt - map of words to their
#               relative frequency within
#           * scored tweets - csv file specifying
#               latitude, longitude, score
#               for individual tweets.
#           
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext, Row
from pyspark.sql.types import BooleanType
from operator import add
from pyspark.mllib.tree import RandomForest, RandomForestModel
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
    parser.add_argument("userNameList", help="comma seperated list of user names")
    parser.add_argument("dictionaryFileName", help="file name for intermediate output")
    parser.add_argument("outputDirectory", help="")
    parser.add_argument("-jobNm", help="Application name, default = 'Find Similar Places'",default='Find Similar Places')
    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)
    parser.add_argument("-dropPoly", type=int, help="Do not train on specified polygon number, default = -1",default=-1)
    parser.add_argument("-cNum", type=int, help="Number of processes to coalesce initial input data to, default = 1200",default=1200)
    parser.add_argument("-sThresh", type=float, help="ordered percentage describing the number of scored entries to return. default=1.0",default=1.0)
    parser.add_argument("-nFeatures", type=int, help="Max Length for training feature vector. default=500",default=500)
    parser.add_argument("-sCustStop", help="Comma seperated list of stop words to add include on this run",default='')
    parser.add_argument("-nMinClusterPoints", type=int, help="The minimum number of points that will be accepted as a cluster, default is 5",default=5)
    parser.add_argument("-fClusterSearchEpsilon", type=float, help="The search epsilon for cluster formation (using DB scan), default is 0.003",default=0.003)
    parser.add_argument("-nMinClusterUnique", type=int, help="The minimum number of unique users that are accepted for a cluster, default is 3",default=3)
    parser.add_argument("-timeMin", help="Minimum date for tweets, format 'YYYYMMDD'")
    parser.add_argument("-timeMax", help="Maximum date for tweets, format 'YYYYMMDD'")
    parser.add_argument("--sit", "--scoreIndividualTweets", dest="bScoreIndividualTweets", action="store_true", help="Scores individual tweets instead of aggregating into grids of 0.02 in lat/lon.")
    parser.set_defaults(bScoreIndividualTweets=False)
    parser.add_argument("--dap", "--dontApplyStop", dest="bUseStopFilter", action="store_false", help="Specified such that stop words are not filtered out.")
    parser.set_defaults(bUseStopFilter=True)
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("--stopWordsFile",help="File path to a stop words list. One word per line. default=inputFiles/stopWordList.txt",default="inputFiles/stopWordList.txt")
    parser.add_argument("--utcoffset",type=int,help='correct all time by x hours',default=0)
    args = parser.parse_args()

    inputPartitions = args.partitions
    inputFile = args.inputFile
    lTrainUsr = args.userNameList.split(",")
    dictFile = args.dictionaryFileName
    outputDir = args.outputDirectory
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
    bUseStopFilter = args.bUseStopFilter
    bScoreIndPosts = args.bScoreIndividualTweets
    stopWordsPath = args.stopWordsFile
    utcoffset = args.utcoffset


    #Declare Spark Context
    conf = SparkConf().setAppName(jobNm)
    conf.set('spark.driver.maxResultSize','0')
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    #Read in stop word list early to get notified of issues early in process
    bc_lStopWords = fspLib.load_stopwords(sc,stopWordsPath,sCustStop)

    #Create bc user list
    bc_lTrainUsr = sc.broadcast(lTrainUsr)


    #Read in data, coalesce to limit the number of jobs and avoid shuffling issues later in the job
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
    print 'nGoodTweets: ',nGoodTweets

    #Find the word document frequency for the corpus
    #this is used for an idf score used in feature vector formation
    dIDF = fspLib.wordCorpusCount(records, bUseStopFilter, bc_lStopWords)
    bc_dIDF = sc.broadcast(dIDF)


    # Split data for users of interest and not users of interest
    sqlContext.registerFunction("isUserOfInterest", lambda username: fspLib.inUOI(username,bc_lTrainUsr),returnType=BooleanType())
    df1 = sqlContext.sql("SELECT * from records WHERE isUserOfInterest(records.user)").cache()
    df1.registerTempTable("df1")
    dfn1 = sqlContext.sql("SELECT * from records WHERE NOT isUserOfInterest(records.user)").cache()
    dfn1.registerTempTable("dfn1")


    #Create Feature vector using tf-idf scoring
    dArrPos = fspLib.createFeatureVector(df1, bUseStopFilter, bc_lStopWords, nFeatures, dictFile, bc_dIDF, nGoodTweets)
    bc_dArrPos = sc.broadcast(dArrPos)

    # filter out entries with no common words, partition data so that
    # signal isn't washed out by background
    sqlContext.registerFunction("filterZeroScores", lambda caption: fspLib.filterZeroScores(caption,bc_dArrPos),returnType=BooleanType())
    df2 = sqlContext.sql("SELECT * from df1 WHERE filterZeroScores(df1.text)").cache()
    dfn2 = sqlContext.sql("SELECT * from dfn1 WHERE filterZeroScores(dfn1.text)").cache()
    nMlIn = df2.count()
    nMlOut= dfn2.count()
    ratio = (10.*nMlIn)/(1.*nMlOut)
    (dfnApply, dfnTrain) = dfn2.map(lambda x: fspLib.placeToLP(x, -1, bc_dArrPos)).randomSplit([(1-ratio), ratio])


    # combine partitioned out of region with all in region entries
    mlTrain = dfnTrain.union(df2.map(lambda x: fspLib.placeToLP(x, 1, bc_dArrPos)))
    mlTrain.cache()
    model_Tree = RandomForest.trainRegressor(mlTrain.map(lambda x: x[0]), categoricalFeaturesInfo={}, numTrees=100, featureSubsetStrategy="auto", impurity="variance", maxDepth=4, maxBins=32)
    predictions_Tree = model_Tree.predict(dfnApply.map(lambda x: x[0].features))
    vecAndPredictions = dfnApply.zip(predictions_Tree)
    vecAndPredictions.cache()
    nNonZeros = vecAndPredictions.count()
    nToTake = int(nNonZeros*sNum)
    if sNum>1.:
        nToTake=int(sNum)
    outCol = vecAndPredictions.sortBy(lambda x: x[1], False).take(nToTake)

    if bScoreIndPosts:
        clustering.scoreIndPosts(jobNm,outCol)
    else:
        clustering.clusterByLocation(sc,records,outCol,fClusterSearchEpsilon,nMinClusterPoints,nMinClusterUnique,jobNm)
