"use strict";

var States = require("./states");
var util = require("./util");
var Node = require("./node.js");

//global values
var NodesActionTense = {
  "push": ["unpushed", "pushing", "pushed"],
  "pull": ["unpulled", "pulling", "pulled"],
  "verify": ["unverified", "verifying", "verified"],

  "set": ["unset", "setting", "set"],
  "commit": ["uncommitted", "committing", "committed"],
  "rollback": ["unrollbacked", "rollbacking", "rollbacked"],

  "fill": ["unfilled", "filling", "filled"],
  "insert": ["uninserted", "inserting", "inserted"],
  "update": ["unupdated", "updating", "updated"],
  "remove": ["unremoved", "removing", "removed"],
  "empty": ["unempty", "emptying", "emptied"]
};

var NodesActions = Object.keys(NodesActionTense);

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
    var newClass = function newClass(data, options) {
      options = util.extend({}, classOptions, options);
      classConstructor.call(this, classDef, data, options, apis);
      this.isNodesInstance = true;
    };

    newClass.prototype = util.extend({}, classPrototype, apis);

    if (classOptions.facade) {
      util.forEach(classOptions.facade, function (fn, name) {
        newClass[name] = fn.bind(newClass);
      });
    }

    //facade methods
    newClass.insert = function () {
      console.warn("you should use your own facade method");
    };
    newClass.update = function () {
      console.warn("you should use your own facade method");
    };
    newClass.remove = function () {
      console.warn("you should use your own facade method");
    };

    //TODO 这里的combine是动态combine，其实可以在创建时的options指定。
    //newClass.combine = function( combine ){
    //  newClass.options.combine = combine
    //}

    newClass.isNodesClass = true;
    return newClass;
  },
  isNodesInstance: function isNodesInstance(obj) {
    return obj && obj.isNodesInstance === true;
  },
  isNodesClass: function isNodesClass(func) {
    return func && func.isNodesClass === true;
  }

};

/*
  * class
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

  if (that.options.combine) {
    that.combine(that.options.combine);
  }

  //load middlewares
  if (that.options.middleware) {
    if (!util.isArray(that.options.middleware)) {
      that.options.middleware = [that.options.middleware];
    }
    that.middlewareActions = util.loadMiddlewareActions(that.options.middleware);
  }

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

classPrototype.fill = function (collection) {
  var that = this;
  collection.forEach(function (node) {
    that.insert(node);
  });
  return this;
};

classPrototype.clone = function (cloneData) {
  var newNodes = new NodesInstance(this.def, this.options);
  if (cloneData) {
    newNodes.fill(this.data.map(function (node) {
      return node.clone();
    }));
  }
  return newNodes;
};

classPrototype.insert = function (data, index) {
  var _this2 = this;

  data = data || {};
  index = index || this.data.length;
  if (util.isPlainObject(data)) {
    data = new this.factory(data);
  }
  this.data = this.data.slice(0, index).concat(data, this.data.slice(index));

  util.forEach(this.nodeListeners, function (listeners, event) {
    listeners.forEach(function (listener) {
      data.on(event, listener);
    });
  });

  // 监听子元素的 destroy
  data.once("destroyed", function () {
    _this2.remove(data);
  });
};

classPrototype.update = function (where, updateEJSON) {
  this.data.forEach(function (node) {
    if (util.objectMatch(node.toObject, where)) {
      node.set(updateEJSON);
    }
  });
};

classPrototype.remove = function (where) {
  var that = this;
  this.data.forEach(function (node, index) {
    // 增加直接 remove 某个引用的功能
    var isMatch = where instanceof that.factory ? node === where : util.objectMatch(node.toObject(), where);
    if (isMatch) {
      //remove listener first
      util.forEach(that.nodeListeners, function (listeners, event) {
        listeners.forEach(function (listener) {
          that.data[index].off(event, listener);
        });
      });

      that.data[index] = false;
    }
  });
  that.data = util.compact(that.data);
};

classPrototype.empty = function () {
  var that = this;
  this.data.forEach(function (node, index) {
    //remove listener first
    util.forEach(that.nodeListeners, function (listeners, event) {
      listeners.forEach(function (listener) {
        that.data[index].off(event, listener);
      });
    });

    that.data[index] = false;
  });
  that.data = [];
  return this;
};

classPrototype.pull = function () {};
classPrototype.push = function () {};
classPrototype.verify = function () {};

classPrototype.commit = function (name) {
  this.data.forEach(function (node) {
    node.commit(name);
  });
};

classPrototype.rollback = function (name) {
  this.data.forEach(function (node) {
    try {
      node.rollback(name);
    } catch (e) {
      console.warn("node can not rollback");
    }
  });
};

classPrototype.destroy = function () {};

classPrototype.find = classPrototype.filter = function () {
  var filteredNodes = this.data.filter.apply(this.data, arguments);
  var newNodesInstance = this.clone(false);
  newNodesInstance.fill(filteredNodes);
  return newNodesInstance;
};

classPrototype.is = function () {
  return this.states.is.apply(this.states, Array.prototype.slice.call(arguments));
};

classPrototype.isAny = function () {
  var args = Array.prototype.slice.call(arguments);
  return util.any(this.data, function (node) {
    return node.is.apply(node, args);
  });
};

classPrototype.isEvery = function () {
  var args = Array.prototype.slice.call(arguments);
  return util.every(this.data, function (node) {
    return node.is.apply(node, args);
  });
};

classPrototype.findOne = function (where) {
  for (var i = 0; i < this.data.length; i++) {
    if (util.objectMatch(this.data[i].toObject(), where)) {
      return this.data[i];
    }
  }
  return null;
};

classPrototype.get = function (index) {
  return this.data[index];
};

classPrototype.forEach = function () {
  this.data.forEach.apply(this.data, arguments);
};

classPrototype.map = function () {
  return this.data.map.apply(this.data, arguments);
};

classPrototype.toArray = function () {
  return this.data.map(function (node) {
    return node.toObject();
  });
};

classPrototype.every = function () {
  this.data.every.apply(this.data, arguments);
};

classPrototype.any = function () {
  this.data.any.apply(this.data, arguments);
};

classPrototype.on = function (event, handler) {
  this.states.on(event, handler);
};

classPrototype.off = function (event, handler) {
  this.states.removeListener(event, handler);
};

classPrototype.onAny = function (event, handler) {
  if (!this.nodeListeners[event]) {
    this.nodeListeners[event] = [];
  }

  this.nodeListeners[event].push(handler);

  this.data.forEach(function (node) {
    node.on(event, handler);
  });
};

classPrototype.offAny = function (event, handler) {

  util.remove(this.nodeListeners[event], function (inArrayHandler) {
    return inArrayHandler === handler;
  });

  this.data.forEach(function (node) {
    node.off(event, handler);
  });
};

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