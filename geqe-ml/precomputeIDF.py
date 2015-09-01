############# ############# ############# ############# #############
# precomputeIDF
# by JAG3
#
# v1.0 - precompute IDF vectors for a dataset
#
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext
from pyspark.sql.types import BooleanType
import sys
import argparse
import codecs
sys.path.insert(0, './lib/')
import fspLib
import time

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("jobNm", help="Application name, default = 'Find Similar Events'",default='findEvents')
    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)
    parser.add_argument("--dap", "--dontApplyStop", dest="bUseStopFilter", action="store_false", help="Specified such that stop words are not filtered out.",default=True)
    parser.add_argument("-nMinClusterUnique", type=int, help="The minimum number of unique users that are accepted for a cluster, default is 3",default=3)
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    parser.add_argument("-sCustStop", help="Comma seperated list of stop words to add include on this run",default='')
    parser.add_argument("--stopWordsFile",help="File path to a stop words list. One word per line. default=inputFiles/stopWordList.txt",default="inputFiles/stopWordList.txt")
    args = parser.parse_args()

    inputPartitions = args.partitions
    jobNm = args.jobNm
    nDataType = args.datTyp
    nMinClusterUnique = args.nMinClusterUnique
    bUseStopFilter = args.bUseStopFilter
    stopWordsPath = args.stopWordsFile
    sCustStop=args.sCustStop

    conf = SparkConf().setAppName(jobNm)
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    #Read in stop word list early to get notified of issues early in process
    bc_lStopWords = fspLib.load_stopwords(sc,stopWordsPath,sCustStop)

    #Read in data and filter out entries with no valid words
    t0 = time.time()
    t1 = time.time()
    DATA_SETS = []
    #DATA_SETS.append("hdfs://yourHDFS.url:/your/hdfs/path")
    #DATA_SETS.append("....")

    records = None

    for file in DATA_SETS:
        if records == None:
            records = sqlContext.parquetFile(file)
        else:
            newRec = sqlContext.parquetFile(file)
            records = records.unionAll(newRec)


    if inputPartitions > 0: records = records.repartition(inputPartitions)
    records.cache()
    nRecords = records.count()
    print "Total number of records: ", nRecords

    records.registerTempTable('records')
    sqlContext.registerFunction("hasScorableWord", lambda text: fspLib.hasScorableWord(text, bUseStopFilter, bc_lStopWords), returnType=BooleanType())
    records = sqlContext.sql("SELECT * from records WHERE hasScorableWord(records.text) ")
    records.cache()
    nGoodTweets = records.count()
    t2 = time.time()
    print "Number of good tweets:",nGoodTweets
    diff = t2-t1
    print "Time to read in and filter nonscorable words", diff

    #Find the word document frequency for the corpus
    #this is used for an idf score used in feature vector formation
    t1 = time.time()
    dIDF = records.flatMap(lambda x: [(w,1) for w in fspLib.uniqueWords(x.text, bUseStopFilter, bc_lStopWords)]).reduceByKey(lambda x,y: x+y)
    dIDF.cache()
    nTerms = dIDF.count()
    nThresh = int(float(nGoodTweets)/1000000.)
    final = dIDF.filter(lambda x: x[1]>nThresh).cache()
    nFinal = final.count()
    t2 = time.time()
    diff = t2-t1
    print "Time to perform idf calc: ", diff
    print "Number of terms:", nTerms, ", number that pass thresh: ", nFinal


    retDict = final.collectAsMap()
    fDict = codecs.open("dictFiles/dict_"+jobNm, encoding="utf-8", mode="w")
    pos = 0
    for t, v in retDict.iteritems():
        buffer = [t, pos, v]
        buffer = map(lambda x: x if type(x) == unicode else unicode(x), buffer)
        fDict.write(u'\t'.join(buffer)+u'\n')
        pos = pos + 1

    diff = time.time() - t0
    print "<-------------Done------------>"
    print "<-- Total time:", diff
    print "<-- Threshold:", nThresh
    print "<-- Num tweets:", nGoodTweets
    print "<-- Num terms:", pos
    print "<----------------------------->"