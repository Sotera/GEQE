angular.module('NodeWebBase')
    .directive('userLog',['userLoggingService', function (userLoggingService) {
        function link(scope, element, attrs) {

            /*
             me.logUserAction = function(activity,action,elementId,elementType,elementGroup,source,tags)

            ACTIVITIES = ['ADD', 'REMOVE', 'CREATE', 'DELETE', 'SELECT', 'DESELECT', 'ENTER', 'LEAVE', 'INSPECT', 'ALTER', 'HIDE', 'SHOW', 'OPEN', 'CLOSE', 'PERFORM'];

             ELEMENTS = ['BUTTON', 'CANVAS', 'CHECKBOX', 'COMBOBOX', 'DATAGRID', 'DIALOG_BOX', 'DROPDOWNLIST', 'FRAME', 'ICON', 'INFOBAR', 'LABEL', 'LINK', 'LISTBOX', 'LISTITEM', 'MAP', 'MENU', 'MODALWINDOW', 'PALETTEWINDOW', 'PANEL', 'PROGRESSBAR', 'RADIOBUTTON', 'SLIDER', 'SPINNER', 'STATUSBAR', 'TAB', 'TABLE', 'TAG', 'TEXTBOX', 'THROBBER', 'TOAST', 'TOOLBAR', 'TOOLTIP', 'TREEVIEW', 'WINDOW', 'WORKSPACE', 'OTHER'];
             */
            $(document).ready(function () {
                element.on('mouseover', function(e) {
                    userLoggingService.logUserAction('INSPECT','mouseover',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('click', function(e) {
                    userLoggingService.logUserAction('PERFORM','click',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('dblclick', function(e) {
                    userLoggingService.logUserAction('PERFORM','dblclick',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('focus', function(e) {
                    userLoggingService.logUserAction('ENTER','focus',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('blur', function(e) {
                    userLoggingService.logUserAction('LEAVE','blur',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('change', function(e) {
                    userLoggingService.logUserAction('ALTER','change',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('keypress', function(e) {
                    userLoggingService.logUserAction('ALTER','keypress',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('drag', function(e) {
                    userLoggingService.logUserAction('ALTER','drag',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('drop', function(e) {
                    userLoggingService.logUserAction('ALTER','drop',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('wheel', function(e) {
                    userLoggingService.logUserAction('INSPECT','wheel',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

                element.on('scroll', function(e) {
                    userLoggingService.logUserAction('INSPECT','scroll',attrs.id,
                        attrs.elementtype ,attrs.loggroup,'user',attrs.logtags.split(','));
                });

            });
        }
        return {
            restrict: 'A',
            link: link
        };
    }]);