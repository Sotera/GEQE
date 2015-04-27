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




def submitJob(jobConf,polyFilePath,bucket=DEFAULT_BUCKET):
    """
    Save job details to s3 and submit jobname to the message queue
    :param jobConf:
    :param polyFilePath:
    :param bucket:
    :return:
    """
    jobname = generate_job_name()

    saveBytesToS3(bucket,jobname+'/job.conf',json.dumps(jobConf))
    with open(polyFilePath,'r') as handle:
        bytes = handle.read()
        saveBytesToS3(bucket,jobname+'/poly.txt',bytes)

    saveBytesToS3(bucket,jobname+'/STATUS_PENDING',"")

    return jobname





