var global = this;

global.preloadingFinished = new ReactiveVar(false);

// FIXME: wait for all images
// TODO: inject img tags dynamically
Template.preloader.rendered = function() {
  this.$('img').eq(0)
    .load(function() {
      console.log('image 1 preloaded!');
      global.preloadingFinished.set(true);
    })
    .attr('src', 'kijkwijzer.png');

  this.$('img').eq(1)
    .load(function() {
      console.log('image 2 preloaded!');
      global.preloadingFinished.set(true);
    })
    .attr('src', 'Gids.png');
};
