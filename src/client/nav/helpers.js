Session.setDefault('slide-panel-state', 'up');
Session.setDefault('allMoviesLoaded', false);

Template.nav.helpers({
  slidePanelState : function() {
    return 'slide-panel-' + Session.get('slide-panel-state');
  },
  spinnerState : function() {
    return Session.get('allMoviesLoaded') ? '' : 'spinning';
  }
});

Template.nav.events({
  'touchstart button[data-toggle=slide-panel]' : function(evt) {
    evt.preventDefault();
    var state = Session.get('slide-panel-state');
    Session.set('slide-panel-state', state == 'down' ? 'up' : 'down' );
  }
});
