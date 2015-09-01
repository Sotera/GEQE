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
#           * sparkMaster - string e.g. 'local'
#           * inputFile   - file or directory, depending on mode
#           * polygonShapeFile - csv list defining
#               areas to match
#           * dictionaryFileName - file name for
#               intermediate output of word-score dictionary
#           * outputDirectory - destination for final output
#               NOTE - must be unique
#           * datTyp - data type, 1 = instagram, 
#                                   2 = twitter, 
#                                   3 = filtered, cleaned scrape, w/ unknown source
#                                   4 = filtered, cleaned scrape, w/ known source
#                                   5 = twitter json
#                                   
#           * dropPoly - number of the polygon from file not to be considered
#           * coalesce number - number of jobs to coalesce the data to, default 1200
#           * sThresh - percentage of entries to return (1.0-0.0 scale)
#                           * if this is 1.0 (default) all output written to hdfs
#                           * otherwise it is written to a local file.  This number should be quite low for 
#                               datasets of even a medium size (recommended ~0.001 and below)
#           * sit - score individual tweets, default is to aggregate tweets by lat-lon steps of 0.005
#                           *otherwise, individual tweets with exact lat lon returned
#           * dap - Don't apply stop filter, includes 
#
#       * Output:
#           * dictFile - map of words to their
#               relative frequency within
#           * scored tweets - csv file specifying
#               latitude, longitude, score, username, and date
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
import time




def run(jobNm,sc,sqlContext,datasetPath,lPolygon,
        nDataType=0,
        inputPartitions=-1,
        sNum=1.0,
        nFeatures=500,
        nMinClusterPoints=5,
        fClusterSearchEpsilon=0.003,
        nMinClusterUnique=3,
        bScoreIndPosts=False,
        bUseStopFilter=True,
        modelSavePath=None,
        bc_lStopWords=None,
        utcoffset=0):

    """
    Run Machine learning to find clusters of locations based on a model built from the specified polygonObj
    """

    # set up broadcast variables
    if bc_lStopWords is None: bc_lStopWords = sc.broadcast([])
    bc_lTargetPolygons = sc.broadcast(lPolygon)


    #Read in data and filter out entries with no valid words
    t1 = time.time()
    records = sqlContext.parquetFile(datasetPath) if 0 == nDataType else csvToDataFrame(sc,sqlContext,datasetPath,nDataType)
    if inputPartitions != -1:
        records = records.repartition(inputPartitions)
    if utcoffset != 0:
        records = sqlContext.inferSchema(records.map(lambda row: fspLib.offsetdatetime(row,utcoffset)))
    records.cache()
    records.registerTempTable('records')
    sqlContext.registerFunction("hasScorableWord", lambda text: fspLib.hasScorableWord(text,bUseStopFilter,bc_lStopWords),returnType=BooleanType())
    records = sqlContext.sql("SELECT * from records WHERE hasScorableWord(records.text) ")
    nGoodTweets = records.count()
    t2 = time.time()
    print 'nGoodTweets: ',nGoodTweets
    print 'time to read in data and filter non scorable records: ',t2-t1

    #Find the word document frequency for the corpus
    #this is used for an idf score used in feature vector formation
    t1 = time.time()
    dIDF = fspLib.wordCorpusCount(records, bUseStopFilter, bc_lStopWords)
    bc_dIDF = sc.broadcast(dIDF)
    t2 = time.time()
    print 'words in idf: ',len(dIDF)
    print 'time to collect term frequencies as map and broadcast: ',t2-t1

    # Split data into training and apply samples
    # training data is 2 parts
    # i.)  In both the region, and in the time window
    # ii.) In the region, but outside the time window
    sqlContext.registerFunction("inRegionOfInterest", lambda lat,lon: fspLib.inROI(lat,lon,bc_lTargetPolygons),returnType=BooleanType())
    t1 = time.time()
    df1 = sqlContext.sql("SELECT * from records WHERE inRegionOfInterest(records.lat,records.lon)")
    df1.registerTempTable("df1")
    df1.cache()
    print 'df1 records: ',df1.count()
    dfn1 = sqlContext.sql("SELECT * from records WHERE NOT inRegionOfInterest(records.lat,records.lon)")
    dfn1.registerTempTable("dfn1")
    dfn1.cache()
    print 'dfn1 records: ',dfn1.count()
    t2 = time.time()
    print 'time to split data into region of interest: ',t2-t1

    #Create Feature vector using tf-idf scoring
    dArrPos = fspLib.createFeatureVector(df1, bUseStopFilter, bc_lStopWords, nFeatures, "dictFiles/dict_"+jobNm, bc_dIDF, nGoodTweets)
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
    model_Tree = RandomForest.trainRegressor(mlTrain.map(lambda x: x[0]), categoricalFeaturesInfo={}, numTrees=100, featureSubsetStrategy="auto", impurity="variance", maxDepth=4, maxBins=32)
    if modelSavePath is not None:
        if modelSavePath[-1] != "/": modelSavePath = modelSavePath+"/"
        model_Tree.save(sc, modelSavePath + jobNm)

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
        return clustering.scoreIndPosts(jobNm,outCol)
    else:
        return clustering.clusterByLocation(sc,records,outCol,fClusterSearchEpsilon,nMinClusterPoints,nMinClusterUnique,jobNm)







