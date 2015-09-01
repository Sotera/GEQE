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
            if(data.type === 'place'){
                $scope.setData(data.bingroups);
            }
            else{
                $scope.sortDataByDate(data.bingroups);
            }

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
                'data':data[0].bins,
                'nClusters':data[0].bins.length,
                'x':0
            }];

            angular.forEach(data[0].bins,function(group,idx){
                var catalogItem = $scope.getCatalogItem("All");
                if(maxScore < group.score)
                    maxScore = group.score;
                if(!catalogItem){
                    catalogItem = {
                        'title':'bin',
                        'x':idx,
                        'hiScore':group.score
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
                    y: {min:0,max:maxScore * 1.1}
                },
                series: [
                    {
                        y: "hiScore",
                        axis:"y",
                        thickness:"2px",
                        color: "#1f77b4"
                    }
                ],
                tooltip: {
                    mode: "scrubber",
                    formatter: function (x, y, series) {
                        if(series.y === "postCount"){
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
            var minPosts = -1;
            var maxPosts = 0;

            angular.forEach(data,function(group,idx){
                if(!group.day)
                    group.day="None";

                // add the day to each bin to allow posts qpi to query for a date
                angular.forEach(group.bins,function(bin,idx){
                    bin.day = group.day
                })

                var catalogItem = $scope.getCatalogItem(group.day);

                if(!catalogItem){
                    var totalPosts = 0;
                    angular.forEach(group.bins, function(bin){
                       totalPosts+=  bin.totalCount;
                    });
                    var day = new Date(group.day);
                    catalogItem = {
                        'title': day.getMonth()+1 + "/" + day.getDate() + "/" + day.getFullYear(),
                        'x':idx,
                        'data':group.bins,
                        'nClusters':group.count,
                        'totalPosts':totalPosts
                    };
                    if(minPosts === -1 || minPosts > totalPosts)
                        minPosts = totalPosts;
                    if(maxPosts< totalPosts)
                        maxPosts = totalPosts;
                    $scope.catalog.push(catalogItem);
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
                    y2: {min:minPosts,max:maxPosts * 1.1},
                    y:{min:0}
                },
                series: [
                    {
                        y: "nClusters",
                        type: "column",
                        color: "#ff7f0e"
                    },
                    {
                        y: "totalPosts",
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
                        return "P  " + y;
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
            $rootScope.$emit("clearCurrentShapes",['score']);
            $rootScope.$emit("drawShapes",$scope.catalog[$scope.currentCatalogIndex].data ,"score");
        }


    }]);