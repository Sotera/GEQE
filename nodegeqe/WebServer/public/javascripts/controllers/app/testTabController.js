/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('testTabController', function ($scope, $rootScope) {

        $scope.launchTest = function(){

            var pPath = $rootScope.savePath;
            var pName = $("#pFileName").val();
            var tName = $("#tFileName").val();
            var dSet = $("#dataSetSelect").val();
            $.ajax({
                url: "app/controlBox/launchTest",
                data: {
                    filePath: pPath,
                    filePolygon: pName,
                    fileTestOut: tName,
                    dataSet: dSet
                },
                dataType: "text",
                success: function (response) {
                    $("#resultsText").text("Test Launched");
                },
                error: $rootScope.showError
            });
        };

        $scope.gatherTest = function() {
            var tName = $("#tFileName").val();
            $.ajax({
                url: "app/controlBox/getTest",
                data: {
                    filePath: $rootScope.savePath,
                    fileTestOut: tName
                },
                dataType: "json",
                success: function (response) {
                    $("#inMean").val(response.m);
                    $("#inVar").val(response.v);
                    lRes = response.lPas;
                    lNZ = response.lNZ;
                    var strRet = '';
                    for( i=1; i<=lRes.length; i++)
                    {
                        if(lRes[i-1]!="-1")
                        {
                            strRet = strRet + i + " has " + lRes[i-1] + "% passing a 3 sigma threshold ( from " + lNZ[i-1] + ").<br>";
                        } else {
                            strRet = strRet + i + " has no non-zero scored tweets in region.<br>";
                        }
                    }
                    $("#resultsText").html(strRet);
                },
                error: $rootScope.showError
            });
        }

    });
