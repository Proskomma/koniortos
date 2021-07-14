"use strict";

var {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull
} = require('graphql');

var {
  mapVerse
} = require('proskomma-utils');

var cvType = require('./cv');

var orig = new GraphQLObjectType({
  name: 'orig',
  description: 'Mapped verse information',
  fields: () => ({
    book: {
      type: GraphQLString,
      description: 'The book code',
      resolve: root => root.book
    },
    cvs: {
      type: GraphQLNonNull(GraphQLList(cvType)),
      description: 'A list of chapter-verse references',
      resolve: root => root.cvs
    }
  })
});
var verseNumberType = new GraphQLObjectType({
  name: 'verseNumber',
  description: 'Information about a verse number (which may be part of a verse range)',
  fields: () => ({
    number: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'The verse number',
      resolve: root => root.number
    },
    range: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The verse range to which the verse number belongs',
      resolve: root => root.range
    },
    orig: {
      type: GraphQLNonNull(orig),
      description: 'The reference for this verse when mapped to \'original\' versification',
      resolve: (root, args, context) => {
        var localBook = context.doc.headers.bookCode;
        var localChapter = context.cvIndex[0];
        var localVerse = root.number;
        var mainSequence = context.doc.sequences[context.doc.mainId];

        if (mainSequence.verseMapping && 'forward' in mainSequence.verseMapping && "".concat(localChapter) in mainSequence.verseMapping.forward) {
          var mapping = mapVerse(mainSequence.verseMapping.forward["".concat(localChapter)], localBook, localChapter, localVerse);
          return {
            book: mapping[0],
            cvs: mapping[1]
          };
        } else {
          return {
            book: localBook,
            cvs: [[localChapter, localVerse]]
          };
        }
      }
    }
  })
});
module.exports = verseNumberType;