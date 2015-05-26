/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('runTabController', function ($scope, $rootScope,$http) {

        $scope.jobs = [];
        $scope.dataSets= [];
        $scope.dataSetSelected="";

        $scope.polygonFiles = [];
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
                sTopPercent:""
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
                data : {
                    user: $rootScope.username
                }}).success(function (response) {
                        $scope.polygonFiles = response.lFiles;
                }).error($rootScope.showError);

            //$.ajax({
            //    url: "app/controlBox/populate/polygons",
            //    data : {
            //        user: $rootScope.username
            //    },
            //    dataType: "json",
            //    success: function (response) {
            //        $scope.$apply(function() {
            //            $scope.polygonFiles = response.lFiles;
            //        });
            //    },
            //    error: $rootScope.showError
            //});
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
                            data: {
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
            })
                .success(function (response) {
                    $scope.dataSets = response;
                })
                .error($rootScope.showError);

            //    $.ajax({
            //        url: "app/controlBox/populate/datasets",
            //        dataType: "json",
            //        success: function (response) {
            //            $scope.$apply(function(){
            //                $scope.dataSets= response;
            //            });
            //
            //        },
            //        error: $rootScope.showError
            //    });
            //    $http({method:"GET", url:"app/controlBox/getDataSets"}).success(function (response) {
            //            $scope.dataSets= response;
            //        }).error($rootScope.showError);
            //};
        }
        $scope.applyScores = function() {

            if(!$rootScope.isAppConfigured())
                return;


            var pName = $scope.polyFile;
            var dSet = $scope.dataSetSelected;
            var sName = $scope.run.sFileName;

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


            //change source based on Checkbox value
            var fThresh=$scope.cStopW;
            var bPer = $scope.run.bPercent;

            if(bPer==true){
                fThresh=$scope.sTopPercent;
            }

            var nFeat = $scope.run.nFeat;
            var sSWords = $scope.cStopW;

            $http({
                method:"GET",
                url: "app/controlBox/applyScores",
                data: {
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
                data: {
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
        $scope.getDataSets();
        $scope.populatePolygonSelect();
    });
