import tangelo
import sys
sys.path.append(".")
import conf
from decorators import allow_all_origins
from decorators import validate_user
import json




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
    filePath = confObj['root_data_path'] +'/' +user

    # automatically append the job_ prefix to any job name
    if jobname != '' and 'job_' != jobname[:4]:  jobname = 'job_'+jobname

    jobObj = None
    with open(filePath+'/jobFiles/'+jobname) as jobFileHandle:
        jobObj = json.loads(jobFileHandle.read())

    return jobObj