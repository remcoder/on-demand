function harvestFilm1() {
    Harvest.upsert('singleton', {
        timestamp: new Date,
    });

    console.log('harvesting Film1 data')
    getList(function(movies) {
        movies.forEach(function(movie){
            // var doc = Movies.findOne('film1_' + movie.fid);
            // if (doc) return;

            movie._id = 'film1_' + movie.fid;

            getDetails(movie.fid, function(details) {
                _.extend(movie, details);
                //console.log(movie)
                Movies.upsert('film1_' + movie.fid, movie);
            });


            getDetails2(movie.url, function(details) {

                //console.log(movie)
                Movies.upsert('film1_' + movie.fid, { $set : details });
            });
        })
    });
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
            console.error(err)
            console.log(res.content);
        }
        $ = cheerio.load(res.content);

        var allMovies = $('.listview').eq(1); // the first listview contains only new titles
        var rows = allMovies
            .children('.premiere').get();



        var flat = rows.reduce(function(acc, cur) {
            return acc.concat( $(cur).children('li').map(_movie).get() );
        }, []);

        // console.log(flat);
        fun(flat);
    });
}

function getDetails(movieId, fun) {
    HTTP.post('http://www.film1.nl/films/ajax_get_film_info.php', {
        params: {
            movie_id: movieId,
            movie_nr: 0
        }
    }, function(err, res) {
        if( err) {
            console.error(err)
            console.log(res.data.html_hoverover);
        }

        $ = cheerio.load(res.data.html_hoverover);
        var extract = {
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
        }

        // console.log(extract);
        fun(extract);
    })
}

function getDetails2(url, fun) {
    console.log('url', url);
    HTTP.get('http://www.film1.nl' + url, function(err, res) {
        if (err) {
            console.error(err);
            console.log(res);
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

        fun({
            genres: genres
        });
    });
}


Meteor.methods({
    harvestFilm1 : harvestFilm1
});

this.harvestFilm1 = harvestFilm1;
