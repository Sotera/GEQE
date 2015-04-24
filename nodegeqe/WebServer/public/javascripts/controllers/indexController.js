angular.module('NodeWebBase', ['ngRoute', 'logout','nbSettings'])
		.config(function ($routeProvider) {
			$routeProvider
			.otherwise({templateUrl: '/views/app/main'})
		})
		.controller('indexController', function ($scope, $http, $location) {

		});
