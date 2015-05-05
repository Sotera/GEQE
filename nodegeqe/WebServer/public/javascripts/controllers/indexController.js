angular.module('NodeWebBase')
		.config(function ($routeProvider) {
			$routeProvider
			.otherwise({templateUrl: '/views/app/main'})
		})
		.controller('indexController', function ($scope) {

		});
