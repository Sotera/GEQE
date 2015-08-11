from threading import Thread
from threading import Condition
import subprocess
import os
import tangelo


JOB_STATUS = {}
JOBS = []
condition = Condition()
OUTPUT_DIRECTORIES = ['scoreFiles','dictFiles','previewTrainingFiles']

class LocalJob():
    def __init__(self,name,commandArgs,workingDir,saveDir):
        self.jobname = name
        self.commandArgs = commandArgs
        self.workingDir = workingDir
        self.saveDir = saveDir



class ConsumerThread(Thread):
    def run(self):
        global JOBS
        while True:
            condition.acquire()
            try:
                if not JOBS:
                    tangelo.log('no jobs in queue, killing thread')
                    return
                currentJob = JOBS.pop(0)
                JOB_STATUS[currentJob.jobname] = 'RUNNING'
            finally:
                condition.release()

            #run the job
            tangelo.log("JOB "+currentJob.jobname)
            tangelo.log("WORDIR "+currentJob.workingDir)
            tangelo.log("COMMAND "+str(currentJob.commandArgs))
            tangelo.log("SAVE_PATH "+str(currentJob.saveDir))
            os.chdir(currentJob.workingDir)

            stdoutFile = open('stdout.log','w')
            stderrFile = open('stderr.log','w')
            result = subprocess.call(currentJob.commandArgs,stdout=stdoutFile,stderr=stderrFile)
            stderrFile.close()
            stdoutFile.close()


            condition.acquire()
            try:
                if result == 0:
                    # success, copy files to savePath
                    JOB_STATUS[currentJob.jobname] = 'SUCCESS'
                    tangelo.log('Job '+currentJob.jobname+" SUCCESS")

                    # copy files to the save path
                    jobname = currentJob.jobname
                    shortName = jobname[jobname.index('_')+1:] #strip username from jobname

                    for dir in OUTPUT_DIRECTORIES:
                        if os.path.isdir(dir):
                            files = filter(lambda x: jobname == x or 'dict_'+jobname == x,os.listdir(dir))
                            for file in files:
                                src = dir+'/'+file
                                dst = 'dict_' + shortName if 'dict' == file[:4] else shortName
                                dst = currentJob.saveDir+'/'+dir+'/'+dst
                                tangelo.log('moving '+src+' to '+dst)
                                if os.path.exists(dst):
                                    os.remove(dst)
                                os.rename(src,dst)



                else:
                    JOB_STATUS[currentJob.jobname] = 'ERROR'
                    tangelo.log('Job '+currentJob.jobname+" ERROR")
            finally:
                condition.release()

CONSUMER = None



def runCommand(jobname,commandArgs,workdir='.',savePath='.'):
    """
    Schedule a job to run.
    :param jobname: name of job to run
    :param launchCommand: command to execute
    :param workdir: full path to working directory
    :return: None
    """
    global CONSUMER
    job = LocalJob(jobname,commandArgs,workdir,savePath)

    # acquire the lock before touching any queues
    condition.acquire()
    try:
        JOB_STATUS[jobname] = 'WAITING'
        JOBS.append(job)
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