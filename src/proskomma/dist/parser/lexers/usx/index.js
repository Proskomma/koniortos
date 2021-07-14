"use strict";

var _xregexp = _interopRequireDefault(require("xregexp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var {
  UsxLexer
} = require("./usx_lexer");

var parseUsx = (str, parser) => {
  new UsxLexer().lexAndParse(str, parser);
};

module.exports = {
  parseUsx
};