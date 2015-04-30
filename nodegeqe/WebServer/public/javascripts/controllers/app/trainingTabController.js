angular.module('NodeWebBase')
    .controller('trainingTabController', function ($scope, $rootScope) {
        $scope.trainingFiles = ["--select--"];
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

        $scope.drawTrainingData = function() {
            if(!$rootScope.isAppConfigured())
                return;
            var sName = $("#trainingSelect").val();
            $.ajax({
                url: "app/controlBox/getTrainingData",
                data: {
                    filePath: $rootScope.savePath,
                    fileAppOut: sName
                },
                dataType: "json",
                success: function (response) {
                    $rootScope.$emit("clearCurrentMarkers");
                    $rootScope.$emit("drawMapMarkers",response.sco,null, "training");
                },
                error: $rootScope.showError
            });
        };


        ///INIT
        $scope.populateTrainingSelect();
    });

