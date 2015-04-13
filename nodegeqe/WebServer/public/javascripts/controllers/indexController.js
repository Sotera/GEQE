angular.module('NodeWebBase', ['ngRoute', 'logout'])
		.constant('dataUrl', 'http://localhost:3000/products')
		.constant('orderUrl', 'http://localhost:3000/orders')
		.config(function ($routeProvider) {
			$routeProvider
			.otherwise({templateUrl: '/views/app/main'})
		})
		.controller('indexController', function ($scope, $http, $location, dataUrl, orderUrl) {

		});
