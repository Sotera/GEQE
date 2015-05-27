/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('runTabController', function ($scope, $rootScope,$http) {

        $scope.jobs = [];
        $scope.dataSets= [];
        $scope.polygonFiles = [];

        $scope.dataSetSelected="";
        $scope.polyFile = "";

        $scope.polyFileSelected = function(item){
            $scope.polyFile = item;
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

        //http://jimhoskins.com/2012/12/17/angularjs-and-apply.html
        // No need to call $scope.$apply -> $http does it automatically
        $scope.populatePolygonSelect = function() {
            if(!$rootScope.isAppConfigured())
                return;

            $http({
                method:"GET",
                url: "app/controlBox/populate/polygons",
                params : {
                    user: $rootScope.username
                }}).success(function (response) {
                        $scope.polygonFiles = response.lFiles;
                }).error($rootScope.showError);
        };

        $scope.drawPolygonFile = function(){
            $rootScope.$emit("drawPolygonFile", $scope.polyFile)
        };

        $scope.saveList = function(){

            $rootScope.$emit("getShapesText",
                {
                    "scope":this,
                    "callback":function(resultsText){
                        if(!$rootScope.isAppConfigured())
                            return;
                        var pName = $scope.polyFile;

                        $http({
                            method:"GET",
                            url: "app/controlBox/writePoly",
                            params: {
                                user: $rootScope.username,
                                filePolygon: pName,
                                fileString: resultsText
                            }}).success(function (response) {
                                $("#resultsText").text(pName + " written");
                            }).error($rootScope.showError)
                    }
                });
        };

        $scope.getDataSets = function() {
            if (!$rootScope.isAppConfigured())
                return;

            $http({
                method: "GET",
                url: "app/controlBox/populate/datasets"
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
            $scope.getDataSets();
            $scope.populatePolygonSelect();
            watchRemoval();
        })
    });
