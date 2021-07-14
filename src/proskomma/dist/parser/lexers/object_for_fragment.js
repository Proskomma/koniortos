"use strict";

var _xregexp = _interopRequireDefault(require("xregexp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var makePrintable = (subclass, matchedBits) => ({
  subclass,
  printValue: matchedBits[0]
});

var makeChapter = (subclass, matchedBits) => ({
  subclass,
  numberString: matchedBits[2],
  number: parseInt(matchedBits[2]),
  printValue: "\\c ".concat(matchedBits[2], "\n")
});

var makeVerses = (subclass, matchedBits) => {
  var ret = {
    subclass,
    numberString: matchedBits[2],
    printValue: "\\v ".concat(matchedBits[2], "\n")
  };

  if (ret.numberString.includes('-')) {
    var [fromV, toV] = ret.numberString.split('-').map(v => parseInt(v));
    ret.numbers = Array.from(Array(toV - fromV + 1).keys()).map(v => v + fromV);
  } else {
    ret.numbers = [parseInt(ret.numberString)];
  }

  return ret;
};

var makeAttribute = (subclass, matchedBits) => {
  var ret = {
    subclass,
    key: matchedBits[2],
    valueString: matchedBits[3].trim().replace(/\//g, '÷')
  };
  ret.values = ret.valueString.split(',').map(vb => vb.trim());
  ret.printValue = "| ".concat(ret.key, "=\"").concat(ret.valueString, "\"");
  return ret;
};

var makePubChapter = (subclass, matchedBits) => ({
  subclass,
  numberString: matchedBits[2],
  printValue: "\\cp ".concat(matchedBits[2], "\n")
});

var makeMilestone = (subclass, matchedBits) => {
  var ret = {
    subclass,
    sOrE: null
  };

  if (subclass === 'endMilestoneMarker') {
    ret.printValue = '\\*';
  } else {
    ret.tagName = matchedBits[2];

    if (subclass === 'emptyMilestone') {
      ret.printValue = "\\".concat(ret.tagName, "\\*");
    } else {
      ret.printValue = "\\".concat(ret.tagName);
      ret.sOrE = matchedBits[3];
    }
  }

  return ret;
};

var makeTag = (subclass, matchedBits) => {
  var ret = {
    subclass,
    tagName: matchedBits[2],
    isNested: false
  };

  if (ret.tagName.startsWith('+')) {
    ret.isNested = true;
    ret.tagName = ret.tagName.substring(1);
  }

  ret.tagLevel = matchedBits[3] !== '' ? parseInt(matchedBits[3]) : 1;
  ret.fullTagName = "".concat(ret.tagName).concat(matchedBits[3] === '1' ? '' : matchedBits[3]);
  ret.printValue = subclass === 'startTag' ? "\\".concat(ret.fullTagName, " ") : "\\".concat(ret.fullTagName, "*");
  return ret;
};

var constructorForFragment = {
  printable: makePrintable,
  chapter: makeChapter,
  pubchapter: makePubChapter,
  verses: makeVerses,
  tag: makeTag,
  break: makePrintable,
  milestone: makeMilestone,
  attribute: makeAttribute,
  bad: makePrintable
};

var preTokenObjectForFragment = (fragment, lexingRegexes) => {
  for (var n = 0; n < lexingRegexes.length; n++) {
    var [tClass, tSubclass, tRE] = lexingRegexes[n];

    var matchedBits = _xregexp.default.exec(fragment, tRE, 0, 'sticky');

    if (matchedBits) {
      return constructorForFragment[tClass](tSubclass, matchedBits);
    }
  }

  throw new Error("Could not match preToken fragment '".concat(fragment, "'"));
};

module.exports = {
  constructorForFragment,
  preTokenObjectForFragment
};