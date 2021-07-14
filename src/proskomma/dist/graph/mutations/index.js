"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var {
  GraphQLObjectType
} = require('graphql');

var tagMutations = require('./tags');

var deleteMutations = require('./delete');

var addMutations = require('./add');

var rehashMutations = require('./rehash');

var updateMutations = require('./update');

var versificationMutations = require('./versification');

var schemaFields = _objectSpread(_objectSpread(_objectSpread(_objectSpread(_objectSpread(_objectSpread({}, tagMutations), deleteMutations), addMutations), rehashMutations), updateMutations), versificationMutations);

var schemaMutations = new GraphQLObjectType({
  name: 'Mutation',
  description: 'Operations that change the state of Proskomma',
  fields: schemaFields
});
module.exports = {
  schemaMutations
};