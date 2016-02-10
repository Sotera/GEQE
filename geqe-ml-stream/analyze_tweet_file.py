import sys
import datetime
import time
import elasticsearch
import os
sys.path.insert(0, './lib/')
from geqe_models import model_loader
from clustering import ScoreRecord, ScoreBin


def chop_coord(coord, scale=0.005):
    return float(int(coord/scale))*scale

def rec_to_key(rec):
    k_la = str(chop_coord(rec.lat))
    k_lo = str(chop_coord(rec.lon))
    k_dt = str(rec.dt.date())+"_"+str(rec.dt.hour)
    return "_".join([k_la, k_lo, k_dt])

def analyze_recent(tweet_file_path, analyze_points, models, es_url=None):
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
    bins = {}
    print "\tAnalyzing", n_hits, "hits"
    while n_hits>0:
        n_hits = n_hits - len(response["hits"]["hits"])
        for hit in response["hits"]["hits"]:
            sr = ScoreRecord(hit, 1)
            k = rec_to_key(sr)
            if k in bins.keys():
                bins[k].add_record(sr)
            else:
                bins[k] = ScoreBin(sr)
        if n_hits > 0:
            response= es.scroll(scroll_id=scrollId, scroll= "10m")

    full_bins = filter(lambda x: x.users>5, bins.values())
    print "\tScoring", len(full_bins), "bins"
    for fb in full_bins:
        for k, v in models.iteritems():
            fb.apply_model(k, v)
        if len(fb.model_scores.keys()) > 0:
            fb.save_score(es, "jag_geqestream_points", "post")

def main():
    file_path = "raw_tweet_data"
    run = True
    ana_time = datetime.datetime.now()
    analyze_points = False
    models = model_loader("./models")
    while run:
        try:
            if datetime.datetime.now().hour is not ana_time.hour:
                ana_time = datetime.datetime.now()
                analyze_points = True
            if len(os.listdir(file_path)) > 2 and analyze_points==True:
                print "Applying Scores at:", ana_time
                analyze_recent(file_path, analyze_points, models, es_url="http://scc:9200")
                analyze_points = False
            else:
                time.sleep(300)
        except:
            continue

if __name__ == '__main__':
    main()