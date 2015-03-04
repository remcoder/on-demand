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

      Meteor.subscribe('topmovies', function () {
        moviesLoaded.set(true);
        phase('top movies ready');
        Meteor.defer(function () {
          Meteor.subscribe('movies');
        });
      });
    }
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
    }
});
