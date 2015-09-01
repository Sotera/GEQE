angular.module('NodeWebBase')
		.config(['$routeProvider', '$compileProvider', function ($routeProvider, $compileProvider) {
			$routeProvider
			.otherwise({templateUrl: '/views/app/main'});

        //https://docs.angularjs.org/guide/production
        //Tools like Protractor and Batarang need this information to run, but you can disable
        // this in production for a significant performance boost.
        //   $compileProvider.debugInfoEnabled(false);
		}])
		.controller('indexController', function () {});
