'use strict';

Meteor.startup(function() {

  Harvest.autoUpdate();


  Meteor.publish('harvest', function() { return Harvest.find({}); });
  Meteor.publish('genres', function() { return Genres.find({}); });

  Meteor.publish('movies', function() {
    return Movies.find({ nowAvailable : true });
  });
});
