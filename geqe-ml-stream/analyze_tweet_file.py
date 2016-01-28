import os
import sys
import elasticsearch
import datetime
import time
sys.path.insert(0, './lib/')
from clustering import ScoreRecord, ScoreBin, assign_to_cluster, datetime_to_es_format

def analyze_recent(tweet_file_path, es_url=None):
    if es_url == None:
        es = elasticsearch.Elasticsearch()
    else:
        es = elasticsearch.Elasticsearch([es_url])

    files = sorted(os.listdir(tweet_file_path), key=lambda x: os.stat(os.path.join(tweet_file_path, x)).st_mtime)
    new_records = {}
    for file in files:
        if file in ["analyzed", "live_stream"]:
            continue
        print "analyzing file:", file
        d0 = open(tweet_file_path + "/" + file)
        for line in d0:
            sr = ScoreRecord(line)
            sr.write_to_es("jag_geqestream_documents", "post", es)
        os.rename(tweet_file_path+"/"+file, tweet_file_path+"/analyzed/"+file)

    #count = es.count(index="jag_hc2_documents", doc_type="post", q="post_date:"+tag)["count"]
    #associate querries with the existing hashtag list
now = datetime.datetime.now()
timewindow = now - datetime.timedelta(hours=1)
res = es.search(\
   index="jag_geqestream_documents", \
   doc_type="post", \
   body={
       "filter": {
           "bool":{
               "must" :[
                   {
                       "range": {
                           "post_date":{
                                "gte" : datetime_to_es_format(timewindow),
                                "lte" : datetime_to_es_format(now)
                             }
                        }
                    }
                ]
            }
        }
    }\
)


def main():
    file_path = "raw_tweet_data"
    run = True
    while run:
        try:
            if len(os.listdir(file_path)) > 2:
                print "file found"
                analyze_recent(file_path, es_url="http://scc:9200")
            else:
                time.sleep(30)
        except:
            continue

if __name__ == '__main__':
    main()