angular.module('NodeWebBase')
    .controller('dataNavController', ['$scope','$rootScope', function ($scope, $rootScope) {
        $scope.scopeName = 'dataNavController';
        $scope.catalog = [];
        $scope.chartModel  = null;
        $scope.focusedCatalogIndex = 0;
        $scope.currentCatalogIndex = 0;
        $scope.currentCatalogTitle = "None";
        $scope.currentCatalogTitleStart = "";
        $scope.currentCatalogTitleFinish = "";
        $scope.singleItem = true;

        $scope.options = {
            drawLegend:false,
            axes: {
                x: {key: 'x', ticks:0},
                y:{min:0, ticks:0}
            },
            series: [
                {
                    y: "y"
                }
            ]
        };

        $rootScope.$on('loadNavData', function (event, data) {

            $rootScope.$emit("clearAll");
            data.type==="event"?$scope.sortDataByDate(data.dates):$scope.setData(data);

            $scope.currentCatalogIndex = 0;
            $scope.currentCatalogTitle = "";
            $scope.currentCatalogTitleStart = "";
            $scope.currentCatalogTitleFinish = "";
            if($scope.catalog.length >1){
                $scope.currentCatalogTitleStart = $scope.catalog[0].title;
                $scope.currentCatalogTitleFinish =  $scope.catalog[$scope.catalog.length - 1].title;
            }
            $scope.singleItem = $scope.catalog.length == 1;
            $scope.sendCurrentData();


        });

        $scope.setData = function(data){
            var maxScore = 0;
            $scope.chartModel = [];
            $scope.catalog = [{
                'title':'All Clusters',
                'data':data.clusters,
                'hiScore':data.hiScore,
                'nClusters':data.nCluster,
                'x':0
            }];

            angular.forEach(data.clusters,function(group,idx){
                var catalogItem = $scope.getCatalogItem(group.date);
                if(maxScore < group.score)
                    maxScore = group.score;
                if(!catalogItem){
                    catalogItem = {
                        'title':'cluster',
                        'x':idx,
                        'hiScore':group.score,
                        'nClusters':group.posts.length
                    };
                    $scope.chartModel.push(catalogItem);
                    return;
                }
                console.log("Duplicate Date in Time Series");
            });

            $scope.options = {
                lineMode: "cardinal",
                drawLegend:false,
                margin: {
                    left: -1,
                    right: 0,
                    top: 10,
                    bottom: 4
                },
                axes: {
                    x: {key: 'x'},
                    y2: {min:0,max:maxScore * 1.1},
                    y:{min:0}
                },
                series: [
                    {
                        y: "nClusters",
                        type: "column",
                        color: "#ff7f0e"
                    },
                    {
                        y: "hiScore",
                        axis:"y2",
                        thickness:"2px",
                        color: "#1f77b4"
                    }
                ],
                tooltip: {
                    mode: "scrubber",
                    formatter: function (x, y, series) {
                        if(series.y === "nClusters"){
                            return "P  " + y;
                        }
                        return "S  " + y;
                    }
                }
            };


        };

        $scope.catalogItemSelected = function(selection){
            angular.forEach($scope.catalog,function(item,idx){
               if(item === selection){
                   $scope.currentCatalogIndex = idx;
                   $scope.sendCurrentData();
               }
            });
        };

        $scope.getCatalogItem = function(title){
            var catalogItem = null;
            angular.forEach($scope.catalog,function(item,idx){
              if(item.title == title){
                  catalogItem = item;
              }
            });
            return catalogItem;
        };

        $scope.sortDataByDate = function(data){
            $scope.catalog = [];
            var maxScore = 0;
            angular.forEach(data,function(group,idx){
                var catalogItem = $scope.getCatalogItem(group.date);
                if(!catalogItem){
                    catalogItem = {
                        'title':group.date,
                        'x':idx,
                        'data':group.clusters,
                        'hiScore':group.hiScore,
                        'nClusters':group.nClusters
                    };
                    $scope.catalog.push(catalogItem);
                    if(maxScore < group.hiScore)
                        maxScore = group.hiScore;
                    return;
                }



                console.log("Duplicate Date in Time Series");
            });

            $scope.chartModel = $scope.catalog;

            $scope.options = {
                lineMode: "cardinal",
                drawLegend:false,
                margin: {
                    left: -1,
                    right: 0,
                    top: 10,
                    bottom: 4
                },
                axes: {
                    x: {key: 'x'},
                    y2: {min:0,max:maxScore * 1.1},
                    y:{min:0}
                },
                series: [
                    {
                        y: "nClusters",
                        type: "column",
                        color: "#ff7f0e"
                    },
                    {
                        y: "hiScore",
                        axis:"y2",
                        thickness:"2px",
                        color: "#1f77b4"
                    }
                ],
                tooltip: {
                    mode: "scrubber",
                    formatter: function (x, y, series) {
                        if(series.y === "nClusters"){
                            return "C  " + y;
                        }
                        return "S  " + y;
                    }
                }
            };


        };

        $scope.onChartFocus = function(d, i, position){
            $scope.focusedCatalogIndex = i;
        };

        $scope.onChartClick = function(){
            var item = $scope.chartModel[$scope.focusedCatalogIndex];
            if(item.title === "cluster"){
                $rootScope.$emit("loadItemData",$scope.catalog[0].data[$scope.focusedCatalogIndex]);
                return;
            }
            $scope.currentCatalogIndex = $scope.focusedCatalogIndex;
            $scope.sendCurrentData();
        };

        $scope.next = function(){
            $scope.currentCatalogIndex++;

            if($scope.currentCatalogIndex >= $scope.catalog.length)
                $scope.currentCatalogIndex = 0;

            $scope.sendCurrentData();
        };

        $scope.previous = function(){
            $scope.currentCatalogIndex--;

            if($scope.currentCatalogIndex < 0)
                $scope.currentCatalogIndex = $scope.catalog.length-1;

            $scope.sendCurrentData();
        };

        $scope.sendCurrentData = function(){
            if($scope.catalog.length == 0)
                return;

            $scope.currentCatalogTitle = $scope.catalog[$scope.currentCatalogIndex].title;

            $rootScope.$emit("clearMarkers",['score','training','item']);
            $rootScope.$emit("clearCurrentShapes");
            $rootScope.$emit("drawShapes",$scope.catalog[$scope.currentCatalogIndex].data ,"score");
        }


    }]);