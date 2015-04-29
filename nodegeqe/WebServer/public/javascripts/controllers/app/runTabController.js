/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('runTabController', function ($scope, $rootScope) {
        $scope.dataSets= ["--select--"];
        $scope.polygonFiles = ["--select--"];
        $scope.polyFile = "polyfile.json";
        $scope.polyFileSelected = function(item){
            $scope.polyFile = item;
        };

        $scope.jobs = [{"jobname":"job1", "status":"SUCCESS"},
            {"jobname":"job2", "status":"SUCCESS"},
            {"jobname":"job3", "status":"SUCCESS"},
            {"jobname":"job4", "status":"SUCCESS"},
            {"jobname":"job5", "status":"SUCCESS"},
            {"jobname":"job6", "status":"SUCCESS"},
            {"jobname":"job7", "status":"SUCCESS"},
            {"jobname":"job8", "status":"SUCCESS"},
            {"jobname":"job9", "status":"SUCCESS"},
            {"jobname":"job10", "status":"SUCCESS"},
            {"jobname":"job11", "status":"SUCCESS"},
            {"jobname":"job12", "status":"RUNNING"}];

        $scope.populatePolygonSelect = function() {
            if(!$rootScope.isAppConfigured())
                return;
            $.ajax({
                url: "app/controlBox/popScoreList",
                data : {
                    filePath: $rootScope.savePath,
                    subDir:$scope.fileSubDir
                },
                dataType: "json",
                success: function (response) {
                    $scope.$apply(function() {
                        $scope.polygonFiles = response.lFiles;
                    });
                },
                error: $rootScope.showError
            });
        };

        $scope.getJobStatus = function(){
            if(!$rootScope.isAppConfigured())
                return;
            $.ajax({
                url: "app/controlBox/jobStatus",
                dataType: "json",
                success: function (response) {
                    $scope.$apply(function(){
                        $scope.jobs= response;
                    });

                },
                error: $rootScope.showError
            });
        };

        $scope.getDataSets = function(){
            if(!$rootScope.isAppConfigured())
                return;
            $.ajax({
                url: "app/controlBox/getDataSets",
                dataType: "json",
                success: function (response) {
                    $scope.$apply(function(){
                        $scope.dataSets= response;
                    });

                },
                error: $rootScope.showError
            });
        };
        $scope.saveList = function(){

            $rootScope.$emit("getShapesText",
            {
                "scope":this,
                "callback":function(resultsText){
                    if(!$rootScope.isAppConfigured())
                        return;
                    var pName = $("#pFileName").val();
                    $.ajax({
                        url: "app/controlBox/writePoly",
                        data: {
                            filePath: $rootScope.savePath,
                            filePolygon: pName,
                            fileString: resultsText
                        },
                        dataType: "text",
                        success: function (response) {
                            $("#resultsText").text(pName + " written");
                        },
                        error: $rootScope.showError
                    });
                }
            });
        };

        $scope.applyScores = function() {
            if(!$rootScope.isAppConfigured())
                return;

            var pName = $("#pFileName").val();
            var sName = $("#sFileName").val();
            var dSet = $("#dataSetSelect").val();
            var bML  = $("#useML").is(":checked");
            var bBay = $("#useBayes").is(":checked");
            //change source based on Checkbox value
            var fThresh=$("#sTopN").val();
            var bPer = $("#bPercent").is(":checked");
            if(bPer==true){
                fThresh=$("#sTopPercent").val();
            }
            var nFeat = $("#nFeat").val();
            var sSWords = $("#cStopW").val();
            $.ajax({
                url: "app/controlBox/applyScores",
                data: {
                    filePath: $rootScope.savePath,
                    filePolygon: pName,
                    fileAppOut: sName,
                    fScoreThresh: fThresh,
                    dataSet: dSet,
                    useML: bML,
                    useBayes: bBay,
                    nFeatures: nFeat,
                    custStopWord: sSWords
                },
                dataType: "text",
                success: function (response) {
                    $("#resultsText").text("Job Launched");
                },
                error: $rootScope.showError
            });
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

        $scope.toggleAdv = function() {
            var bChecked = $("#bAdvanced").is(":checked");
            var r1 = $("#hr1");
            var r2 = $("#hr2");
            var r3 = $("#hr3");
            var r4 = $("#hr4");
            var r5 = $("#hr5");
            if( bChecked == true) {
                r1.removeClass("invis");
                r2.removeClass("invis");
                //r3.removeClass("invis");
                r4.removeClass("invis");
                r5.removeClass("invis");
            } else {
                r1.addClass("invis");
                r2.addClass("invis");
                //r3.addClass("invis");
                r4.addClass("invis");
                r5.addClass("invis");
            }
        };

        //go ahead and get the data sets from the server
        $scope.getDataSets();
        $scope.populatePolygonSelect();
    });
