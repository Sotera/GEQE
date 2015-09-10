from operator import add
from nltk.stem.lancaster import LancasterStemmer
from datetime import date, timedelta, datetime
from math import sqrt, log10
from pyspark.mllib.linalg import SparseVector
from pyspark.mllib.regression import LabeledPoint
from pyspark.sql import SQLContext, Row
import csv
import sys
import json
import StringIO
import codecs
import re
sys.path.insert(0, './')
import pointClass
import traceback



def offsetdatetime(row,hours):
    return Row(lat=row.lat,
               lon=row.lon,
               text=row.text,
               dt=row.dt + timedelta(hours=hours),
               user=row.user,
               source=row.source,
               img=row.img)


def load_stopwords(sc,path,sCustStop=''):
    with open(path) as file:
        lStop = []
        for line in file:
            lStop.append(line.strip())
    if sCustStop != '':
        lStop.extend(sCustStop.split(","))

    return sc.broadcast(set(lStop))


def loadRecord(line, dType):
    """
    Parse a line from a csv file into a Row object
    :param line:
    :param dType:
    :return:
    """
    try:
        retDict = None
        if dType==1:
            input = StringIO.StringIO(line.encode('utf-8'))
            reader = csv.DictReader(input, fieldnames=["user_name", "user_id_num", "posted_date", "image_url", "caption", "latitude", "longitude", "location_id", "location_name", "comment_count", "comments", "like_count", "likes", "scraped_date"], delimiter='\t')
            retDict = reader.next()
            strDate = retDict["posted_date"]
            dtEnt = date(int(strDate[0:4]),int(strDate[5:7]),int(strDate[8:10]))
            retDict["Date"] = dtEnt
            retDict['img_url'] = ""
            retDict["source"] = "Instagram"
        elif dType==2:
            input = StringIO.StringIO(line.encode('utf-8'))
            reader = csv.DictReader(input, fieldnames=["id","dtg","user_name","user_location","latitude","longitude","caption","language","language_confidence","publish_source"], delimiter='\t')
            retDict = reader.next()
            strDate = retDict["dtg"]
            dtEnt = date(int(strDate[0:4]),int(strDate[5:7]),int(strDate[8:10]))
            retDict["Date"] = dtEnt
            retDict['img_url'] = ""
            retDict["source"] = "Twitter"
        elif dType==3:
            input = StringIO.StringIO(line.encode('utf-8'))
            reader = csv.DictReader(input, fieldnames=["latitude", "longitude", "caption", "dateTime", "user_name","img_url"], delimiter='\t')
            retDict = reader.next()
            strDate = retDict["dateTime"]
            dtEnt = date(int(strDate[0:4]),int(strDate[5:7]),int(strDate[8:10]))
            retDict["Date"] = dtEnt
            retDict["source"] = "Unknown"
        elif dType==4:
            reader = line.split("\t")
            retDict = {}
            retDict["latitude"] = reader[0]
            retDict["longitude"] = reader[1]
            retDict["caption"] = reader[2]
            retDict["user_name"] = reader[4]
            retDict["source"] = reader[5]
            strDate = reader[3]
            dtEnt = date(int(strDate[0:4]),int(strDate[5:7]),int(strDate[8:10]))
            retDict["Date"] = dtEnt
            retDict['img_url'] = ""
        elif dType==5:
            reader = json.loads(line)
            retDict = {}
            retDict["latitude"] = reader["geo"]["coordinates"][0]
            retDict["longitude"] = reader["geo"]["coordinates"][1]
            retDict["caption"] = reader["text"].replace("\n", " ")
            retDict["user_name"] = reader["user"]["screen_name"]
            retDict["Date"] =  datetime.strptime(reader["created_at"],'%a %b %d %H:%M:%S +0000 %Y').date()
            retDict['img_url'] = ""
            retDict["source"] = "Twitter"


        # convert strings to unicode
        results = {}
        for key,value in retDict.iteritems():
            if type(value) == str:
                results[key] = value.decode('utf-8')
            else:
                results[key] = value

        return results

    except:
        traceback.print_exc()
        return None

def hasScorableWord(text,bUseStopFilter, bc_lStopWords):
    if len(uniqueWords(text, bUseStopFilter, bc_lStopWords))!=0:
        return True
    return False

def uniqueWords(caption, bUseStopFilter, bc_lStopWords):
    return set(wordBreak(caption, bUseStopFilter, bc_lStopWords))

def wordBreak(caption, bUseStopFilter, bc_lStopWords):
    caption = re.sub('[\s#]',' ',caption.lower(),flags=re.UNICODE)  # replace all white space charactes (tabs newlines,etc) and the hashtag with a space
    caption = re.sub('[^\w\s@]','',caption,flags=re.UNICODE) #remove non aplhpa numeric except for '@' (so we can filter out emails and usernames)
    allWords = caption.strip().split(' ')
    filteredList = []
    stopwords = bc_lStopWords.value
    stemmer = LancasterStemmer()
    for word in allWords:
        if scorableWord(word, bUseStopFilter, stopwords):
            filteredList.append(stemmer.stem(word))
    return filteredList

def scorableWord(word, bUseStopFilter, stopwords):
    if word == "":
        return False
    if '@' in word: return False
    if word[:4] == 'href' or word[:4] == 'http' or word[:3] == 'www':
        return False
    if bUseStopFilter and (word in stopwords):
        return False
    if word.isdigit(): return False
    if len(word) < 2: return False
    return True

