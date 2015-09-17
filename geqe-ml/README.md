# geqe-ml  VERSION 0.1.1-dev - public beta

Analyze geo-located temporal text data to identify locations of a similar nature

## Structure
You can find a white paper in the docs folder to explain the design concept,
scenarios in which the tool is expected to perform well (and where it will
struggle) and a description of scenarios where various parts of the tool
ought be used.  

## Getting started


### ETL
After pulling the repo, you'll need some data.  For this recipe, we'll focus on
finding hospitals in the greater Cleveland area.  The first step is to get data
from some social media site, we will begin by focusing on twitter. If you don't
already have access to the twitter stream, you'll need to get access via the
twitter API: https://dev.twitter.com/overview/documentation

The format of the twitter stream should leave you with line delimited JSON formatted
data.  You'll be able to verify by direct examination, but this should align with format
type 6 as defined in "lib/to_parquet".  From there, we typically will convert the data to
parquet file format, which is handled by the 'filterData.py'.  You'll need to edit this file;
near the start of the file, you'll see a dictionary named DATA_SETS is defined.  DATA_SETS will
need to have entries added where the key is the HDFS path to the data, and the number is the
type of data.  In addition, if you did not geo bound your scrape, there is an option of adding
such bounds at this time.  To do so, you'll need to create a shape file (as described in geqe.pdf).
Additionally, a few lines that are used to implement this change will need to be uncommented
(at time of this recipe being written they are lines 27, 35, 52-53, 57, and 68).

Executing goes as follows:

```bash
nohup spark-submit
--conf spark.driver.maxResultSize=2g
--py-files lib/aggregatedComparison.py,lib/to_parquet.py,lib/clustering.py,lib/shapeReader.py,lib/pointClass.py,lib/fspLib.py
[any other spark configurations as you see fit]
filterData.py
[shapeFile -> only if you have uncommented line 27, it is the local extention of the shape file]
[outputPath -> the HDFS path where data will be written]
>& output &
```

Once the files are in parquet format, you will need to create an document frequency count for all
tweets.  To do so, you'll need to add all of your parquet file formatted datasets to the file 'precomputeIDF.py'
(by appending the DATA_SETS list, see line 49).  We elect to create a single document frequency count which spans
all data so that models that are trained on one area can be applied to another.  Once the data is added, this program
is run by the following:

```bash
nohup spark-submit
--conf spark.driver.maxResultSize=2g
--py-files lib/aggregatedComparison.py,lib/to_parquet.py,lib/clustering.py,lib/shapeReader.py,lib/pointClass.py,lib/fspLib.py
[any other spark configurations as you see fit]
precomputeIDF.py
[jobNm -> the resulting dictionary file will be dictFiles/dict_jobNm]
>& output &
```

If you give the jobNm of "combinedIDF", the default path for all scripts will find your
IDF file, and as such you will not need to specify when running future steps.

The next step is to aggregate the data by location, and optionally by date.  For this
example, we will omit date aggregation.  Typically, for any data set we create both a
date partitioned and not date partitioned data sets.  To do so:
```bash
nohup spark-submit
--conf spark.driver.maxResultSize=2g
--py-files lib/aggregatedComparison.py,lib/to_parquet.py,lib/clustering.py,lib/shapeReader.py,lib/pointClass.py,lib/fspLib.py
[any other spark configurations as you see fit]
precomputePoints.py
[inputFile -> the place on hdfs you uploaded the parquet files]
[outputPath -> the path on hdfs you will write the resulting files]
[jobNm -> the name of the job]
[outPart -> the number of output partitions.  IMPORTANT - Parquet formated files perform best if they do not exceed the block size, typically 128 MB]
[binSize -> the size of the areas used for training and scoring.  For this example, 0.001 works well, but you can go larger or smaller depending on data density]
[bUseDate -> boolean to determine if date partitioning should be done, for this example, False]
```

###Analysis
At this point, a good deal of work has already been performed toward condensing and vectorizing areas.
The last remaining step is to train the ML classifier based on a specific set of regions of interest.
To do so, we'll be using an "inputFiles/cleveHosp.json".  This file has bounding polygons for four
Cleveland area hospitals.  You will use it with 'findSimilarPlaces.py':

```bash
nohup spark-submit
--conf spark.driver.maxResultSize=2g
--py-files lib/aggregatedComparison.py,lib/to_parquet.py,lib/clustering.py,lib/shapeReader.py,lib/pointClass.py,lib/fspLib.py
[any other spark configurations as you see fit]
findSimilarPlaces.py
[inputFile -> the path to the precomputed points, i.e. output of precomputePoints.py]
[polygonShapeFile -> the path to the input json, for this example "inputFiles/cleveHosp.json"]
[jobNm -> the name of the job, your output file will be in 'scoreFiles/jobNm']
-sThresh [sThresh -> the number of output points, 30-50 for this example]
```
