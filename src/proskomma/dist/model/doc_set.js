"use strict";

var _xregexp = _interopRequireDefault(require("xregexp"));

var _proskommaUtils = require("proskomma-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class DocSet {
  constructor(processor, selectors, tags, succinctJson) {
    this.processor = processor;
    this.preEnums = {};
    this.enumIndexes = {};
    this.docIds = [];

    if (succinctJson) {
      this.fromSuccinct(processor, succinctJson);
    } else {
      this.fromScratch(processor, selectors, tags);
    }

    (0, _proskommaUtils.validateTags)(this.tags);
  }

  fromScratch(processor, selectors, tags) {
    var defaultedSelectors = selectors || processor.selectors;
    this.selectors = this.validateSelectors(defaultedSelectors);
    this.id = this.selectorString();
    this.tags = new Set(tags || []);
    this.enums = {
      ids: new _proskommaUtils.ByteArray(512),
      wordLike: new _proskommaUtils.ByteArray(8192),
      notWordLike: new _proskommaUtils.ByteArray(256),
      scopeBits: new _proskommaUtils.ByteArray(256),
      graftTypes: new _proskommaUtils.ByteArray(10)
    };
  }

  fromSuccinct(processor, succinctJson) {
    var populatedByteArray = succinct => {
      var ret = new _proskommaUtils.ByteArray(256);
      ret.fromBase64(succinct);
      ret.trim();
      return ret;
    };

    this.id = succinctJson.id;
    this.selectors = this.validateSelectors(succinctJson.metadata.selectors);
    this.tags = new Set(succinctJson.tags);
    (0, _proskommaUtils.validateTags)(this.tags);
    this.preEnums = {};
    this.enums = {
      ids: populatedByteArray(succinctJson.enums.ids),
      wordLike: populatedByteArray(succinctJson.enums.wordLike),
      notWordLike: populatedByteArray(succinctJson.enums.notWordLike),
      scopeBits: populatedByteArray(succinctJson.enums.scopeBits),
      graftTypes: populatedByteArray(succinctJson.enums.graftTypes)
    };
    this.enumIndexes = {};
    this.docIds = [];
  }

  addTag(tag) {
    (0, _proskommaUtils.addTag)(this.tags, tag);
  }

  removeTag(tag) {
    (0, _proskommaUtils.removeTag)(this.tags, tag);
  }

  validateSelectors(selectors) {
    if (typeof selectors !== 'object') {
      throw new Error("DocSet constructor expects selectors to be object, found ".concat(typeof this.selectors));
    }

    var expectedSelectors = {};

    for (var selector of this.processor.selectors) {
      expectedSelectors[selector.name] = selector;
    }

    for (var [name, value] of Object.entries(selectors)) {
      if (!(name in expectedSelectors)) {
        throw new Error("Unexpected selector '".concat(name, "' (expected one of [").concat(Object.keys(expectedSelectors).join(', '), "])"));
      }

      if (typeof value === 'string' && expectedSelectors[name].type !== 'string' || typeof value === 'number' && expectedSelectors[name].type !== 'integer') {
        throw new Error("Selector '".concat(name, "' is of type ").concat(typeof value, " (expected ").concat(expectedSelectors[name].type, ")"));
      }

      if (typeof value === 'number') {
        if (!Number.isInteger(value)) {
          throw new Error("Value '".concat(value, "' of integer selector '").concat(name, "' is not an integer"));
        }

        if ('min' in expectedSelectors[name] && value < expectedSelectors[name].min) {
          throw new Error("Value '".concat(value, "' is less than ").concat(expectedSelectors[name].min));
        }

        if ('max' in expectedSelectors[name] && value > expectedSelectors[name].max) {
          throw new Error("Value '".concat(value, "' is greater than ").concat(expectedSelectors[name].max));
        }
      } else {
        if ('regex' in expectedSelectors[name] && !_xregexp.default.exec(value, (0, _xregexp.default)(expectedSelectors[name].regex), 0)) {
          throw new Error("Value '".concat(value, "' does not match regex '").concat(expectedSelectors[name].regex, "'"));
        }
      }

      if ('enum' in expectedSelectors[name] && !expectedSelectors[name].enum.includes(value)) {
        throw new Error("Value '".concat(value, "' of selector '").concat(name, "' is not in enum"));
      }
    }

    for (var _name of Object.keys(expectedSelectors)) {
      if (!(_name in selectors)) {
        throw new Error("Expected selector '".concat(_name, "' not found"));
      }
    }

    return selectors;
  }

  selectorString() {
    return this.processor.selectorString(this.selectors);
  }

  documents() {
    return this.docIds.map(did => this.processor.documents[did]);
  }

  documentWithBook(bookCode) {
    var docsWithBook = Object.values(this.documents()).filter(doc => 'bookCode' in doc.headers && doc.headers['bookCode'] === bookCode);
    return docsWithBook.length === 1 ? docsWithBook[0] : null;
  }

  maybeBuildPreEnums() {
    if (Object.keys(this.preEnums).length === 0) {
      this.buildPreEnums();
    }
  }

  buildPreEnums() {
    for (var [category, succinct] of Object.entries(this.enums)) {
      this.preEnums[category] = this.buildPreEnum(succinct);
    }
  }

  buildPreEnum(succinct) {
    var ret = new Map();
    var pos = 0;
    var enumCount = 0;

    while (pos < succinct.length) {
      ret.set(succinct.countedString(pos), {
        'enum': enumCount++,
        'frequency': 0
      });
      pos += succinct.byte(pos) + 1;
    }

    return ret;
  }

  recordPreEnum(category, value) {
    if (!(category in this.preEnums)) {
      throw new Error("Unknown category ".concat(category, " in recordPreEnum. Maybe call buildPreEnums()?"));
    }

    if (!this.preEnums[category].has(value)) {
      this.preEnums[category].set(value, {
        'enum': this.preEnums[category].size,
        'frequency': 1
      });
    } else {
      this.preEnums[category].get(value).frequency++;
    }
  }

  sortPreEnums() {
    for (var catKey of Object.keys(this.preEnums)) {
      this.preEnums[catKey] = new Map([...this.preEnums[catKey].entries()].sort((a, b) => b[1].frequency - a[1].frequency));
      var count = 0;

      for (var [k, v] of this.preEnums[catKey]) {
        v.enum = count++;
      }
    }
  }

  enumForCategoryValue(category, value, addUnknown) {
    if (!addUnknown) {
      addUnknown = false;
    }

    if (!(category in this.preEnums)) {
      throw new Error("Unknown category ".concat(category, " in recordPreEnum. Maybe call buildPreEnums()?"));
    }

    if (this.preEnums[category].has(value)) {
      return this.preEnums[category].get(value).enum;
    } else if (addUnknown) {
      this.preEnums[category].set(value, {
        'enum': this.preEnums[category].size,
        'frequency': 1
      });
      this.enums[category].pushCountedString(value);
      this.buildEnumIndex(category);
      return this.preEnums[category].get(value).enum;
    } else {
      throw new Error("Unknown value '".concat(value, "' for category ").concat(category, " in enumForCategoryValue. Maybe call buildPreEnums()?"));
    }
  }

  buildEnums() {
    for (var [category, catOb] of Object.entries(this.preEnums)) {
      this.enums[category].clear();
      this.buildEnum(category, catOb);
    }
  }

  buildEnum(category, preEnumOb) {
    var sortedPreEnums = new Map([...preEnumOb.entries()]);

    for (var enumText of sortedPreEnums.keys()) {
      this.enums[category].pushCountedString(enumText);
    }

    this.enums[category].trim();
  }

  maybeBuildEnumIndexes() {
    if (Object.keys(this.enumIndexes).length === 0) {
      this.buildEnumIndexes();
    }
  }

  buildEnumIndexes() {
    this.enumIndexes = (0, _proskommaUtils.enumIndexes)(this.enums);
  }

  buildEnumIndex(category) {
    this.enumIndexes[category] = (0, _proskommaUtils.enumIndex)(category, this.enums[category]);
  }

  unsuccinctifyBlock(block, options) {
    this.maybeBuildEnumIndexes();
    var succinctBlockScope = block.bs;
    var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(succinctBlockScope, 0);
    var blockScope = this.unsuccinctifyScope(succinctBlockScope, itemType, itemSubtype, 0);
    var blockGrafts = this.unsuccinctifyGrafts(block.bg);
    var openScopes = this.unsuccinctifyScopes(block.os);
    var includedScopes = this.unsuccinctifyScopes(block.is);
    var nextToken = block.nt.nByte(0);
    var blockItems = this.unsuccinctifyItems(block.c, options || {}, nextToken);
    return {
      bs: blockScope,
      bg: blockGrafts,
      c: blockItems,
      os: openScopes,
      is: includedScopes,
      nt: nextToken
    };
  }

  countItems(succinct) {
    var count = 0;
    var pos = 0;

    while (pos < succinct.length) {
      count++;
      var headerByte = succinct.byte(pos);
      var itemLength = headerByte & 0x0000003F;
      pos += itemLength;
    }

    return count;
  }

  unsuccinctifyScopes(succinct) {
    var ret = [];
    var pos = 0;

    while (pos < succinct.length) {
      var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(succinct, pos);
      ret.push(this.unsuccinctifyScope(succinct, itemType, itemSubtype, pos));
      pos += itemLength;
    }

    return ret;
  }

  unsuccinctifyGrafts(succinct) {
    var ret = [];
    var pos = 0;

    while (pos < succinct.length) {
      var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(succinct, pos);
      ret.push(this.unsuccinctifyGraft(succinct, itemSubtype, pos));
      pos += itemLength;
    }

    return ret;
  }

  unsuccinctifyItems(succinct, options, nextToken, openScopes) {
    if (nextToken === undefined) {
      throw new Error('nextToken (previously includeContext) must now be provided to unsuccinctifyItems');
    }

    if (nextToken !== null && typeof nextToken !== 'number') {
      throw new Error("nextToken (previously includeContext) must be null or an integer, not ".concat(typeof nextToken, " '").concat(JSON.stringify(nextToken), "' in unsuccinctifyItems"));
    }

    var ret = [];
    var pos = 0;
    var tokenCount = nextToken || 0;
    var scopes = new Set(openScopes || []);

    while (pos < succinct.length) {
      var [item, itemLength] = this.unsuccinctifyItem(succinct, pos, {});

      if (item[0] === 'token') {
        if (Object.keys(options).length === 0 || options.tokens) {
          if (nextToken !== null) {
            item.push(item[0] === 'token' && item[1] === 'wordLike' ? tokenCount++ : null);
            item.push([...scopes]);
          }

          ret.push(item);
        }
      } else if (item[0] === 'scope' && item[1] === 'start') {
        scopes.add(item[2]);

        if (Object.keys(options).length === 0 || options.scopes) {
          ret.push(item);
        }
      } else if (item[0] === 'scope' && item[1] === 'end') {
        scopes.delete(item[2]);

        if (Object.keys(options).length === 0 || options.scopes) {
          ret.push(item);
        }
      } else if (item[0] === 'graft') {
        if (Object.keys(options).length === 0 || options.grafts) {
          ret.push(item);
        }
      }

      pos += itemLength;
    }

    return ret;
  }

  itemsByIndex(mainSequence, index, includeContext) {
    var ret = [];

    if (!index) {
      return ret;
    }

    var currentBlock = index.startBlock;
    var nextToken = index.nextToken;

    while (currentBlock <= index.endBlock) {
      var blockItems = this.unsuccinctifyItems(mainSequence.blocks[currentBlock].c, {}, nextToken);
      var blockScope = this.unsuccinctifyScopes(mainSequence.blocks[currentBlock].bs)[0];
      var blockGrafts = this.unsuccinctifyGrafts(mainSequence.blocks[currentBlock].bg);

      if (currentBlock === index.startBlock && currentBlock === index.endBlock) {
        blockItems = blockItems.slice(index.startItem, index.endItem + 1);
      } else if (currentBlock === index.startBlock) {
        blockItems = blockItems.slice(index.startItem);
      } else if (currentBlock === index.endBlock) {
        blockItems = blockItems.slice(0, index.endItem + 1);
      }

      if (includeContext) {
        var extendedBlockItems = [];

        for (var bi of blockItems) {
          extendedBlockItems.push(bi.concat([bi[0] === 'token' && bi[1] === 'wordLike' ? nextToken++ : null]));
        }

        blockItems = extendedBlockItems;
      }

      ret.push([...blockGrafts, ['scope', 'start', blockScope[2]], ...blockItems, ['scope', 'end', blockScope[2]]]);
      currentBlock++;
    }

    return ret;
  }

  unsuccinctifyItem(succinct, pos, options) {
    var item = null;
    var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(succinct, pos);

    switch (itemType) {
      case _proskommaUtils.itemEnum.token:
        if (Object.keys(options).length === 0 || options.tokens) {
          item = this.unsuccinctifyToken(succinct, itemSubtype, pos);
        }

        break;

      case _proskommaUtils.itemEnum.startScope:
      case _proskommaUtils.itemEnum.endScope:
        if (Object.keys(options).length === 0 || options.scopes) {
          item = this.unsuccinctifyScope(succinct, itemType, itemSubtype, pos);
        }

        break;

      case _proskommaUtils.itemEnum.graft:
        if (Object.keys(options).length === 0 || options.grafts) {
          item = this.unsuccinctifyGraft(succinct, itemSubtype, pos);
        }

        break;
    }

    return [item, itemLength];
  }

  unsuccinctifyToken(succinct, itemSubtype, pos) {
    try {
      return ['token', _proskommaUtils.tokenEnumLabels[itemSubtype], this.succinctTokenChars(succinct, itemSubtype, pos)];
    } catch (err) {
      throw new Error("Error from unsuccinctifyToken: ".concat(err));
    }
  }

  unsuccinctifyScope(succinct, itemType, itemSubtype, pos) {
    try {
      return ['scope', itemType === _proskommaUtils.itemEnum.startScope ? 'start' : 'end', this.succinctScopeLabel(succinct, itemSubtype, pos)];
    } catch (err) {
      throw new Error("Error from unsuccinctifyScope: ".concat(err));
    }
  }

  unsuccinctifyGraft(succinct, itemSubtype, pos) {
    try {
      return ['graft', this.succinctGraftName(itemSubtype), this.succinctGraftSeqId(succinct, pos)];
    } catch (err) {
      throw new Error("Error from unsuccinctifyGraft: ".concat(err));
    }
  }

  unsuccinctifyBlockScopeLabelsSet(block) {
    var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(block.bs, 0);
    var blockScope = this.unsuccinctifyScope(block.bs, itemType, itemSubtype, 0);
    return new Set(this.unsuccinctifyScopes(block.os).concat(this.unsuccinctifyScopes(block.is)).concat([blockScope]).map(ri => ri[2]));
  }

  unsuccinctifyPrunedItems(block, options) {
    var openScopes = new Set(this.unsuccinctifyScopes(block.os).map(ri => ri[2]));
    var requiredScopes = options.requiredScopes || [];
    var anyScope = options.anyScope || false;

    var allScopesInItem = () => {
      for (var scope of requiredScopes) {
        if (!openScopes.has(scope)) {
          return false;
        }
      }

      return true;
    };

    var anyScopeInItem = () => {
      for (var scope of requiredScopes) {
        if (openScopes.has(scope)) {
          return true;
        }
      }

      return requiredScopes.length === 0;
    };

    var scopeTest = anyScope ? anyScopeInItem : allScopesInItem;

    var charsTest = item => !options.withChars || options.withChars.length === 0 || item[0] === 'token' && options.withChars.includes(item[2]);

    var ret = [];

    for (var item of this.unsuccinctifyItems(block.c, options, block.nt.nByte(0), openScopes)) {
      if (item[0] === 'scope' && item[1] === 'start') {
        openScopes.add(item[2]);
      }

      if (scopeTest() && charsTest(item)) {
        ret.push(item);
      }

      if (item[0] === 'scope' && item[1] === 'end') {
        openScopes.delete(item[2]);
      }
    }

    return ret;
  }

  succinctTokenChars(succinct, itemSubtype, pos) {
    return (0, _proskommaUtils.succinctTokenChars)(this.enums, this.enumIndexes, succinct, itemSubtype, pos);
  }

  succinctScopeLabel(succinct, itemSubtype, pos) {
    return (0, _proskommaUtils.succinctScopeLabel)(this.enums, this.enumIndexes, succinct, itemSubtype, pos);
  }

  succinctGraftName(itemSubtype) {
    return (0, _proskommaUtils.succinctGraftName)(this.enums, this.enumIndexes, itemSubtype);
  }

  succinctGraftSeqId(succinct, pos) {
    return (0, _proskommaUtils.succinctGraftSeqId)(this.enums, this.enumIndexes, succinct, pos);
  }

  blocksWithScriptureCV(blocks, cv) {
    var hasMiddleChapter = (b, fromC, toC) => {
      var blockChapterScopes = [...this.unsuccinctifyScopes(b.os).map(s => s[2]), ...this.unsuccinctifyScopes(b.is).map(s => s[2])].filter(s => s.startsWith('chapter/'));
      return blockChapterScopes.map(s => parseInt(s.split('/')[1])).filter(n => n > fromC && n < toC).length > 0;
    };

    var hasFirstChapter = (b, fromC, fromV) => {
      var hasFirstChapterScope = [...this.unsuccinctifyScopes(b.os).map(s => s[2]), ...this.unsuccinctifyScopes(b.is).map(s => s[2])].includes("chapter/".concat(fromC));
      return hasFirstChapterScope && this.blockHasMatchingItem(b, (item, openScopes) => {
        if (!openScopes.has("chapter/".concat(fromC))) {
          return false;
        }

        return Array.from(openScopes).filter(s => s.startsWith('verse/')).filter(s => parseInt(s.split('/')[1]) >= fromV).length > 0 || fromV === 0 && item[0] === 'token' && item[2] && Array.from(openScopes).filter(s => s.startsWith('verse')).length === 0;
      }, {});
    };

    var hasLastChapter = (b, toC, toV) => {
      var hasLastChapterScope = [...this.unsuccinctifyScopes(b.os).map(s => s[2]), ...this.unsuccinctifyScopes(b.is).map(s => s[2])].includes("chapter/".concat(toC));
      return hasLastChapterScope && this.blockHasMatchingItem(b, (item, openScopes) => {
        if (!openScopes.has("chapter/".concat(toC))) {
          return false;
        }

        return Array.from(openScopes).filter(s => s.startsWith('verse/')).filter(s => parseInt(s.split('/')[1]) <= toV).length > 0 || toV === 0 && item[0] === 'token' && item[2] && Array.from(openScopes).filter(s => s.startsWith('verse')).length === 0;
      }, {});
    };

    if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*$'))) {
      var scopes = ["chapter/".concat(cv)];
      return blocks.filter(b => this.allScopesInBlock(b, scopes));
    } else if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*-[1-9][0-9]*$'))) {
      var [fromC, toC] = cv.split('-').map(v => parseInt(v));

      if (fromC > toC) {
        throw new Error("Chapter range must be from min to max, not '".concat(cv, "'"));
      }

      var _scopes = [...Array(toC - fromC + 1).keys()].map(n => "chapter/".concat(n + fromC));

      return blocks.filter(b => this.anyScopeInBlock(b, _scopes));
    } else if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*:[0-9]+$'))) {
      var [_fromC, fromV] = cv.split(':').map(v => parseInt(v));

      if (fromV === 0) {
        var _scopes2 = ["chapter/".concat(_fromC)];
        return blocks.filter(b => this.allScopesInBlock(b, _scopes2)).filter(b => [...this.allBlockScopes(b)].filter(s => s.startsWith('verse')).length === 0);
      } else {
        var _scopes3 = ["chapter/".concat(_fromC), "verse/".concat(fromV)];
        return blocks.filter(b => this.allScopesInBlock(b, _scopes3));
      }
    } else if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*:[0-9]+-[1-9][0-9]*$'))) {
      var [_fromC2, vs] = cv.split(':');
      var [_fromV, toV] = vs.split('-').map(v => parseInt(v));

      if (_fromV > toV) {
        throw new Error("Verse range must be from min to max, not '".concat(vs, "'"));
      }

      var chapterScopes = ["chapter/".concat(_fromC2)];
      var verseScopes = [...Array(toV - _fromV + 1).keys()].map(n => "verse/".concat(n + _fromV));
      return blocks.filter(b => this.allScopesInBlock(b, chapterScopes)).filter(b => this.anyScopeInBlock(b, verseScopes) || _fromV === 0 && [...this.allBlockScopes(b)].filter(s => s.startsWith('verse')).length === 0);
    } else if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*:[0-9]+-[1-9][0-9]*:[0-9]+$'))) {
      var [fromCV, toCV] = cv.split('-');
      var [_fromC3, _fromV2] = fromCV.split(':').map(c => parseInt(c));
      var [_toC, _toV] = toCV.split(':').map(v => parseInt(v));

      if (_fromC3 > _toC) {
        throw new Error("Chapter range must be from min to max, not '".concat(_fromC3, "-").concat(_toV, "'"));
      }

      var _chapterScopes = [...Array(_toC - _fromC3 + 1).keys()].map(n => "chapter/".concat(n + _fromC3));

      var chapterBlocks = blocks.filter(b => this.anyScopeInBlock(b, _chapterScopes));
      return chapterBlocks.filter(b => hasMiddleChapter(b, _fromC3, _toC) || hasFirstChapter(b, _fromC3, _fromV2) || hasLastChapter(b, _toC, _toV));
    } else {
      throw new Error("Bad cv reference '".concat(cv, "'"));
    }
  }

  allBlockScopes(block) {
    var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(block.bs, 0);
    var blockScope = this.unsuccinctifyScope(block.bs, itemType, itemSubtype, 0);
    return new Set([...this.unsuccinctifyScopes(block.os).map(s => s[2]), ...this.unsuccinctifyScopes(block.is).map(s => s[2]), blockScope[2]]);
  }

  allScopesInBlock(block, scopes) {
    var allBlockScopes = this.allBlockScopes(block);

    for (var scope of scopes) {
      if (!allBlockScopes.has(scope)) {
        return false;
      }
    }

    return true;
  }

  anyScopeInBlock(block, scopes) {
    var allBlockScopes = this.allBlockScopes(block);

    for (var scope of scopes) {
      if (allBlockScopes.has(scope)) {
        return true;
      }
    }

    return false;
  }

  blockHasBlockScope(block, scope) {
    var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(block.bs, 0);
    var blockScope = this.unsuccinctifyScope(block.bs, itemType, itemSubtype, 0);
    return blockScope[2] === scope;
  }

  blockHasChars(block, charsIndexes) {
    var ret = false;
    var pos = 0;
    var succinct = block.c;

    if (charsIndexes.includes(-1)) {
      return false;
    }

    while (!ret && pos < succinct.length) {
      var [itemLength, itemType] = (0, _proskommaUtils.headerBytes)(succinct, pos);

      if (itemType === _proskommaUtils.itemEnum['token']) {
        if (charsIndexes.includes(succinct.nByte(pos + 2))) {
          ret = true;
        }
      }

      pos += itemLength;
    }

    return ret;
  }

  unsuccinctifyItemsWithScriptureCV(block, cv, options, includeContext) {
    options = options || {};
    var openScopes = new Set(this.unsuccinctifyScopes(block.os).map(ri => ri[2]));

    var cvMatchFunction = () => {
      if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*$'))) {
        return () => openScopes.has("chapter/".concat(cv));
      } else if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*-[1-9][0-9]*$'))) {
        return () => {
          var [fromC, toC] = cv.split('-').map(v => parseInt(v));

          if (fromC > toC) {
            throw new Error("Chapter range must be from min to max, not '".concat(cv, "'"));
          }

          for (var scope of [...Array(toC - fromC + 1).keys()].map(n => "chapter/".concat(n + fromC))) {
            if (openScopes.has(scope)) {
              return true;
            }
          }

          return false;
        };
      } else if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*:[0-9]+$'))) {
        return () => {
          var [fromC, fromV] = cv.split(':').map(v => parseInt(v));

          if (fromV === 0) {
            return openScopes.has("chapter/".concat(fromC)) && [...openScopes].filter(s => s.startsWith('verse')).length === 0;
          } else {
            for (var scope of ["chapter/".concat(fromC), "verse/".concat(fromV)]) {
              if (!openScopes.has(scope)) {
                return false;
              }
            }

            return true;
          }
        };
      } else if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*:[0-9]+-[1-9][0-9]*$'))) {
        return () => {
          var [fromC, vs] = cv.split(':');
          var [fromV, toV] = vs.split('-').map(v => parseInt(v));

          if (fromV > toV) {
            throw new Error("Verse range must be from min to max, not '".concat(vs, "'"));
          }

          var chapterScope = "chapter/".concat(fromC);
          var verseScopes = [...Array(toV - fromV + 1).keys()].map(n => "verse/".concat(n + fromV));

          if (!openScopes.has(chapterScope)) {
            return false;
          }

          for (var scope of verseScopes) {
            if (openScopes.has(scope)) {
              return true;
            }
          }

          return fromV === 0 && [...openScopes].filter(s => s.startsWith('verse')).length === 0;
        };
      } else if (_xregexp.default.exec(cv, (0, _xregexp.default)('^[1-9][0-9]*:[0-9]+-[1-9][0-9]*:[0-9]+$'))) {
        return () => {
          var [fromCV, toCV] = cv.split('-');
          var [fromC, fromV] = fromCV.split(':').map(c => parseInt(c));
          var [toC, toV] = toCV.split(':').map(v => parseInt(v));

          if (fromC > toC) {
            throw new Error("Chapter range must be from min to max, not '".concat(fromC, "-").concat(toV, "'"));
          }

          var scopeArray = [...openScopes];
          var chapterScopes = scopeArray.filter(s => s.startsWith('chapter/'));

          if (chapterScopes.length > 1) {
            throw new Error("Expected zero or one chapter for item, found ".concat(chapterScopes.length));
          }

          var chapterNo = parseInt(chapterScopes[0].split('/')[1]);

          if (chapterNo < fromC || chapterNo > toC) {
            return false;
          } else if (chapterNo === fromC) {
            return scopeArray.filter(s => s.startsWith('verse/') && parseInt(s.split('/')[1]) >= fromV).length > 0 || fromV === 0 && scopeArray.filter(s => s.startsWith('verse')).length === 0;
          } else if (chapterNo === toC) {
            return scopeArray.filter(s => s.startsWith('verse/') && parseInt(s.split('/')[1]) <= toV).length > 0 || toV === 0 && scopeArray.filter(s => s.startsWith('verse')).length === 0;
          } else {
            return true;
          }
        };
      } else {
        throw new Error("Bad cv reference '".concat(cv, "'"));
      }
    };

    var itemMatchesCV = cvMatchFunction();

    var itemInOptions = item => {
      if (!options || Object.keys(options).length === 0) {
        return true;
      } else {
        var itemType = item[0];
        return itemType === 'token' && 'tokens' in options || itemType === 'graft' && 'grafts' in options || itemType === 'scope' && 'scopes' in options;
      }
    };

    var ret = [];

    for (var item of this.unsuccinctifyItems(block.c, {}, block.nt.nByte(0))) {
      if (item[0] === 'scope' && item[1] === 'start') {
        openScopes.add(item[2]);
      }

      if (itemMatchesCV() && itemInOptions(item)) {
        ret.push(item);
      }

      if (item[0] === 'scope' && item[1] === 'end') {
        openScopes.delete(item[2]);
      }
    }

    return ret;
  }

  blockHasMatchingItem(block, testFunction, options) {
    var openScopes = new Set(this.unsuccinctifyScopes(block.os).map(ri => ri[2]));

    for (var item of this.unsuccinctifyItems(block.c, options, 0)) {
      if (item[0] === 'scope' && item[1] === 'start') {
        openScopes.add(item[2]);
      }

      if (testFunction(item, openScopes)) {
        return true;
      }

      if (item[0] === 'scope' && item[1] === 'end') {
        openScopes.delete(item[2]);
      }
    }

    return false;
  }

  sequenceItemsByScopes(blocks, byScopes) {
    // Return array of [scopes, items]
    // Scan block items, track scopes
    // If all scopes found:
    //   - turn found scopes into string
    //   - if that scope string doesn't exist, add to lookup table and push array
    //   - add item to array matching scope string
    var allBlockScopes = [];

    var allScopesPresent = () => {
      for (var requiredScope of byScopes) {
        if (!matchingScope(requiredScope)) {
          return false;
        }
      }

      return true;
    };

    var matchingScope = scopeToMatch => {
      for (var blockScope of allBlockScopes) {
        if (blockScope.startsWith(scopeToMatch)) {
          return blockScope;
        }
      }

      return null;
    };

    var scopesString = () => byScopes.map(s => matchingScope(s)).sort().join('_');

    this.maybeBuildEnumIndexes();
    var ret = [];
    var scopes2array = {};

    for (var block of blocks) {
      var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(block.bs, 0);
      var blockScope = this.unsuccinctifyScope(block.bs, itemType, itemSubtype, 0)[2];
      var startBlockScope = ['scope', 'start', blockScope];
      var endBlockScope = ['scope', 'end', blockScope];
      var blockGrafts = this.unsuccinctifyGrafts(block.bg);
      allBlockScopes = new Set(this.unsuccinctifyScopes(block.os).map(s => s[2]).concat([blockScope]));

      for (var item of blockGrafts.concat([startBlockScope, ...this.unsuccinctifyItems(block.c, {}, block.nt.nByte(0), allBlockScopes), endBlockScope])) {
        if (item[0] === 'scope' && item[1] === 'start') {
          allBlockScopes.add(item[2]);
        }

        if (allScopesPresent()) {
          var scopeKey = scopesString();

          if (!(scopeKey in scopes2array)) {
            scopes2array[scopeKey] = ret.length;
            ret.push([[...allBlockScopes], []]);
          }

          ret[ret.length - 1][1].push(item);
        }

        if (item[0] === 'scope' && item[1] === 'end') {
          allBlockScopes.delete(item[2]);
        }
      }
    }

    return ret;
  }

  sequenceItemsByMilestones(blocks, byMilestones) {
    // Return array of [scopes, items]
    // Scan block items
    // If milestone found:
    //   - add array
    // push item to last array
    var allBlockScopes = new Set([]);

    var milestoneFound = item => item[0] === 'scope' && item[1] === 'start' && byMilestones.includes(item[2]);

    this.maybeBuildEnumIndexes();
    var ret = [[[], []]];

    for (var block of blocks) {
      var [itemLength, itemType, itemSubtype] = (0, _proskommaUtils.headerBytes)(block.bs, 0);
      var blockScope = this.unsuccinctifyScope(block.bs, itemType, itemSubtype, 0)[2];
      var blockGrafts = this.unsuccinctifyGrafts(block.bg);
      allBlockScopes.add(blockScope);
      this.unsuccinctifyScopes(block.os).forEach(s => allBlockScopes.add(s[2]));
      var items = blockGrafts.concat([blockScope].concat(this.unsuccinctifyItems(block.c, {}, block.nt.nByte(0))));

      for (var item of items) {
        if (item[0] === 'scope' && item[1] === 'start') {
          allBlockScopes.add(item[2]);
        }

        if (milestoneFound(item)) {
          ret[ret.length - 1][0] = [...allBlockScopes].sort();
          ret.push([[], []]);

          for (var bs of [...allBlockScopes].filter(s => {
            var excludes = ['blockTag', 'verse', 'verses', 'chapter'];
            return excludes.includes(s.split('/')[0]) || byMilestones.includes(s);
          })) {
            allBlockScopes.delete(bs);
          }

          allBlockScopes.add(blockScope);
        }

        ret[ret.length - 1][1].push(item);
      }

      ret[ret.length - 1][1].push(['scope', 'end', blockScope]);
      ret[ret.length - 1][1].push(['token', 'punctuation', '\n']);
    }

    ret[ret.length - 1][0] = [...allBlockScopes].sort();
    return ret;
  }

  rehash() {
    this.preEnums = {};

    for (var category of Object.keys(this.enums)) {
      this.preEnums[category] = new Map();
    }

    this.maybeBuildEnumIndexes();

    for (var document of this.documents()) {
      for (var sequence of Object.values(document.sequences)) {
        document.rerecordPreEnums(this, sequence);
      }
    }

    this.sortPreEnums();
    var oldToNew = this.makeRehashEnumMap();

    for (var _document of this.documents()) {
      for (var _sequence of Object.values(_document.sequences)) {
        _document.rewriteSequenceBlocks(_sequence.id, oldToNew);
      }
    }

    this.buildEnums();
    this.buildEnumIndexes();
    return true;
  }

  makeRehashEnumMap() {
    var ret = {};

    for (var [category, enumSuccinct] of Object.entries(this.enums)) {
      ret[category] = [];
      var pos = 0;

      while (pos < enumSuccinct.length) {
        var stringLength = enumSuccinct.byte(pos);
        var enumString = enumSuccinct.countedString(pos);

        if (this.preEnums[category].has(enumString)) {
          ret[category].push(this.preEnums[category].get(enumString).enum);
        } else {
          ret[category].push(null);
        }

        pos += stringLength + 1;
      }
    }

    return ret;
  }

  updateItems(documentId, sequenceId, blockPosition, itemObjects) {
    var document = this.processor.documents[documentId];

    if (!document) {
      throw new Error("Document '".concat(documentId, "' not found"));
    }

    var sequence;

    if (sequenceId) {
      sequence = document.sequences[sequenceId];

      if (!sequence) {
        throw new Error("Sequence '".concat(sequenceId, "' not found"));
      }
    } else {
      sequence = document.sequences[document.mainId];
    }

    if (sequence.blocks.length <= blockPosition) {
      throw new Error("Could not find block ".concat(blockPosition, " (length=").concat(sequence.blocks.length, ")"));
    }

    var block = sequence.blocks[blockPosition];
    var newItemsBA = new _proskommaUtils.ByteArray(itemObjects.length);
    this.maybeBuildPreEnums();

    for (var item of itemObjects) {
      switch (item.type) {
        case 'token':
          var charsEnumIndex = this.enumForCategoryValue(_proskommaUtils.tokenCategory[item.subType], item.payload, true);
          (0, _proskommaUtils.pushSuccinctTokenBytes)(newItemsBA, _proskommaUtils.tokenEnum[item.subType], charsEnumIndex);
          break;

        case 'graft':
          var graftTypeEnumIndex = this.enumForCategoryValue('graftTypes', item.subType, true);
          var seqEnumIndex = this.enumForCategoryValue('ids', item.payload, true);
          (0, _proskommaUtils.pushSuccinctGraftBytes)(newItemsBA, graftTypeEnumIndex, seqEnumIndex);
          break;

        case 'scope':
          var scopeBits = item.payload.split('/');
          var scopeTypeByte = _proskommaUtils.scopeEnum[scopeBits[0]];

          if (!scopeTypeByte) {
            throw new Error("\"".concat(scopeBits[0], "\" is not a scope type"));
          }

          var scopeBitBytes = scopeBits.slice(1).map(b => this.enumForCategoryValue('scopeBits', b, true));
          (0, _proskommaUtils.pushSuccinctScopeBytes)(newItemsBA, _proskommaUtils.itemEnum["".concat(item.subType, "Scope")], scopeTypeByte, scopeBitBytes);
          break;
      }
    }

    newItemsBA.trim();
    block.c = newItemsBA;
    this.updateBlockIndexesAfterEdit(sequence, blockPosition);
    document.buildChapterVerseIndex();
    return true;
  }

  updateBlockIndexesAfterEdit(sequence, blockPosition) {
    var labelsMatch = (firstA, secondA) => {
      for (var first of Array.from(firstA)) {
        if (!secondA.has(first)) {
          return false;
        }
      }

      for (var second of Array.from(secondA)) {
        if (!firstA.has(second)) {
          return false;
        }
      }

      return true;
    };

    var addSuccinctScope = (docSet, succinct, scopeLabel) => {
      var scopeBits = scopeLabel.split('/');
      var scopeTypeByte = _proskommaUtils.scopeEnum[scopeBits[0]];

      if (!scopeTypeByte) {
        throw new Error("\"".concat(scopeBits[0], "\" is not a scope type"));
      }

      var scopeBitBytes = scopeBits.slice(1).map(b => docSet.enumForCategoryValue('scopeBits', b, true));
      (0, _proskommaUtils.pushSuccinctScopeBytes)(succinct, _proskommaUtils.itemEnum["startScope"], scopeTypeByte, scopeBitBytes);
    };

    var block = sequence.blocks[blockPosition];
    var includedScopeLabels = new Set();
    var openScopeLabels = new Set();

    for (var openScope of this.unsuccinctifyScopes(block.os)) {
      openScopeLabels.add(openScope[2]);
    }

    for (var scope of this.unsuccinctifyItems(block.c, {
      scopes: true
    }, null)) {
      if (scope[1] === 'start') {
        includedScopeLabels.add(scope[2]);
        openScopeLabels.add(scope[2]);
      } else {
        openScopeLabels.delete(scope[2]);
      }
    }

    var isArray = Array.from(includedScopeLabels);
    var isBA = new _proskommaUtils.ByteArray(isArray.length);

    for (var scopeLabel of isArray) {
      addSuccinctScope(this, isBA, scopeLabel);
    }

    isBA.trim();
    block.is = isBA;

    if (blockPosition < sequence.blocks.length - 1) {
      var nextOsBlock = sequence.blocks[blockPosition + 1];
      var nextOsBA = nextOsBlock.os;
      var nextOSLabels = new Set(this.unsuccinctifyScopes(nextOsBA).map(s => s[2]));

      if (!labelsMatch(openScopeLabels, nextOSLabels)) {
        var osBA = new _proskommaUtils.ByteArray(nextOSLabels.length);

        for (var _scopeLabel of Array.from(openScopeLabels)) {
          addSuccinctScope(this, osBA, _scopeLabel);
        }

        osBA.trim();
        nextOsBlock.os = osBA;
        this.updateBlockIndexesAfterEdit(sequence, blockPosition + 1);
      }
    }
  }

  updateBlockIndexesAfterFilter(sequence) {
    var addSuccinctScope = (docSet, succinct, scopeLabel) => {
      var scopeBits = scopeLabel.split('/');
      var scopeTypeByte = _proskommaUtils.scopeEnum[scopeBits[0]];

      if (!scopeTypeByte) {
        throw new Error("\"".concat(scopeBits[0], "\" is not a scope type"));
      }

      var scopeBitBytes = scopeBits.slice(1).map(b => docSet.enumForCategoryValue('scopeBits', b, true));
      (0, _proskommaUtils.pushSuccinctScopeBytes)(succinct, _proskommaUtils.itemEnum["startScope"], scopeTypeByte, scopeBitBytes);
    };

    var openScopeLabels = new Set();

    for (var block of sequence.blocks) {
      var osArray = Array.from(openScopeLabels);
      var osBA = new _proskommaUtils.ByteArray(osArray.length);

      for (var scopeLabel of osArray) {
        addSuccinctScope(this, osBA, scopeLabel);
      }

      osBA.trim();
      block.os = osBA;
      var includedScopeLabels = new Set();

      for (var scope of this.unsuccinctifyItems(block.c, {
        scopes: true
      }, null)) {
        if (scope[1] === 'start') {
          includedScopeLabels.add(scope[2]);
          openScopeLabels.add(scope[2]);
        } else {
          openScopeLabels.delete(scope[2]);
        }
      }

      var isArray = Array.from(includedScopeLabels);
      var isBA = new _proskommaUtils.ByteArray(isArray.length);

      for (var _scopeLabel2 of isArray) {
        addSuccinctScope(this, isBA, _scopeLabel2);
      }

      isBA.trim();
      block.is = isBA;
    }
  }

  serializeSuccinct() {
    var ret = {
      id: this.id,
      metadata: {
        selectors: this.selectors
      },
      enums: {},
      docs: {},
      tags: Array.from(this.tags)
    };

    for (var [eK, eV] of Object.entries(this.enums)) {
      ret.enums[eK] = eV.base64();
    }

    ret.docs = {};

    for (var docId of this.docIds) {
      ret.docs[docId] = this.processor.documents[docId].serializeSuccinct();
    }

    return ret;
  }

}

module.exports = {
  DocSet
};