import sys
import json
import tangelo
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

sys.path.append(".")
import conf
from decorators import validate_user
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
            'posts' : map(lambda x: x.toDict(),self.records)
        }

def assignToCluster(recordList, epsilon, nMin):
    lalo = []
    for obj in recordList:
        lalo.append([obj.lon, obj.lat])

    X = StandardScaler().fit_transform(lalo)
    db = DBSCAN(eps=epsilon, min_samples=nMin).fit(X)
    for ind in range(len(recordList)):
        recordList[ind].cluster = db.labels_[ind]
    return


@tangelo.restful
@allow_all_origins
@validate_user
def get(user='demo', fileAppOut='appliedScores', maxOut = -1, bBinByLatLon="false", bBinByDate="false", bCluster="false", fBinSize=.005, threshhold=None):

    confObj = conf.get()
    filePath = confObj['root_data_path'] +'/' +user

    #Add parameter to tune unique user enforcement
    nMinUniqueUsers = 3

    maxOut = int(maxOut)
    if threshhold is not None: threshhold = float(threshhold)
    bBinByLatLon = bBinByLatLon == "true" or bBinByLatLon == "True"
    bBinByDate = bBinByDate == "true" or bBinByDate == "True"
    bCluster = bCluster == "true" or bCluster == "True"
    fBinSize = float(fBinSize)
    ssName  = filePath + "/scoreFiles/" + fileAppOut

    # read all score records from file
    recordList = []
    with open(ssName, 'r') as fileHandle:
        i = 0
        for line in fileHandle:
            i = i +1
            if  not bBinByDate and not bBinByLatLon and maxOut > 0 and i > maxOut:
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
            bins.extend(clustDict)



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


    # try to read the dictionary file for this score file and return those resonse as well
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

    # return the results
    retDict['total'] = len(bins)
    if bBinByDate or bBinByLatLon:
        bins = sorted(bins,key= lambda x: len(x.records), reverse=True)
        if maxOut > 0:
            bins = bins[:maxOut]
    bins = map(lambda x: x.toDict(),bins)
    for i in range(len(bins)):
        bins[i]['index'] = i
    retDict['sco'] = bins

    return json.dumps(retDict)














