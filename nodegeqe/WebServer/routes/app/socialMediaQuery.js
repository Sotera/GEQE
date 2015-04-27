var express = require('express');
var router = express.Router();

var checkTwitter = function(req,res,username){

    var partialName = req.params.vp;

    var twitterRequest = require("request");

    twitterRequest({
        uri: "https://twitter.com/" + username
    }, function(error, response, body) {
        if(response.statusCode == 404)
        {
            res.status(200).send("");
            return;
        }
        if(response.statusCode == 200)
        {
            res.status(200).send("https://twitter.com" + '/' + partialName);
            return;
        }

        res.status(200).send("");
    });

};

router.get('/:vp', function (req, res) {
    var partialName = req.params.vp;
    var socialRequest = require("request");

    socialRequest({
        uri: "https://instagram.com/" + partialName
    }, function(error, response, body) {
        if(response.statusCode == 200)
        {
            res.status(200).send("https://instagram.com" + '/' + partialName);
            return;
        }

        if(response.statusCode == 404)
        {
            checkTwitter(req,res,partialName);
            return;
        }

        res.status(200).send("");
    });
});


module.exports = router;