var Container = require("./container")
var States = require("./states")
var Node = require('./node')
var util = require("./util")

function isAction( obj ){
  return  util.isArray(obj) && (typeof obj[0]=== 'function')
}

function isApi( obj ) {
  return typeof obj === 'function'
}

function isState( v ){
  return util.isArray(v) && (v.length ===2 ||v.length ===3)
}


var Nodes = {
  /**
   * 动态创建 class。要注意的是，action 的实现，需要constructor和prototype的同时支持
   * @param classDef Object 用来存放三类信息:api，action, $factory
   * @returns {Function}
   */
  createClass : function( classDef ){
    classDef = util.cloneDeep(classDef || {})
    //为了兼容之前版本
    if( Node.isNodeClass( classDef ) ){
      classDef = { $factory : classDef }
    }

    var apiKeys = []
    var actionKeys = []
    var states = {}

    util.forEach(classDef, function(v,k){
      if( isApi(v) ){
        apiKeys.push( k )
      }else if( isAction(v)){
        actionKeys.push(k)
      }else if( isState(v)){
        states[k] = v
      }
    })

    //api与Node 原生方法重名检测
    var conflictedFns =  util.intersection( apiKeys.concat(actionKeys), Object.keys( classPrototype))
    if(conflictedFns.length !==0){
      throw new Error("Method conflict with Roof Node prototype methods:" + conflictedFns.join(","))
    }

    //动态创建class，创建实例时，可以直接复写 classDef
    var Nodes = function( data ){
      this.def = util.cloneDeep(classDef)
      this.data = []
      this.factory = classDef.$factory || Node.createClass()
      this.nodeListeners = {}

      //默认的action
      var statesDef = util.mapValues( classActions, function( v ){
        return v.slice(1)
      })

      //用户自己添加的action
      actionKeys.forEach(function( name ){
        statesDef[name] = classDef[name].slice(1)
      })

      //用户自己的states
      util.extend( statesDef, states)

      this.states = new States(statesDef)

      //Thank IE8's funny Object.defineProperty
      //Object.defineProperty(this, 'length',{
      //  get: ()=>{
      //    return this.data.length
      //  }
      //})
      this.length = 0

      if( data ){
        data.forEach( item=>{
          this.keep(item)
        })
      }
      this.isNodesInstance = true

    }


    //新建一个prototype,把api 和 action 都放在上面
    Nodes.prototype = util.extend(
      util.clone(classPrototype),
      util.zipObject(apiKeys, apiKeys.map(name=>classDef[name])))

    actionKeys.forEach(name=>{
      decorateWithAction( Nodes.prototype, name, classDef[name][0] )
    })

    Nodes.isNodesClass = true
    Nodes.def = classDef

    return Nodes
  },
  isNodesInstance:function( obj ){
    return  obj && obj.isNodesInstance === true
  },
  isNodesClass:function( func ){
    return func && func.isNodesClass === true
  }
}


/*
 Class prototype
 */
var classPrototype = {}

classPrototype.clone = function( cloneData ){
  var Nodes = this.constructor
  return new Nodes( cloneData ? this.data.map(node =>node.clone() ) : [] )
}

classPrototype.is = function(){
  return this.states.is.apply(this.states, Array.prototype.slice.call(arguments))
}

classPrototype.isAny = function(){
  var args = Array.prototype.slice.call(arguments)
  return util.any(this.data, function( node ){
    return node.is.apply(node, args)
  })
}

classPrototype.isEvery = function(){
  var args = Array.prototype.slice.call(arguments)
  return util.every(this.data, function( node ){
    return node.is.apply(node, args)
  })
}

classPrototype.find=classPrototype.filter =  function() {
  var filteredNodes = this.data.filter.apply(this.data, arguments)
  var newNodesInstance = this.clone( false )
  newNodesInstance.fill( filteredNodes )
  return newNodesInstance
}

classPrototype.findOne = function(where) {
  for( var i = 0; i < this.data.length; i++ ){
    if( util.objectMatch(this.data[i].toObject(), where) ){
      return this.data[i]
    }
  }
  return null;
}

classPrototype.indexOf = function(where) {
  for( var i = 0; i < this.data.length; i++ ){
    if( util.objectMatch(this.data[i].toObject(), where) ){
      return i
    }
  }
  return -1;
}

classPrototype.get = function( index ){
  return this.data[index]
}

classPrototype.forEach = function() {
  this.data.forEach.apply(this.data, arguments)
}

