function saveList() {
    var pPath = $("#pSavePath").val();
    var pName = $("#pFileName").val();
    var fString = getShapesText();

    $.ajax({
        url: "./writePoly",
        data: {
            filePath: pPath,
            filePolygon: pName,
            fileString: fString
        },
        dataType: "text",
        success: function (response) {
            $("#resultsText").text(pName + " written");
        },
        error: function (jqxhr, testStatus, reason) {
            $("#resultsText").text(reason);
        }
    });
}

function getShapesText()
{
    var shapesText = "";
    $.each(shapes, function(index, shape){
        shapesText += getTextFromShape(index,shape);
    });
    return shapesText;
}

function getTextFromShape(index, shape){
    if(shape.getBounds != null)
        return getTextFromRectangle(index, shape);
    return getTextFromPolygon(index, shape);
}

function getTextFromPolygon(index, shape) {
    var vertices = shape.getPath().getArray();
    var text = "";

    $.each(vertices,function(idx,vert){
        var lat = vert["k"];
        var lng = vert["D"];
        text += index + ","+lat+","+lng+"\n";
    });

    return text;
}

function getTextFromRectangle(index, shape) {
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
}

function drawPolygonFile(){
    var pPath = $("#pSavePath").val();
    $.ajax({
        url: "./getFileContents",
        data : {
            filePath: pPath,
            fileName: $("#polygonSelect").val(),
            subDir:fileSubDir
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

                var polygon = new google.maps.Polygon({
                    paths: points,
                    strokeColor: 'black',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: 'black',
                    fillOpacity: 0.35,
                    editable:true
                });

                shapes.push(polygon);

                polygon.setMap(map);
            });
            },
            error: function(jqxhr, testStatus, reason) {
                $("#resultsText").text(reason);
            }
    });

}

function lauchTest() {

    var pPath = $("#pSavePath").val();
    var pName = $("#pFileName").val();
    var tName = $("#tFileName").val();
    var dSet = $("#dataSetSelect").val();
    $.ajax({
        url: "./launchTest",
        data: {
            filePath: pPath,
            filePolygon: pName,
            fileTestOut: tName,
            dataSet: dSet
        },
        dataType: "text",
        success: function (response) {
            $("#resultsText").text("Test Launched");
        },
        error: function (jqxhr, testStatus, reason) {
            $("#resultsText").text(reason);
        }
    });
}

function gatherTest() {
    var pPath = $("#pSavePath").val();
    var tName = $("#tFileName").val();
    $.ajax({
        url: "./getTest",
        data: {
            filePath: pPath,
            fileTestOut: tName
        },
        dataType: "json",
        success: function (response) {
            $("#inMean").val(response.m);
            $("#inVar").val(response.v);
            lRes = response.lPas;
            lNZ = response.lNZ
            var strRet = '';
            for( i=1; i<=lRes.length; i++)
            {
                if(lRes[i-1]!="-1")
                {
                    strRet = strRet + i + " has " + lRes[i-1] + "% passing a 3 sigma threshold ( from " + lNZ[i-1] + ").<br>";
                } else {
                    strRet = strRet + i + " has no non-zero scored tweets in region.<br>";
                }
            }
            $("#resultsText").html(strRet);
        },
        error: function (jqxhr, testStatus, reason) {
            $("#resultsText").text(reason);
        }
    });
}

function applyScores() {
    var pPath = $("#pSavePath").val();
    var pName = $("#pFileName").val();
    var sName = $("#sFileName").val();
    var dSet = $("#dataSetSelect").val();
    var bML  = $("#useML").is(":checked");
    var bBay = $("#useBayes").is(":checked");
    //change source based on Checkbox value
    var fThresh=$("#sTopN").val();
    var bPer = $("#bPercent").is(":checked");
    if(bPer==true){
        fThresh=$("#sTopPercent").val();
    }
    $.ajax({
        url: "./applyScores",
        data: {
            filePath: pPath,
            filePolygon: pName,
            fileAppOut: sName,
            fScoreThresh: fThresh,
            dataSet: dSet,
            useML: bML,
            useBayes: bBay

        },
        dataType: "text",
        success: function (response) {
            $("#resultsText").text("Job Launched");
        },
        error: function (jqxhr, testStatus, reason) {
            $("#resultsText").text(reason);
        }
    });
}

