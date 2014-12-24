
moment.locale('nl');

if (Meteor.isCordova)
  // open links in InAppBrowser
  $(document).on('click', 'a[target=_blank]', function(evt) {
      window.open(evt.currentTarget.href, '_blank', 'location=yes');
      evt.preventDefault();
  });


this.moviesLoaded = new ReactiveVar(false);
Template.registerHelper('moviesLoaded', function() {
  return moviesLoaded.get() ? 'transparent' : '';
});

Meteor.startup(function() {
    Meteor.subscribe('movies', function() {
      moviesLoaded.set(true);
    });
    Meteor.subscribe('harvest');
    Meteor.subscribe('genres');
});

Template.movieList.helpers({
    movies: function() {
        var filter = {};

        var genres = Genres.find({}).fetch()
          .filter(function(g) {
          return Session.get('genre-'+g.name);
        }).map(function(g) {
          return g.name;
        });

        if (genres.length)
          _.extend(filter, { 'genres.name': { $in: genres} });

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

    isSelected : function(genre) {
        return !!Session.get('genre-' + genre.name);
    },

    dropdownTitle : function() {
      return Session.get('genre') || 'Genre';
    }
});

Template.genres.rendered = function() {
    $('.navbar .dropdown [data-toggle=dropdown]').dropdown();
};

Template.genres.events({
  'click .dropdown-menu [data-action=reset]' : function() {
    Genres.find({}).forEach(function(g) {
      Session.set('genre-'+g.name, false);
    });
  },

  'click .dropdown-menu [data-action=select-genre]' : function(evt) {
    var genre = $(evt.currentTarget).text().trim();
    var key = 'genre-' + genre;
    Session.set(key, !Session.get(key));
  },

  'click .dropdown-menu *' : function(e) {
    e.stopPropagation();
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
      $('#bs-example-navbar-collapse-1').collapse('hide');
    }
});

Template.harvest.helpers({
    harvest : function() {
      return Harvest.findOne('singleton');
    },
    lastUpdated : function() {
      return Chronos.liveMoment(this.timestamp).fromNow();
    }
});
