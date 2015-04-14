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

router.get('/getScores', function (req, res) {
    netHelpers.performAjaxRequest('localhost', 8080, '/getScores', 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }

        res.status(200).send(resultObject);
    })
});

router.get('/writePoly', function (req, res) {
    netHelpers.performAjaxRequest('localhost', 8080, '/writePoly', 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }

        res.status(200).send(resultObject);
    })
});

router.get('/applyScores', function (req, res) {
    netHelpers.performAjaxRequest('localhost', 8080, '/applyScores', 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }

        res.status(200).send(resultObject);
    })
});

router.get('/launchTest', function (req, res) {
    netHelpers.performAjaxRequest('localhost', 8080, '/launchTest', 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }

        res.status(200).send(resultObject);
    })
});

router.get('/getTest', function (req, res) {
    netHelpers.performAjaxRequest('localhost', 8080, '/getTest', 'GET', req.query, function (resultObject) {
        if (resultObject.error) {
            res.status(500).send(resultObject.error);
            return;
        }

        res.status(200).send(resultObject);
    })
});

module.exports = router;