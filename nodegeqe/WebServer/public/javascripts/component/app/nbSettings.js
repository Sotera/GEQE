angular.module('nbSettings', ['ngCookies','ngDialog'])
    .constant('userUrl', 'app/users')
    .factory('nbSettings', function () {
        return {
        };
    })
    .directive('nbSettings', function (userUrl) {
        return{
            restrict: 'E',
            templateUrl: '/views/app/settingsLink',
            controller: function($scope, ngDialog, $http, $cookies,$rootScope){

                $scope.openSettings = function(res){
                    ngDialog.openConfirm({
                        template: '/views/app/settings',
                        controller: ['$scope', function ($scope) {
                            $scope.url = userUrl + "/" + $cookies.userId ;
                            $scope.data = res;
                            $scope.cancel = function(){
                                $scope.closeThisDialog(null);
                            };
                            $scope.save = function(){
                                $http.post($scope.url,{
                                    "fullname": $scope.data.fullname,
                                    "email": $scope.data.email,
                                    "inputSubDir": $scope.data.inputSubDir,
                                    "savePath":$scope.data.savePath
                                },{
                                    params: {
                                        access_token: $cookies.access_token
                                    }
                                }).success(function (res) {
                                    //update our root config vars
                                    $rootScope.savePath = $scope.data.savePath;
                                    $rootScope.fileSubDir = $scope.data.inputSubDir;
                                    $rootScope.fullname = $scope.data.fullname;
                                    $rootScope.$emit("setfullname");
                                    $scope.closeThisDialog(null);
                                }).error($rootScope.showError);
                            };
                        }]
                    });
                };

                $scope.requestSettings = function(){
                    var url = $rootScope.baseUrl + userUrl + "/" + $cookies.userId ;

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
    });