if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("polygonShapeFile", help="csv file specifying the bounding box for areas of interest")
    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Places'",default='Find Similar Places')
    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)
    parser.add_argument("-sThresh", type=float, help="ordered percentage describing the number of scored entries to return. default=1.0",default=1.0)
    parser.add_argument("-nFeatures", type=int, help="Max Length for training feature vector. default=500",default=500)
    parser.add_argument("-sCustStop", help="Comma seperated list of stop words to add include on this run",default='')
    parser.add_argument("-nMinClusterPoints", type=int, help="The minimum number of points that will be accepted as a cluster, default is 5",default=5)
    parser.add_argument("-fClusterSearchEpsilon", type=float, help="The search epsilon for cluster formation (using DB scan), default is 0.003",default=0.003)
    parser.add_argument("-nMinClusterUnique", type=int, help="The minimum number of unique users that are accepted for a cluster, default is 3",default=3)
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("--sit", "--scoreIndividualTweets", dest="bScoreIndividualTweets", action="store_true", help="Scores individual tweets instead of aggregating into grids of 0.02 in lat/lon.")
    parser.set_defaults(bScoreIndividualTweets=False)
    parser.add_argument("--dap", "--dontApplyStop", dest="bUseStopFilter", action="store_false", help="Specified such that stop words are not filtered out.")
    parser.set_defaults(bUseStopFilter=True)
    parser.add_argument("-modelSavePath", help="Save Random Forest Model for reuse", default=None)
    parser.add_argument("--stopWordsFile",help="File path to a stop words list. One word per line. default=inputFiles/stopWordList.txt",default="inputFiles/stopWordList.txt")
    parser.add_argument("--utcoffset",type=int,help='correct all time by x hours',default=0)
    args = parser.parse_args()

    #Declare Spark Context
    conf = SparkConf().setAppName(args.jobNm)
    conf.set('spark.driver.maxResultSize','0')
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    #Read in stop word list early to get notified of issues early in process
    bc_lStopWords = fspLib.load_stopwords(sc,args.stopWordsFile,args.sCustStop)

    #Create polygon list and broadcast variable based on it
    lPolygon = shapeReader.readInShapeJson(args.polygonShapeFile)

    run(args.jobNm,sc,sqlContext,args.inputFile,lPolygon,
        nDataType=args.datTyp,
        inputPartitions=args.partitions,
        sNum=args.sThresh,
        nFeatures=args.nFeatures,
        nMinClusterPoints=args.nMinClusterPoints,
        fClusterSearchEpsilon=args.fClusterSearchEpsilon,
        nMinClusterUnique=args.nMinClusterUnique,
        bScoreIndPosts=args.bScoreIndividualTweets,
        bUseStopFilter=args.bUseStopFilter,
        modelSavePath=args.modelSavePath,
        bc_lStopWords=bc_lStopWords,
        utcoffset=args.utcoffset)


