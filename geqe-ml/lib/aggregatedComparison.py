from pyspark.mllib.regression import LabeledPoint
from pyspark.mllib.linalg import SparseVector
from math import sqrt, log10
import datetime
import sys
import codecs
from pyspark.sql import SQLContext, Row
from pyspark.sql.types import BooleanType
sys.path.insert(0, './')
from to_parquet import csvToDataFrame
import fspLib

def initialFilter(sc, sqlContext, inputFile, nDataType, inputPartitions, bUseStopFilter, bc_lStopWords):
    records = sqlContext.read.parquet(inputFile) if 0 == nDataType else csvToDataFrame(sc, sqlContext, inputFile, nDataType)
    if inputPartitions != -1:
        records = records.repartition(inputPartitions)
    records.cache()
    records.registerTempTable('records')
    sqlContext.registerFunction("hasScorableWord", lambda text: fspLib.hasScorableWord(text, bUseStopFilter, bc_lStopWords), returnType=BooleanType())
    records = sqlContext.sql("SELECT * from records WHERE hasScorableWord(records.text) ")
    return records

def createLargeScaleFeatureVector(records, bUseStopFilter, bc_lStopWords, nGoodTweets, nMinOccupancy, dictFile):
    dIDF = fspLib.wordCorpusCount(records, bUseStopFilter, bc_lStopWords)
    fDict = codecs.open(dictFile, encoding="utf-8", mode="w")
    wordVec = {}
    revLookup = []
    pos = 0
    thresh = nGoodTweets/nMinOccupancy #Enforce that the term must exist in 1 out of n tweets
    for t, v in dIDF.iteritems():
        if dIDF[t] < thresh:
            continue
        buffer = [t, pos, v]
        buffer = map(lambda x: x if type(x) == unicode else unicode(x), buffer)
        fDict.write(u'\t'.join(buffer)+u'\n')
        revLookup.append(t)
        wordVec[t] = (pos, v)
        pos = pos + 1
    return wordVec, revLookup

def createAggregatedLabledPoint(rddIn, bUseDate, binSize, bc_dIDF, bUserStopFilter, bc_lStopWords, nTot, lpVal, nMin):
    grouped = rddIn.map(lambda x: (groupString(x,bUseDate,binSize), x))\
        .groupByKey()\
        .filter(lambda x: len(x[1])>nMin)
    return grouped.map(lambda x: (LabeledPoint(lpVal, megaVector(x[1], bc_dIDF, bUserStopFilter, bc_lStopWords, nTot)),x))

def sparseToKV(sv):
    keys = sv.indices.tolist()
    vals = sv.values.tolist()
    ret = []
    for i in range(len(keys)):
        ret.append((keys[i],vals[i]))
    return ret

def exemplarDict(rddIn, revLookup):
    vecs = rddIn.map(lambda x: x.vector)\
                .flatMap(lambda x: sparseToKV(x))\
                .reduceByKey(lambda x, y: x + y)\
                .collect()

    return map(lambda x: revLookup[x[0]], sorted(vecs, key=lambda x: x[1], reverse=True)[:25])
                         
def groupString(record, bUseDate, binSize):
    strRet = ''
    if bUseDate:
        strRet = record.dt.date().strftime("%Y%m%d")+"_"
    strRet = strRet + str(int(record.lat/binSize)*binSize)+"_"+str(int(record.lon/binSize)*binSize)
    return strRet
             
def megaVector(ittRec, bc_dIDF, bUserStopFilter, bc_lStopWords, nTot):
    dThisPoint = {}
    dUsableWords = bc_dIDF.value
    norm = 0.0
    for post in ittRec:
        for w in fspLib.wordBreak(post.text, bUserStopFilter, bc_lStopWords):
            if w in dUsableWords:
                if dUsableWords[w][0] != 0:
                    val = log10((1.*nTot)/dUsableWords[w][0])
                    norm = norm + val
                    dThisPoint[w] = dThisPoint[w] + val if w in dThisPoint.keys() else val
    scoreNPos = []
    if norm == 0.0:
        return SparseVector(len(dUsableWords.keys()),[],[])
    for term, num in dThisPoint.iteritems():
        scoreNPos.append((dUsableWords[term][0],num/norm))
    scoreNPos.sort(key=lambda x:x[0])
    lPos, lVal = zip(*scoreNPos)
    return SparseVector(len(dUsableWords.keys()), list(lPos), list(lVal))

def loadPoint(sc, sqlContext, inputFile, inputPartitions):
    records = sqlContext.read.parquet(inputFile)
    if inputPartitions != -1:
        records = records.repartition(inputPartitions)
    records.cache()
    records.registerTempTable('records')
    return records

def shiftedPoint(coord, binSize):
    if coord>0.0:
        return float(coord+binSize/2.)
    else:
        return float(coord-binSize/2.)

def mapForPrecomp(record, bUseDate, fBinSize):
    if bUseDate:
        catch = record[1][0].find("_",9)
        shiftLat = shiftedPoint(float(record[1][0][9:catch]), fBinSize)
        shiftLon = shiftedPoint(float(record[1][0][catch+1:]), fBinSize)
        return Row(key=record[1][0],
                   dt=datetime.datetime.strptime(record[1][0][:8],"%Y%m%d"),
                   lat=shiftLat,
                   lon=shiftLon,
                   vector=record[0].features,
                   size=len(record[1][1]),
                   binSize=fBinSize)
    else:
        catch = record[1][0].find("_",2)
        shiftLat = shiftedPoint(float(record[1][0][:catch]), fBinSize)
        shiftLon = shiftedPoint(float(record[1][0][catch+1:]), fBinSize)
        return Row(key=record[1][0],
                   lat=shiftLat,
                   lon=shiftLon,
                   vector=record[0].features,
                   size=len(record[1][1]),
                   binSize=fBinSize)

#(x.key, [LabeledPoint(-1.0, x.vector), x.lat, x.lon, x.size, x.binSize])
def removeStopWords(record, lStop):
    fLP  = record[1][0]
    fVec = fLP.features
    bMod = False
    for w in lStop:
        if w in fVec.indices:
            bMod=True

    if bMod is True:
        retInd = []
        retVal = []
        for i in range(len(fVec.indices)):
            if fVec.indices[i] not in lStop:
                retInd.append(fVec.indices[i])
                retVal.append(fVec.values[i])
        return (record[0], [LabeledPoint(fLP.label, SparseVector(fVec.size, retInd, retVal)), record[1][1], record[1][2], record[1][3], record[1][4]])
    else:
        return record