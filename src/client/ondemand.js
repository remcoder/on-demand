var json, localMovies;
var _timestamp = new Date();
Session.setDefault('topMoviesLoaded', false);
Session.setDefault('allMoviesLoaded', false);

moment.locale('nl');
//Template.registerHelper('moviesLoaded', function() { return topMoviesLoaded.get(); });

function phase(label) {
  console.log( ((new Date() - _timestamp)/1000).toFixed(1) + 's ' + label);
}

Meteor.Spinner.options = {
  color: '#fff', // #rgb or #rrggbb
  hwaccel: true, // Whether to use hardware acceleration
  length: 10,
  width: 4,
  trail: 50
};

phase('init');

Tracker.autorun(function() {
  if (preloadingFinished.get()) {
    phase('subscribing');
    Chronos.liveUpdate(1000 * 60 * 60 * 24); // re-subscribe every day to refresh

    if (Session.get('allMoviesLoaded'))
      Meteor.subscribe('movies', new Date(), function() {
        console.log('re-sub done');
      });
    else
      Meteor.subscribe('topmovies', function () {
        Session.set('topMoviesLoaded', true);
        phase('top movies ready');

        // allow time to render
        Meteor.defer(function () {
          Meteor.subscribe('movies', function() {
            Session.set('allMoviesLoaded', true);
          });
        });
      });
  }
});


Tracker.autorun(function () {
  if (!Session.get('topMoviesLoaded'))
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
    if (!Session.get('topMoviesLoaded')) {
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
    return Session.get('topMoviesLoaded');
  }
});

Template.movieItem.helpers({
  lastChance : function() {
    if (!this.nowAvailable) return false;

    var nextWeek = moment().add(7, 'days');
    var end = moment(this.availableTo);
    return end.isBefore(nextWeek);
  },
  new: function() {
    if (!this.nowAvailable) return false;

    var aWeekAgo = moment().subtract(7, 'days');
    var premiere = moment(this.availableFrom);
    return premiere.isAfter(aWeekAgo);
  },
  formatDuration: function(s) {
      // console.log(s);
      if (!s) return '?';
      return +s.split(' ')[0];
    },
  trailer : function() {
    return 'http://www.film1.nl/films/trailer.php?id=' + this.fid;
  },
  period : function() {
    return 'Te zien van ' + moment(this.availableFrom).format('D MMMM') + ' tot ' + moment(this.availableTo).format('D MMMM') + '.';
  }
});
