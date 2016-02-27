// function saveList() {
//     var pPath = $("#pSavePath").val();
//     var pName = $("#pFileName").val();
//     var fString = getShapesText();
// 
//     $.ajax({
//         url: "./writePoly",
//         data: {
//             filePath: pPath,
//             filePolygon: pName,
//             fileString: fString
//         },
//         dataType: "text",
//         success: function (response) {
//             $("#resultsText").text(pName + " written");
//         },
//         error: function (jqxhr, testStatus, reason) {
//             $("#resultsText").text(reason);
//         }
//     });
// }
// 
// function getShapesText()
// {
//     var shapesText = "";
//     $.each(shapes, function(index, shape){
//         shapesText += getTextFromShape(index,shape);
//     });
//     return shapesText;
// }
// 
// function getTextFromShape(index, shape){
//     if(shape.getBounds != null)
//         return getTextFromRectangle(index, shape);
//     return getTextFromPolygon(index, shape);
// }
// 
// function getTextFromPolygon(index, shape) {
//     var vertices = shape.getPath().getArray();
//     var text = "";
// 
//     $.each(vertices,function(idx,vert){
//         var lat = vert["k"];
//         var lng = vert["D"];
//         text += index + ","+lat+","+lng+"\n";
//     });
// 
//     return text;
// }
// 
// function getTextFromRectangle(index, shape) {
//     var vertices =[];
//     var bounds = shape.getBounds();
//     var NE = bounds.getNorthEast();
//     var SW = bounds.getSouthWest();
// 
//     vertices.push(new google.maps.LatLng(NE.lat(),SW.lng()));
//     vertices.push(NE);
//     vertices.push(new google.maps.LatLng(SW.lat(),NE.lng()));
//     vertices.push(SW);
// 
//     var text = "";
// 
//     $.each(vertices,function(idx,vert){
//         var lat = vert["k"];
//         var lng = vert["D"];
//         text += index + ","+lat+","+lng+"\n";
//     });
// 
//     return text;
// }
// 
// function drawPolygonFile(){
//     var pPath = $("#pSavePath").val();
//     $.ajax({
//         url: "./getFileContents",
//         data : {
//             filePath: pPath,
//             fileName: $("#polygonSelect").val(),
//             subDir:fileSubDir
//         },
//         dataType: "json",
//         success: function (response) {
//             var vertStrings = response.fileData;
//             var latLngs = [];
// 
//             $.each(vertStrings, function(idx,vertString){
//                 if(vertString === "")
//                     return;
//                 var vertData = vertString.split(",");
//                 var polyIndex = parseInt(vertData[0]);
//                 if(latLngs.length <= polyIndex){
//                     latLngs[polyIndex] = [];
//                 }
//                 latLngs[polyIndex].push(new google.maps.LatLng(vertData[1],vertData[2]));
//             });
// 
//             $.each(latLngs, function(idx,points){
//                 if(points===null || points === undefined)
//                     return;
//                 var polygon = new google.maps.Polygon({
//                     paths: points,
//                     strokeColor: 'black',
//                     strokeOpacity: 0.8,
//                     strokeWeight: 2,
//                     fillColor: 'black',
//                     fillOpacity: 0.35,
//                     editable:true
//                 });
// 
//                 shapes.push(polygon);
// 
//                 polygon.setMap(map);
//             });
//             },
//             error: function(jqxhr, testStatus, reason) {
//                 $("#resultsText").text(reason);
//             }
//     });
// 
// }
// 
// function lauchTest() {
// 
//     var pPath = $("#pSavePath").val();
//     var pName = $("#pFileName").val();
//     var tName = $("#tFileName").val();
//     var dSet = $("#dataSetSelect").val();
//     $.ajax({
//         url: "./launchTest",
//         data: {
//             filePath: pPath,
//             filePolygon: pName,
//             fileTestOut: tName,
//             dataSet: dSet
//         },
//         dataType: "text",
//         success: function (response) {
//             $("#resultsText").text("Test Launched");
//         },
//         error: function (jqxhr, testStatus, reason) {
//             $("#resultsText").text(reason);
//         }
//     });
// }
// 
// 
// function gatherScores() {
//     var pPath = $("#pSavePath").val();
//     var sName = $("#scoreSelect").val();
//     var sMaxP = $("#sMaxEntries").val();
//     var bAgg = $("#aggScores").is(":checked");
//     var bTim = $("#aggTime").is(":checked");
//     var fBin = $("#sBinSize").val();
//     var bCUU = $("#uniqueUser").is(":checked");
//     $.ajax({
//         url: "./getScores",
//         data: {
//             filePath: pPath,
//             fileAppOut: sName,
//             maxOut: sMaxP,
//             bBinByLatLon: bAgg,
//             bBinByDate: bTim,
//             fBinSize: fBin,
//             bCountUniqueUser: bCUU
//         },
//         dataType: "json",
//         success: function (response) {
//             //clean old point array, needed to removed points from map if you decrease number of entries
//             debugger;
//             for( ind=0; ind<pointArray.length; ind++)
//             {
//                 pointArray[ind].setMap(null);
//                 pointArray[ind] = null;
//             }
//             pointArray = [];
// 
//             //create new points
//             var nTot = response.total;
//             for( i=0; i<nTot; i++)
//             {
//                 var capPScor = response.sco[i]['index'].toString();
//                 var strLat = response.sco[i]['lat'];
//                 var strLon = response.sco[i]['lon']
//                 var shiftLat = parseFloat(strLat)+fBin/2;
//                 if(parseFloat(strLat) < 0.0)
//                 {
//                 	shiftLat = parseFloat(strLat)-fBin/2;
//                 }
//                 var shiftLon = parseFloat(strLon)+fBin/2;
//                 if(parseFloat(strLon) < 0.0)
//                 {
//                 	shiftLon = parseFloat(strLon)-fBin/2;
//                 }
//                 var tweetLatlng = new google.maps.LatLng(shiftLat, shiftLon);
//                 m = putScoreMarker(tweetLatlng, capPScor);
//                 pointArray[i] = m;
//             }
// 
//				//write dictionary to results box
// 				var strRet = '';
// 				if( typeof(response.dic)=="string")
// 				{
// 					strRet = response.dic;
// 				} else {
// 					if( response.dic[0][2] != undefined)
// 					{
// 						strRet = '<table class=table table-striped"><tr><th>Term</th><th>Score</th><th>In Count</th><th>Out Count</th></tr>';
// 						for( i=0; i<response.dic.length; i++)
// 						{
// 							strRet = strRet + '<tr><td>' + response.dic[i][0] + '</td><td>' + response.dic[i][3] + '</td><td>' + response.dic[i][1] + '</td><td>' + response.dic[i][2] + '</td></tr>';
// 						}
// 					} else {
// 						strRet = '<table class="table table-condensed"><tr><th>Term</th><th>Rank</th></tr>';
// 						for( i=0; i<response.dic.length; i++)
// 						{
// 							strRet = strRet + '<tr><td>' + response.dic[i][0] + '</td><td>' + response.dic[i][1] + '</td></tr>';
// 						}
// 					}
// 					strRet = strRet + "</table>";
// 				}
// 				$("#resultsText").html(strRet);
//         },
//         error: function (jqxhr, testStatus, reason) {
//             $("#resultsText").text(reason);
//         }
//     });
// }

