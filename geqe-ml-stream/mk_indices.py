import elasticsearch

def create_index(es_url=None, delete_old=False):
    #es_url -> the url of the elastic search host, e.g. 'http://myHostname:9200'
    es = None
    if es_url == None:
        es = elasticsearch.Elasticsearch()
    else:
        es = elasticsearch.Elasticsearch([es_url])


    i_client = elasticsearch.client.IndicesClient(es)
    if delete_old==True:
        i_client.delete(index="jag_geqestream_documents")
        i_client.delete(index="jag_geqestream_clusters")

    i_client.create(index="jag_geqestream_documents", \
        body = '''{
            "settings" : {
                "number_of_shards" : 3,
                "number_of_replicas" : 1
            },
            "mappings": {
                "post" : {
                    "properties": {
                        "id": {"type": "string"},
                        "user": {"type" : "string", "index" : "not_analyzed"},
                        "caption" : {"type": "string", "index": "not_analyzed"},
                        "tags" : {"type" : "string"},
                        "post_date" : {"type" : "date"},
                        "location": {
                            "type": "geo_shape",
                            "tree": "quadtree",
                            "precision": "1m"
                        },
                        "cluster": {"type": "string", "index": "not_analyzed"}
                    }
                }
            }
        }'''\
    )

    i_client.create(index="jag_geqestream_points", \
        body = '''{
            "settings" : {
                "number_of_shards" : 3,
                "number_of_replicas" : 1
            },
            "mappings": {
                "post" : {
                    "properties": {
                        "tag" : {"type" : "string", "null_value" : "na"},
                        "post_date" : {"type" : "date"},
                        "indexed_date" : {"type" : "date"},
                        "num_posts" : {"type" :  "integer"},
                        "num_users" : {"type" : "integer"},
                        "location": {
                                     "type": "geo_shape",
                                     "tree": "quadtree",
                                     "precision": "1m"
                                 }
                    }
                }
            }
        }'''\
    )