angular.module('NodeWebBase')
    .directive('mirrorHeight',function () {
        function link(scope, element, attrs) {
            $(document).ready(function () {
                scope.$parent.style = {
                    height: ($(window).height() - 352).toString() + 'px'
                };
            });
            $(window).resize(function () {
                scope.$parent.setStyle({
                    height: ($(window).height() - 352).toString() + 'px'
                });
            });

        }
        return {
            restrict: 'AE',
            link: link
        };
    });