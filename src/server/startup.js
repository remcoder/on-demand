
var cheerio = Meteor.npmRequire('cheerio');
Meteor.startup(function(){

    // harvest daily
    Meteor.setInterval(function() {
            harvestFilm1();
    }, 24 * 60* 60 * 1000);

    Meteor.publish('harvest', function() { return Harvest.find({}); });
    Meteor.publish('genres', function() { return Genres.find({}); });

    Meteor.publish('movies', function() {

        return Movies.find({
            nowAvailable : true,
        }, {
            sort: { 'imdb.rating' : -1 }
        });
    });
});

// function shouldHarvest() {
//     var harvest = Harvest.findOne();
//     if (!harvest) {
//         console.log('no previous harvest found')
//         Harvest.insert({ _id : 'singleton' });
//         return true;
//     }

//     // harvest 1x /day
//     var isAtLeast1DayAgo = moment.duration(new Date - harvest.timestamp) > 1;
//     if (isAtLeast1DayAgo) console.log('harvest is at least 1 day old');
//     return isAtLeast1DayAgo;
// }

