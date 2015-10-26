angular.module('NodeWebBase')
  .constant('authUrl', '/login')
  .controller('loginController', ['$scope', '$http', '$window', '$cookies', 'ngDialog', 'authUrl', 'authService',
    function ($scope, $http, $window, $cookies, ngDialog, authUrl, authService) {
      $scope.data = {
        rememberMe: $cookies.rememberMe === 'true',
        username: $cookies.rememberMe === 'true' ? $cookies.lastUsername || '' : ''
      };

      $scope.authenticationError = false;

      $scope.authenticate = function () {
        $http.post(authUrl, $scope.data, {
          withCredentials: true
        })
          .success(function (res) {
            $scope.authenticationError = false;
            authService.setCookies(res, $scope.data);
            $window.location.href = '/';
          })
          .error(function (error) {
            $scope.authenticationError = true;
          });
      }
  }]);
