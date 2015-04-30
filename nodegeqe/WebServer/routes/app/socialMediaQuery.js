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

var checkTwitter2 = function(req,res,username){
    var Twitter = require("twitter");

    var client = new Twitter({
        consumer_key: 'hl0yqdyod64vsZ6nGolhR4IW2',
        consumer_secret: 'Ii1DIbQWE75M2pF7Ch4oIpDS63MXzT0kgKtqOGbzVIK0LbLKUz',
        access_token_key: '3179892536-EAj5iPHmfFiaQhNxarMz82wn8z8q5hrUddGFrYl',
        access_token_secret: 'KOWtnyb5FH4ApjbySOwR8uY2QLeSUEwDuv3kBJgxLdZr6'
    });

    var params = {screen_name: username};
    client.get('users/show', params, function(error, tweets, response){
        if (!error) {
            console.log(tweets);
        }else{
            console.log(error);
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
            checkTwitter2(req,res,partialName);
            return;
        }

        res.status(200).send("");
    });
});


module.exports = router;