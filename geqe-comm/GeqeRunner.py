from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext
import sys
sys.path.append('.')
sys.path.append('lib')
sys.path.append('geqe-ml')
sys.path.append('geqe-ml/lib')
import argparse
import GeqeAPI
import shapeReader
import fspLib


"""
  Spark Job to read data from the geqe api and lauch jobs / save results.   Lauched via spark-submit.

"""




def run_findSimilarPlaces(sc,sqlContext,jobNm,inputFile,dictionaryFile,nDataType,inputPartitions,sNum,lPolygon,modelSavePath):
    import findSimilarPlaces
    result = findSimilarPlaces.run(jobNm,sc,sqlContext,inputFile,lPolygon,dictionaryFile,
        nDataType=nDataType,
        inputPartitions=inputPartitions,
        sNum=sNum,
        writeFileOutput=False,
        modelSavePath=modelSavePath)
    return result


def run_findSimilarEvent(sc,sqlContext,jobNm,inputFile,dictionaryFile,nDataType,inputPartitions,sNum,lPolygon,modelSavePath):
    import findSimilarEvent
    result = findSimilarEvent.run(jobNm,sc,sqlContext,inputFile,lPolygon,dictionaryFile,
        nDataType=nDataType,
        inputPartitions=inputPartitions,
        sNum=sNum,
        writeFileOutput=False,
        modelSavePath=modelSavePath)
    return result

def run_refindSimilarPlaces(sc,sqlContext,jobNm,inputFile,dictionaryFile,inputPartitions,sNum,modelPath,bByDate=False):
    import refindSimilarPlaces
    result = refindSimilarPlaces.run(jobNm, sc, sqlContext, inputFile, dictionaryFile,
                             bByDate=bByDate,
                             inputPartitions=inputPartitions,
                             sNum=sNum,
                             modelPath=modelPath)
    return result


def executeJob(dataConnector,elaticsearchConnetor,job,dataset,sitelist):

    #Declare Spark Context
    conf = SparkConf().setAppName("GeqeRunner")
    conf.set('spark.driver.maxResultSize','0')
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    #Create polygon list and broadcast variable based on it
    lPolygon = shapeReader.readInShapeDocument(sitelist) if sitelist is not None else None

    queryType = job['queryType']

    jobname = job['username']+'_'+job['name']
    modelSavePath = job['modelSavePath'] if 'modelSavePath' in job else None

    datasetPath = None
    inputPartitions = None
    if job['queryType'] == 'location':
        datasetPath = dataset['location_path']
        inputPartitions = dataset['location_partitions']
    elif job['queryType'] == 'event':
        datasetPath = dataset['event_path']
        inputPartitions = dataset['event_partitions']
    else: raise ValueError("invalid query type: "+str(job['queryType']))

    dictionaryPath = dataset['dictionaryPath']
    nDataType = int(dataset['type'])

    modelData = None
    if 'geqeModelId' in job and job['geqeModelId'] != "":
        (response,modelData) = dataConnector.getModelData(job['geqeModelId'])
        if response != 200: raise Exception("Could not load geqeModel")
        #iif modelData['dictionaryPath'] != dictionaryPath:
        #    raise ValueError("dataset dictionary and model dictionary do not match")

    sNum = job['limit'] if 'limit' in job else 25

    result = None
    if modelData:
        modelPath = modelData['modelSavePath']+'/'+modelData['name']
        result = run_refindSimilarPlaces(sc,sqlContext,jobname,datasetPath,dictionaryPath,inputPartitions,sNum,modelPath,bByDate= queryType == 'event')
    elif 'location' == queryType:
        result = run_findSimilarPlaces(sc,sqlContext,jobname,datasetPath,dictionaryPath,nDataType,inputPartitions,sNum,lPolygon,modelSavePath)
    elif 'event' == queryType:
        result = run_findSimilarEvent(sc,sqlContext,jobname,datasetPath,dictionaryPath,nDataType,inputPartitions,sNum,lPolygon,modelSavePath)
    else:
        raise Exception("Invalid query type: "+queryType)


    if modelSavePath is not None:
        # save the model meta data
        modelData = {
            "name" : jobname,
            "username": job["username"],
            "queryType": job["queryType"],
            "modelSavePath": modelSavePath,
            "siteListId" : job["siteListId"],
            "datasetId" :  job["datasetId"]
        }
        (response,modelData) = dataConnector.saveModelData(modelData)
        if response != 200:
            job['status'] = 'FAILED'
            dataConnector.saveJob(job)
            raise Exception("Could not save model metadata: "+str(response)+" \n"+str(modelData))


    result = GeqeAPI.rawResultToResultDocument(job,result)
    # save the result
    (response,result_set) = dataConnector.saveResultset(result)
    if response != 200:
        job['status'] = 'FAILED'
        dataConnector.saveJob(job)
        raise Exception("Could not save result set. error: "+str(response)+" \n"+str(result_set))


    # save the results set into elastic search
    if elaticsearchConnetor is not None:
        (response,es_result) = elaticsearchConnetor.addResultSet(result_set)
        if response != 201:
            job['status'] = 'FAILED'
            dataConnector.saveJob(job)
            raise Exception("Could not save result set to es. error: "+str(response)+" \n"+str(result_set))

    # update the job info
    job['status'] = 'SUCCESS'
    job['resultsetId'] = result_set['id']
    (response,job) = dataConnector.saveJob(job)
    if response != 200:
        raise Exception("could not save job status.")







if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("serviceUrl", help="loop back data service url")
    parser.add_argument("--elasticsearchHost", help="Host name or ip address for elastic search.")
    parser.add_argument("--elasticsearchPort" ,type=int, help="Port for elastic search defaults to 9200",default=9200)
    parser.add_argument("jobId", help="The job to execute")
    args = parser.parse_args()


    dataConnector = GeqeAPI.GeqeRestHelper(args.serviceUrl)
    elaticsearchConnetor = GeqeAPI.ElasticSearchHelper(args.elasticsearchHost,port=args.elasticsearchPort) if args.elasticsearchHost else None


    # Job
    (responseCode,job) = dataConnector.getJob(args.jobId)
    if 200 != responseCode: raise Exception("Could not read job: "+args.jobId+' response: '+str(responseCode))
    job['status'] = 'RUNNING'
    (responseCode,job) =  dataConnector.saveJob(job)
    if 200 != responseCode: raise Exception("Could not save job: "+args.jobId+' response: '+str(responseCode))
    print 'JOB: ',job

    # dataset
    (responseCode,dataset) = dataConnector.getDatasetByName(job['datasetId'])
    if 200 != responseCode: raise Exception("Could not load dataset: "+job['datasetId']+' response: '+str(responseCode))
    print 'DATASET: ',dataset

    # polygon / site list
    sitelist = None
    if 'geqeModelId' not in job:
        (responseCode,sitelist) = dataConnector.getSiteListById(job['siteListId'])
        if 200 != responseCode: raise Exception("Could not load sitelist: "+job['siteListId']+' response: '+str(responseCode))
        print 'SITELIST: ',sitelist


    try:
        executeJob(dataConnector,elaticsearchConnetor,job,dataset,sitelist)
    except:
        job['status'] = 'FAILED'
        dataConnector.saveJob(job)
        raise
