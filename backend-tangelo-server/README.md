#GEQE JOB SERVER API

Provides an interface between client applications and a spark cluster to run GEQE machine learning jobs / pipelines.


#Change summary

```
2015-05-27:
  Added clusterStatus call.


2015-05-14: 
  Removed filePath and subDir references from API to abstract away file system details from users.
  Replaced getFileContents with getPolygon
  Replaced several call to populate various lists with a single /populate endpoint
```



##applyScores

```
    Train a model based on the input polygon and dataset, then execture the model over the same
    dataset to find similliar regions or events.
    
    :param user:  username
    :param filePolygon:  name of the polygon set to be used for training a geqe model
    :param fileAppOut: name of the resulting score set
    :param fScoreThresh:  percentage of entries to return (1.0-0.0 scale)
    :param dataSet:    name of the dataset to use for model training and execution
    :param useTime: (true/false)  Perform training based on a timed events (set by dates in the polygon)
    :param nFeatures:   number of features to use for machine learning
    :param custStopWord: comma sepperated list of custom stop words to remove from data.
    :return: jobname   job_username_<fileAppOut>
```
    
##applyViewTrainingData
  
```
    Filter the dataset based on the input polygon provided and return
    the points

    :param user:  username
    :param filePolygon: polygon set to use for filtering
    :param fileAppOut: name of resulting output
    :param dataSet:  dataset to execute over
    :return:  jobname:   job_training_data_username_Ap<fileAppOut>
```
  
##getPolygon

```
Get a polygon set by name
    :param fileName:  name of the polygon set
    :param user:  username
    :return:  The polygon as a json objectget
```

##getScores

```
 Get a json data structure representing the scored data points from a geqe job

    :param user: username
    :param fileAppOut: name of the score set to load
    :param maxOut: maximum number of bins (or points) to return
    :param drawMode: (cluster | latlonbin | individual) Determines how data points are clustered into bins for the result set.
        cluster - DBSCAN / convexHUll algorithim to find clustered points
        latlonbin - simple lat / lon binning based on clipping lat/lon data.
        individual - returns individual points without binning.
    :param bBinByDate: (true/false)  cluster points by date to find events.
    :param fBinSize: size for latlon binning
    :param threshhold: minimum score of data points to return
    :return:  JSON data for scored points in bins
```


##getTrainingData

```
Get the json object representing points in a training data set.
    :param user: username
    :param fileAppOut: name of training dataset
    :param maxOut: max number of points to return
    :return:  json Object representing pointsget
```

##jobDetails

```
 Return the details of job, including the dataset, polygon set name and score set name.
    :param user: username
    :param jobname: job name
    :return: JSON  { dataSetName : "...", polygonFile: "...", scoreFile: "...", jobname: "..."}
```


##jobStatus

```
 Get the status for a current job by jobname
    :param jobname:
    :return: job status
```


##writePoly

```
 Save a polygon set
    :param user: username
    :param filePolygon: name of polygon set
    :param fileString: polygon set data.
    :return:  "wrote <filePolygon>" returned if successful.
```

##populate

```
 Get a list of items based on sub path
    /populate/polygons:  return list of polygon sets
    /populate/scores:  returns list of score sets
    /poptulate/trainingdata returns list of training data sets
    /populate/datasets: returns list of datasets available

    :param operation:  (polygons | scores | trainingdata | datasets )
    :param user: username
    :return:  list or requested items
```  

##clusterStatus

```
Returns WAITING or OFF to indicate status of backend cluster.
```

