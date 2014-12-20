(function() {
  'use strict';

  this.Movies = new Ground.Collection('movies');
  this.Harvest = new Ground.Collection('harvest'); // singleton: should contain exactly 1 doc
  this.Genres = new Ground.Collection('genres');
}).apply(this);
