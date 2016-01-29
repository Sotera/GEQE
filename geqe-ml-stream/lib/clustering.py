import json
import pytz
import re
import uuid
from datetime import datetime, timedelta
from dateutil.tz import tzoffset
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from math import sqrt

def utc_to_local(utc_dt, tz_info, utc_offset):
    # get integer timestamp to avoid precision lost
    if tz_info is not None:
        local_tz = tzoffset(tz_info, utc_offset)
    else:
        local_tz = pytz.timezone('US/Eastern')
    local_dt = utc_dt.replace(tzinfo=pytz.utc).astimezone(local_tz)
    assert utc_dt.resolution >= timedelta(microseconds=1)
    return local_dt.replace(microsecond=utc_dt.microsecond)

def datetime_to_es_format(date):
    return str(date.date())+"T"+str(date.hour)+":"+str(date.minute)+":"+str(date.second)+"Z"

def datetime_from_es(str_dt):
    return datetime.strptime(str_dt, "%Y-%m-%dT%H:%M:%SZ")

def text_to_hashtags(caption):
    term_list = re.sub('[^\w\s#]', '', caption, flags=re.UNICODE).lower().split()
    ret_list = set()
    for term in term_list:
        try:
            if term[0]=="#":
                if term.find("#",1)==-1:
                    if len(term) > 2:
                        ret_list.add(term[1:])
                else:
                    subs = term.split("#")
                    for sub in subs:
                        if len(sub) > 2:
                            ret_list.add(sub)
        except:
            continue
    return list(ret_list)

def assign_to_cluster(recordList, epsilon, n_min):
    lalo = []
    for line in recordList:
        lalo.append([line.lon, line.lat])

    X = StandardScaler().fit_transform(lalo)
    fitObj = StandardScaler().fit(lalo)
    laEps = epsilon/fitObj.std_[0]
    loEps = epsilon/fitObj.std_[1]
    fitEps = sqrt(laEps*laEps+loEps*loEps)
    db = DBSCAN(eps=fitEps, min_samples=n_min).fit(X)
    for ind in range(len(recordList)):
        recordList[ind].cluster = db.labels_[ind]

class ScoreRecord:
    def __init__(self, json_data, data_type=0):
        if data_type==0:
            record = json.loads(json_data)
            self.id = record["id_str"]
            self.lat = record["geo"]["coordinates"][0]
            self.lon = record["geo"]["coordinates"][1]
            self.text = record["text"]
            self.username = record["user"]["screen_name"]
            self.tags = text_to_hashtags(record["text"])
            self.indexed_at = datetime_to_es_format(datetime.now())
            self.dt = utc_to_local(datetime.strptime(record["created_at"],'%a %b %d %H:%M:%S +0000 %Y'), record["user"]["time_zone"], record["user"]["utc_offset"])
            self.cluster = -1
            tag_dict = {}
            for tag in self.tags:
                tag_dict[tag] = ""
            self.cluster_ind = tag_dict
        elif data_type==1:
            d_rec = json_data["_source"]
            d_cids = {}
            for i in range(len(d_rec["tags"])):
                d_cids[d_rec["tags"][i]] = d_rec["cluster"][i]
            self.id = d_rec["id"]
            self.lat = d_rec["location"]["coordinates"][1]
            self.lon = d_rec["location"]["coordinates"][0]
            self.text = d_rec["caption"]
            self.username = d_rec["user"]
            self.tags = d_rec["tags"]
            self.indexed_at = datetime_from_es(d_rec["indexedDate"])
            self.dt = datetime_from_es(d_rec["post_date"])
            self.cluster = -1
            self.cluster_ind = d_cids

    def toDict(self):
        tags = []
        tag_ids = []
        for tag, id in self.cluster_ind.iteritems():
            tags.append(tag)
            tag_ids.append(id)
        obj = {
            'id': self.id,
            'user': self.username,
            'caption': self.text,
            'tags':tags,
            'indexedDate': self.indexed_at,
            'post_date': datetime_to_es_format(self.dt),
            'location':{
                "type":"point",
                "coordinates":[self.lon, self.lat]
            },
            "cluster":tag_ids
        }
        return obj

    def write_to_es(self, es_index, es_doc_type, es):
        es.index(index=es_index, doc_type=es_doc_type, id=self.id, body=json.dumps(self.toDict()))



