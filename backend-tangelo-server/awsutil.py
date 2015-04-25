import boto3
import os
import datetime
import json

DEFAULT_BUCKET = 'geqebin'


def generate_job_name():
    """ generate a job id based on the current time """
    return 'job_'+str(datetime.datetime.now()).replace(' ','_')


def saveBytesToS3(bucket,key,bytes):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket)
    bucket.put_object(Key=key,Body=bytes)


def getBytesFromS3(bucket,key):
    s3 = boto3.resource('s3')
    object = s3.Object(bucket, key)
    return object.get()['Body'].read()



def saveResultsConf(jobname,scoreFilePath,dictFilePath,bucket=DEFAULT_BUCKET):
    """
    Create and save a configuration file so we know where in the local file system to store
    results when the job is finished
    """

    conf = {}
    conf['scoreFile'] = scoreFilePath
    conf['dictFile'] = dictFilePath
    conf = json.dumps(conf)
    saveBytesToS3(bucket,jobname+'/results.conf',conf)


def readResultsConf(jobname,bucket=DEFAULT_BUCKET):
    """
    Read in the results conf so we know where to store results
    """

    bytes = getBytesFromS3(bucket,jobname+'/results.conf')
    return json.loads(bytes)


def createJob(runConf,polyFilePath,scoreFilePath,dictFilePath,bucket=DEFAULT_BUCKET):
    jobname = generate_job_name()
    saveBytesToS3(bucket,jobname+'/run.conf',json.dumps(runConf))
    saveResultsConf(jobname,scoreFilePath,dictFilePath,bucket)

    with open(polyFilePath,'r') as handle:
        bytes = handle.read()
        saveBytesToS3(bucket,jobname+'/poly.txt',bytes)
    saveBytesToS3(bucket,jobname+'/STATUS_PENDING',"")
    return jobname


def readJob(jobname,bucket=DEFAULT_BUCKET):

    if not os.path.isdir(jobname): os.mkdir(jobname)

    # save the polygon file
    bytes = getBytesFromS3(bucket,jobname+'/poly.txt')
    with open(jobname+'/poly.txt','w') as handle:
        handle.write(bytes)
        handle.close()



