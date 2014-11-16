'use strict';

moment.locale('nl');

if (Meteor.isCordova)
  $(document).on('click', 'a[target=_blank]', function(evt) {
      window.open(evt.currentTarget.href, '_blank', 'location=yes');
      evt.preventDefault();
  });

Meteor.startup(function() {
    Meteor.subscribe('movies');
    Meteor.subscribe('harvest');
    Meteor.subscribe('genres');
});

Template.movieList.helpers({
    movies: function() {
        var filter = {};

        var genre = Session.get('genre');
        if (genre)
            _.extend(filter, { 'genres.name': genre });
        var fullTextSearch = Session.get('fullTextSearch');
        if (fullTextSearch)
            _.extend(filter, { title: new RegExp(fullTextSearch,'i') });
        // console.log(filter);
        return Movies.find(filter, {
            sort: [ ['imdb.rating', 'desc'], 'title']
        });
    },
    count: function(movies) {
        if (movies)
        return movies.count();
    }
});

Template.genres.helpers({
    genres : function() {
        return Genres.find({}, {
            sort: { name: 1 }
        });
    },

    isActive : function(genre) {
        return genre.name == Session.get('genre');
    },

    dropdownTitle : function() {
      return Session.get('genre') || 'Genre';
    }
});

Template.genres.rendered = function() {
    $('.navbar .dropdown [data-toggle=dropdown]').dropdown();
}

Template.genres.events({
    'click .dropdown-menu a' : function(evt) {
        evt.preventDefault();
        var value = $(evt.currentTarget).text();
        console.log(value);
        if (Session.get('genre') == value)
            Session.set('genre', null);
        else
            Session.set('genre', value);
    },

    'change [name=genre]' : function(evt) {
        var value = $(evt.currentTarget).find("option:selected" ).text()
        console.log(value);
        Session.set('genre', value);
    }
});

Template.fullTextSearch.helpers({
    incremental : function() {
      return !/Android/i.test(navigator.userAgent);
    },
    value : function() {
        return Session.get('fullTextSearch');
    }
});

function setFullTextSearch(evt) {
  Meteor.setTimeout(function() {
    var value = $(evt.currentTarget).val();
    console.log(value);
    Session.set('fullTextSearch' , value);
  }, 300);
}

function preventDefault(evt) { evt.preventDefault(); }

Template.fullTextSearch.events({
    'search [type=search]' : setFullTextSearch,
    'blur [type=search]' : setFullTextSearch,
    'submit form' : function(e) {
      e.preventDefault();
      $('#bs-example-navbar-collapse-1').collapse('hide')
    }
});

Template.harvest.helpers({
    harvest : function() {
        return Harvest.findOne('singleton');
    },
    lastUpdated : function() { // TODO: update every minute reactively
        return moment(this.timestamp).fromNow();
    }
});
