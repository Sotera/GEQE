angular.module('NodeWebBase')
    .controller('tableTabsController', ['$scope','$rootScope','$http', function ($scope, $rootScope, $http) {
        $scope.tabs = [{
            title: 'Jobs',
            url: 'jobsTab'
        },
        {
            title: 'Data',
            url: 'dataTab'

        }];

        $scope.getJobStatus = function(){
            if(!$rootScope.isAppConfigured())
                return;

            $http({
                method:"GET",
                url: "app/controlBox/jobStatus"})
                .success(function (response) {
                    $scope.jobs= response;
                }).error($rootScope.showError);
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
