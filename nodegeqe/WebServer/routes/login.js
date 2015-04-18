var express = require('express');
var router = express.Router();

var netHelpers = require('../utilExports/netHelpers');

router.get('/', function (req, res) {
	res.render('login', { title: 'Login'});
});

router.post('/', function (req, res) {
	netHelpers.performAjaxRequest('localhost', 5500, '/api/users/login', 'POST', req.body, function (resultObject) {
		if (resultObject.error) {
			res.status(resultObject.error.status).send('Unauthorized');
			return;
		}
		req.session.loopbackId = resultObject.id;
		res.status(200).send(resultObject);
	});
});

router.post('/signup', function (req, res) {
	netHelpers.performAjaxRequest('localhost', 5500, '/api/users', 'POST', req.body, function (resultObject) {
		if (resultObject.error) {
			res.status(resultObject.error.status).send(resultObject.error.message);
			return;
		}
		res.status(200).send('Success!');
	})
});

router.get('/signup', function (req, res) {
	res.render('signup', { title: 'Signup'});
});

module.exports = router;
