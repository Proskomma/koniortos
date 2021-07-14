"use strict";

var dumpItem = i => {
  var wrapper;

  switch (i[0]) {
    case 'token':
      return "|".concat(i[2]);

    case 'scope':
      wrapper = i[1] === 'start' ? '+' : '-';
      return "".concat(wrapper).concat(i[2]).concat(wrapper);

    case 'graft':
      return ">".concat(i[1], "<");
  }
};

var dumpItems = il => il.map(bci => dumpItem(bci)).join('');

var dumpItemGroup = ig => {
  var ret = ['ItemGroup:'];
  ret.push("   Open Scopes ".concat(ig[0].join(', ')));
  ret.push("   ".concat(dumpItems(ig[1])));
  return ret.join('\n');
};

var dumpBlock = b => {
  var ret = ['Block:'];

  if (b.bg.length > 0) {
    b.bg.forEach(bbg => ret.push("   ".concat(bbg[1], " graft to ").concat(bbg[2])));
  }

  ret.push("   Scope ".concat(b.bs[2]));
  ret.push("   ".concat(dumpItems(b.c)));
  return ret.join('\n');
};

module.exports = {
  dumpBlock,
  dumpItemGroup,
  dumpItems,
  dumpItem
};