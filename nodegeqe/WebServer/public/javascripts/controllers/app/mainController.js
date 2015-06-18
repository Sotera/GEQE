angular.module('NodeWebBase')
    .constant('userUrl', 'app/users')
    .controller('mainController', ['$scope', '$rootScope', '$http', '$cookies', 'ngDialog','changeThemeMsg','setFullNameMsg',
        function ($scope, $rootScope, $http, $cookies, ngDialog,changeThemeMsg, setFullNameMsg) {
        $scope.scopeName = "mainController";

        $scope.initWithSettings = function(res){

            $rootScope.username = res.username;
            $rootScope.fullname = res.fullname;
            $rootScope.serviceHostName = res.serviceHostName;
            $rootScope.servicePort = res.servicePort;

            setFullNameMsg.broadcast();
            changeThemeMsg.broadcast(res.themeName);
        };

        $rootScope.isAppConfigured = function(){
          return $rootScope.fullname &&
            $rootScope.serviceHostName &&
            $rootScope.servicePort;
        };

        $rootScope.showErrorMessage = function(source, reason){
            ngDialog.openConfirm({
                template: '/views/app/genericError',
                controller: ['$scope', function ($scope) {
                    $scope.errorMessage = source + ":" + reason;
                    $scope.close = function () {
                        $scope.closeThisDialog(null);
                    }
                }]
            });
        };

        $rootScope.showError = function(data, status, headers, config){
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
        var url = "app/users/" + $cookies.userId ;

        $http.get(url,{
            params: {
                access_token: $cookies.access_token
            }
        })
        .success($scope.initWithSettings)
        .error($rootScope.showError);
        ///END INIT

    });
