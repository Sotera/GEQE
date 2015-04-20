/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('resultsTabController', function ($scope, $rootScope) {

        $scope.popScore = function() {
            $.ajax({
                url:  $rootScope.baseUrl + "app/controlBox/popScoreList",
                data : {
                    filePath: $rootScope.savePath
                },
                dataType: "json",
                success: function (response) {
                    var lFiles = response.lFiles;
                    var nFiles = response.nFiles;
                    var elmSel = document.getElementById("scoreSelect");
                    elmSel.options.length=1;

                    for(i=0; i<nFiles; i++)
                    {
                        elmSel.options[i+1] = new Option(lFiles[i], lFiles[i], false, false);
                    }
                },
                error: $rootScope.showError
            });
        };

        $scope.populatePolygonSelect = function() {
            $.ajax({
                url: $rootScope.baseUrl + "app/controlBox/popScoreList",
                data : {
                    filePath: $rootScope.savePath,
                    subDir:$scope.fileSubDir
                },
                dataType: "json",
                success: function (response) {
                    var lFiles = response.lFiles;
                    var nFiles = response.nFiles;
                    var elmSel = $("#polygonSelect").get(0);
                    elmSel.options.length=1;

                    for(i=0; i<nFiles; i++)
                    {
                        elmSel.options[i+1] = new Option(lFiles[i], lFiles[i], false, false);
                    }
                },
                error: $rootScope.showError
            });
        };

        $scope.gatherScores = function() {
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

                    //create new points
                    var nTot = response.total;
                    var markerData = [];
                    for( i=0; i<nTot; i++)
                    {
                        var capPScor = response.cap[i] + " (" + response.lUser[i] + ") (" + response.sco[i] + ")";
                        var shiftLat = parseFloat(response.lat[i])+fBin/2;
                        if(parseFloat(response.lat[i]) < 0.0)
                        {
                            shiftLat = parseFloat(response.lat[i])-fBin/2;
                        }
                        var shiftLon = parseFloat(response.lon[i])+fBin/2;
                        if(parseFloat(response.lon[i]) < 0.0)
                        {
                            shiftLon = parseFloat(response.lon[i])-fBin/2;
                        }
                        markerData.push({"lat":parseFloat(shiftLat),
                            "lon":parseFloat(shiftLon),
                            "caption": capPScor});
                    }

                    if(markerData.length > 0){
                        $rootScope.$emit("putScoreMarkers",markerData);
                    }


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
    });

