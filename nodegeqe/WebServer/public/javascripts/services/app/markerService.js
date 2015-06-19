
angular.module('NodeWebBase')
    .service('markerService', ['$rootScope','applyFilterMsg',function ($rootScope,applyFilterMsg) {
        var me = this;
        me.map = null;
        me.drawingManager = null;
        me.markers = {};
        me.filterText = '';

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

            $rootScope.$on('drawMapMarkers', function (event, data, markerType) {
                switch (markerType) {
                    case "cluster":
                        me.drawClusterMarkers(data);
                        break;
                    case "score":
                        me.drawScoreMarkers(data);
                        break;
                    case "training":
                        me.drawTypeMarkers(data,markerType,true);
                        break;
                }
            });

            applyFilterMsg.listen(me.applyFilter)

        };

        me.applyFilter = function(filterText){
            me.filterText = filterText;
            angular.forEach(me.markers['item'],function(item){
                if(filterText != '') {
                    var cap = item.markerItem.cap.toLowerCase();
                    if (cap.indexOf(filterText.toLowerCase()) < 0) {
                        item.setMap(null);
                        return;
                    }
                }
                item.setMap(me.map);
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
            me.clearMarkers(['training','score','item']);
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
                return c1 + delta;
            return c1 - delta;
        };

        me.interpolateColor = function(min,max,val,minColorRGB,maxColorRGB)
        {
            if(val < min)
                return me.rgbToHex(0,0,0);
            if(val > max)
                return me.rgbToHex(255,255,255);
            var percent = val/max-min;

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

        me.putTypeMarker = function(location,caption,item,type,index,maxIndex){
            if(!me.markers[type])
                me.markers[type] = [];

            var minColorRGB = [176,196,222];
            var maxColorRGB = [65,105,225];

            var icon = me.getIcon(me.interpolateColor(0,maxIndex,index,minColorRGB,maxColorRGB));
            var marker = new google.maps.Marker({
                position: location,
                map: me.map,
                icon: icon,
                title:caption,
                markerItem:item,
                originalIcon : icon
            });

            me.markers[type].push(marker);

            google.maps.event.addListener(marker, 'click', function() {
                me.selectMarker(marker,me.getIcon(me.interpolateColor(0,maxIndex,index,minColorRGB,maxColorRGB)));
                $rootScope.$emit("loadItemData",item);
            });
        };

        me.selectMarker=function(marker){
            if(me.selectedMarker){

                me.selectedMarker.setIcon(me.selectedMarker.originalIcon);
            }
            marker.setIcon(me.getIcon("#00FF00"));
            me.selectedMarker = marker;
        };

        me.putScoreMarker = function(location, caption, item, minScore, maxScore, score) {

            if(!me.markers['score'])
                me.markers['score'] = [];

            var minColorRGB = [220,210,210];
            var maxColorRGB = [255,98,0];

            var icon = me.getIcon(me.interpolateColor(0,maxScore,score,minColorRGB,maxColorRGB));
            var marker = new google.maps.Marker({
                position: location,
                map: me.map,
                icon: icon,
                title:caption,
                markerItem:item,
                originalIcon:icon
            });

            me.markers['score'].push(marker);

            google.maps.event.addListener(marker, 'dblclick', function() {
                me.selectMarker(marker);

                if(!marker.markerItem.nTotal || marker.markerItem.nTotal <= 0)
                    return;
                me.clearMarkers(['item']);
                me.drawTypeMarkers(marker.markerItem.posts,'item',false);
            });

            google.maps.event.addListener(marker, 'click', function() {
                me.selectMarker(marker);
                $rootScope.$emit("loadItemData",marker.markerItem);
            });
        };

        me.drawTypeMarkers = function(data,type,zoomTo){
            var locations = [];

            var sortedData = data.sort(function(a,b){
                var aDate = new Date(a.datetime);
                var bDate = new Date(b.datetime);
                return aDate>bDate?1:-1;
            });

            angular.forEach(sortedData, function(item,idx){
                var capPScor = item['cap'];

                var lat = parseFloat(item['lat']);
                var lon = parseFloat(item['lon']);

                var markerLocation = new google.maps.LatLng(lat, lon);
                locations.push(markerLocation);
                me.putTypeMarker(markerLocation, capPScor, item,type,idx,data.length);

            });

            if(zoomTo)
                me.calculateBounds(locations);
        };

        me.drawClusterMarkers = function(data){
            var locations = [];
            var minScore = 1;
            var maxScore = 0;
            var center_lat, center_lon;

            angular.forEach(data, function(item) {
                if(item['score'] > maxScore)
                    maxScore = item['score'];
                if(item['score'] < minScore)
                    minScore = item['score'];
            });

            angular.forEach(data, function(item){
                center_lat = 0.0;
                center_lon = 0.0;

                var capPScor = '  Total: ' + item['nTotal'] + '\n'  +
                    '  |  Score: ' + item['score'] +
                    '--------------------------------------------------------------' + '\n';
                angular.forEach(item['posts'], function(post,idx){
                    capPScor+= post['cap'] + '\n' +
                    '-------------------------------------' + '\n';
                });


                angular.forEach(item['poly'], function(poly,idx){
                    center_lat+=poly[0];
                    center_lon+=poly[1];
                });

                var markerLocation = new google.maps.LatLng(center_lat / item.poly.length,  center_lon / item.poly.length);
                locations.push(markerLocation);
                me.putScoreMarker(markerLocation, capPScor, item, minScore,maxScore,item['score']);

            });
        };

        me.drawScoreMarkers = function(data){
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

                var strLat = parseFloat(item['lat']);
                var strLon = parseFloat(item['lon']);

                var markerLocation = new google.maps.LatLng(strLat, strLon);
                locations.push(markerLocation);
                me.putScoreMarker(markerLocation, capPScor, item, data.length,item['index']);
            });

            me.calculateBounds(locations);
        };
    }]);
