//var Promise = require("bluebird")
var _ = require("lodash")
var States = require("./states")
var util = require("./util")


//global values
var NodesActionTense = {
  'push':['unpushed','pushing','pushed'],
  'pull':['unpulled','pulling','pulled'],
  'verify':['unverified','verifying','verified'],

  'set':['unset','setting','set'],
  'commit':['uncommitted','committing','committed'],
  'rollback':['unrollbacked','rollbacking','rollbacked'],

  'fill' : ['unfilled','filling','filled'],
  'insert' : ['uninserted','inserting','inserted'],
  'update' : ['unupdated','updating','updated'],
  'remove' : ['unremoved','removing','removed'],
  'empty' : ['unempty','emptying','emptied']
}

var NodesActions = Object.keys(NodesActionTense)

var Nodes = {
  createClass:function( factory, options){
      var newClass =  function(data,options){
        var nodes = new NodesInstance(newClass.factory, _.defaults( options || {}, newClass.options) )
        if( data){
          nodes.fill(data)
        }
        return nodes
      }

    newClass.factory = factory
    newClass.options = options || {}
    if( newClass.options.facade ){
      _.forEach(newClass.options.facade, function( fn, name ){
        newClass[name] = fn.bind(newClass)
      })
    }

    //facade methods
    newClass.insert = function(){
      console.warn("you should use your own facade method")
    }
    newClass.update= function(){
      console.warn("you should use your own facade method")
    }
    newClass.remove= function(){
      console.warn("you should use your own facade method")
    }

    newClass.combine = function( combine ){
      newClass.options.combine = combine
    }

    return newClass
  }
}



function NodesInstance( factory, options ){
  var that = this
  this.options = options ||{}
  this.factory = factory
  this.updated = false
  this.states = {}
  this.data = []
  this.nodeListeners = {}

  that.states = new States({
    tenses:NodesActionTense,
    complex : {
      "valid" : function(){

      }.bind(that),
      "invalid" : function(){

      }.bind(that),
      "clean" : function(){

      }.bind(that),
      "dirty" : function(){

      }.bind(that)
    }
  })

  if( that.options.combine ){
    that.combine( that.options.combine )
  }

  //load middlewares
  if( that.options.middleware ){
    if( !_.isArray( that.options.middleware ) ){
      that.options.middleware = [that.options.middleware]
    }
    that.middlewareActions = util.loadMiddlewareActions(that.options.middleware)
  }
}

NodesInstance.prototype.fill = function( collection ){
  var that = this
  collection.forEach(function( node ){
    that.insert( node )
  })
  return this
}

NodesInstance.prototype.clone = function( cloneData ){
  var newNodes = new NodesInstance(this.def, this.options)
  if( cloneData ){
    newNodes.fill( this.data.map(function( node){ return  node.clone() }) )
  }
  return newNodes
}

NodesInstance.prototype.insert = function( data, index ) {
  index = index || 0
  if( _.isPlainObject( data) && this.factory ){
    data = new this.factory( data )
  }
  this.data = this.data.slice(0, index ).concat( data, this.data.slice(index)  )

  _.forEach(this.nodeListeners, function( event, listeners){
    listeners.forEach(function(listener){
      data.on(event, listener)
    })
  })
}


NodesInstance.prototype.update = function( where, updateEJSON) {
  this.data.forEach(function( node ){
    if( util.objectMatch( node.toObject, where) ){
      node.set(updateEJSON)
    }
  })
}

NodesInstance.prototype.remove= function(where) {
  var that = this
  this.data.forEach(function( node, index ){
    if( util.objectMatch( node.toObject(), where) ){
      //remove listener first
      _.forEach(that.nodeListeners, function( event, listeners){
        listeners.forEach(function(listener){
          that.data[index].off(event, listener)
        })
      })

      that.data[index] = false
    }
  })
  that.data = _.compact( that.data )
}

NodesInstance.prototype.empty = function(){
  var that = this
  this.data.forEach(function( node, index ){
      //remove listener first
    _.forEach(that.nodeListeners, function( event, listeners){
      listeners.forEach(function(listener){
        that.data[index].off(event, listener)
      })
    })

    that.data[index] = false
  })
  that.data = []
}

NodesInstance.prototype.pull= function() {}
NodesInstance.prototype.push= function() {}
NodesInstance.prototype.verify= function() {}

NodesInstance.prototype.commit= function( name ) {
  this.data.forEach(function( node){
    node.commit( name )
  })
}
NodesInstance.prototype.rollback= function(name) {
  this.data.forEach(function( node){
    try{
      node.rollback( name )
    }catch(e){
      console.warn("node can not rollback")
    }
  })
}


NodesInstance.prototype.find=NodesInstance.prototype.filter =  function() {
  var filteredNodes = this.data.filter.apply(this.data, arguments)
  var newNodesInstance = this.clone( false )
  newNodesInstance.fill( filteredNodes )
  return newNodesInstance
}


NodesInstance.prototype.is =function(){
  return this.states.is.apply(this.states, Array.prototype.slice.call(arguments))
}

NodesInstance.prototype.isAny =function(){
  var args =  Array.prototype.slice.call(arguments)
  return _.any(this.data, function( node ){
    return node.is.apply(node, args)
  })
}

NodesInstance.prototype.isEvery =function(){
  var args =  Array.prototype.slice.call(arguments)
  return _.every(this.data, function( node ){
    return node.is.apply(node, args)
  })
}

NodesInstance.prototype.findOne= function(where) {
  for( var i = 0; i<this.data.length;i++){
    if( util.objectMatch(this.data[i].toObject(), where) ){
      return this.data[i]
    }
  }
  return null;
}

NodesInstance.prototype.forEach= function() {
  this.data.forEach.apply(this.data, arguments)
}

NodesInstance.prototype.map= function() {
  return this.data.map.apply(this.data, arguments)
}

NodesInstance.prototype.toArray= function() {
  return this.data.map(function( node ){
    return node.toObject()
  })
}

NodesInstance.prototype.every= function() {
  this.data.every.apply(this.data, arguments)
}
NodesInstance.prototype.any= function() {
  this.data.any.apply(this.data, arguments)
}

NodesInstance.prototype.on = function( event, handler){
  this.states.on( event, handler)
}

NodesInstance.prototype.off = function( event, handler){
  this.states.removeListener( event, handler)
}

NodesInstance.prototype.onAny = function( event, handler ){
  if( !this.nodeListeners[event] ){
    this.nodeListeners[event] = []
  }

  this.nodeListeners[event].push(handler)

  this.data.forEach( function(node){
    node.on( event, handler )
  })
}


//this is important
NodesActions.forEach(function( action){
  util.decorateWithMiddleware( NodesInstance.prototype, action)
  util.decorateWithState( NodesInstance.prototype, action)
})

module.exports = Nodes



