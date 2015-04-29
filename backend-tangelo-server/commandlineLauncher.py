from threading import Thread
from threading import Condition
import subprocess
import os
import tangelo



JOB_STATUS = {}
JOBS = []
condition = Condition()


class ConsumerThread(Thread):
    def run(self):
        global JOBS
        while True:
            condition.acquire()
            try:
                if not JOBS:
                    tangelo.log('no jobs in queue, killing thread')
                    return
                (jobname,commandArgs,workdir) = JOBS.pop(0)
                JOB_STATUS[jobname] = 'RUNNING'
            finally:
                condition.release()

            #run the job
            tangelo.log("JOB "+jobname)
            tangelo.log("WORDIR "+workdir)
            tangelo.log("COMMAND "+str(commandArgs))
            os.chdir(workdir)
            stdoutFile = open('stdout.log','w')
            stderrFile = open('stderr.log','w')
            result = subprocess.call(commandArgs,stdout=stdoutFile,stderr=stderrFile)
            stderrFile.close()
            stdoutFile.close()

            condition.acquire()
            try:
                if result == 0:
                    JOB_STATUS[jobname] = 'SUCCESS'
                    tangelo.log('Job '+jobname+" SUCCESS")
                else:
                    JOB_STATUS[jobname] = 'ERROR'
                    tangelo.log('Job '+jobname+" ERROR")
            finally:
                condition.release()

CONSUMER = None



def runCommand(jobname,commandArgs,workdir='.'):
    """
    Schedule a job to run.
    :param jobname: name of job to run
    :param launchCommand: command to execute
    :param workdir: full path to working directory
    :return: None
    """
    global CONSUMER
    condition.acquire()
    try:
        JOB_STATUS[jobname] = 'WAITING'
        JOBS.append( (jobname,commandArgs,workdir))
        if CONSUMER is None or not CONSUMER.isAlive():
            CONSUMER = ConsumerThread()
            CONSUMER.start()
    finally:
        condition.release()






def getStatus(jobname):
    """
    Get status of a previously submitted job
    :param jobname:
    :return:
    """
    condition.acquire()
    try:
        if jobname in JOB_STATUS:
            status = JOB_STATUS[jobname]
            if status == 'SUCCESS' or status == 'ERROR':
                del JOB_STATUS[jobname]
            return [{'jobname':jobname, 'status': status}]
        else: return [{'jobname': jobname, 'status': "JOB NOT FOUND"}]
    finally:
        condition.release()


def getAllJobStatus():
    condition.acquire()
    try:
        jobList = []
        for jobname,status in JOB_STATUS.iteritems():
            jobList.append({'jobname':jobname, 'status':status})
        return jobList
    finally:
        condition.release()