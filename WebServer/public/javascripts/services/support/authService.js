angular.module('NodeWebBase')
  .service('authService', ['$cookies', function ($cookies) {
    this.setCookies = function (res, data) {
      $cookies.userId = res.userId;
      $cookies.access_token = res.id;
      $cookies.lastUsername = data.username;
      $cookies.rememberMe = data.rememberMe;
    };
  }]);
