Meteor.startup(function() {
    Meteor.subscribe('movies');
    Meteor.subscribe('harvest');
    Meteor.subscribe('genres');
});

Template.movieList.helpers({
    movies: function() {
        var genre = Session.get('genre');
        var filter = genre ? { 'genres.name': genre} : {};
        console.log(filter);
        return Movies.find(filter, {
            sort: { 'imdb.rating' : -1 }
        });
    },
    count: function(movies) {
        if (movies)
        return movies.count();
    }
});

Template.genres.helpers({
    genres : function() {
        return Genres.find({}, {
            sort: { name: 1 }
        });
    }
});

Template.genres.events({
    'change [name=genre]' : function(evt) {
        var value = $(evt.currentTarget).find("option:selected" ).text()
        console.log(value);
        Session.set('genre', value);
    }
});

Template.harvest.helpers({
    harvest : function() {
        return Harvest.findOne();
    },
    lastUpdated : function() { // TODO: update every minute reactively
        return moment(this.timestamp).fromNow();
    }
});
