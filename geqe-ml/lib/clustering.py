import numpy as np
import pointClass
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from scipy.spatial import ConvexHull
from math import sqrt
import codecs
from operator import add
import json
import sys
import fspLib

def binCoordinate(strCord, fBinSize):
    return str(int(float(strCord)/fBinSize)*fBinSize)

class ScoreRecord:
    def __init__(self, record,score):
        self.lat = record.lat
        self.lon = record.lon
        self.text = record.text.replace(u'\n', u' ')
        self.score = str((int(float(score)*10000.)*1.)/10000.)
        self.username = record.user
        self.dt = record.dt
        self.img = record.img
        self.cluster = -1

    def toDict(self):
        obj = {
            'date': str(self.dt.date()),
            'datetime':str(self.dt),
            'sco': self.score,
            'cap': self.text,
            'usr': self.username,
            'lon': self.lon,
            'lat': self.lat,
        }
        if self.img is not None and len(self.img) > 0:
            obj['img'] = self.img
        return obj

class ScoreBin:
    def __init__(self, record=None):
        self.users = set([])
        self.lat = ''
        self.lon = ''
        self.dt = None
        self.records = []
        self.poly = []
        self.objPoly = None
        self.postsInHull = -1
        if record is not None:
            self.lat = record.lat
            self.lon = record.lon
            self.dt = record.dt
            self.records.append(record)
            self.users.add(record.username)

    def addRecord(self, record):
        self.records.append(record)
        self.users.add(record.username)
        if record.dt < self.dt:
            self.dt = record.dt

    def toDict(self):
        return {
            'date': str(self.dt.date()),
            'datetime': str(self.dt),
            'lat': self.lat,
            'lon': self.lon,
            'nUnique': len(self.users),
            'nTotal': len(self.records),
            'poly': list(self.poly),
            'background': self.postsInHull,
            'posts': map(lambda x: x.toDict(), self.records)
        }

def assignToCluster(recordList, epsilon, nMin):
    lalo = []
    for obj in recordList:
        lalo.append([float(obj.lon), float(obj.lat)])

    X = StandardScaler().fit_transform(lalo)
    fitObj = StandardScaler().fit(lalo)
    laEps = epsilon/fitObj.std_[0]
    loEps = epsilon/fitObj.std_[1]
    fitEps = sqrt(laEps*laEps+loEps*loEps)
    db = DBSCAN(eps=fitEps, min_samples=nMin).fit(X)
    for ind in range(len(recordList)):
        recordList[ind].cluster = db.labels_[ind]

def createHull(cluster, bUseTime):
    loLa = set([])
    for point in cluster.records:
        loLa.add(str(point.lon)+","+str(point.lat))
    loLa = map(lambda x: [float(x.split(",")[0]), float(x.split(",")[1])],loLa)
    if len(loLa) > 2:
        loLa = np.array(loLa)
        hull = ConvexHull(loLa)
        lClustPoints = []
        lPointObj = []
        for verts in hull.vertices:
            lClustPoints.append([loLa[verts,1], loLa[verts,0]])
            lPointObj.append(pointClass.Point(loLa[verts,0], loLa[verts,1]))
        if bUseTime:
            cluster.objPoly = pointClass.spaceTimePlane(lPointObj,[(cluster.dt.date(), cluster.dt.date())],"Hull")
        else:
            cluster.objPoly = pointClass.Polygon(lPointObj)
        cluster.poly = lClustPoints
    else:
        lPointObj = []
        lClustPoints = []
        for lolaOff in [(-0.001,-0.001), (-0.001,0.001), (0.001,0.001), (0.001,-0.001),]:
            offset = [loLa[0][0]+lolaOff[0], loLa[0][1]+lolaOff[1]]
            lPointObj.append(pointClass.Point(offset[0], offset[1]))
            lClustPoints.append([offset[1], offset[0]])
        if bUseTime:
            cluster.objPoly = pointClass.spaceTimePlane(lPointObj,[(cluster.dt.date(), cluster.dt.date())],"Hull")
        else:
            cluster.objPoly = pointClass.Polygon(lPointObj)
        cluster.poly = lClustPoints

