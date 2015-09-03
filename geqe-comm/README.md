## Geqe Web Communication Layer / Utility  VERSION 0.1.0 - public beta

geqe-comm is a a set of utilities used to connect the Geo Event Query By Example (GEQE) web application to a Spark machine learning backend.


### Why isn't this built into the webserver?

Good question!  There are a lot of ways to set up and run a compute cluster.  In some cases your webserver may have direct access to your compute cluster, in which case submiting jobs directly from the webser would make sense.  In many other cases however the webserver will have no direct cluster access.  To support all types of clusters we abstract away the task of launching jobs out of the webserver and run it as ist own process. Using the loop back data-sever rest API as a job queue, we can submit jobs from the webserver, and launch them on the cluster.


### Design:

1. The GeqeConsumer polls for jobs from a loopback data server and runs them in a FIFO order
2. The GeqeRunner is launched by GeqeConsumer using spark-submit.
3. Spark settings and loopback sever settings are read from geqeconf.py
4. Optionally result sets can be written to an elasticsearch instance.


###Testing / Development

The MockGeqeConsumer can stand in as a mock backend and return pre-generated results for front-end
testing and development.


### Quickstart  

1. Copy geqeconf.py.template to geqeconf.py
2. Set PROJECT_ROOT_PATH in geqeconf.py to the location of the GEQE repo on your machine.  i.e: /home/users/you/GEQE
3. Setup and launch the loopback server and webserver
4. If you have processed data and spark cluster ready to go edit your geqeconf.py and run python GeqeConsumer.py   (you can use geqe-comm/data-loaders to add your dataset metadata to the system to make it usable.)
5. For front end development / testing with staged data and a spark cluster run python MockGeqeConsumer.py
