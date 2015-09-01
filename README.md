# GEQE - Geo Event Query by Example

The Geo-Event Query by Example tool is aimed at leveraging geo-located temporal text data in order to identify locations or events of similar nature.   This repository is organized as follows

1.  geqe-ml:  Apache Spark machine learning scripts.  Can be used as a standalone project via command line interface with an Apache Spark Cluster, or as the back end to the geqe web application.

2.  LoopBackServer: StrongLoop data API server.  Abstracts all database interactions for the webserver into an easy to use and discover REST API.  The loop back server can be used as an integration point between the geqe-ml backend and other front end applications.

3.  WebServer:  NodeJS server provides a UI for training / applying models and exploring results.  


## Getting Started

1. First go to the geqe-ml directory and see the README and docs.  You'll need to setup some data and an Apache Spark Cluster.  For front end development only you can setup a MOCK service in place of an actual geqe-ml backend, see geqe-ml/GeqeUtil/GeqeConsumer.py

2.  Install and setup the LoopBackServer (see LoopBackServer/README.md)

3.  Install and setup the WebServer (see WebServer/README.md)
