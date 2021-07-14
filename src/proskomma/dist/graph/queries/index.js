"use strict";

var {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull
} = require('graphql');

var docSetType = require('./doc_set');

var documentType = require('./document');

var inputKeyValueType = require('./input_key_value');

var selectorSpecType = require('./selector_spec');

/*
var diffRecordType = require('./diff_record');
*/

var schemaQueries = new GraphQLObjectType({
  name: 'Query',
  description: 'The top level of Proskomma queries',
  fields: {
    id: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The id of the processor, which is different for each Proskomma instance',
      resolve: root => root.processorId
    },
    processor: {
      type: GraphQLNonNull(GraphQLString),
      description: 'A string describing the processor class'
    },
    packageVersion: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The NPM package version'
    },
    selectors: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(selectorSpecType))),
      description: 'The selectors used to define docSets',
      resolve: root => root.selectors
    },
    nDocSets: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'The number of docSets'
    },
    docSets: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(docSetType))),
      description: 'The docSets in the processor',
      args: {
        ids: {
          type: GraphQLList(GraphQLNonNull(GraphQLString)),
          description: 'A whitelist of ids of docSets to include'
        },
        withSelectors: {
          type: GraphQLList(GraphQLNonNull(inputKeyValueType)),
          description: 'Only return docSets that match the list of selector values'
        },
        withBook: {
          type: GraphQLString,
          description: 'Only return docSets containing a document with the specified bookCode'
        }
      },
      resolve: (root, args) => {
        var docSetMatchesSelectors = (ds, selectors) => {
          for (var selector of selectors) {
            if (ds.selectors[selector.key].toString() !== selector.value) {
              return false;
            }
          }

          return true;
        };

        var docSetValues = ('withBook' in args ? root.docSetsWithBook(args.withBook) : Object.values(root.docSets)).filter(ds => !args.ids || args.ids.includes(ds.id));

        if (args.withSelectors) {
          return docSetValues.filter(ds => docSetMatchesSelectors(ds, args.withSelectors));
        } else {
          return docSetValues;
        }
      }
    },
    docSet: {
      type: docSetType,
      description: 'The docSet with the specified id',
      args: {
        id: {
          type: GraphQLNonNull(GraphQLString),
          description: 'The id of the docSet'
        }
      },
      resolve: (root, args) => root.docSetById(args.id)
    },
    nDocuments: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'The number of documents in the processor'
    },
    documents: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(documentType))),
      description: 'The documents in the processor',
      args: {
        ids: {
          type: GraphQLList(GraphQLNonNull(GraphQLString)),
          description: 'A whitelist of ids of documents to include'
        },
        withBook: {
          type: GraphQLString,
          description: 'Only return docSets containing a document with the specified bookCode'
        }
      },
      resolve: (root, args) => {
        var documentValues = args.withBook ? root.documentsWithBook(args.withBook) : root.documentList();
        return documentValues.filter(d => !args.ids || args.ids.includes(d.id));
      }
    },
    document: {
      type: documentType,
      description: 'The document with the specified id',
      args: {
        id: {
          type: GraphQLNonNull(GraphQLString),
          description: 'The id of the document'
        }
      },
      resolve: (root, args) => root.documentById(args.id)
    },
