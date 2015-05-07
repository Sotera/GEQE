import sys
import json
import tangelo
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
        self.img = text[6]

    def toDict(self):
        obj = {
            'date':self.date,
            'sco': self.score,
            'cap': self.text,
            'usr': self.username,
            'lon':self.lon,
            'lat':self.lat,
        }
        if self.img and len(self.img) >0:
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






@tangelo.restful
@allow_all_origins
def get(filePath='./', fileAppOut='appliedScores.csv', maxOut = -1, bBinByLatLon="false", bBinByDate="false", fBinSize=.005, dateBinSize=1):

    maxOut = int(maxOut)
    bBinByLatLon = bBinByLatLon == "true" or bBinByLatLon == "True"
    bBinByDate = bBinByDate == "true" or bBinByDate == "True"
    fBinSize = float(fBinSize)
    dateBinSize = int(dateBinSize)
    ssName  = filePath + "scoreFiles/" + fileAppOut


    # read all score records from file
    recordList = []
    with open(ssName, 'r') as fileHandle:
        i = 0
        for line in fileHandle:
            i = i +1
            if maxOut > 0 and i > maxOut:
                break
            recordList.append(ScoreRecord(line))

    bins = []

    # no binning - one record per bin
    if not bBinByDate and not bBinByLatLon:
        for record in recordList:
            bins.append( ScoreBin(record) )


    # Bin only by date
    elif bBinByDate and not bBinByLatLon:
        dateBinDict = {}
        for record in recordList:
            if record.date not in dateBinDict:
                dateBinDict[record.date] = ScoreBin(record)
            else:
                dateBinDict[record.date].addRecord(record)
        bins.extend(dateBinDict.values())


    # bin only by lat lon
    elif bBinByLatLon and not bBinByDate:
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
    elif bBinByDate and bBinByLatLon:
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


    # return the results
    retDict['sco'] = map(lambda x: x.toDict(),bins)
    retDict['total'] = len(bins)
    return json.dumps(retDict)














