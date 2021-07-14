"use strict";

var serializeSuccinct = document => {
  var ret = {
    sequences: {}
  };
  ret.headers = document.headers;
  ret.mainId = document.mainId;
  ret.tags = Array.from(document.tags);

  for (var [seqId, seqOb] of Object.entries(document.sequences)) {
    ret.sequences[seqId] = serializeSuccinctSequence(seqOb);
  }

  return ret;
};

var serializeSuccinctSequence = seqOb => {
  var ret = {
    type: seqOb.type,
    blocks: seqOb.blocks.map(b => serializeSuccinctBlock(b)),
    tags: Array.from(seqOb.tags)
  };

  if (seqOb.type === 'main') {
    ret.chapters = {};

    for (var [chK, chV] of Object.entries(seqOb.chapters)) {
      ret.chapters[chK] = chV.base64();
    }

    ret.chapterVerses = {};

    for (var [chvK, chvV] of Object.entries(seqOb.chapterVerses)) {
      ret.chapterVerses[chvK] = chvV.base64();
    }

    if ('tokensPresent' in seqOb) {
      ret.tokensPresent = '0x' + seqOb.tokensPresent.toString(16);
    }
  }

  return ret;
};

var serializeSuccinctBlock = blockOb => {
  return {
    bs: blockOb.bs.base64(),
    bg: blockOb.bg.base64(),
    c: blockOb.c.base64(),
    is: blockOb.is.base64(),
    os: blockOb.os.base64(),
    nt: blockOb.nt.base64()
  };
};

module.exports = {
  serializeSuccinct
};