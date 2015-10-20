var express = require('express');
var router = express.Router();
var netHelpers = just_include('netHelpers');

var login = function login (req, res) {
  netHelpers.performAjaxRequest('localhost', 5500, '/api/users/login', 'POST', req.body, function (result) {
    if (result.error) {
      res.status(result.error.status).send('Unauthorized');
      return;
    }
    req.session.loopbackId = result.id;
    req.session.userId = result.userId;
    res.status(200).send(result);
  });
};

router.get('/', function (req, res) {
  res.render('login', { title: 'Login'});
});

router.post('/', login);

router.post('/signup', function (req, res) {
  netHelpers.performAjaxRequest('localhost', 5500, '/api/users', 'POST', req.body, function (result) {
    if (result.error) {
      res.status(result.error.status).send(result.error.message);
      return;
    }
    // proceed with login (assume we'll have email verification later)
    login(req, res);
  })
});

router.get('/signup', function (req, res) {
  res.render('signup', { title: 'Signup'});
});

module.exports = router;
