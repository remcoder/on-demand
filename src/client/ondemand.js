Meteor.startup(function() {
    Meteor.subscribe('movies');
    Meteor.subscribe('harvest');
    Meteor.subscribe('genres');
});

Template.movieList.helpers({
    movies: function() {
        var filter = {};

        var genre = Session.get('genre');
        if (genre)
            _.extend(filter, { 'genres.name': genre });
        var fullTextSearch = Session.get('fullTextSearch');
        if (fullTextSearch)
            _.extend(filter, { title: new RegExp(fullTextSearch,'i') });
        console.log(filter);
        return Movies.find(filter, {
            sort: [ ['imdb.rating', 'desc'], 'title']
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

Template.fullTextSearch.helpers({
    value : function() {
        return Session.get('fullTextSearch');
    }
});

function setFullTextSearch(evt) {
        var value = $(evt.currentTarget).val();
        console.log(value);
        Session.set('fullTextSearch' , value);
    }

Template.fullTextSearch.events({
    'search [type=search]' : setFullTextSearch
});

Template.harvest.helpers({
    harvest : function() {
        return Harvest.findOne();
    },
    lastUpdated : function() { // TODO: update every minute reactively
        return moment(this.timestamp).fromNow();
    }
});
