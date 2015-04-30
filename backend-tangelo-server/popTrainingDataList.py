import sys
import json
import tangelo
import os
import time
@tangelo.restful
def get(filePath='./',subDir='/previewTrainingFiles'):
    lFiles = sorted(os.listdir(filePath + subDir))
    retDict = {}
    retDict["lFiles"] = lFiles
    retDict["nFiles"] = len(lFiles)
    return json.dumps(retDict)
