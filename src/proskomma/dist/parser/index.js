"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var {
  labelForScope,
  parserConstants
} = require('proskomma-utils');

var {
  Sequence
} = require('./model/sequence');

var {
  specs,
  buildSpecLookup
} = require('./parser_specs');

var Parser = class {
  constructor(filterOptions, customTags, emptyBlocks) {
    this.filterOptions = filterOptions;
    this.customTags = customTags;
    this.emptyBlocks = emptyBlocks;
    this.specs = specs(this);
    this.specLookup = buildSpecLookup(this.specs);
    this.headers = {};
    this.baseSequenceTypes = parserConstants.usfm.baseSequenceTypes;
    this.inlineSequenceTypes = parserConstants.usfm.inlineSequenceTypes;
    this.setSequences();
    this.setCurrent();
  }

  setSequences() {
    this.sequences = {};

    for (var [sType, sArity] of Object.entries(_objectSpread(_objectSpread({}, this.baseSequenceTypes), this.inlineSequenceTypes))) {
      switch (sArity) {
        case '1':
          this.sequences[sType] = new Sequence(sType);
          break;

        case '?':
          this.sequences[sType] = null;
          break;

        case '*':
          this.sequences[sType] = [];
          break;

        default:
          throw new Error("Unexpected sequence arity '".concat(sArity, "' for '").concat(sType, "'"));
      }
    }

    this.mainLike = this.sequences.main;
  }

  setCurrent() {
    this.current = {
      sequence: this.sequences.main,
      parentSequence: null,
      baseSequenceType: 'main',
      inlineSequenceType: null,
      attributeContext: null
    };
  }

  parseItem(lexedItem) {
    var changeBaseSequence = false;

    if (['startTag'].includes(lexedItem.subclass)) {
      this.closeActiveScopes("startTag/".concat(lexedItem.fullTagName));

      if (!lexedItem.isNested) {
        this.closeActiveScopes("implicitEnd");
      }
    }

    if (['endTag'].includes(lexedItem.subclass)) {
      this.closeActiveScopes("endTag/".concat(lexedItem.fullTagName));
    }

    if (['startMilestoneTag'].includes(lexedItem.subclass) && lexedItem.sOrE === 'e') {
      this.closeActiveScopes("endMilestone/".concat(lexedItem.tagName));
    }

    if (['chapter', 'pubchapter', 'verses'].includes(lexedItem.subclass)) {
      this.closeActiveScopes(lexedItem.subclass, this.sequences.main);
    }

    var spec = this.specForItem(lexedItem);

    if (spec) {
      if ('before' in spec.parser) {
        spec.parser.before(this, lexedItem);
      }

      changeBaseSequence = false;

      if (spec.parser.baseSequenceType) {
        var returnSequenceType = spec.parser.baseSequenceType === 'mainLike' ? this.mainLike.type : spec.parser.baseSequenceType;
        changeBaseSequence = returnSequenceType !== this.current.baseSequenceType || spec.parser.forceNewSequence;
      }

      if (changeBaseSequence) {
        this.closeActiveScopes('baseSequenceChange');
        this.changeBaseSequence(spec.parser);

        if ('newBlock' in spec.parser && spec.parser.newBlock) {
          this.closeActiveScopes('endBlock');
          this.current.sequence.newBlock(labelForScope('blockTag', [lexedItem.fullTagName]));
        }
      } else if (spec.parser.inlineSequenceType) {
        this.current.inlineSequenceType = spec.parser.inlineSequenceType;
        this.current.parentSequence = this.current.sequence;

        if (this.current.parentSequence.type === 'header') {
          // Not lovely, needed for \cp before first content
          this.current.parentSequence = this.sequences.main;
        }

        this.current.sequence = new Sequence(this.current.inlineSequenceType);
        this.current.sequence.newBlock(labelForScope('inline', spec.parser.inlineSequenceType));
        this.sequences[this.current.inlineSequenceType].push(this.current.sequence);
        this.current.parentSequence.addItem({
          type: 'graft',
          subType: this.current.inlineSequenceType,
          payload: this.current.sequence.id
        });
      } else if ('newBlock' in spec.parser && spec.parser.newBlock) {
        this.current.sequence.newBlock(labelForScope('blockTag', [lexedItem.fullTagName]));
      }

      if ('during' in spec.parser) {
        spec.parser.during(this, lexedItem);
      }

      this.openNewScopes(spec.parser, lexedItem);

      if ('after' in spec.parser) {
        spec.parser.after(this, lexedItem);
      }
    }
  }

  tidy() {
    for (var introduction of this.sequences.introduction) {
      introduction.graftifyIntroductionHeadings(this);
    }

    var allSequences = this.allSequences();

    for (var seq of allSequences) {
      seq.trim();
      seq.reorderSpanWithAtts();
      seq.makeNoteGrafts(this);
      seq.moveOrphanScopes();
      seq.removeEmptyBlocks(this.emptyBlocks);
    }

    var emptySequences = this.emptySequences(allSequences);

    for (var _seq of allSequences) {
      if (emptySequences) {
        _seq.removeGraftsToEmptySequences(emptySequences);
      }

      _seq.addTableScopes();

      _seq.close(this);

      this.substitutePubNumberScopes(_seq);

      if (_seq.type === 'sidebar') {
        this.substituteEsbCatScopes(_seq);
      }

      if (['footnote', 'xref'].includes(_seq.type)) {
        _seq.lastBlock().inlineToEnd();
      }
    }
  }

  emptySequences(sequences) {
    return sequences.filter(s => s.blocks.length === 0).map(s => s.id);
  }

  substitutePubNumberScopes(seq) {
    var scopeToGraftContent = {};
    var sequenceById = this.sequenceById();

    for (var block of seq.blocks) {
      var spliceCount = 0;
      var itItems = [...block.items];

      for (var [n, item] of itItems.entries()) {
        if (item.type === 'graft' && ['pubNumber', 'altNumber'].includes(item.subType)) {
          var graftContent = sequenceById[item.payload].text().trim();
          var scopeId = itItems[n + 1].payload.split('/')[1];
          scopeToGraftContent[scopeId] = graftContent;
          block.items.splice(n - spliceCount, 1);
          spliceCount++;
        }
      }
    } // Substitute scopeIds for graft content


    if (Object.keys(scopeToGraftContent).length > 0) {
      for (var _block of seq.blocks) {
        for (var scope of _block.items.filter(i => i.type === 'scope')) {
          var scopeParts = scope.payload.split('/');

          if (['altChapter', 'pubVerse', 'altVerse'].includes(scopeParts[0])) {
            scope.payload = "".concat(scopeParts[0], "/").concat(scopeToGraftContent[scopeParts[1]]);
          }
        }
      }
    }
  }

  substituteEsbCatScopes(seq) {
    var scopeToGraftContent = {};
    var sequenceById = this.sequenceById();

    for (var block of seq.blocks) {
      var spliceCount = 0;
      var itItems = [...block.items];

      for (var [n, item] of itItems.entries()) {
        if (item.type === 'graft' && item.subType === 'esbCat') {
          var catContent = sequenceById[item.payload].text().trim();
          var scopeId = itItems[1].payload.split('/')[1];
          scopeToGraftContent[scopeId] = catContent;
          block.items.splice(n - spliceCount, 1);
          spliceCount++;
        }
      }
    } // Substitute scopeIds for graft content


    if (Object.keys(scopeToGraftContent).length > 0) {
      for (var _block2 of seq.blocks) {
        for (var scope of _block2.items.filter(i => i.type === 'scope')) {
          var scopeParts = scope.payload.split('/');

          if (scopeParts[0] === 'esbCat') {
            scope.payload = "".concat(scopeParts[0], "/").concat(scopeToGraftContent[scopeParts[1]]);
          }
        }
      }
    }
  }

  allSequences() {
    var ret = [];

    for (var [seqName, seqArity] of Object.entries(_objectSpread(_objectSpread({}, this.baseSequenceTypes), this.inlineSequenceTypes))) {
      switch (seqArity) {
        case '1':
        case '?':
          if (this.sequences[seqName]) {
            ret.push(this.sequences[seqName]);
          }

          break;

        case '*':
          this.sequences[seqName].forEach(s => {
            ret.push(s);
          });
          break;

        default:
          throw new Error("Unexpected sequence arity '".concat(seqArity, "' for '").concat(seqName, "'"));
      }
    }

    return ret;
  }

  sequenceById() {
    var ret = {};
    this.allSequences().forEach(s => {
      ret[s.id] = s;
    });
    return ret;
  }

  filter() {
    var usedSequences = [];
    var sequenceById = this.sequenceById();
    this.filterGrafts(this.sequences.main.id, sequenceById, usedSequences, this.filterOptions);
    this.removeUnusedSequences(usedSequences);
    this.filterScopes(Object.values(sequenceById), this.filterOptions);
  }

  filterGrafts(seqId, seqById, used, options) {
    used.push(seqId);
    var childSequences = seqById[seqId].filterGrafts(options);

    for (var si of childSequences) {
      if (seqById[si].type === 'main') {
        console.log('MAIN is child!');
        console.log(JSON.stringify(seqById[seqId], null, 2));
        process.exit(1);
      }

      this.filterGrafts(si, seqById, used, options);
    }
  }

  removeUnusedSequences(usedSequences) {
    var _this = this;

    var _loop = function _loop(seq) {
      if (!usedSequences.includes(seq.id)) {
        var seqArity = _objectSpread(_objectSpread({}, _this.baseSequenceTypes), _this.inlineSequenceTypes)[seq.type];

        switch (seqArity) {
          case '1':
            throw new Error('Attempting to remove sequence with arity of 1');

          case '?':
            _this.sequences[seq.type] = null;
            break;

          case '*':
            _this.sequences[seq.type] = _this.sequences[seq.type].filter(s => s.id !== seq.id);
            break;

          default:
            throw new Error("Unexpected sequence arity '".concat(seqArity, "' for '").concat(seq.type, "'"));
        }
      }
    };

    for (var seq of this.allSequences()) {
      _loop(seq);
    }
  }

  filterScopes(sequences, options) {
    sequences.forEach(s => s.filterScopes(options));
  }

  specForItem(item) {
    var context = item.subclass;

    if (!(context in this.specLookup)) {
      return null;
    }

    for (var accessor of ['tagName', 'sOrE']) {
      if (accessor in item && accessor in this.specLookup[context] && item[accessor] in this.specLookup[context][accessor]) {
        return {
          parser: this.specLookup[context][accessor][item[accessor]]
        };
      }
    }

    if ('_noAccessor' in this.specLookup[context]) {
      return {
        parser: this.specLookup[context]['_noAccessor']
      };
    }

    return null;
  }

  closeActiveScopes(closeLabel, targetSequence) {
    if (targetSequence === undefined) {
      targetSequence = this.current.sequence;
    }

    var matchedScopes = targetSequence.activeScopes.filter(sc => sc.endedBy.includes(closeLabel)).reverse();
    targetSequence.activeScopes = targetSequence.activeScopes.filter(sc => !sc.endedBy.includes(closeLabel));
    matchedScopes.forEach(ms => this.closeActiveScope(ms, targetSequence));
  }

  closeActiveScope(sc, targetSequence) {
    this.addScope('end', sc.label, targetSequence);

    if (sc.onEnd) {
      sc.onEnd(this, sc.label);
    }
  }

  changeBaseSequence(parserSpec) {
    var newType = parserSpec.baseSequenceType;

    if (newType === 'mainLike') {
      this.current.sequence = this.mainLike;
      return;
    }

    this.current.baseSequenceType = newType;
    var arity = this.baseSequenceTypes[newType];

    switch (arity) {
      case '1':
        this.current.sequence = this.sequences[newType];
        break;

      case '?':
        if (!this.sequences[newType]) {
          this.sequences[newType] = new Sequence(newType);
        }

        this.current.sequence = this.sequences[newType];
        break;

      case '*':
        this.current.sequence = new Sequence(newType);

        if (!parserSpec.useTempSequence) {
          this.sequences[newType].push(this.current.sequence);
        }

        break;

      default:
        throw new Error("Unexpected base sequence arity '".concat(arity, "' for '").concat(newType, "'"));
    }

    if (!parserSpec.useTempSequence && this.current.sequence.type !== 'main') {
      this.mainLike.addBlockGraft({
        type: 'graft',
        subType: this.current.baseSequenceType,
        payload: this.current.sequence.id
      });
    }
  }

  returnToBaseSequence() {
    this.current.inlineSequenceType = null;
    this.current.sequence = this.current.parentSequence;
    this.current.parentSequence = null;
  }

  openNewScopes(parserSpec, pt) {
    if (parserSpec.newScopes) {
      var targetSequence = this.current.sequence;

      if ('mainSequence' in parserSpec && parserSpec.mainSequence) {
        targetSequence = this.sequences.main;
      }

      parserSpec.newScopes.forEach(sc => this.openNewScope(pt, sc, true, targetSequence));
    }
  }

  openNewScope(pt, sc, addItem, targetSequence) {
    if (addItem === undefined) {
      addItem = true;
    }

    if (targetSequence === undefined) {
      targetSequence = this.current.sequence;
    }

    if (addItem) {
      targetSequence.addItem({
        type: 'scope',
        subType: 'start',
        payload: sc.label(pt)
      });
    }

    var newScope = {
      label: sc.label(pt),
      endedBy: this.substituteEndedBys(sc.endedBy, pt)
    };

    if ('onEnd' in sc) {
      newScope.onEnd = sc.onEnd;
    }

    targetSequence.activeScopes.push(newScope);
  }

  substituteEndedBys(endedBy, pt) {
    return endedBy.map(eb => {
      var ret = eb.replace('$fullTagName$', pt.fullTagName).replace('$tagName$', pt.tagName);

      if (this.current.attributeContext) {
        ret = ret.replace('$attributeContext$', this.current.attributeContext.replace('milestone', 'endMilestone').replace('spanWithAtts', 'endTag'));
      }

      return ret;
    });
  }

  addToken(pt) {
    this.current.sequence.addItem({
      type: 'token',
      subType: pt.subclass,
      payload: pt.printValue
    });
  }

  addScope(sOrE, label, targetSequence) {
    if (targetSequence === undefined) {
      targetSequence = this.current.sequence;
    }

    targetSequence.addItem({
      type: 'scope',
      subType: sOrE,
      payload: label
    });
  }

  addEmptyMilestone(label) {
    this.mainLike.addItem({
      type: 'scope',
      subType: 'start',
      payload: label
    });
    this.mainLike.addItem({
      type: 'scope',
      subType: 'end',
      payload: label
    });
  }

  setAttributeContext(label) {
    this.current.attributeContext = label;
  }

  clearAttributeContext() {
    this.current.attributeContext = null;
  }

};
module.exports = {
  Parser
};