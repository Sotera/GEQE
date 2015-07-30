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
                if(data.significantTerms) {
                    var terms = [];

                    angular.forEach(data.significantTerms, function(term,idx){
                        terms.push({"term":term,"rank":idx});
                    });

                    $scope.masterCollection = terms.slice(0);
                    $scope.rowCollection = terms.slice(0);
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
