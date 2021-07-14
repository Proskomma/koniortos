"use strict";

var {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull
} = require('graphql');

var cvType = require('./cv');

var cvNavigationType = new GraphQLObjectType({
  // root is [ < 0 chapter >, < 1 verse >, < 2 previousChapterIndex >, < 3 thisChapterIndex >, < 4 nextChapterIndex > ]
  name: 'cvNavigation',
  description: 'Various answers to \'previous\' and \'next\' with respect to a verse',
  fields: () => ({
    nextVerse: {
      type: cvType,
      description: 'The verse number for the next verse',
      resolve: root => {
        var chapterN = parseInt(root[0]);
        var verseN = parseInt(root[1]);

        if (root[3].length <= verseN || root[3][verseN].length === 0) {
          return null;
        }

        var ret = null;
        var nc = chapterN;
        var nv = verseN;
        var index = root[3];
        var onNextChapter = false;

        while (!ret) {
          nv += 1;

          if (nv >= index.length) {
            if (onNextChapter || !root[4]) {
              break;
            }

            nv = -1;
            nc += 1;
            index = root[4];
            onNextChapter = true;
          } else if (index[nv].length > 0) {
            ret = [nc, nv];
          }
        }

        return ret;
      }
    },
    previousVerse: {
      type: cvType,
      description: 'The verse number for the previous verse',
      resolve: root => {
        var chapterN = parseInt(root[0]);
        var verseN = parseInt(root[1]);

        if (root[3].length <= verseN || root[3][verseN].length === 0) {
          return null;
        }

        var ret = null;
        var nc = chapterN;
        var nv = verseN;
        var index = root[3];
        var onPreviousChapter = false;

        while (!ret) {
          nv -= 1;

          if (nv < 0) {
            if (onPreviousChapter || !root[2]) {
              break;
            }

            nv = root[2].length;
            nc -= 1;
            index = root[2];
            onPreviousChapter = true;
          } else if (index[nv].length > 0) {
            ret = [nc, nv];
          }
        }

        return ret;
      }
    },
    nextChapter: {
      type: GraphQLString,
      description: 'The next chapter number (as a string)',
      resolve: root => {
        if (root[3].length > 0 && root[4].length > 0) {
          return (parseInt(root[0]) + 1).toString();
        } else {
          return null;
        }
      }
    },
    previousChapter: {
      type: GraphQLString,
      description: 'The previous chapter number (as a string)',
      resolve: root => {
        if (root[2].length > 0 && root[3].length > 0) {
          return (parseInt(root[0]) - 1).toString();
        } else {
          return null;
        }
      }
    }
  })
});
module.exports = cvNavigationType;