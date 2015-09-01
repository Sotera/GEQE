############# ############# ############# #############
# shapeReader.py
# by JAG3
#
# v1.0 - defines simple point, line segment, and polygon
#   classes, primarily useful for determinging point in
#   polygon
############# ############# ############# #############


from datetime import date, datetime

class Point:
    def __init__(self, x, y):
        self.x = float(x)
        self.y = float(y)
    def __str__(self):
        return "("+self.x.__str__()+","+self.y.__str__()+")"

class LineSegment:
    def __init__(self, pt1, pt2):
        self.p1 = pt1
        self.p2 = pt2
        self.minX = min(self.p1.x, self.p2.x)
        self.maxX = max(self.p1.x, self.p2.x)
        self.minY = min(self.p1.y, self.p2.y)
        self.maxY = max(self.p1.y, self.p2.y)
        self.bVert = False
        if(self.p1.x == self.p2.x):
            self.bVert = True
    def __str__(self):
        return "["+self.p1.__str__()+"],["+self.p2.__str__()+"]"
    def slope(self):
        if self.bVert:
            return 9999999.
        return (self.p1.y-self.p2.y)/(self.p1.x-self.p2.x)
    def yOff(self):
        return self.p1.y - self.slope()*self.p1.x
    #def bPointOnLine(self, p):
    def bIntersects(self, lin2):
        #case 0, self or lin2 verticle lines
        #case 0-0, both are verticle
        if self.bVert and lin2.bVert:
            if self.minX != lin2.minX:
                return False
            if self.minY > lin2.maxY:
                return False
            if self.maxY < lin2.minY:
                return False
            return True
        #case 0-1, self is verticle
        elif self.bVert:
            if self.minX > lin2.maxX:
                return False
            if self.minX < lin2.minX:
                return False
            yInt = lin2.yOff() + self.minX*lin2.slope()
            if yInt > self.maxY or yInt < self.minY:
                return False
            return True
        elif lin2.bVert:
            if lin2.minX > self.maxX:
                return False
            if lin2.minX < self.minX:
                return False
            yInt = self.yOff() + lin2.minX*self.slope()
            if yInt > lin2.maxY or yInt < lin2.minY:
                return False
            return True
        #case 1, lines parrallel/colinear
        if self.slope() == lin2.slope():
            if  (
                    (self.p1.y>lin2.minY and self.p1.y<lin2.maxY) or
                    (self.p2.y>lin2.minY and self.p2.y<lin2.maxY) or
                    (self.minY<lin2.minY and self.maxY>lin2.maxY)
                ):
                return True
            return False
        #case2, lines are not parrallel
        commonX = (self.yOff()-lin2.yOff())/(lin2.slope()-self.slope())
        if self.minX<=commonX and self.maxX>=commonX and lin2.minX<=commonX and lin2.maxX>=commonX:
            return True
        return False

class Polygon:
    def __init__(self, pList):
        self.BadPoly = False
        if len(pList) < 3:
            print "Cannot form a Polygon with less than 3 points!"
            self.BadPoly = True
        self.points = []
        self.edges = []
        for newPoint in pList:
            self.points.append(newPoint)
            if len(self.points) > 1:
                newEdge = LineSegment(self.points[-1],self.points[-2])
                self.edges.append(newEdge)
                if newPoint.x>self.maxx:
                    self.maxx=newPoint.x
                elif newPoint.x<self.minx:
                    self.minx=newPoint.x
                if newPoint.y>self.maxy:
                    self.maxy=newPoint.y
                elif newPoint.y<self.miny:
                    self.miny=newPoint.y
            else:
                self.minx = newPoint.x
                self.maxx = newPoint.x
                self.miny = newPoint.y
                self.maxy = newPoint.y
        newEdge = LineSegment(self.points[-1],self.points[0])
        self.edges.append(newEdge)
    def __str__(self):
        strRet = "Edges:{ "
        for e in self.edges:
            strRet = strRet + e.__str__() + "; "
        strRet = strRet + "}"
        return strRet
    def bPointInPoly(self, p):
        if p.x > self.maxx:
            return False
        if p.x < self.minx:
            return False
        if p.y > self.maxy:
            return False
        if p.y < self.miny:
            return False
        pOut1 = Point(p.x, self.maxy+1)
        pOut2 = Point(self.maxx+1, p.y)
        col1 = 0
        col2 = 0
        ray1 = LineSegment(p,pOut1)
        ray2 = LineSegment(p,pOut2)
        for edge in self.edges:
            if ray1.bIntersects(edge):
                col1 = col1 + 1
            if ray2.bIntersects(edge):
                col2 = col2 + 1
        if (col1%2==0) and (col2%2==0):
            return False
        return True

class spaceTimePlane:
    def __init__(self, polyRep, dList, name, fromPoly = False):
        # polyRep is how you are representing your polygon.
        # the typical way of making this is via a list of polygons
        # to form from an existing polygon, set fromPoly to True
        if fromPoly==False:
            self.poly = Polygon(polyRep)
            self.dates = []
            if len(dList) == 0:
                self.dates.append((date(1996,1,1),date(2999,12,31)))
            else:
                for pair in dList:
                    self.dates.append( (pair[0],pair[1]) )
            self.name = name
        else:
            self.poly = polyRep
            self.dates = []
            if len(dList) == 0:
                self.dates.append((date(1996,1,1),date(2999,12,31)))
            else:
                for pair in dList:
                    self.dates.append((pair[0],pair[1]))
            self.name = name



    def __str__(self):
        strRet = "Site name: " + self.name + "\n"
        for pair in self.dates:
            strRet = strRet + "Min time: " + str(pair[0]) + ", Max time: " + str(pair[1]) + "\n"
        strRet = strRet + str(self.poly)
        return strRet

    def bEventInTime(self, p, t):
        bInWindow = False
        for pair in self.dates:
            if t < pair[0] or t > pair[1]:
                continue
            bInWindow = True
        if bInWindow:
            return self.poly.bPointInPoly(p)
        return False

    def bEventOutOfTime(self, p, t):
        for pair in self.dates:
            if (t >= pair[0]) and (t<= pair[1]):
                return False
        return self.poly.bPointInPoly(p)

    def bPointInPoly(self, p):
        return self.poly.bPointInPoly(p)

if __name__ == "__main__":
    p1 = Point(1,1)
    p2 = Point(-1,-1)
    p3 = Point(1,-1)
    p4 = Point(-1,1)
    p5 = Point(.5,.5)
    p6 = Point(-.5,-.5)
    p7 = Point(0,2)
    p8 = Point(1,0)
    p9 = Point(0,1)
    p10= Point(-1,0)
    p11= Point(0,-1)
    p12= Point(.9,.9)
    p13= Point(0,0)

    l1 = LineSegment(p1,p2)
    l2 = LineSegment(p3,p4)
    l3 = LineSegment(p5,p6)
    l4 = LineSegment(p7,p8)
    l5 = LineSegment(p7,p1)

    pList1 = [p1, p3, p2, p4]
    pList2 = [p8, p9, p10, p11]

    poly2 = Polygon(pList2)
    b1 = poly2.bPointInPoly(p5)
    b2 = poly2.bPointInPoly(p12)
    b3 = poly2.bPointInPoly(p7)
    print "Polygon definition:"
    print poly2
    print "Test if " + str(p5) + "in Polygon:" + str(b1)
    print "Test if " + str(p12) + "in Polygon:" + str(b2)
    print "Test if " + str(p7) + "in Polygon:" + str(b3)
