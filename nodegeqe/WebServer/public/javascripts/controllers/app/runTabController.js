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
                sTopN:"",
                sFileName:"",
                bPercent:"",
                cStopW:"",
                useTimeSeries:false,
                sTopPercent:"",
                nFeat:""
            };

        $scope.training={
            fileName:""
        }

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
            var modelId = $scope.getPolygonId()
            if (!modelId)  $rootScope.showErrorMessage("Polygon name invalid.",'Polygon must be saved prior to use.');
            else $rootScope.$emit("drawPolygonFile", modelId)
        };


        /**
         * Get the id for the current polyFile from the polygonList
         * Undefined if the model has not been saved
         */
        $scope.getPolygonId = function(){
            for  (i in $scope.polygonFiles){
                if ($scope.polygonFiles[i].name == $scope.polyFile){
                    return $scope.polygonFiles[i].id;
                }
            }
            return undefined;
        }


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
                        var siteList = JSON.parse(resultsText)
                        siteList.name = pName
                        siteList.username = $rootScope.username
                        var modelId = $scope.getPolygonId();
                        if (modelId) siteList.id = modelId

                        $http({
                            method:"POST",
                            url: "app/sitelists/save",
                            params: {
                                siteList: siteList
                            }}).success(function (response) {
                                $("#resultsText").text(pName + " written");
                                $scope.populatePolygonSelect() // refresh the polygon list to get the new id
                            }).error($rootScope.showError)
                    }
                });
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
        }

        $scope.applyScores = function() {

            if(!$rootScope.isAppConfigured())
                return;
            var pName = $scope.polyFile,
                dSet = $scope.dataSetSelected,
                sName = $scope.run.sFileName,
                //change source based on Checkbox value
                fThresh=$scope.cStopW,
                bPer = $scope.run.bPercent,
                nFeat = $scope.run.nFeat,
                sSWords = $scope.cStopW;


            if(!dSet || dSet === "--select--") {
                $rootScope.showErrorMessage("Query Job", "Please select a data set.");
                return;
            }
            if(!pName || pName === "--select--"){
                $rootScope.showErrorMessage("Query Job", "Please select a polygon file name.");
                return;
            }

            if(!sName){
                $rootScope.showErrorMessage("Query Job", "Please select a score file name.");
                return;
            }

            if(bPer==true){
                fThresh=$scope.sTopPercent;
            }


            $http({
                method:"GET",
                url: "app/controlBox/applyScores",
                params: {
                    user: $rootScope.username,
                    filePolygon: pName,
                    fileAppOut: sName,
                    fScoreThresh: fThresh,
                    dataSet: dSet,
                    useTime:  $scope.useTimeSeries,
                    nFeatures: nFeat,
                    custStopWord: sSWords
                }}).success(function (response) {
                    $rootScope.$emit("refreshJobsList");
                }).error($rootScope.showError)
        }

        $scope.applyTraining = function() {
            if(!$rootScope.isAppConfigured())
                return;
            var pName = $scope.polyFile;
            var dSet = $scope.dataSetSelected;
            var tName = $scope.training.FileName;
            if(!dSet || dSet === "--select--"){
                $rootScope.showErrorMessage("Training Job", "Please select a data set.")
                return;
            }
            if(!pName || pName === "--select--"){
                $rootScope.showErrorMessage("Training Job", "Please select a polygon file name.");
                return;
            }

            if(!tName){
                $rootScope.showErrorMessage("Training Job", "Please select a training file name.");
                return;
            }

            $http({
                method:"GET",
                url: "app/controlBox/applyViewTrainingData",
                params: {
                    user: $rootScope.username,
                    filePolygon: pName,
                    fileAppOut: tName,
                    dataSet: dSet
                }}).success(function (response) {
                    $rootScope.$emit("refreshJobsList");
                }).error($rootScope.showError);
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
