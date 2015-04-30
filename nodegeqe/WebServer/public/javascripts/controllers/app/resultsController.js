angular.module('NodeWebBase')
    .controller('resultsController', function ($scope, $sce, $rootScope) {

        $rootScope.$on('displayResults', function (event, data) {
            $("#resultsText").html(data);
        });
        $rootScope.$on('clearResults', function (event) {
            $("#resultsText").html("");
        });
    });
