/**
 * @see https://docs.google.com/document/d/1VDborHDR0f5a_LnTHUoQlGxWHy5M7FcTWDy_zmYYVMo/edit?usp=sharing
 */

var _ = require("lodash")
var util = require("util");
var events = require("events");

var ActionStates =  ["initial", "started", "ended"]

function States( def ){
  var that = this
  that.def = def
  that.actions = that.def.tenses ? Object.keys(that.def.tenses) :[]


  that.actionTenseMap = _.transform( that.def.tenses, function( result,v,k){
    v.forEach(function( state,i ){
      result[state] = [k, ActionStates[i]]
    })
  })

  that.naiveStateMap = _.transform( that.def.naive, function( result,v,k){
    v.forEach(function( state ){
      result[state] = k
    })
  })

  that.states = _.merge(
    _.mapValues( that.def.tenses, function(){
    return ActionStates[0]
  }),
    _.mapValues( that.def.naive, function(){
      return null
    })
  )

  events.EventEmitter.call(this);
}

util.inherits(States, events.EventEmitter);

States.prototype.set = function( name, value){
  var lastValue = this.states[name]
  this.states[name] = value

  var lastReadable = this.def.tenses[name] ? this.def.tenses[name][ActionStates.indexOf(lastValue)] : lastValue
  var thisReadable = this.def.tenses[name] ? this.def.tenses[name][ActionStates.indexOf(value)] : value

  //console.log( ActionStates.indexOf(lastValue), lastValue)
  this.emit("change", thisReadable, lastReadable )
  if( thisReadable == "pushed"){
    console.log( name, value, lastValue,this.states[name],thisReadable, lastReadable)
  }else if(thisReadable=="pushing"){
    console.log( name, value, lastValue,this.states[name],thisReadable, lastReadable)
  }
  this.emit( thisReadable, thisReadable, lastReadable )
}

States.prototype.changeActionState = function(action, stateIndex){
  if( !this.def.tenses[action] ) throw new Error("there is no state for action "+action)
  this.set(action, ActionStates[stateIndex])
}

States.prototype.start = function(action){
  this.changeActionState(action,1)
}

States.prototype.end = function( action ){
  this.changeActionState(action,2)
}

States.prototype.reset = function( actionOrState ){
  if( this.def.naive[actionOrState] ){
    this.set(actionOrState,  null)
  }else{
    this.changeActionState(actionOrState,0)
  }
}


States.prototype.activate = function( state ){
  if( !this.def.naive[state] ) throw new Error("there is no naive state "+ state)
  this.set(state, this.def.naive[state][0])
}

States.prototype.deactivate = function( state ) {
  if( !this.def.naive[state] ) throw new Error("there is no naive state "+ state)
  this.set(state, this.def.naive[state][1])
}

States.prototype.is = function( state ){
  var argv = Array.prototype.slice.call(arguments)
  var that = this
  return argv.every(function( state ){
    if( !_.isArray(state) ) state = [state]

    return _.any(state,function(s){
      if( !that.actionTenseMap[s] && !that.naiveStateMap[s] ) throw new Error("unknown state "+s)
      if( s=="valid") console.log(that.naiveStateMap["valid"],that.states.valid )
      return that.actionTenseMap[s]
        ? that.states[ that.actionTenseMap[s][0] ] ===  that.actionTenseMap[s][1]
        : that.states[ that.naiveStateMap[s] ] ===  s
    })
  })
}


module.exports = States