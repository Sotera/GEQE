var express = require('express');
var router = express.Router();

var netHelpers = require('netHelpers');

var makeServiceCall = function(req,res,routeName, serviceHostName, servicePort){

    netHelpers.performAjaxRequest(serviceHostName, servicePort, '/' + routeName, 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            if(!resultObject.error.message){
                console.log(resultObject.traceback);
                res.status(500).send(":" + resultObject.error);
                return;
            }
            res.status(500).send(resultObject.error.message);
            console.log(resultObject.traceback);
            return;
        }

        res.status(200).send(resultObject);

    },function (error) {
        if(!error.message) {
            console.log(error);
            res.status(500).send(error);
            return;
        }
        console.log(error.message);
        res.status(500).send(error.message);
    })
};

router.get('/:vp', function (req, res) {
    var routeName = req.params.vp;
    var settingsUrl = "/api/users/" + req.session.userId ;
    var settingsData =  {
                                access_token: req.session.loopbackId
                        };

    netHelpers.performAjaxRequest("localhost", 5500, settingsUrl, 'GET', settingsData, function (resultObject) {
        if (resultObject.error) {
            if(!resultObject.error.message){
                console.log(resultObject.traceback);
                res.status(500).send(":" + resultObject.error);
                return;
            }
            res.status(500).send(resultObject.error.message);
            console.log(resultObject.traceback);
            return;
        }

        makeServiceCall(req,res,routeName,resultObject.serviceHostName,resultObject.servicePort);

    },function (error) {
        if(!error.message) {
            console.log(error);
            res.status(500).send(error);
            return;
        }
        console.log(error.message);
        res.status(500).send(error.message);
    })


});




module.exports = router;