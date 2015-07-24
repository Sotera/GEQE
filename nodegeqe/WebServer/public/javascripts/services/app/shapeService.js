
angular.module('NodeWebBase')
    .service('shapeService', ['$rootScope', '$http','ngDialog','themeChangedMsg',function ($rootScope, $http, ngDialog,themeChangedMsg) {
        var me = this;
        me.shapes = [];
        me.scoreShapes = [];
        me.map = null;
        me.drawingManager = null;

        me.init = function(map, drawingManager){
            me.map = map;
            me.drawingManager = drawingManager;
            google.maps.event.addListener(me.drawingManager, 'polygoncomplete', me.handleShape);
            google.maps.event.addListener(me.drawingManager, 'rectanglecomplete', me.handleShape);

            $rootScope.$on('drawPolygonFile', function (event, data) {
                me.clearCurrentShapes();
                me.drawPolygonFile(data);
            });

            $rootScope.$on('clearCurrentShapes', function () {
                me.clearCurrentShapes();
            });

            $rootScope.$on('clearAll', function () {
                me.clearAll();
            });

            $rootScope.$on('deleteShape', function (event, shape) {
                shape.setMap(null);
                var index = me.shapes.indexOf(shape);
                if (index > -1) {
                    me.shapes.splice(index, 1);
                }
            });

            $rootScope.$on('renderKmlFile', function (event, file) {
                me.renderKmlFile(file);
            });

            $rootScope.$on('drawShapes', function (event, data, shapeType) {
                me.clearCurrentShapes();

                switch (shapeType) {
                    case "score":
                        me.drawScoreShapes(data);
                        break;
                }
            });

            themeChangedMsg.listen( function () {
                if ($rootScope.theme.shapeStyles) {
                    drawingManager.setOptions({
                        polygonOptions: $rootScope.theme.shapeStyles,
                        rectangleOptions: $rootScope.theme.shapeStyles
                    });

                    angular.forEach(me.shapes, function (shape) {
                        shape.setOptions($rootScope.theme.shapeStyles);
                    });

                    angular.forEach(me.scoreShapes, function (shape) {
                        shape.setOptions($rootScope.theme.shapeStyles);
                    });
                }
            });

            $rootScope.$on('getShapesText', function (event, callbackInfo) {
                var params = [];
                params.push(me.getSitesJson());
                callbackInfo.callback.apply(callbackInfo.scope, params);
            });
        };

        me.handleShape = function (shape) {
            shape.setEditable(true);
            if ($rootScope.theme && $rootScope.theme.shapeStyles)
                shape.setOptions($rootScope.theme.shapeStyles);
            me.shapes.push(shape);
            shape.geqeData = {
                "name": "site",
                "dates": []
            };

            me.addShapeClickListener(shape);
        };

        me.calculateBounds = function (locations) {
            var bounds = new google.maps.LatLngBounds();
            angular.forEach(locations, function (location, idx) {
                bounds.extend(location);
            });
            me.map.fitBounds(bounds);
        };

        me.getSitesJson = function () {
            var sites = {
                "sites": []
            };
            angular.forEach(me.shapes, function (shape, index) {
                sites.sites.push(me.getSiteFromShape(index, shape));
            });
            var retval = angular.toJson(sites);
            return retval;
        };

        me.getSiteFromShape = function (index, shape) {
            if (shape.getBounds != null)
                return me.getSiteFromRectangle(index, shape);
            return me.getSiteFromPolygon(index, shape);
        };

        me.getSiteFromPolygon = function (index, shape) {
            var vertices = shape.getPath();
            var site = {
                "name": shape.geqeData.name,
                "lats": [],
                "lons": [],
                "dates": !shape.geqeData.dates ? [] : shape.geqeData.dates
            };

            angular.forEach(vertices, function (vert) {
                site.lats.push(vert.lat());
                site.lons.push(vert.lng());
            });

            return site;
        };

        me.getSiteFromRectangle = function (index, shape) {
            var vertices = [];
            var bounds = shape.getBounds();
            var NE = bounds.getNorthEast();
            var SW = bounds.getSouthWest();

            vertices.push(new google.maps.LatLng(NE.lat(), SW.lng()));
            vertices.push(NE);
            vertices.push(new google.maps.LatLng(SW.lat(), NE.lng()));
            vertices.push(SW);

            var site = {
                "name": shape.geqeData.name,
                "lats": [],
                "lons": [],
                "dates": !shape.geqeData.dates ? [] : shape.geqeData.dates
            };

            angular.forEach(vertices, function (vert) {
                site.lats.push(vert.lat());
                site.lons.push(vert.lng());
            });

            return site;
        };

        me.drawPolygonFile = function (modelId) {
            $http({
                method:"GET",
                url: "app/sitelists/get/"+modelId
                }).success(function (response) {
                    var latLngs = [];
                    var latLngList = [];
                    try {
                        var sites = response;
                    }
                    catch (err) {
                        $rootScope.showErrorMessage("JSON Parsing", err);
                        return;
                    }
                    angular.forEach(sites.sites, function (site, idx) {
                        latLngs[idx] = [];
                        for (var i = 0; i < site.lats.length; i++) {
                            var latlng = new google.maps.LatLng(site.lats[i], site.lons[i]);
                            latLngs[idx].push(latlng);
                            latLngList.push(latlng);
                        }
                    });

                    angular.forEach(latLngs, function (points, idx) {
                        if (points === null || points === undefined)
                            return;
                        var polygon = new google.maps.Polygon({
                            paths: points,
                            editable: true
                        });

                        if ($rootScope.theme && $rootScope.theme.shapeStyles)
                            polygon.setOptions($rootScope.theme.shapeStyles);

                        me.shapes.push(polygon);
                        polygon.geqeData = {
                            "name": sites.sites[idx].name,
                            "dates": sites.sites[idx].dates
                        };
                        me.addShapeClickListener(polygon);
                        polygon.setMap(me.map);
                    });

                    me.calculateBounds(latLngList);
                }).error(function (jqxhr, testStatus, reason) {
                    $("#resultsText").text(reason);
                })
        };

        me.clearAll = function () {
            me.clearCurrentShapes();
        };

        me.clearCurrentShapes = function () {
            angular.forEach(me.shapes, function (shape, idx) {
                shape.setMap(null);
            });

            angular.forEach(me.scoreShapes, function (shape, idx) {
                shape.setMap(null);
            });

            me.shapes = [];
            me.scoreShapes = [];
        };

        me.addShapeClickListener = function(shape) {
            google.maps.event.addListener(shape, 'click', function() {
                ngDialog.openConfirm({
                    template: '/views/app/shapeDetails',
                    controller: ['$scope', function ($scope) {
                        $scope.dateRanges= !shape.geqeData.dates?[]:shape.geqeData.dates;
                        $scope.minDt = new Date(1996, 1, 1);
                        $scope.maxDt = new Date(2999,12,31);
                        $scope.name = shape.geqeData.name;

                        $scope.cancel = function(){
                            $scope.closeThisDialog(null);
                        };

                        $scope.addDateRange = function(){

                            if($scope.minDt > $scope.maxDt){
                                $rootScope.showErrorMessage("Date range", "Minimum date cannot be after maximum date.");
                                return;
                            }

                            var range = {
                                'min':$scope.minDt.toJSON().substring(0, 10),
                                'max':$scope.maxDt.toJSON().substring(0, 10)
                            };

                            $scope.dateRanges.push(range);
                        };

                        $scope.save = function(){

                            shape.geqeData.dates = $scope.dateRanges;
                            shape.geqeData.name = $scope.name;
                            $scope.closeThisDialog(null);
                        };

                        $scope.delete = function(){
                            $rootScope.$emit("deleteShape", shape);
                            $scope.closeThisDialog(null);
                        };
                    }]
                });
            });

        };

        me.drawScoreShapes = function (data) {
            var clusters = data;

            var locations = [];
            clusters.forEach(function (cluster) {
                var pts = cluster.boundingPoly;

                var latlonList = [];
                angular.forEach(pts, function (pt) {
                    var location = new google.maps.LatLng(pt.lat, pt.lng);
                    latlonList.push(location);
                    locations.push(location)
                });

                var polygon = new google.maps.Polygon({
                    paths: latlonList
                });

                if ($rootScope.theme && $rootScope.theme.shapeStyles)
                    polygon.setOptions($rootScope.theme.shapeStyles);

                polygon.setMap(me.map);
                me.scoreShapes.push(polygon);
            });
            me.calculateBounds(locations);
            $rootScope.$emit("drawMapMarkers",clusters,'cluster');

        };
    }]);
