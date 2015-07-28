angular.module('NodeWebBase')
    .controller('tableTabsController', ['$scope','$rootScope','$http','$timeout','$cookies', function ($scope, $rootScope, $http, $timeout, $cookies) {
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
        $scope.selectedRow = null;

        $scope.isSelectedRowDeletable = function(){
          return !(!$scope.selectedRow || $scope.selectedRow.status === "RUNNING" ||
          $scope.selectedRow.username != $cookies.lastUsername);
        };

        $scope.getJobStatus = function(){
            if(!$rootScope.isAppConfigured())
                return;

            $http({
                method:"GET",
                url: "app/jobs/",
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

        $scope.viewJobData = function(){
            if (!$rootScope.isAppConfigured())
                return;

            if($scope.selectedRow && $scope.selectedRow.isSelected){
                $http({
                    method: "GET",
                    url: "app/resultsets/" + $scope.selectedRow.resultsetId
                }).success(function (response) {
                    if(!response.bingroups || response.bingroups.length == 0)
                    {
                        $rootScope.showErrorMessage("Get Scores","No Scores Returned");
                    }
                    $rootScope.$emit("loadNavData", response);
                }).error($rootScope.showError);
            }
        };

        $scope.deleteJob = function(){
            if (!$rootScope.isAppConfigured())
                return;

            if($scope.selectedRow && $scope.selectedRow.isSelected){
                $http({
                    method: "DELETE",
                    url: "app/jobs/" + $scope.selectedRow.id
                }).success(function (response) {
                    $scope.getJobStatus();
                }).error($rootScope.showError);
            }
        };

        $scope.rowClicked = function(row){
            if (!$rootScope.isAppConfigured())
                return;
            if(row.isSelected) {
                $scope.selectedRow = row;
                return;
            }

            $scope.selectRow = null;

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
