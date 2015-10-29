// NOTE: most top-level config happens in layoutController

// manually trigger hiding the left splitbar. timeout is required to accomodate
//   async setup in angular-ui-layout.
// TODO: remove when (if) angular-ui-layout supports initial collapsed state.
setTimeout(hideLeftSplitbar, 500);

function hideLeftSplitbar() {
  $($('div.ui-splitbar .ui-splitbar-icon-left')[0]).trigger('click');
}
