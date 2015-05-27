angular.module('NodeWebBase')
    .controller('dataNavController', ['$scope','$rootScope', function ($scope, $rootScope) {
        $scope.scopeName = 'dataNavController';
        $scope.catalog = [];
        $scope.currentCatalogIndex = 0;
        $scope.dataDetails = null;
        $scope.currentCatalogTitle = "None";
        $scope.currentCatalogTitleStart = "";
        $scope.currentCatalogTitleFinish = "";
        $scope.singleItem = true;

        $rootScope.$on('loadNavData', function (event, data, dataDetails) {
            $scope.dataDetails = dataDetails;

            $rootScope.$emit("clearAll");
            dataDetails.bBinByDate?$scope.sortDataByDate(data):$scope.setData(data);

            $scope.currentCatalogIndex = 0;
            $scope.currentCatalogTitle = "";
            $scope.currentCatalogTitleStart = "";
            $scope.currentCatalogTitleFinish = "";
            if($scope.catalog.length >1){
                $scope.currentCatalogTitleStart = $scope.catalog[0].title;
                $scope.currentCatalogTitleFinish =  $scope.catalog[$scope.catalog.length - 1].title;;
            }
            $scope.singleItem = $scope.catalog.length == 1;
            $scope.sendCurrentData();


        });

        $scope.setData = function(data){
            $scope.catalog = [{
                'title':'All Posts',
                'data':data
            }];
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
            angular.forEach(data,function(group,idx){
                var catalogItem = $scope.getCatalogItem(group.date);
                if(!catalogItem){
                    catalogItem = {
                        'title':group.date,
                        'data':[]
                    };
                    $scope.catalog.push(catalogItem);
                }
                catalogItem.data.push(group);
            });
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

            $rootScope.$emit("clearMarkers",['score']);
            $rootScope.$emit("clearMarkers",['training']); //<- lame need to add cluster marker set too
            $rootScope.$emit("clearCurrentShapes");

            if($scope.dataDetails.drawMode =="none" || $scope.dataDetails.drawMode =="latlonbin") {
                $rootScope.$emit("drawMapMarkers", $scope.catalog[$scope.currentCatalogIndex].data,
                    $scope.dataDetails.fBinSize, "score", $scope.dataDetails.drawMode =="latlonbin");
            }
            if($scope.dataDetails.drawMode =="cluster")
                $rootScope.$emit("drawShapes",$scope.catalog[$scope.currentCatalogIndex].data ,"score");
        }


    }]);