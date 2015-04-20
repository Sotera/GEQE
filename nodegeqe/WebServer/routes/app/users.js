var express = require('express');
var router = express.Router();

var netHelpers = require('../../utilExports/netHelpers');

router.get('/:vp', function (req, res) {
    netHelpers.performAjaxRequest('0.0.0.0', 5500, '/api/users' + req.url, 'GET', null,function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }
        res.status(200).send(resultObject);
    })
});

router.post('/:vp', function (req, res) {
    netHelpers.performAjaxRequest('0.0.0.0', 5500, '/api/users' + req.url, 'PUT', req.body,function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }
        res.status(200).send("OK");
    })
});

module.exports = router;