"use strict";

var {
  ByteArray,
  headerBytes,
  itemEnum
} = require('proskomma-utils');

var succinctFilter = (document, filterOptions) => {
  if (!filterOptions || Object.keys(filterOptions).length === 0) {
    return;
  }

  var docSet = document.processor.docSets[document.docSetId];

  var filterItem = (oldSequence, oldBlockN, block, itemN, itemType, itemSubType, pos) => {
    if (itemType === itemEnum.token) {
      return true;
    } else if (itemType === itemEnum.startScope || itemType === itemEnum.endScope) {
      if (!filterOptions.includeScopes && !filterOptions.excludeScopes) {
        return true;
      } else {
        var scopeOb = docSet.unsuccinctifyScope(block.c, itemType, itemSubType, pos);
        return (!filterOptions.includeScopes || filterOptions.includeScopes.filter(op => scopeOb[2].startsWith(op)).length > 0) && (!filterOptions.excludeScopes || filterOptions.excludeScopes.filter(op => scopeOb[2].startsWith(op)).length === 0);
      }
    } else {
      // graft
      if (!filterOptions.includeGrafts && !filterOptions.excludeGrafts) {
        return true;
      }

      var graftOb = docSet.unsuccinctifyGraft(block.c, itemSubType, pos);
      return (!filterOptions.includeGrafts || filterOptions.includeGrafts.filter(op => graftOb[1].startsWith(op)).length > 0) && (!filterOptions.excludeGrafts || filterOptions.excludeGrafts.filter(op => graftOb[1].startsWith(op)).length === 0);
    }
  };

  var rewriteBlock = (oldSequence, blockN, block) => {
    var newBA = new ByteArray(block.bg.length);
    var pos = 0;

    var _loop = function _loop() {
      var [itemLength, itemType, itemSubtype] = headerBytes(block.bg, pos);
      var graftOb = docSet.unsuccinctifyGraft(block.bg, itemSubtype, pos);

      if ((!filterOptions.includeGrafts || filterOptions.includeGrafts.filter(op => graftOb[1].startsWith(op)).length > 0) && (!filterOptions.excludeGrafts || filterOptions.excludeGrafts.filter(op => graftOb[1].startsWith(op)).length === 0)) {
        for (var n = 0; n < itemLength; n++) {
          newBA.pushByte(block.bg.byte(pos + n));
        }
      }

      pos += itemLength;
    };

    while (pos < block.bg.length) {
      _loop();
    }

    newBA.trim();
    block.bg = newBA;
    return block;
  };

  Object.keys(document.sequences).forEach(seqId => {
    document.modifySequence(seqId, null, null, filterItem, rewriteBlock, null);
  });
  Object.values(document.sequences).forEach(seq => docSet.updateBlockIndexesAfterFilter(seq));
  document.gcSequences();
};

module.exports = {
  succinctFilter
};