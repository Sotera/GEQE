import sysimport jsonimport tangeloimport subprocessimport os@tangelo.restfuldef get(filePath='./',filePolygon='polyFile.txt',fileString=''):    fileName = filePath + "inputFiles/" + filePolygon    f = open(fileName, 'w')    tangelo.log("line1")    f.write(fileString)    f.close()    return "Successfull wrote " + fileName    