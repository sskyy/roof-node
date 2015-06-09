"use strict";

var _ = require("lodash");
var Frames = require("./frames");
var States = require("./states");
var util = require("./util");

//global values
var NodeActionTense = {
  "push": ["unpushed", "pushing", "pushed"],
  "pull": ["unpulled", "pulling", "pulled"],
  "verify": ["unverified", "verifying", "verified"],
  "set": ["unset", "setting", "set"],
  "commit": ["uncommitted", "committing", "committed"],
  "rollback": ["unrollbacked", "rollbacking", "rollbacked"],
  "replace": ["unreplaced", "replacing", "replaced"]
};

var NodeActions = Object.keys(NodeActionTense);

var Node = {
  createClass: function createClass(def, options) {
    var newNodeClass = function newNodeClass(data, options) {
      var ins = new NodeInstance(newNodeClass.def, _.defaults(options || {}, newNodeClass.options));
      if (data) ins.fill(data);
      return ins;
    };
    newNodeClass.def = def;
    newNodeClass.options = options;
    newNodeClass.combine = function (combine) {
      newNodeClass.options.combine = combine;
    };
    return newNodeClass;
  },
  isNodeInstance: function isNodeInstance(obj) {
    return obj instanceof NodeInstance;
  }
};

function NodeInstance(def, options) {
  var that = this;
  this.options = options || {};
  this.def = def;
  this.updated = false;
  this.states = {};
  this.data = new Frames({ limit: options.frames || 5 });

  that.states = new States({
    tenses: NodeActionTense,
    naive: {
      "valid": ["valid", "invalid"],
      "clean": ["clean", "dirty"] //whether data is changed since last update from server
    }
  });

  if (that.options.combine) {
    that.combine(that.options.combine);
  }

  //load middlewares
  if (that.options.middleware) {
    if (!_.isArray(that.options.middleware)) {
      that.options.middleware = [that.options.middleware];
    }
    that.middlewareActions = util.loadMiddlewareActions(that.options.middleware);
  }
}

NodeInstance.prototype.on = function () {
  this.states.on.apply(this.states, Array.prototype.slice.call(arguments));
};

NodeInstance.prototype.off = function () {
  this.states.removeListener.apply(this.states, Array.prototype.slice.call(arguments));
};

NodeInstance.prototype.set = function (path, value) {
  /*
    TODO
    对所有verified过的数据打一个快照
    这样有改动时既可以和最新的这个快照对比，看看是不是clean的，
    而不是像现在这样只要有改动就设置成dirty
   */

  //TODO 支持通过EJSON的方式来更新字段

  if (path instanceof CombinedArgv) {
    value = path[1];
    path = path[0];
  }
  this.states.deactivate("clean");
  console.log("setting", path, value);
  return this.data.set(path, value);
};

NodeInstance.prototype.fill = function (obj) {
  return this.data.fill(obj);
};

NodeInstance.prototype.commit = function (commitName) {
  if (commitName instanceof CombinedArgv) {
    commitName = undefined;
  }
  var result = this.data.commit(commitName);
  if (result) {
    this.states.reset("set");
  }
  return result;
};

NodeInstance.prototype.rollback = function (commitName) {
  var result = this.data.rollback(commitName);
  if (result) {
    this.states.reset("set");
  }
  return result;
};

NodeInstance.prototype.get = function (path) {
  return this.data.get(path);
};

NodeInstance.prototype.getRef = function (path) {
  if (_.isArray(path)) path = path.join(".");
  return this.data.getRef(path);
};

NodeInstance.prototype.toObject = function (path) {
  //TODO
  return this.data.toObject();
};

NodeInstance.prototype.clone = function () {};

NodeInstance.prototype.is = function () {
  return this.states.is.apply(this.states, Array.prototype.slice.call(arguments));
};

NodeInstance.prototype.pull = NodeInstance.prototype.push = function rawUpdate(promise) {
  //this function will be called after user's handler
  var that = this;
  return Promise.resolve(promise).then(function () {
    that.states.activate("clean");
    that.states.reset("valid");
    that.states.reset("verify");
    that.states.reset("pull");
    that.states.reset("push");
  }, function () {
    that.states.deactivate("clean");
    that.states.deactivate("valid");
  });
};

NodeInstance.prototype.verify = function (promise) {
  //this function will be called after user's handler
  var that = this;
  return Promise.resolve(promise).then(function () {
    that.states.activate("valid");
  }, function () {
    that.states.deactivate("valid");
  });
};

//this is important
NodeActions.forEach(function (action) {
  util.decorateWithMiddleware(NodeInstance.prototype, action);
  util.decorateWithState(NodeInstance.prototype, action);
});

NodeInstance.prototype.combine = function (actionsToCombine) {
  //console.log("--")
  if (this.combinedActions) {
    return console.warn("This instance already combined actions:", this.combine);
  }
  var mainAction = actionsToCombine[0];
  var that = this;
  that[mainAction] = function () {
    var argv = Array.prototype.slice.call(arguments);
    return util.promiseSeries(actionsToCombine, function (action) {
      console.log("calling combined action", action);
      return NodeInstance.prototype[action].call(that, new CombinedArgv(_.clone(actionsToCombine), _.cloneDeep(argv)));
    });
  };
  this.combinedActions = actionsToCombine;
};

function CombinedArgv(combine, argv) {
  var that = this;
  argv.forEach(function (v, k) {
    that[k] = v;
  });

  that.combine = combine;
  that.length = argv.length;
}

module.exports = Node;

//TODO