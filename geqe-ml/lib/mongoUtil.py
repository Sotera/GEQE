import pymongo
from pymongo import MongoClient

class MongoHelper:


    def __init__(self,database,connectionString=None,):
        """
        Create a mongo helper object.
        :param connectionString:  None for default local host or a mongoDB URI i.e. 'mongodb://localhost:27017/'
        :return:
        """
        if connectionString is None:
            self.client = MongoClient()
        else:
            self.client = MongoClient(connectionString)
        self.db = self.client[database]

    def getStopWords(self):
        raise NotImplementedError()

    def getJobObj(self,username,jobname):
        raise NotImplementedError()

    def getShapeObj(self,jobObj):
        raise NotImplementedError()

    def saveDictObj(self,jobObj,dictObj):
        raise NotImplementedError()

    def saveScoreObj(self,jobObj,scoreObj):
        raise NotImplementedError()





