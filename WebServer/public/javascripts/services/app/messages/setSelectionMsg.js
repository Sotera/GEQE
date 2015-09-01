angular.module('NodeWebBase')
    .service('setSelectionMsg', ['$rootScope',function ($rootScope) {

        this.broadcast = function broadcast() {
            var args = ['setSelectionMsg'];
            Array.prototype.push.apply(args,arguments);
            $rootScope.$broadcast.apply($rootScope, args);
        };

        this.listen = function(callback) {$rootScope.$on('setSelectionMsg',callback)}
    }]);