############# ############# ############# #############
# shapeReader.py
# by JAG3
#
# v1.2 - Reads in json formatted file that includes time
#           boundaries for new 'spaceTimePlane' class.
# 
# v1.1 - read in csv text file defining polygon shapes.
#   * Defines readInShapeFile
#       * Inputs: 
#           * csv shape file
#               Line = [Polygon Number], [Latitude], [Longitude]
#
#       * Output: list of polygons, as defined by point class
#   * Use simplePolygonGenerator tool to create lists
############# ############# ############# #############
import pointClass
import os
import json
from datetime import date,datetime


def readInShaeDocument(data):
    lST = []
    siteList = data['sites']
    for site in siteList:
        pList = []
        dList = []
        for i2 in range(len(site['lats'])):
            pList.append(pointClass.Point(site['lons'][i2],site['lats'][i2]))
        for datePairs in site['dates']:
            mindate = datetime.strptime(datePairs['min'].split('T')[0],'%Y-%m-%d').date()
            maxdate = datetime.strptime(datePairs['max'].split('T')[0],'%Y-%m-%d').date()
            dList.append((mindate,maxdate))
        lST.append(pointClass.spaceTimePlane(pList,dList,site['name']))
    return lST


def readInShapeJson(fileName):
    data = json.loads(open(fileName).read())
    return readInShaeDocument(data)


def readInShapeFile(fileName):
    pointReader = open(fileName,'rb')
    polyList = []
    pointList = []
    polyIndex = -1
    for row in pointReader:
        fInd, lat, lon = row.split(",")
        if int(fInd) != polyIndex:
            if polyIndex != -1:
                newPoly = pointClass.Polygon(pointList)
                polyList.append(newPoly)
                pointList = []
            polyIndex = int(fInd)
        newPoint = pointClass.Point(lon,lat)
        pointList.append(newPoint)
    newPoly = pointClass.Polygon(pointList)
    polyList.append(newPoly)
    return polyList

def makeShapeSeries(strDir):
    polyFiles = os.listdir(strDir)
    retDict = {}
    if strDir[-1] != '/':
        strDir = strDir + '/'
    for file in polyFiles:
        retDict[file[0:8]] = readInShapeFile(strDir+file)
    return retDict

if __name__ == "__main__":
    polyList = readInShapeFile("../polygon/shapeFile2.txt")
    print "The capture boxes are defined by: "
    for poly in polyList:
        print str(poly) + '\n'

    p1 = pointClass.Point(-122.3235, 47.603)
    p2 = pointClass.Point(-122.321, 47.61)
    p3 = pointClass.Point(-122.342878, 47.607403)
    p4 = pointClass.Point(-122.326, 47.61131)
    p5 = pointClass.Point(-122.322718, 47.605963)
    p6 = pointClass.Point(-122.324000, 47.603995)
    p7 = pointClass.Point(-122.328002, 47.609703)
    p8 = pointClass.Point(-122.320331, 47.607742)
    pList = [p1, p2, p3, p4, p5, p6, p7, p8]
    for p in pList:
        print "Point: " + str(p)
        for ind in range(len(polyList)):
            if polyList[ind].bPointInPoly(p):
                print '\t' + "is in region number " + str(ind)
            else:
                print '\t' + "is out of region number " + str(ind)