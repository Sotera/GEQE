import requests
import datetime
import json





class ElasticSearchHelper:

    """
    Simple Elastic Search Helper
    Push result set data to an elastic search instance
    """

    def __init__(self,host,port=9200,protocol="http"):
        self.serviceUrl = protocol+"://"+host+":"+str(port)


    def addResultSet(self,resultset):
        url = self.serviceUrl+"/geqe-results/result/"
        response = requests.post(url,headers={'Content-type': 'application/json'}, data = json.dumps(resultset))
        return (response.status_code,response.json())



class GeqeRestHelper:

    """
    Interface to the geqe-dataserver using a REST API to get and load data.
    """

    def __init__(self,serviceURL):
        self.serviceURL = serviceURL


    ### Basic REST methods ###

    def _POST(self,url,params):
        url = self.serviceURL+url
        response = requests.post(url,headers={'Content-type': 'application/json'},data=json.dumps(params))
        return (response.status_code,response.json())

    def _PUT(self,url,params):
        url = self.serviceURL+url
        response = requests.put(url,headers={'Content-type': 'application/json'},data=json.dumps(params))
        return (response.status_code,response.json())

    def _DELETE(self,url):
        url = self.serviceURL+url
        response = requests.delete(url)
        return (response.status_code,response.text)


    def _GET(self,url):
        url = self.serviceURL+url
        response = requests.get(url)
        return (response.status_code,response.json())



    ### Polygon files / site lists

    def getSiteListById(self,id):
        url = '/api/sitelists/'+id
        return self._GET(url)

    def addSiteList(self,data):
        url = '/api/sitelists'
        return self._POST(url,data)


    ###  data sets  ###

    def getAllDatasets(self):
        url = '/api/datasets'
        return self._GET(url)


    def getDatasetByName(self,name):
        url = '/api/datasets/'+str(name)
        return self._GET(url)


    def addDataset(self,name,path,type,partitions,description='',id=None):
        dataset = {
            "name": name,
            "path": path,
            "type": type,
            "partitions": int(partitions),
            "description": description
        }
        url = '/api/datasets'
        return self._POST(url,dataset)


    def saveDataset(self,datasetObject):
        url = '/api/datasets'
        return self._PUT(url,datasetObject)

    def deleteDataset(self,name):
        url = '/api/datasets/'+name
        return self._DELETE(url)


    ###  jobs ###

    def getNextJob(self):
        url = '/api/jobs/findOne'
        query =  '?filter[where][status]=WAITING&filter[order]=created'
        return self._GET(url+query)

    def saveJob(self,job):
        url = '/api/jobs'
        return self._PUT(url,job)

    def getJob(self,id):
        url = '/api/jobs/'+str(id)
        return self._GET(url)


    ### result sets ###

    def saveResultset(self,data):
        url = '/api/resultsets'
        return self._POST(url,data)


    ### models ###

    def saveModelData(self,data):
        url = '/api/geqeModels'
        return self._POST(url,data)

    def getModelData(self,id):
        url = '/api/geqeModels/'+str(id)
        return self._GET(url)



    ###  cluster status ###

    def putStatus(self,data):
        url = '/api/clusterStatuses'
        return self._PUT(url,data)

    def deleteStatus(self,data):
        url = '/api/clusterStatuses/'+data['id']
        return self._DELETE(url)




###  DATA CONVERSION AND MOCK DATA FUNCTIONS ###



def new_resultset(type,name,username,jobId):
    return {
        "jobId": jobId,
        "type": type,
        "name": name,
        "username": username,
        "bingroups" : []
    }


def new_binGroup(bins,date=None):
    bingroup = {"count" : len(bins)}
    if date is not None:
        bingroup['day'] = date
    bingroup['bins'] = bins
    return bingroup


def new_bin(score,significantTerms,centerPoint,boundingBox,totalCount):
    return {
        'score':score,
        'significantTerms':significantTerms,
        'centerPoint': {'lat': centerPoint[0], 'lng': centerPoint[1]},
        'boundingPoly': map(lambda x: {'lat': x[0], 'lng':x[1]}, boundingBox),
        'totalCount': totalCount
    }


def rawResultToResultDocument(job,data):
    """
    Transoform a raw result file from the machine learning backend to the document format
    required by the Geqe-dataserver.
    :param job:
    :param data:
    :return:
    """
    resultset = new_resultset(data['type'],job['name'],job['username'],job['id'])

    if 'modelDict' in data:
        resultset['modelTerms'] = data['modelDict']

    if 'place' == data['type']:
        bins = []
        for cluster in data['clusters']:
            centerPoint = (cluster['lat'],cluster['lon'])
            bin = new_bin(cluster['score'],cluster['dict'],centerPoint,cluster['poly'],cluster['nTotal'])
            bins.append(bin)
        binGroup = new_binGroup(bins)
        resultset['bingroups'].append(binGroup)


    elif 'event' == data['type']:
        binGroups = []
        for date_str,clusters in data['dates'].iteritems():
            bins = []
            for cluster in clusters['clusters']:
                centerPoint = (cluster['lat'],cluster['lon'])
                bin = new_bin(cluster['score'],cluster['dict'],centerPoint,cluster['poly'],cluster['nTotal'])
                bins.append(bin)
            binGroup = new_binGroup(bins,date = str(datetime.datetime.strptime(date_str,"%Y-%m-%d")))
            binGroups.append(binGroup)
        resultset['bingroups'].extend(binGroups)

    else:
        raise Exception("Invalid result set type: "+data['type'])

    return resultset







def getMockDataSet(shape=1):
    """
    MOCK function for testing and dev,
    Can return 1 of 2 different MOCK datasets.

    This alows a data set to be selected from the front-end web application
    to allow end to end testing using GeqeConsumer as a mock data service
    without first requring the user to add a dataset.

    :param shape 1 or 2:
    :return:  Dataset metadata object, with no real underlying data.
    """
    boundingPoly = None
    if shape == 1:
        name = "MOCK 1"
        boundingPoly =[
            {"lat": 41.55 ,"lng": -81.95 },
            {"lat": 41.55,"lng": -81.45 },
            {"lat": 41.25,"lng": -81.45},
            {"lat": 41.25,"lng": -81.95}
        ]
    else:
        name = "MOCK 2"
        points = [(36.50963615733049, -100.107421875),(36.50963615733049, -103.07373046875),(32.02670629333614, -103.095703125),(31.989441837922904, -106.5234375),(28.940861769405565, -103.271484375),(29.821582720575016, -102.568359375),(29.66896252599253, -101.25),(26.45090222367262, -99.07470703125),(26.391869671769022, -97.36083984375),(28.497660832963472, -96.50390625),(29.53522956294847, -94.50439453125),(31.109388560814963, -93.40576171875),(33.54139466898275, -94.06494140625),(33.76088200086917, -96.328125),(34.50655662164561, -99.84375)]
        boundingPoly = []
        for (lat,lon) in points:
            boundingPoly.append({"lat":lat,"lng":lon})

    return {
        "name" : name,
        "event_path": "__MOCK__",
        "location_path": "__MOCK__",
        "dictionaryPath": "__MOCK__",
        "type" : -1,
        "location_partitions" : -1,
        "event_partitions" : -1,
        "description" : "MOCK empty dataset for testing",
        "count": 8000000,
        "sources" : ["twitter","instagram"],
        "boundingPoly": boundingPoly,
        "dateRange": {"min": "2014-01-01", "max": "2014-12-31"}
    }


