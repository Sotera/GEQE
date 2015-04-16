angular.module('NodeWebBase', ['ngRoute', 'logout'])
    .constant('dataUrl', 'http://geqe.local/products')
    .constant('orderUrl', 'http://geqe.local/orders')
		.config(function ($routeProvider) {
			$routeProvider
			.otherwise({templateUrl: '/views/app/main'})
		})
		.controller('indexController', function ($scope, $http, $location, dataUrl, orderUrl) {

		});
