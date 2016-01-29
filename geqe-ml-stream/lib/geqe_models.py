import json
from sklearn.externals import joblib

def model_loader(path_to_models):
    d0 = json.load(open(path_to_models+"/"+"models.json"))
    models = {}
    for k, v in d0.iteritems():
        models[k] = {}
        for vk, vv in v.iteritems():
            models[k][vk] = joblib.load(path_to_models + "/" + k + "/" + vv)
    return models