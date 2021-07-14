"use strict";

var {
  ByteArray,
  headerBytes,
  itemEnum,
  nComponentsForScope,
  pushSuccinctGraftBytes,
  pushSuccinctScopeBytes,
  pushSuccinctTokenBytes,
  scopeEnum,
  scopeEnumLabels,
  tokenEnum
} = require('proskomma-utils');

var deleteBlock = (document, seqId, blockN) => {
  if (!(seqId in document.sequences)) {
    return false;
  }

  var sequence = document.sequences[seqId];

  if (blockN < 0 || blockN >= sequence.blocks.length) {
    return false;
  }

  sequence.blocks.splice(blockN, 1);
  document.buildChapterVerseIndex(void 0);
  return true;
};

var newBlock = (document, seqId, blockN, blockScope) => {
  if (!(seqId in document.sequences)) {
    return false;
  }

  var sequence = document.sequences[seqId];

  if (blockN < 0 || blockN > sequence.blocks.length) {
    return false;
  }

  var docSet = document.processor.docSets[document.docSetId];
  docSet.maybeBuildPreEnums();
  var newBlock = {
    bs: new ByteArray(0),
    bg: new ByteArray(0),
    c: new ByteArray(0),
    os: new ByteArray(0),
    is: new ByteArray(0)
  };
  var scopeBits = blockScope.split('/');
  var scopeTypeByte = scopeEnum[scopeBits[0]];
  var expectedNScopeBits = nComponentsForScope(scopeBits[0]);

  if (scopeBits.length !== expectedNScopeBits) {
    throw new Error("Scope ".concat(blockScope, " has ").concat(scopeBits.length, " component(s) (expected ").concat(expectedNScopeBits));
  }

  var scopeBitBytes = scopeBits.slice(1).map(b => docSet.enumForCategoryValue('scopeBits', b, true));
  pushSuccinctScopeBytes(newBlock.bs, itemEnum["startScope"], scopeTypeByte, scopeBitBytes);
  sequence.blocks.splice(blockN, 0, newBlock);
  document.buildChapterVerseIndex(void 0);
  return true;
};

var rewriteBlock = (block, oldToNew) => {
  for (var blockKey of ['bs', 'bg', 'c', 'is', 'os']) {
    var oldBa = block[blockKey];
    var newBa = new ByteArray(oldBa.length);
    var pos = 0;

    while (pos < oldBa.length) {
      var [itemLength, itemType, itemSubtype] = headerBytes(oldBa, pos);

      if (itemType === itemEnum['token']) {
        if (itemSubtype === tokenEnum.wordLike) {
          pushSuccinctTokenBytes(newBa, itemSubtype, oldToNew.wordLike[oldBa.nByte(pos + 2)]);
        } else {
          pushSuccinctTokenBytes(newBa, itemSubtype, oldToNew.notWordLike[oldBa.nByte(pos + 2)]);
        }
      } else if (itemType === itemEnum['graft']) {
        pushSuccinctGraftBytes(newBa, oldToNew.graftTypes[itemSubtype], oldToNew.ids[oldBa.nByte(pos + 2)]);
      } else {
        var nScopeBitBytes = nComponentsForScope(scopeEnumLabels[itemSubtype]);
        var scopeBitBytes = [];
        var offset = 2;

        while (nScopeBitBytes > 1) {
          var scopeBitByte = oldToNew.scopeBits[oldBa.nByte(pos + offset)];
          scopeBitBytes.push(scopeBitByte);
          offset += oldBa.nByteLength(scopeBitByte);
          nScopeBitBytes--;
        }

        pushSuccinctScopeBytes(newBa, itemType, itemSubtype, scopeBitBytes);
      }

      pos += itemLength;
    }

    newBa.trim();
    block[blockKey] = newBa;
  }
};

module.exports = {
  newBlock,
  deleteBlock,
  rewriteBlock
};