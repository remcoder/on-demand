var json, localMovies;
var _timestamp = new Date();
var moviesLoaded = new ReactiveVar(false);

moment.locale('nl');
Template.registerHelper('moviesLoaded', function() { return moviesLoaded.get(); });

function phase(label) {
  console.log( ((new Date() - _timestamp)/1000).toFixed(1) + 's ' + label);
}

phase('init');

Tracker.autorun(function() {
  if (preloadingFinished.get()) {
    phase('subscribing');

    Meteor.subscribe('topmovies', function () {
      moviesLoaded.set(true);
      phase('top movies ready');
      Meteor.defer(function () {
        Meteor.subscribe('movies');
      });
    });
  }
});


Tracker.autorun(function () {
  if (!moviesLoaded.get())
    return;

  GAnalytics.pageview("/main/startup");

  $(window).scroll(_.throttle(function() {
    //console.log('scroll');
    GAnalytics.event("main","scroll");
  }, 10000));

  if (!Meteor.isCordova)
    return;

  // open links in InAppBrowser
  $(document).on('click', 'a[target=_system]', function (evt) {
    GAnalytics.event("main", "trailer", evt.currentTarget.href);
    window.open(evt.currentTarget.href, '_system');
    evt.preventDefault();
  });

  document.addEventListener("backbutton", function () {
    window.plugins.Suspend.suspendApp();
  });
  document.addEventListener("resume", function () {
    //console.log('resume!');
    GAnalytics.pageview("/main/resume");
  });
});


Template.movieList.rendered = function() {
  var count = 0;
  this.autorun(function() {
    count++;
    phase('render #' + count + ', ' + Movies.find().count() + ' movies');
  });
};


Template.movieList.helpers({
  movies: function() {
    if (!moviesLoaded.get()) {
      //phase('using movies from localstorage or default')
      return [];
    }

    phase('got new movies from server');
    var movies = Movies.find({}, {
        sort: [ ['imdb.rating', 'desc'], 'title']
    }).fetch();

    phase('sorted '+movies.length+' movies');
    // console.log('storing new movies in localstorage')
    //localStorage.setItem('movies', JSON.stringify(movies.slice(0,10) ));

    return movies;
  },


  hasMovies: function() {
    return moviesLoaded.get();
  }
});

Template.movieItem.helpers({
  formatDuration: function(s) {
      // console.log(s);
      if (!s) return '?';
      return +s.split(' ')[0];
    },
  trailer : function() {
    return 'http://www.film1.nl/films/trailer.php?id=' + this.fid;
  }
});
