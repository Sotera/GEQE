import json
import tangelo


@tangelo.restful
def get(fileName, filePath='./', subDir='inputFiles/'):
    path = filePath + subDir + fileName

    with open(path, "r") as myfile:
        fileData = myfile.readlines()
    retDict = {}
    retDict["fileData"] = fileData

    return json.dumps(retDict)