def makeTotalsArray(record, bc_lClustPoly, bUseTime):
    lRet = []
    for poly in bc_lClustPoly.value:
        if not bUseTime and poly.bPointInPoly(pointClass.Point(record.lon,record.lat)):
            lRet.append(1)
        elif bUseTime and poly.bEventInTime(pointClass.Point(record.lon,record.lat),record.dt.date()):
            lRet.append(1)
        else:
            lRet.append(0)
    return lRet

def totalTweets(bin, rdd):
    lPointObj = []
    for cPoint in bin.poly:
        lPointObj.append(pointClass.Point(cPoint[1], cPoint[0]))
    clusterPoly = pointClass.Polygon(lPointObj)
    bin.postsInHull = rdd.filter(lambda x: clusterPoly.bPointInPoly(pointClass.Point(x["longitude"], x["latitude"]))).count()



def scoreIndPosts(fileName,scoredRecords,outdir='scoreFiles'):
    """
    Score posts and write to a file
    :param fileName:
    :param scoredRecords:
    """
    fOut = codecs.open(outdir+"/"+fileName, encoding="utf-8",mode="wb")
    for term in scoredRecords:
        record = term[0][1]
        score = term[1]
        buffer = [record.lat,record.lon,record.text,score,record.user,record.dt,record.img]
        buffer = map(lambda x:  x if type(x) == unicode else unicode(x),buffer)  #convert floats / ints to unicode for writing
        buffer = map(lambda x: x.replace(u'\n', u''),buffer)
        fOut.write(u'\t'.join(buffer) + u'\n')
    fOut.close()



def clusterByLocation(sc,records,scoredRecords,fClusterSearchEpsilon,nMinClusterPoints,nMinClusterUnique,fileName,outdir='scoreFiles'):
    """
    Create clusters based out record locations, and collect total background activity for each cluster.
    :param sc:
    :param records:
    :param scoredRecords:
    :param fClusterSearchEpsilon:
    :param nMinClusterPoints:
    :param fileName:
    :param outdir:
    :return:
    """

    # assign clusters and filter out non clustered records
    recordList = map(lambda term: ScoreRecord(term[0][1],term[1]),scoredRecords)
    assignToCluster(recordList, fClusterSearchEpsilon, nMinClusterPoints)
    recordList = filter(lambda x: x.cluster != -1, recordList)

    # collect records per cluster and filter out records that don't meet
    # min user threshold
    clustDict = {}
    for record in recordList:
        key = str(record.cluster)
        if key not in clustDict:
            clustDict[key] = ScoreBin(record)
        else:
            clustDict[key].addRecord(record)
    bins = clustDict.values()
    bins = filter(lambda x: len(x.users)>=nMinClusterUnique, bins)
    if len(bins) == 0:
        sys.exit("No clusters found, you need to relax cluster parameters")


    lClustPoly = []
    for bin in bins:
        createHull(bin, False)
        if bin.objPoly is not None:
            lClustPoly.append(bin.objPoly)

    bc_lClustPoly = sc.broadcast(lClustPoly)
    lBackground = records.map(lambda x: makeTotalsArray(x, bc_lClustPoly, False)).reduce(lambda x, y: map(add, x, y))

    for i in range(len(bins)):
        bins[i].postsInHull = lBackground[i]

    bins = map(lambda x: x.toDict(), bins)
    writeDict = {"type":"place", "clusters":bins}
    with codecs.open(outdir+"/"+fileName, encoding="utf-8",mode="wb") as fOut:
        json.dump(writeDict, fOut)
    return writeDict


