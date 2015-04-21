angular.module('NodeWebBase')
   .controller('mapController', function ($scope, $rootScope) {
        $scope.data = {};
        $scope.scopeName = 'mapController';
        var myLatlng = new google.maps.LatLng(41.495753190958816,-81.70090198516846);
        var mapOptions = {
            zoom: 10,
            center: myLatlng
        };

        $scope.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        $scope.shapes = [];
        $scope.markers = [];

        $rootScope.$on('drawPolygonFile', function (event, data) {
            $scope.drawPolygonFile(data);
        });

        $rootScope.$on('clearCurrentMarkers', function () {
            $scope.clearCurrentMarkers();
        });

        $rootScope.$on('clearCurrentShapes', function () {
            $scope.clearCurrentShapes();
        });

        $rootScope.$on('clearAll', function () {
            $scope.clearAll();
        });

        $rootScope.$on('renderKmlFile', function(event, file){
            $scope.renderKmlFile(file);
        });

        $rootScope.$on('getShapesText', function(event, callbackInfo){
            var params = [];
            params.push($scope.getShapesText());
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

        $scope.getShapesText = function()
        {
            var shapesText = "";
            angular.forEach($scope.shapes, function(shape, index){
                shapesText += $scope.getTextFromShape(index,shape);
            });
            return shapesText;
        };

        $scope.getTextFromShape = function(index, shape){
            if(shape.getBounds != null)
                return $scope.getTextFromRectangle(index, shape);
            return $scope.getTextFromPolygon(index, shape);
        };

        $scope.getTextFromPolygon = function(index, shape) {
            var vertices = shape.getPath().getArray();
            var text = "";

            angular.forEach(vertices,function(vert,idx){
                var lat = vert["k"];
                var lng = vert["D"];
                text += index + ","+lat+","+lng+"\n";
            });

            return text;
        };

        $scope.getTextFromRectangle = function(index, shape) {
            var vertices =[];
            var bounds = shape.getBounds();
            var NE = bounds.getNorthEast();
            var SW = bounds.getSouthWest();

            vertices.push(new google.maps.LatLng(NE.lat(),SW.lng()));
            vertices.push(NE);
            vertices.push(new google.maps.LatLng(SW.lat(),NE.lng()));
            vertices.push(SW);

            var text = "";

            angular.forEach(vertices,function(vert,idx){
                var lat = vert["k"];
                var lng = vert["D"];
                text += index + ","+lat+","+lng+"\n";
            });

            return text;
        };

        $scope.drawPolygonFile = function(fileName){
            $.ajax({
                url: $rootScope.baseUrl + "app/controlBox/getFileContents",
                data : {
                    filePath: $rootScope.savePath,
                    fileName: fileName,
                    subDir:$scope.fileSubDir
                },
                dataType: "json",
                success: function (response) {
                    var vertStrings = response.fileData;
                    var latLngs = [];
                    var latLngList = [];

                    angular.forEach(vertStrings, function(vertString,idx){
                        if(vertString === "")
                            return;
                        var vertData = vertString.split(",");
                        var polyIndex = parseInt(vertData[0]);
                        if(latLngs.length <= polyIndex){
                            latLngs[polyIndex] = [];
                        }
                        var latlng = new google.maps.LatLng(vertData[1],vertData[2]);

                        latLngs[polyIndex].push(latlng);
                        latLngList.push(latlng);
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
            $scope.clearCurrentMarkers();
            $scope.clearCurrentShapes();
        };

        $scope.clearCurrentShapes = function(){
            angular.forEach($scope.shapes,function(shape,idx){
                shape.setMap(null);
                $scope.shapes[idx] = null;
            });

            $scope.shapes = [];
        };

        $scope.clearCurrentMarkers = function(){
            angular.forEach($scope.markers,function(marker,idx){
                marker.setMap(null);
                $scope.markers[idx] = null;
            });

            $scope.markers = [];
        };

        $scope.putScoreMarker = function(location, caption, item) {
            var marker = new google.maps.Marker({
                position: location,
                title:caption
            });
            marker.setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png');
            marker.setMap($scope.map);
            $scope.markers.push(marker);
            google.maps.event.addListener(marker, 'click', function() {
                marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
                if($scope.selectedMarker){
                    $scope.selectedMarker.setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png');
                }
                $scope.selectedMarker = marker;
                $rootScope.$emit("loadItemData",item);
            });
        };

        $rootScope.$on('putScoreMarkers', function (event, data, binSize) {
            var locations = [];
            angular.forEach(data, function(item){
                var capPScor = item['index'].toString();
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
                $scope.putScoreMarker(markerLocation, capPScor, item);

            });

            $scope.calculateBounds(locations);
        });

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
    });
