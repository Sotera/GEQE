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

    # TODO underlying bug here, we do not prevent multiple users from having the same jobname
    # so users can stomp on each others jobs quite easily.

    # automatically append the job_ prefix to any job name
    if jobname != '' and 'job_' != jobname[:4]:  jobname = 'job_'+jobname

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

