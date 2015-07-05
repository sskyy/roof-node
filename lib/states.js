/**
 * @see https://docs.google.com/document/d/1VDborHDR0f5a_LnTHUoQlGxWHy5M7FcTWDy_zmYYVMo/edit?usp=sharing
 */

"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var util = require("./util");
var sysUtil = require("util");
var events = require("events");

function States(def) {
  var _this = this;

  this.def = def;
  this.states = {};
  this.actionTenseMap = {};
  this.naiveStateMap = {};

  if (def !== undefined) {
    util.forEach(def, function (states, name) {
      _this.add.apply(_this, [name].concat(_toConsumableArray(states)));
      if (states.length === 2) {
        //naive 状态默认是不激活状态
        _this.states[name] = states[1];
      } else if (states.length === 3) {
        //action 状态默认是初始状态
        _this.states[name] = states[0];
      }
    });
  }

  events.EventEmitter.call(this);
}

//必须写在这里，真是坑
sysUtil.inherits(States, events.EventEmitter);

States.prototype.addAction = function (actionName) {
  var _this2 = this;

  for (var _len = arguments.length, states = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    states[_key - 1] = arguments[_key];
  }

  states.forEach(function (state, i) {
    _this2.actionTenseMap[state] = [actionName, i];
  });
};

States.prototype.addNaive = function (name) {
  var _this3 = this;

  for (var _len2 = arguments.length, states = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    states[_key2 - 1] = arguments[_key2];
  }

  states.forEach(function (state, i) {
    _this3.naiveStateMap[state] = name;
  });
};

States.prototype.add = function (name) {
  for (var _len3 = arguments.length, states = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    states[_key3 - 1] = arguments[_key3];
  }

  if (states.length === 2) {
    this.addNaive.apply(this, [name].concat(states));
  } else if (states.length === 3) {
    this.addAction.apply(this, [name].concat(states));
  }
};

States.prototype.set = function (name, value) {
  var lastValue = this.states[name];
  this.states[name] = value;

  //console.log( StateReadableName.indexOf(lastValue), lastValue)
  this.emit("change", value, lastValue);
  this.emit(value, value, lastValue);
};

States.prototype.changeActionState = function (action, stateIndex) {
  if (!this.def[action]) throw new Error("There is no state for action: " + action);
  this.set(action, this.def[action][stateIndex]);
};

States.prototype.start = function (action) {
  this.changeActionState(action, 1);
};

States.prototype.end = function (action) {
  this.changeActionState(action, 2);
};

States.prototype.reset = function (actionOrState) {
  if (!this.def[actionOrState]) throw new Error("there is no state " + actionOrState);
  if (this.def[actionOrState].length === 2) {
    this.set(actionOrState, null);
  } else {
    this.changeActionState(actionOrState, 0);
  }
};

States.prototype.activate = function (state) {
  if (!this.def[state]) throw new Error("there is no naive state " + state);
  this.set(state, this.def[state][0]);
};

States.prototype.deactivate = function (state) {
  if (!this.def[state]) throw new Error("there is no naive state " + state);
  this.set(state, this.def[state][1]);
};

States.prototype.is = function () {
  var _this4 = this;

  for (var _len4 = arguments.length, states = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    states[_key4] = arguments[_key4];
  }

  //第一层表示都必须满足。
  return util.every(states, function (state) {
    if (!util.isArray(state)) state = [state];

    //第二层表示有一个满足就够了
    return util.any(state, function (s) {
      if (!_this4.actionTenseMap[s] && !_this4.naiveStateMap[s]) throw new Error("unknown state " + s);
      return _this4.actionTenseMap[s] ? _this4.states[_this4.actionTenseMap[s][0]] === s : _this4.states[_this4.naiveStateMap[s]] === s;
    });
  });
};

module.exports = States;