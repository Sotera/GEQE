angular.module('NodeWebBase')
    .directive('percentHeight',function () {
        function link(scope, element, attrs) {
            $(document).ready(function () {
                var remainingHeight = $(window).height()-75;
                var percent = parseInt(attrs.percent)/100;
                scope.style = {
                    height: (remainingHeight * percent).toString() + 'px'
                };

            });
            $(window).resize(function () {
                var remainingHeight = $(window).height()-75;
                var percent = parseInt(attrs.percent)/100;
                scope.$apply(function(){
                    scope.style = {
                        height: (remainingHeight * percent).toString() + 'px'
                    };
                });
            });

        }
        return {
            restrict: 'AE',
            link: link
        };
    });