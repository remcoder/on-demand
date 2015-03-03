'use strict';

Meteor.startup(function() {

  Harvest.autoUpdate();


  Meteor.publish('harvest', function() { return Harvest.find({}); });
  Meteor.publish('genres', function() { return Genres.find({}); });

  Meteor.publish('topmovies', function() {
    return Movies.find({ nowAvailable : true }, { limit: 10, sort: { 'imdb.rating': -1 }});
  });

  Meteor.publish('movies', function() {
    return Movies.find({ nowAvailable : true }, { sort: { 'imdb.rating': -1 }});
  });
});
