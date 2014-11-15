'use strict';

var Future = Npm.require('fibers/future');
var cheerio = Meteor.npmRequire('cheerio');
var $ = null;

function autoUpdate() {

  // update immediately if necessary
  updateIfNeeded();

  // check every minute
  Meteor.setInterval(updateIfNeeded, 60 * 1000);
}

function updateIfNeeded() {
  if (Harvest.needsUpdate())
    Harvest.harvestFilm1();
}

function needsUpdate() {
  var harvest = Harvest.findOne('singleton');
  if (!harvest) {
      console.log('no previous harvest found');
      Harvest.insert({ _id : 'singleton' });
      return true;
  }

  // harvest 1x /day
  var daysAgo = moment.duration(new Date() - harvest.timestamp).asDays();
  if (daysAgo > 1) {
    console.log('harvest is '+ daysAgo +'day old');
    return true;
  }

  return false;
}

function harvestFilm1() {
    Harvest.upsert('singleton', {
        timestamp: new Date(),
    });

    console.log('harvesting Film1 data');
    var before = new Date();
    var movies = getList().wait();
    var after = new Date() - before;
    console.log('\t' + (after/1000).toFixed(1) + 's');

    var futures = movies.map(function(movie){
        // var doc = Movies.findOne('film1_' + movie.fid);
        // if (doc) return;

        movie._id = 'film1_' + movie.fid;

        return getDetailsFut(movie);
    });

    Future.wait.apply(null, futures);
    after = new Date() - before;
    console.log('\t' + (after/1000).toFixed(1) + 's');
}

function _movie(index, li) {
  var $li = $(li);
  var idparts = $li.find('a.hover-over').attr('id').split('_');
  var when = $li.find('h3 + span').text().trim();
  var nowAvailable = when.toLowerCase() == 'nu te zien';
  return {
      fid : idparts[1] ,
      cover : $li.find('a.hover-over img').attr('src'),
      url : $li.find('a.hover-over').attr('href'),
      title: $li.find('h3 a').text(),
      when : when,
      nowAvailable : nowAvailable,
  };
}
function getList(fun) {
  HTTP.get('http://www.film1.nl/film_kijken/film1_on_demand/', function(err, res) {
    if( err) {
        console.error(err);
        console.log(res.content);
        fun(err);
    }
    $ = cheerio.load(res.content);

    var allMovies = $('.listview').eq(1); // the first listview contains only new titles
    var rows = allMovies
        .children('.premiere').get();

    var flat = rows.reduce(function(acc, cur) {
        return acc.concat( $(cur).children('li').map(_movie).get() );
    }, []);

    fun(undefined, flat);
  });
}

// var getList = Meteor.wrapAsync(getList);
var getList = Future.wrap(getList);

function getDetails1(movie, fun) {
  var movieId = movie.fid;
  HTTP.post('http://www.film1.nl/films/ajax_get_film_info.php', {
      params: {
          movie_id: movieId,
          movie_nr: 0
      }
  }, function(err, res) {
      if( err) {
          console.error(err);
          console.log(res.data.html_hoverover);
          fun(err);
      }

      $ = cheerio.load(res.data.html_hoverover);
      var details = {
          duration : $('.duration').text(),
          trailer : $('.movie-trailer').attr('href'),
          icons : $('.info li img')
              .map(function(i, el) { return $(el).attr('src'); })
              .get(),
          imdb : {
              rating : $('.imdb-rating .rating-value').text(),
              votes : $('.imdb-rating .rating-votes').text(),
              url : $('.imdb-rating .rating-votes').attr('href')
          },
          desc : $('.teaser').text()
      };

      // Movies.update(movie._id, { $set: details });
      // console.log(movie.url);
      fun(undefined, details);
  });
}



function getDetails2(movie, fun) {
  var url = movie.url;
  // console.log('url', url);
  HTTP.get('http://www.film1.nl' + url, function(err, res) {
      if (err) {
          console.error(err);
          console.log(res);
          fun(err);
      }

      // console.log(res.content);
      $ = cheerio.load(res.content);
      var genres = $('.tab-tbl-title:contains(Genre)').next().children('a').map(function(i,el) {
          return {
              name: $(el).text(),
              url: $(el).attr('href'),
          };
      }).get();

      genres.forEach(function(g) {
          var id = 'http://www.film1.nl' + g.url;
          if (!Genres.findOne(id)) {
              g._id = id;
              Genres.upsert(id, g);
          }
      });

      fun(undefined, {
          genres: genres
      });
  });
}



var getDetailsFut = function (movie) {
  var f1 = Future.wrap(getDetails1)(movie);
  var f2 = Future.wrap(getDetails2)(movie);
  var details = _.extend(f1.wait(), f2.wait());

  Movies.upsert(movie._id, { $set: details });
  console.log(movie.url);

}.future();

var exports = {
    harvestFilm1 : harvestFilm1,
    needsUpdate : needsUpdate,
    autoUpdate : autoUpdate
};
Meteor.methods(exports);
_.extend(Harvest, exports);