def clusterByDayAndLocation(sc,records,scoredRecords,fClusterSearchEpsilon,nMinClusterPoints,nMinClusterUnique,fileName,outdir='scoreFiles'):
    """
    Cluster records by date, then by location.  Collect background for each cluster.
    :param sc:
    :param records:
    :param scoredRecords:
    :param fClusterSearchEpsilon:
    :param nMinClusterPoints:
    :param fileName:
    :param outdir:
    :return:
    """

    # collect records by date
    dateDict = {}
    for term in scoredRecords:
        score = term[1]
        rowObj = term[0][1]
        record = ScoreRecord(rowObj,score)
        recordDate = record.dt.date().isoformat()
        if recordDate not in dateDict:
            dateDict[recordDate] = [record]
        else:
            dateDict[recordDate].append(record)

    # for each date cluster records on that date
    bins = []
    for date,recordObjects in dateDict.iteritems():
        assignToCluster(recordObjects, fClusterSearchEpsilon, nMinClusterPoints)
        recordObjects = filter(lambda x: x.cluster != -1, recordObjects)
        clustDict = {}
        for record in recordObjects:
            key = str(record.cluster)
            if key not in clustDict:
                clustDict[key] = ScoreBin(record)
            else:
                clustDict[key].addRecord(record)
        bins.extend(clustDict.values())

    # filter out any clusters that don't meet min user requirements
    bins = filter(lambda x: len(x.users)>=nMinClusterUnique, bins)
    if len(bins) == 0:
        sys.exit("No clusters found, you need to relax cluster parameters")


    lClustPoly = []
    for bin in bins:
        createHull(bin, True)
        if bin.objPoly is not None:
            lClustPoly.append(bin.objPoly)

    bc_lClustPoly = sc.broadcast(lClustPoly)
    lBackground = records.map(lambda x: makeTotalsArray(x, bc_lClustPoly, True)).reduce(lambda x, y: map(add, x, y))
    for i in range(len(bins)):
        bins[i].postsInHull = lBackground[i]

    writeDict = {"type":"event", "dates":{}}
    for bin in bins:
        key = str(bin.dt.date())
        if key not in writeDict["dates"].keys():
            writeDict["dates"][key] = {"clusters": [bin.toDict()]}
        else:
            writeDict["dates"][key]["clusters"].append(bin.toDict())

    with codecs.open(outdir+"/"+fileName, encoding="utf-8",mode="wb") as fOut:
        json.dump(writeDict, fOut)

    return writeDict

def locationBasedOutput(bByDate, jobNm, vecAndPredictions, sNum, fBinSize, revLookup, bUseStopFilter, bc_lStopWords):
    nNonZeros = vecAndPredictions.count()
    nToTake = int(nNonZeros*sNum)
    if sNum>1.:
        nToTake=int(sNum)
    outCol = vecAndPredictions.sortBy(lambda x: x[1], False).take(nToTake)

    if bByDate == True:
        datesJson = {}
        for point in outCol:
            record = point[0][1]
            breakPoint = record[0].find("_",9)
            offset = fBinSize/2.
            lat = float(record[0][9:breakPoint])
            if lat > 0:
                lat = lat + offset
            else:
                lat = lat - offset
            lon = float(record[0][breakPoint+1:])
            if lon > 0:
                lon = lon + offset
            else:
                lon = lon - offset
            sdate = record[0][:8]
            sdate = sdate[0:4]+"-"+sdate[4:6]+"-"+sdate[6:]
            if sdate not in datesJson.keys():
                datesJson[sdate] = {"clusters":[]}
            thisCluster = {"nUnique":5,"background":100, "nTotal":len(record[1]), "lon":lon, "lat":lat, "date":sdate, "posts":[], "score":point[1]}
            labeledP = point[0][0]
            tups = zip(labeledP.features.values, labeledP.features.indices)
            thisDict = set(map(lambda x: revLookup[x[1]], sorted(tups, key=lambda x: x[0], reverse=True)[:5]))
            thisCluster["dict"] = list(thisDict)
            for post in record[1]:
                includePost = False
                for w in fspLib.wordBreak(post.text, bUseStopFilter, bc_lStopWords):
                    if w in thisDict:
                        includePost = True
                        break
                if includePost:
                    thisPost = {"sco":1,"cap":post.text,"lon":post.lon,"lat":post.lat,"date":post.dt.strftime("%Y-%m-%d"),"usr":post.user,"source":post.source, "datetime": post.dt.strftime("%Y-%m-%d %H:%M:%S")}
                    thisCluster["posts"].append(thisPost)
            thisCluster["poly"] = [[lat+offset,lon+offset],[lat+offset,lon-offset],[lat-offset,lon-offset],[lat-offset,lon+offset]]
            datesJson[sdate]["clusters"].append(thisCluster)

        retDict = {"type":"event", "dates":datesJson}
        with codecs.open("scoreFiles/"+jobNm, encoding="utf-8",mode="wb") as fOut:
            json.dump(retDict, fOut)
        return retDict
    else:
        clusterList = []
        for point in outCol:
            record = point[0][1]
            breakPoint = record[0].find("_")
            offset = fBinSize/2.
            lat = float(record[0][:breakPoint])
            if lat > 0:
                lat = lat + offset
            else:
                lat = lat - offset
            lon = float(record[0][breakPoint+1:])
            if lon > 0:
                lon = lon + offset
            else:
                lon = lon - offset
            thisCluster = {"nUnique":5,"background":100, "nTotal":len(record[1]), "lon":lon, "lat":lat, "posts":[], "score":point[1]}
            labeledP = point[0][0]
            tups = zip(labeledP.features.values, labeledP.features.indices)
            thisDict = set(map(lambda x: revLookup[x[1]], sorted(tups, key=lambda x: x[0], reverse=True)[:5]))
            thisCluster["dict"] = list(thisDict)
            nPosts = 0
            for post in record[1]:
                includePost = False
                for w in fspLib.wordBreak(post.text, bUseStopFilter, bc_lStopWords):
                    if w in thisDict:
                        includePost = True
                        break
                if includePost:
                    nPosts = nPosts + 1
                    thisPost = {"sco":1,"cap":post.text,"lon":post.lon,"lat":post.lat,"date":post.dt.strftime("%Y-%m-%d"),"usr":post.user,"source":post.source, "datetime": post.dt.strftime("%Y-%m-%d %H:%M:%S")}
                    thisCluster["posts"].append(thisPost)
                if nPosts >= 100:
                    break
            thisCluster["poly"] = [[lat+offset,lon+offset],[lat+offset,lon-offset],[lat-offset,lon-offset],[lat-offset,lon+offset]]
            clusterList.append(thisCluster)

        retDict = {"type":"place", "clusters":clusterList}
        with codecs.open("scoreFiles/"+jobNm, encoding="utf-8",mode="wb") as fOut:
            json.dump(retDict, fOut)

        return retDict


