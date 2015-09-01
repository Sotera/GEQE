var express = require('express');
var router = express.Router();

var netHelpers = just_include('netHelpers');

router.get('/list/:vp', function (req, res) {
    var username = req.params.vp
    var query = {"filter[where][username]": username}

    netHelpers.performAjaxRequest('localhost', 5500, '/api/geqeModels', 'GET',query,function (resultObject) {
        if (resultObject.error) {
            console.error(resultObject.error)
            res.status(resultObject.error.status).send(resultObject.error.message);
            return;
        }
        res.status(200).send(resultObject);
    })
});




module.exports = router;