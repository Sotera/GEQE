## Geqe Web Communication Layer / Utility

GeqeUtil is a a set of utilities used to connect the Geo Event Query By Example (GEQE) web application to a Spark machine learning backend.


###Design:

1. The GeqeConsumer polls for jobs from a loopback data server and runs them in a FIFO order
2. The GeqeRunner is launched by GeqeConsumer using spark-submit.
3. Spark settings and loopback sever settings are read from geqeconf.py
4. Optionally result sets can be written to an elasticsearch instance.
    
    
###Testing / Development

The GeqeConsumer can stand in as a MOCK backend and retun pre-generated results for front-end 
testing and development by setting a MOCK_DATA_PATH in geqeconf.py
    

###For the Geqe Web Applicaitons see:

geqe-webserver (comming soon)
geqe-dataserver (comming soon)
    
    
