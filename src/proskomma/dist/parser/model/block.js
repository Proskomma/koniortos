"use strict";

var {
  generateId
} = require('proskomma-utils');

var Block = class {
  constructor(blockScope) {
    this.id = generateId();
    this.items = [];
    this.bg = [];
    this.bs = {
      type: 'scope',
      subType: 'start',
      payload: blockScope
    };
    this.os = [];
  }

  addItem(i) {
    this.items.push(i);
  }

  plainText() {
    return this.items.filter(i => i.type === 'token').map(i => i.payload).join('');
  }

  trim() {
    this.items = this.trimEnd(this.trimStart(this.items));
  }

  reorderSpanWithAtts() {
    var swaStarts = [];

    for (var [pos, item] of this.items.entries()) {
      if (item.subType === 'start' && item.payload.startsWith('spanWithAtts')) {
        swaStarts.push(pos + 1);
      }
    }

    for (var swaStart of swaStarts) {
      var _pos = swaStart;
      var tokens = [];
      var scopes = [];

      while (true) {
        if (_pos >= this.items.length) {
          break;
        }

        var _item = this.items[_pos];

        if (_item.type === 'token') {
          tokens.push(_item);
        } else if (_item.subType === 'start' && _item.payload.startsWith('attribute/spanWithAtts')) {
          scopes.push(_item);
        } else {
          break;
        }

        _pos++;
      }

      if (tokens.length !== 0 && scopes.length !== 0) {
        var _pos2 = swaStart;

        for (var s of scopes) {
          this.items[_pos2] = s;
          _pos2++;
        }

        for (var t of tokens) {
          this.items[_pos2] = t;
          _pos2++;
        }
      }
    }
  }

  inlineToEnd() {
    var toAppend = null;

    for (var [pos, item] of this.items.entries()) {
      if (item.subType === 'end' && ['inline/f', 'inline/fe', 'inline/x'].includes(item.payload)) {
        toAppend = item;
        this.items.splice(pos, 1);
        break;
      }
    }

    if (toAppend) {
      this.addItem(toAppend);
    }
  }

  makeNoteGrafts(parser) {
    var {
      Sequence
    } = require('./sequence');

    var noteStarts = [];

    for (var [pos, item] of this.items.entries()) {
      if (item.subType === 'start' && item.payload.startsWith('inline/f')) {
        noteStarts.push(pos);
      }
    }

    for (var noteStart of noteStarts) {
      var noteLabel = this.items[noteStart].payload;
      var callerToken = this.items[noteStart + 1];

      if (callerToken.type === 'token' && callerToken.payload.length === 1) {
        var callerSequence = new Sequence('noteCaller');
        callerSequence.newBlock(noteLabel);
        callerSequence.addItem(callerToken);
        parser.sequences.noteCaller.push(callerSequence);
        this.items[noteStart + 1] = {
          type: 'graft',
          subType: 'noteCaller',
          payload: callerSequence.id
        };
      }
    }
  }

  trimStart(items) {
    if (items.length === 0) {
      return items;
    }

    var firstItem = items[0];

    if (['lineSpace', 'eol'].includes(firstItem.subType)) {
      return this.trimStart(items.slice(1));
    }

    if (firstItem.type === 'token') {
      return items;
    }

    return [firstItem, ...this.trimStart(items.slice(1))];
  }

  trimEnd(items) {
    if (items.length === 0) {
      return items;
    }

    var lastItem = items[items.length - 1];

    if (['lineSpace', 'eol'].includes(lastItem.subType)) {
      return this.trimEnd(items.slice(0, items.length - 1));
    }

    if (lastItem.type === 'token') {
      return items;
    }

    return [...this.trimEnd(items.slice(0, items.length - 1)), lastItem];
  }

  filterGrafts(options) {
    // Each graft should be removed or returned
    var ret = [];
    var toRemove = [];

    for (var [pos, item] of this.grafts()) {
      if (this.graftPassesOptions(item, options)) {
        ret.push(item.payload);
      } else {
        toRemove.push(pos);
      }
    }

    for (var [count, _pos3] of Array.from(toRemove.entries())) {
      this.items.splice(_pos3 - count, 1);
    }

    toRemove = [];

    for (var [_pos4, _item2] of this.bg.entries()) {
      if (this.graftPassesOptions(_item2, options)) {
        ret.push(_item2.payload);
      } else {
        toRemove.push(_pos4);
      }
    }

    for (var [_count, _pos5] of Array.from(toRemove.entries())) {
      this.bg.splice(_pos5 - _count, 1);
    }

    return ret;
  }

  filterScopes(options) {
    var toRemove = [];

    for (var [pos, item] of this.scopes()) {
      if (!this.scopePassesOptions(item, options)) {
        toRemove.push(pos);
      }
    }

    for (var [count, _pos6] of Array.from(toRemove.entries())) {
      this.items.splice(_pos6 - count, 1);
    }
  }

  graftPassesOptions(item, options) {
    return (!('includeGrafts' in options) || options.includeGrafts.includes(item.subType)) && (!('excludeGrafts' in options) || !options.excludeGrafts.includes(item.subType));
  }

  scopePassesOptions(item, options) {
    return (!('includeScopes' in options) || this.scopeMatchesOptionArray(item.payload, options.includeScopes)) && (!('excludeScopes' in options) || !this.scopeMatchesOptionArray(item.payload, options.excludeScopes));
  }

  scopeMatchesOptionArray(itemString, optionArray) {
    for (var optionString of optionArray) {
      if (itemString.startsWith(optionString)) {
        return true;
      }
    }

    return false;
  }

  removeGraftsToEmptySequences(emptySequences) {
    var ret = [];
    var toRemove = [];

    for (var [pos, item] of this.grafts()) {
      if (emptySequences.includes(item.payload)) {
        toRemove.push(pos);
      }
    }

    for (var [count, _pos7] of Array.from(toRemove.entries())) {
      this.items.splice(_pos7 - count, 1);
    }

    toRemove = [];

    for (var [_pos8, _item3] of this.bg.entries()) {
      if (emptySequences.includes(_item3.payload)) {
        toRemove.push(_pos8);
      }
    }

    for (var [_count2, _pos9] of Array.from(toRemove.entries())) {
      this.bg.splice(_pos9 - _count2, 1);
    }

    return ret;
  }

  grafts() {
    return Array.from(this.items.entries()).filter(ip => ip[1].type === 'graft');
  }

  scopes() {
    return Array.from(this.items.entries()).filter(ip => ip[1].type === 'scope');
  }

  tokens() {
    return Array.from(this.items.entries()).filter(ip => !['scope', 'graft'].includes(ip[1].type));
  }

  text() {
    return this.tokens().map(t => t[1].payload).join('');
  }

};
module.exports = {
  Block
};