function getDates() {
	$("#waitgif").show()
	var pPath = $("#pSavePath").val();
    $.ajax({
        url: "./getDates",
        dataType: "json",
        success: function (response) {
			$("#waitgif").hide()
            var lDates = response.dates;
            var nDates = response.nDates;
            var strRet = '';
            var elmSel = document.getElementById("dateSelect");
            elmSel.options.length=1;
            for(i=0; i<nDates; i++)
            {
                elmSel.options[i+1] = new Option(lDates[i], lDates[i], false, false);
            }
        },
        error: function(jqxhr, testStatus, reason) {
			$("#waitgif").hide()
            $("#resultsText").text(reason);
        }
    });
}

function loadDateData() {
	$("#waitgif").show()
	var dtSel = $("#dateSelect").val();
	var bin_size = 0.005;
    $.ajax({
        url: "./loadData",
        dataType: "json",
        data: {
        	date: dtSel,
        	bin_size: bin_size
        },
        success: function (response) {
			$("#waitgif").hide()
            for( ind=0; ind<pointArray.length; ind++)
        	{
                pointArray[ind].setMap(null);
        		pointArray[ind] = null;
            }
            pointArray = [];
            geqeKeysArray = [];
            tweetInfoArray = []
            var lCoords = response.coords;
            var nCoords = response.n_coords;
            var lTweets = response.tweets;
            var lg_keys = response.g_keys;
            for(i=0; i<nCoords; i++)
            {
            	var lat = parseFloat(lCoords[i][0]);
            	var lon = parseFloat(lCoords[i][1]);
            	var shift_lat = lat + bin_size/2;
            	if(lat < 0.)
            	{
            		shift_lat = lat - bin_size/2;
            	}
            	var shift_lon = lon + bin_size/2;
            	if(lon < 0.)
            	{
            		shift_lon = lon - bin_size/2;
            	}
            	var m = putScoreMarker(shift_lat, shift_lon, i);
            	pointArray[i] = m;
            	tweetInfoArray[i] = lTweets[i];
            	geqeKeysArray[i] = lg_keys[i];
            }
        },
        error: function(jqxhr, testStatus, reason) {
			$("#waitgif").hide();
            $("#resultsText").text(reason);
        },
        timeout:60*60*1000
    });
}