function gatherScores() {
    var pPath = $("#pSavePath").val();
    var sName = $("#scoreSelect").val();
    var sMaxP = $("#sMaxEntries").val();
    var bDict = $("#noDict").is(":checked");
    var bAgg = $("#aggScores").is(":checked");
    var bTim = $("#aggTime").is(":checked");
    var fBin = $("#sBinSize").val();
    $.ajax({
        url: "./getScores",
        data: {
            filePath: pPath,
            fileAppOut: sName,
            maxOut: sMaxP,
            bIgnorDict: bDict,
            bBinByLatLon: bAgg,
            bBinByDate: bTim,
            fBinSize: fBin
        },
        dataType: "json",
        success: function (response) {
            //clean old point array, needed to removed points from map if you decrease number of entries
            for( ind=0; ind<scoredTweetArray.length; ind++)
            {
                scoredTweetArray[ind].setMap(null);
                scoredTweetArray[ind] = null;
            }
            scoredTweetArray = [];

            //create new points
            var nTot = response.total;
            for( i=0; i<nTot; i++)
            {
                var capPScor = response.cap[i] + "  (" + response.sco[i] + ")";
                var tweetLatlng = new google.maps.LatLng(parseFloat(response.lat[i]), parseFloat(response.lon[i]));
                m = putScoreMarker(tweetLatlng, capPScor);
                scoredTweetArray[i] = m;
            }

            //write dictionary to results box
            if(bDict==false)
            {
                var strRet = '<b>Dictionary</b><table class="dictTab"><tr><th class="dictTab">Term</th><th class="dictTab">Score</th><th class="dictTab">In Count</th><th class="dictTab">Out Count</th></tr>';
                for( i=0; i<response.dic.length; i++)
                {
                    strRet = strRet + '<tr><td class="dictTab">' + response.dic[i][0] + '</td><td class="dictTab">' + response.dic[i][3] + '</td><td class="dictTab">' + response.dic[i][1] + '</td><td class="dictTab">' + response.dic[i][2] + '</td></tr>';
                }
                strRet = strRet + "</table>";
                $("#resultsText").html(strRet);
            } else {
                var strRet = '<b>Dictionary Ignored</b>'
                $("#resultsText").html(strRet);
            }
        },
        error: function (jqxhr, testStatus, reason) {
            $("#resultsText").text(reason);
        }
    });
}

function popScore() {
    var pPath = $("#pSavePath").val();
    $.ajax({
        url: "./popScoreList",
        data : {
            filePath: pPath
        },
        dataType: "json",
        success: function (response) {
            var lFiles = response.lFiles;
            var nFiles = response.nFiles;
            var strRet = '';
            var elmSel = document.getElementById("scoreSelect");
            elmSel.options.length=1;

            for(i=0; i<nFiles; i++)
            {
                elmSel.options[i+1] = new Option(lFiles[i], lFiles[i], false, false);
            }
        },
        error: function(jqxhr, testStatus, reason) {
            $("#resultsText").text(reason);
        }
    });
}

function populatePolygonSelect() {
    var pPath = $("#pSavePath").val();
    $.ajax({
        url: "./popScoreList",
        data : {
            filePath: pPath,
            subDir:fileSubDir
        },
        dataType: "json",
        success: function (response) {
            var lFiles = response.lFiles;
            var nFiles = response.nFiles;
            var strRet = '';
            var elmSel = $("#polygonSelect").get(0);
            elmSel.options.length=1;

            for(i=0; i<nFiles; i++)
            {
                elmSel.options[i+1] = new Option(lFiles[i], lFiles[i], false, false);
            }
        },
        error: function(jqxhr, testStatus, reason) {
            $("#resultsText").text(reason);
        }
    });
}

function putScoreMarker(location, caption) {
    var marker = new google.maps.Marker({
        position: location,
        title:caption
    })
    marker.setMap(map);
    return marker;
}

function newCenter() {
    var place = $("#dataSetSelect").val();
    var myLatlng;
    var zoomVal;
    if(place=="Cleveland")
    {
        myLatlng = new google.maps.LatLng(41.495753,-81.7009019);
        zoomVal = 10;
    } else if(place=="Texas") {
        myLatlng = new google.maps.LatLng(31.907836, -98.644703);
        zoomVal = 6;
    } else if(place=="dcArea") {
        myLatlng = new google.maps.LatLng(39.054812, -76.814139);
        zoomVal = 9;
    } else {
        alert("No location loaded!");
        return;
    }
    map.setCenter(myLatlng);
    map.setZoom(zoomVal);
}

function syncFields(fId) {
    switch(fId){
        case 1:
            var newVal = $("#dop_sFileName").val();
            $("#sFileName").val(newVal);
        case 2:
            var newVal = $("#sFileName").val();
            $("#dop_sFileName").val(newVal);
        default:
            console.log("Wrong Field Value");
    }
}

function modReturn() {
    var bChecked = $("#bPercent").is(":checked");
    var f1 = $("#rankReturnInput");
    var f2 = $("#percentReturnInput");
    if(bChecked == true){
        f1.addClass("invis");
        f2.removeClass("invis");
    } else {
        f1.removeClass("invis");
        f2.addClass("invis");
    }
}

function toggleAdv() {
    var bChecked = $("#bAdvanced").is(":checked");
    var r1 = $("#hr1");
    var r3 = $("#hr3");
    var r4 = $("#hr4");
    var r5 = $("#hr5");
    if( bChecked == true) {
        r1.removeClass("invis");
        //r3.removeClass("invis");
        r4.removeClass("invis");
        r5.removeClass("invis");
    } else {
        r1.addClass("invis");
        //r3.addClass("invis");
        r4.addClass("invis");
        r5.addClass("invis");
    }
}