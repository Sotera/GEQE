import sys
import json
import tangelo
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from scipy.spatial import ConvexHull

sys.path.append(".")
from decorators import allow_all_origins


@tangelo.restful
@allow_all_origins
def get(filePath='./', fileAppOut='appliedScores.csv', maxOut = -1, threshhold=None):
    maxOut = int(maxOut)
    if threshhold is not None: threshhold = float(threshhold)
    ssName  = filePath + "scoreFiles/" + fileAppOut

    #get data
    dIn = json.load(open(ssName,'r'))
    rDict = {}
    lScores = []
    #handle data differently for "event" and "place" types
    if dIn["type"] == "event":
        #Add summary values
        for date, dBin in dIn["dates"].iteritems():
            nCluster = 0
            hiScore = -1
            for cluster in dBin["clusters"]:
                nCluster = nCluster + 1
                score = 1.*cluster["nTotal"]/cluster["background"]
                lScores.append(score)
                cluster["score"] = score
                if score > hiScore: hiScore = score
            dBin["hiScore"] = hiScore
            dBin["nCluster"] = nCluster
        #If the max Out parameter is sent, only include those values
        if maxOut != -1 and len(lScores)>maxOut:
            lScores.sort(reverse=True)
            sThresh = lScores[maxOut]
            rDict["type"] = "event"
            rDict["dates"] = {}
            for date, dBin in dIn["dates"].iteritems():
                nCluster = 0
                for cluster in dBin["clusters"]:
                    if cluster["score"]>sThresh:
                        nCluster = nCluster + 1
                        if date not in rDict["dates"].keys():
                            rDict["dates"][date] = {}
                            rDict["dates"][date]["clusters"] = [cluster]
                            rDict["dates"][date]["hiScore"] = cluster["score"]
                        else:
                            rDict["dates"][date]["clusters"].append(cluster)
                            if rDict["dates"][date]["hiScore"] < cluster["score"]: rDict["dates"][date]["clusters"] = cluster["score"]
                if date in rDict["dates"].keys():
                    rDict["dates"][date]["nCluster"] = nCluster
    elif dIn["type"] == "place":
        for cluster in dIn["clusters"]:
            cluster["score"] = 1.*cluster["nTotal"]/cluster["background"]
        nClust = len(dIn["clusters"])
        if nClust > maxOut and maxOut !=-1:
            dIn["clusters"].sort(key=lambda x: x["score"],reverse=True)
            sThresh = dIn["clusters"][maxOut]["score"]
            dIn["clusters"] = filter(lambda x: x["score"]>sThresh, dIn["clusters"])
        rDict = dIn
        rDict["nCluster"] = nClust
        rDict["hiScore"] = dIn["clusters"][0]["score"]

    # try to read the dictionary file for this score file and return those response as well
    try:
        dictName = filePath + "dictFiles/dict_" + fileAppOut
        lWordScores = []
        f2 = open(dictName,'r')
        for line in f2:
            lWordScores.append(line.split('\t'))
        if len(lWordScores[0])==6:
            lWordClean = map(lambda x: [x[0], x[2], x[4], str((1.*int(float(x[5])*10000.))/10000.)], lWordScores)
            lWordSorted = sorted(lWordClean,key=lambda x: float(x[3]),reverse=True)
            rDict["dic"] = lWordSorted
        else:
            lWordClean = map(lambda x: [x[0], int(x[1])], lWordScores)
            rDict["dic"] = lWordClean

    except:
        rDict["dic"] = "No dictionary file"
    finally:
        f2.close()

    # return the results
    return json.dumps(rDict)
