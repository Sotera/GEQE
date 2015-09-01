/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('modelTabController', ['$scope', '$rootScope', '$http', 'setSelectionMsg', function ($scope, $rootScope, $http, setSelectionMsg) {
        $scope.polygonSetSelected = null;
        $scope.dataSetSelected = null;

        setSelectionMsg.listen(function (evt, type, val) {
            if (type == "polygonSetSelected")
                $scope.polygonSetSelected = val;
            if (type == "dataSetSelected")
                $scope.dataSetSelected = val;
        });

        $scope.model = {
            sFileName: "",
            useTimeSeries: false
        };

        $scope.getScoresModel = {
                user: "",
                fileAppOut: "",
                maxOut: 50
        };

        $scope.trainingDataModel = {
            user: "",
            fileAppOut: ""
        };

        $scope.getPolygonId = function getPolygonId(){
            return ( $scope.polygonSetSelected && typeof $scope.polygonSetSelected.id!="undefined")? $scope.polygonSetSelected.id : 0;
        };

        $scope.submitModelJob = function() {

            if(!$rootScope.isAppConfigured())
                return;

            // verify inputs

            if ( !$rootScope.modelSavePath || $rootScope.modelSavePath == "") {
                $rootScope.showErrorMessage("Model Job", "Model Save Path required to be set in user settings.");
                return;
            }

            if(!$scope.dataSetSelected) {
                $rootScope.showErrorMessage("Model Job", "Please select a data set.");
                return;
            }
            if(!$scope.polygonSetSelected){
                $rootScope.showErrorMessage("Model Job", "Please select a polygon file name.");
                return;
            }

            var siteListId = $scope.getPolygonId();
            if (!siteListId){
                $rootScope.showErrorMessage("Model Job","Save your polygon file prior to running query.");
                return;
            }
            if(!$scope.model.sFileName){
                $rootScope.showErrorMessage("Model Job", "Please select modeling jobname.");
                return;
            }


            //var customStopWords = [];
            //if ($scope.run.cStopW && $scope.run.cStopW != "") customStopWords = $scope.run.cStopW.split(",");
            var jobObj = {
                'name' : $scope.model.sFileName,
                'username': $rootScope.username,
                'queryType': (!$scope.model.useTimeSeries || $scope.model.useTimeSeries == 0) ? 'location' : 'event',
                'modelSavePath': $rootScope.modelSavePath,
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


}]);

