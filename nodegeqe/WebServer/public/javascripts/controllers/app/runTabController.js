/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('runTabController', function ($scope, $rootScope) {
        $scope.dataSets= [];

        $scope.getDataSets = function(){
            $.ajax({
                url:  $rootScope.baseUrl + "app/controlBox/getDataSets",
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
                    var pName = $("#pFileName").val();
                    $.ajax({
                        url:  $rootScope.baseUrl + "app/controlBox/writePoly",
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
                url:  $rootScope.baseUrl + "app/controlBox/applyScores",
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
    });
