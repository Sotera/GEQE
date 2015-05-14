import sys
sys.path.append(".")
from decorators import allow_all_origins
import conf
import json
import tangelo
import os
import time
import datetime
import commandlineLauncher

def generate_job_name(scoreFile):
    """ generate a job id based on the current time """
    filename = scoreFile if ('/' not in scoreFile) else scoreFile.split('/')[-1]
    return 'job_training_data_'+filename



@tangelo.restful
@allow_all_origins
def get(filePath='./',filePolygon='',fileAppOut='',dataSet=''):

    if filePath[-1] != '/': filePath = filePath+"/"


    # load the correct dataset by name from the data set config file
    confObj = conf.get()
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
        launchCommand.append("inputFiles/"+filePolygon)
        launchCommand.append("previewTrainingFiles/"+fileAppOut)


    launchCommand.extend(["-jobNm","geqe-viewTrainingData",
                          "-datTyp",str(dataSetType)
    ])


    jobname = generate_job_name(fileAppOut)

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
        commandlineLauncher.runCommand(jobname,launchCommand,filePath)
        return jobname

    elif 'aws-emr' == confObj['deploy-mode']:
        import awsutil
        bucket = confObj['s3-bucket']
        jobconf = {}
        jobconf['run_command'] = launchCommand
        jobconf['traindata_save_path'] = filePath+'previewTrainingFiles/'+fileAppOut
        awsutil.submitJob(jobname,jobconf,filePath+'inputFiles/'+filePolygon,bucket)
        tangelo.log("Submited job to aws. "+jobname)
        return jobname

    else:
        raise Exception("Invalid deploy mode in conf.json.  should be local cluster or aws-emr")