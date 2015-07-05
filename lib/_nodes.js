"use strict";

var States = require("./states");
var util = require("./util");
var Node = require("./node.js");

function isAction(obj) {
  return util.isArray(obj) && typeof obj[0] === "function";
}

function isApi(obj) {
  return typeof obj === "function";
}

var Nodes = {
  createClass: function createClass(classDef, classOptions) {
    classDef = classDef || {};
    classOptions = classOptions || {};
    if (Node.isNodeClass(classDef)) {
      classDef = {
        $factory: classDef
      };
    }

    var apis = util.pick(classDef, function (v) {
      return typeof v === "function";
    });

    //api与Node方法重名检测
    var conflictedApis = util.intersection(Object.keys(apis), Object.keys(classPrototype));
    if (conflictedApis.length !== 0) {
      throw new Error("Api conflict with Roof Node prototype methods:" + conflictedApis.join(","));
    }

    //创建class
    var Nodes = function Nodes(data, options) {
      options = util.extend({}, classOptions, options);
      classConstructor.call(this, classDef, data, options, apis);
      this.isNodesInstance = true;
    };

    Nodes.prototype = util.extend({}, classPrototype, apis);

    if (classOptions.facade) {
      util.forEach(classOptions.facade, function (fn, name) {
        Nodes[name] = fn.bind(newClass);
      });
    }

    //facade methods
    Nodes.insert = Nodes.update = Nodes.remove = function () {
      console.warn("you should use your own facade method");
    };

    Nodes.isNodesClass = true;
    return Nodes;
  },
  isNodesInstance: function isNodesInstance(obj) {
    return obj && obj.isNodesInstance === true;
  },
  isNodesClass: function isNodesClass(func) {
    return func && func.isNodesClass === true;
  }
};

/*
  * Class
 */

function classConstructor(def, data, options, apis) {
  var _this = this;

  var that = this;
  this.def = def;
  this.options = options || {};
  this.factory = def.$factory || Node.createClass();
  this.updated = false;
  this.states = {};
  this.data = [];
  this.nodeListeners = {};

  that.states = new States({
    tenses: NodesActionTense,
    complex: {
      "valid": (function () {}).bind(that),
      "invalid": (function () {}).bind(that),
      "clean": (function () {}).bind(that),
      "dirty": (function () {}).bind(that)
    }
  });

  //length
  Object.defineProperty(this, "length", {
    get: function get() {
      return _this.data.length;
    }
  });

  if (data) {
    this.fill(data);
  }
}

var classPrototype = {};

//TODO 处理Node或者Nodes
classPrototype.rxTransform = function (handler, nodeClass) {
  for (var _len = arguments.length, associates = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    associates[_key - 2] = arguments[_key];
  }

  var that = this;
  var data = util.transform(that.data, handler);

  var isNodes = !util.isPlainObject(data);
  nodeClass = nodeClass || (isNodes ? Nodes.createClass() : Node.createClass());
  var newData = new nodeClass(data);

  var updater = function updater() {
    var data = util.transform(that.data, handler);
    if (isNodes) {
      newData.empty();
      newData.fill(data);
    } else {
      newData.replace(data);
    }
  };

  //当关联集合内任何更新都触发新集合更新
  Array.prototype.forEach.call([that].concat(associates), function (nodeOrNodes) {
    if (Nodes.isNodesInstance(nodeOrNodes)) {
      nodeOrNodes.onAny("change", updater);
    }

    nodeOrNodes.on("change", updater);

    //处理销毁
    nodeOrNodes.on("destroyed", function () {
      newData.destroy();
      newData = null;
    });
  });

  //处理新集合的销毁
  newData.on("destroyed", function () {
    that.offAny("change", updater);
    newData = null;
  });

  return newData;
};

//reactive data apis
classPrototype.rxMap = function (handler, nodesClass) {
  for (var _len2 = arguments.length, associates = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
    associates[_key2 - 2] = arguments[_key2];
  }

  //TODO 增加一个参数来关联更多的基础参数
  return this.rxTransform.apply(this, [function (output, value, key) {
    output[key] = handler(value, key);
  }, nodesClass].concat(associates));
};

//this is important
NodesActions.forEach(function (action) {
  util.decorateWithMiddleware(classPrototype, action);
  util.decorateWithState(classPrototype, action);
});

module.exports = Nodes;