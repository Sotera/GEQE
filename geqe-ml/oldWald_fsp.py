############# ############# ############# ############# #############
# aynWald_fsp.py
# by JAG3
#
# v1.0 - Analyze structured social media data to identify similar places or events using a
#   previously generated model.  See aynWald or timeWald for model generation
#
#       * Note: when executing this file, you must use 
#           the spark-submit configuration option:
#           --py-files lib/fspLib.py,lib/to_parquet.py,lib/clustering.py,lib/shapeReader.py,lib/pointClass.py
#           to specify that these libraries must be 
#           distributed to be called on by RDD 
#           operations

#           
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext
from pyspark.sql.types import BooleanType
from pyspark.mllib.tree import RandomForestModel
import argparse
import sys
sys.path.insert(0, './lib/')
from to_parquet import csvToDataFrame
import clustering
import fspLib
import time


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Places'",default='Find Similar Places')
    parser.add_argument("modelSavePath", help="Path where model data is stored")
    parser.add_argument("dictName", help="Dict file name which defines character mapping")
    parser.add_argument("-sCustStop", help="Comma seperated list of stop words to add include on this run",default='')
    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)
    parser.add_argument("-sThresh", type=float, help="ordered percentage describing the number of scored entries to return. default=1.0",default=1.0)
    parser.add_argument("-nMinClusterPoints", type=int, help="The minimum number of points that will be accepted as a cluster, default is 5",default=5)
    parser.add_argument("-fClusterSearchEpsilon", type=float, help="The search epsilon for cluster formation (using DB scan), default is 0.03",default=0.03)
    parser.add_argument("-nMinClusterUnique", type=int, help="The minimum number of unique users that are accepted for a cluster, default is 3",default=3)
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("--sit", "--scoreIndividualTweets", dest="bScoreIndividualTweets", action="store_true", help="Scores individual tweets instead of aggregating into grids of 0.02 in lat/lon.")
    parser.set_defaults(bScoreIndividualTweets=False)
    parser.add_argument("--dap", "--dontApplyStop", dest="bUseStopFilter", action="store_false", help="Specified such that stop words are not filtered out.")
    parser.set_defaults(bUseStopFilter=True)
    parser.add_argument("--cbt", "--clusterByTime", dest= "bTimeCluster", action="store_true", help="Toggles time binning for clustering.")
    parser.set_defaults(bTimeCluster=False)
    parser.add_argument("--stopWordsFile",help="File path to a stop words list. One word per line. default=inputFiles/stopWordList.txt",default="inputFiles/stopWordList.txt")
    parser.add_argument("--utcoffset",type=int,help='correct all time by x hours',default=0)
    args = parser.parse_args()

    inputPartitions = args.partitions
    inputFile = args.inputFile
    jobNm = args.jobNm
    modelPath = args.modelSavePath
    dictName = args.dictName
    nDataType = args.datTyp
    sNum = args.sThresh
    nMinClusterPoints = args.nMinClusterPoints
    fClusterSearchEpsilon = args.fClusterSearchEpsilon
    nMinClusterUnique = args.nMinClusterUnique
    bUseStopFilter = args.bUseStopFilter
    bScoreIndPosts = args.bScoreIndividualTweets
    stopWordsPath = args.stopWordsFile
    sCustStop = args.sCustStop
    bTimeCluster = args.bTimeCluster
    utcoffset = args.utcoffset

    #Declare Spark Context
    conf = SparkConf().setAppName(jobNm)
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    #Read in stop word list early to get notified of issues early in process
    bc_lStopWords = fspLib.load_stopwords(sc,stopWordsPath,sCustStop)

    #Create feature vector map from existing dict file
    fDict = open("dictFiles/"+dictName,"r")
    dArrPos = {}
    nFeatures = 0
    for line in fDict:
        term = line.split("\t")[0]
        dArrPos[term]=nFeatures
        nFeatures = nFeatures + 1
    bc_dArrPos = sc.broadcast(dArrPos)

    #Read in data and filter out entries with no valid words
    t1 = time.time()
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
    t2 = time.time()
    print 'nGoodTweets: ',nGoodTweets
    print 'time to read in data and filter non scorable records: ',t2-t1

    # filter out entries with no common words
    sqlContext.registerFunction("filterZeroScores", lambda caption: fspLib.filterZeroScores(caption,bc_dArrPos),returnType=BooleanType())
    df2 = sqlContext.sql("SELECT * from records WHERE filterZeroScores(records.text)").cache()
    dfnApply = df2.map(lambda x: fspLib.placeToLP(x, -1, bc_dArrPos))
    dfnApply.cache()

    # Read in Model
    model_Tree = RandomForestModel.load(sc, modelPath)

    # Apply Model, get results
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
        if not bTimeCluster:
            clustering.clusterByLocation(sc,records,outCol,fClusterSearchEpsilon,nMinClusterPoints,nMinClusterUnique,jobNm)
        else:
            clustering.clusterByDayAndLocation(sc,records,outCol,fClusterSearchEpsilon,nMinClusterPoints,nMinClusterUnique,jobNm)

    print "<----------Job Complete---------->"