import tangelo
import sys
sys.path.append(".")
import conf
from decorators import allow_all_origins

@tangelo.restful
@allow_all_origins
def get():
    """
    Get the status for the backend cluster.
    :param jobname:
    :return: OFF or WAITING
    """

    confObj = conf.get()
    if 'local' == confObj['deploy-mode'] or 'cluster' == confObj['deploy-mode']:
        return 'WAITING'
    elif 'aws-emr' == confObj['deploy-mode']:
        bucket = confObj['s3-bucket']
        import awsutil
        try:
            return awsutil.getClusterStatus(bucket)
        except:
            return 'OFF'
    else:
        return 'OFF'


