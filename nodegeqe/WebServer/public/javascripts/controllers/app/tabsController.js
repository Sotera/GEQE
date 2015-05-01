angular.module('NodeWebBase')
    .controller('tabsController', function ($scope, $rootScope) {
        $scope.tabs = [{
            title: 'Run',
            url: 'one.tpl.html'
        }, {
            title: 'Results',
            url: 'two.tpl.html'
        }];



        $scope.getJobStatus = function(){
            if(!$rootScope.isAppConfigured())
                return;
            $.ajax({
                url: "app/controlBox/jobStatus",
                dataType: "json",
                success: function (response) {
                    $scope.$apply(function(){
                        $scope.jobs= response;
                    });

                },
                error: $rootScope.showError
            });
        };

        $rootScope.$on('refreshJobsList', function(){
            $scope.getJobStatus();
        });

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
