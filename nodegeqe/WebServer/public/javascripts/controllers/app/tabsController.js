angular.module('NodeWebBase')
    .controller('tabsController', function ($scope, $rootScope) {
        $scope.tabs = [{
            title: 'Results',
            url: 'one.tpl.html'
        }, {
            title: 'Run',
            url: 'two.tpl.html'
        }, {
            title: 'Training',
            url: 'three.tpl.html'
        }];

        $scope.currentTab = 'one.tpl.html';

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

    });
