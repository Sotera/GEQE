############# ############# ############# #############
# Elasticsearch Reader
# by JAG3
# Class for handling read/write to elasticsearch
############# ############# ############# #############
from copy import copy
from datetime import datetime
from pyspark.sql import Row

class es_reader:
    def __init__(self, ip, port):
        self.conf_posts = {
            'es.nodes' : ip,
            'es.port' : port
        }

    def write_to_es(self, d_out, resource):
        this_index = copy(self.conf_posts)
        this_index['es.resource'] = resource
        d_out.saveAsNewAPIHadoopFile(
            path='-',
            outputFormatClass='org.elasticsearch.hadoop.mr.EsOutputFormat',
            keyClass='org.apache.hadoop.io.NullWritable',
            valueClass='org.elasticsearch.hadoop.mr.LinkedMapWritable',
            conf = this_index
        )

    def read_from_es(self, resource, sc):
        this_index = copy(self.conf_posts)
        this_index['es.resource'] = resource
        return sc.newAPIHadoopRDD(
            inputFormatClass='org.elasticsearch.hadoop.mr.EsInputFormat',
            keyClass='org.apache.hadoop.io.NullWritable',
            valueClass='org.elasticsearch.hadoop.mr.LinkedMapWritable',
            conf = this_index
        )

    def post_df_from_es(self, resource, sc, b_has_size = False):
        es_rdd = self.read_from_es(resource, sc)
        if b_has_size:
            return  es_rdd.map(lambda x: Row(lat = x[1]['location']['coordinates'][1],
                                  lon = x[1]['location']['coordinates'][0],
                                  geo_size = x[1]['geo_size'],
                                  text = x[1]['message'],
                                  dt = datetime(
                                    int(x[1]['post_date'][:4]),
                                    int(x[1]['post_date'][5:7]),
                                    int(x[1]['post_date'][8:10]),
                                    12, 0, 0) if len(x[1]['post_date']) == 10 else datetime(
                                    int(x[1]['post_date'][:4]),
                                    int(x[1]['post_date'][5:7]),
                                    int(x[1]['post_date'][8:10]),
                                    int(x[1]['post_date'][11:13]),
                                    int(x[1]['post_date'][14:16]),
                                    int(x[1]['post_date'][17:19])),
                                  user = x[1]['user'],
                                  source = 'Twitter',
                                  img = ''
                                 )
                        )
        else:
            return es_rdd.map(lambda x: Row(lat = x[1]['location']['coordinates'][1],
                                  lon = x[1]['location']['coordinates'][0],
                                  text = x[1]['message'],
                                  dt = datetime(
                                    int(x[1]['post_date'][:4]),
                                    int(x[1]['post_date'][5:7]),
                                    int(x[1]['post_date'][8:10]),
                                    12, 0, 0) if len(x[1]['post_date']) == 10 else datetime(
                                    int(x[1]['post_date'][:4]),
                                    int(x[1]['post_date'][5:7]),
                                    int(x[1]['post_date'][8:10]),
                                    int(x[1]['post_date'][11:13]),
                                    int(x[1]['post_date'][14:16]),
                                    int(x[1]['post_date'][17:19])),
                                  user = x[1]['user'],
                                  source = 'Twitter',
                                  img = ''
                                 )
                        )

