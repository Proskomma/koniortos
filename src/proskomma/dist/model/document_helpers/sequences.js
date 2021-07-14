"use strict";

var deepCopy = require('deep-copy-all');

var {
  generateId,
  headerBytes,
  itemEnum,
  succinctGraftSeqId
} = require('proskomma-utils');

var gcSequences = document => {
  var usedSequences = new Set();
  var docSet = document.processor.docSets[document.docSetId];
  docSet.maybeBuildEnumIndexes();

  var followGrafts = (document, sequence, used) => {
    used.add(sequence.id);

    for (var block of sequence.blocks) {
      for (var blockGraft of docSet.unsuccinctifyGrafts(block.bg)) {
        if (!used.has(blockGraft[2])) {
          followGrafts(document, document.sequences[blockGraft[2]], used);
        }
      }

      for (var inlineGraft of docSet.unsuccinctifyItems(block.c, {
        grafts: true
      }, 0)) {
        if (!used.has(inlineGraft[2])) {
          followGrafts(document, document.sequences[inlineGraft[2]], used);
        }
      }
    }
  };

  followGrafts(document, document.sequences[document.mainId], usedSequences);
  var changed = false;

  for (var sequenceId of Object.keys(document.sequences)) {
    if (!usedSequences.has(sequenceId)) {
      delete document.sequences[sequenceId];
      changed = true;
    }
  }

  return changed;
};

var newSequence = (document, seqType) => {
  var seqId = generateId();
  document.sequences[seqId] = {
    id: seqId,
    type: seqType,
    tags: new Set(),
    isBaseType: seqType in document.baseSequenceTypes,
    blocks: []
  };
  return seqId;
};

var deleteSequence = (document, seqId) => {
  if (!(seqId in document.sequences)) {
    return false;
  }

  if (document.sequences[seqId].type === 'main') {
    throw new Error('Cannot delete main sequence');
  }

  if (document.sequences[seqId].type in document.baseSequenceTypes) {
    gcSequenceReferences(document, 'block', seqId);
  } else {
    gcSequenceReferences(document, 'inline', seqId);
  }

  delete document.sequences[seqId];
  document.buildChapterVerseIndex(void 0);
  document.gcSequences();
  return true;
};

var gcSequenceReferences = (document, seqContext, seqId) => {
  var docSet = document.processor.docSets[document.docSetId];

  for (var sequence of Object.values(document.sequences)) {
    for (var block of sequence.blocks) {
      var succinct = seqContext === 'block' ? block.bg : block.c;
      var pos = 0;

      while (pos < succinct.length) {
        var [itemLength, itemType] = headerBytes(succinct, pos);

        if (itemType !== itemEnum.graft) {
          pos += itemLength;
        } else {
          var graftSeqId = succinctGraftSeqId(docSet.enums, docSet.enumIndexes, succinct, pos);

          if (graftSeqId === seqId) {
            succinct.deleteItem(pos);
          } else {
            pos += itemLength;
          }
        }
      }
    }
  }
};

var modifySequence = (document, seqId, sequenceRewriteFunc, blockFilterFunc, itemFilterFunc, blockRewriteFunc, itemRewriteFunc) => {
  var docSet = document.processor.docSets[document.docSetId];
  docSet.maybeBuildEnumIndexes();

  sequenceRewriteFunc = sequenceRewriteFunc || (s => s);

  var oldSequence = document.sequences[seqId];
  var newSequence = sequenceRewriteFunc({
    id: seqId,
    type: oldSequence.type,
    tags: oldSequence.tags,
    isBaseType: oldSequence.isBaseType,
    verseMapping: oldSequence.verseMapping
  });
  pushModifiedBlocks(oldSequence, newSequence, blockFilterFunc, itemFilterFunc, blockRewriteFunc, itemRewriteFunc);
  document.sequences[seqId] = newSequence;

  if (newSequence.type === 'main') {
    document.buildChapterVerseIndex();
  }

  return newSequence;
};

var pushModifiedBlocks = (oldSequence, newSequence, blockFilterFunc, itemFilterFunc, blockRewriteFunc, itemRewriteFunc) => {
  blockFilterFunc = blockFilterFunc || ((oldSequence, blockN, block) => !!block);

  itemFilterFunc = itemFilterFunc || ((oldSequence, oldBlockN, block, itemN, itemType, itemSubType, pos) => !!block || pos);

  blockRewriteFunc = blockRewriteFunc || ((oldSequence, blockN, block) => block);

  itemRewriteFunc = itemRewriteFunc || ((oldSequence, oldBlockN, oldBlock, newBlock, itemN, itemLength, itemType, itemSubType, pos) => {
    for (var n = 0; n < itemLength; n++) {
      newBlock.c.pushByte(oldBlock.c.byte(pos + n));
    }
  });

  newSequence.blocks = [];

  for (var [blockN, block] of oldSequence.blocks.entries()) {
    if (blockFilterFunc(oldSequence, blockN, block)) {
      var newBlock = blockRewriteFunc(oldSequence, blockN, deepCopy(block));
      newBlock.c.clear();
      modifyBlockItems(oldSequence, blockN, block, newBlock, itemFilterFunc, itemRewriteFunc);
      newSequence.blocks.push(newBlock);
    }
  }
};

var modifyBlockItems = (oldSequence, oldBlockN, oldBlock, newBlock, itemFilterFunc, itemRewriteFunc) => {
  var pos = 0;
  var itemN = -1;

  while (pos < oldBlock.c.length) {
    itemN++;
    var [itemLength, itemType, itemSubtype] = headerBytes(oldBlock.c, pos);

    if (itemFilterFunc(oldSequence, oldBlockN, oldBlock, itemN, itemType, itemSubtype, pos)) {
      itemRewriteFunc(oldSequence, oldBlockN, oldBlock, newBlock, itemN, itemLength, itemType, itemSubtype, pos);
    }

    pos += itemLength;
  }
};

module.exports = {
  newSequence,
  gcSequences,
  deleteSequence,
  modifySequence
};