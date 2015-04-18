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

var taps = 0;
Template.nav.events({
  'click button[data-toggle=slide-panel]' : function(evt) {
    evt.preventDefault();
    var state = Session.get('slide-panel-state');
    Session.set('slide-panel-state', state == 'down' ? 'up' : 'down' );
  },

  'click .app-title-left' : function(evt) {
    taps++;
    if (taps == 10)
    {
      taps = 0;
      alert(Meteor.release);
    }
  }
});
