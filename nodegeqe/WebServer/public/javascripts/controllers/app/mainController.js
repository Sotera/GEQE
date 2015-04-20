angular.module('NodeWebBase')
    .controller('mainController', function ($scope, $rootScope,ngDialog) {
        $rootScope.baseUrl = "http://localhost:3000/";
        $rootScope.savePath = "/home/jlueders/src/geqe/exSrc/";
        //$scope.savePath = "/home/jgartner/findSP/";
        $rootScope.fileSubDir = "inputFiles/";

        $rootScope.showError = function(jqxhr, testStatus, reason){
            ngDialog.openConfirm({
                template: '/views/app/genericError',
                controller: ['$scope', function ($scope) {
                    $scope.errorMessage = reason + ' ' + jqxhr.responseText;
                    $scope.close = function () {
                        $scope.closeThisDialog(null);
                    }
                }]
            });
        };
    });
