import sys
import json
import tangelo
sys.path.append(".")
import conf
from decorators import validate_user
from decorators import allow_all_origins



@tangelo.restful
@allow_all_origins
@validate_user
def get(user='demo', fileAppOut='', maxOut = "500"):

    confObj = conf.get()
    filePath = confObj['root_data_path'] +'/' +user
    maxOut = int(maxOut)
    ssName  = filePath + "/previewTrainingFiles/" + fileAppOut

    retList = []
    with open(ssName,'r') as f:
        for line in f:
            try:
                (lat,lon,user,date,text) = line.strip().split('\t')
            except:
                tangelo.log("Parser error for file: "+ssName+" line: "+line)
                continue
            dItem = {
                'lat':lat,
                'lon':lon,
                'posts': [{'cap':text,
                           'usr':user,
                           'date':date
                          }]

            }
            retList.append(dItem)
            if maxOut > 0 and len(retList) >= maxOut:
                break
    retDict = {}
    retDict['sco'] = retList
    retDict['total'] = len(retList)
    return json.dumps(retDict)
