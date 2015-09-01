############# ############# ############# ############# #############
# findIDF
# by JAG3
#
# create word count dictionary for all tweets in a a dataset so
# tf-idf feature vector selection can be performed more rapidly.
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from operator import add
from datetime import date
import sys
import StringIO
import argparse
import codecs
sys.path.insert(0, './lib/')
import pointClass
import shapeReader
import fspLib


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("idfDict", help="file name for intermediate output")
    parser.add_argument("-jobNm", help="Application name, default = 'Find IDF'")
    parser.add_argument("-datTyp", type=int, help="Data type, 1=instagram, 2=twitter.  Default = 1")
    parser.add_argument("-cNum", type=int, help="Number of processes to coalesce initial input data to, default = 1200")
    args = parser.parse_args()
    inputFile = args.inputFile
    dictFile  = args.idfDict
    jobNm = "Find Similar Places"
    if args.jobNm:
        jobNm = args.jobNm

    nDataType = 1
    if args.datTyp:
        nDataType = args.datTyp

    cNum = 1200
    if args.cNum:
        cNum = args.cNum

    bUseStopFilter = False
    #Declare Spark Context
    conf = SparkConf().setAppName(jobNm)
    sc = SparkContext(conf = conf)

    lowerTime = date(2006,03,21)
    upperTime = date(3000,01,01)
    bc_lStopWords = None

    input = sc.textFile(inputFile,100).coalesce(cNum)
    data = input.map(lambda x: fspLib.loadRecord(x,nDataType)).filter(lambda x: x is not None)
    df0 = data.filter(lambda x: fspLib.badData(x, bUseStopFilter, bc_lStopWords, lowerTime, upperTime))
    wb  = df0.flatMap(lambda x: fspLib.wordBreak(x['caption'], bUseStopFilter, bc_lStopWords))
    wc  = wb.map(lambda x: (x,1)).reduceByKey(add)
    wordAndCound = wc.collect()
    fDict = codecs.open("./idfFiles/" + dictFile, encoding="utf-8", mode="w")
    for cT in wordAndCound:
        fDict.write(u"\t".join([unicode(cT[0]),unicode(cT[1])])+u"\n")

    fDict.close()

