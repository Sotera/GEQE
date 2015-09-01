var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
	if (!req.session.loopbackId) {
		res.redirect('/login');
	}else{
		res.render('index', {title: 'GEQE'});
	}
});

module.exports = router;
