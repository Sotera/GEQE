import sys
import json
import argparse
sys.path.append('.')
sys.path.append('..')
import GeqeAPI

"""

Utility program to manually add a sitelist / polygon file to the geqe-dataserver.

Intended to be used to migrate data from a command line testing and development environment
into the geqe web application.


example sitelist.json:

  {
    "sites": [
      {
        "name": "Cleveland OH",
        "lats": [
          41.668808555620586,
          41.668808555620586,
          41.13315883477399,
          41.13315883477399
        ],
        "lons": [
          -82.26193428039551,
          -80.99850654602051,
          -80.99850654602051,
          -82.26193428039551
        ],
        "dates": [{"min": "2014-02-01", "max": "2014-02-30" }]
      }
    ]
  }

"""


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("serviceUrl", help="loop back data service url ie http://localhost:5500")
    parser.add_argument("inputFile", help="polygon file to upload")
    parser.add_argument("--name", help="name of the dataset")
    parser.add_argument("--username", help="name of the user account.")
    args = parser.parse_args()

    dataConnector = GeqeAPI.GeqeRestHelper(args.serviceUrl)

    if args.name is None or args.username is None:
        print 'name and username are required'
        parser.print_help()
        sys.exit(1)



    with open(args.inputFile) as handle:
        data = json.loads(handle.read())
        data['name'] = args.name
        data['username'] = args.username
        for site in data['sites']:
            if 'dates' in site and len(site['dates']) > 0:
                for daterange in site['dates']:
                    seperator = 'T' if 'T' in daterange['min'] else ' '
                    daterange['max'] = daterange['max'].split(seperator)[0]+"T23:59:59"
                    daterange['min'] = daterange['min'].split(seperator)[0]+"T00:00:00"
        #print 'Saving Data'
        #print json.dumps(data, sort_keys=True,indent=4, separators=(',', ': '))

        (response,data) = dataConnector.addSiteList(data)
        if 200 !=response:
            print 'ERROR: response ',response
            print data
            sys.exit(1)
        else:
            print 'SUCCESS'






