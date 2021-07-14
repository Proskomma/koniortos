"use strict";

var {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInt
} = require('graphql');

var {
  mapVerse
} = require('proskomma-utils');

var sequenceType = require('./sequence');

var keyValueType = require('./key_value');

var cvIndexType = require('./cvIndex');

var cIndexType = require('./cIndex');

var itemGroupType = require('./itemGroup');

var cvNavigationType = require('./cvNavigation');

var headerById = (root, id) => id in root.headers ? root.headers[id] : null;

var do_cv = (root, args, context, doMap, mappedDocSetId) => {
  var updatedOpenScopes = (openScopes, items) => {
    var ret = openScopes;

    var _loop = function _loop(item) {
      if (item[0] === 'scope') {
        if (item[1] === 'start') {
          var existingScopes = ret.filter(s => s[2] === item[2]);

          if (existingScopes.length === 0) {
            ret.push(item[2]);
          }
        } else {
          ret = openScopes.filter(s => s[2] !== item[2]);
        }
      }
    };

    for (var item of items) {
      _loop(item);
    }

    return ret;
  };

  context.docSet = root.processor.docSets[root.docSetId];
  var mainSequence = root.sequences[root.mainId];

  if (!args.chapter && !args.chapterVerses) {
    throw new Error('Must specify either chapter or chapterVerse for cv');
  }

  if (args.chapter && args.chapterVerses) {
    throw new Error('Must not specify both chapter and chapterVerse for cv');
  }

  if (args.chapterVerses && args.verses) {
    throw new Error('Must not specify both chapterVerses and verses for cv');
  }

  if (args.chapter && !args.verses) {
    // whole chapter
    var ci = root.chapterIndex(args.chapter);

    if (ci) {
      var block = mainSequence.blocks[ci.startBlock];
      return [[updatedOpenScopes(context.docSet.unsuccinctifyScopes(block.os).map(s => s[2]), context.docSet.unsuccinctifyItems(block.c, {
        scopes: true
      }, 0, []).slice(0, ci.startItem)), context.docSet.itemsByIndex(mainSequence, ci, args.includeContext || false).reduce((a, b) => a.concat([['token', 'lineSpace', ' ']].concat(b)))]];
    } else {
      return [];
    }
  } else if (args.verses) {
    // c:v, c:v-v, may be mapped
    var docSet = context.docSet;
    var book = root.headers.bookCode;
    var chapterVerses = args.verses.map(v => [parseInt(args.chapter), parseInt(v)]);

    if (doMap) {
      var mappedDocSet = root.processor.docSets[mappedDocSetId];

      if (mappedDocSet) {
        docSet = mappedDocSet;
      }

      if ('forward' in mainSequence.verseMapping && args.chapter in mainSequence.verseMapping.forward) {
        var mappings = [];

        for (var verse of args.verses) {
          // May handle multiple verses one day, but, eg, may map to multiple books
          mappings.push(mapVerse(mainSequence.verseMapping.forward[args.chapter], root.headers.bookCode, args.chapter, verse));
        }

        var mapping = mappings[0];
        book = mapping[0];
        chapterVerses = mapping[1];
      }

      var mappedDocument = docSet.documentWithBook(book);

      if (mappedDocument) {
        var mappedMainSequence = mappedDocument.sequences[mappedDocument.mainId];

        if (mappedMainSequence.verseMapping && 'reversed' in mappedMainSequence.verseMapping) {
          var doubleMappings = [];

          for (var [origC, origV] of chapterVerses) {
            if ("".concat(origC) in mappedMainSequence.verseMapping.reversed) {
              doubleMappings.push(mapVerse(mappedMainSequence.verseMapping.reversed["".concat(origC)], book, origC, origV));
            } else {
              doubleMappings.push([book, [[origC, origV]]]);
            }

            book = doubleMappings[0][0];
            chapterVerses = doubleMappings.map(bcv => bcv[1]).reduce((a, b) => a.concat(b));
          }
        }
      }
    }

    var cvis = {};
    var document = docSet.documentWithBook(book);

    if (!document) {
      return [];
    }

    var documentMainSequence = document.sequences[document.mainId];

    for (var chapter of chapterVerses.map(cv => cv[0])) {
      if (!(chapter in cvis)) {
        cvis[chapter] = document.chapterVerseIndex(chapter);
      }
    }

    var retItemGroups = [];

    for (var [_chapter, _verse] of chapterVerses) {
      if (cvis[_chapter]) {
        var retItems = [];
        var firstStartBlock = void 0;
        var firstStartItem = void 0;

        if (cvis[_chapter][_verse]) {
          for (var ve of cvis[_chapter][_verse]) {
            if (!firstStartBlock) {
              firstStartBlock = ve.startBlock;
              firstStartItem = ve.startItem;
            }

            retItems = retItems.concat(docSet.itemsByIndex(documentMainSequence, ve, args.includeContext || null).reduce((a, b) => a.concat([['token', 'lineSpace', ' ']].concat(b))));
          }

          var _block = documentMainSequence.blocks[firstStartBlock];
          retItemGroups.push([updatedOpenScopes(docSet.unsuccinctifyScopes(_block.os).map(s => s[2]), docSet.unsuccinctifyItems(_block.c, {
            scopes: true
          }, 0, []).slice(0, firstStartItem)), retItems]);
        }
      }
    } // console.log(JSON.stringify(retItemGroups, null, 2));


    return retItemGroups;
  } else {
    // ChapterVerse, c:v-c:v
    var [fromCV, toCV] = args.chapterVerses.split('-');
    var [fromC, fromV] = fromCV.split(':');
    var [toC, toV] = toCV.split(':');
    var fromCVI = root.chapterVerseIndex(fromC);
    var toCVI = root.chapterVerseIndex(toC);

    if (!fromCVI || !toCVI || !fromCVI[parseInt(fromV)] || !toCVI[parseInt(toV)]) {
      return [];
    }

    var index = {
      startBlock: fromCVI[parseInt(fromV)][0].startBlock,
      endBlock: toCVI[parseInt(toV)][0].endBlock,
      startItem: fromCVI[parseInt(fromV)][0].startItem,
      endItem: toCVI[parseInt(toV)][0].endItem,
      nextToken: toCVI[parseInt(toV)][0].nextToken
    };

    if (index.startBlock > index.endBlock || index.startBlock === index.endBlock && index.startItem >= index.endItem) {
      return [];
    }

    var _block2 = mainSequence.blocks[index.startBlock];
    return [[updatedOpenScopes(context.docSet.unsuccinctifyScopes(_block2.os).map(s => s[2]), context.docSet.unsuccinctifyItems(_block2.c, {
      scopes: true
    }, 0, []).slice(0, index.startItem)), context.docSet.itemsByIndex(mainSequence, index, args.includeContext || false).reduce((a, b) => a.concat([['token', 'lineSpace', ' ']].concat(b)))]];
  }
};

