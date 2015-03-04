var json, localMovies;
var _timestamp = new Date();
var firstPaint = new ReactiveVar(false);
var moviesLoaded = new ReactiveVar(false);

moment.locale('nl');
Template.registerHelper('moviesLoaded', function() { return moviesLoaded.get(); });

function phase(label) {
  console.log( ((new Date() - _timestamp)/1000).toFixed(1) + 's ' + label);
}

phase('init');

// suspend app when back button is pressed
if(Meteor.isCordova){
  Meteor.startup(function(){
    Tracker.autorun(function(c) {
      if (moviesLoaded.get()) {
        GAnalytics.pageview("/main/startup");
      }
    });
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
    GAnalytics.event("main", "trailer",evt.currentTarget.href);
      window.open(evt.currentTarget.href, '_blank', 'location=yes');
      evt.preventDefault();
  });


Meteor.startup(function() {
  $(window).scroll(_.throttle(function(evt) {
    //console.log('scroll');
    GAnalytics.event("main","scroll");
  }, 10000));

  phase('startup');

  Tracker.autorun(function(c) {
    if (this.preloadingFinished.get()) {
      phase('subscribing');
      Meteor.subscribe('topmovies', function() {
        moviesLoaded.set(true);
        phase('movies ready');
        Meteor.setTimeout(function(){
          Meteor.subscribe('movies');

        },300);
      });
      //Meteor.subscribe('harvest', function() {});
      //Meteor.subscribe('genres');
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
      //if (!firstPaint.get())
      //  return false;

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
