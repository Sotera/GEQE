import argparse
from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext
import json
import codecs

"""
Collect stats for a dataset (standard non-aggregated parquet file format)
and write them to a file
"""


def getDatasetStats(sqlContext,inputPath,partitions=-1):
    """
    Collects aggregate dataset stats
    :param sqlContext:
    :param inputPath:
    :param partitions:
    :return:  dictionary of statistics
    """


    df = sqlContext.parquetFile(inputPath).cache()
    if partitions >0: df = df.repartition(partitions)
    df.registerTempTable("data")

    sources = []
    for source in sqlContext.sql('select distinct(source) from data').collect():
        sources.append(source[0])


    stats  = sqlContext.sql('select count(1) as total,'
                            'max(lat) as max_lat,'
                            'min(lat) as min_lat,'
                            'max(lon) as max_lon,'
                            'min(lon) as min_lon,'
                            'max(dt) as max_dt,'
                            'min(dt) as min_dt '
                            'from data').collect()[0].asDict()

    stats['sources'] = sources
    stats['count'] = stats['total']
    del stats['total']
    stats['dateRange'] = {
        'min': str(stats['min_dt']).split(' ')[0],
        'max': str(stats['max_dt']).split(' ')[0]
    }
    del stats['min_dt']
    del stats['max_dt']
    stats['boundingPoly'] = [
        {"lat":stats['max_lat'],"lng":stats['min_lon']},
        {"lat":stats['max_lat'], 'lng': stats['max_lon']},
        {'lat':stats['min_lat'], 'lng': stats['max_lon']},
        {'lat':stats['min_lat'], 'lng': stats['min_lon']}
    ]
    del stats['max_lat']
    del stats['max_lon']
    del stats['min_lat']
    del stats['min_lon']

    stats['datasetPath'] = inputPath

    return stats






if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("inputPath", help="Data path (e.g. 'hdfs://namenode/pathToData/")
    parser.add_argument("-f", help="output file path default=None, prints to stdout",default='stats.json')
    parser.add_argument("-p", type=int, help="number of output partitions", default=-1)
    parser.add_argument("--cc",help="set spark.sql.parquet.compression.codec, default: gzip",default ='gzip')
    args = parser.parse_args()

    #Declare Spark Context
    conf = SparkConf()
    conf.set('spark.sql.parquet.compression.codec',args.cc)
    sc = SparkContext(conf = conf)
    sqlContext = SQLContext(sc)

    stats = getDatasetStats(sqlContext,args.inputPath,partitions=args.p)

    jsonString = json.dumps(stats,sort_keys=True,indent=4,separators=(',',':'))
    print jsonString
    if args.f != '':
        with codecs.open(args.f,'w',encoding='utf8',) as handle:
            handle.write(jsonString )