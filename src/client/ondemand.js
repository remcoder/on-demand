Template.movieList.helpers({
    movies: function() {
        return Movies.find({}, {
            sort: { 'imdb.rating' : -1 }
        });
    }
});
