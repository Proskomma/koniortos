"use strict";

var BitSet = require('bitset');

var {
  ByteArray,
  headerBytes,
  itemEnum,
  tokenEnum
} = require('proskomma-utils');

var emptyCVIndexType = 0;
var shortCVIndexType = 2;
var longCVIndexType = 3;

var buildChapterVerseIndex = document => {
  var mainSequence = document.sequences[document.mainId];
  var docSet = document.processor.docSets[document.docSetId];
  docSet.buildPreEnums();
  docSet.buildEnumIndexes();
  var chapterVerseIndexes = {};
  var chapterIndexes = {};
  var chapterN = '0';
  var verseN = '0';
  var verses = '1';
  var nextTokenN = 0;
  mainSequence.chapterVerses = {};
  mainSequence.tokensPresent = new BitSet(new Array(docSet.enums.wordLike.length).fill(0).map(b => b.toString()).join(''));

  for (var [blockN, block] of mainSequence.blocks.entries()) {
    var pos = 0;
    var succinct = block.c;
    var itemN = -1;

    while (pos < succinct.length) {
      itemN++;
      var [itemLength, itemType, itemSubtype] = headerBytes(succinct, pos);

      if (itemType === itemEnum['startScope']) {
        var scopeLabel = docSet.succinctScopeLabel(succinct, itemSubtype, pos);

        if (scopeLabel.startsWith('chapter/')) {
          chapterN = scopeLabel.split('/')[1];
          chapterVerseIndexes[chapterN] = {};
          chapterIndexes[chapterN] = {
            startBlock: blockN,
            startItem: itemN,
            nextToken: nextTokenN
          };
        } else if (scopeLabel.startsWith('verse/')) {
          verseN = scopeLabel.split('/')[1];

          if (verseN === '1' && !('0' in chapterVerseIndexes[chapterN])) {
            if (chapterIndexes[chapterN].nextToken < nextTokenN) {
              chapterVerseIndexes[chapterN]['0'] = [{
                startBlock: chapterIndexes[chapterN].startBlock,
                startItem: chapterIndexes[chapterN].startItem,
                endBlock: blockN,
                endItem: Math.max(itemN - 1, 0),
                nextToken: chapterIndexes[chapterN].nextToken,
                verses: '0'
              }];
            }
          }

          if (!(verseN in chapterVerseIndexes[chapterN])) {
            chapterVerseIndexes[chapterN][verseN] = [];
          }

          chapterVerseIndexes[chapterN][verseN].push({
            startBlock: blockN,
            startItem: itemN,
            nextToken: nextTokenN
          });
        } else if (scopeLabel.startsWith('verses/')) {
          verses = scopeLabel.split('/')[1];
        }
      } else if (itemType === itemEnum['endScope']) {
        var _scopeLabel = docSet.succinctScopeLabel(succinct, itemSubtype, pos);

        if (_scopeLabel.startsWith('chapter/')) {
          chapterN = _scopeLabel.split('/')[1];
          var chapterRecord = chapterIndexes[chapterN];

          if (chapterRecord) {
            // Check start chapter has not been deleted
            chapterRecord.endBlock = blockN;
            chapterRecord.endItem = itemN;
          }
        } else if (_scopeLabel.startsWith('verse/')) {
          verseN = _scopeLabel.split('/')[1];
          var versesRecord = chapterVerseIndexes[chapterN][verseN];

          if (versesRecord) {
            // Check start verse has not been deleted
            var verseRecord = chapterVerseIndexes[chapterN][verseN][chapterVerseIndexes[chapterN][verseN].length - 1];
            verseRecord.endBlock = blockN;
            verseRecord.endItem = itemN;
            verseRecord.verses = verses;
          }
        }
      } else if (itemType === itemEnum['token'] && itemSubtype === tokenEnum['wordLike']) {
        mainSequence.tokensPresent.set(succinct.nByte(pos + 2), 1);
        nextTokenN++;
      }

      pos += itemLength;
    }
  }

  for (var [_chapterN, chapterVerses] of Object.entries(chapterVerseIndexes)) {
    var ba = new ByteArray();
    mainSequence.chapterVerses[_chapterN] = ba;
    var sortedVerses = Object.keys(chapterVerses).map(n => parseInt(n)).sort((a, b) => a - b);

    if (sortedVerses.length === 0) {
      continue;
    }

    var maxVerse = sortedVerses[sortedVerses.length - 1];
    var verseSlots = Array.from(Array(maxVerse + 1).keys());
    var _pos = 0;

    for (var verseSlot of verseSlots) {
      var verseKey = "".concat(verseSlot);

      if (verseKey in chapterVerses) {
        var verseElements = chapterVerses[verseKey];
        var nVerseElements = verseElements.length;

        for (var [verseElementN, verseElement] of verseElements.entries()) {
          var versesEnumIndex = docSet.enumForCategoryValue('scopeBits', verseElement.verses);
          var recordType = verseElement.startBlock === verseElement.endBlock ? shortCVIndexType : longCVIndexType;
          ba.pushByte(0);

          if (recordType === shortCVIndexType) {
            ba.pushNBytes([verseElement.startBlock, verseElement.startItem, verseElement.endItem, verseElement.nextToken, versesEnumIndex]);
          } else {
            ba.pushNBytes([verseElement.startBlock, verseElement.endBlock, verseElement.startItem, verseElement.endItem, verseElement.nextToken, versesEnumIndex]);
          }

          ba.setByte(_pos, makeVerseLengthByte(recordType, verseElementN === nVerseElements - 1, ba.length - _pos));
          _pos = ba.length;
        }
      } else {
        ba.pushByte(makeVerseLengthByte(emptyCVIndexType, true, 1));
        _pos++;
      }
    }

    ba.trim();
  }

  mainSequence.chapters = {};

  for (var [_chapterN2, chapterElement] of Object.entries(chapterIndexes)) {
    if (!('startBlock' in chapterElement) || !('endBlock' in chapterElement)) {
      continue;
    }

    var _ba = new ByteArray();

    mainSequence.chapters[_chapterN2] = _ba;

    var _recordType = chapterElement.startBlock === chapterElement.endBlock ? shortCVIndexType : longCVIndexType;

    _ba.pushByte(0);

    if (_recordType === shortCVIndexType) {
      _ba.pushNBytes([chapterElement.startBlock, chapterElement.startItem, chapterElement.endItem, chapterElement.nextToken]);
    } else {
      _ba.pushNBytes([chapterElement.startBlock, chapterElement.endBlock, chapterElement.startItem, chapterElement.endItem, chapterElement.nextToken]);
    }

    _ba.setByte(0, makeVerseLengthByte(_recordType, true, _ba.length));

    _ba.trim();
  }
};