def badData(record, bUseStopFilter, bc_lStopWords):
    try:
        lat = float(record.lat)
        lon = float(record.lon)
        if (lat>90.34) or (lat<-90.27) or (lon>180.62) or (lon<-180.32):
            return False
        terms = wordBreak(record.text,bUseStopFilter,bc_lStopWords)
        return len(terms) > 0
    except:
        #if type(record['longitude'])==type("") and type(record['latitude'])==type(""):
        #    print "JOELOG removeLat: " + record['latitude'] + ", lon: " + record['longitude'] + "\n"
        return False


def inROI(lat, lon, bc_lTargetPolygons):
    recordPoint = pointClass.Point(lon,lat)
    for site in bc_lTargetPolygons.value:
        if site.bPointInPoly(recordPoint):
            return True
    return False

def inEOI(lat, lon, dt, bc_lTargetPolygons):
    recordPoint = pointClass.Point(lon,lat)
    rDate = dt.date()
    for site in bc_lTargetPolygons.value:
        if site.bEventInTime(recordPoint, rDate):
            return True
    return False

def outEOI(lat,lon,dt, bc_lTargetPolygons):
    recordPoint = pointClass.Point(lon,lat)
    rDate = dt.date()
    for site in bc_lTargetPolygons.value:
        if site.bEventOutOfTime(recordPoint, rDate):
            return True
    return False

def inUOI(username, bc_lTrainUsr):
    return username in bc_lTrainUsr.value

def placeToLP(record, bInRegion, bc_dArrPos):
    lat = record.lat
    lon = record.lon
    recordPoint = pointClass.Point(lon,lat)
    caption = record.text
    s1 = caption.split(' ')
    sTPos = set()
    dArrPos = bc_dArrPos.value
    for term in s1:
        mod = scrubWord(term)
        if mod in dArrPos:
            sTPos.add(dArrPos[mod])
    featureVector = SparseVector(len(dArrPos), sorted(list(sTPos)), [1.]*len(sTPos))
    return (LabeledPoint(bInRegion, featureVector),record)

def combineGroups(record):
    lPlace = []
    label = record[0]
    bFirst = True
    for key in record[1]:
        if bFirst==True:
            bFirst=False
            lPlace = key.features.toArray()
        else:
            lPlace = lPlace + key.features.toArray()
    ind = 0
    cVec = []
    for t in lPlace:
        if t != 0:
            cVec.append((ind,t))
        ind = ind +1
    return LabeledPoint(label, SparseVector(len(lPlace), cVec))

def wordCorpusCount(df, bUseStopFilter, bc_lStopWords):
    """
    Returns a dict of {word:count,..}
    :param df: spark dataframe
    :param bUseStopFilter: true false value for using stop words
    :param bc_lStopWords: broadcast variable with a set of stop words
    :return:
    """
    return df.flatMap(lambda x: [(w,None) for w in uniqueWords(x.text, bUseStopFilter, bc_lStopWords)]).countByKey()

def createFeatureVector(df, bUseStopFilter, bc_lStopWords, nFeatures, dictFile, bc_dIDF, nTot):
    # Do word count for training region
    tfidf = dfToTerms(df, bUseStopFilter, bc_lStopWords, nTot, bc_dIDF)
    lTermScore = tfidf.take(nFeatures)
    #map intersecting words to a position to construct a feature array
    return writeDict(lTermScore, dictFile)

def createBalancedFeatureVector(dfIn, dfOut, bUseStopFilter, bc_lStopWords, nFeatures, dictFile, bc_dIDF, nTot):
    tfidfIn = dfToTerms(dfIn, bUseStopFilter, bc_lStopWords, nTot, bc_dIDF)
    tfidfOut = dfToTerms(dfOut, bUseStopFilter, bc_lStopWords, nTot, bc_dIDF)
    lTermScores = set (tfidfIn.take(nFeatures) )
    for term in tfidfOut.take(nFeatures):
        lTermScores.add(term)
    return writeDict(lTermScores, dictFile)

def dfToTerms(df, bUseStopFilter, bc_lStopWords, nTot, bc_dIDF):
    wb = df.flatMap(lambda x: [ (w,1) for w in wordBreak(x.text, bUseStopFilter, bc_lStopWords) ] )
    wc  = wb.reduceByKey(add).filter(lambda x: x[1]>2)
    tfidf = wc.map(lambda x: tfIdfTermScore(x, nTot, bc_dIDF)).sortBy(lambda x: x[1], False)
    return tfidf

def tfIdfTermScore(record, nTot, bc_dIDF):
    term = record[0]
    idf = log10((1.*nTot)/bc_dIDF.value[term])
    return (term, record[1]*idf)

def writeDict(lTermScore, dictFile):
    dArrPos = {}
    nPos = 0
    fDict = codecs.open( dictFile, encoding="utf-8", mode="w")
    for (word,score) in lTermScore:
        dArrPos[word] = nPos
        nPos +=1
        try:
            buffer = [word,nPos,score]
            buffer = map(lambda x: x if type(x) == unicode else unicode(x), buffer)
            fDict.write( u'\t'.join(buffer)+ u"\n")
        except:
            print 'error decoding ',word,type(word)
            traceback.print_exc()
            continue
    fDict.close()
    return dArrPos


