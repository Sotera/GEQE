/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('resultsTabController', function ($scope, $rootScope, $http) {
        $scope.scoreFiles = [];
        $scope.polygonFiles = [];
        $scope.trainingFiles = [];


        $scope.popScore = function() {
            if (!$rootScope.isAppConfigured())
                return;

            $http({
                method: "GET",
                url: "app/controlBox/populate/scores",
                params: {
                    user: $rootScope.username
                }
            }).success(function (response) {
                $scope.scoreFiles = response.lFiles;
            }).error($rootScope.showError)
        };

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
                }).error($rootScope.showError)
        };

        $scope.getScoresModel = {
            user: "",
            fileAppOut: "",
            maxOut:20
        };

        $scope.getScores = function() {
            if(!$rootScope.isAppConfigured())
                return;
            var drawMarkers = $("#drawMarkers").is(":checked");
            $scope.getScoresModel.user = $rootScope.username;

            $http({
                method: "GET",
                url: "app/controlBox/getScores",
                params: $scope.getScoresModel
            }).success(function (response) {

                if((!response.clusters || response.clusters == 0) &&
                    (!response.dates || response.dates == 0))
                {
                    $rootScope.showErrorMessage("Get Scores","No Scores Returned");
                }

                $rootScope.$emit("loadNavData", response);
                $rootScope.$emit("setTermDictionary", response.dic);

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
            }).error($rootScope.showError)
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

            $http({
                method:"GET",
                url: "app/controlBox/populate/trainingdata",
                params:{
                    user: $rootScope.username
                }}).success(function (response) {
                        $scope.trainingFiles = response.lFiles;
                 }).error($rootScope.showError)
        };

        $scope.trainingDataModel = {
            user: "",
            fileAppOut:""
        };

        $scope.drawTrainingData = function() {
            if(!$rootScope.isAppConfigured())
                return;
            $scope.trainingDataModel.user = $rootScope.username;
            $http({
                method:"GET",
                url: "app/controlBox/getTrainingData",
                params: $scope.trainingDataModel})
                .success(function (response) {
                    $rootScope.$emit("clearMarkers",['training']);
                    $rootScope.$emit("drawMapMarkers",response.sco, "training");
                })
                .error($rootScope.showError)
        };


        ///INIT
        var watchRemoval = $scope.$watch($rootScope.isAppConfigured ,function(newVal,oldVal) {
            $scope.popScore();
            $scope.populatePolygonSelect();
            $scope.populateTrainingSelect();
            watchRemoval();
        })
   });

