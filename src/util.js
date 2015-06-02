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
      return res.then(function(){
        that.states.end(action)
      },function(){
        that.states.end(action)
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

      return promiseSeries(["before","fn","after"],function( fnName){
        if( !that.middlewareActions[action][fnName].length ) return true
        var fns = that.middlewareActions[action][fnName]

        //important
        if( fnName === "fn" ) fns.push( rawAction )

        var lastResult
        return promiseSeries( fns, function( fn ){
          lastResult = fn.apply( that, [lastResult].concat(argv) )
          //console.log("applied", _.isFunction(fn), fn.toString(), lastResult)

          return lastResult
        })
      })
    }else{
      //console.log("no middleware loaded for action", action)
      return rawAction.apply( that, arguments)
    }
  }
}

//TODO 去掉bluebird
function promiseSeries( fns, iterator ){
  var defers = fns.map(function(){
    var resolve, reject;
    var promise = new Promise(function() {
      resolve = arguments[0];
      reject = arguments[1];
    });
    return {
      resolve: resolve,
      reject: reject,
      promise: promise
    };
  })
  var promises = defers.map(function(d){
    return d.promise
  })
  var i = 0
  var res = new Promise((resolve, reject)=>{

    bPromise.each(promises, function(){

      var res = iterator( fns[i] )
      if( res instanceof Promise){
        res.then(function(){
          ++i
          defers[i]&&defers[i].resolve()
        },function(res){
          throw res
        })
      }else{
        ++i
        defers[i]&&defers[i].resolve()
      }
    }).then(resolve,reject)

  })
  defers[0].resolve()
  return res
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
      return res.then(function(){
        that.states.end(action)
      },function(){
        that.states.end(action)
      })
    }else{
      that.states.end(action)
    }
  }
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