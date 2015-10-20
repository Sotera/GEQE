angular.module('NodeWebBase')
  .constant('signupUrl', '/login/signup')
  .controller('signupController', ['$scope', '$http', '$window', '$cookies', 'signupUrl', 'ngDialog', 'authService',
    function ($scope, $http, $window, $cookies, signupUrl, ngDialog, authService) {
      $scope.data = {};

      $scope.cancelSignup = function() {
        $window.location.href = '/';
      };

      $scope.createAccount = function () {
        $http.post(signupUrl, $scope.data, {
          withCredentials: true
        })
          .success(function (res) {
            // account creation also logs the user in
            authService.setCookies(res, $scope.data);
            $window.location.href = '/';
          })
          .error(function (error) {
            $scope.authenticationError = error;
            console.log("Failed: " , error);

            if(error.indexOf("password")>=0){

            };

            if(error.indexOf("email")>=0){

            };

          });
      }
  }
  ]);
