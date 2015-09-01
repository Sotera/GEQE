############# ############# ############# ############# #############
# findSimilarPlaces
# by JAG3
#
# v2.0 - Analyze structured social media data to
#       identify similar places.
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
import clustering
import aggregatedComparison
import shapeReader
import fspLib
import monitoring
import time

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("outputPath",help="Output destination")
    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Events'",default='findEvents')
    parser.add_argument("outPart", type=int,help="Number of output partitions", default=100)
    parser.add_argument("binSize", help="Size for lat/lon bins", type=float, default=0.02)
    parser.add_argument("bUseDate", help="Use dates or not", default="False")
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("-dictFile", help="Dictionary file to read in", default="dictFiles/dict_combinedIDF")
    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)
    parser.add_argument("-sCustStop", help="Comma seperated list of stop words to add include on this run",default='')
    parser.add_argument("--dap", "--dontApplyStop", dest="bUseStopFilter", action="store_false", help="Specified such that stop words are not filtered out.",default=True)
    parser.add_argument("-nMinClusterUnique", type=int, help="The minimum number of unique users that are accepted for a cluster, default is 3",default=3)
    parser.add_argument("-nMinWordFreq", help="To be included in the word vector, terms must appear more often than 1/n times", type=int, default=1000000)
    parser.add_argument("--stopWordsFile",help="File path to a stop words list. One word per line. default=inputFiles/stopWordList.txt",default="inputFiles/stopWordList.txt")
    args = parser.parse_args()

    inputPartitions = args.partitions
    inputFile = args.inputFile
    outputPath = args.outputPath
    dictFile = args.dictFile
    jobNm = args.jobNm
    outPart = args.outPart
    nDataType = args.datTyp
    sCustStop=args.sCustStop
    fBinSize = args.binSize
    nMinClusterUnique = args.nMinClusterUnique
    bUseStopFilter = args.bUseStopFilter
    stopWordsPath = args.stopWordsFile
    bUseDate = args.bUseDate == "True" or args.bUseDate == "true"

    conf = SparkConf().setAppName(jobNm)
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    #Read in stop word list early to get notified of issues early in process
    bc_lStopWords = fspLib.load_stopwords(sc,stopWordsPath,sCustStop)

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
    fDict = open(dictFile,"r")
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
