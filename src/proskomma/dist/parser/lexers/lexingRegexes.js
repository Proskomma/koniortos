"use strict";

var _xregexp = _interopRequireDefault(require("xregexp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var lexingRegexes = [['chapter', 'chapter', (0, _xregexp.default)('([\\r\\n]*\\\\c[ \\t]+(\\d+)[ \\t\\r\\n]*)')], ['pubchapter', 'pubchapter', (0, _xregexp.default)('([\\r\\n]*\\\\cp[ \\t]+([^\\r\\n]+)[ \\t\\r\\n]*)')], ['verses', 'verses', (0, _xregexp.default)('([\\r\\n]*\\\\v[ \\t]+([\\d\\-]+)[ \\t\\r\\n]*)')], ['attribute', 'attribute', (0, _xregexp.default)('([ \\t]*\\|?[ \\t]*([A-Za-z0-9\\-]+)="([^"]*)"[ \\t]?)')], ['milestone', 'emptyMilestone', (0, _xregexp.default)('(\\\\([a-z1-9]+)\\\\[*])')], ['milestone', 'startMilestoneTag', (0, _xregexp.default)('(\\\\([a-z1-9]+)-([se]))')], ['milestone', 'endMilestoneMarker', (0, _xregexp.default)('(\\\\([*]))')], ['tag', 'endTag', (0, _xregexp.default)('(\\\\([+]?[a-z\\-]+)([1-9]?(-([1-9]))?)[*])')], ['tag', 'startTag', (0, _xregexp.default)('(\\\\([+]?[a-z\\-]+)([1-9]?(-([1-9]))?)[ \\t]?)')], ['bad', 'bareSlash', (0, _xregexp.default)('(\\\\)')], ['printable', 'eol', (0, _xregexp.default)('([ \\t]*[\\r\\n]+[ \\t]*)')], ['break', 'noBreakSpace', (0, _xregexp.default)('~')], ['break', 'softLineBreak', (0, _xregexp.default)('//')], ['printable', 'wordLike', (0, _xregexp.default)('([\\p{Letter}\\p{Number}\\p{Mark}\\u2060]{1,127})')], ['printable', 'lineSpace', (0, _xregexp.default)('([\\p{Separator}]{1,127})')], ['printable', 'punctuation', (0, _xregexp.default)('([\\p{Punctuation}+®])')], ['bad', 'unknown', (0, _xregexp.default)('(.)')]];

var mainRegex = _xregexp.default.union(lexingRegexes.map(x => x[2]));

module.exports = {
  lexingRegexes,
  mainRegex
};