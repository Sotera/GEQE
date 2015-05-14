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
def get(fileName, user='demo'):


    confObj = conf.get()
    path = confObj['root_data_path'] +'/' +user + '/inputFiles/' + fileName

    with open(path, "r") as myfile:
        fileData = myfile.read()
    return json.loads(fileData)