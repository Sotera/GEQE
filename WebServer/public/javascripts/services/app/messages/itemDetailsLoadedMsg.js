angular.module('NodeWebBase')
    .service('itemDetailsLoadedMsg', ['$rootScope',function ($rootScope) {

        this.broadcast = function broadcast() {
            var args = ['itemDetailsLoaded'];
            Array.prototype.push.apply(args,arguments);
            $rootScope.$broadcast.apply($rootScope, args);
        };

        this.listen = function(callback) {$rootScope.$on('itemDetailsLoaded',callback)}
    }]);