#! /bin/bash

# path to the elasticsearch hadoop jar
ES_JAR="elasticsearch-hadoop-2.1.0.rc1/dist/elasticsearch-spark_2.10-2.1.0.rc1.jar"

# host name for the elasticsearch
ES_HOST=""

spark-shell  \
--driver-memory 2g \
--executor-memory 12g \
--total-executor-cores 25 \
--jars $ES_JAR \
--conf spark.es.resource=geqe/post --conf es.nodes=$ES_HOST
