import sys
import argparse
import json
sys.path.append('.')
sys.path.append('..')
import GeqeAPI


"""

Utility program to manually add a resultset / scoreFile to the geqe-dataserver

Intended to be used to migrate data from a command line testing and development environment
into the geqe web application.

For example data format see MOCK_JOB_DATA

"""


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("serviceUrl", help="loop back data service url ie http://localhost:5500")
    parser.add_argument("username", help="geqe username")
    parser.add_argument("name", help="name of the dataset / job")
    parser.add_argument("resultSetPath", help="path to the result file.")

    parser.set_defaults(delete=False)
    args = parser.parse_args()

    dataConnector = GeqeAPI.GeqeRestHelper(args.serviceUrl)

    # create a job object
    job = {
        "name": args.name,
        "status": "WAITING",
        "queryType": "unkown",
        "limit" : -1,
        "username": args.username
    }
    (response,job) = dataConnector.saveJob(job)
    if response != 200:
        print "ERROR: Could not save job. = ",response,job
        sys.exit(1)


    # save the result set
    with open(args.resultSetPath,'r') as handle:
        data = json.loads(handle.read())
    result_set = GeqeAPI.rawResultToResultDocument(job,data)
    (response,result_set) = dataConnector.saveResultset(result_set)
    if response != 200:
        print "ERROR: Could not save result. = ",response,result_set
        sys.exit(1)

    job['status'] = 'SUCCESS'
    job['queryType'] = result_set['type']
    job['resultsetId'] = result_set['id']
    (response,job) = dataConnector.saveJob(job)
    if response != 200:
        print "ERROR: Could not save job. = ",response,job
        sys.exit(1)

    print 'success'




