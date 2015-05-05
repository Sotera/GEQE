import sys
sys.path.append(".")
import conf
import json
import tangelo
import os
import time
import datetime
import commandlineLauncher

def generate_job_name():
    """ generate a job id based on the current time """
    return 'job_viewTrainingData_'+str(datetime.datetime.now()).replace(' ','_')


@tangelo.restful
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


    if 'local' == confObj['deploy-mode'] or 'cluster' == confObj['deploy-mode']:
        jobname = generate_job_name()
        commandlineLauncher.runCommand(jobname,launchCommand,filePath)
        return jobname

    elif 'aws-emr' == confObj['deploy-mode']:
        import awsutil
        bucket = confObj['s3-bucket']
        jobname = generate_job_name()
        jobconf = {}
        jobconf['run_command'] = launchCommand
        jobconf['traindata_save_path'] = filePath+'previewTrainingFiles/'+fileAppOut
        awsutil.submitJob(jobname,jobconf,filePath+'inputFiles/'+filePolygon,bucket)
        tangelo.log("Submited job to aws. "+jobname)
        return jobname

    else:
        raise Exception("Invalid deploy mode in conf.json.  should be local cluster or aws-emr")