angular.module('NodeWebBase')
    .service('changeThemeMsg', ['$rootScope',function ($rootScope) {

        this.broadcast = function broadcast() {
            var args = ['changeTheme'];
            Array.prototype.push.apply(args,arguments);
            $rootScope.$broadcast.apply($rootScope, args);
        };

        this.listen = function(callback) {$rootScope.$on('changeTheme',callback)}
    }]);