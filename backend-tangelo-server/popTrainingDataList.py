import sys
import json
import tangelo
import os
sys.path.append(".")
import conf
from decorators import allow_all_origins
from decorators import validate_user


@tangelo.restful
@allow_all_origins
@validate_user
def get(user='demo'):

    confObj = conf.get()
    filePath = confObj['root_data_path'] +'/' +user

    lFiles = sorted(os.listdir(filePath + '/previewTrainingFiles'))
    retDict = {}
    retDict["lFiles"] = lFiles
    retDict["nFiles"] = len(lFiles)
    return json.dumps(retDict)
