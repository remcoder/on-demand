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
    Harvest.harvestFilm1();
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
  var daysAgo = moment.duration(new Date() - harvest.timestamp).asDays();
  if (daysAgo > 1) {
    console.log('harvest is '+ daysAgo +' day(s) old');
    return true;
  }

  return false;
}

var harvestFilm1 = function (force) {
  Harvest.upsert('singleton', {
    started   : new Date(),
    finished  : null,
    timestamp : new Date()
  });

  var existing = force ? [] : Movies.find().map(function(movie) { return movie._id; });

  console.log('harvesting Film1 data');
  var before = new Date();
  var movies = getList();
  var after = new Date() - before;
  console.log('\t' + (after/1000).toFixed(1) + 's');
  console.log(movies.length + ' available on demand');
  //console.log(movies);

  var ids = _.pluck(movies, '_id');
  var newMovies = _.difference(ids, existing);
  var oldMovies = _.difference(existing, ids);

  // only new movies need to be harvested
  movies = movies.filter(function(m){ return newMovies.indexOf(m._id) > -1; });
  console.log(movies.length + ' new movies to be harvested');

  var futures = movies.map(getDetailsFut);
  Future.waitAll(futures);

  after = new Date() - before;
  console.log('\t' + (after/1000).toFixed(1) + 's');

  if (oldMovies.length) {
    console.log(oldMovies.length + ' movies will be removed because they are no longer available:');

    oldMovies.forEach(function(oldId) {
      console.log(Movies.findOne(oldId).title);
      Movies.remove(oldId);
    });
  }

  Harvest.upsert('singleton', {
      finished: new Date(),
      timestamp: new Date()
  });
}.future();

function _movie(index, li) {
  var $li = $(li);
  var idparts = $li.find('a.hover-over').attr('id').split('_');
  var when = $li.find('h3 + span').text().trim();
  var nowAvailable = when.toLowerCase() == 'nu te zien';
  return {
      fid : idparts[1] ,
      cover : $li.find('a.hover-over img').attr('src'),
      url : $li.find('a.hover-over').attr('href'),
      when : when,
      nowAvailable : nowAvailable
  };
}
function getList() {
  var res = HTTP.get('http://www.film1.nl/film_kijken/film1_on_demand/');
  $ = cheerio.load(res.content);

  var allMovies = $('.listview').eq(1); // the first listview contains only new titles
  var rows = allMovies
      .children('.premiere').get();

  var flat = rows.reduce(function(acc, cur) {
      return acc.concat( $(cur).children('li').map(_movie).get() );
  }, []);

  var unique = {};
  var deduped = flat.filter(function(m) {
    m._id = 'film1_' + m.fid;

    //Duplicates probably occur b/c different availabilities.
    //For now we're only interested in what's available now
    if (m._id in unique) {
      if (m.nowAvailable || unique[m._id].nowAvailable)
        unique[m._id].nowAvailable = true;

      console.log('skipping dupe:', m.url)
      return false;
    }

    unique[m._id] = m;
    return true;

  });

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

  return {
      genres: genres
  };
}.future();

var getDetailsFut = function (movie) {
  // get details in parallel
  var f1 = getDetails1(movie);
  var f2 = getDetails2(movie);

  // wait for both
  var details1 = f1.wait();
  var details2 = f2.wait();

  var details = _.extend(movie, details1, details2);
  console.log(movie.title);
  Movies.upsert(movie._id, details );
}.future();

var exports = {
  harvestFilm1 : harvestFilm1,
  needsUpdate : needsUpdate,
  autoUpdate : autoUpdate,
  kijkwijzerConversion: kijkwijzerConversion
};
Meteor.methods(exports);
_.extend(Harvest, exports);

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
};

function kijkwijzerConversion() {
  console.log('one-off kijkwijzer conversion');
  Movies.find().forEach(function(m) {

    var kijkwijzer = mapKijkWijzer(m.icons);
    console.log(kijkwijzer);
    Movies.update(m._id, { $set: {
      kijkwijzer: kijkwijzer
    }});

  });
};
