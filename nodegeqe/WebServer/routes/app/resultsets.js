var express = require('express');
var router = express.Router();

var netHelpers = just_include('netHelpers');


router.get('/:vp', function (req, res) {

    var resultsetId = req.params.vp;

    netHelpers.performAjaxRequest('localhost', 5500, '/api/resultsets/' + resultsetId, 'GET',null,function (resultObject) {
        if (resultObject.error) {
            console.error(resultObject.error);
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }
        res.status(200).send(resultObject);
    })
});



module.exports = router;