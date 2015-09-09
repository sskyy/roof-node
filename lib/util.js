'use strict'

function isObject( obj ){
  return typeof obj === 'object'
}

function zipObject(keys, values){
  var output = {}
  for( let i in keys ){
    output[keys[i]] = values[i]
  }
  return output
}

function loadMiddlewareActions( middlewares ){
  var middlewareActions = {}
  var keys =["before","fn","after"]
  middlewares.forEach(function( middleware){
    for( let action in middleware ){
      let actionDef = middleware[action]
      if( !middlewareActions[action] ){
        middlewareActions[action] = zipObject(keys, keys.map(function(){return []}))
      }

      if( typeof actionDef === 'function' ){
        middlewareActions[action].fn.push( actionDef )
      }else if( isObject( actionDef)){
        keys.forEach(function(key){
          (typeof actionDef[key] === 'function')  && middlewareActions[action][key].push( actionDef[key] )
        })
      }else{
        console.warn("unrecognized middleware action definition:",actionDef)
      }
    }
  })

  return middlewareActions
}

function decorateWithState (prototype, action){
  var rawAction = prototype[action]
  prototype[action] = function(){
    var that = this
    var argv = Array.prototype.slice.call(arguments)
    that.states.start(action)
    //don't user Promise.resolve to deal with none Promise result
    //cause the callback invoke in next tick.
    var res = rawAction.apply( that, argv )
    if( res && typeof res.then === 'function' ){
      return res.then(function(data){
        that.states.end(action)
        return data
      },function(err){
        that.states.end(action)
        throw err
      })
    }else{
      that.states.end(action)
    }
  }
}

function decorateWithMiddleware( prototype, action ){
  var rawAction = prototype[action]
  prototype[action] = function(){
    var that = this
    var argv = Array.prototype.slice.call(arguments)


    if( that.middlewareActions && that.middlewareActions[action] ){
      var fnResult
      return promiseSeries(["before","fn","after"],function( fnName, lastRes){
        if( !that.middlewareActions[action][fnName].length ) { return lastRes }
        var fns = that.middlewareActions[action][fnName]
        //important
        if( fnName === "fn" ) fns.push( rawAction )
        return promiseSeries( fns, function(fn, res){
          return fn.apply( that, [res].concat(argv) )
        }).then(function(_fnResult) {
          if(fnName === "fn") fnResult = _fnResult
        }, lastRes)
      }).then(function() {
        //返回fn的resolve值
        return fnResult
      })
    }else{
      //console.log("no middleware loaded for action", action)
      return rawAction.apply( that, arguments)
    }
  }
}


function promiseSeries(fns, iterator) {
  var _promise = Promise.resolve(true)
  fns.forEach(function(fn) {
    _promise = _promise.then(function (data) {
      return iterator(fn, data)
    })
  })
  return _promise
}

function objectMatch( obj, where){
  for( let i in where ){
    if( !where.hasOwnProperty(i) || !obj.hasOwnProperty(i)) return false;
    if( isObject( where[i]) !== isObject(where[i])) return false;
    if( !isObject( where[i]) && where[i] !== obj[i] ) return false;
    if( isObject( where[i])  && !objectMatch(obj[i],where[i]) ) return false
  }
  return true
}

var pick = require('lodash.pick')

var  intersection = require('lodash.intersection')

function union( ){
  var sources = Array.prototype.slice.call(arguments, 0)
  var output = []
  sources.forEach(items=>{
    items.forEach(item=>{
      if( output.indexOf(item) === -1){
        output.push( item )
      }
    })
  })
  return output
}

var extend = require('object-assign')

function isArray( arr ){
  return Object.prototype.toString.call(arr) === '[object Array]'
}

function clone( source ){
  return extend({}, source)
}

var isPlainObject = require('lodash.isplainobject')

var cloneDeep = require('lodash.clonedeep')

function defaults( target, source ){
  var output = clone( target )
  for( let i in source ){
    if( output[i] === undefined ){
      output[i] = source[i]
    }
  }
  return output
}

function forEach( obj, handler  ){
  for( let i in obj ){
    if( obj.hasOwnProperty(i)){
      handler( obj[i], i)
    }
  }
}

var merge = require('lodash.merge')

function any(obj, handler ){
  for( let i in obj ){
    if( obj.hasOwnProperty(i) && handler(obj[i],i)){
      return true
    }
  }

  return false
}

function every(obj, handler ){
  for( let i in obj ){
    if( obj.hasOwnProperty(i) && !handler(obj[i],i)){
      return false
    }
  }

  return true
}

var remove = require('lodash.remove')
var compact = require('lodash.compact')



function mapValues(obj,handler){
  var output = {}
  forEach(obj, function( value,key ){
    output[key] =  handler( value, key)
  })
  return output
}

function transform( obj, handler ){
  var output = isArray(obj) ? [] : {}
  forEach(obj, function( value,key ){
    handler( output, value, key)
  })
  return output
}

function decorate( obj, name, decorator ){
  var _origin = obj[name]
  obj[name] = function(){
    var args = Array.prototype.slice.call( arguments, 0 )
    return decorator.apply( this, [_origin].concat(args) )
  }
}

module.exports = {
  promiseSeries,
  loadMiddlewareActions,
  decorateWithMiddleware,
  decorateWithState,
  objectMatch,
  pick,
  extend,
  isArray,
  isObject,
  clone,
  zipObject,
  cloneDeep,
  intersection,
  isPlainObject,
  defaults,
  forEach,
  merge,
  any,
  every,
  remove,
  compact,
  mapValues,
  transform,
  decorate
}