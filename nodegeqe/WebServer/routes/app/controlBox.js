var express = require('express');
var router = express.Router();

var netHelpers = require('../../utilExports/netHelpers');

router.get('/:vp', function (req, res) {
    var routeName = req.params.vp;
    netHelpers.performAjaxRequest('localhost', 8080, '/' + routeName, 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }

        res.status(200).send(resultObject);
    },function (error) {
            res.status(500).send(error.message);
    })
});


module.exports = router;