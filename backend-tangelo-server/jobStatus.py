import tangelo
import sys
sys.path.append(".")
import conf
import commandlineLauncher
import json

@tangelo.restful
def get(jobname=''):

    confObj = conf.get()
    if 'local' == confObj['deploy-mode'] or 'cluster' == confObj['deploy-mode']:
        if '' != jobname:
            return commandlineLauncher.getStatus(jobname)
        else:
            return json.dumps(commandlineLauncher.JOB_STATUS)

    elif 'aws-emr' == confObj['deploy-mode']:
        import awsutil
        if jobname != '':
            return awsutil.getStatus(jobname)
        else:
            return awsutil.getAllJobStatus()

    else:
        return "?"

