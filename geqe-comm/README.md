## Geqe Web Communication Layer / Utility

geqe-comm is a a set of utilities used to connect the Geo Event Query By Example (GEQE) web application to a Spark machine learning backend.


###Design:

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
4. If you have processed data and spark cluster ready to go edit your geqeconf.py and run python GeqeConsumer.py  
5. For front end development / testing with staged data and a spark cluster run python MockGeqeConsumer.py
