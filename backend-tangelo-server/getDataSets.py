import sys
sys.path.append(".")
from decorators import allow_all_origins
import conf
import tangelo
import json

"""
Reads in a json config file to speciy data set types and paths



"""

# set the path to your data set config file
DATA_SETS_CONFIG_PATH = 'data-sets.json'


@tangelo.restful
@allow_all_origins
def get():
  confObj = conf.get()
  return confObj['datasets'].keys()



