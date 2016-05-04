############# ############# ############# #############
# Elasticsearch Reader
# by JAG3
# Class for handling read/write to elasticsearch
############# ############# ############# #############
from copy import copy

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

    def post_df_from_es(self, resource, sc):
        es_rdd = self.read_from_es(resource, sc)
