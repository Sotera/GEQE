### GEQE Elastic Search Scripts 

In the geqe application elastic earch is used to provide real time geo queries of underlying data.  THis enhances the UI by allowing users to see the underlying data, while simplifying the machine learning backend by allowing it to only work on aggregated vectors.

#### Pre-reqs

1. Have an elasticsearch cluster set up
2. Download the elasticsearch hadoop jar.
3. Have a spark cluster set up (for bulk ingest into elastic search)

#### Steps

1. Use the commands in index_creation_etc_via_curl.txt to create an index for geqe posts and add a mapping.
2. Use the es_ingest.scala script in a spark-shell (see spark_shell_start.sh) to ingest all posts into elastic search.

