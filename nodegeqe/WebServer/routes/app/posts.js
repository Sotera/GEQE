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
         "query_string": "The first rule of fight club is",
         "dates": [
            {
                "min": "2014-07-01T00:00:00.000Z",
                "max": "2014-07-31T00:00:00.000Z"
            }
         ]
     }'

 */
router.post('/bin', function (req, res) {

    var query = { "query": {"filtered": {}}};
    if (req.body.from) query["from"] = req.body.from;
    if (req.body.size) query["size"] = req.body.size;
    query["query"]["filtered"]["query"] = getMatchQuery( req.body.query_string );
    var filter = {"bool" : {}}
    filter["bool"]["must"] = getGeoPolygonFilter( req.body.boundingPoly);
    if (req.body.dates && req.body.dates.length > 0){
        filter["bool"]["should"] = getDateRangeFilters(req.body.dates)
    }
    query["query"]["filtered"]["filter"] =  filter

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

    // generate a filter for each area in the results
    var filters = [];
    for (var i in resultset["bingroups"]){
        var bingroup = resultset["bingroups"][i]

        // if applicable get a day filter for the bin group
        var dayFilter = undefined;
        if (bingroup["day"] && bingroup["day"] != ""){
            var min = bingroup["day"].split("T")[0]+"T00:00:01"
            var max = bingroup["day"].split("T")[0]+"T23:59:59"
            var dayFilter = {"range": {"post_date": {"gte":min, "lte":max } } }
        }

        for (var j in bingroup["bins"]){
            var bin = resultset["bingroups"][i]["bins"][j];
            var shapeFilter = getGeoPolygonFilter(bin.boundingPoly)
            if (dayFilter){
                filters.push( { "and" : [dayFilter,shapeFilter]} )
            }
            else filters.push(shapeFilter)
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
        var dateFilters = undefined;
        if (site["dates"] && site["dates"].length > 0){
            var dateFilters = getDateRangeFilters(site["dates"])
        }

        var points = getGeoPoints(site.lats,site.lons);
        var shapeFilter = getGeoPolygonFilter(points)
        if (dateFilters){
            filters.push( { "and" : [{"bool": {"should": dateFilters}},shapeFilter]} )
        }
        else filters.push(shapeFilter)
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


function getDateRangeFilters(dateRanges){
    var dateFilters = []
    for (var i in dateRanges){
        var min = dateRanges[i]["min"].split("T")[0]+"T00:00:01"
        var max = dateRanges[i]["max"].split("T")[0]+"T23:59:59"
        dateFilters.push({"range": {"post_date": {"gte":min, "lte":max } } } )
    }
    return dateFilters
}