angular.module('NodeWebBase')
    .service('applyFilterMsg', ['$rootScope',function ($rootScope) {

        this.broadcast = function broadcast() {
            var args = ['applyFilter'];
            Array.prototype.push.apply(args,arguments);
            $rootScope.$broadcast.apply($rootScope, args);
        };

        this.listen = function(callback) {$rootScope.$on('applyFilter',callback)}
    }]);