import sys
import json
import tangelo
import os
sys.path.append(".")
import conf
from decorators import allow_all_origins
from decorators import validate_user


operationMapping = {
    'polygons' : 'inputFiles',
    'scores': 'scoreFiles',
    'trainingdata' : 'previewTrainingFiles',
    'datasets': None
}


@allow_all_origins
def run(operation,user='demo'):
    if operation not in operationMapping:
        return "Unsupported operation: %s\nAllowed operations are: %s" % (operation, ", ".join(allowed))


    if 'datasets' == operation:
        confObj = conf.get()
        return confObj['datasets'].keys()
    else:
        return list_files(user,operationMapping[operation])



@validate_user
def list_files(user,subDir):
    confObj = conf.get()
    filePath = confObj['root_data_path'] +'/' +user
    scoreDir = filePath + '/' + subDir
    lFiles = sorted(os.listdir(scoreDir))
    retDict = {}
    retDict["lFiles"] = lFiles
    retDict["nFiles"] = len(lFiles)
    return json.dumps(retDict)
