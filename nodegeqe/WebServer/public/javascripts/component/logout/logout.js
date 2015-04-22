angular.module('logout', ['ngCookies'])
	.factory('logout', function () {
		return {

		};
	})
	.directive('logout', function ($rootScope) {
		return{
			restrict: 'E',
			templateUrl: '/views/partials/logout',
			controller: ['$scope',function($scope){
				$rootScope.$on('setfullname', function(){
						$scope.fullname = $rootScope.fullname;
				});
			}]
		};
	});
