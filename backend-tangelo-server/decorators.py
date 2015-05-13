import tangelo
sys.path.append(".")
import conf
import os

def allow_all_origins(callback):
    """
    Set http headers to all cross domain
    :param callback:
    :return:
    """
    def set_header(**kwargs):
        tangelo.header('Access-Control-Allow-Origin','*')
        return callback(**kwargs)
    return set_header


def validate_user(callback):
    def setup_user(**kwargs):
        confObj = conf.get()
        root = confObj['root_data_path']
        user = kwargs.get('user','')
        if user == '': raise ValueError("user is required.")
        if '..' in user or '/' in user or '\\' in user:
            raise ValueError("Invalid Username")
        if not os.path.isdir(root+'/'+user):
            os.mkdir(root+'/'+user)
            for dir in ['dictFiles','inputFiles','jobFiles','previewTrainingFiles','scoreFiles']:
                os.mkdir(root+'/'+user+'/'+dir)




