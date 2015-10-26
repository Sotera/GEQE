angular.module('NodeWebBase')
  .constant('authUrl', '/login')
  .constant('userUrl', 'app/users')
  .controller('loginController', ['$scope', '$http', '$window', '$cookies', '$rootScope', 'ngDialog', 'authUrl', 'authService',
    function ($scope, $http, $window, $cookies, $rootScope, ngDialog, authUrl, authService) {
      $scope.data = {
        rememberMe: $cookies.rememberMe === 'true',
        username: $cookies.rememberMe === 'true' ? $cookies.lastUsername || '' : ''
      };

      $scope.authenticate = function () {
        $http.post(authUrl, $scope.data, {
          withCredentials: true
        })
          .success(function (res) {
            authService.setCookies(res, $scope.data);
            $window.location.href = '/';
          })
          .error(function (error) {
            $scope.authenticationError = error;
            ngDialog.openConfirm({
              template: '/views/partials/error',
              controller: ['$scope', function ($scope) {
                $scope.logout = function () {
                  $scope.closeThisDialog(null);
                  $window.location.href = '/';
                }
              }]
            });
          });
      }
  }]);
