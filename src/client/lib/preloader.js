var global = this;

global.preloadingFinished = new ReactiveVar(false);

Template.preloader.rendered = function() {
  this.$('img')
    .load(function() {
      console.log('image preloaded!');
      global.preloadingFinished.set(true);
    })
    .attr('src', 'kijkwijzer.png');
};
