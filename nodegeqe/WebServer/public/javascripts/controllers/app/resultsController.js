angular.module('NodeWebBase')
    .controller('resultsController', function ($scope, $rootScope) {

        $rootScope.$on('displayResults', function (event, data) {
            $("#resultsText").html(data);
        });

    });
