
angular.module('NodeWebBase')
    .service('shapeService', ['$rootScope', '$http','ngDialog','themeChangedMsg','toggleEditMsg',function ($rootScope, $http, ngDialog,themeChangedMsg,toggleEditMsg) {
        var me = this;
        me.shapes = {
            "score":[],
            "polyset":[],
            "dataset":[]
        };
        me.map = null;
        me.drawingManager = null;
        me.editing = false;

        me.init = function(map, drawingManager){
            me.map = map;
            me.drawingManager = drawingManager;
            google.maps.event.addListener(me.drawingManager, 'polygoncomplete', me.handleShape);
            google.maps.event.addListener(me.drawingManager, 'rectanglecomplete', me.handleShape);

            $rootScope.$on('drawPolygonFile', function (event, data) {
                me.clearCurrentShapes(["polyset"]);
                me.drawPolygonFile(data);
            });

            toggleEditMsg.listen( function (event, data){
                    console.log("shapeService " , data);
                    me.toggleEditing(data);
            });

            $rootScope.$on('clearCurrentShapes', function (event,shapeTypes) {
                me.clearCurrentShapes(shapeTypes);
            });

            $rootScope.$on('clearAll', function () {
                me.clearAll();
            });

            $rootScope.$on('deleteShape', function (event, shape, shapeType) {
                shape.setMap(null);
                var index = me.shapes[shapeType].indexOf(shape);
                if (index > -1) {
                    me.shapes[shapeType].splice(index, 1);
                }
            });

            $rootScope.$on('renderKmlFile', function (event, file) {
                me.renderKmlFile(file);
            });

            $rootScope.$on('drawShapes', function (event, data, shapeType) {
                me.clearCurrentShapes([shapeType]);

                switch (shapeType) {
                    case "score":
                        me.drawScoreShapes(data);
                        break;
                    case "dataset":
                        me.drawDataSetShapes(data);
                        break;
                }
            });

            themeChangedMsg.listen( function () {
                if ($rootScope.theme.shapeStyles) {
                    drawingManager.setOptions({
                        polygonOptions: $rootScope.theme.shapeStyles,
                        rectangleOptions: $rootScope.theme.shapeStyles
                    });

                    var shapeTypes = ["score","polyset"];
                    angular.forEach(shapeTypes, function (shapeType) {
                        angular.forEach(me.shapes[shapeType], function (shape) {
                            shape.setOptions($rootScope.theme.shapeStyles);
                        });
                    });

                }
            });

            $rootScope.$on('selectDatasetShape', function (event, dataset) {
                angular.forEach(me.shapes['dataset'], function (shape) {
                    if(shape.name === dataset.name){
                        shape.setOptions({strokeColor:'green',strokeWeight: 3});
                        return;
                    }
                    shape.setOptions({strokeColor:'lightblue',strokeWeight: 2});
                });
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
            me.shapes["polyset"].push(shape);
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
            angular.forEach(me.shapes["polyset"], function (shape) {
                sites.sites.push(me.getSiteFromShape(shape));
            });
            var retval = angular.toJson(sites);
            return retval;
        };

        me.getSiteFromShape = function (shape) {
            if (shape.getBounds != null)
                return me.getSiteFromRectangle(shape);
            return me.getSiteFromPolygon(shape);
        };

        me.getSiteFromPolygon = function (shape) {
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

        me.getSiteFromRectangle = function (shape) {
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

        me.toggleEditing = function (val) {
            console.log("Trying to make editable", val);
            me.editing = val;
            angular.forEach(me.shapes, function (shape, idx) {
                shape.editable=val;
                shape.editable_changed();
            });

            angular.forEach(me.scoreShapes, function (shape, idx) {
                shape.editable=val;
                shape.editable_changed();
            });
        }

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
                            editable: false
                        });

                        if ($rootScope.theme && $rootScope.theme.shapeStyles)
                            polygon.setOptions($rootScope.theme.shapeStyles);

                        me.shapes["polyset"].push(polygon);
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
            me.clearCurrentShapes(["score","polyset"]);
        };

        me.clearCurrentShapes = function (shapeTypes) {
            angular.forEach(shapeTypes, function(shapeType){
                angular.forEach(me.shapes[shapeType], function (shape) {
                    shape.setMap(null);
                });
                me.shapes[shapeType].length=0;
            });

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
                        $scope.editing = me.editing;
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

                        $scope.sample = function(){

                            shape.geqeData.dates = $scope.dateRanges;
                            shape.geqeData.name = $scope.name;
                            $rootScope.$emit("sampleShape",me.getSiteFromShape(shape));
                            $scope.closeThisDialog(null);
                        };

                        $scope.delete = function(){
                            $rootScope.$emit("deleteShape", shape, "polyset");
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
                me.shapes['score'].push(polygon);
            });
            me.calculateBounds(locations);
            $rootScope.$emit("drawMapMarkers",clusters,'cluster');

        };

        me.drawDataSetShapes = function (data) {
            var locations = [];

            data.forEach(function (dataset) {
                var pts = dataset.boundingPoly;

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

                polygon.setOptions({
                    "strokeColor":"lightblue",
                    "fillOpacity": 0,
                    "clickable":false
                });

                polygon.setMap(me.map);
                polygon.name = dataset.name;
                me.shapes['dataset'].push(polygon);
            });

            me.calculateBounds(locations);

        };

    }]);
