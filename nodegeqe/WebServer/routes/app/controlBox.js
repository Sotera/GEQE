var express = require('express');
var router = express.Router();

var netHelpers = require('../../utilExports/netHelpers');

router.get('/:vp', function (req, res) {
    var routeName = req.params.vp;
    netHelpers.performAjaxRequest('localhost', 8080, '/' + routeName, 'GET', req.query, function (resultObject) {
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
});


module.exports = router;