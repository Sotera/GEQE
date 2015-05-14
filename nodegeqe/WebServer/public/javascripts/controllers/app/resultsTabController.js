/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('resultsTabController', function ($scope, $rootScope) {
        $scope.scoreFiles = ["--select--"];
        $scope.polygonFiles = ["--select--"];
        $scope.trainingFiles = ["--select--"];


        $scope.popScore = function() {
            if(!$rootScope.isAppConfigured())
                return;

            $.ajax({
                url: "app/controlBox/popScoreList",
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

        $scope.getScoresModel = {
            filePath: "",
            fileAppOut: "",
            maxOut: -1,
            drawMode:"cluster",
            bBinByDate: false,
            fBinSize:.005
        };
        $scope.getScores = function() {
            if(!$rootScope.isAppConfigured())
                return;
            $scope.getScoresModel.filePath = $rootScope.savePath;
            var drawMarkers = $("#drawMarkers").is(":checked");

            $.ajax({
                url: "app/controlBox/getScores",
                data: $scope.getScoresModel,
                dataType: "json",
                success: function (response) {
                    //clean old point array, needed to removed points from map if you decrease number of entries
                    $rootScope.$emit("setTermDictionary", response.dic);

                    if($scope.getScoresModel.drawMode =="none" || $scope.getScoresModel.drawMode =="latlonbin") {
                        $rootScope.$emit("clearMarkers",['score']);
                        $rootScope.$emit("drawMapMarkers", response.sco, $scope.getScoresModel.fBinSize, "score", $scope.getScoresModel.bBinByLatLon);
                    }
                    if($scope.getScoresModel.drawMode =="cluster")
                        $rootScope.$emit("drawShapes",response.sco ,"score");

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


        $scope.onDropZoneClicked = function(event){
            var fileSelector = $('<input type="file" />');

            fileSelector.change(function(evt){
                $rootScope.$emit("renderKmlFile",evt.target.files[0]);
            });
            fileSelector.click();
        };

        $scope.populateTrainingSelect = function() {
            if(!$rootScope.isAppConfigured())
                return;

            $.ajax({
                url: "app/controlBox/popTrainingDataList",
                data : {
                    filePath: $rootScope.savePath
                },
                dataType: "json",
                success: function (response) {
                    $scope.$apply(function(){
                        $scope.trainingFiles = response.lFiles;
                    });

                },
                error: $rootScope.showError
            });
        };

        $scope.trainingDataModel = {
            filePath: "",
            fileAppOut:""
        };
        $scope.drawTrainingData = function() {
            if(!$rootScope.isAppConfigured())
                return;
            $scope.trainingDataModel.filePath = $rootScope.savePath;

            $.ajax({
                url: "app/controlBox/getTrainingData",
                data: $scope.trainingDataModel,
                dataType: "json",
                success: function (response) {
                    $rootScope.$emit("clearMarkers",['training']);
                    $rootScope.$emit("drawMapMarkers",response.sco,null, "training");
                },
                error: $rootScope.showError
            });
        };


        ///INIT
        $scope.popScore();
        $scope.populatePolygonSelect();
        $scope.populateTrainingSelect();
    });

