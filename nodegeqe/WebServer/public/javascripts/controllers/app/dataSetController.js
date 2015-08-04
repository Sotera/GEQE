/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('dataSetController', ['$scope','$rootScope','$http','toggleEditMsg','setSelectionMsg', function ($scope, $rootScope, $http, toggleEditMsg,setSelectionMsg) {

        $scope.jobs = [];
        $scope.dataSets= [];
        $scope.polygonFiles = [];

        $scope.dataSetSelected=null;
        $scope.polyFile="";
        $scope.polygonSetSelected=null;
        $scope.newPolySetName = "";

        $scope.run={
                sTopN:"300",
                sFileName:"",
                bPercent:"",
                cStopW:"",
                useTimeSeries:false,
                sTopPercent:"0.0001",
                nFeat:""
            };
        $scope.editing = false;

        $scope.training={
            fileName:""
        };

        $scope.$watch("dataSetSelected", function(newval, oldval){
            if(newval && newval!=oldval)
                    setSelectionMsg.broadcast({type: 'dataSetSelected', data: newval})
        });

        $scope.$watch("polygonSetSelected", function(newval,oldval){
            if(newval && newval!=oldval)
                     setSelectionMsg.broadcast({type: 'polygonSetSelected', data: newval})
        });

        $scope.$watch("polygonSetSelected", function(newval,oldval){
            if(newval && newval!=oldval){
                $scope.drawPolygonFile();
                toggleEditMsg.broadcast(false);
            }
        });

        $scope.getPolygonSets = function(){
            $scope.populatePolygonSelect();
        };

        //TODO: Needs to be depracated and replaced with getPolygonSets
        $scope.populatePolygonSelect = function() {
            if(!$rootScope.isAppConfigured())
                return;

            $http({
                method:"GET",
                url: "app/sitelists/list/"+$rootScope.username,
                params: {}
            }).success(function (response) {
                while($scope.polygonFiles.length > response.length)
                    $scope.polygonFiles.pop();

                $.extend($scope.polygonFiles, response)
            }).error($rootScope.showError);
        };

        $scope.$watch("editing", function(newval,oldval){
            console.log("datasetcontroller editing: " , newval);

            if(newval!=oldval){
                toggleEditMsg.broadcast(newval);

                if($("#canvas-map").hasClass("mapHighlight")){
                    $scope.saveList();
                }
            }
        });

        $scope.drawPolygonFile = function(){
            var modelId = $scope.getPolygonId();
            if (!modelId)  $rootScope.showErrorMessage("Polygon name invalid.",'Polygon must be saved prior to use.');
            else $rootScope.$emit("drawPolygonFile", modelId)
        };


        /**
         * Get the id for the current polyFile from the polygonList
         * Undefined if the model has not been saved
         */
        $scope.getPolygonId = function getPolygonId(){
            return (typeof $scope.polygonSetSelected.id!="undefined")? $scope.polygonSetSelected.id : 0;
        };


        $scope.showEditingTools = function showEditingTools(){
            $scope.editing = !$scope.editing;
        };


        $scope.saveItem = function saveItem(item) {
            $rootScope.$emit("getShapesText",
                {
                    "scope":this,
                    "callback":function(resultsText){
                        if(!$rootScope.isAppConfigured())
                            return;
                        var pName = $scope.newPolySetName;
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
                            //RESET
                            $("#newPolySet").toggleClass("in").text("");
                            $("#resultsText").text(pName + " written");
                            $scope.populatePolygonSelect(); // refresh the polygon list to get the new id
                        }).error($rootScope.showError)
                    }
                });
        }

        /**
         * Save the site list (polygon)
         */
        $scope.saveList = function(){
            $rootScope.$emit("getShapesText",
                {
                    scope:this,
                    callback:function(resultsText){
                        if(!$rootScope.isAppConfigured())
                            return;

                        var pName = $scope.polyFile;
                        var siteList = JSON.parse(resultsText);
                        siteList.name = $scope.polygonSetSelected.name;
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

        //TODO: refreshAll shouldn't reset selections? Or maybe it should?
        $scope.refreshAll = function refreshAll() {
            $scope.getDataSets();
            $scope.getPolygonSets();
        };

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
