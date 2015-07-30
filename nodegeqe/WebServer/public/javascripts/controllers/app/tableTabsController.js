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
        $scope.polling = {}; // Keep it here so we can kill manually!

        $scope.isSelectedRowDeletable = function(){
          if(!$scope.selectedRow || $scope.selectedRow.status === "RUNNING")
            return false;
          return true;
        };

        $scope.getJobStatus = function(){
            console.log("getJobStatus");
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
                        $scope.selectedRow = null;
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

            $scope.selectedRow = null;

        };

        $rootScope.$on('refreshJobsList', function(){
            $scope.getJobStatus();
        });

        /* Wrapper around ANY Function FCE with a timeout, initialized in the watchRemoval at the bottom  */
        $scope.poll = function poll(fce, repeat, frequency, numOfTimes){
                var times = numOfTimes || -1;
                var fce_name = fce.name || "anon";
                if("undefined" == typeof $scope.polling[fce_name]) $scope.polling[fce_name]={};

                if(times > 0 && --times == 0){ repeat=false } // We just want to repeat until we get to 0 otherwise we repeat forever!
                //console.log(times,fce_name, repeat, $scope.polling);

                $scope.polling[fce_name].kill = $timeout(function(){
                    fce();
                    if(!repeat) {
                        $timeout.cancel($scope.polling[fce_name].kill);
                        return false;
                    }else{
                        $scope.poll(fce,repeat, frequency, times);
                        return true;
                    }
                }, frequency)
        }

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
                $scope.poll($scope.getJobStatus,true, 5000);
            }
        })
    }]);
