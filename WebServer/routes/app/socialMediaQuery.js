var express = require('express');
var router = express.Router();
var config = require("../../config.json")

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

var getTwitterUserData = function(req,res,username){
    if (!config.twitter) return;

    var Twitter = require("twitter");

    var client = new Twitter({
        consumer_key: config.twitter.consumer_key,
        consumer_secret: config.twitter.consumer_secret,
        access_token_key: config.twitter.access_token_key,
        access_token_secret: config.twitter.access_token_secret
    });

    var params = {screen_name: username};
    client.get('users/show', params, function(error, data, response){
        if (!error) {
            res.status(200).send(data);
            return;
        }
        res.status(404).send(error);
    });
};


router.get('/:vp', function (req, res) {
    var partialName = req.params.vp;
    switch(req.query.socialMediaType){
        case("twitter"):
            getTwitterUserData(req,res,partialName);
    }
});


module.exports = router;
