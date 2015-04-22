angular.module('NodeWebBase')
    .constant('userUrl', 'app/users')
    .controller('mainController', function ($scope, $rootScope, $http, $cookies, ngDialog) {
        $scope.scopeName = "mainController";
        $rootScope.baseUrl = "http://localhost:3000/";

        //THESE ARE IN SETTINGS NOW..Please set them in the settings dialog
        //$rootScope.savePath = "/home/jlueders/src/geqe/exSrc/";
        //$scope.savePath = "/home/jgartner/findSP/";
        //$rootScope.fileSubDir = "inputFiles/";

        $scope.initWithSettings = function(res){
            $rootScope.savePath = res.savePath;
            $rootScope.fileSubDir = res.inputSubDir;
            $rootScope.fullname = res.fullname;

            $rootScope.$emit("setfullname");
        };

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
        $scope.sizes = [];
        $scope.setStyle = function(style)
        {
            $scope.$apply(function () {
                $scope.style = style;
                $scope.sizes.push(style.height);
            });


        };

        ///INIT
        var url = $rootScope.baseUrl + "app/users/" + $cookies.userId ;

        $http.get(url,{
            params: {
                access_token: $cookies.access_token
            }
        })
            .success($scope.initWithSettings)
            .error($rootScope.showError);
        ///END INIT

    });
