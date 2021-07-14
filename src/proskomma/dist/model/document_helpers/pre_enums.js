"use strict";

var {
  nComponentsForScope
} = require('proskomma-utils');

var recordPreEnums = (docSet, seq) => {
  docSet.recordPreEnum('scopeBits', '0');

  for (var block of seq.blocks) {
    for (var item of [...block.items, block.bs, ...block.bg]) {
      if (item.subType === 'wordLike') {
        docSet.recordPreEnum('wordLike', item.payload);
      } else if (['lineSpace', 'eol', 'punctuation', 'softLineBreak', 'bareSlash', 'unknown'].includes(item.subType)) {
        docSet.recordPreEnum('notWordLike', item.payload);
      } else if (item.type === 'graft') {
        docSet.recordPreEnum('graftTypes', item.subType);
      } else if (item.subType === 'start') {
        var labelBits = item.payload.split('/');

        if (labelBits.length !== nComponentsForScope(labelBits[0])) {
          throw new Error("Scope ".concat(item.payload, " has unexpected number of components"));
        }

        for (var labelBit of labelBits.slice(1)) {
          docSet.recordPreEnum('scopeBits', labelBit);
        }
      }
    }
  }
};

var rerecordPreEnums = (docSet, seq) => {
  docSet.recordPreEnum('scopeBits', '0');
  docSet.recordPreEnum('ids', seq.id);

  for (var block of seq.blocks) {
    for (var blockKey of ['bs', 'bg', 'c', 'is', 'os']) {
      rerecordBlockPreEnums(docSet, block[blockKey]);
    }
  }
};

var rerecordBlockPreEnums = (docSet, ba) => {
  for (var item of docSet.unsuccinctifyItems(ba, {}, 0)) {
    if (item[0] === 'token') {
      if (item[1] === 'wordLike') {
        docSet.recordPreEnum('wordLike', item[2]);
      } else {
        docSet.recordPreEnum('notWordLike', item[2]);
      }
    } else if (item[0] === 'graft') {
      docSet.recordPreEnum('graftTypes', item[1]);
    } else if (item[0] === 'scope' && item[1] === 'start') {
      var labelBits = item[2].split('/');

      if (labelBits.length !== nComponentsForScope(labelBits[0])) {
        throw new Error("Scope ".concat(item[2], " has unexpected number of components"));
      }

      for (var labelBit of labelBits.slice(1)) {
        docSet.recordPreEnum('scopeBits', labelBit);
      }
    }
  }
};

module.exports = {
  recordPreEnums,
  rerecordPreEnums
};