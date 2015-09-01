from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext, Row
from pyspark.sql.types import BooleanType
import os
import sys
import argparse
import codecs
sys.path.insert(0, './lib/')
from to_parquet import csvToDataFrame
import shapeReader
import fspLib
import traceback

"""
    Return the underlying data for a region
"""

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("inputFile", help="Directory or file name (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("polygonShapeFile", help="polygon file to speicfy area of interest.")
    parser.add_argument("jobNm", help="Job Name")
    parser.add_argument("-datTyp", type=int, help="Data type, 0-parquent, 1=instagram, 2=twitter.  Default = 0",default=0)
    parser.add_argument("-partitions", help="repartition the input data set before processing.",type=int,default=-1)
    args = parser.parse_args()

    inputPartitions = args.partitions
    inputFile = args.inputFile
    shapeFile = args.polygonShapeFile
    jobNm = args.jobNm
    nDataType = args.datTyp



    #Declare Spark Context
    conf = SparkConf().setAppName(jobNm)
    conf.set('spark.driver.maxResultSize','0')
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)


    #Create polygon list and broadcast variable based on it
    lPolygon = shapeReader.readInShapeJson(shapeFile)
    bc_lTargetPolygons = sc.broadcast(lPolygon)

    #Read in data, coalesce to limit the number of jobs and avoid shuffling issues later in the job

    records = sqlContext.parquetFile(inputFile) if 0 == nDataType else csvToDataFrame(sc,sqlContext,inputFile,nDataType)
    if inputPartitions != -1:
        records = records.repartition(inputPartitions)
    records.cache()
    records.registerTempTable('records')
    sqlContext.registerFunction("inRegionOfInterest", lambda lat,lon: fspLib.inROI(lat,lon,bc_lTargetPolygons),returnType=BooleanType())
    sqlContext.registerFunction("inEventOfInterest", lambda lat,lon,dt: fspLib.inEOI(lat,lon,dt,bc_lTargetPolygons),returnType=BooleanType())
    data = sqlContext.sql("SELECT * from records WHERE inRegionOfInterest(records.lat,records.lon) AND inEventOfInterest(records.lat,records.lon,records.dt)")


    #Split data into 2 DDSs depending on being in our out of region of interest
    rows = data.collect()
    if not os.path.isdir('previewTrainingFiles'): os.mkdir('previewTrainingFiles')
    fOut = codecs.open('previewTrainingFiles/'+jobNm, encoding="utf-8",mode="wb")
    for row in rows:
        try:
            buffer =  [row.lat,row.lon,row.user,row.dt.date(),row.text,row.dt]
            buffer = map(lambda x: unicode(x).replace(u'\t',u' ').replace(u'\n',u' '),buffer)
            fOut.write(u'\t'.join(buffer)+u'\n')
        except:
            traceback.print_exc()
            print "Error with printing record: " + str(row)

