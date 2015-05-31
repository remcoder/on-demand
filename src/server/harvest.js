/* globals -$ */
'use strict';

var Future = Npm.require('fibers/future');
var cheerio = Meteor.npmRequire('cheerio');
var $ = null;

Future.waitAll = function(arr) {
  return Future.wait.apply(null, arr);
};

function autoUpdate() {

  // update immediately if necessary
  updateIfNeeded();

  // check every 5 minutes
  Meteor.setInterval(updateIfNeeded, 5 * 60 * 1000);
}

function updateIfNeeded() {
  if (Harvest.needsUpdate())
    Harvest.harvestFilm1(true); // force full update. for now
}

function needsUpdate() {

  var harvest = Harvest.findOne('singleton');
  if (!harvest) {
      console.log('no previous harvest found');
      Harvest.insert({ _id : 'singleton' });
      return true;
  }

  // restart unfinished harvest
  if (harvest.started && !harvest.finished) {
    console.log('restart unfinished harvest');
    return true;
  }

  // harvest 1x /day
  var hours = moment.duration(new Date() - harvest.timestamp).asHours();
  if (hours > 24) {
    console.log('harvest is '+ hours +' hour(s) old');
    return true;
  }

  return false;
}

var harvestFilm1 = function (force) {
  console.log('harvesting Film1 data');

  Harvest.upsert('singleton', {
    started   : new Date(),
    finished  : null,
    timestamp : new Date()
  });

  // remove all movies when forcing a new harvest
  if (force === true)
    Movies.remove({});

  var movies = getList();

  var idsInDb = Movies.find().map(function(movie) { return movie.fid; });
  var idsFromSite = _.pluck(movies, 'fid');

  // harvest new movies
  var movieIdsToBeAdded = _.difference(idsFromSite, idsInDb);
  var moviesToBeAdded = movies.filter(function(m) { return movieIdsToBeAdded.indexOf(m.fid) > -1; } );
  console.log(moviesToBeAdded.length + ' new movies to be harvested');
  var futures = moviesToBeAdded.map(getDetailsFut);
  Future.waitAll(futures);

  var movieIdsToBeRemoved = _.difference(idsInDb, idsFromSite);
  prune(movieIdsToBeRemoved);

  // re-harvest 16 movies > 24h old
  reHarvest(16);

  Harvest.upsert('singleton', {
      finished: new Date(),
      timestamp: new Date()
  });
}.future();

// re-harvest N movies > 24h old
function reHarvest(count) {

  var yesterday = moment().subtract(1, 'days').toDate();
  var moviesToBeHarvestedAgain = Movies.find({
    //_id : { $in: movieIdsAlreadyPresent },  // this should not be necessary
    lastModified: { $not:  { $gt: yesterday } }
  }, {
    limit: count
  }).fetch();

  var futures = moviesToBeHarvestedAgain.map(getDetailsFut);
  Future.waitAll(futures);
}

function prune(movieIdsToBeRemoved) {
  // delete movies that were removed from the website
  if (movieIdsToBeRemoved.length) {
    console.log(movieIdsToBeRemoved.length + ' movies will be removed because they are no longer available:');

    movieIdsToBeRemoved.forEach(function(id) {
      console.log(Movies.findOne(id).title);
      Movies.remove(id);
    });
  }
}

var harvestSpecificFilm1 = function (ids) {

  console.log('harvesting Film1 data');
  var before = new Date();
  var movies = getList();
  var after = new Date() - before;
  console.log('\t' + (after/1000).toFixed(1) + 's');
  console.log(movies.length + ' available on demand');
  //console.log(movies);

  // only movies need to be harvested
  movies = movies.filter(function(m){ return ids.indexOf(m.fid) > -1; });
  console.log(movies.length + ' movies to be harvested');

  var futures = movies.map(getDetailsFut);
  Future.waitAll(futures);

  after = new Date() - before;
  console.log('\t' + (after/1000).toFixed(1) + 's');

}.future();

function _movie(index, li) {
  var $li = $(li);
  var idparts = $li.find('a.hover-over').attr('id').split('_');
  var year = $li.find('h3 a').text().match(/\(\d\d\d\d\)/)[0].slice(1,5);
  return {
      cover : $li.find('a.hover-over img').attr('src'),
      fid : idparts[1],
      url : $li.find('a.hover-over').attr('href'),
      year: year
  };
}

function getList() {
  console.time('get movie list');
  var res = HTTP.get('http://www.film1.nl/film_kijken/film1_on_demand/');
  $ = cheerio.load(res.content);

  var allMovies = $('.listview').eq(1); // the first listview contains only new titles
  var rows = allMovies
      .children('.premiere').get();

  var flat = rows.reduce(function(acc, cur) {
      return acc.concat( $(cur).children('li').map(_movie).get() );
  }, []);

  // remove duplicates
  var deduped = _.uniq(flat, false, function(m) { return m.fid; });
  console.timeEnd('get movie list');
  console.log(deduped.length + ' available on demand');
  return deduped;
}


