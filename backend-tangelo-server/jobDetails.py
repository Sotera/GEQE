import tangelo
import sys
sys.path.append(".")
import conf
from decorators import allow_all_origins
from decorators import validate_user
import json
import traceback




@tangelo.restful
@allow_all_origins
@validate_user
def get(user='demo',jobname=''):
    """
    Return the details of job, including the dataset, polygon set name and score set name.
    :param user: username
    :param jobname: job name
    :return: JSON  { dataSetName : "...", polygonFile: "...", scoreFile: "...", jobname: "..."}
    """
    confObj = conf.get()
    filePath = confObj['root_data_path'] +'/' +user + '/jobFiles/'

    prefix = user+"_"
    if jobname[:len(prefix)] != prefix:
        jobname = prefix+jobname

    jobObj = None
    try:
        with open(filePath+jobname,'r') as jobFileHandle:
            jobObj = json.loads(jobFileHandle.read())
        return jobObj
    except:
        tangelo.log(traceback.format_exc())
        return{}