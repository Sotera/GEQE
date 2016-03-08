
def create_bin(record):
    key = record[0]
    p1 = key.find('_')
    p2 = key.find('_', p1+1)
    str_dt = key[:p1]
    str_lt = key[p1+1:p2]
    str_ln = key[p2+1:]
    d_ret = {'date':str_dt, 'lat':str_lt, 'lon':str_ln, 'hours':{}}
    itt = record[1]
    for row in itt:
        hour = str(row.dt.hour)
        if hour in d_ret['hours'].keys():
            d_ret['hours'][hour].append(row.text)
        else:
            d_ret['hours'][hour] = [row.text]
    return (key, d_ret)
