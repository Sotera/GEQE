var express = require('express');
var router = express.Router();

var netHelpers = require('netHelpers');

router.get('/', function (req, res) {
	req.session.loopbackId = '';
	res.redirect('/');
});

module.exports = router;
