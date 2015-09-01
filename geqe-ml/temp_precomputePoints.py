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
import sys
sys.path.insert(0, './lib/')
import aggregatedComparison
import fspLib
import time

if __name__ == "__main__":


    inputPartitions = 75
    inputFile = "hdfs://xdata/data/sotera/geqe/boston"
    outputPath = "hdfs://xdata/data/sotera/geqe/boston_agg_noDate"
    dictFile = "hdfs://xdata/data/sotera/geqe/boston_nyc_dc_dictionary"
    jobNm = "geqe precompute"
    outPart = 20
    nDataType = 0
    sCustStop=''
    fBinSize = 0.001
    nMinClusterUnique = 3
    bUseStopFilter = False
    stopWordsPath = "hdfs://xdata/data/sotera/geqe/stopWordList.txt"
    bUseDate = False

    conf = SparkConf().setAppName(jobNm)
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    bc_lStopWords = sc.broadcast( sc.textFile(stopWordsPath).collect() )

    #Read in stop word list early to get notified of issues early in process
    #bc_lStopWords = fspLib.load_stopwords(sc,stopWordsPath,sCustStop)

    t0 = time.time()
    #Read in data and filter out entries with no valid words
    t1 = time.time()
    records = aggregatedComparison.initialFilter(sc, sqlContext, inputFile, nDataType, inputPartitions, bUseStopFilter, bc_lStopWords).cache()
    nGoodTweets = records.count()
    t2 = time.time()
    print "Number of good tweets:",nGoodTweets
    diff = t2-t1
    print "Time to read in and filter nonscorable words", diff

    #Find the word document frequency for the corpus
    #this is used for an idf score used in feature vector formation
    t1 = time.time()
    dArrPos = {}
    nFeatures = 0
    revLookup = []
    #fDict = open(dictFile,"r")
    fDict = sc.textFile(dictFile).collect()
    for line in fDict:
        terms = line.split("\t")
        dArrPos[terms[0]]=(int(terms[1]), int(terms[2]))
        revLookup.append(terms[0])
    bc_dIDF = sc.broadcast(dArrPos)
    nVecLen = len(revLookup)
    t2 = time.time()
    diff = t2-t1
    print "Time to perform idf calc: ", diff

     # Create aggregate vectors from in region data
    t1 = time.time()
    grouped = aggregatedComparison.createAggregatedLabledPoint(records, bUseDate, fBinSize, bc_dIDF, True, bc_lStopWords, nGoodTweets, 1., nMinClusterUnique)\
        .map(lambda records: aggregatedComparison.mapForPrecomp(records, bUseDate, fBinSize))\
        .cache()
    nTotal = grouped.count()
    df = sqlContext.inferSchema(grouped)
    t2 = time.time()
    print nTotal, "entries for dataset"
    diff = t2-t1
    print "Time to get data ready for model by time", diff

    df.repartition(outPart).saveAsParquetFile(outputPath)

    print "<-----BOOM------->"