classPrototype.map = function() {
  return this.data.map.apply(this.data, arguments)
}

classPrototype.toArray = function() {
  return this.data.map(function( node ){
    return node.toObject()
  })
}

classPrototype.every = function() {
  this.data.every.apply(this.data, arguments)
}

classPrototype.any = function() {
  this.data.any.apply(this.data, arguments)
}

classPrototype.on = function( event, handler ){
  this.states.on( event, handler)
}

classPrototype.off = function( event, handler ){
  this.states.removeListener( event, handler)
}

classPrototype.onAny = function( event, handler ){
  if( !this.nodeListeners[event] ){
    this.nodeListeners[event] = []
  }

  this.nodeListeners[event].push(handler)

  this.data.forEach(function( node ){
    node.on( event, handler )
  })
}

classPrototype.offAny = function( event, handler ){

  util.remove( this.nodeListeners[event], function( inArrayHandler){
    return inArrayHandler === handler
  })

  this.data.forEach( function(node){
    node.off( event, handler )
  })
}

//兼容旧版本，只是语法糖
classPrototype.fill = classPrototype.merge = function( collection ){
  var that = this
  collection.forEach(function( node ){
    that.insert( node )
  })
  return this
}

//任何插入都必须经过 keep， 否则事件会出错
classPrototype.keep = function( data, index){
  data = data || {}
  index = index=== undefined ? this.data.length : index
  if( !Node.isNodeInstance(data) ){
    data = new this.factory( data )
  }
  this.data = this.data.slice(0, index).concat( data, this.data.slice(index) )

  util.forEach(this.nodeListeners, function(  listeners, event){
    listeners.forEach(function(listener){
      data.on(event, listener)
    })
  })

  // 监听子元素的 destroy,必须用 remove 这样移除完后才会有事件触发
  data.once('destroyed',()=>{
    this.remove(data)
  })

  //Thank IE8's funny Object.defineProperty
  this.length++
}


//任何移除都必须经过 dump, 否则事件会出错
classPrototype.dump= function( where ) {
  var that = this
  this.data.forEach(function (node, index) {
    // 增加直接 remove 某个引用的功能
    var isMatch = ( where instanceof  that.factory ) ? ( node === where ) : util.objectMatch(node.toObject(), where)
    if (isMatch) {
      //remove listener first
      util.forEach(that.nodeListeners, function (listeners, event) {
        listeners.forEach(function (listener) {
          that.data[index].off(event, listener)
        })
      })

      that.data[index] = false
      //Thank IE8's funny Object.defineProperty
      that.length--
    }
  })
  that.data = util.compact(that.data)

}

////actions////////

function decorateWithAction( obj, action, rawFn ){
  obj[action] = function(){
    var that = this
    var argv = Array.prototype.slice.call(arguments)
    that.states.start(action)
    //don't user Promise.resolve to deal with none Promise result
    //cause the callback invoke in next tick.
    var res = rawFn.apply( that, argv )
    if( res && res instanceof Promise){
      return res.then(function(data){
        that.states.end(action)
        return data
      }).catch(function(err){
        that.states.end(action)
        throw err
      })
    }else{
      that.states.end(action)
    }
    return res
  }
}

var classActions = {}
classActions.insert = [function( data, index ) {
  this.keep(data, index)
}, 'uninserted', 'inserting', 'inserted']

classActions.update = [function( where, updateEJSON ) {
  this.data.forEach(function( node ){
    if( util.objectMatch( node.toObject, where) ){
      node.set(updateEJSON)
    }
  })
}, 'unupdated', 'updating', 'updated']

classActions.remove= [function(where) {
  this.dump(where)
}, 'unremoved', 'removing', 'removed']

classActions.empty = [function(){
  this.data.forEach(node=>{
    this.dump( node )
  })
  return this
},'unempty', 'emptying', 'empty']

classActions.replace = [function( nodes){
  this.data.forEach(node=>{
    this.dump( node )
  })

  nodes.forEach( node =>{
    this.keep(node)
  })
  return this
}, 'unreplaced', 'replaceing', 'replaced']

classActions.destroy = [function(){
  this.data.forEach(node=>{
    this.dump( node )
  })
  //TODO 更多内存清理
  return this
},'undestroyed', 'destroying', 'destroyed']

//注意，这里会主动把所有action也绑到 classPrototype上
util.forEach( classActions, function( actionDef, actionName ){
  decorateWithAction( classPrototype, actionName, ...actionDef)
})


module.exports = Nodes