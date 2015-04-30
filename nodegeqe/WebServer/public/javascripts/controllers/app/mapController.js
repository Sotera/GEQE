angular.module('NodeWebBase')
   .controller('mapController', ['$scope','$rootScope','ngDialog',function ($scope, $rootScope, ngDialog) {
        $scope.data = {};
        $scope.scopeName = 'mapController';
        var myLatlng = new google.maps.LatLng(41.495753190958816,-81.70090198516846);
        var mapOptions = {
            zoom: 10,
            center: myLatlng
        };

        $scope.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        $scope.shapes = [];
        $scope.markers = {};

        $rootScope.$on('drawPolygonFile', function (event, data) {
            $scope.clearCurrentShapes();
            $scope.drawPolygonFile(data);
        });

        $rootScope.$on('clearMarkers', function (event,types) {
            $scope.clearMarkers(types);
        });

        $rootScope.$on('clearCurrentShapes', function () {
            $scope.clearCurrentShapes();
        });

        $rootScope.$on('clearAll', function () {
            $scope.clearAll();
        });

        $rootScope.$on('deleteShape', function (event, shape) {
            shape.setMap(null);
            var index = $scope.shapes.indexOf(shape);
            if (index > -1) {
                $scope.shapes.splice(index, 1);
            }
        });

        $rootScope.$on('renderKmlFile', function(event, file){
            $scope.renderKmlFile(file);
        });

        $rootScope.$on('getShapesText', function(event, callbackInfo){
            var params = [];
            params.push($scope.getSitesJson());
            callbackInfo.callback.apply(callbackInfo.scope, params);
        });

        var drawingManager = new google.maps.drawing.DrawingManager({
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [
                    google.maps.drawing.OverlayType.POLYGON,
                    google.maps.drawing.OverlayType.RECTANGLE
                ]
            }
        });

        drawingManager.setMap($scope.map);
        var handleShape = function(shape) {
            shape.setEditable(true);
            $scope.shapes.push(shape);
            shape.geqeData = {
                "name":"site",
                "minDt":"1994-01-01",
                "maxDt":"3000-01-01"
            };

            $scope.addShapeClickListener(shape);
        };


        google.maps.event.addListener(drawingManager, 'polygoncomplete', handleShape);
        google.maps.event.addListener(drawingManager, 'rectanglecomplete', handleShape);

        $scope.kmlControl = function() {
            var controlDiv = document.createElement('div');
            controlDiv.index = 1;
            $scope.map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(controlDiv);

            // Set CSS for the control border
            var controlUI = document.createElement('div');
            controlUI.style.backgroundColor = '#fff';
            controlUI.style.border = '2px solid #fff';
            controlUI.style.borderRadius = '3px';
            controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
            controlUI.style.cursor = 'pointer';
            controlUI.style.marginBottom = '22px';
            controlUI.style.textAlign = 'center';
            controlUI.title = 'Click to load kml';
            controlDiv.appendChild(controlUI);

            // Set CSS for the control interior
            var controlText = document.createElement('div');
            controlText.style.color = 'rgb(25,25,25)';
            controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
            controlText.style.fontSize = '16px';
            controlText.style.lineHeight = '38px';
            controlText.style.paddingLeft = '5px';
            controlText.style.paddingRight = '5px';
            controlText.innerHTML = 'kml';
            controlUI.appendChild(controlText);

            // Setup the click event listeners: simply set the map to
            // Chicago
            google.maps.event.addDomListener(controlUI, 'click', function() {
                var fileSelector = $('<input type="file" />');

                fileSelector.change(function(evt){
                    $scope.renderKmlFile(evt.target.files[0]);
                });
                fileSelector.click();

            });

        };

        $scope.calculateBounds = function(locations){
            var bounds = new google.maps.LatLngBounds();
            angular.forEach(locations,function(location,idx){
                bounds.extend(location);
            });
            $scope.map.fitBounds(bounds);
        };

        $scope.getSitesJson = function(){
            var sites = {
                "sites":[]
            };
            angular.forEach($scope.shapes, function(shape, index){
                sites.sites.push($scope.getSiteFromShape(index,shape));
            });
            return JSON.stringify(sites);
        };

        $scope.getSiteFromShape = function(index, shape){
            if(shape.getBounds != null)
                return $scope.getSiteFromRectangle(index, shape);
            return $scope.getSiteFromPolygon(index, shape);
        };

        $scope.getSiteFromPolygon = function(index, shape) {
            var vertices = shape.getPath();
            var site = {
                "name":shape.geqeData.name,
                "lats":[],
                "lons":[],
                "minDt":shape.geqeData.minDt,
                "maxDt":shape.geqeData.maxDt
            };

            angular.forEach(vertices,function(vert){
                site.lats.push(vert.lat());
                site.lons.push(vert.lng());
            });

            return site;
        };

        $scope.getSiteFromRectangle = function(index, shape) {
            var vertices =[];
            var bounds = shape.getBounds();
            var NE = bounds.getNorthEast();
            var SW = bounds.getSouthWest();

            vertices.push(new google.maps.LatLng(NE.lat(),SW.lng()));
            vertices.push(NE);
            vertices.push(new google.maps.LatLng(SW.lat(),NE.lng()));
            vertices.push(SW);

            var site = {
                "name":shape.geqeData.name,
                "lats":[],
                "lons":[],
                "minDt":shape.geqeData.minDt,
                "maxDt":shape.geqeData.maxDt
            };

            angular.forEach(vertices,function(vert){
                site.lats.push(vert["k"]);
                site.lons.push(vert["D"]);
            });

            return site;
        };

        $scope.drawPolygonFile = function(fileName){
            $.ajax({
                url: "app/controlBox/getFileContents",
                data : {
                    filePath: $rootScope.savePath,
                    fileName: fileName,
                    subDir:$scope.fileSubDir
                },
                dataType: "json",
                success: function (response) {
                    var latLngs = [];
                    var latLngList = [];
                    try {
                        var sites = JSON.parse(response.fileData);
                    }
                    catch(err){
                        $rootScope.showErrorMessage("JSON Parsing", err);
                        return;
                    }
                    angular.forEach(sites.sites, function(site,idx){
                        latLngs[idx] = [];
                        for(var i = 0; i<site.lats.length; i++)
                        {
                            var latlng = new google.maps.LatLng(site.lats[i],site.lons[i]);
                            latLngs[idx].push(latlng);
                            latLngList.push(latlng);
                        }
                    });

                    angular.forEach(latLngs, function(points,idx){
                        if(points===null || points === undefined)
                            return;
                        var polygon = new google.maps.Polygon({
                            paths: points,
                            strokeColor: 'black',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: 'black',
                            fillOpacity: 0.35,
                            editable:true
                        });

                        $scope.shapes.push(polygon);
                        polygon.geqeData = {
                            "name":sites.sites[idx].name,
                            "minDt":sites.sites[idx].minDt,
                            "maxDt":sites.sites[idx].maxDt
                        };
                        $scope.addShapeClickListener(polygon);
                        polygon.setMap($scope.map);
                    });

                    $scope.calculateBounds(latLngList);
                },
                error: function(jqxhr, testStatus, reason) {
                    $("#resultsText").text(reason);
                }
            });

        };

        $scope.clearAll = function(){
            $scope.clearMarkers(['training','score']);
            $scope.clearCurrentShapes();
        };

        $scope.clearCurrentShapes = function(){
            angular.forEach($scope.shapes,function(shape,idx){
                shape.setMap(null);
            });

            $scope.shapes = [];
        };

        $scope.clearMarkers = function(types){
            angular.forEach(types,function(type){
                var markers = $scope.markers[type];
                angular.forEach(markers,function(marker){
                    marker.setMap(null);
                });
            });

            angular.forEach(types,function(type){
                $scope.markers[type] = [];
            });
        };

        $scope.rgbToHex =function(r,g,b){
            return "#" + $scope.toHex(r) + $scope.toHex(g) + $scope.toHex(b)
        };

        $scope.toHex =function(n) {
            n = parseInt(n,10);
            if (isNaN(n)) return "00";
            n = Math.max(0,Math.min(n,255));
            return "0123456789ABCDEF".charAt((n-n%16)/16)
                + "0123456789ABCDEF".charAt(n%16);
        };

        $scope.interpolateComponent = function(c1,c2,percent){
            var componentDiff = Math.abs(c1 - c2);
            var delta = componentDiff * percent;

            if(c1 < c2)
                return c2 - delta;
            return c2 + delta;
        };

        $scope.interpolateColor = function(min,max,val)
        {
            if(val < min)
                return $scope.rgbToHex(0,0,0);
            if(val > max)
                return $scope.rgbToHex(255,255,255);
            var percent = Math.abs(val - min) / Math.abs(max - min);
            var minColorRGB = [220,210,210];
            var maxColorRGB = [255,98,0];

            return $scope.rgbToHex($scope.interpolateComponent(minColorRGB[0],maxColorRGB[0],percent),
                $scope.interpolateComponent(minColorRGB[1],maxColorRGB[1],percent),
                $scope.interpolateComponent(minColorRGB[2],maxColorRGB[2],percent)
            )
        };

        $scope.getIcon = function (color) {
            return {
                path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#000',
                strokeWeight: 2,
                scale: 1
            };
        };

        $scope.putTrainingMarker = function(location,caption,item){
            if(!$scope.markers['training'])
                $scope.markers['training'] = [];
            var marker = new google.maps.Marker({
                position: location,
                map: $scope.map,
                icon: $scope.getIcon("#3C85E6"),
                title:caption
            });

            $scope.markers['training'].push(marker);
            google.maps.event.addListener(marker, 'click', function() {
                marker.setIcon($scope.getIcon("#00FF00"));
                if($scope.selectedMarker){
                    $scope.selectedMarker.setIcon($scope.getIcon("#3C85E6"));
                }
                $scope.selectedMarker = marker;
                $rootScope.$emit("loadItemData",item);
            });
        };

        $scope.putScoreMarker = function(location, caption, item, numMarkers, markerIndex) {

            if(!$scope.markers['score'])
                $scope.markers['score'] = [];
            var marker = new google.maps.Marker({
                position: location,
                map: $scope.map,
                icon: $scope.getIcon($scope.interpolateColor(0,numMarkers,markerIndex)),
                title:caption,
                markerIndex:markerIndex
            });

            $scope.markers['score'].push(marker);
            google.maps.event.addListener(marker, 'click', function() {
                marker.setIcon($scope.getIcon("#00FF00"));
                if($scope.selectedMarker){
                    $scope.selectedMarker.setIcon($scope.getIcon($scope.interpolateColor(0,numMarkers,$scope.selectedMarker.markerIndex)));
                }
                $scope.selectedMarker = marker;
                $rootScope.$emit("loadItemData",item);
            });
        };

        $scope.addShapeClickListener = function(shape) {
            google.maps.event.addListener(shape, 'click', function() {
                ngDialog.openConfirm({
                    template: '/views/app/shapeDetails',
                    controller: ['$scope', function ($scope) {
                        try{
                            $scope.minDt = new Date(shape.geqeData.minDt);
                            $scope.maxDt = new Date(shape.geqeData.maxDt);
                        }
                        catch(err){
                            console.log(err);
                            $rootScope.showErrorMessage("Site Date", "Invalid date format in site data. Creating new dates.");
                            $scope.minDt = new Date();
                            $scope.maxDt = new Date();
                        }
                        $scope.name = shape.geqeData.name;
                        $scope.cancel = function(){
                            $scope.closeThisDialog(null);
                        };

                        $scope.save = function(){
                            if($scope.minDt > $scope.maxDt){
                                $rootScope.showErrorMessage("Date range", "Minimum date cannot be after maximum date.");
                                return;
                            }
                            try {
                                shape.geqeData.minDt = $scope.minDt.toJSON().substring(0, 10);
                                shape.geqeData.maxDt = $scope.maxDt.toJSON().substring(0, 10);
                            }
                            catch(err){
                                console.log(err);
                                $rootScope.showErrorMessage("Invalid date", "Please enter a valid date.");
                                return;
                            }
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

        $rootScope.$on('drawMapMarkers', function (event, data, binSize, markerType) {
            switch (markerType) {
                case "score":
                    $scope.drawScopeMarkers(data, binSize);
                    break;
                case "training":
                    $scope.drawTrainingMarkers(data);
                    break;
            }
        });

        $scope.drawTrainingMarkers = function(data){
            var locations = [];

            angular.forEach(data, function(item){
                var capPScor = item['cap'];

                var lat = parseFloat(item['lat']);
                var lon = parseFloat(item['lon']);

                var markerLocation = new google.maps.LatLng(lat, lon);
                locations.push(markerLocation);
                $scope.putTrainingMarker(markerLocation, capPScor, item);

            });

            $scope.calculateBounds(locations);
        };

        $scope.drawScopeMarkers = function(data, binSize){
            var locations = [];

            angular.forEach(data, function(item){
                var capPScor = 'Rank: ' + item['index'].toString() +
                               '  |  Unique Users: ' + item['nUnique'] +
                               '  |  Total: ' + item['nTotal'] + '\n' +
                               '--------------------------------------------------------------' + '\n';
                angular.forEach(item['posts'], function(post,idx){
                    capPScor+= post['cap'] + '\n' +
                    '-------------------------------------' + '\n';
                });

                var strLat = item['lat'];
                var strLon = item['lon'];

                var shiftLat = parseFloat(strLat)+binSize/2;
                if(parseFloat(strLat) < 0.0){
                    shiftLat = parseFloat(strLat)-binSize/2;
                }

                var shiftLon = parseFloat(strLon)+binSize/2;
                if(parseFloat(strLon) < 0.0){
                    shiftLon = parseFloat(strLon)-binSize/2;
                }

                var markerLocation = new google.maps.LatLng(shiftLat, shiftLon);
                locations.push(markerLocation);
                $scope.putScoreMarker(markerLocation, capPScor, item, data.length,item['index']);

            });

            $scope.calculateBounds(locations);
        };

        $scope.renderKmlFile = function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var kml = e.target.result;

                var myParser = new geoXML3.parser({map: $scope.map});
                myParser.parseKmlString(kml);
            };
            reader.readAsText(file);
        };


        $scope.kmlControl();
    }]);
