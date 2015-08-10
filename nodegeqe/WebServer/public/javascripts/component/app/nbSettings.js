angular.module('nbSettings', ['ngCookies','ngDialog'])
    .constant('userUrl', 'app/users')
    .factory('nbSettings', function () {
        return {
        };
    })
    .directive('nbSettings', ['userUrl','changeThemeMsg','setFullNameMsg',function (userUrl,changeThemeMsg,setFullNameMsg) {
        return{
            restrict: 'E',
            templateUrl: '/views/app/settingsLink',
            controller: function($scope, ngDialog, $http, $cookies,$rootScope){

                $scope.openSettings = function(res){
                    ngDialog.openConfirm({
                        template: '/views/app/settings',
                        controller: ['$scope','$rootScope', function ($scope,$rootScope) {
                            $scope.url = userUrl + "/" + $cookies.userId ;
                            $scope.data = res;
                            $scope.themes = $rootScope.themes;
                            $scope.currentTheme = !$scope.data.themeName?$scope.themes[0].name:$scope.data.themeName;

                            $scope.cancel = function(){
                                $scope.closeThisDialog(null);
                                if($scope.data.themeName != $scope.currentTheme )
                                    changeThemeMsg.broadcast($scope.currentTheme);
                            };

                            $scope.changeTheme = function(){
                                changeThemeMsg.broadcast($scope.data.themeName);
                            };

                            $scope.save = function(){
                                $http.post($scope.url,{
                                    "fullname": $scope.data.fullname,
                                    "email": $scope.data.email,
                                    "themeName": $scope.data.themeName,
                                    "serviceHostName":$scope.data.serviceHostName,
                                    "modelSavePath":$scope.data.modelSavePath,
                                    "servicePort":$scope.data.servicePort,
                                    "userLoggingEnabled":$scope.data.userLoggingEnabled,
                                    "userLoggingUrl":$scope.data.userLoggingUrl
                                },{
                                    params: {
                                        access_token: $cookies.access_token
                                    }
                                }).success(function (res) {
                                    //update our root config vars
                                    $rootScope.fullname = $scope.data.fullname;
                                    $rootScope.modelSavePath = $scope.data.modelSavePath;
                                    $rootScope.serviceHostName = $scope.data.serviceHostName;
                                    $rootScope.servicePort = $scope.data.servicePort;
                                    $rootScope.userLoggingEnabled = $scope.data.userLoggingEnabled;
                                    $rootScope.userLoggingUrl = $scope.data.userLoggingUrl,
                                    setFullNameMsg.broadcast();
                                    $scope.closeThisDialog(null);
                                }).error($rootScope.showError);
                            };
                        }]
                    });
                };

                $scope.requestSettings = function(){
                    var url = userUrl + "/" + $cookies.userId ;

                    $http.get(url,{
                        params: {
                            access_token: $cookies.access_token
                        }
                    })
                    .success($scope.openSettings)
                    .error($rootScope.showError);
                };
            }
        };
    }]);
