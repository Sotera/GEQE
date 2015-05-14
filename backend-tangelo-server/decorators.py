import tangelo


def allow_all_origins(callback):
    def set_header(**kwargs):
        tangelo.header('Access-Control-Allow-Origin','*')
        return callback(**kwargs)
    return set_header