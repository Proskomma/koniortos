"use strict";

var {
  addTag,
  ByteArray,
  generateId,
  itemEnum,
  labelForScope,
  pushSuccinctGraftBytes,
  pushSuccinctScopeBytes,
  pushSuccinctTokenBytes,
  scopeEnum,
  tokenCategory,
  tokenEnum
} = require('proskomma-utils');

var {
  Block
} = require('./block');

var Sequence = class {
  constructor(sType) {
    this.id = generateId();
    this.type = sType;
    this.tags = new Set([]);
    this.blocks = [];
    this.activeScopes = [];
  }

  addTag(tag) {
    addTag(this.tags, tag);
  }

  plainText() {
    return this.blocks.map(b => b.plainText()).join('').trim();
  }

  addItem(i) {
    this.lastBlock().addItem(i);
  }

  addBlockGraft(g) {
    this.newBlock('hangingGraft');
    this.lastBlock().bg.push(g);
  }

  lastBlock() {
    if (this.blocks.length === 0) {
      this.newBlock('orphanTokens');
    }

    return this.blocks[this.blocks.length - 1];
  }

  newBlock(label) {
    if (this.blocks.length > 0 && ['orphanTokens', 'hangingGraft'].includes(this.blocks[this.blocks.length - 1].bs.payload)) {
      this.lastBlock().bs = {
        type: 'scope',
        subType: 'start',
        payload: label
      };
    } else {
      this.blocks.push(new Block(label));
    }
  }

  trim() {
    this.blocks.forEach(b => b.trim());
  }

  reorderSpanWithAtts() {
    this.blocks.forEach(b => b.reorderSpanWithAtts());
  }

  makeNoteGrafts(parser) {
    this.blocks.forEach(b => b.makeNoteGrafts(parser));
  }

  close(parser) {
    for (var activeScope of this.activeScopes.filter(() => true).reverse()) {
      this.closeActiveScope(parser, activeScope);
    }

    this.activeScopes = [];
  }

  closeActiveScope(parser, sc) {
    this.addItem({
      type: 'scope',
      subType: 'end',
      payload: sc.label
    });

    if (sc.onEnd) {
      sc.onEnd(parser, sc.label);
    }
  }

  filterGrafts(options) {
    return this.blocks.map(b => b.filterGrafts(options)).reduce((acc, current) => acc.concat(current), []);
  }

  filterScopes(options) {
    this.blocks.forEach(b => b.filterScopes(options));
  }

  text() {
    return this.blocks.map(b => b.text()).join('');
  }

  addTableScopes() {
    var inTable = false;

    for (var [blockNo, block] of this.blocks.entries()) {
      if (!inTable && block.bs.payload === 'blockTag/tr') {
        inTable = true;
        this.blocks[blockNo].items.unshift({
          type: 'scope',
          subType: 'start',
          payload: labelForScope('table', [])
        });
      } else if (inTable && block.bs.payload !== 'blockTag/tr') {
        inTable = false;
        this.blocks[blockNo - 1].items.push({
          type: 'scope',
          subType: 'end',
          payload: labelForScope('table', [])
        });
      }
    }

    if (inTable) {
      this.lastBlock().items.push({
        type: 'scope',
        subType: 'end',
        payload: labelForScope('table', [])
      });
    }
  }

  graftifyIntroductionHeadings(parser) {
    var blockEntries = [...this.blocks.entries()];
    blockEntries.reverse();
    var introHeadingTags = ['iot', 'is'].concat(parser.customTags.introHeading);

    for (var [n, block] of blockEntries) {
      var blockTag = block.bs.payload.split('/')[1].replace(/[0-9]/g, '');

      if (introHeadingTags.includes(blockTag)) {
        var headingSequence = new Sequence('heading');
        parser.sequences.heading.push(headingSequence);
        headingSequence.blocks.push(block);
        var headingGraft = {
          type: 'graft',
          subType: 'heading',
          payload: headingSequence.id
        };

        if (this.blocks.length < n + 2) {
          this.newBlock('blockTag/hangingGraft');
        }

        this.blocks[n + 1].bg.unshift(headingGraft);
        this.blocks.splice(n, 1);
      } else if (blockTag.startsWith('imt')) {
        var titleType = blockTag.startsWith('imte') ? 'introEndTitle' : 'introTitle';
        var titleSequence = void 0;

        if (parser.sequences[titleType]) {
          titleSequence = parser.sequences[titleType];
        } else {
          var graftType = blockTag.startsWith('imte') ? 'endTitle' : 'title';
          titleSequence = new Sequence(graftType);
          parser.sequences[titleType] = titleSequence;
          var titleGraft = {
            type: 'graft',
            subType: graftType,
            payload: titleSequence.id
          };

          if (this.blocks.length < n + 2) {
            this.newBlock('blockTag/hangingGraft');
          }

          this.blocks[n + 1].bg.unshift(titleGraft);
        }

        this.blocks.splice(n, 1);
        titleSequence.blocks.unshift(block);
      }
    }
  }

  moveOrphanScopes() {
    if (this.blocks.length > 1) {
      this.moveOrphanStartScopes();
      this.moveOrphanEndScopes();
    }
  }

  moveOrphanStartScopes() {
    for (var [blockNo, block] of this.blocks.entries()) {
      if (blockNo >= this.blocks.length - 1) {
        continue;
      }

      for (var item of [...block.items].reverse()) {
        if (item.subType !== 'start' || item.payload.startsWith('altChapter')) {
          break;
        }

        this.blocks[blockNo + 1].items.unshift(this.blocks[blockNo].items.pop());
      }
    }
  }

  moveOrphanEndScopes() {
    for (var [blockNo, block] of this.blocks.entries()) {
      if (blockNo === 0) {
        continue;
      }

      for (var item of [...block.items]) {
        if (item.subType !== 'end') {
          break;
        }

        this.blocks[blockNo - 1].items.push(this.blocks[blockNo].items.shift());
      }
    }
  }

  removeEmptyBlocks(customCanBeEmpty) {
    var canBeEmpty = ['blockTag/b', 'blockTag/ib'].concat(customCanBeEmpty);
    var emptyBlocks = [];
    var changed = false;

    for (var blockRecord of this.blocks.entries()) {
      if (blockRecord[1].tokens().length === 0 && !canBeEmpty.includes(blockRecord[1].bs.payload)) {
        emptyBlocks.push(blockRecord);
      }
    }

    for (var [n, block] of emptyBlocks.reverse()) {
      if (n < this.blocks.length - 1) {
        for (var bg of [...block.bg].reverse()) {
          this.blocks[n + 1].bg.unshift(bg);
        }

        for (var i of block.items.reverse()) {
          this.blocks[n + 1].items.unshift(i);
        }

        this.blocks.splice(n, 1);
        changed = true;
      } else if (block.bg.length === 0 && block.items.length === 0) {
        this.blocks.splice(n, 1);
        changed = true;
      }
    }

    if (changed) {
      this.removeEmptyBlocks(customCanBeEmpty);
    }
  }

  removeGraftsToEmptySequences(emptySequences) {
    this.blocks.forEach(b => b.removeGraftsToEmptySequences(emptySequences));
  }

  succinctifyBlocks(docSet) {
    var ret = [];
    var openScopes = [];

    var updateOpenScopes = item => {
      if (item.subType === 'start') {
        var existingScopes = openScopes.filter(s => s.payload === item.payload);

        if (existingScopes.length === 0) {
          openScopes.push(item);
        }
      } else {
        openScopes = openScopes.filter(s => s.payload !== item.payload);
      }
    };

    var nextToken = 0;

    for (var block of this.blocks) {
      var contentBA = new ByteArray(block.length);
      var blockGraftsBA = new ByteArray(1);
      var openScopesBA = new ByteArray(1);
      var includedScopesBA = new ByteArray(1);
      var nextTokenBA = new ByteArray(1);
      nextTokenBA.pushNByte(nextToken);

      for (var bg of block.bg) {
        this.pushSuccinctGraft(blockGraftsBA, docSet, bg);
      }

      for (var os of openScopes) {
        this.pushSuccinctScope(openScopesBA, docSet, os);
      }

      var includedScopes = [];

      for (var item of block.items) {
        switch (item.type) {
          case 'token':
            this.pushSuccinctToken(contentBA, docSet, item);

            if (item.subType === 'wordLike') {
              nextToken++;
            }

            break;

          case 'graft':
            this.pushSuccinctGraft(contentBA, docSet, item);
            break;

          case 'scope':
            this.pushSuccinctScope(contentBA, docSet, item);
            updateOpenScopes(item);

            if (item.subType === 'start') {
              includedScopes.push(item);
            }

            break;

          default:
            throw new Error("Item type ".concat(item.type, " is not handled in succinctifyBlocks"));
        }
      }

      var blockScopeBA = new ByteArray(10);
      this.pushSuccinctScope(blockScopeBA, docSet, block.bs);

      for (var is of includedScopes) {
        this.pushSuccinctScope(includedScopesBA, docSet, is);
      }

      contentBA.trim();
      blockGraftsBA.trim();
      blockScopeBA.trim();
      openScopesBA.trim();
      includedScopesBA.trim();
      ret.push({
        c: contentBA,
        bs: blockScopeBA,
        bg: blockGraftsBA,
        os: openScopesBA,
        is: includedScopesBA,
        nt: nextTokenBA
      });
    }

    return ret;
  }

  pushSuccinctToken(bA, docSet, item) {
    var charsEnumIndex = docSet.enumForCategoryValue(tokenCategory[item.subType], item.payload);
    pushSuccinctTokenBytes(bA, tokenEnum[item.subType], charsEnumIndex);
  }

  pushSuccinctGraft(bA, docSet, item) {
    var graftTypeEnumIndex = docSet.enumForCategoryValue('graftTypes', item.subType);
    var seqEnumIndex = docSet.enumForCategoryValue('ids', item.payload);
    pushSuccinctGraftBytes(bA, graftTypeEnumIndex, seqEnumIndex);
  }

  pushSuccinctScope(bA, docSet, item) {
    var scopeBits = item.payload.split('/');
    var scopeTypeByte = scopeEnum[scopeBits[0]];
    var scopeBitBytes = scopeBits.slice(1).map(b => docSet.enumForCategoryValue('scopeBits', b));
    pushSuccinctScopeBytes(bA, itemEnum["".concat(item.subType, "Scope")], scopeTypeByte, scopeBitBytes);
  }

};
module.exports = {
  Sequence
};