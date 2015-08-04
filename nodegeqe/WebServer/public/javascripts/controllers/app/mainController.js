angular.module('NodeWebBase')
    .constant('userUrl', 'app/users')
    .controller('mainController', ['$scope', '$rootScope', '$http', '$cookies', 'ngDialog','changeThemeMsg','setFullNameMsg',
        function ($scope, $rootScope, $http, $cookies, ngDialog,changeThemeMsg, setFullNameMsg) {
        $scope.scopeName = "mainController";


        $rootScope.editing = false;
        $rootScope.$on("toggleEditing", function(event, truthValue){
            $rootScope.editing = truthValue;
        });

        // Close pop up windows with Esc key. For some reason it's not functioning by default.
        //http://stackoverflow.com/questions/1481626/how-to-handle-esc-keydown-on-javascript-popup-window
        $(document).keydown(function(e) {
             // ESCAPE key pressed
             if (e.keyCode == 27) {
                  ngDialog.closeAll();
              }
         });


        $scope.initWithSettings = function(res){
            $rootScope.username = res.username;
            $rootScope.fullname = res.fullname;
            $rootScope.serviceHostName = res.serviceHostName;
            $rootScope.servicePort = res.servicePort;
            $rootScope.userLoggingEnabled = res.userLoggingEnabled;
            $rootScope.userLoggingUrl = res.userLoggingUrl;


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
                    $scope.errorMessage = 'status ' + status + ' for ' + config.url;
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

    }]);
