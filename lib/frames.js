"use strict";

var util = require("./util");

function Frames(options) {
  var that = this;

  this.options = util.defaults(options || {}, {
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
  if (util.isPlainObject(path)) {
    util.forEach(path, function (v, k) {
      setRef(that.data, k, v);
    });
  } else {
    return setRef(that.data, path, value);
  }
};

Frames.prototype.merge = function (path, value) {
  var that = this;
  if (util.isPlainObject(path)) {
    util.forEach(path, function (v, k) {
      setRef(that.data, k, v, true);
    });
  } else {
    return setRef(that.data, path, value, true);
  }
};

Frames.prototype.fill = function (obj) {
  this.data = obj;
};

Frames.prototype.get = function (path) {
  return getRef(this.data, path);
};

Frames.prototype.toObject = function () {
  return util.cloneDeep(this.data);
};

Frames.prototype.commit = function (commitName) {
  commitName = commitName || this.historyNames.length;

  if (this.historyNames.indexOf(commitName) !== -1) {
    console.log(this.historyNames);
    throw new Error("commit name already exists: " + commitName);
  }

  this.historyValues.push(util.cloneDeep(this.data));
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
    if (util.isObject(ref) && ref[currentName] !== undefined) {
      ref = ref[currentName];
    } else {
      ref = undefined;
      break;
    }
  }

  return ref;
}

function setRef(obj, name, data, merge) {

  var ns = name.split("."),
      ref = obj,
      currentName;

  while (currentName = ns.shift()) {
    if (ns.length == 0) {
      //这里不再隐式地提供merge功能
      //要merge请使用merge接口
      if (util.isObject(ref[currentName]) && merge) {
        ref[currentName] = util.merge({}, ref[currentName], data);
      } else {
        if (ref[currentName] !== undefined) console.warn("you are replacing a exist data", name);
        ref[currentName] = data;
      }
    } else {
      if (!util.isObject(ref[currentName])) {
        if (ref[currentName] !== undefined) console.warn("your data will be reset to an object", currentName);
        ref[currentName] = {};
      }
      ref = ref[currentName];
    }
  }
}

module.exports = Frames;