"use strict";

var {
  GraphQLString,
  GraphQLBoolean,
  GraphQLNonNull
} = require('graphql');

var {
  vrs2json,
  reverseVersification,
  succinctifyVerseMappings,
  mapVerse
} = require('proskomma-utils');

var versificationMutations = {
  setVerseMapping: {
    type: GraphQLNonNull(GraphQLBoolean),
    description: 'Adds verse mapping tables to the documents in a docSet, where the verse mapping may be provided in legacy .vrs or JSON format',
    args: {
      docSetId: {
        type: GraphQLNonNull(GraphQLString),
        description: 'the id of the docSet to which the verse mapping will be added'
      },
      vrsSource: {
        type: GraphQLString,
        description: 'The verse mapping, in legacy .vrs format (as a string)'
      },
      jsonSource: {
        type: GraphQLString,
        description: 'The verse mapping, in JSON format (as a string)'
      }
    },
    resolve: (root, args) => {
      if (args.vrsSource && args.jsonSource) {
        throw new Error('Cannot specify both vrsSource and jsonSource');
      } else if (!args.vrsSource && !args.jsonSource) {
        throw new Error('Must specify either vrsSource or jsonSource');
      }

      var docSet = root.docSets[args.docSetId];

      if (!docSet) {
        return false;
      }

      var jsonSource;

      if (args.vrsSource) {
        jsonSource = vrs2json(args.vrsSource);
      } else {
        jsonSource = args.jsonSource;
      }

      var forwardSuccinctTree = succinctifyVerseMappings(jsonSource.mappedVerses);
      var reversedJsonSource = reverseVersification(jsonSource);
      var reversedSuccinctTree = succinctifyVerseMappings(reversedJsonSource.reverseMappedVerses);

      for (var document of docSet.documents().filter(doc => 'bookCode' in doc.headers)) {
        var bookCode = document.headers['bookCode'];
        var bookDocument = docSet.documentWithBook(bookCode);

        if (!bookDocument) {
          continue;
        }

        var bookMainSequence = bookDocument.sequences[bookDocument.mainId];
        bookMainSequence.verseMapping = {};

        if (bookCode in forwardSuccinctTree) {
          bookMainSequence.verseMapping.forward = forwardSuccinctTree[bookCode];
        }

        if (bookCode in reversedSuccinctTree) {
          bookMainSequence.verseMapping.reversed = reversedSuccinctTree[bookCode];
        }
      }

      docSet.tags.add('hasMapping');
      return true;
    }
  },
  unsetVerseMapping: {
    type: GraphQLNonNull(GraphQLBoolean),
    description: 'Removes verse mapping tables from the documents in a docSet',
    args: {
      docSetId: {
        type: GraphQLNonNull(GraphQLString),
        description: 'The id of the docSet from which verse mapping will be removed'
      }
    },
    resolve: (root, args) => {
      var docSet = root.docSets[args.docSetId];

      if (!docSet) {
        return false;
      }

      for (var document of docSet.documents().filter(doc => 'bookCode' in doc.headers)) {
        var bookCode = document.headers['bookCode'];
        var bookDocument = docSet.documentWithBook(bookCode);

        if (bookDocument) {
          var bookMainSequence = bookDocument.sequences[bookDocument.mainId];
          bookMainSequence.verseMapping = {};
        }
      }

      docSet.tags.delete('hasMapping');
      return true;
    }
  }
};
module.exports = versificationMutations;