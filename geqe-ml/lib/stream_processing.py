def create_bin(record):
    key = record[0]
    p1 = key.find('_')
    p2 = key.find('_', p1+1)
    str_dt = key[:p1]
    str_lt = float(key[p1+1:p2])
    str_ln = float(key[p2+1:])
    d_ret = {'date':str_dt, 'location': {'type':'point', 'coordinates': (str_lt, str_ln)}, 'hours':{}}
    itt = record[1]
    for row in itt:
        hour = str(row.dt.hour)
        if hour in d_ret['hours'].keys():
            ind = str(int(max(d_ret['hours'][hour].keys())) + 1)
            d_ret['hours'][hour][ind] = row.text
        else:
            d_ret['hours'][hour] = {}
            d_ret['hours'][hour]['1'] = row.text
    return (key, d_ret)

def in_time_window(dt, dt_low, dt_high):
    if dt.date() < dt_high and dt.date() >= dt_low:
        return True
    return False