var express = require('express');
var router = express.Router();

var netHelpers = just_include('netHelpers');

router.get('/user', function (req, res) {
    netHelpers.performAjaxRequest('api.twitter.com', 8080, '/1.1/users/lookup.json', 'GET', req.query, function (resultObject) {
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