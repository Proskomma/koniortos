"use strict";

var {
  LexiconLexer
} = require('./lexicon_lexer');

var parseLexicon = (str, parser) => {
  new LexiconLexer().lexAndParse(str, parser);
};

module.exports = {
  parseLexicon
};