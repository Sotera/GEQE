import json
import sys
import tangelo
sys.path.append(".")
import conf
from decorators import validate_user
from decorators import allow_all_origins


@tangelo.restful
@allow_all_origins
@validate_user
def get(fileName, user='demo', subDir='inputFiles/'):

    if '..' in subDir: raise ValueError("Invalid subDir.")

    confObj = conf.get()
    filePath = confObj['root_data_path'] +'/' +user
    path = filePath + subDir + fileName

    with open(path, "r") as myfile:
        fileData = myfile.readlines()
    retDict = {}
    retDict["fileData"] = fileData

    return json.dumps(retDict)