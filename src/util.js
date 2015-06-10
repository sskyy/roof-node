var bPromise = require("bluebird")
var _ = require("lodash")


function loadMiddlewareActions( middlewares ){
  var middlewareActions = {}
  var keys =["before","fn","after"]
  middlewares.forEach(function( middleware){
    _.forEach( middleware, function( actionDef, action){
      if( !middlewareActions[action] ){
        middlewareActions[action] = _.zipObject(keys, keys.map(function(){return []}))
      }

      if( _.isFunction(actionDef )){
        middlewareActions[action].fn.push( actionDef )
      }else if( _.isObject( actionDef)){
        keys.forEach(function(key){
          _.isFunction(actionDef[key])  && middlewareActions[action][key].push( actionDef[key] )
        })
      }else{
        console.warn("unrecognized middleware action definition:",actionDef)
      }
    })
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
    if( res && _.isFunction(res.then) ){
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
  for( var i in where ){
    if( !where.hasOwnProperty(i) || !obj.hasOwnProperty(i)) return false;
    if( _.isObject( where[i]) !== _.isObject(where[i])) return false;
    if( !_.isObject( where[i]) && where[i] !== obj[i] ) return false;
    if( _.isObject( where[i])  && !objectMatch(obj[i],where[i]) ) return false
  }
  return true
}


module.exports = {
  promiseSeries : promiseSeries,
  loadMiddlewareActions : loadMiddlewareActions,
  decorateWithMiddleware:decorateWithMiddleware,
  decorateWithState:decorateWithState,
  objectMatch:objectMatch
}