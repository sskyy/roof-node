"use strict";

var _ = require("lodash");

function Frames(options) {
  var that = this;

  this.options = _.defaults(options || {}, {
    frameLimit: 5
  });
  this.data = {};
  this.historyNames = [];
  this.historyValues = [];

  Object.defineProperty(this, "length", {
    get: function get() {
      return that.historyNames.length;
    }
  });
}

Frames.prototype.set = function (path, value) {
  var that = this;
  if (_.isObject(path)) {
    _.forEach(path, function (v, k) {
      setRef(that.data, k, v);
    });
  } else {
    return setRef(that.data, path, value);
  }
};

Frames.prototype.fill = function (obj) {
  this.data = _.cloneDeep(obj);
};

Frames.prototype.get = function (path) {
  return getRef(this.data, path);
};

Frames.prototype.toObject = function () {
  return _.cloneDeep(this.data);
};

Frames.prototype.commit = function (commitName) {
  commitName = commitName || this.historyNames.length;

  if (this.historyNames.indexOf(commitName) !== -1) {
    console.log(this.historyNames);
    throw new Error("commit name already exists: " + commitName);
  }

  this.historyValues.push(_.cloneDeep(this.data));
  this.historyNames.push(commitName);
  if (this.historyNames.length > this.options.frameLimit) {
    this.historyNames.shift();
    this.historyValues.shift();
  }
  return true;
};

Frames.prototype.rollback = function (commitName) {
  commitName = commitName || this.historyNames.length - 1;
  var index = this.historyNames.indexOf(commitName);
  if (index === -1) {
    throw new Error("cannot find commit with name: " + commitName);
  }

  var toRestore = this.historyValues.splice(index)[0];
  this.historyNames.splice(index);

  this.data = toRestore;
  return true;
};

function getRef(obj, name) {
  var ns = name.split("."),
      ref = obj,
      currentName;

  while (currentName = ns.shift()) {
    if (_.isObject(ref) && ref[currentName]) {
      ref = ref[currentName];
    } else {
      ref = undefined;
      break;
    }
  }

  return _.isObject(ref) ? _.cloneDeep(ref) : ref;
}

function setRef(obj, name, data) {

  var ns = name.split("."),
      ref = obj,
      currentName;

  while (currentName = ns.shift()) {
    if (ns.length == 0) {
      if (_.isObject(ref[currentName])) {
        _.merge(ref[currentName], data);
      } else {
        if (ref[currentName] !== undefined) console.warn("you are changing a exist data", name);
        ref[currentName] = data;
      }
    } else {
      if (!_.isObject(ref[currentName])) {
        if (ref[currentName] !== undefined) console.warn("your data will be reset to an object", currentName);
        ref[currentName] = {};
      }
      ref = ref[currentName];
    }
  }
}

module.exports = Frames;