class ScoreBin:
    def __init__(self, record=None, key=None):
        self.users = set([])
        self.captions = []
        self.key = key
        self.models = {}
        if record is not None:
            self.captions.append(record.text)
            self.users.add(record.username)

    def add_record(self, record):
        self.captions.append(record.text)
        self.users.add(record.username)

    def to_dict(self):
        return {
            'nUnique': len(self.users),
            'nTotal': len(self.captions),
            'key': self.key
        }

    def apply_model(self, model_name, model_dict):


    # def cluster_and_write_to_es(self, epsilon, n_min, n_min_users, es_obj, es_doc_index, es_doc_type, es_clust_index, es_clust_type):
    #     print "Clustering tag:", self.tag
    #     assign_to_cluster(self.records, epsilon, n_min)
    #     for no_clust in filter(lambda x: x.cluster == -1, self.records):
    #         no_clust.write_to_es(es_doc_index, es_doc_type, es_obj)
    #
    #     clusters_nums = set(map(lambda x: x.cluster, filter(lambda x: x.cluster != -1, self.records)))
    #     self.n_clusters = len(clusters_nums)
    #     for num in clusters_nums:
    #         clustered_recs = sorted(filter(lambda x: x.cluster == num, self.records), key=lambda x: x.dt)
    #         cluster_users = set(map(lambda x: x.username, clustered_recs))
    #         cluster_inds = set(map(lambda x: x.cluster_ind[self.tag], clustered_recs))
    #         #proceed by case
    #         #trivial case - cluster found with only existing entries:
    #         if len(cluster_inds) == 1 and "" not in cluster_inds:
    #             print "Case 0"
    #             continue
    #         #case 1 - new clusters found
    #         elif len(cluster_inds) == 1:
    #             #verify clusters have minimum unique authors
    #             if len(cluster_users) > n_min_users:
    #                 print "Case 1a"
    #                 cluster_id = str(uuid.uuid4())
    #                 self.write_cluster_to_es(cluster_id, len(clustered_recs), len(cluster_users), clustered_recs[0], es_obj, es_clust_index, es_clust_type)
    #                 for record in clustered_recs:
    #                     record.cluster_ind[self.tag] = cluster_id
    #                     record.write_to_es(es_doc_index, es_doc_type, es_obj)
    #             else:
    #                 print "Case 1b"
    #                 for record in clustered_recs:
    #                     record.write_to_es(es_doc_index, es_doc_type, es_obj)
    #         #case 2 - new entries associated with existing cluster
    #         elif len(cluster_inds) == 2:
    #             print "Case 2"
    #             c_list = list(cluster_inds)
    #             cluster_id = c_list[0] if c_list[0] != "" else c_list[1]
    #             self.write_cluster_to_es(cluster_id, len(clustered_recs), len(cluster_users), clustered_recs[0], es_obj, es_clust_index, es_clust_type, overwrite=True)
    #             new_recs = filter(lambda x: x.cluster_ind == "", clustered_recs)
    #             for record in new_recs:
    #                 record.cluster_ind[self.tag] = cluster_id
    #                 record.write_to_es(es_doc_index, es_doc_type, es_obj)
    #         #case 3 - new entries cause existing clusters to merge
    #         else:
    #             print "Case 3"
    #             clusts = []
    #             for ind in list(cluster_inds):
    #                 if ind != "":
    #                     clusts.append(es_obj.get(index=es_clust_index, doc_type=es_clust_type, id=ind))
    #             clusts = sorted(clusts, key=lambda x: x["_source"]["num_posts"])
    #             cluster_id = clusts[0]["_id"]
    #             self.write_cluster_to_es(cluster_id, len(clustered_recs), len(cluster_users), clustered_recs[0], es_obj, es_clust_index, es_clust_type, overwrite=True)
    #             recs_to_change = filter(lambda x: x.cluster_ind != cluster_id, clustered_recs)
    #             for record in recs_to_change:
    #                 record.cluster_ind = cluster_id
    #                 record.write_to_es(es_doc_index, es_doc_type, es_obj)
    #             #remove old cluster entries, make sure no older posts were missed
    #             to_remove = map(lambda x: x["_id"], clusts[1:])
    #             for ind in to_remove:
    #                 es_obj.delete(index=es_clust_index, doc_type=es_clust_type, id=ind)
    #                 count = es_obj.count(index=es_doc_index, doc_type=es_doc_type, q="cluster:"+ind)["count"]
    #                 if count > 0:
    #                     res = es_obj.search(index=es_doc_index, doc_type=es_doc_type, body={"query":{"match":{"cluster":ind}}})
    #                     for hit in res["hits"]["hits"]:
    #                         sr = ScoreRecord(hit, data_type=1)
    #                         sr.cluster_ind[self.tag] = cluster_id
    #                         sr.write_to_es(es_doc_index, es_doc_type, es_obj)

    # def write_cluster_to_es(self, c_id, n_recs, n_users, first_rec, es_obj, es_clust_index, es_clust_type):
    #     post_date = datetime_to_es_format(first_rec.dt)
    #     now = datetime.now()
    #     body = {
    #         "tag":self.tag,
    #         "post_date":post_date,
    #         "indexed_date":datetime_to_es_format(now),
    #         "num_posts":n_recs,
    #         "num_users":n_users,
    #         "location":{
    #             "type":"point",
    #             "coordinates":[first_rec.lon, first_rec.lat]
    #         }
    #     }
    #     es_obj.index(index=es_clust_index, doc_type=es_clust_type, id=c_id, body=json.dumps(body))
