angular.module('NodeWebBase')
		.constant('signupUrl', '/login/signup')
		.controller('signupController', ['$scope', '$http', '$window', 'signupUrl',"ngDialog",
		function ($scope, $http, $window, signupUrl,ngDialog) {
			$scope.data = {};

			$scope.cancelSignup=function(){
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
                        console.log("Failed: " , error);

                        if(error.indexOf("password")>=0){

                        };

                        if(error.indexOf("email")>=0){

                        };

					});
			}
		}]);
