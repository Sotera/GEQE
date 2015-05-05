import sys
import json
import tangelo
import os
import time
sys.path.append(".")
from decorators import allow_all_origins


@tangelo.restful
@allow_all_origins
def get(filePath='./',subDir='/previewTrainingFiles'):
    lFiles = sorted(os.listdir(filePath + subDir))
    retDict = {}
    retDict["lFiles"] = lFiles
    retDict["nFiles"] = len(lFiles)
    return json.dumps(retDict)
