angular.module('nbSettings', ['ngCookies','ngDialog'])
    .constant('userUrl', 'http://localhost:3000/app/users')
    .factory('nbSettings', function () {
        return {
        };
    })
    .directive('nbSettings', function (userUrl) {
        return{
            restrict: 'E',
            templateUrl: '/views/app/settingsLink',
            controller: function($scope, ngDialog, $http, $cookies){
                $scope.openSettings = function(){
                    var url = userUrl + "/" + $cookies.userId ;

                    $http.get(url,{
                        params: {
                            access_token: $cookies.access_token
                        }
                    })
                    .success(function (res) {

                        ngDialog.openConfirm({
                            template: '/views/app/settings',
                            controller: ['$scope', function ($scope) {
                                $scope.url = userUrl + "/" + $cookies.userId ;
                                $scope.data = res;
                                $scope.save = function(){
                                    $http.post($scope.url,{
                                        "fullname": $scope.data.fullname,
                                        "email": $scope.data.email
                                    },{
                                        params: {
                                            access_token: $cookies.access_token
                                        }
                                    })
                                }

                            }]
                        });
                    })
                    .error(function (error) {
                        $scope.authenticationError = error;
                        ngDialog.openConfirm({
                            template: '/views/partials/error',
                            controller: ['$scope', function ($scope) {
                                $scope.message1 = 'hello!!!!';
                                $scope.logout = function () {
                                    $scope.closeThisDialog(null);
                                    window.location.href = '/';
                                }
                            }]
                        });
                    });
                };
            }
        };
    });
