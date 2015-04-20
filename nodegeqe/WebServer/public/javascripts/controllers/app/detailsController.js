angular.module('NodeWebBase')
    .controller('detailsController', ['$scope','$rootScope', function ($scope, $rootScope) {
        $scope.data = null;
        $scope.currentItemIndex = null;
        $scope.displayIndex = null;
        $scope.currentItem = {"usr":"unknown",
                                "cap":"none",
                                "sco":"0"};

        $rootScope.$on('loadItemData', function (event, data) {
            $scope.$apply(function () {
                $scope.data = data;
                $scope.currentItemIndex = 0;
                $scope.displayIndex = 1;
                $scope.currentItem = $scope.data.posts[0];
            });
        });

        $scope.next = function(){
            $scope.currentItemIndex++;
            $scope.displayIndex = $scope.currentItemIndex+1;
            $scope.currentItem = $scope.data.posts[$scope.currentItemIndex];
        };

        $scope.previous = function(){
            $scope.currentItemIndex--;
            $scope.displayIndex = $scope.currentItemIndex+1;
            $scope.currentItem = $scope.data.posts[$scope.currentItemIndex];
        };

        $scope.getUser = function(){
            $.ajax({
                url:  $rootScope.baseUrl + "app/twitter/user",
                data : {
                    "screen_name":"twitterapi"
                },
                dataType: "json",
                success: function (response) {
                    $scope.user = response;
                },
                error: $rootScope.showError
            });
        };
    }]);