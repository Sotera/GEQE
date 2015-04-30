angular.module('NodeWebBase')
    .directive('percentHeight',function () {
        function link(scope, element, attrs) {
            $(document).ready(function () {
                var remainingHeight = $(window).height()-48;
                var percent = parseInt(attrs.percent)/100;
                scope.style = {
                    height: (remainingHeight * percent).toString() + 'px'
                };

            });
            scope.delay = (function(){
                var timer = 0;
                return function(callback, ms){
                    clearTimeout (timer);
                    timer = setTimeout(callback, ms);
                };
            })();

            $(window).resize(function () {
                scope.delay(function(){
                    var remainingHeight = $(window).height()-48;
                    var percent = parseInt(attrs.percent)/100;
                    scope.$apply(function(){
                        scope.style = {
                            height: (remainingHeight * percent).toString() + 'px'
                        };
                    });
                }, 100);
            });

        }
        return {
            restrict: 'AE',
            link: link
        };
    });