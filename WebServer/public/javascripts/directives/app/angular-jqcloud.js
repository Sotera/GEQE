angular.module('angular-jqcloud', []).directive('jqcloud', ['$parse', function($parse) {
    // get existing options
    var defaults = jQuery.fn.jQCloud.defaults.get(),
        jqcOptions = [];

    for (var opt in defaults) {
        if (defaults.hasOwnProperty(opt)) {
            jqcOptions.push(opt);
        }
    }

    return {
        restrict: 'E',
        template: '<div></div>',
        replace: true,
        scope: {
            words: '=words'
        },
        link: function($scope, $elem, $attr) {
            var options = {};

            for (var i=0, l=jqcOptions.length; i<l; i++) {
                var opt = jqcOptions[i];
                var attr = $attr[opt] || $elem.attr(opt);
                if (attr !== undefined) {
                    options[opt] = $parse(attr)();
                }
            }
            jQuery($elem).jQCloud($scope.words, options);

            $scope.$watchCollection('words', function() {
                $scope.$evalAsync(function() {
                    var words = [];
                    $.extend(words,$scope.words);
                    jQuery($elem).jQCloud('update', words);
                });
            });

            $elem.bind('$destroy', function() {
                jQuery($elem).jQCloud('destroy');
            });
        }
    };
}]);