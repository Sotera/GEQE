var express = require('express');
var router = express.Router();

var netHelpers = require('../../utilExports/netHelpers');

router.get('/popScoreList', function (req, res) {
    netHelpers.performAjaxRequest('localhost', 8080, '/popScoreList', 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }

        res.status(200).send(resultObject);
    })
});

router.get('/getFileContents', function (req, res) {
    netHelpers.performAjaxRequest('localhost', 8080, '/getFileContents', 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }

        res.status(200).send(resultObject);
    })
});


module.exports = router;