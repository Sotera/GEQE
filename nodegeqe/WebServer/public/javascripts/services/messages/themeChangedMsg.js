angular.module('NodeWebBase')
    .service('themeChangedMsg', ['$rootScope',function ($rootScope) {

        this.broadcast = function broadcast() {
            var args = ['themeChanged'];
            $rootScope.$broadcast.apply($rootScope, args);
        };

        this.listen = function(callback) {$rootScope.$on('themeChanged',callback)}
    }]);