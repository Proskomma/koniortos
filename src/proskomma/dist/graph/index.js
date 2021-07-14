"use strict";

var {
  GraphQLSchema
} = require('graphql');

var {
  schemaQueries
} = require('./queries/index');

var {
  schemaMutations
} = require('./mutations/index');

var gqlSchema = new GraphQLSchema({
  query: schemaQueries,
  mutation: schemaMutations
});
module.exports = {
  gqlSchema
};