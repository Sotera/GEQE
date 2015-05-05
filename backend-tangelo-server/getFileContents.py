import json
import tangelo
sys.path.append(".")
from decorators import allow_all_origins


@tangelo.restful
@allow_all_origins
def get(fileName, filePath='./', subDir='inputFiles/'):
    path = filePath + subDir + fileName

    with open(path, "r") as myfile:
        fileData = myfile.readlines()
    retDict = {}
    retDict["fileData"] = fileData

    return json.dumps(retDict)