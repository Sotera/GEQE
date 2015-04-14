angular.module('NodeWebBase')
   .controller('mapController', function ($scope, $rootScope) {
        $scope.data = {};
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

        $rootScope.$on('putScoreMarker', function (event, data) {
            var markerLocation = new google.maps.LatLng(data.lat, data.lon);
            $scope.putScoreMarker(markerLocation, data.caption);
        });

        $rootScope.$on('clearCurrentMarkers', function (event) {
            $scope.clearCurrentMarkers();
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

        $scope.getShapesText = function()
        {
            var shapesText = "";
            $.each($scope.shapes, function(index, shape){
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

            $.each(vertices,function(idx,vert){
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

            $.each(vertices,function(idx,vert){
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

                    $.each(vertStrings, function(idx,vertString){
                        if(vertString === "")
                            return;
                        var vertData = vertString.split(",");
                        var polyIndex = parseInt(vertData[0]);
                        if(latLngs.length <= polyIndex){
                            latLngs[polyIndex] = [];
                        }
                        latLngs[polyIndex].push(new google.maps.LatLng(vertData[1],vertData[2]));
                    });

                    $.each(latLngs, function(idx,points){
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
                },
                error: function(jqxhr, testStatus, reason) {
                    $("#resultsText").text(reason);
                }
            });

        };
        $scope.clearCurrentMarkers = function(){
            $.each($scope.markers,function(idx,marker){
                marker.setMap(null);
                $scope.markers[idx] = null;
            });

            $scope.markers = [];
        };

        $scope.putScoreMarker = function(location, caption) {
            var marker = new google.maps.Marker({
                position: location,
                title:caption
            });
            marker.setMap($scope.map);
            $scope.markers.push(marker);
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
    });
