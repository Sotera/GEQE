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




@tangelo.restful
@allow_all_origins
@validate_user
def get(user="demo",filePolygon='polyFile.txt',fileAppOut='appliedScores',
        fScoreThresh='0.005',
        dataSet='',
        useTime="false", nFeatures="300", custStopWord=""):
    """
    Train a model based on the input polygon and dataset, then execture the model over the same
    dataset to find similliar regions or events.

    :param user:  username
    :param filePolygon:  name of the polygon set to be used for training a geqe model
    :param fileAppOut: name of the resulting score set
    :param fScoreThresh:  percentage of entries to return (1.0-0.0 scale)
    :param dataSet:    name of the dataset to use for model training and execution
    :param useTime: (true/false)  Perform training based on a timed events (set by dates in the polygon)
    :param nFeatures:   number of features to use for machine learning
    :param custStopWord: comma sepperated list of custom stop words to remove from data.
    :return: jobname   username_<fileAppOut>
    """


    useTime = ("true" == useTime) or ("True" == useTime)

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
    dataSetPartitions = str(dataSetObj['partitions']) if 'partitions' in dataSetObj else None
    filePath = confObj['root_data_path'] +'/' +user

    cleanCustStop = custStopWord.replace(" ","").replace("\"","\\\"")

    algorithm = "aynWald_fsp.py" if not useTime else "timeWald_fsp.py"
    jobname = generate_job_name(user,fileAppOut)

    # deploy using spark submit
    launchCommand = [ sparkSettings['SPARK_SUBMIT_PATH']+"spark-submit"]
    launchCommand.extend(sparkSettings['SPARK_OPTIONS'])
    launchCommand.extend([algorithm,dataSetPath])

    #
    if  'aws-emr' == confObj['deploy-mode'] :
        launchCommand.append('poly')
    else:
        launchCommand.append(filePath+"/inputFiles/"+filePolygon)



    launchCommand.extend([jobname,"-datTyp",str(dataSetType)])
    if fScoreThresh is not None and '' != fScoreThresh: launchCommand.extend(["-sThresh",fScoreThresh])
    if nFeatures is not None and nFeatures != '': launchCommand.extend(["-nFeatures", nFeatures])
    if cleanCustStop is not None and cleanCustStop !='': launchCommand.extend(["-sCustStop", "\"" + cleanCustStop + '\"'])
    if dataSetPartitions is not None: launchCommand.extend(['-partitions',dataSetPartitions])





    # write the job file
    jobHeader = {
        'polygonFile' : filePolygon,
        'scoreFile': fileAppOut,
        'dataSetName': dataSetName,
        'jobname': jobname
    }
    with open(filePath+'/jobFiles/'+jobname,'w') as jobFile:
        jobFile.write(json.dumps(jobHeader))



    if 'local' == confObj['deploy-mode'] or 'cluster' == confObj['deploy-mode']:
        workdir = confObj['workdir']
        commandlineLauncher.runCommand(jobname,launchCommand,workdir,filePath)
        return jobname

    elif 'aws-emr' == confObj['deploy-mode']:
        import awsutil
        bucket = confObj['s3-bucket']
        jobconf = {}
        jobconf['run_command'] = launchCommand
        jobconf['dict_save_path'] =  filePath+'/dictFiles/dict_'+fileAppOut
        jobconf['score_save_path'] = filePath+'/scoreFiles/'+fileAppOut
        awsutil.submitJob(jobname,jobconf,filePath+'/inputFiles/'+filePolygon,bucket)
        tangelo.log("Submited job to aws. "+jobname)
        return jobname

    else:
        raise Exception("Invalid deploy mode in conf.json.  should be local cluster or aws-emr")



def generate_job_name(user,scoreFile):
    """ generate a job id based on the current time """
    filename = scoreFile if ('/' not in scoreFile) else scoreFile.split('/')[-1]
    return user+'_'+filename

