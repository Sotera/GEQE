import sysimport jsonimport tangeloimport osimport timesys.path.append(".")import conffrom decorators import allow_all_originsfrom decorators import validate_user@tangelo.restful@allow_all_origins@validate_userdef get(user='demo'):    confObj = conf.get()    filePath = confObj['root_data_path'] +'/' +user    scoreDir = filePath + '/scoreFiles'    lFiles = sorted(os.listdir(scoreDir))    retDict = {}    retDict["lFiles"] = lFiles    retDict["nFiles"] = len(lFiles)    return json.dumps(retDict)