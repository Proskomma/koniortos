"use strict";

var _xregexp = _interopRequireDefault(require("xregexp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var {
  Mutex
} = require('async-mutex');

var {
  graphql
} = require('graphql');

var BitSet = require('bitset');

var {
  ByteArray,
  /*generateId*/
} = require('proskomma-utils');

// var packageJson = require('../package.json');

var {
  DocSet
} = require('./model/doc_set');

var {
  Document
} = require('./model/document');

var {
  gqlSchema
} = require('./graph');

var generateId = () =>   Math.floor(Math.random() * 1000000).toString(16);

class Proskomma {
  constructor() {
    this.processorId = generateId();
    this.documents = {};
    this.docSetsBySelector = {};
    this.docSets = {};
    this.filters = {};
    this.customTags = {
      heading: [],
      paragraph: [],
      char: [],
      word: [],
      intro: [],
      introHeading: []
    };
    this.emptyBlocks = [];
    this.selectors = [{
      name: 'lang',
      type: 'string',
      regex: '[a-z]{3}'
    }, {
      name: 'abbr',
      type: 'string'
    }];
    this.mutex = new Mutex();
  }

  validateSelectors() {
    if (this.selectors.length === 0) {
      throw new Error('No selectors found');
    }

    for (var [n, selector] of this.selectors.entries()) {
      if (!('name' in selector)) {
        throw new Error("Selector ".concat(n, " has no name"));
      }

      if (!('type' in selector)) {
        throw new Error("Selector ".concat(n, " has no type"));
      }

      if (!['string', 'integer'].includes(selector.type)) {
        throw new Error("Type for selector ".concat(n, " must be string or number, not ").concat(selector.type));
      }

      if (selector.type === 'string') {
        if ('min' in selector) {
          throw new Error('String selector should not include \'min\'');
        }

        if ('max' in selector) {
          throw new Error('String selector should not include \'max\'');
        }

        if ('regex' in selector) {
          try {
            (0, _xregexp.default)(selector.regex);
          } catch (err) {
            throw new Error("Regex '".concat(selector.regex, "' is not valid: ").concat(err));
          }
        }

        if ('enum' in selector) {
          for (var enumElement of selector.enum) {
            if (typeof enumElement !== 'string') {
              throw new Error("Enum values for selector ".concat(selector.name, " should be strings, not '").concat(enumElement, "'"));
            }
          }
        }
      } else {
        if ('regex' in selector) {
          throw new Error('Integer selector should not include \'regex\'');
        }

        if ('min' in selector && typeof selector.min !== 'number') {
          throw new Error("'min' must be a number, not '".concat(selector.min, "'"));
        }

        if ('max' in selector && typeof selector.max !== 'number') {
          throw new Error("'max' must be a number, not '".concat(selector.max, "'"));
        }

        if ('min' in selector && 'max' in selector && selector.min > selector.max) {
          throw new Error("'min' cannot be greater than 'max' (".concat(selector.min, " > ").concat(selector.max, ")"));
        }

        if ('enum' in selector) {
          for (var _enumElement of selector.enum) {
            if (typeof _enumElement !== 'number') {
              throw new Error("Enum values for selector ".concat(selector.name, " should be numbers, not '").concat(_enumElement, "'"));
            }
          }
        }
      }

      for (var selectorKey of Object.keys(selector)) {
        if (!['name', 'type', 'regex', 'min', 'max', 'enum'].includes(selectorKey)) {
          throw new Error("Unexpected key '".concat(selectorKey, "' in selector ").concat(n));
        }
      }
    }
  }

  selectorString(docSetSelectors) {
    // In root so it can be easily subclassed
    return this.selectors.map(s => s.name).map(n => "".concat(docSetSelectors[n])).join('_');
  }

  processor() {
    return 'Proskomma JS';
  }

  packageVersion() {
    return packageJson.version;
  }

  docSetList() {
    return Object.values(this.docSets);
  }

  docSetsById(ids) {
    return Object.values(this.docSets).filter(ds => ids.includes(ds.id));
  }

  docSetById(id) {
    return this.docSets[id];
  }

  docSetsWithBook(bookCode) {
    var docIdsWithBook = Object.values(this.documents).filter(doc => 'bookCode' in doc.headers && doc.headers['bookCode'] === bookCode).map(doc => doc.id);

    var docIdWithBookInDocSet = ds => {
      for (var docId of docIdsWithBook) {
        if (ds.docIds.includes(docId)) {
          return true;
        }
      }

      return false;
    };

    return Object.values(this.docSets).filter(ds => docIdWithBookInDocSet(ds));
  }

  nDocSets() {
    return this.docSetList().length;
  }

  nDocuments() {
    return this.documentList().length;
  }

  documentList() {
    return Object.values(this.documents);
  }

  documentById(id) {
    return this.documents[id];
  }

  documentsById(ids) {
    return Object.values(this.documents).filter(doc => ids.includes(doc.id));
  }

  documentsWithBook(bookCode) {
    return Object.values(this.documents).filter(doc => 'bookCode' in doc.headers && doc.headers['bookCode'] === bookCode);
  }

  importDocument(selectors, contentType, contentString, filterOptions, customTags, emptyBlocks, tags) {
    return this.importDocuments(selectors, contentType, [contentString], filterOptions, customTags, emptyBlocks, tags)[0];
  }

  importDocuments(selectors, contentType, contentStrings, filterOptions, customTags, emptyBlocks, tags) {
    if (!filterOptions) {
      filterOptions = this.filters;
    }

    if (!customTags) {
      customTags = this.customTags;
    }

    if (!emptyBlocks) {
      emptyBlocks = this.emptyBlocks;
    }

    if (!tags) {
      tags = [];
    }

    var docSetId = this.findOrMakeDocSet(selectors);
    var docSet = this.docSets[docSetId];
    docSet.buildPreEnums();
    var docs = [];

    for (var contentString of contentStrings) {
      var doc = new Document(this, docSetId, contentType, contentString, filterOptions, customTags, emptyBlocks, tags);
      this.addDocument(doc, docSetId);
      docs.push(doc);
    }

    docSet.preEnums = {};
    return docs;
  }

  deleteDocSet(docSetId) {
    if (!(docSetId in this.docSets)) {
      return false;
    }

    var selected = this.docSetsBySelector;
    var parentSelectors = this.selectors.slice(0, this.selectors.length - 1);

    for (var selector of parentSelectors) {
      selected = selected[this.docSets[docSetId].selectors[selector.name]];
    }

    var lastSelectorName = this.selectors[this.selectors.length - 1].name;
    delete selected[lastSelectorName];
    delete this.docSets[docSetId];
    return true;
  }

  deleteDocument(docSetId, documentId) {
    if (!(docSetId in this.docSets)) {
      return false;
    }

    if (!(documentId in this.documents)) {
      return false;
    }

    if (this.docSets[docSetId].docIds.length > 1) {
      this.docSets[docSetId].docIds = this.docSets[docSetId].docIds.filter(i => i !== documentId);
    } else {
      delete this.docSets[docSetId];
    }

    delete this.documents[documentId];
    return this.rehashDocSet(docSetId);
  }

  rehashDocSet(docSetId) {
    if (!(docSetId in this.docSets)) {
      return false;
    }

    var docSet = this.docSets[docSetId];
    return docSet.rehash();
  }

  addDocument(doc, docSetId) {
    this.documents[doc.id] = doc;
    this.docSets[docSetId].docIds.push(doc.id);
    this.docSets[docSetId].buildEnumIndexes();
  }

  loadSuccinctDocSet(succinctOb) {
    var docSet = new DocSet(this, null, null, succinctOb);
    var docSetId = docSet.id;
    this.docSets[docSetId] = docSet;
    var selectorTree = this.docSetsBySelector;
    var selectors = succinctOb.metadata.selectors;

    for (var selector of this.selectors) {
      if (selector.name === this.selectors[this.selectors.length - 1].name) {
        if (!(selectors[selector.name] in selectorTree)) {
          selectorTree[selectors[selector.name]] = docSet;
          this.docSets[docSet.id] = docSet;
        }
      } else {
        if (!(selectors[selector.name] in selectorTree)) {
          selectorTree[selectors[selector.name]] = {};
        }

        selectorTree = selectorTree[selectors[selector.name]];
      }
    }

    docSet.buildPreEnums();
    var docs = [];

    for (var docId of Object.keys(succinctOb.docs)) {
      var doc = this.newDocumentFromSuccinct(docId, succinctOb);
      docs.push(doc);
    }

    docSet.preEnums = {};
    return docs;
  }

  newDocumentFromSuccinct(docId, succinctOb) {
    var doc = new Document(this, succinctOb.id);
    doc.id = docId;
    var succinctDocOb = succinctOb.docs[docId];
    doc.filterOptions = {};
    doc.customTags = [];
    doc.emptyBlocks = [];
    doc.tags = succinctDocOb.tags;
    doc.headers = succinctDocOb.headers;
    doc.mainId = succinctDocOb.mainId;
    doc.sequences = {};

    for (var [seqId, seq] of Object.entries(succinctDocOb.sequences)) {
      doc.sequences[seqId] = {
        id: seqId,
        type: seq.type,
        tags: new Set(seq.tags),
        blocks: []
      };

      if (seq.type === 'main') {
        doc.sequences[seqId].chapters = {};

        if (!('chapters' in seq)) {
          throw new Error('chapters not found in main sequence');
        }

        for (var [chK, chV] of Object.entries(seq.chapters)) {
          var bA = new ByteArray();
          bA.fromBase64(chV);
          doc.sequences[seqId].chapters[chK] = bA;
        }

        doc.sequences[seqId].chapterVerses = {};

        if (!('chapterVerses' in seq)) {
          throw new Error('chapterVerses not found in main sequence');
        }

        for (var [chvK, chvV] of Object.entries(seq.chapterVerses)) {
          var _bA = new ByteArray();

          _bA.fromBase64(chvV);

          doc.sequences[seqId].chapterVerses[chvK] = _bA;
        }

        if (!('tokensPresent' in seq)) {
          throw new Error('tokensPresent not found in main sequence');
        }

        doc.sequences[seqId].tokensPresent = new BitSet(seq.tokensPresent);
      }

      for (var succinctBlock of seq.blocks) {
        var block = {};

        for (var [blockField, blockSuccinct] of Object.entries(succinctBlock)) {
          var ba = new ByteArray(256);
          ba.fromBase64(blockSuccinct);
          block[blockField] = ba;
        }

        doc.sequences[seqId].blocks.push(block);
      }
    }

    this.addDocument(doc, succinctOb.id);
    return doc;
  }

  findOrMakeDocSet(selectors) {
    var selectorTree = this.docSetsBySelector;
    var docSet;

    for (var selector of this.selectors) {
      if (selector.name === this.selectors[this.selectors.length - 1].name) {
        if (selectors[selector.name] in selectorTree) {
          docSet = selectorTree[selectors[selector.name]];
        } else {
          docSet = new DocSet(this, selectors);
          selectorTree[selectors[selector.name]] = docSet;
          this.docSets[docSet.id] = docSet;
        }
      } else {
        if (!(selectors[selector.name] in selectorTree)) {
          selectorTree[selectors[selector.name]] = {};
        }

        selectorTree = selectorTree[selectors[selector.name]];
      }
    }

    return docSet.id;
  }

  gqlQuery(query, callback) {
    var _this = this;

    return _asyncToGenerator(function* () {
      var release = yield _this.mutex.acquire();

      try {
        var result = yield graphql(gqlSchema, query, _this, {});

        if (callback) {
          callback(result);
        }

        return result;
      } finally {
        release();
      }
    })();
  }

  serializeSuccinct(docSetId) {
    return this.docSets[docSetId].serializeSuccinct();
  }

}

module.exports = {
  Proskomma
};