def locationBasedOutputV2(bByDate, jobNm, vecAndPredictions, sNum, revLookup, writeFileOutput, exempDict):
    nNonZeros = vecAndPredictions.count()
    nToTake = int(nNonZeros*sNum)
    if sNum>1.:
        nToTake=int(sNum)
    outCol = vecAndPredictions.sortBy(lambda x: x[1], False).take(nToTake)
    if bByDate:
        datesJson = {}
        for point in outCol:
            record = point[0][1]
            offset = record[4]/2.
            lat = float(record[1])
            if lat > 0:
                lat = lat + offset
            else:
                lat = lat - offset
            lon = float(record[2])
            if lon > 0:
                lon = lon + offset
            else:
                lon = lon - offset
            sdate = record[5].date().isoformat()
            if sdate not in datesJson.keys():
                datesJson[sdate] = {"clusters":[]}
            thisCluster = {"nTotal":record[3], "lon":lon, "lat":lat, "score":point[1]}
            labeledP = record[0]
            tups = zip(labeledP.features.values, labeledP.features.indices)
            thisDict = set(map(lambda x: revLookup[x[1]], sorted(tups, key=lambda x: x[0], reverse=True)[:25]))
            thisCluster["dict"] = list(thisDict)
            thisCluster["poly"] = [[lat+offset,lon+offset],[lat+offset,lon-offset],[lat-offset,lon-offset],[lat-offset,lon+offset]]
            datesJson[sdate]["clusters"].append(thisCluster)
        retDict = {"type":"event", "dates":datesJson, "modelDict": exempDict}

    else:
        clusterList = []
        for point in outCol:
            record = point[0][1]
            offset = record[4]/2.
            lat = float(record[1])
            if lat > 0:
                lat = lat + offset
            else:
                lat = lat - offset
            lon = float(record[2])
            if lon > 0:
                lon = lon + offset
            else:
                lon = lon - offset
            thisCluster = {"nTotal":record[3], "lon":lon, "lat":lat, "score":point[1]}
            labeledP = record[0]
            tups = zip(labeledP.features.values, labeledP.features.indices)
            thisDict = set(map(lambda x: revLookup[x[1]], sorted(tups, key=lambda x: x[0], reverse=True)[:25]))
            thisCluster["dict"] = list(thisDict)
            thisCluster["poly"] = [[lat+offset,lon+offset],[lat+offset,lon-offset],[lat-offset,lon-offset],[lat-offset,lon+offset]]
            clusterList.append(thisCluster)
        retDict = {"type":"place", "clusters":clusterList, "modelDict": exempDict}

    if writeFileOutput:
        with codecs.open("scoreFiles/"+jobNm, encoding="utf-8",mode="wb") as fOut:
            json.dump(retDict, fOut)
    return retDict


