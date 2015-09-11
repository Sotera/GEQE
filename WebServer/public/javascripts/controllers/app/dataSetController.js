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
            if(newval!=oldval)
                    setSelectionMsg.broadcast('dataSetSelected', newval)
        });

        $scope.$watch("polygonSetSelected", function(newval,oldval){
            if(newval!=oldval) {
                setSelectionMsg.broadcast('polygonSetSelected',newval);
                if(newval) {
                    $scope.drawPolygonFile();
                }
                $scope.editing=false;
                    //toggleEditMsg.broadcast(false);
            }
        });

        $scope.getPolygonSets = function(){
            $scope.populatePolygonSelect();
        };

        //TODO: Needs to be deprecated and replaced with getPolygonSets
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
            if(newval!=oldval){
                if($("#map-canvas").hasClass("mapHighlight")){
                    $scope.updateItem();
                }
                toggleEditMsg.broadcast(newval);
            }
        });

        $scope.removePolySet= function removePolySet(){
            if(confirm("Remove the polygon set?")){
                console.log("removePolySet " , $scope.polygonSetSelected);
                $http.delete("app/sitelists/delete/"+$scope.polygonSetSelected.id).success(function (response) {
                    $scope.populatePolygonSelect(); // refresh the polygon list to get the new id
                }).error($rootScope.showError);
            }
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
        $scope.getPolygonId = function getPolygonId(){
            return ( $scope.polygonSetSelected && typeof $scope.polygonSetSelected.id!="undefined")? $scope.polygonSetSelected.id : 0;
        };


        $scope.showEditingTools = function showEditingTools(){
            $scope.editing = !$scope.editing;
        };


        $scope.updateItem = function updateItem(item) {
            $rootScope.$emit("getShapesText",
                {
                    "scope":this,
                    "callback":function(resultsText){
                        if(!$rootScope.isAppConfigured())
                            return;
                        var pName = $scope.polygonSetSelected.name;
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
                    console.log("Saved");
                        }).error($rootScope.showError)
                    }
                });
        };
        $scope.saveNewItem = function saveNewItem(item) {
                var pName = $scope.newPolySetName;
                if(!$rootScope.isAppConfigured() || !pName)
                    return;

                var siteList = {};
                    siteList.name = pName;
                    siteList.username = $rootScope.username;

                $http({
                    method:"POST",
                    url: "app/sitelists/save",
                    params: {
                        siteList: siteList
                    }}).success(function (response) {
                    //RESET
                    $("#newPolySet").toggleClass("in");
                    $("#newPolySetInput").val("");
                    $("#resultsText").text(pName + " written");
                    $scope.polygonFiles.push({id:response.id, name:response.name});
                    $scope.polygonSetSelected= $scope.polygonFiles[$scope.polygonFiles.length-1];
                    $scope.showEditingTools();
                }).error($rootScope.showError)
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
                            $("#newPolySet").toggleClass("in");
                            $("#newPolySetInput").val("");
                            $("#resultsText").text(pName + " written");
                            $scope.populatePolygonSelect(); // refresh the polygon list to get the new id
                        }).error($rootScope.showError)
                    }
                });
        };

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
                $rootScope.$emit("drawShapes",response,'dataset');
            }).error($rootScope.showError);
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
