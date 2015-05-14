import sys
import json
import tangelo
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from scipy.spatial import ConvexHull

sys.path.append(".")
from decorators import allow_all_origins

def binCoordinate(strCord, fBinSize):
    return str(int(float(strCord)/fBinSize)*fBinSize)

class ScoreRecord:
    def __init__(self,text):
        text = text.strip().split('\t')
        text = map(lambda x: x.strip(),text)
        self.lat = text[0]
        self.lon = text[1]
        self.text = text[2]
        self.score = str((int(float(text[3])*10000.)*1.)/10000.)
        self.username = text[4]
        self.date = text[5]
        self.img = text[6] if len(text) > 6 else None
        self.cluster = -1

    def toDict(self):
        obj = {
            'date':self.date,
            'sco': self.score,
            'cap': self.text,
            'usr': self.username,
            'lon':self.lon,
            'lat':self.lat,
        }
        if self.img is not None and len(self.img) >0:
            obj['img'] = self.img
        return obj

class ScoreBin:
    def __init__(self,record=None):
        self.users = set([])
        self.lat = ''
        self.lon = ''
        self.date = ''
        self.records = []
        self.poly = []
        if record is not None:
            self.lat = record.lat
            self.lon = record.lon
            self.date = record.date
            self.records.append(record)
            self.users.add(record.username)

    def addRecord(self,record):
        self.records.append(record)
        self.users.add(record.username)
        if record.date < self.date:
            self.date = record.date

    def toDict(self):
        return {
            'date': self.date,
            'lat': self.lat,
            'lon': self.lon,
            'nUnique': len(self.users),
            'nTotal': len(self.records),
            'poly' : list(self.poly),
            'posts' : map(lambda x: x.toDict(),self.records)
        }

def assignToCluster(recordList, epsilon, nMin):
    lalo = []
    for obj in recordList:
        lalo.append([float(obj.lon), float(obj.lat)])

    X = StandardScaler().fit_transform(lalo)
    db = DBSCAN(eps=epsilon, min_samples=nMin).fit(X)
    for ind in range(len(recordList)):
        recordList[ind].cluster = db.labels_[ind]
    return

def createHull(cluster):
    loLa = set([])
    for point in cluster.records:
        loLa.add(str(point.lon)+","+str(point.lat))
    loLa = map(lambda x: [x.split(",")[0],x.split(",")[1]],loLa)
    loLa = np.array(loLa)
    hull = ConvexHull(loLa)
    polyPoints = []
    for verts in hull.vertices:
        polyPoints.append([loLa[verts,1],loLa[verts,0]])
    cluster.poly = polyPoints


