/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('runTabController', ['$scope','$rootScope','$http','setSelectionMsg', function ($scope, $rootScope, $http,setSelectionMsg) {

        $scope.jobs = [];
        $scope.polygonSetSelected = [];
        $scope.dataSetSelected=[];

        $scope.run={
                sTopN:"300",
                sFileName:"",
                bPercent:"",
                cStopW:"",
                useTimeSeries:false,
                sTopPercent:"0.0001",
                nFeat:""
            };

        $scope.training={
            fileName:""
        };

        setSelectionMsg.listen(function(evt,vals){
            if(vals.type="polygonSetSelected")
                $scope.polygonSetSelected=vals.data;
            if(vals.type="dataSetSelected")
                $scope.dataSetSelected=vals.data;
            console.log(vals);
        });


          $scope.applyScores = function() {

            if(!$rootScope.isAppConfigured())
                return;

            // verify inputs

            if(!$scope.dataSetSelected || $scope.dataSetSelected.name === "--Select--") {
                $rootScope.showErrorMessage("Query Job", "Please select a data set.");
                return;
            }
            if(!$scope.polygonSetSelected || $scope.polygonSetSelected.name === "--Select--"){
                $rootScope.showErrorMessage("Query Job", "Please select a polygon file name.");
                return;
            }
            var siteListId = $scope.polygonSetSelected.id;
            if (!siteListId){
                $rootScope.showErrorMessage("Query Job","Save your polygon file prior to running query.");
                return;
            }
            if(!$scope.run.sFileName){
                $rootScope.showErrorMessage("Query Job", "Please select query jobname.");
                return;
            }


            var customStopWords = [];
            if ($scope.run.cStopW && $scope.run.cStopW != "") customStopWords = $scope.run.cStopW.split(",");
            var jobObj = {
                'name' : $scope.run.sFileName,
                'username': $rootScope.username,
                'queryType': (!$scope.run.useTimeSeries || $scope.run.useTimeSeries == 0) ? 'location' : 'event',
                'limit': ($scope.run.bPercent) ? $scope.run.sTopPercent : $scope.run.sTopN,
                'customStopWords': customStopWords,
                'siteListId':  siteListId,
                'datasetId' :$scope.dataSetSelected.name
            };

            $http({
                    method:"POST",
                    url: "app/jobs",
                    params: jobObj
                }).success(function (response) {
                    $rootScope.$emit("refreshJobsList");
                }).error($rootScope.showError)
        };


        $scope.applyTraining = function() {
            if (!$rootScope.isAppConfigured())
                return;            // verify inputs

            if (!$scope.dataSetSelected || $scope.dataSetSelected.name === "--Select--") {
                $rootScope.showErrorMessage("Query Job", "Please select a data set.");
                return;
            }
            if (!$scope.polygonSetSelected || $scope.polygonSetSelected.name === "--Select--") {
                $rootScope.showErrorMessage("Query Job", "Please select a polygon set.");
                return;
            }
            var siteListId = $scope.getPolygonId();
            if (!siteListId) {
                $rootScope.showErrorMessage("Query Job", "Save your polygon file prior to running query.");
                return;
            }
            if (!$scope.training.FileName) {
                $rootScope.showErrorMessage("Query Job", "Please select query jobname.");
                return;
            }
            var jobObj = {
                'name': $scope.training.FileName,
                'username': $rootScope.username,
                'queryType': 'training-data',
                'siteListId': siteListId,
                'datasetId': $scope.dataSetSelected.name
            };

            $http({
                method: "POST",
                url: "app/jobs",
                params: jobObj
            }).success(function (response) {
                $rootScope.$emit("refreshJobsList");
            }).error($rootScope.showError)

        };


        $scope.modReturn = function() {
            var bChecked = $("#bPercent").is(":checked");
            var f1 = $("#rankReturnInput");
            var f2 = $("#percentReturnInput");
            if(bChecked == true){
                f1.addClass("invis");
                f2.removeClass("invis");
            } else {
                f1.removeClass("invis");
                f2.addClass("invis");
            }
        };
    }]);
