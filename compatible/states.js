/**
 * @see https://docs.google.com/document/d/1VDborHDR0f5a_LnTHUoQlGxWHy5M7FcTWDy_zmYYVMo/edit?usp=sharing
 */

"use strict";

var util = require("./util");
var sysUtil = require("util");
var events = require("events");
var ActionReadableMap = {
  '0': 'initial',
  '1': 'processing',
  '2': 'end'
};

function States(def) {
  var _this = this;

  this.def = def;
  this.states = {};
  this.actionTenseMap = {};
  this.naiveStateMap = {};

  if (def !== undefined) {
    util.forEach(def, function (states, name) {
      _this.add.apply(_this, [name].concat(states));
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

//必须写在这里，不能往上调整也不能往下调整
sysUtil.inherits(States, events.EventEmitter);

/////////////////////////////
//     common methods
/////////////////////////////
States.prototype.addAction = function (actionName) {
  var _this2 = this;

  var states = Array.prototype.slice.call(arguments, 1);
  states.forEach(function (state, i) {
    _this2.actionTenseMap[state] = [actionName, i];
  });
};

States.prototype.addNaive = function (name) {
  var _this3 = this;

  var states = Array.prototype.slice.call(arguments, 1);
  states.forEach(function (state, i) {
    _this3.naiveStateMap[state] = name;
  });
};

States.prototype.add = function (name) {
  var states = Array.prototype.slice.call(arguments, 1);
  if (states.length === 2) {
    this.addNaive.apply(this, [name].concat(states));
  } else if (states.length === 3) {
    this.addAction.apply(this, [name].concat(states));
  }
};

States.prototype.set = function (name, value, detail) {
  var lastValue = this.states[name];
  this.states[name] = value;

  this.emit("change", value, lastValue, detail);
  this.emit(value, value, lastValue);
};

States.prototype.is = function () {
  var _this4 = this;

  var states = Array.prototype.slice.call(arguments, 0);
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

/////////////////////////////
//     action state methods
/////////////////////////////
States.prototype.changeActionState = function (action, stateIndex) {
  if (!this.def[action]) throw new Error("There is no state for action: " + action);
  var detail = {
    type: 'action',
    state: ActionReadableMap[stateIndex]
  };
  this.set(action, this.def[action][stateIndex], detail);
};

States.prototype.start = function (action) {
  this.changeActionState(action, 1);
};

States.prototype.end = function (action) {
  this.changeActionState(action, 2);
};

States.prototype.reset = function (action) {
  this.changeActionState(action, 0);
};

/////////////////////////////
//     action state methods
/////////////////////////////
States.prototype.activate = function (state) {
  if (!this.def[state]) throw new Error("there is no naive state " + state);
  var detail = {
    type: 'naive',
    state: 'active'
  };
  this.set(state, this.def[state][0], detail);
};

States.prototype.deactivate = function (state) {
  if (!this.def[state]) throw new Error("there is no naive state " + state);
  var detail = {
    type: 'naive',
    state: 'inactive'
  };
  this.set(state, this.def[state][1], detail);
};

module.exports = States;