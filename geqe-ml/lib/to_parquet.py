#
# pyspark script for reading in a dataset and converting to a parquet file
#
#  run with spark-submit
# --help for usage



import datetime
import argparse
import traceback
from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext, Row
import json,csv,StringIO



def csvToDataFrame(sc,sqlContext,inputPath,dataType):
    """
    Convert a csv file to a spark dataframe
    :param sc:
    :param inputPath:
    :param dataType:
    :return:
    """
    rowsRDD = sc.textFile(inputPath).map(lambda x: recordToRows(x,dataType))
    goodRowsRDD = rowsRDD.filter(lambda x: x is not None)

    #rowsRDD.cache()
    #goodRowsRDD.cache()
    #allrows = rowsRDD.count()
    #goodRows = goodRowsRDD.count()
    #rowsRDD.unpersist()

    #print 'inputPath: ',inputPath
    #print 'dataType: ',dataType
    #print 'all rows: ',allrows
    #print 'good rows: ',goodRows
    #print 'errors: ',allrows-goodRows

    # infer a scheam to create a spark DataFrame
    df = sqlContext.createDataFrame(goodRowsRDD)
    #df.cache()
    #goodRowsRDD.unpersist()
    return df




def csvToParquet(sc,sqlContext,inputPath,dataType,outputPath,outputPartitions=-1):
    """
    Convert a csv file to parquet,  The csv file must be a recognized data type.
    :param sc:
    :param inputPath:
    :param dataType:
    :param outputPath:
    :param outputPartitions:
    :param feildDelimiter:
    :return:
    """
    print 'inputPath: ',inputPath
    print 'dataType: ',dataType
    print 'outputPath: ',outputPath
    if outputPartitions != -1:
        print 'outputPartitions: ',outputPartitions


    df = csvToDataFrame(sc,sqlContext,inputPath,dataType)

    if outputPartitions > 0:
        df = df.repartition(outputPartitions)

    # save as parquent file
    df.saveAsParquetFile(outputPath)






def recordToRows(line, dType):
    """
    Parse a line from a csv file into a Row object
    :param line:
    :param dType:
    :return: Row(lat,lon,text,dt,user,source,img)
    """
    # Note:  None is not a valid type for the dataframe, ensure all values are filled in.
    dType = int(dType)
    try:
        if dType==1:
            input = StringIO.StringIO(line.encode('utf-8'))
            reader = csv.DictReader(input, fieldnames=["user_name", "user_id_num", "posted_date", "image_url", "caption", "latitude", "longitude", "location_id", "location_name", "comment_count", "comments", "like_count", "likes", "scraped_date"], delimiter='\t')
            retDict = reader.next()
            dt = retDict["posted_date"]
            dt = datetime.datetime.strptime(dt,'%Y-%m-%dT%H:%M:%S') if 'T' in dt else datetime.datetime.strptime(dt,'%Y-%m-%d %H:%M:%S')
            text = retDict['caption'].decode('utf-8')
            return Row(lat=float(retDict['latitude']), lon=float(retDict['longitude']), text=text, dt=dt, user=retDict['user_name'],source='Instagram',img='')
        elif dType==2:
            input = StringIO.StringIO(line.encode('utf-8'))
            reader = csv.DictReader(input, fieldnames=["id","dtg","user_name","user_location","latitude","longitude","caption","language","language_confidence","publish_source"], delimiter='\t')
            retDict = reader.next()
            dt = retDict['dtg']
            dt = datetime.datetime.strptime(dt,'%Y-%m-%dT%H:%M:%S.%fZ') if 'T' in dt else datetime.datetime.strptime(dt,'%Y-%m-%d %H:%M:%S')
            text = retDict['caption'].decode('utf-8')
            return Row(lat=float(retDict['latitude']), lon=float(retDict['longitude']), text=text, dt=dt, user=retDict['user_name'],source='Twitter',img='')
        elif dType==3:
            input = StringIO.StringIO(line.encode('utf-8'))
            reader = csv.DictReader(input, fieldnames=["latitude", "longitude", "caption", "dateTime", "user_name","img_url"], delimiter='\t')
            retDict = reader.next()
            dt = retDict["dateTime"]
            dt = datetime.datetime.strptime(dt,'%Y-%m-%dT%H:%M:%S.%fZ') if 'T' in dt else datetime.datetime.strptime(dt,'%Y-%m-%d %H:%M:%S')
            text = retDict['caption'].decode('utf-8')
            if retDict['img_url'] is None: retDict['img_url'] = ''
            return Row(lat=float(retDict['latitude']), lon=float(retDict['longitude']), text=text, dt=dt, user=retDict['user_name'],source='Unknown',img=retDict['img_url'])
        elif dType==5:
            reader = json.loads(line)
            return Row(lat=float(reader["geo"]["coordinates"][0]),
                       lon=float(reader["geo"]["coordinates"][1]),
                       text=reader["text"].replace("\n", " ").decode('utf-8'),
                       dt=datetime.datetime.strptime(reader["created_at"],'%a %b %d %H:%M:%S +0000 %Y'),
                       user=reader["user"]["screen_name"],
                       source='Twitter',
                       img='')
        elif dType==6:
            reader = json.loads(line)
            return Row(lat=float(reader["geo"]["coordinates"][0]),
                       lon=float(reader["geo"]["coordinates"][1]),
                       text= reader["body"].replace("\n", " ").decode('utf-8'),
                       dt= datetime.datetime.strptime(reader["postedTime"],'%Y-%m-%dT%H:%M:%S.000Z'),
                       user=reader["actor"]["preferredUsername"],
                       source="Twitter",
                       img="")
        elif dType==7:
            reader = None
            if line[0]=='{':
                reader = json.loads(line)
            elif line[0]==',':
                reader = json.loads(line[1:])
            elif line[0]=='[' or line[0]==']':
                return reader

            ent = reader
            if "_source" in reader.keys():
                ent = reader["_source"]

            return Row(lat = float(ent["location"]["latitude"]),
                       lon = float(ent["location"]["longitude"]),
                       text = ent["caption"]["text"],
                       dt = datetime.datetime.fromtimestamp(int(ent['caption']['created_time'])),
                       user = ent["user"]["username"],
                       source = "Instagram",
                       img = ent["link"]
                       )
        else:
            raise ValueError("Invalid data type.")
    except:
        traceback.print_exc()
        return None




if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("inputPath", help="Data path (e.g. 'hdfs://domain.here.dev:/pathToData/")
    parser.add_argument("dataType",help="integer code for data type parsing")
    parser.add_argument("outputPath",help="output path")
    parser.add_argument("-p", type=int, help="number of output partitions", default=-1)
    parser.add_argument("--cc",help="set spark.sql.parquet.compression.codec, default: gzip",default ='gzip')
    args = parser.parse_args()

    #Declare Spark Context
    conf = SparkConf()
    conf.set('spark.sql.parquet.compression.codec',args.cc)
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    csvToParquet(sc,sqlContext,args.inputPath,args.dataType,args.outputPath,args.p)


