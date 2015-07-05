/**
 * @see https://docs.google.com/document/d/1VDborHDR0f5a_LnTHUoQlGxWHy5M7FcTWDy_zmYYVMo/edit?usp=sharing
 */

var util = require("./util")
var sysUtil = require("util")
var events = require("events")


function States( def ){

  this.def = def
  this.states = {}
  this.actionTenseMap = {}
  this.naiveStateMap = {}

  if( def !== undefined){
    util.forEach( def, ( states, name)=>{
      this.add( name, ...states)
      if( states.length === 2 ){
        //naive 状态默认是不激活状态
        this.states[name] = states[1]
      }else if( states.length  ===3 ){
        //action 状态默认是初始状态
        this.states[name] = states[0]
      }
    })
  }

  events.EventEmitter.call(this)

}

//必须写在这里，真是坑
sysUtil.inherits(States, events.EventEmitter)


States.prototype.addAction = function( actionName,...states){
  states.forEach(  (state, i) =>{
    this.actionTenseMap[state] = [actionName, i]
  })
}

States.prototype.addNaive = function( name,...states){
  states.forEach(  (state, i) =>{
    this.naiveStateMap[state] = name
  })
}

States.prototype.add = function( name,...states){
  if( states.length === 2 ){
    this.addNaive( name, ...states)
  }else if( states.length  ===3 ){
    this.addAction(name, ...states)
  }
}

States.prototype.set = function( name, value ){
  var lastValue = this.states[name]
  this.states[name] = value


  //console.log( StateReadableName.indexOf(lastValue), lastValue)
  this.emit("change", value, lastValue)
  this.emit(value, value, lastValue)
}

States.prototype.changeActionState = function( action, stateIndex ){
  if( !this.def[action] ) throw new Error("There is no state for action: " + action)
  this.set(action, this.def[action][stateIndex])
}

States.prototype.start = function( action ){
  this.changeActionState(action, 1)
}

States.prototype.end = function( action ){
  this.changeActionState(action, 2)
}

States.prototype.reset = function( actionOrState ){
  if( !this.def[actionOrState] ) throw new Error("there is no state " + actionOrState)
  if( this.def[actionOrState].length === 2  ){
    this.set(actionOrState, null)
  }else{
    this.changeActionState(actionOrState, 0)
  }
}

States.prototype.activate = function( state ){
  if( !this.def[state] ) throw new Error("there is no naive state " + state)
  this.set(state, this.def[state][0])
}

States.prototype.deactivate = function( state ) {
  if( !this.def[state] ) throw new Error("there is no naive state " + state)
  this.set(state, this.def[state][1])
}

States.prototype.is = function( ...states ){
  //第一层表示都必须满足。
  return util.every(states, ( state )=>{
    if( !util.isArray(state) ) state = [state]

    //第二层表示有一个满足就够了
    return util.any(state,  s =>{
      if( !this.actionTenseMap[s] && !this.naiveStateMap[s] ) throw new Error("unknown state " + s)
      return this.actionTenseMap[s]
        ? this.states[ this.actionTenseMap[s][0] ] ===  s
        : this.states[ this.naiveStateMap[s] ] ===  s
    })
  })
}



module.exports = States
