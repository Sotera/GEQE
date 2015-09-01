angular.module('NodeWebBase')
    .service('toggleEditMsg', ['$rootScope',function ($rootScope) {

        this.broadcast = function broadcast() {
            var args = ['toggleEditMsg'];
            Array.prototype.push.apply(args,arguments);
            $rootScope.$broadcast.apply($rootScope, args);
        };

        this.listen = function(callback) {$rootScope.$on('toggleEditMsg',callback)}
    }]);