/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('resultsTabController', ['$scope','$rootScope','$http', function ($scope, $rootScope, $http) {
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
            maxOut:50
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
            if( newVal ){ // Don't do anything if Undefined.
                $scope.popScore();
                $scope.populatePolygonSelect();
                $scope.populateTrainingSelect();
                watchRemoval();
           }
        })
   }]);

