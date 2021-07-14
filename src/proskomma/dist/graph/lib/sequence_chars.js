"use strict";

var _proskommaUtils = require("proskomma-utils");

var exactSearchTermIndexes = (docSet, chars, allChars) => {
  var charsIndexesArray = [chars.map(c => [(0, _proskommaUtils.enumStringIndex)(docSet.enums.wordLike, c)])];

  if (allChars) {
    charsIndexesArray = charsIndexesArray[0];
  } else {
    charsIndexesArray = charsIndexesArray.map(ci => ci.reduce((a, b) => a.concat(b)));
  }

  return charsIndexesArray;
};

var regexSearchTermIndexes = (docSet, chars, allChars) => {
  var charsIndexesArray = [chars.map(c => (0, _proskommaUtils.enumRegexIndexTuples)(docSet.enums.wordLike, c).map(tup => tup[0]))];

  if (allChars) {
    charsIndexesArray = charsIndexesArray[0];
  } else {
    charsIndexesArray = charsIndexesArray.map(ci => ci.reduce((a, b) => a.concat(b)));
  }

  return charsIndexesArray;
};

var sequenceMatchesSearchTerms = (seq, charsIndexesArray, allChars) => {
  if (allChars && charsIndexesArray.filter(i => i.length === 0).length > 0) {
    return false;
  }

  charsIndexesArray = charsIndexesArray.filter(i => i.length > 0);

  if (charsIndexesArray.length === 0) {
    return false;
  }

  for (var charsIndexes of charsIndexesArray) {
    var found = false;

    for (var charsIndex of charsIndexes) {
      var isPresent = charsIndex >= 0 && seq.tokensPresent.get(charsIndex) > 0;

      if (isPresent) {
        found = true;
        break;
      }
    }

    if (allChars && !found) {
      return false;
    } else if (!allChars && found) {
      return true;
    }
  }

  return allChars;
};

var sequenceHasChars = (docSet, seq, chars, allChars) => {
  var charsIndexesArray = exactSearchTermIndexes(docSet, chars, allChars);
  return sequenceMatchesSearchTerms(seq, charsIndexesArray, allChars);
};

var sequenceHasMatchingChars = (docSet, seq, chars, allChars) => {
  var charsIndexesArray = regexSearchTermIndexes(docSet, chars, allChars);
  return sequenceMatchesSearchTerms(seq, charsIndexesArray, allChars);
};

module.exports = {
  sequenceHasChars,
  sequenceHasMatchingChars,
  // sequenceMatchesSearchTerms,
  regexSearchTermIndexes,
  exactSearchTermIndexes
};