var documentType = new GraphQLObjectType({
  name: 'Document',
  description: 'A document, typically corresponding to USFM for one book',
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The id of the document'
    },
    docSetId: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The id of the docSet to which this document belongs'
    },
    headers: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(keyValueType))),
      description: 'USFM header information such as TOC',
      resolve: root => Object.entries(root.headers)
    },
    header: {
      type: GraphQLString,
      description: 'One USFM header',
      args: {
        id: {
          type: GraphQLNonNull(GraphQLString),
          description: 'The header id, corresponding to the tag name minus any trailing \'1\''
        }
      },
      resolve: (root, args) => headerById(root, args.id)
    },
    mainSequence: {
      type: GraphQLNonNull(sequenceType),
      description: 'The main sequence',
      resolve: (root, args, context) => {
        context.docSet = root.processor.docSets[root.docSetId];
        return root.sequences[root.mainId];
      }
    },
    nSequences: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'The number of sequences',
      resolve: (root, args, context) => {
        context.docSet = root.processor.docSets[root.docSetId];
        return Object.keys(root.sequences).length;
      }
    },
    sequences: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(sequenceType))),
      description: 'A list of sequences for this document',
      resolve: (root, args, context) => {
        context.docSet = root.processor.docSets[root.docSetId];
        return Object.values(root.sequences);
      }
    },
    tags: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))),
      description: 'A list of the tags of this document',
      resolve: root => Array.from(root.tags)
    },
    hasTag: {
      type: GraphQLNonNull(GraphQLBoolean),
      description: 'Whether or not the document has the specified tag',
      args: {
        tagName: {
          type: GraphQLNonNull(GraphQLString),
          description: 'The tag'
        }
      },
      resolve: (root, args) => root.tags.has(args.tagName)
    },
    cv: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(itemGroupType))),
      description: 'Content for a Scripture reference within this document, using local versification',
      args: {
        chapter: {
          type: GraphQLString,
          description: 'The chapter number (as a string)'
        },
        verses: {
          type: GraphQLList(GraphQLNonNull(GraphQLString)),
          description: 'A list of verse numbers (as strings)'
        },
        chapterVerses: {
          type: GraphQLString,
          description: 'A chapterVerse Reference (ch:v-ch:v)'
        },
        includeContext: {
          type: GraphQLBoolean,
          description: 'If true, adds scope and nextToken information to each token'
        }
      },
      resolve: (root, args, context) => do_cv(root, args, context, false)
    },
    mappedCv: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(itemGroupType))),
      description: 'Content for a Scripture reference within this document, using the versification of the specified docSet',
      args: {
        chapter: {
          type: GraphQLNonNull(GraphQLString),
          description: 'The chapter number (as a string)'
        },
        mappedDocSetId: {
          type: GraphQLNonNull(GraphQLString),
          description: 'The id of the mapped docSet'
        },
        verses: {
          type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))),
          description: 'A list of verse numbers (as strings)'
        },
        includeContext: {
          type: GraphQLBoolean,
          description: 'If true, adds scope and nextToken information to each token'
        }
      },
      resolve: (root, args, context) => {
        if (args.verses.length !== 1) {
          throw new Error("mappedCv expects exactly one verse, not ".concat(args.verses.length));
        }

        return do_cv(root, args, context, true, args.mappedDocSetId);
      }
    },
    cvNavigation: {
      type: cvNavigationType,
      description: 'What\'s previous and next with respect to the specified verse',
      args: {
        chapter: {
          type: GraphQLNonNull(GraphQLString),
          description: 'The chapter number (as a string)'
        },
        verse: {
          type: GraphQLNonNull(GraphQLString),
          description: 'A verse number (as a string)'
        }
      },
      resolve: (root, args, context) => [args.chapter, args.verse, root.chapterVerseIndex((parseInt(args.chapter) - 1).toString()), root.chapterVerseIndex(args.chapter), root.chapterVerseIndex((parseInt(args.chapter) + 1).toString())]
    },
    cvIndexes: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(cvIndexType))),
      description: 'The content of the main sequence indexed by chapterVerse',
      resolve: (root, args, context) => {
        context.docSet = root.processor.docSets[root.docSetId];
        context.doc = root;
        return Object.entries(root.chapterVerseIndexes());
      }
    },
    cvIndex: {
      type: GraphQLNonNull(cvIndexType),
      description: 'The content of the specified chapter indexed by chapterVerse',
      args: {
        chapter: {
          type: GraphQLNonNull(GraphQLInt),
          description: 'The chapter number'
        }
      },
      resolve: (root, args, context) => {
        context.docSet = root.processor.docSets[root.docSetId];
        context.doc = root;
        return [args.chapter, root.chapterVerseIndex(args.chapter) || []];
      }
    },
    cIndexes: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(cIndexType))),
      description: 'The content of the main sequence indexed by chapter',
      resolve: (root, args, context) => {
        context.docSet = root.processor.docSets[root.docSetId];
        context.doc = root;
        return Object.entries(root.chapterIndexes());
      }
    },
    cIndex: {
      type: GraphQLNonNull(cIndexType),
      description: 'The content of a chapter',
      args: {
        chapter: {
          type: GraphQLNonNull(GraphQLInt),
          description: 'The chapter number'
        }
      },
      resolve: (root, args, context) => {
        context.docSet = root.processor.docSets[root.docSetId];
        context.doc = root;
        var ci = root.chapterIndex(args.chapter);
        return [args.chapter, ci || {}];
      }
    }
  })
});
module.exports = documentType;