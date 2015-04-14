angular.module('NodeWebBase')
    .controller('tabsController', function ($scope, $rootScope) {
        $scope.tabs = [{
            title: 'Results',
            url: 'one.tpl.html'
        }, {
            title: 'Run',
            url: 'two.tpl.html'
        }, {
            title: 'Test',
            url: 'three.tpl.html'
        }];

        $rootScope.baseUrl = "http://localhost:3000/";
        $rootScope.savePath = "/home/jlueders/src/geqe/exSrc/";
        //$scope.savePath = "/home/jgartner/findSP/";
        $rootScope.fileSubDir = "inputFiles/";

        $scope.currentTab = 'one.tpl.html';

        $scope.onClickTab = function (tab) {
            $scope.currentTab = tab.url;
        };

        $scope.isActiveTab = function(tabUrl) {
            return tabUrl == $scope.currentTab;
        };


    });
