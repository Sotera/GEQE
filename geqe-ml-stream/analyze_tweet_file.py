import os
import sys
import elasticsearch
import datetime
import time
sys.path.insert(0, './lib/')
from clustering import ScoreRecord, ScoreBin, assign_to_cluster, datetime_to_es_format

def analyze_recent(tweet_file_path, analyze_points, es_url=None):
    if es_url == None:
        es = elasticsearch.Elasticsearch()
    else:
        es = elasticsearch.Elasticsearch([es_url])

    files = sorted(os.listdir(tweet_file_path), key=lambda x: os.stat(os.path.join(tweet_file_path, x)).st_mtime)
    for file in files:
        if file in ["analyzed", "live_stream"]:
            continue
        print "analyzing file:", file
        d0 = open(tweet_file_path + "/" + file)
        for line in d0:
            sr = ScoreRecord(line)
            sr.write_to_es("jag_geqestream_documents", "post", es)
        os.rename(tweet_file_path+"/"+file, tweet_file_path+"/analyzed/"+file)

    query = {"filter":{"bool":{"must":[{"range":{"post_date":{"gte":"now-1h"}}}]}}}
    n_hits = es.search(index="jag_geqestream_documents", doc_type="post", body=query, search_type="count")['hits']['total']
    scanResp = es.search(index="jag_geqestream_documents", doc_type="post", body=query, search_type="scan", scroll="10m")
    scrollId= scanResp['_scroll_id']
    response= es.scroll(scroll_id=scrollId, scroll= "10m")
    hits = []
    while n_hits>0:
        n_hits = n_hits - len(response["hits"]["hits"])
        for hit in response["hits"]["hits"]:
            hits.append(hit)
        if n_hits > 0:
            response= es.scroll(scroll_id=scrollId, scroll= "10m")


def main():
    file_path = "raw_tweet_data"
    run = True
    ana_time = datetime.datetime.now() - datetime.timedelta(hours=1)
    analyze_points = False
    while run:
        try:
            if datetime.datetime.now() - ana_time > datetime.timedelta(hours=1):
                ana_time = datetime.datetime.now()
                analyze_points = True
            if len(os.listdir(file_path)) > 2:
                print "file found"
                analyze_recent(file_path, analyze_points, es_url="http://scc:9200")
                analyze_points = False
            else:
                time.sleep(30)
        except:

            continue

if __name__ == '__main__':
    main()