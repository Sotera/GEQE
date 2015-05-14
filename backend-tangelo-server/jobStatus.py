import tangelo
import sys
sys.path.append(".")
import conf
import commandlineLauncher
from decorators import allow_all_origins
import json

@tangelo.restful
@allow_all_origins
def get(jobname=''):

    confObj = conf.get()
    if 'local' == confObj['deploy-mode'] or 'cluster' == confObj['deploy-mode']:
        if '' != jobname:
            return commandlineLauncher.getStatus(jobname)
        else:
            return json.dumps(commandlineLauncher.getAllJobStatus())

    elif 'aws-emr' == confObj['deploy-mode']:
        bucket = confObj['s3-bucket']
        import awsutil
        if jobname != '':
            return awsutil.getStatus(jobname,bucket)
        else:
            return awsutil.getAllJobStatus(bucket)

    else:
        return "?"

