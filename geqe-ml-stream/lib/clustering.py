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

def rec_to_key(rec, scale=0.005):
    k_la = str(chop_coord(rec.lat, scale))
    k_lo = str(chop_coord(rec.lon, scale))
    k_dt = str(rec.dt.date())+"_"+str(rec.dt.hour)
    return "_".join([k_la, k_lo, k_dt])

def chop_coord(coord, scale=0.005):
    return float(int(coord/scale))*scale

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
            self.indexed_at = datetime.now()
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

    def __str__(self):
        return str(self.toDict())

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
            'indexedDate': datetime_to_es_format(self.indexed_at),
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
        self.model_scores = {}
        self.dt = datetime.now()
        self.lat = None
        self.lon = None
        if record is not None:
            self.captions.append(record.text)
            self.users.add(record.username)
            self.dt = record.indexed_at
            self.lat = chop_coord(record.lat)
            self.lon = chop_coord(record.lon)

    def __str__(self):
        return str(self.to_dict())

    def bin_size(self):
        return len(self.users)

    def add_record(self, record):
        self.captions.append(record.text)
        self.users.add(record.username)

    def to_dict(self):
        return {
            'nUnique': len(self.users),
            'nTotal': len(self.captions),
            'key': self.key,
            'model_scores': self.model_scores,
            'date': datetime_to_es_format(self.dt),
            'hour': self.dt.hour,
            'lat': str(self.lat),
            'lon': str(self.lon)
        }

    def apply_model(self, model_name, model_dict):
        tfidf = model_dict['tf-idf']
        bag_of_words = ''
        for cap in self.captions:
            bag_of_words = bag_of_words + " " + cap
        X = tfidf.transform([bag_of_words])
        rf_model = model_dict['rfm']
        self.model_scores[model_name] = rf_model.predict(X)[0]

    def save_score(self, es, es_clust_ind, es_clust_type):
        es.index(index=es_clust_ind, doc_type=es_clust_type, id=str(uuid.uuid4()), body = self.to_dict())