/*
    diff: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(diffRecordType))),
      args: {
        document1: {
          type: GraphQLNonNull(GraphQLString)
        },
        document2: {
          type: GraphQLNonNull(GraphQLString)
        },
        mode: {
          type: GraphQLNonNull(GraphQLString)
        }
      },
      resolve: (root, args) => {
        if (args.document1 === args.document2) {
          throw new Error('document1 and document2 should not be equal');
        }

        if (!['words', 'tokens'].includes(args.mode)) {
          throw new Error("mode should be 'words' or 'tokens', not '".concat(args.mode, "'"));
        }

        if (!(args.document1 in root.documents)) {
          throw new Error("document1 id '".concat(args.document1, "' does not exist"));
        }

        if (!(args.document2 in root.documents)) {
          throw new Error("document2 id '".concat(args.document2, "' does not exist"));
        }

        var docSet1 = root.docSets[root.documents[args.document1].docSetId];
        docSet1.maybeBuildEnumIndexes();

        if (!docSet1) {
          throw new Error("No docSet for document '".concat(args.document1, "'"));
        }

        var docSet2 = root.docSets[root.documents[args.document2].docSetId];
        docSet1.maybeBuildEnumIndexes();

        if (!docSet2) {
          throw new Error("No docSet for document '".concat(args.document2, "'"));
        }

        var doc1 = root.documents[args.document1];
        var doc2 = root.documents[args.document2];
        var doc1Indexes = doc1.chapterVerseIndexes();
        var doc2Indexes = doc2.chapterVerseIndexes();
        var diffRecords = [];

        var _loop = function _loop(chapterN, chapter1Index) {
          if (!(chapterN in doc2Indexes)) {
            // Removed chapter
            diffRecords.push([chapterN, null, 'removedChapter', null, null]);
            return "continue";
          }

          var chapter2Index = doc2Indexes[chapterN];

          for (var verseN of [...chapter1Index.entries()].map(e => e[0])) {
            if (chapter1Index[verseN].length > 0 && (verseN >= chapter2Index.length || chapter2Index[verseN].length === 0)) {
              // removed verse
              var _doc1Items = docSet1.itemsByIndex(doc1.sequences[doc1.mainId], chapter1Index[verseN][0]).reduce((a, b) => a.concat([b]), []).reduce((a, b) => a.concat(b), []);

              diffRecords.push([chapterN, verseN, 'removedVerse', _doc1Items, null]);
              continue;
            }

            if (chapter1Index[verseN].length === 0 && chapter2Index[verseN].length > 0) {
              // added Verse
              var _doc2Items = docSet2.itemsByIndex(doc2.sequences[doc2.mainId], chapter2Index[verseN][0]).reduce((a, b) => a.concat([b]), []).reduce((a, b) => a.concat(b), []);

              diffRecords.push([chapterN, verseN, 'addedVerse', null, _doc2Items]);
              continue;
            }

            var doc1Items = docSet1.itemsByIndex(doc1.sequences[doc1.mainId], chapter1Index[verseN][0]).reduce((a, b) => a.concat([b]), []).reduce((a, b) => a.concat(b), []);
            var doc2Items = docSet2.itemsByIndex(doc2.sequences[doc2.mainId], chapter2Index[verseN][0]).reduce((a, b) => a.concat([b]), []).reduce((a, b) => a.concat(b), []);
            var doc1Tokens = doc1Items.filter(i => i[0] === 'token');
            var doc2Tokens = doc2Items.filter(i => i[0] === 'token');
            var doc1Text = void 0;
            var doc2Text = void 0;

            if (args.mode === 'words') {
              doc1Tokens = doc1Tokens.filter(t => t[1] === 'wordLike');
              doc2Tokens = doc2Tokens.filter(t => t[1] === 'wordLike');
              doc1Text = doc1Tokens.map(t => t[2]).join(' ');
              doc2Text = doc2Tokens.map(t => t[2]).join(' ');
            } else {
              doc1Text = doc1Tokens.map(t => t[1] === 'lineSpace' ? ' ' : t[2]).join('');
              doc2Text = doc2Tokens.map(t => t[1] === 'lineSpace' ? ' ' : t[2]).join('');
            }

            if (doc1Text !== doc2Text) {
              diffRecords.push([chapterN, verseN, 'changedVerse', doc1Items, doc2Items]);
            }
          }

          if (chapter2Index.length > chapter1Index.length) {
            // Extra verses at end of doc2
            for (var v of [...Array(chapter2Index.length - chapter1Index.length).keys()].map(i => i + chapter1Index.length)) {
              diffRecords.push([chapterN, v, 'addedVerse', null, null]);
            }
          }
        };

        for (var [chapterN, chapter1Index] of Object.entries(doc1Indexes)) {
          var _ret = _loop(chapterN, chapter1Index);

          if (_ret === "continue") continue;
        }

        for (var doc2Key of Object.keys(doc2Indexes)) {
          if (!(doc2Key in doc1Indexes)) {
            // Added chapters
            diffRecords.push([doc2Key, null, 'addedChapter', null, null]);
          }
        }

        return diffRecords;
      }
    }
*/
  }
});
module.exports = {
  schemaQueries
};