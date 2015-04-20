angular.module('NodeWebBase', ['ngRoute'])
		.constant('signupUrl', 'http://localhost:3000/login/signup')
		.config(function($locationProvider){
			//$locationProvider.html5Mode(true);
		})
		.controller('signupController', function ($scope, $http, $window, signupUrl) {
			$scope.data = {};

			$scope.cancelSignup=function(){
				$scope.closeThisDialog(null);
				window.location.href = '/';
			};

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
