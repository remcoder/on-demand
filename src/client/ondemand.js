
moment.locale('nl');

var _timestamp = new Date();
function phase(label) {
  console.log( ((new Date() - _timestamp)/1000).toFixed(1) + 's ' + label);
}

phase('init');

// suspend app when back button is pressed
if(Meteor.isCordova){
  Meteor.startup(function(){
    //console.log('startup');
    GAnalytics.pageview("/main/startup");

    document.addEventListener("backbutton", function () {
      window.plugins.Suspend.suspendApp();
    });
    document.addEventListener("resume", function () {
      //console.log('resume!');
      GAnalytics.pageview("/main/resume");
    });
  });
}

if (Meteor.isCordova)
  // open links in InAppBrowser
  $(document).on('click', 'a[target=_blank]', function(evt) {
      window.open(evt.currentTarget.href, '_blank', 'location=yes');
      evt.preventDefault();
  });

this.firstPaint = new ReactiveVar(false);
this.moviesLoaded = new ReactiveVar(false);
Template.registerHelper('moviesLoaded', function() { return moviesLoaded.get(); });

Meteor.startup(function() {
  $(window).scroll(_.throttle(function(evt) {
    //console.log('scroll');
    GAnalytics.event("main","scroll");
  }, 10000));

  phase('startup');

  Tracker.autorun(function(c) {
    if (firstPaint.get()) {
      phase('subscribing');
      Meteor.subscribe('movies', function() {
        moviesLoaded.set(true);
        phase('movies ready');
      });
      Meteor.subscribe('harvest', function() {});
      Meteor.subscribe('genres');

    }
  });

});

Template.movieList.rendered = function() {
  var count = 0;
  this.autorun(function() {
    count++;
    if (count == 1)
      setTimeout(function() {
        firstPaint.set(true);
      },100);

    phase('render ' + count + ', ' + Movies.find().count() + ' movies loaded');
  });
}

var json = localStorage.getItem('movies');
if (json) {
  var localMovies = JSON.parse(json);
  if (localMovies)
    phase('got movies from localstorage: ' + localMovies.length);
}
else {
  localMovies = defaultMovies;
  phase('using default movies ' + localMovies.length)
}


Template.movieList.helpers({
    movies: function() {

        if (!moviesLoaded.get()) {
          phase('using movies from localstorage or default')
          return localMovies;
        }

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
        var movies = Movies.find(filter, {
            sort: [ ['imdb.rating', 'desc'], 'title']
        }).fetch();

        phase('got movies '+movies.length+' from server');
        // console.log('storing new movies in localstorage')
        localStorage.setItem('movies', JSON.stringify(movies.slice(0,10) ));

        return movies;
    },


    hasMovies: function() {
      if (!firstPaint.get())
        return false;

      if (moviesLoaded.get())
        return true;

      return localMovies && localMovies.length;
    }
});

Template.movieItem.helpers({
  formatDuration: function(s) {
      // console.log(s);
      if (!s) return '?';
      return +s.split(' ')[0];
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

Template.status.helpers({
    count: function(movies) {
        return this.length;
    },
    harvest : function() {
      return Harvest.findOne('singleton');
    },
    lastUpdated : function() {
      return Chronos.liveMoment(this.timestamp).fromNow();
    }
});