var chapterVerseIndex = (document, chapN) => {
  var docSet = document.processor.docSets[document.docSetId];
  docSet.buildEnumIndexes();
  var ret = [];
  var succinct = document.sequences[document.mainId].chapterVerses[chapN];

  if (succinct) {
    var pos = 0;
    var currentVerseRecord = [];

    while (pos < succinct.length) {
      var [recordType, isLast, recordLength] = verseLengthByte(succinct, pos);

      if (recordType === shortCVIndexType) {
        var nBytes = succinct.nBytes(pos + 1, 5);
        currentVerseRecord.push({
          startBlock: nBytes[0],
          endBlock: nBytes[0],
          startItem: nBytes[1],
          endItem: nBytes[2],
          nextToken: nBytes[3],
          verses: docSet.enums.scopeBits.countedString(docSet.enumIndexes.scopeBits[nBytes[4]])
        });
      } else if (recordType === longCVIndexType) {
        var _nBytes = succinct.nBytes(pos + 1, 6);

        currentVerseRecord.push({
          startBlock: _nBytes[0],
          endBlock: _nBytes[1],
          startItem: _nBytes[2],
          endItem: _nBytes[3],
          nextToken: _nBytes[4],
          verses: docSet.enums.scopeBits.countedString(docSet.enumIndexes.scopeBits[_nBytes[5]])
        });
      }

      if (isLast) {
        ret.push(currentVerseRecord);
        currentVerseRecord = [];
      }

      pos += recordLength;
    }
  }

  return ret;
};

var chapterIndex = (document, chapN) => {
  var succinct = document.sequences[document.mainId].chapters[chapN];

  if (succinct) {
    var recordType = verseLengthByte(succinct, 0)[0];

    if (recordType === shortCVIndexType) {
      var nBytes = succinct.nBytes(1, 4);
      return {
        startBlock: nBytes[0],
        endBlock: nBytes[0],
        startItem: nBytes[1],
        endItem: nBytes[2],
        nextToken: nBytes[3]
      };
    } else if (recordType === longCVIndexType) {
      var _nBytes2 = succinct.nBytes(1, 5);

      return {
        startBlock: _nBytes2[0],
        endBlock: _nBytes2[1],
        startItem: _nBytes2[2],
        endItem: _nBytes2[3],
        nextToken: _nBytes2[4]
      };
    }
  }
};

var makeVerseLengthByte = (recordType, isLast, length) => {
  return length + (isLast ? 32 : 0) + recordType * 64;
};

var verseLengthByte = (succinct, pos) => {
  var sByte = succinct.byte(pos);
  return [sByte >> 6, (sByte >> 5) % 2 === 1, sByte % 32];
};

module.exports = {
  buildChapterVerseIndex,
  chapterVerseIndex,
  chapterIndex
};