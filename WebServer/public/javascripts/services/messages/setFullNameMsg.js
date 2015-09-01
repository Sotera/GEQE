angular.module('NodeWebBase')
    .service('setFullNameMsg', ['$rootScope',function ($rootScope) {

        this.broadcast = function broadcast() {
            var args = ['setFullName'];
            Array.prototype.push.apply(args,arguments);
            $rootScope.$broadcast.apply($rootScope, args);
        };

        this.listen = function(callback) {$rootScope.$on('setFullName',callback)}
    }]);