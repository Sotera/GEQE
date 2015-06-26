
angular.module('NodeWebBase')
    .service('userLoggingService', ['$rootScope',function ($rootScope) {
        var me = this;
        me.userale = null;

        me.init = function(){
            if(!$rootScope.userLoggingEnabled) {
                return;
            }

            me.userale = new userale({
                loggingUrl: $rootScope.userLoggingUrl, //The url of the User-ALE logging server.
                toolName: 'GEQE', //The name of your tool
                toolVersion: '0.1', //The semantic version of your tool
                elementGroups: [ //A list of element groups used in your tool (see below)
                    'results_tab',
                    'map'
                ],
                workerUrl: 'javascripts/userale/userale-worker.js', //The location of the User-ALE webworker file
                debug: true, //Whether to log messages to console
                sendLogs: true //Whether or not to send logs to the server (useful during testing)
            });

            me.userale.register();
        };

        me.logUserAction = function(activity,action,elementId,elementType,elementGroup,source,tags){
            if(!me.userale)
                return;
            var msg = {
                activity: activity,
                action: action,
                elementId: elementId,
                elementType: elementType,
                elementGroup: elementGroup,
                source: source,
                tags: tags
            };
            me.userale.log(msg);
        };

        //go ahead and get the data sets from the server
        //INIT
        var watchRemoval = $rootScope.$watch($rootScope.isAppConfigured ,function(newVal,oldVal) {
            if(newVal) {  // Don't do anything if Undefined.
                me.init();
                watchRemoval();
            }
        })

    }]);
