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
                error: function(jqxhr, testStatus, reason) {
                    $("#resultsText").text(reason);
                }
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
                error: function(jqxhr, testStatus, reason) {
                    $("#resultsText").text(reason);
                }
            });
        };

        $scope.gatherScores = function() {
            var sName = $("#scoreSelect").val();
            var sMaxP = $("#sMaxEntries").val();
            var bAgg = $("#aggScores").is(":checked");
            var bTim = $("#aggTime").is(":checked");
            var fBin = $("#sBinSize").val();
            $.ajax({
                url: $rootScope.baseUrl + "app/controlBox/getScores",
                data: {
                    filePath: $rootScope.savePath,
                    fileAppOut: sName,
                    maxOut: sMaxP,
                    bBinByLatLon: bAgg,
                    bBinByDate: bTim,
                    fBinSize: fBin
                },
                dataType: "json",
                success: function (response) {
                    //clean old point array, needed to removed points from map if you decrease number of entries
                    $rootScope.$emit("clearCurrentMarkers");

                    //create new points
                    var nTot = response.total;
                    for( i=0; i<nTot; i++)
                    {
                        var capPScor = response.cap[i] + "  (" + response.sco[i] + ")";
                        $rootScope.$emit("putScoreMarker",{
                                "lat":parseFloat(response.lat[i]),
                                "lon":parseFloat(response.lon[i]),
                                "caption": capPScor
                            }
                        );
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
                error: function (jqxhr, testStatus, reason) {
                    $rootScope.$emit("displayResults",reason)
                }
            });
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
    })
    .directive('dropTarget', function($rootScope){
        return{
            link:function(scope, element, attrs){

                element.bind('dragover', function(evt){
                    evt.stopPropagation();
                    evt.preventDefault();
                    evt.dropEffect = 'copy'; // Explicitly show this is a copy.
                });

                element.bind('drop', function(evt){
                    evt.stopPropagation();
                    evt.preventDefault();

                    var files = evt.dataTransfer.files;

                    $rootScope.$emit("renderKmlFile",files[0])
                });
            }
        }

    });
