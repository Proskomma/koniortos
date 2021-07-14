"use strict";

var _xregexp = _interopRequireDefault(require("xregexp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var {
  lexingRegexes,
  mainRegex
} = require('../lexingRegexes');

var {
  preTokenObjectForFragment
} = require('../object_for_fragment');

var parseUsfm = (str, parser) => {
  var matches = _xregexp.default.match(str, mainRegex, 'all');

  for (var n = 0; n < matches.length; n++) {
    parser.parseItem(preTokenObjectForFragment(matches[n], lexingRegexes));
  }
};

module.exports = {
  parseUsfm
};