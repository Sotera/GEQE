/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('resultsTabController', function ($scope, $rootScope) {
        $scope.scoreFiles = ["--select--"];
        $scope.polygonFiles = ["--select--"];
        $scope.popScore = function() {
            if(!$rootScope.isAppConfigured())
                return;

            $.ajax({
                url:  $rootScope.baseUrl + "app/controlBox/popScoreList",
                data : {
                    filePath: $rootScope.savePath
                },
                dataType: "json",
                success: function (response) {
                    $scope.$apply(function(){
                        $scope.scoreFiles = response.lFiles;
                    });

                },
                error: $rootScope.showError
            });
        };

        $scope.populatePolygonSelect = function() {
            if(!$rootScope.isAppConfigured())
                return;
            $.ajax({
                url: $rootScope.baseUrl + "app/controlBox/popScoreList",
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

        $scope.gatherScores = function() {
            if(!$rootScope.isAppConfigured())
                return;
            var sName = $("#scoreSelect").val();
            var sMaxP = $("#sMaxEntries").val();
            var bAgg = $("#aggScores").is(":checked");
            var bTim = $("#aggTime").is(":checked");
            var fBin = $("#sBinSize").val();
            var bCUU = $("#uniqueUser").is(":checked");
            $.ajax({
                url: $rootScope.baseUrl + "app/controlBox/getScores",
                data: {
                    filePath: $rootScope.savePath,
                    fileAppOut: sName,
                    maxOut: sMaxP,
                    bBinByLatLon: bAgg,
                    bBinByDate: bTim,
                    fBinSize: fBin,
                    bCountUniqueUser: bCUU
                },
                dataType: "json",
                success: function (response) {
                    //clean old point array, needed to removed points from map if you decrease number of entries
                    $rootScope.$emit("clearCurrentMarkers");
                    $rootScope.$emit("setTermDictionary", response.dic);
                    $rootScope.$emit("putScoreMarkers",response.sco, fBin);

                    //write dictionary to results box
                    var strRet = '';
                    if( typeof(response.dic)=="string")
                    {
                        strRet = response.dic;
                    } else {
                        if( response.dic[0][2] != undefined)
                        {
                            strRet = '<table class=table table-striped"><tr><th>Term</th><th>Score</th><th>In Count</th><th>Out Count</th></tr>';
                            for( i=0; i<response.dic.length; i++)
                            {
                                strRet = strRet + '<tr><td>' + response.dic[i][0] + '</td><td>' + response.dic[i][3] + '</td><td>' + response.dic[i][1] + '</td><td>' + response.dic[i][2] + '</td></tr>';
                            }
                        } else {
                            strRet = '<table class="table table-condensed"><tr><th>Term</th><th>Rank</th></tr>';
                            for( i=0; i<response.dic.length; i++)
                            {
                                strRet = strRet + '<tr><td>' + response.dic[i][0] + '</td><td>' + response.dic[i][1] + '</td></tr>';
                            }
                        }
                        strRet = strRet + "</table>";
                    }
                    $rootScope.$emit("displayResults",strRet)
                },
                error: $rootScope.showError
            });
        };

        $scope.clearMarkers = function(){
            $rootScope.$emit("clearCurrentMarkers");
        };

        $scope.clearShapes = function(){
            $rootScope.$emit("clearCurrentShapes");
        };

        $scope.clearResults = function(){
            $rootScope.$emit("displayResults","")
        };

        $scope.clearAll = function(){
            $rootScope.$emit("clearAll");
            $scope.clearResults();
        };

        $scope.drawPolygonFile = function(){
            $rootScope.$emit("drawPolygonFile",$("#polygonSelect").val())
        };

        $scope.onDropZoneClicked = function(event){
            var fileSelector = $('<input type="file" />');

            fileSelector.change(function(evt){
                $rootScope.$emit("renderKmlFile",evt.target.files[0]);
            });
            fileSelector.click();
        };

        ///INIT
        $scope.popScore();
        $scope.populatePolygonSelect();
    });

