angular.module('logout', ['ngCookies'])
	.factory('logout', function () {
		return {

		};
	})
	.directive('logout', function () {
		return{
			restrict: 'E',
			templateUrl: '/views/partials/logout',
			controller: ['$scope',function($scope){
			}]
		};
	});