var getDetails1 = function (movie) {
  var movieId = movie.fid;
  var res = HTTP.post('http://www.film1.nl/films/ajax_get_film_info.php', {
      params: {
          movie_id: movieId,
          movie_nr: 0
      }
  });

  $ = cheerio.load(res.data.html_hoverover);
  var details = {
      duration : $('.duration').text(),
      icons : $('.info li img')
          .map(function(i, el) { return $(el).attr('src'); })
          .get(),
      imdb : {
          rating : $('.imdb-rating .rating-value').text(),
          votes : $('.imdb-rating .rating-votes').text(),
          url : $('.imdb-rating .rating-votes').attr('href')
      },
      desc : $('.teaser').text(),
      title : $('h2 a').text()
  };

  // map images to our kijkwijzer spritesheet
  details.kijkwijzer = mapKijkWijzer(details.icons);
  delete details.icons;

  return details;
}.future();



var getDetails2 = function (movie) {
  var url = movie.url;
  var res = HTTP.get('http://www.film1.nl' + url);

  $ = cheerio.load(res.content);
  var genres = $('.tab-tbl-title:contains(Genre)').next().children('a').map(function(i,el) {
      return {
          name: $(el).text(),
          url: $(el).attr('href')
      };
  }).get();

  genres.forEach(function(g) {
      var id = 'http://www.film1.nl' + g.url;
      if (!Genres.findOne(id)) {
          g._id = id;
          Genres.upsert(id, g);
      }
  });

  var availabilityString = $('.sidebar-content li:nth-child(2)').text();
  var availability = availabilityString.match(/van (.*) tot (.*)./).slice(1);
  var availableFrom = moment(availability[0], 'D MMMM YYYY').toDate();
  var availableTo = moment(availability[1], 'D MMMM YYYY').toDate();

  var trailer = $('.trailer_carousel li').get();
  var hasTrailer = !!trailer.length;

  return {
    availableFrom : availableFrom,
    availableTo : availableTo,
    genres: genres,
    hasTrailer : hasTrailer
  };
}.future();

var getDetailsFut = function (movie) {
  // get details in parallel
  var f1 = getDetails1(movie);
  var f2 = getDetails2(movie);

  // wait for both
  var details1 = f1.wait();
  var details2 = f2.wait();

  var details = _.extend(movie, details1, details2, {
    lastModified: new Date()
  });
  console.log(movie.title, movie._id);
  Movies.upsert(movie._id, details );
}.future();


_.extend(Harvest, {
  getLiveMovieList : getList,
  harvestFilm1 : harvestFilm1,
  harvestSpecificFilm1 : harvestSpecificFilm1,
  needsUpdate : needsUpdate,
  autoUpdate : autoUpdate,
  kijkwijzerConversion: kijkwijzerConversion
});

Meteor.methods({
  harvestFilm1 : harvestFilm1,
  harvestSpecificFilm1 : harvestSpecificFilm1,
  needsUpdate : needsUpdate,
  autoUpdate : autoUpdate,
  kijkwijzerConversion: kijkwijzerConversion
});


var KijkwijzerMapping = {
  'leeftijd_6_small.gif' : 'sprite_6',
  'leeftijd_9_small.gif' : 'sprite_9',
  'leeftijd_12_small.gif' : 'sprite_12',
  'leeftijd_16_small.gif' : 'sprite_16',
  'leeftijd_al_small.gif' : 'sprite_AL',
  'eng_small.gif'         : 'sprite_A',
  'discriminatie_small.gif' : 'sprite_D',
  'geweld_small.gif'      : 'sprite_G',
  'drugs_small.gif'       : 'sprite_H',
  'sex_small.gif'         : 'sprite_S',
  'groftaalgebruik'       : 'sprite_T'
};

function mapKijkWijzer(icons) {
  var kijkwijzer = [];
  if (icons) {
    icons.forEach(function(i){
      for(var img in KijkwijzerMapping) {
        if (i.indexOf(img) > -1) {
          kijkwijzer.push(KijkwijzerMapping[img]);
          return;
        }
      }
    });
  }
  return kijkwijzer;
}

function kijkwijzerConversion() {
  console.log('one-off kijkwijzer conversion');
  Movies.find().forEach(function(m) {

    var kijkwijzer = mapKijkWijzer(m.icons);
    console.log(kijkwijzer);
    Movies.update(m._id, { $set: {
      kijkwijzer: kijkwijzer
    }});

  });
}
