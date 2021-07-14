"use strict";

var {
  addTag,
  generateId,
  parserConstants,
  removeTag,
  validateTags
} = require('proskomma-utils');

/*
var {
  parseUsfm,
  parseUsx,
  parseLexicon
} = require('../parser/lexers');

var {
  Parser
} = require('../parser');
*/

var {
  buildChapterVerseIndex,
  chapterVerseIndex,
  chapterIndex
} = require('./document_helpers/chapter_verse');

var {
  modifySequence,
  deleteSequence,
  gcSequences,
  newSequence
} = require('./document_helpers/sequences');

var {
  deleteBlock,
  newBlock,
  rewriteBlock
} = require('./document_helpers/blocks');

var {
  succinctFilter
} = require('./document_helpers/succinct_filter');

var {
  serializeSuccinct
} = require('./document_helpers/serialize_succinct');

var {
  recordPreEnums,
  rerecordPreEnums
} = require('./document_helpers/pre_enums'); // const maybePrint = str => console.log(str);


var maybePrint = str => str;

class Document {
  constructor(processor, docSetId, contentType, contentString, filterOptions, customTags, emptyBlocks, tags) {
    this.processor = processor;
    this.docSetId = docSetId;
    this.baseSequenceTypes = parserConstants.usfm.baseSequenceTypes;

    if (contentType) {
      this.id = generateId();
      this.filterOptions = filterOptions;
      this.customTags = customTags;
      this.emptyBlocks = emptyBlocks;
      this.tags = new Set(tags || []);
      validateTags(this.tags);
      this.headers = {};
      this.mainId = null;
      this.sequences = {};

      switch (contentType) {
        case 'usfm':
          this.processUsfm(contentString);
          break;

       /* case 'usx':
          this.processUsx(contentString);
          break;

        case 'lexicon':
          this.processLexicon(contentString);
          break;*/

        default:
          throw new Error("Unknown document contentType '".concat(contentType, "'"));
      }
    }
  }

  addTag(tag) {
    addTag(this.tags, tag);
  }

  removeTag(tag) {
    removeTag(this.tags, tag);
  }

  makeParser() {
    return new Parser(this.filterOptions, this.customTags, this.emptyBlocks);
  }

  processUsfm(usfmString) {
    var parser = this.makeParser();
    var t = Date.now();
    parseUsfm(usfmString, parser);
    var t2 = Date.now();
    maybePrint("\nParse USFM in ".concat(t2 - t, " msec"));
    this.postParseScripture(parser);
    maybePrint("Total USFM import time = ".concat(Date.now() - t, " msec (parse = ").concat((t2 - t) * 100 / (Date.now() - t), "%)"));
  }

  processUsx(usxString) {
    var parser = this.makeParser();
    var t = Date.now();
    parseUsx(usxString, parser);
    var t2 = Date.now();
    maybePrint("\nParse USX in ".concat(t2 - t, " msec"));
    this.postParseScripture(parser);
    maybePrint("Total USX import time = ".concat(Date.now() - t, " msec (parse = ").concat((t2 - t) * 100 / (Date.now() - t), "%)"));
  }

  postParseScripture(parser) {
    var t = Date.now();
    parser.tidy();
    maybePrint("Tidy in ".concat(Date.now() - t, " msec"));
    t = Date.now();
    var fo = parser.filterOptions; // CHANGE THIS WHEN REFACTORING PARSER

    this.headers = parser.headers;
    this.succinctPass1(parser);
    maybePrint("Succinct pass 1 in ".concat(Date.now() - t, " msec"));
    t = Date.now();
    this.succinctPass2(parser);
    maybePrint("Succinct pass 2 in ".concat(Date.now() - t, " msec"));
    t = Date.now();
    this.succinctFilter(fo);
    maybePrint("Filter in ".concat(Date.now() - t, " msec"));
    t = Date.now();
    buildChapterVerseIndex(this);
    maybePrint("CV indexes in ".concat(Date.now() - t, " msec"));
  }

  processLexicon(lexiconString) {
    var parser = this.makeParser();
    parseLexicon(lexiconString, parser);
    this.headers = parser.headers;
    this.succinctPass1(parser);
    this.succinctPass2(parser);
  }

  succinctFilter(filterOptions) {
    succinctFilter(this, filterOptions);
  }

  succinctPass1(parser) {
    var docSet = this.processor.docSets[this.docSetId];
    var t = Date.now();

    for (var seq of parser.allSequences()) {
      docSet.recordPreEnum('ids', seq.id);
      this.recordPreEnums(docSet, seq);
    }

    maybePrint("   recordPreEnums in ".concat(Date.now() - t, " msec"));
    t = Date.now();

    if (docSet.enums.wordLike.length === 0) {
      docSet.sortPreEnums();
      maybePrint("   sortPreEnums in ".concat(Date.now() - t, " msec"));
      t = Date.now();
    }

    docSet.buildEnums();
    maybePrint("   buildEnums in ".concat(Date.now() - t, " msec"));
  }

  recordPreEnums(docSet, seq) {
    recordPreEnums(docSet, seq);
  }

  rerecordPreEnums(docSet, seq) {
    rerecordPreEnums(docSet, seq);
  }

  succinctPass2(parser) {
    var docSet = this.processor.docSets[this.docSetId];
    this.mainId = parser.sequences.main.id;

    for (var seq of parser.allSequences()) {
      this.sequences[seq.id] = {
        id: seq.id,
        type: seq.type,
        tags: new Set(seq.tags),
        isBaseType: seq.type in parser.baseSequenceTypes,
        blocks: seq.succinctifyBlocks(docSet)
      };
    }

    this.sequences[this.mainId].verseMapping = {};
  }

  modifySequence(seqId, sequenceRewriteFunc, blockFilterFunc, itemFilterFunc, blockRewriteFunc, itemRewriteFunc) {
    modifySequence(this, seqId, sequenceRewriteFunc, blockFilterFunc, itemFilterFunc, blockRewriteFunc, itemRewriteFunc);
  }

  buildChapterVerseIndex() {
    buildChapterVerseIndex(this);
  }

  chapterVerseIndexes() {
    var ret = {};

    for (var chapN of Object.keys(this.sequences[this.mainId].chapterVerses)) {
      ret[chapN] = chapterVerseIndex(this, chapN);
    }

    return ret;
  }

  chapterVerseIndex(chapN) {
    return chapterVerseIndex(this, chapN);
  }

  chapterIndexes() {
    var ret = {};

    for (var chapN of Object.keys(this.sequences[this.mainId].chapters)) {
      ret[chapN] = chapterIndex(this, chapN);
    }

    return ret;
  }

  chapterIndex(chapN) {
    return chapterIndex(this, chapN);
  }

  rewriteSequenceBlocks(sequenceId, oldToNew) {
    var sequence = this.sequences[sequenceId];

    for (var block of sequence.blocks) {
      this.rewriteSequenceBlock(block, oldToNew);
    }
  }

  rewriteSequenceBlock(block, oldToNew) {
    rewriteBlock(block, oldToNew);
  }

  serializeSuccinct() {
    return serializeSuccinct(this);
  }

  gcSequences() {
    return gcSequences(this);
  }

  newSequence(seqType) {
    return newSequence(this, seqType);
  }

  deleteSequence(seqId) {
    return deleteSequence(this, seqId);
  }

  deleteBlock(seqId, blockN) {
    return deleteBlock(this, seqId, blockN);
  }

  newBlock(seqId, blockN, blockScope) {
    return newBlock(this, seqId, blockN, blockScope);
  }

}

module.exports = {
  Document
};