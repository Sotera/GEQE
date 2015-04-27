import boto3
import os
import datetime
import json
import sys

DEFAULT_BUCKET = 'geqebin'




def saveBytesToS3(bucket,key,bytes):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket)
    bucket.put_object(Key=key,Body=bytes)


def getBytesFromS3(bucket,key):
    s3 = boto3.resource('s3')
    object = s3.Object(bucket, key)
    return object.get()['Body'].read()




def submitJob(jobname,jobConf,polyFilePath,bucket=DEFAULT_BUCKET):
    """
    Save job details to s3 and submit jobname to the message queue
    :param jobConf:
    :param polyFilePath:
    :param bucket:
    :return:
    """

    saveBytesToS3(bucket,jobname+'/job.conf',json.dumps(jobConf))
    with open(polyFilePath,'r') as handle:
        bytes = handle.read()
        saveBytesToS3(bucket,jobname+'/poly.txt',bytes)

    saveBytesToS3(bucket,jobname+'/STATUS_WAITING',"")




def getStatus(jobname,bucket=DEFAULT_BUCKET):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket)
    keys =  [x.key.replace(jobname+'/','') for x in bucket.objects.filter(Prefix=jobname)]
    keys = filter(lambda x: 'STATUS_' == x[:7],keys)
    if len(keys) != 1:
        return "UNKNOWN STATUS"
    else:
        return keys[0]



def getAllJobStatus(bucket=DEFAULT_BUCKET):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket)
    keys =  [x.key for x in bucket.objects.all()]
    keys = filter(lambda x: x[:3] == 'job' and 'STATUS_' in x,keys)
    statusDict = {}
    for key in keys:
        (job,status) = key.split('/')
        status = status.replace('STATUS_','')
        if job in statusDict:
            statusDict[job] = 'UNKNOWN STATUS'
        else:
            statusDict[job] = status
    return statusDict






def saveJobResults(jobname,bucket=DEFAULT_BUCKET):

    try:
        getBytesFromS3(bucket,jobname+'/STATUS_SUCCESS')
        jobconf = json.loads( getBytesFromS3(bucket,jobname+'/job.conf') )

        with open(jobconf['score_save_path'],'w') as handle:
            handle.write(getBytesFromS3(bucket,jobname+'/score'))

        with open(jobconf['dict_save_path'],'w') as handle:
            handle.write(getBytesFromS3(bucket,jobname+'/dict'))
        return True
    except:
        # the job did not complete or had errors
        return False



if __name__ == '__main__':
    if len(sys.argv) != 2:
        print 'requires job name to save results'
        sys.exit(1)
    else:
        saveJobResults(sys.argv[1])