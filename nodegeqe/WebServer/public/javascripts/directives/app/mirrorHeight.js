angular.module('NodeWebBase')
    .directive('mirrorHeight',function () {
        function link(scope, element, attrs) {
            $(document).ready(function () {
                scope.style = {
                    height: ($(window).height()-75).toString() + 'px'
                };
            });
            $(window).resize(function () {
                scope.setStyle({
                    height: ($(window).height()-75).toString() + 'px'
                });
            });

        }
        return {
            restrict: 'AE',
            link: link
        };
    });