"""
Return a GeqeIO object based on the system conf
"""



def get(conf):
    if 'data_store' not in conf:
        raise KeyError('Required field data_store not found in conf')

    ds = conf['data_store']
    if 'localFS' == ds:
        return LocalFSIO()
    else:
        raise KeyError('conf has invalid data_store type. '+ds)


