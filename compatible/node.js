"use strict";

var Container = require("./container");
var States = require("./states");
var util = require("./util");

function isAction(obj) {
  return util.isArray(obj) && typeof obj[0] === 'function';
}

function isApi(obj) {
  return typeof obj === 'function';
}

function isState(v) {
  return util.isArray(v) && (v.length === 2 || v.length === 3);
}

var Node = {
  /**
   * 动态创建 class。要注意的是，action 的实现，需要constructor和prototype的同时支持
   * @param classDef Object 用来存放三类信息:字段，api，action
   * @param options Object 用来存放三类信息:字段，api，action
   * @returns {Function}
   */
  createClass: function createClass(classDef, options) {
    classDef = classDef || {};
    options = options || {};
    var apiKeys = [];
    var actionKeys = [];
    var protoKeys = [];
    var states = {};
    var classActionKeys = Object.keys(classActions);

    util.forEach(classDef, function (v, k) {
      if (isApi(v)) {
        apiKeys.push(k);
      } else if (isAction(v)) {
        actionKeys.push(k);
      } else if (isState(v)) {
        states[k] = v;
      } else {
        protoKeys.push(k);
      }
    });

    //api与Node 原生方法重名检测
    var conflictedFns = util.intersection(apiKeys.concat(actionKeys), Object.keys(classPrototype).concat(classActions));
    if (conflictedFns.length !== 0) {
      throw new Error("Method conflict with Roof Node prototype methods:" + conflictedFns.join(","));
    }

    //动态创建class，创建实例时，可以直接复写 classDef
    var Node = function Node(data) {
      var constructor = (function () {
        this.def = util.cloneDeep(classDef);
        this.data = new Container();

        //默认的action
        var statesDef = util.mapValues(classActions, function (v) {
          return v.slice(1);
        });

        //用户自己添加的action,需要帮他添加 state
        actionKeys.forEach(function (name) {
          statesDef[name] = classDef[name].slice(1);
        });

        //用户自己的states
        util.extend(statesDef, states);

        this.states = new States(statesDef);

        if (data) this.data.fill(data);
        this.isNodeInstance = true;
      }).bind(this);

      if (options.decorator && options.decorator.$class) {
        return options.decorator.$class.apply(this, [constructor, data].concat(Array.prototype.slice.call(arguments, 1)));
      } else {
        constructor();
      }
    };

    //新建一个prototype,把api 和 action 和 prototype 对象都放在上面
    util.extend(Node.prototype, util.clone(classPrototype), util.zipObject(apiKeys, apiKeys.map(function (name) {
      return classDef[name];
    })), util.zipObject(protoKeys, protoKeys.map(function (name) {
      return classDef[name];
    })));

    //默认的action，必须放在原型装饰之前，否则会覆盖掉原型装饰
    classActionKeys.forEach(function (name) {
      if (classActions[name].length === 4) {
        decorateWithAction(Node.prototype, name, classActions[name][0]);
      } else {
        decorateWithNaiveAction(Node.prototype, name, classActions[name][0]);
      }
    });

    //原型装饰
    util.forEach(options.decorator || {}, function (decorator, name) {
      if (name !== '$class') {
        util.decorate(Node.prototype, name, decorator);
      }
    });

    //静态方法
    util.forEach(options["static"] || {}, function (staticMethod, name) {
      Node[name] = staticMethod;
    });

    //用户自己的action
    actionKeys.forEach(function (name) {
      if (classDef[name].length === 4) {
        decorateWithAction(Node.prototype, name, classDef[name][0]);
      } else {
        decorateWithNaiveAction(Node.prototype, name, classDef[name][0]);
      }
    });

    Node.isNodeClass = true;
    Node.def = classDef;

    return Node;
  },
  isNodeInstance: function isNodeInstance(obj) {
    return obj && obj.isNodeInstance === true;
  },
  isNodeClass: function isNodeClass(func) {
    return func && func.isNodeClass === true;
  }
};

/*
 Class prototype
 */
var classPrototype = {};

classPrototype.on = function () {
  this.states.on.apply(this.states, Array.prototype.slice.call(arguments));
};

classPrototype.once = function (event, onceFunc) {
  this.states.once.apply(this.states, Array.prototype.slice.call(arguments));
};

classPrototype.off = function () {
  this.states.removeListener.apply(this.states, Array.prototype.slice.call(arguments));
};

classPrototype.fire = function (event) {
  var args = Array.prototype.slice.call(arguments, 1);
  this.states.emit.apply(this.states, [event].concat(args));
};

classPrototype.get = function (path) {
  return this.data.get(path);
};

classPrototype.toObject = function () {
  return this.data.toObject();
};

classPrototype.clone = function () {
  //TODO
};

classPrototype.is = function () {
  return this.states.is.apply(this.states, Array.prototype.slice.call(arguments));
};

classPrototype.lock = function (method, reason) {
  this[method] = function () {
    console.warn(method + " method is locked, because " + reason);
  };
};

//特别注意，fill 和 merge 是不算 action 的。
//merge 只算作 set 的语法糖
classPrototype.merge = function (path, value) {
  if (util.isPlainObject(path)) {
    for (var i in path) {
      path[i] = util.merge(this.get(i), path[i]);
    }
  } else {
    value = util.merge(this.get(path), value);
  }

  return this.data.set(path, value);
};

//创建实例后，仍可动态添加action
classPrototype.action = function (action, rawFn) {
  var states = Array.prototype.slice.call(arguments, 1);
  this.states.add.apply(this.states, [action].concat(states));
  decorateWithAction.apply(null, [this, action, rawFn].concat(states));
};

////actions////////

function decorateWithAction(obj, action, rawFn) {
  obj[action] = function () {
    var that = this;
    var argv = Array.prototype.slice.call(arguments);
    that.states.start(action);
    //don't user Promise.resolve to deal with none Promise result
    //cause the callback invoke in next tick.
    var res = rawFn.apply(that, argv);
    if (res && res instanceof Promise) {
      return res.then(function (data) {
        that.states.end(action);
        return data;
      })["catch"](function (err) {
        that.states.end(action);
        throw err;
      });
    } else {
      that.states.end(action);
    }
    return res;
  };
}

function decorateWithNaiveAction(obj, action, rawFn) {
  obj[action] = function () {
    var that = this;
    var argv = Array.prototype.slice.call(arguments);
    var res = rawFn.apply(that, argv);
    that.states.activate(action);
    return res;
  };
}

var classActions = {};
classActions.set = [function (path, value) {
  return this.data.set(path, value);
}, "set", "unset"];

classActions.replace = [function (obj) {
  return this.data.fill(obj);
}, "replaced", "unreplaced"];

// 增加 destroy
classActions.destroy = [function () {
  var _this = this;

  // seal 所有操作的 api
  Object.keys(classActions).forEach(function (method) {
    _this.lock(method, 'this node is destroyed');
  });
  return this;
}, 'destroyed', 'undestroyed'];

module.exports = Node;