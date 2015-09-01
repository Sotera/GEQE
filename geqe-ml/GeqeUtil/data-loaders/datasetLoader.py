import sys
import argparse
import json
sys.path.append('.')
sys.path.append('..')
import GeqeAPI


"""

Utility program to manually add dataset metadata to the geqe-dataserver.

After ETL and staging of data, metadata must be communicated to the geqe-web application for use.

Each data set must be processed for location type and event type models (training vectors aggregated by date or not).

"""

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("serviceUrl", help="loop back data service url ie http://localhost:5500")
    parser.add_argument("--file", help="bulk load datasets from a file.")
    parser.add_argument("--name", help="name of the dataset")
    parser.add_argument("--location_path", help="path of dataset hdfs://.. or s3://..")
    parser.add_argument("--event_path", help="path of dataset hdfs://.. or s3://..")
    parser.add_argument("--dictionaryPath", help="path of the idf dictionary hdfs://.. or s3://..")
    parser.add_argument("--type", help="data set type. defaults to 0 for parquet files",default=0)
    parser.add_argument("--location_partitions", help="number of partitions to split the dataset into while processing",default=-1)
    parser.add_argument("--event_partitions", help="number of partitions to split the dataset into while processing",default=-1)
    parser.add_argument("--description", help="text description of the data set", default = "")
    parser.add_argument("--delete", action="store_true", help="Delete the dataset by its name.")
    parser.set_defaults(delete=False)
    parser.add_argument("--getAll", action="store_true", help="Return the list of all datasets currently in the system.")
    parser.set_defaults(getAll=False)
    args = parser.parse_args()

    dataConnector = GeqeAPI.GeqeRestHelper(args.serviceUrl)


    if args.getAll:
        (response,data) = dataConnector.getAllDatasets()
        print json.dumps(data,sort_keys=True,indent=4,separators=(',',':'))
        sys.exit(0)

    if args.file is not None:
        with open(args.file,'r') as handle:
            data = json.loads(handle.read())
            for dataset in data:
                (response,dataset) = dataConnector.saveDataset(dataset)
                if response == 200: print dataset['name'],' success'
                else:
                    print dataset['name']
                    print 'RESPONSE ',response
                    print dataset
                    sys.exit(1)
        sys.exit(0)

    if args.name is None:
        print 'name is required.'
        parser.print_help()
        sys.exit(1)


    if args.delete:
        response,data = dataConnector.deleteDataset(args.name)
        print 'DELETE status: ',response
        if response!= 200: print data

    else:
        if args.location_path is None or args.event_path is None or args.dictionaryPath is None:
            print 'path, dictionaryPath, and partitions are required to save a dataset'
            parser.print_help()
            sys.exit(1)
        dataset = {
            "name" : args.name,
            "location_path": args.location_path,
            "event_path": args.event_path,
            "dictionaryPath": args.dictionaryPath,
            "type" : args.type,
            "location_partitions" : args.location_partitions,
            "event_partitions" : args.event_partitions,
            "description" : args.description
        }
        (response,dataset) = dataConnector.saveDataset(dataset)
        if response != 200:
            print "ERROR: response = ",response
            print dataset
            sys.exit(1)
        print 'SUCCESS'
        print dataset


