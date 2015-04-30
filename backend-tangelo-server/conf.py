import json

# set the path to your data set config file
CONFIG_PATH = 'conf.json'

def get(path = CONFIG_PATH):
    with open(path,'r') as handle:
        config = json.loads(handle.read())
    return config

