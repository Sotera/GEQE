# GEQE - Geo Event Query by Example  VERSION 0.1.1-dev - public beta

The GEQE tool (pronounced "Jeh Key") is aimed at leveraging geo-located temporal text data in order to identify locations or events of similar nature.   For more detailed information about our machine learning methods [read the white paper](https://github.com/Sotera/GEQE/blob/master/geqe-ml/docs/geqe-white-paper.pdf). This repository is organized as follows

1.  geqe-ml:  Apache Spark machine learning scripts.  Can be used as a standalone project via command line interface with an Apache Spark Cluster, or as the back end to the geqe web application.

1. geqe-comm:  Communication Layer / Utility, allows front ends to execute spark jobs and contains various data-loaders.

1.  Data service (sotera/GEQEDataService):  Loopback-based data API server.  Abstracts all database interactions for the web app into an easy to use and discover REST API.  The server can be used as an integration point between the geqe-ml backend and other front end applications.

1.  Web app (sotera/GEQEWebApp):  NodeJS server provides a UI for training / applying models and exploring results.  


## Getting Started

1. First go to the geqe-ml directory and see the README and docs.  You'll need to setup some data and an Apache Spark Cluster.  For front end development only you can setup a MOCK service in place of an actual geqe-ml backend, see geqe-comm/MockGeqeConsumer.py

1.  Install GEQEDataService (see project README)

1.  Install GEQEWebApp (see project README)

1.  Run a GeqeConsumer (see geqe-comm) to execute geqe jobs on your spark cluster.
