angular.module('NodeWebBase')
    .controller('tableTabsController', ['$scope','$rootScope','$http','$timeout', function ($scope, $rootScope, $http, $timeout) {
        $scope.tabs = [{
            title: 'Jobs',
            url: 'jobsTab'
        },
        {
            title: 'Data',
            url: 'dataTab'

        }];

        $scope.masterCollection = [];
        $scope.rowCollection = [];
        $scope.displayedCollection = [];


        $scope.getJobStatus = function(){
            if(!$rootScope.isAppConfigured())
                return;

            $http({
                method:"GET",
                url: "app/jobs/get",
                params: {
                    "username": $rootScope.username
                }})
                .success(function (response) {

                    $timeout(function(){
                        if(response) {
                            $scope.masterCollection = response.slice(0);
                            $scope.rowCollection = response.slice(0);
                            $scope.displayedCollection = [].concat($scope.rowCollection);
                        }
                    });

                }).error($rootScope.showError);
        };

        $scope.rowClicked = function(row){
            if (!$rootScope.isAppConfigured())
                return;
            if(row.isSelected){
                $http({
                    method: "GET",
                    url: "app/resultsets/" + row.resultsetId
                }).success(function (response) {
                    if(!response.bingroups || response.bingroups.length == 0)
                    {
                        $rootScope.showErrorMessage("Get Scores","No Scores Returned");
                    }
                    $rootScope.$emit("loadNavData", response);
                }).error($rootScope.showError);
            }
        };

        $rootScope.$on('refreshJobsList', function(){
            $scope.getJobStatus();
        });

        $scope.currentTab = 'jobsTab';

        $scope.onClickTab = function (tab) {
            $scope.currentTab = tab.url;
        };

        $scope.isActiveTab = function(tabUrl) {
            return tabUrl == $scope.currentTab;
        };

        ///INIT
        var watchRemoval = $scope.$watch($rootScope.isAppConfigured ,function(newVal,oldVal) {
            if( newVal ){ // Don't do anything if Undefined.
                $scope.getJobStatus();
                watchRemoval();
            }
        })
    }]);
