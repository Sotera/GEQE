import sys
sys.path.append(".")
import conf
import tangelo
import json

"""
Reads in a json config file to speciy data set types and paths



"""

# set the path to your data set config file
DATA_SETS_CONFIG_PATH = 'data-sets.json'


@tangelo.restful
def get():
  confObj = conf.get()
  return confObj['datasets'].keys()



