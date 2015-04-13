angular.module('NodeWebBase')
    .controller('tabsController', function ($scope, $rootScope) {
        $scope.tabs = [{
            title: 'Results',
            url: 'one.tpl.html'
        }, {
            title: 'Run',
            url: 'two.tpl.html'
        }, {
            title: 'Test',
            url: 'three.tpl.html'
        }];

        $rootScope.baseUrl = "http://localhost:3000/";
        $rootScope.savePath = "/home/jlueders/src/geqe/exSrc/";
        //$scope.savePath = "/home/jgartner/findSP/";
        $scope.fileSubDir = "inputFiles/";

        $scope.currentTab = 'one.tpl.html';

        $scope.onClickTab = function (tab) {
            $scope.currentTab = tab.url;
        };

        $scope.isActiveTab = function(tabUrl) {
            return tabUrl == $scope.currentTab;
        };

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

        $scope.drawPolygonFile = function(){
            $rootScope.$emit("drawPolygonFile",$("#polygonSelect").val())
        };
    });
