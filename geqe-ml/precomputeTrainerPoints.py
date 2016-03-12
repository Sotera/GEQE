############# ############# ############# ############# #############
# preprocess GNIP Twitter Data for use in streaming trainer URL
# by JAG3
#
############# ############# ############# ############# #############

from pyspark import SparkConf, SparkContext
from pyspark.sql import SQLContext, Row
from pyspark.sql.types import BooleanType
import sys
sys.path.insert(0, './lib/')
import aggregatedComparison
import fspLib
import to_parquet
from stream_processing import create_bin

def big_print(in_str):
    print "#################################\n#MESSAGE:\n#", in_str, "\n#\n#################################"

def main():
    conf = SparkConf().setAppName("jag - preprocess twitter")
    sc = SparkContext(conf = conf)

    bc_lStopWords = fspLib.load_stopwords(sc,'inputFiles/stopWordList.txt','')
    dt_low = datetime.date(2015,12,1)
    bc_low = sc.broadcast(dt_low)
    dt_high = datetime.date(2016,1,1)
    bc_high = sc.broadcast(dt_high)

    sqlContext = SQLContext(sc)
    sqlContext.registerFunction("hasScorableWord", lambda text: fspLib.hasScorableWord(text,True,bc_lStopWords),returnType=BooleanType())
    sqlContext.registerFunction("inDateWindow", lambda dt: in_time_window(dt, bc_low, bc_high), returnType=BooleanType())

    raw = to_parquet.csvToDataFrame(sc, sqlContext, "...", 66).cache()
    n_raw = raw.count()
    big_print("Read in " + str(n_raw) + " tweets")

    raw.registerTempTable("raw")
    sqlCommand = "SELECT * from raw WHERE hasScorableWord(text) AND inDateWindwo(dt)"
    df = sqlContext.sql(sqlCommand).cache()
    n_df = df.count()
    big_print("Binning " + str(n_df) + " entries with scorable words")

    binned = df.map(lambda x: (aggregatedComparison.groupString(x, True, 0.01), x))\
                .groupByKey()\
                .filter(lambda x: aggregatedComparison.hasMinUsers(x[1],4))\
                .map(lambda x: create_bin(x))\
                .cache()
    n_binned = binned.count()

    big_print("Writing " + str(n_binned) + "to ES")
    es_write_conf = {
        "es.nodes"    : "localhost", #or ES url
        "es.port"     : "9200",
        "es.resource" : "g_trainer/points"
    }

    binned.saveAsNewAPIHadoopFile(
        path='-',
        outputFormatClass="org.elasticsearch.hadoop.mr.EsOutputFormat",
        keyClass="org.apache.hadoop.io.NullWritable",
        valueClass="org.elasticsearch.hadoop.mr.LinkedMapWritable",
        conf=es_write_conf
    )


if __name__ == "__main__":
    main()