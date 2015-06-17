angular.module('logout', ['ngCookies'])
	.factory('logout', function () {
		return {

		};
	})
	.directive('logout', ['$rootScope', 'setFullNameMsg' ,function ($rootScope,setFullNameMsg) {
		return{
			restrict: 'E',
			templateUrl: '/views/partials/logout',
			controller: ['$scope',function($scope){
				setFullNameMsg.listen( function(){
						$scope.fullname = $rootScope.fullname;
				});
			}]
		};
	}]);
