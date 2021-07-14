"use strict";

var {
  parseUsfm
} = require('./usfm');

var {
  parseUsx
} = require('./usx');

var {
  parseLexicon
} = require('./lexicon');

module.exports = {
  parseUsfm,
  parseUsx,
  parseLexicon
};