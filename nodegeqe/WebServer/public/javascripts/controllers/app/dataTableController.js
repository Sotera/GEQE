angular.module('NodeWebBase')
    .filter('dateParse', function($filter) {
        return function(input,format,timezone) {
            return (!!input) ? $filter('date')( Date.parse(input), format, timezone) : '';
        };
    })
    .controller('dataTableController', ['$scope','$rootScope','$timeout','applyFilterMsg','itemDetailsLoadedMsg','$http',
        function ($scope, $rootScope, $timeout, applyFilterMsg,itemDetailsLoadedMsg,$http) {
            $scope.scopeName = 'dataTableController';

            $scope.masterCollection = [];
            $scope.rowCollection = [];
            $scope.displayedCollection = [];

            itemDetailsLoadedMsg.listen( function(event,item){
                $scope.selectRow(item);
            });

            $scope.selectRow = function(rowItem){
                angular.forEach($scope.masterCollection,function(row){
                    row.isSelected = row === rowItem;
                });
            };

            applyFilterMsg.listen(function(event,filterText){
                var items = [];
                angular.forEach($scope.masterCollection,function(item){
                    if(filterText != '') {
                        var cap = item._source.message.toLowerCase();
                        if (cap.indexOf(filterText.toLowerCase()) < 0) {
                            return;
                        }
                    }
                    items.push(item);
                });

                $scope.rowCollection = items;
                $scope.displayedCollection = [].concat($scope.rowCollection);
            });

            $rootScope.$on('loadItemData', function (event, data) {

                angular.forEach($scope.masterCollection,function(item){
                    item.isSelected = false;
                });


                $timeout(function(){
                    if(data.posts) {
                        $scope.masterCollection = data.posts.hits.slice(0);
                        $scope.rowCollection = data.posts.hits.slice(0);
                        $scope.displayedCollection = [].concat($scope.rowCollection);
                    }
                    else{
                        $scope.selectRow(data);
                    }
                });

            });

            $rootScope.$on('loadItemPosts',function(event,item){
                if(!item.posts) {
                    $http({
                        method: "POST",
                        url: "app/posts/bin",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        data:{
                            "from": 0,
                            "size": 100,
                            "boundingPoly": item.boundingPoly,
                            "query_string": item.significantTerms.join(' ')
                        }
                    }).success(function (response) {
                        item.posts = response.hits;
                        $rootScope.$emit("loadItemData", item);
                    }).error($rootScope.showError);
                    return;
                }

                $rootScope.$emit("loadItemData",item);
            });

            $scope.rowClicked = function(row){
                if(row.isSelected){
                    $rootScope.$emit("loadItemData",row);
                }
            }


        }]);