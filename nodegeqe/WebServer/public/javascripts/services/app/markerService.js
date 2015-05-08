
angular.module('NodeWebBase')
    .service('markerService', ['$rootScope',function ($rootScope) {
        var me = this;
        me.map = null;
        me.drawingManager = null;
        me.markers = {};

        me.init = function(map){
            me.map = map;

            $rootScope.$on('clearMarkers', function (event,types) {
                me.clearMarkers(types);
            });

            $rootScope.$on('clearAll', function () {
                me.clearAll();
            });

            $rootScope.$on('fitMapToContents', function () {
                var locations = [];
                angular.forEach(me.markers['training'],function(marker){
                    locations.push(marker.getPosition());
                });
                angular.forEach(me.markers['score'],function(marker){
                    locations.push(marker.getPosition());
                });

                me.calculateBounds(locations);

            });

            $rootScope.$on('drawMapMarkers', function (event, data, binSize, markerType) {
                switch (markerType) {
                    case "cluster":
                        me.drawClusterMarkers(data);
                        break;
                    case "score":
                        me.drawScoreMarkers(data, binSize);
                        break;
                    case "training":
                        me.drawTrainingMarkers(data);
                        break;
                }
            });
        };

        me.calculateBounds = function(locations){
            var bounds = new google.maps.LatLngBounds();
            angular.forEach(locations,function(location){
                bounds.extend(location);
            });
            me.map.fitBounds(bounds);
        };

        me.clearAll = function(){
            me.clearMarkers(['training','score']);
        };

        me.clearMarkers = function(types){
            angular.forEach(types,function(type){
                var markers = me.markers[type];
                angular.forEach(markers,function(marker){
                    marker.setMap(null);
                });
            });

            angular.forEach(types,function(type){
                me.markers[type] = [];
            });
        };

        me.rgbToHex =function(r,g,b){
            return "#" + me.toHex(r) + me.toHex(g) + me.toHex(b)
        };

        me.toHex =function(n) {
            n = parseInt(n,10);
            if (isNaN(n)) return "00";
            n = Math.max(0,Math.min(n,255));
            return "0123456789ABCDEF".charAt((n-n%16)/16)
                + "0123456789ABCDEF".charAt(n%16);
        };

        me.interpolateComponent = function(c1,c2,percent){
            var componentDiff = Math.abs(c1 - c2);
            var delta = componentDiff * percent;

            if(c1 < c2)
                return c2 - delta;
            return c2 + delta;
        };

        me.interpolateColor = function(min,max,val)
        {
            if(val < min)
                return me.rgbToHex(0,0,0);
            if(val > max)
                return me.rgbToHex(255,255,255);
            var percent = Math.abs(val - min) / Math.abs(max - min);
            var minColorRGB = [220,210,210];
            var maxColorRGB = [255,98,0];

            return me.rgbToHex(me.interpolateComponent(minColorRGB[0],maxColorRGB[0],percent),
                me.interpolateComponent(minColorRGB[1],maxColorRGB[1],percent),
                me.interpolateComponent(minColorRGB[2],maxColorRGB[2],percent)
            )
        };

        me.getIcon = function (color) {
            return {
                path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#000',
                strokeWeight: 2,
                scale: 1
            };
        };

        me.putTrainingMarker = function(location,caption,item){
            if(!me.markers['training'])
                me.markers['training'] = [];
            var marker = new google.maps.Marker({
                position: location,
                map: me.map,
                icon: me.getIcon("#3C85E6"),
                title:caption
            });

            me.markers['training'].push(marker);

            google.maps.event.addListener(marker, 'dblclick', function() {
                me.selectMarker(marker,me.getIcon("#3C85E6"));
                $rootScope.$emit("loadItemData",item);

                var locations = [];

                angular.forEach(item.pointList, function(point){
                    var lat = point[0];
                    var lon = point[1];

                    var markerLocation = new google.maps.LatLng(lat, lon);
                    locations.push(markerLocation);
                });

                me.calculateBounds(locations);
            });

            google.maps.event.addListener(marker, 'click', function() {
                me.selectMarker(marker,me.getIcon("#3C85E6"));
                $rootScope.$emit("loadItemData",item);
            });
        };

        me.selectMarker=function(marker,icon){
            if(me.selectedMarker){
                me.selectedMarker.setIcon(icon);
            }
            marker.setIcon(me.getIcon("#00FF00"));
            me.selectedMarker = marker;
        };

        me.putScoreMarker = function(location, caption, item, numMarkers, markerIndex) {

            if(!me.markers['score'])
                me.markers['score'] = [];
            var marker = new google.maps.Marker({
                position: location,
                map: me.map,
                icon: me.getIcon(me.interpolateColor(0,numMarkers,markerIndex)),
                title:caption,
                markerIndex:markerIndex
            });

            me.markers['score'].push(marker);

            google.maps.event.addListener(marker, 'click', function() {
                me.selectMarker(marker,me.getIcon(me.interpolateColor(0,numMarkers,me.selectedMarker.markerIndex)));
                $rootScope.$emit("loadItemData",item);
            });
        };

        me.drawTrainingMarkers = function(data){
            var locations = [];

            angular.forEach(data, function(item){
                var capPScor = item['cap'];

                var lat = parseFloat(item['lat']);
                var lon = parseFloat(item['lon']);

                var markerLocation = new google.maps.LatLng(lat, lon);
                locations.push(markerLocation);
                me.putTrainingMarker(markerLocation, capPScor, item);

            });

            me.calculateBounds(locations);
        };

        me.drawClusterMarkers = function(data){
            var locations = [];

            angular.forEach(data, function(item){

                var capPScor = '  Total: ' + item['nTotal'] + '\n' +
                    '--------------------------------------------------------------' + '\n';
                angular.forEach(item['posts'], function(post,idx){
                    capPScor+= post['cap'] + '\n' +
                    '-------------------------------------' + '\n';
                });

                var lat = parseFloat(item.posts[0]['lat']);
                var lon = parseFloat(item.posts[0]['lon']);

                var markerLocation = new google.maps.LatLng(lat, lon);
                locations.push(markerLocation);
                me.putTrainingMarker(markerLocation, capPScor, item);

            });

            me.calculateBounds(locations);
        };

        me.drawScoreMarkers = function(data, binSize){
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

                var shiftLat = parseFloat(strLat);
                var shiftLon = parseFloat(strLon);

                var markerLocation = new google.maps.LatLng(shiftLat, shiftLon);
                locations.push(markerLocation);
                me.putScoreMarker(markerLocation, capPScor, item, data.length,item['index']);

            });

            me.calculateBounds(locations);
        };
    }]);
