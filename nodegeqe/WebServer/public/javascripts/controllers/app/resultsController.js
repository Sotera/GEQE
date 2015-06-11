angular.module('NodeWebBase')
    .controller('resultsController',['$scope','$sce','$rootScope',function ($scope, $sce, $rootScope) {

        $rootScope.$on('displayResults', function (event, data) {
            $("#resultsText").html(data);
        });
        $rootScope.$on('clearResults', function (event) {
            $("#resultsText").html("");
        });
    }]);
