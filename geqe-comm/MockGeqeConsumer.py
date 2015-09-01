import sys,time,os
import subprocess
from threading import Thread
import GeqeAPI
import geqeconf as conf
import json
import platform

print '\nproject root: ',conf.PROJECT_ROOT_PATH
print 'looback url: ',conf.LOOPBACK_SERVICE
print 'spark-submit: ',conf.SPARK_SUBMIT_PATH
print '--py-files: ',conf.PY_FILES
if conf.PROJECT_ROOT_PATH is None or conf.PROJECT_ROOT_PATH == '' or conf.PROJECT_ROOT_PATH[0] == '.':
    raise ValueError("You mest set PROJECT_ROOT_PATH in geqeconf.py to the full system path of the root project.")
os.chdir(conf.PROJECT_ROOT_PATH)


"""

Long running job to wait for and jobs to be submitted and return canned MOCK data.

Usage:
python MockGeqeConsumer.py  (requires a geqe-dataserver instance to be running)

"""


class JobRunner(Thread):

    def __init__(self,serviceUrl):
        super(JobRunner,self).__init__()
        self.url = serviceUrl
        self.service = GeqeAPI.GeqeRestHelper(self.url)


    def run(self):
        while True:
            job = self.getJob()

            # fail the job if we can't pull the associated data
            try:
                dataset = self.getDataset(job)
                if 'geqeModelId' not in job: polygon = self.getPolygon(job)
            except:
                self.setJobStatus(job, 'FAILED')
                raise

            self.setJobStatus(job, 'ACCEPTED')
            print 'JOB ACCEPTED ', job
            success = self.executeJob(job)
            if not success:
                self.setJobStatus(job, 'FAILED')


    def getJob(self):
        print 'Waiting for job.'
        while True:
            try:
                (status,job) = service.getNextJob()
            except:
                print 'Lost connection to ',self.url
                time.sleep(60)
                continue
            if status == 404:
                # no jobs found in WAITING state
                time.sleep(conf.WAIT_TIME)
                continue
            if status != 200:
               raise Exception('Error getting next job. status: '+str(status))
            return job

    def setJobStatus(self,job,status):
        job['status'] = status
        (status,data) = self.service.saveJob(job)
        if status != 200:
            raise Exception('Unable to save job. response code: '+str(status))
        return job



    def getDataset(self,job):
        (status,dataset) = self.service.getDatasetByName(job['datasetId'])
        if status != 200:
            raise Exception("Could not get get dataset for job. status: "+str(status))
        return dataset


    def getPolygon(self,job):
        (status,polygon) = self.service.getSiteListById(job['siteListId'])
        if status != 200:
            raise Exception("Could not get site list for job. status: "+str(status))
        return polygon



    def executeJob(self,job):

        time.sleep(5)
        job['status'] = 'RUNNING'
        (responseCode,job) =  self.service.saveJob(job)
        if responseCode != 200:  raise Exception("could not save job status.")


        filePath = conf.MOCK_DATA_PATH[job['queryType']]
        with open(filePath,'r') as handle:
            data = json.loads(handle.read())
        result_set = GeqeAPI.rawResultToResultDocument(job,data)
        (response,result_set) = self.service.saveResultset(result_set)
        if response != 200:
            job['status'] = 'FAILED'
            self.service.saveJob(job)
            print str(result_set)
            raise Exception("Could not save result set. error: "+str(response))

        if 'modelSavePath' in job and job['modelSavePath'] is not None:
            # save the model meta data
            modelData = {
                "name" : job['name'],
                "username": job["username"],
                "queryType": job["queryType"],
                "modelSavePath": job['modelSavePath'],
                "siteListId" : job["siteListId"],
                "datasetId" :  job["datasetId"]
            }

            (response,modelData) = self.service.saveModelData(modelData)
            if response != 200:
                job['status'] = 'FAILED'
                self.service.saveJob(job)
                raise Exception("Could not save model metadata: "+str(response)+" \n"+str(modelData))



        # save the results set into elastic search
        if conf.ES_HOST is not None:
            elaticsearchConnetor = GeqeAPI.ElasticSearchHelper(conf.ES_HOST,port=conf.ES_PORT)
            (response,es_result) = elaticsearchConnetor.addResultSet(result_set)
            if response != 201:
                job['status'] = 'FAILED'
                self.service.saveJob(job)
                raise Exception("Could not save result set to es. error: "+str(response)+" \n"+str(result_set))


        time.sleep(5)
        job['status'] = 'SUCCESS'
        job['resultsetId'] = result_set['id']
        (response,job) = self.service.saveJob(job)
        if response != 200:
            raise Exception("could not save job status.")

        return True






if __name__ == '__main__':
    global CLUSTER_STATUS

    service = GeqeAPI.GeqeRestHelper(conf.LOOPBACK_SERVICE)

    # insert mock dataset for front end testing, ensures a usable UI
    for shape in [1,2]:
        dataset = GeqeAPI.getMockDataSet(shape=shape)
        (response,dataset) = service.saveDataset(dataset)
        if response != 200:
            print 'response: ',response
            print  dataset
            raise Exception("Could not save MOCK dataset.")

    (response,clusterStatus) = service.putStatus({'host': platform.node(), 'status':'RUNNING'})
    if response!= 200:
        print 'response: ',response
        print  clusterStatus
        raise Exception("Could not save cluster status.")


    thread = JobRunner(conf.LOOPBACK_SERVICE)
    thread.setDaemon(True)
    try:
        thread.start()
        while thread.isAlive():
            thread.join(sys.maxint)
    except (KeyboardInterrupt, SystemExit):
        sys.exit()
    finally:
        service.deleteStatus(clusterStatus)
