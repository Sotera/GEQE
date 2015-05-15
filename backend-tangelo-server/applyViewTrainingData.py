import sys
sys.path.append(".")
from decorators import allow_all_origins
from decorators import validate_user
import conf
import json
import tangelo
import os
import time
import datetime
import commandlineLauncher

def generate_job_name(user,scoreFile):
    """ generate a job id based on the current time """
    filename = scoreFile if ('/' not in scoreFile) else scoreFile.split('/')[-1]
    return 'job_training_data_'+user+'_'+filename



@tangelo.restful
@allow_all_origins
@validate_user
def get(user='demo',filePolygon='',fileAppOut='',dataSet=''):
    """
    Filter the dataset based on the input polygon provided and return
    the points

    :param user:  username
    :param filePolygon: polygon set to use for filtering
    :param fileAppOut: name of resulting output
    :param dataSet:  dataset to execute over
    :return:  jobname:   job_training_data_username_<fileAppOut>
    """


    # load the correct dataset by name from the data set config file
    confObj = conf.get()
    filePath = confObj['root_data_path'] +'/' +user
    dataSetDict = confObj['datasets']
    sparkSettings = confObj['spark']
    if dataSet not in dataSetDict:
        raise ValueError("Data set not found in conf. "+dataSet)
    dataSetObj = dataSetDict[dataSet]
    dataSetName = dataSet
    dataSetPath = dataSetObj['path']
    dataSetType = dataSetObj['type']

    algorithm = "viewTrainingData.py"


    # deploy using spark submit
    launchCommand = [ sparkSettings['SPARK_SUBMIT_PATH']+"spark-submit"]
    launchCommand.extend(sparkSettings['SPARK_OPTIONS'])
    launchCommand.extend([algorithm,dataSetPath])


    if  'aws-emr' == confObj['deploy-mode'] :
        launchCommand.append('poly')
        launchCommand.append('traindata')

    else:
        launchCommand.append(filePath+"/inputFiles/"+filePolygon)
        launchCommand.append(filePath+"/previewTrainingFiles/"+fileAppOut)


    launchCommand.extend(["-jobNm","geqe-viewTrainingData",
                          "-datTyp",str(dataSetType)
    ])


    jobname = generate_job_name(user,fileAppOut)

    # write the job file
    if not os.path.isdir(filePath+'/jobFiles'):
        os.mkdir(filePath+'/jobFiles')
    jobHeader = {
        'polygonFile' : filePolygon,
        'scoreFile': fileAppOut,
        'dataSetName': dataSetName,
        'jobname': jobname,
        'args' : launchCommand
    }
    with open(filePath+'/jobFiles/'+jobname,'w') as jobFile:
        jobFile.write(json.dumps(jobHeader))

    if 'local' == confObj['deploy-mode'] or 'cluster' == confObj['deploy-mode']:
        commandlineLauncher.runCommand(jobname,launchCommand,confObj['workdir'])
        return jobname

    elif 'aws-emr' == confObj['deploy-mode']:
        import awsutil
        bucket = confObj['s3-bucket']
        jobconf = {}
        jobconf['run_command'] = launchCommand
        jobconf['traindata_save_path'] = filePath+'/previewTrainingFiles/'+fileAppOut
        awsutil.submitJob(jobname,jobconf,filePath+'/inputFiles/'+filePolygon,bucket)
        tangelo.log("Submited job to aws. "+jobname)
        return jobname

    else:
        raise Exception("Invalid deploy mode in conf.json.  should be local cluster or aws-emr")