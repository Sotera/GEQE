angular.module('NodeWebBase', ['ngCookies', 'ngDialog'])
		.config(function ($locationProvider) {
			//$locationProvider.html5Mode(true);
		})
		.constant('authUrl', 'http://localhost:3000/login')
		.controller('loginController', function ($scope, $http, $window, $cookies, authUrl, ngDialog) {
			// Do the whole check cookies for last username, etc.
			$scope.data = {
				rememberMe: $cookies.rememberMe === 'true',
				username: $cookies.rememberMe === 'true' ? $cookies.lastUsername || '' : ''
			};

			$scope.message2 = 'goodbye!!!';

			$scope.authenticate = function () {
				$http.post(authUrl, $scope.data, {
					withCredentials: true
				})
						.success(function (res) {
							$cookies.userId = res.userId;
							$cookies.access_token = res.id;
							$cookies.lastUsername = $scope.data.username;
							$cookies.rememberMe = $scope.data.rememberMe;
							$window.location.href = '/';
						})
						.error(function (error) {
							$scope.authenticationError = error;
							ngDialog.openConfirm({
								template: '/views/partials/error',
								controller: ['$scope', function ($scope) {
									$scope.message1 = 'hello!!!!';
									$scope.logout = function () {
										$scope.closeThisDialog(null);
										window.location.href = '/';
									}
								}]
							});
						});
			}
		});
