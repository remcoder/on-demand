'use strict';


Meteor.startup(function() {
  moment.locale('nl');

  Harvest.autoUpdate();


  Meteor.publish('harvest', function() { return Harvest.find({}); });
  Meteor.publish('genres', function() { return Genres.find({}); });

  Meteor.publish('topmovies', function() {
    console.log('subscribe topmovies');
    return Movies.find({
      availableFrom : { $lt : new Date() },
      availableTo : { $gt : new Date() }
    }, { limit: 10, sort: { 'imdb.rating': -1 }});
  });


  Meteor.publish('movies', function(dummy) {
    console.log('subscribe movies');
    return Movies.find({
      availableFrom : { $lt : new Date() },
      availableTo : { $gt : new Date() }
    }, { sort: { 'imdb.rating': -1 }});
  });
});
