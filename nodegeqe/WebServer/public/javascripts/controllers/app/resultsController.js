angular.module('NodeWebBase')
    .controller('resultsController',['$scope','$sce','$rootScope','$timeout',function ($scope, $sce, $rootScope,$timeout) {
        $scope.masterCollection = [];
        $scope.rowCollection = [];
        $scope.displayedCollection = [];
        $scope.words= [
        ];

        $rootScope.$on('clearResults', function (event) {
            $scope.clearResults();
        });

        $rootScope.$on('loadItemData', function (event, data) {

            $scope.clearResults();

            $timeout(function(){
                if(data.significantTerms) {
                    var terms = [];

                    $scope.buildWordCloud(data);
                    angular.forEach(data.significantTerms, function(term,idx){
                        terms.push({"term":term,"rank":idx});
                    });

                    $scope.masterCollection = terms.slice(0);
                    $scope.rowCollection = terms.slice(0);
                    $scope.displayedCollection = [].concat($scope.rowCollection);
                }
            });

        });

        $scope.buildWordCloud = function(data){
            var wordObjs = [];
            angular.forEach(data.posts.hits, function(post,idx){
                var words = post._source.message.toLowerCase().split(" ");
                angular.forEach(words,function(word,idx) {
                    if(word.length <= 3)
                        return;
                    var wordObj = wordObjs[word];
                    if (!wordObj) {
                        wordObj = {"text": word, "weight": 1};
                        wordObjs[word] = wordObj;
                        $scope.words.push(wordObj);
                        return;
                    }
                    wordObj.weight++;
                });
            });

        };

        $scope.clearResults = function(){
            $scope.words.length = 0;
            $scope.masterCollection.length = 0;
            $scope.rowCollection.length = 0;
            $scope.displayedCollection.length = 0;
        };
    }]);
