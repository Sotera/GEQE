angular.module('NodeWebBase')
    .controller('jobsTabsController', ['$scope','$rootScope','$http', function ($scope, $rootScope, $http) {
        $scope.tabs = [{
            title: 'Run',
            url: 'one.tpl.html'

        }, {
            title: 'Results',
            url: 'two.tpl.html'
        }];

        $scope.currentTab = 'two.tpl.html';

        $scope.onClickTab = function (tab) {
            $scope.currentTab = tab.url;
        };

        $scope.isActiveTab = function(tabUrl) {
            return tabUrl == $scope.currentTab;
        };

        $scope.clearMarkers = function(){
            $rootScope.$emit("clearMarkers",['training','score']);
        };

        $scope.clearShapes = function(){
            $rootScope.$emit("clearCurrentShapes");
        };

        $scope.clearResults = function(){
            $rootScope.$emit("clearResults");
        };

        $scope.clearAll = function(){
            $rootScope.$emit("clearAll");
            $scope.clearResults();
        };

 }]);
