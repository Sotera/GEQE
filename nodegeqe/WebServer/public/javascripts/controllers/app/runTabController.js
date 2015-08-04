/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('runTabController', ['$scope','$rootScope','$http', function ($scope, $rootScope, $http) {

        $scope.jobs = [];
        $scope.dataSets= [];
        $scope.polygonFiles = [];

        $scope.dataSetSelected="";
        $scope.polyFile = "";

        $scope.polyFileSelected = function(item){
            $scope.polyFile = item.name;
        };

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

        $scope.populatePolygonSelect = function() {
            if(!$rootScope.isAppConfigured())
                return;

            $http({
                method:"GET",
                url: "app/sitelists/list/"+$rootScope.username,
                params: {}
            }).success(function (response) {
               $scope.polygonFiles = response
            }).error($rootScope.showError);
        };


        $scope.drawPolygonFile = function(){
            var modelId = $scope.getPolygonId();
            if (!modelId)  $rootScope.showErrorMessage("Polygon name invalid.",'Polygon must be saved prior to use.');
            else $rootScope.$emit("drawPolygonFile", modelId)
        };


        /**
         * Get the id for the current polyFile from the polygonList
         * Undefined if the model has not been saved
         */
        $scope.getPolygonId = function(){
            for  (var i=0; i<$scope.polygonFiles.length; i++){
                if ($scope.polygonFiles[i].name == $scope.polyFile){
                    return $scope.polygonFiles[i].id;
                }
            }
            return undefined;
        };


        /**
         * Save the site list (polygon)
         */
        $scope.saveList = function(){

            $rootScope.$emit("getShapesText",
                {
                    "scope":this,
                    "callback":function(resultsText){
                        if(!$rootScope.isAppConfigured())
                            return;
                        var pName = $scope.polyFile;
                        var siteList = JSON.parse(resultsText);
                        siteList.name = pName;
                        siteList.username = $rootScope.username;
                        var modelId = $scope.getPolygonId();
                        if (modelId) siteList.id = modelId;

                        $http({
                            method:"POST",
                            url: "app/sitelists/save",
                            params: {
                                siteList: siteList
                            }}).success(function (response) {
                                $("#resultsText").text(pName + " written");
                                $scope.populatePolygonSelect(); // refresh the polygon list to get the new id
                            }).error($rootScope.showError)
                    }
                });
        };

        $rootScope.$on('sampleShape',function(event,item){

            if(!item)
                return;
            $http({
                method: "POST",
                url: "app/posts/sitelist",
                headers: {
                    "Content-Type": "application/json"
                },
                data:{
                    "sites": [item]
                }
            }).success(function (response) {
                $rootScope.$emit("clearMarkers",['training']);
                $rootScope.$emit("drawMapMarkers",response.hits, "training");
            }).error($rootScope.showError);
        });

        $scope.getDataSets = function() {
            if (!$rootScope.isAppConfigured())
                return;

            $http({
                method: "GET",
                url: "app/datasets"
            }).success(function (response) {
                $scope.dataSets = response;
            }).error($rootScope.showError);
        };


        $scope.applyScores = function() {

            if(!$rootScope.isAppConfigured())
                return;

            // verify inputs

            if(!$scope.dataSetSelected || $scope.dataSetSelected === "--Select--") {
                $rootScope.showErrorMessage("Query Job", "Please select a data set.");
                return;
            }
            if(!$scope.polyFile || $scope.polyFile === "--Select--"){
                $rootScope.showErrorMessage("Query Job", "Please select a polygon file name.");
                return;
            }
            var siteListId = $scope.getPolygonId();
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
                return;
            // verify inputs

            if (!$scope.dataSetSelected || $scope.dataSetSelected === "--Select--") {
                $rootScope.showErrorMessage("Query Job", "Please select a data set.");
                return;
            }
            if (!$scope.polyFile || $scope.polyFile === "--Select--") {
                $rootScope.showErrorMessage("Query Job", "Please select a polygon file name.");
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



        //go ahead and get the data sets from the server
        //INIT
        var watchRemoval = $scope.$watch($rootScope.isAppConfigured ,function(newVal,oldVal) {
            if(newVal) {  // Don't do anything if Undefined.
                $scope.getDataSets();
                $scope.populatePolygonSelect();
                watchRemoval();
            }
        })
    }]);
