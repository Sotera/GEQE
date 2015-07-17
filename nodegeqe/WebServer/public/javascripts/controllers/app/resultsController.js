angular.module('NodeWebBase')
    .controller('resultsController',['$scope','$sce','$rootScope','$timeout',function ($scope, $sce, $rootScope,$timeout) {
        $scope.masterCollection = [];
        $scope.rowCollection = [];
        $scope.displayedCollection = [];


        $rootScope.$on('clearResults', function (event) {
            $scope.clearResults();
        });

        $rootScope.$on('loadItemData', function (event, data) {

            $scope.clearResults();

            $timeout(function(){
                if(data.dict) {
                    var dictData = [];
                    angular.forEach(data.dict, function(term,idx){
                        dictData.push({"term":term,"rank":idx});

                    });

                    $scope.masterCollection = dictData.slice(0);
                    $scope.rowCollection = dictData.slice(0);
                    $scope.displayedCollection = [].concat($scope.rowCollection);
                }
            });

        });

        $scope.clearResults = function(){
            $scope.masterCollection.length = 0;
            $scope.rowCollection.length = 0;
            $scope.displayedCollection.length = 0;
        };
    }]);
