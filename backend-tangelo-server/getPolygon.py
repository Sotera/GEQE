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
    """
    Get a polygon set by name
    :param fileName:  name of the polygon set
    :param user:  username
    :return:  The polygon as a json object
    """

    confObj = conf.get()
    path = confObj['root_data_path'] +'/' +user + '/inputFiles/' + fileName

    with open(path, "r") as myfile:
        fileData = myfile.read()
    return json.loads(fileData)