@tangelo.restful
@allow_all_origins
def get(filePath='./', fileAppOut='appliedScores.csv', maxOut = -1, drawMode="cluster", bBinByDate="false", fBinSize=.05, threshhold=None):
    #Add parameter to tune unique user enforcement
    nMinUniqueUsers = 3

    maxOut = int(maxOut)
    if threshhold is not None: threshhold = float(threshhold)
    bCluster = drawMode == "cluster"
    bBinByLatLon = drawMode == "latlonbin"
    bBinByDate = bBinByDate == "true" or bBinByDate == "True"
    fBinSize = float(fBinSize)
    ssName  = filePath + "scoreFiles/" + fileAppOut

    # read all score records from file
    recordList = []
    with open(ssName, 'r') as fileHandle:
        i = 0
        for line in fileHandle:
            i = i +1
            if  not bBinByDate and not bBinByLatLon and not bCluster and maxOut > 0 and i > maxOut:
                break
            recordList.append(ScoreRecord(line))

    if threshhold is not None:
        recordList = filter(lambda x: float(x.score) >= threshhold,recordList)

    bins = []

    # no binning - one record per bin
    if not bBinByDate and not bBinByLatLon and not bCluster:
        for record in recordList:
            bins.append( ScoreBin(record) )

    # Bin only by date
    elif bBinByDate and not bBinByLatLon and not bCluster:
        dateBinDict = {}
        for record in recordList:
            if record.date not in dateBinDict:
                dateBinDict[record.date] = ScoreBin(record)
            else:
                dateBinDict[record.date].addRecord(record)
        bins.extend(dateBinDict.values())

    # bin only by lat lon
    elif bBinByLatLon and not bBinByDate and not bCluster:
        geoBinDict = {}
        for record in recordList:
            binlat = binCoordinate(record.lat,fBinSize=fBinSize)
            binlon = binCoordinate(record.lon,fBinSize=fBinSize)
            key = (binlat,binlon)
            if key not in geoBinDict:
                newBin = ScoreBin(record)
                newBin.lat = binlat
                newBin.lon = binlon
                geoBinDict[key] = newBin
            else:
                geoBinDict[key].addRecord(record)
        bins.extend(geoBinDict.values())

    # bin by both date and lat lon
    elif bBinByDate and bBinByLatLon and not bCluster:
        dateDict = {}
        for record in recordList:
            if record.date not in dateDict:
                dateDict[record.date] = [record]
            else:
                dateDict[record.date].append(record)

        for date,records in dateDict.iteritems():
            geoBinDict = {}
            for record in records:
                binlat = binCoordinate(record.lat,fBinSize=fBinSize)
                binlon = binCoordinate(record.lon,fBinSize=fBinSize)
                key = (binlat,binlon)
                if key not in geoBinDict:
                    newBin = ScoreBin(record)
                    newBin.lat = binlat
                    newBin.lon = binlon
                    geoBinDict[key] = newBin
                else:
                    geoBinDict[key].addRecord(record)
            bins.extend(geoBinDict.values())

    # both cluster options make same calls, divide between date bin and not deeper.
    elif bCluster and bBinByDate:
        dateDict = {}
        for record in recordList:
            if record.date not in dateDict:
                dateDict[record.date] = [record]
            else:
                dateDict[record.date].append(record)

        for date,records in dateDict.iteritems():
            assignToCluster(records, fBinSize, 3)
            records = filter(lambda x: x.cluster != -1, records)
            clustDict = {}
            for record in records:
                key = str(record.cluster)
                if key not in clustDict:
                    clustDict[key] = ScoreBin(record)
                else:
                    clustDict[key].addRecord(record)
            bins.extend(clustDict.values())

    elif bCluster and not bBinByDate:
        assignToCluster(recordList, fBinSize, 5)
        recordList = filter(lambda x: x.cluster != -1, recordList)
        clustDict = {}
        for record in recordList:
            key = str(record.cluster)
            if key not in clustDict:
                clustDict[key] = ScoreBin(record)
            else:
                clustDict[key].addRecord(record)
        bins.extend(clustDict.values())

    else:
        raise ValueError("Invalid arguments.")

    # try to read the dictionary file for this score file and return those response as well
    retDict = {}
    try:
        dictName = filePath + "dictFiles/dict_" + fileAppOut
        lWordScores = []
        f2 = open(dictName,'r')
        for line in f2:
            lWordScores.append(line.split('\t'))
        if len(lWordScores[0])==6:
            lWordClean = map(lambda x: [x[0], x[2], x[4], str((1.*int(float(x[5])*10000.))/10000.)], lWordScores)
            lWordSorted = sorted(lWordClean,key=lambda x: float(x[3]),reverse=True)
            retDict["dic"] = lWordSorted
        else:
            lWordClean = map(lambda x: [x[0], int(x[1])], lWordScores)
            retDict["dic"] = lWordClean

    except:
        retDict["dic"] = "No dictionary file"
    finally:
        f2.close()

    if bBinByLatLon or bCluster:
        bins = filter(lambda x: len(x.users)>=nMinUniqueUsers,bins)

    # draw poly around cluster
    if bCluster:
        for cluster in bins:
            createHull(cluster)


    # return the results
    retDict['total'] = len(bins)
    if bBinByDate or bBinByLatLon or bCluster:
        bins = sorted(bins,key= lambda x: len(x.records), reverse=True)
        if maxOut > 0:
            bins = bins[:maxOut]
    bins = map(lambda x: x.toDict(),bins)
    for i in range(len(bins)):
        bins[i]['index'] = i
    retDict['sco'] = bins

    return json.dumps(retDict)
