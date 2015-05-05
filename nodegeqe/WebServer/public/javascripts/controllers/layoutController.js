angular.module('NodeWebBase', ['ngRoute', 'logout','nbSettings','ngCookies', 'ngDialog'])
	.controller('layoutController', ['$scope','$rootScope', function ($scope,$rootScope) {
		$rootScope.themes = [
			{
				name: 'Bootstrap',
				appCss:'/stylesheets/app/geqe_base.css',
				bootstrapCss: 'javascripts/vendor/bootstrap/dist/css',
				shapeStyles:{strokeColor: 'black',strokeOpacity: 0.8,strokeWeight: 2,fillColor: 'black',fillOpacity: 0.35}
			},
			{
				name: 'Sandstone',
				appCss:'/stylesheets/app/geqe_base.css',
				bootstrapCss: 'stylesheets/themes/sandstone',
				shapeStyles:{strokeColor: '#12d400',strokeOpacity: 0.8,strokeWeight: 2,fillColor: '#12d400',fillOpacity: 0.35}
			},
			{
				name: 'Slate',
				bootstrapCss: 'stylesheets/themes/slate',
				appCss:'/stylesheets/app/geqe_slate.css',
				shapeStyles:{strokeColor: 'yellow',strokeOpacity: 0.8,strokeWeight: 2,fillColor: 'yellow',fillOpacity: 0.35},
				mapStyles: [{"stylers":[{"hue":"#ff1a00"},{"invert_lightness":true},{"saturation":-100},{"lightness":33},{"gamma":0.5}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#272b30"}]}]
			},
			{
				name: 'Darkly',
				bootstrapCss: 'stylesheets/themes/darkly',
				appCss:'/stylesheets/app/geqe_slate.css',
				shapeStyles:{strokeColor: '#00e5a6',strokeOpacity: 0.8,strokeWeight: 2,fillColor: '#00e5a6',fillOpacity: 0.35},
				mapStyles: [{"stylers":[{"hue":"#ff1a00"},{"invert_lightness":true},{"saturation":-100},{"lightness":33},{"gamma":0.5}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#272b30"}]}]
			},
			{
				name: 'Cyborg',
				appCss:'/stylesheets/app/geqe_slate.css',
				bootstrapCss: 'stylesheets/themes/cyborg',
				shapeStyles:{strokeColor: 'yellow',strokeOpacity: 0.8,strokeWeight: 2,fillColor: 'yellow',fillOpacity: 0.35},
				mapStyles: [{"stylers":[{"hue":"#ff1a00"},{"invert_lightness":true},{"saturation":-100},{"lightness":33},{"gamma":0.5}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#272b30"}]}]
			}
		];

		$rootScope.theme = $rootScope.themes[0];

		$rootScope.$on('changeTheme', function (event, themeName) {
			angular.forEach($rootScope.themes, function(theme){
				if(theme.name === themeName)
				{
					$rootScope.theme = theme;
					$rootScope.$emit('themeChanged');
				}
			});

		});
}]);
