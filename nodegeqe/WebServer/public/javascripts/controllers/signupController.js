angular.module('NodeWebBase', [])
    .constant('signupUrl', 'http://geqe.local/login/signup')
		.config(function($locationProvider){
			//$locationProvider.html5Mode(true);
		})
		.controller('signupController', function ($scope, $http, $window, signupUrl) {
			$scope.data = {};
			$scope.createAccount = function () {
				$http.post(signupUrl, $scope.data, {
					withCredentials: true
				})
						.success(function (res) {
							$window.location.href = '/';
						})
						.error(function (error) {
							$scope.authenticationError = error;
						});
			}
		});
