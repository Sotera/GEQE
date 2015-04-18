angular.module('logout', [])
	.factory('logout', function () {
		return {

		};
	})
	.directive('logout', function () {
		return{
			restrict: 'E',
			templateUrl: '/views/partials/logout',
			controller: function($scope){

			}
		};
	});