function putScoreMarker(shift_lat, shift_lon, ind) {
	var tweetLatlng = new google.maps.LatLng(shift_lat, shift_lon);
	var title = shift_lat.toString() + "_" + shift_lon.toString();
    var marker = new google.maps.Marker({
    	map: map,
        position: tweetLatlng,
        title:title
    });
    marker.addListener('click', function(){getPointData(ind)});
    return marker;
}

function getPointData(ind) {
	marker = pointArray[ind];
	tweets = tweetInfoArray[ind];
	g_keys = geqeKeysArray[ind];
	checked = []
	tab = "<table><tr><h3>"+marker.title+"</h3></tr></br>";
	for (var key in tweets){
		if (!tweets.hasOwnProperty(key)){
			continue;
		}
		is_added = false;
 		for(var gind=0; gind<geqe.length; gind++)
 		{
 			if( geqe[gind]==g_keys[key]){
 				is_added = true;
 				break;
 			}
 		}
 		if(is_added==false){
			tab = tab + "<tr><b style=\"margin-right:10px;\">Hour: " + key + "</b><input id=\"tweet_check_" + key + "\" type=\"checkbox\" onclick=\"addToSet(" + key + ", " + ind + ")\"><b style=\"color:green\" id=\"tweet_hour_" + key + "\"></b></tr></br>";
		} else {
			tab = tab + "<tr><b style=\"margin-right:10px;\">Hour: " + key + "</b><input id=\"tweet_check_" + key + "\" type=\"checkbox\" onclick=\"addToSet(" + key + ", " + ind + ")\"><b style=\"color:green\" id=\"tweet_hour_" + key + "\">ADDED!</b></tr></br>";
			checked.push(key);
		}
		theHour = tweets[key];
		nTweets = theHour.length;
		for(var i=0; i<nTweets; i++)
		{
			tab = tab + "<tr>" + theHour[i] + "</tr></br></br>";
		}
	}
	tab = tab + "</table>"
	$("#resultsText").html(tab);
	for(var i=0; i<checked.length; i++){
		$("#tweet_check_"+checked[i]).prop("checked", true);
	}
}

function addToSet(key, ind){
	g_key = geqeKeysArray[ind][key]
	if($("#tweet_check_" + key)[0].checked==true){
		$("#tweet_hour_"+key).text("ADDED!");
		geqe.push(g_key);
	} else {
		$("#tweet_hour_"+key).contents().remove();
		var gk_rm_ind = -1;
		for(var gi=0; gi<geqe.length; gi++)
		{
			if(geqe[gi]==g_key){
				gk_rm_ind = gi;
				break;
			}
		}
		if(gk_rm_ind != -1){
			geqe.splice(gk_rm_ind, 1);
		}
	}
}

function trainModel(){

}