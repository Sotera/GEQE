import boto3
import json
import sys
from threading import Thread
from threading import Condition
import tangelo


CONSUMER_THREAD = None
lock = Condition()


class JobResultsReader(Thread):
    """
    Read and save results from the completed job queue
    """

    def __init__(self,bucket):
        super(JobResultsReader,self).__init__()
        self.bucket = bucket
        self.incoming_url =  getBytesFromS3(bucket,'COMPLETED_QUEUE')

    def run(self):
        sqs = boto3.resource('sqs')
        queue = sqs.Queue(self.incoming_url)
        tangelo.log("JobResultsReader Thread: running.")
        while True:
            tangelo.log("JobResultsReader Thread: waiting for completed job message.")
            while True:
                messages = queue.receive_messages(WaitTimeSeconds=10,MaxNumberOfMessages=1)
                if messages is not None and len(messages) > 0: break
            message = messages[0]
            content = json.loads(message.body)
            tangelo.log("JobResultsReader Thread: got message: "+str(content))
            self.delete_message(queue,message)
            if content['success']: saveJobResults(content['jobname'],self.bucket)



    def delete_message(self,queue,message):
        entries = [{'Id':message.message_id,'ReceiptHandle':message.receipt_handle}]
        response = queue.delete_messages(Entries=entries)
        return 'Successful' in response and len(response['Successful']) > 0



def start_consumer_thread(bucket):
    global CONSUMER_THREAD
    lock.acquire()
    try:
        if CONSUMER_THREAD is None or not CONSUMER_THREAD.isAlive():
            CONSUMER_THREAD = JobResultsReader(bucket)
            CONSUMER_THREAD.setDaemon(True)
            CONSUMER_THREAD.start()
    finally:
        lock.release()



def saveBytesToS3(bucket,key,bytes):
    s3 = boto3.resource('s3')
    s3bucket = s3.Bucket(bucket)
    s3bucket.put_object(Key=key,Body=bytes)


def getBytesFromS3(bucket,key):
    s3 = boto3.resource('s3')
    object = s3.Object(bucket, key)
    return object.get()['Body'].read()


def getClusterStatus(bucket):
    return getBytesFromS3(bucket,'CLUSTER_STATUS')


def submitJob(jobname,jobConf,polyFilePath,bucket):
    """
    Save job details to s3 and submit jobname to the message queue
    :param jobConf:
    :param polyFilePath:
    :param bucket:
    :return:
    """


    JOB_QUEUE_URL = getBytesFromS3(bucket,'WAITING_QUEUE')
    jobname = 'jobs/'+jobname
    saveBytesToS3(bucket,jobname+'/job.conf',json.dumps(jobConf))

    with open(polyFilePath,'r') as handle:
        bytes = handle.read()
        saveBytesToS3(bucket,jobname+'/poly.txt',bytes)

    saveBytesToS3(bucket,jobname+'/STATUS_WAITING',"")
    send_to_queue(JOB_QUEUE_URL,jobname)
    start_consumer_thread(bucket)




def getStatus(jobname,bucket):
    jobname = 'jobs/'+jobname
    s3 = boto3.resource('s3')
    s3bucket = s3.Bucket(bucket)
    keys =  [x.key.replace(jobname+'/','') for x in s3bucket.objects.filter(Prefix=jobname)]
    keys = filter(lambda x: 'STATUS_' == x[:7],keys)
    statusDict = {'jobname':jobname}
    if len(keys) != 1:
        statusDict['status'] = 'UNKNOWN'
    else:
        statusDict['status'] = keys[0].replace('STATUS_','')
    return [statusDict]



def getAllJobStatus(bucket):
    s3 = boto3.resource('s3')
    s3bucket = s3.Bucket(bucket)
    keys =  [x.key for x in s3bucket.objects.all()]
    keys = filter(lambda x: x[:5] == 'jobs/' and 'STATUS_' in x,keys)
    statusList = []
    for key in keys:
        (dir,job,status) = key.split('/')
        status = status.replace('STATUS_','')
        statusList.append({'jobname':job,'status':status})
    return statusList






def saveJobResults(jobname,bucket):

    try:
        getBytesFromS3(bucket,jobname+'/STATUS_SUCCESS')
        jobconf = json.loads( getBytesFromS3(bucket,jobname+'/job.conf') )

        try:
            bytes = getBytesFromS3(bucket,jobname+'/score')
            with open(jobconf['score_save_path'],'w') as handle:
                handle.write(bytes)
        except:
            tangelo.log('No score file path found from job: '+jobname)

        try:
            bytes = getBytesFromS3(bucket,jobname+'/dict')
            with open(jobconf['dict_save_path'],'w') as handle:
                handle.write(bytes)
        except:
            tangelo.log('No dict to save for job: '+jobname)

        try:
            bytes = getBytesFromS3(bucket,jobname+'/traindata')
            with open(jobconf['traindata_save_path'],'w') as handle:
                handle.write(bytes)
        except:
            tangelo.log('No train data to save for job: '+jobname)

        return True
    except:
        # the job did not complete or had errors
        return False



def send_to_queue(url,jobname):
    sqs = boto3.resource('sqs')
    queue = sqs.Queue(url)
    message = json.dumps({'jobname':jobname})
    response = queue.send_message(MessageBody=message)
    return response



if __name__ == '__main__':
    if len(sys.argv) != 3:
        print 'usuage python ',sys.argv[0], ' bucket jobname'
        sys.exit(1)
    else:
        saveJobResults(sys.argv[2],sys.argv[1])