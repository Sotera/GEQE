/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('modelTabController', ['$scope','$rootScope','$http','setSelectionMsg', function ($scope, $rootScope, $http,setSelectionMsg) {
        $scope.scoreFiles = [];
        $scope.polygonFiles = [];


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
                url: "app/sitelists/list/"+$rootScope.username,
                params: {}
            }).success(function (response) {
                $scope.polygonFiles = response
            }).error($rootScope.showError);
        };


        $scope.drawPolygonFile = function(){
            var modelId = $scope.getPolygonId();
            if (!modelId)  $rootScope.showErrorMessage("Polygon name invalid.",'Polygon must be saved prior to use.');
            else $rootScope.$emit("drawPolygonFile", modelId)

        setSelectionMsg.listen(function(evt,vals){
            if(vals.type="polygonSetSelected")
                $scope.polygonSetSelected=vals.data;
            if(vals.type="dataSetSelected")
                $scope.dataSetSelected=vals.data;
            console.log(vals);
        });



        $scope.getScoresModel = {
            user: "",
            fileAppOut: "",
            maxOut:50
        };


        /**
         * Get the id for the current polyFile from the polygonList
         * Undefined if the model has not been saved
         */
        $scope.getPolygonId = function(){
            for  (var i=0; i<$scope.polygonFiles.length; i++){
                if ($scope.polygonFiles[i].name == $scope.polyFile){
                    return $scope.polygonFiles[i].id;
                }
            }
            return undefined;
        };


        /**
         * Save the site list (polygon)
         */
        $scope.saveList = function(){

            $rootScope.$emit("getShapesText",
                {
                    "scope":this,
                    "callback":function(resultsText){
                        if(!$rootScope.isAppConfigured())
                            return;
                        var pName = $scope.polyFile;
                        var siteList = JSON.parse(resultsText);
                        siteList.name = pName;
                        siteList.username = $rootScope.username;
                        var modelId = $scope.getPolygonId();
                        if (modelId) siteList.id = modelId;

                        $http({
                            method:"POST",
                            url: "app/sitelists/save",
                            params: {
                                siteList: siteList
                            }}).success(function (response) {
                            $("#resultsText").text(pName + " written");
                            $scope.populatePolygonSelect(); // refresh the polygon list to get the new id
                        }).error($rootScope.showError)
                    }
                });
        };

        $rootScope.$on('sampleShape',function(event,item){

            if(!item)
                return;
            $http({
                method: "POST",
                url: "app/posts/sitelist",
                headers: {
                    "Content-Type": "application/json"
                },
                data:{
                    "sites": [item],
                    "from":0,
                    "size":100
                }
            }).success(function (response) {
                $rootScope.$emit("clearMarkers",['training']);
                $rootScope.$emit("drawMapMarkers",response.hits, "training");
            }).error($rootScope.showError);
        });

        $scope.getDataSets = function() {
            if (!$rootScope.isAppConfigured())
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
   }]);

