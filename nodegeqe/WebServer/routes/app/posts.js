var express = require('express');
var router = express.Router();

var netHelpers = just_include('netHelpers');

var ES_HOST = '172.21.10.140';//'scc.silverdale.dev';
var ES_PORT = 9200;



/*
Get posts based on a bounding box and optional text query

    example:  curl -H "Content-Type: application/json"  -XPOST http://localhost:3000/app/posts/bin -d '{
         "from": 0,
         "size": 100,
         "boundingPoly": [
             {"lat": 41.462,"lng": -81.697},
             {"lat": 41.462, "lng": -81.69800000000001},
             {"lat": 41.461,"lng": -81.69800000000001},
             {"lat": 41.461,"lng": -81.697}
         ],
         "query_string": "The first rule of fight club is"
     }'

 */
router.post('/bin', function (req, res) {

    var query = { "query": {"filtered": {}}};
    if (req.body.from) query["from"] = req.body.from;
    if (req.body.size) query["size"] = req.body.size;
    query["query"]["filtered"]["query"] = getMatchQuery( req.body.query_string );
    query["query"]["filtered"]["filter"] =  getGeoPolygonFilter( req.body.boundingPoly);

    netHelpers.performAjaxRequest(ES_HOST, ES_PORT, '/geqe/post/_search', 'POST',query,function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }
        res.status(200).send(resultObject);
    })

});


/**
 * Query all points within the result set
 * post body example: {"query_string": "hello world", "resultset": resultsetObject}
 */
router.post('/resultset', function (req, res) {
    var resultset = req.body.resultset;
    var query_string = req.body.query_string;

    var query = { "query": {"filtered": {}}};
    if (req.body.from) query["from"] = req.body.from;
    if (req.body.size) query["size"] = req.body.size;
    query["query"]["filtered"]["query"] = getMatchQuery( query_string );

    // generate a filter for each are in the results
    var filters = [];
    for (var i in resultset["bingroups"]){
        for (var j in resultset["bingroups"][i]["bins"]){
            var bin = resultset["bingroups"][i]["bins"][j];
            filters.push(getGeoPolygonFilter(bin.boundingPoly))
        }
    }
    query["query"]["filtered"]["filter"] =  {"bool": { "should" : filters}};

    netHelpers.performAjaxRequest(ES_HOST, ES_PORT, '/geqe/post/_search', 'POST',query,function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }
        res.status(200).send(resultObject);
    })

});


/**
 * Query all points within the result set
 * post body example: {"query_string": "hello world", "sitelist": sitelistObject}
 */
router.post('/sitelist', function (req, res) {
    var sitelist = req.body.sitelist;
    var query_string = req.body.query_string;

    var query = { "query": {"filtered": {}}};
    if (req.body.from) query["from"] = req.body.from;
    if (req.body.size) query["size"] = req.body.size;
    query["query"]["filtered"]["query"] = getMatchQuery( query_string );

    // generate a filter for each are in the results
    var filters = [];
    for (var i in sitelist["sites"]){
        var site = sitelist["sites"][i];
        var points = getGeoPoints(site.lats,site.lons);
        filters.push(getGeoPolygonFilter(points))
    }
    query["query"]["filtered"]["filter"] =  {"bool": { "should" : filters}};

    netHelpers.performAjaxRequest(ES_HOST, ES_PORT, '/geqe/post/_search', 'POST',query,function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }
        res.status(200).send(resultObject);
    })

});

module.exports = router;



/// Helper fucntions


/**
 * Return the elastic search api geo_polygon_filter for the given list of points
 * @param points  list of geo points [{lat: , lng: },..]
 * @returns  elastic search filter object
 */
function getGeoPolygonFilter(points){
    var coordinates = []
    for (var i in points){
        coordinates.push( [ points[i].lng, points[i].lat] )
    }
    // close the polygon
    coordinates.push( [ points[0].lng, points[0].lat] );

    var filter =  {
        "geo_shape": {
            "location": {
                "shape":{
                    "type": "polygon",
                    "coordinates" : [coordinates]
                }
            }
        }
    }
    return filter
}


/**
 * Given arrays of lats and lons reutrn a list of GeoPoint objects
 * @param lats
 * @param lons
 */
function getGeoPoints(lats,lons){
    var points = []
    if (lats.length != lons.length) {
        throw new Error("Geo arrays of unequal length.")
    }
    for (var i in lats){
        points.push({lng: lons[i], lat: lats[i]})
    }
    return points
}



/**
 * Return a elastic search match query for a query string
 * @param query_string
 * @returns {undefined}
 */
function getMatchQuery(query_string){
    var query = undefined;
    if (query_string && query_string != ""){
        query = {
            "match" : {
                "message" : {
                    "query" : query_string,
                    "operator" : "or"
                }
            }
        }
    } else {
        query = {"match_all": { } }
    }
    return query
}