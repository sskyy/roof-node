var _ = require("lodash")
var Frames = require("./frames")
var States = require("./states")
var util = require("./util")


//global values
var NodeActionTense = {
  'push': ['unpushed','pushing','pushed'],
  'pull': ['unpulled','pulling','pulled'],
  'verify': ['unverified','verifying','verified'],
  'set': ['unset','setting','set'],
  'commit': ['uncommitted','committing','committed'],
  'rollback': ['unrollbacked','rollbacking','rollbacked'],
  'replace': ['unreplaced','replacing','replaced']
}

var NodeActions = Object.keys(NodeActionTense)

var Node = {
  createClass : function( classDef, classOptions ){
    classDef = classDef || {}
    classOptions = classOptions || {}
    var apis = _.pick(classDef, function( v ){
      return _.isFunction( v )
    })

    //api与Node方法重名检测
    var conflictedApis =  _.intersection( Object.keys(apis), Object.keys( classPrototype))
    if(conflictedApis.length !==0){
      throw new Error("Api conflict with Roof Node prototype methods:" + conflictedApis.join(","))
    }

    //动态创建class
    var newNodeClass = function( data, options ){
      options = _.extend({}, classOptions, options )
      classConstructor.call(this, classDef, options, data)

      //兼容旧api
      this.isNodeInstance = true
    }

    //绑定prototype
    newNodeClass.prototype = _.extend(_.clone(classPrototype), apis)
    newNodeClass.isNodeClass = true

    //TODO 搞定combine
    //newNodeClass.combine = function( combine ){
    //  newNodeClass.options.combine = combine
    //}
    return newNodeClass
  },
  isNodeInstance:function( obj ){
    return  obj && obj.isNodeInstance === true
  },
  isNodeClass:function( func ){
    return func && func.isNodeClass === true
  }
}


/*
 * class prototype
 */

function classConstructor( def, options, data ){
  var that = this
  this.options = options
  this.def = def
  this.updated = false
  this.states = {}
  this.data = new Frames( {frameLimit : options.frameLimit} )

  that.states = new States({
    tenses : NodeActionTense,
    naive : {
      "valid" : ["valid","invalid"],
      "clean" : ["clean","dirty"] //whether data is changed since last update from server
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

  if( data ) this.fill( data )
}





var classPrototype = {}

classPrototype.on = function(){
  this.states.on.apply( this.states, Array.prototype.slice.call(arguments) )
}

classPrototype.off = function(){
  this.states.removeListener.apply( this.states, Array.prototype.slice.call(arguments) )
}

classPrototype.set = function( path, value ){
  /*
    TODO
    对所有verified过的数据打一个快照
    这样有改动时既可以和最新的这个快照对比，看看是不是clean的，
    而不是像现在这样只要有改动就设置成dirty
   */

  if( path instanceof CombinedArgv ){
    value = path[1]
    path = path[0]
  }
  this.states.deactivate("clean")
  return this.data.set(path, value)
}

classPrototype.merge = function( path, value ){
  /*
   TODO
   对所有verified过的数据打一个快照
   这样有改动时既可以和最新的这个快照对比，看看是不是clean的，
   而不是像现在这样只要有改动就设置成dirty
   */

  if( path instanceof CombinedArgv ){
    value = path[1]
    path = path[0]
  }
  this.states.deactivate("clean")
  return this.data.merge(path, value)
}

classPrototype.fill =function( obj ){
  return this.data.fill( obj )
}

classPrototype.commit =function( commitName ){
  if( commitName instanceof CombinedArgv ){
    commitName = undefined
  }
  var result = this.data.commit(commitName)
  if( result ){
    this.states.reset("set")
  }
  return result
}

classPrototype.rollback = function( commitName ){
  var result = this.data.rollback(commitName)
  if( result ){
    this.states.reset("set")
  }
  return result
}

classPrototype.get = function(path){
  return this.data.get(path)
}

classPrototype.toObject = function(path){
  //TODO
  return this.data.toObject()
}

classPrototype.clone = function(){
  //TODO
}

classPrototype.is = function(){
  return this.states.is.apply(this.states, Array.prototype.slice.call(arguments))
}

classPrototype.pull = classPrototype.push = function rawUpdate( promise ){
  //this function will be called after user's handler
  var that = this
  return Promise.resolve(promise).then(function(data){
    that.states.activate("clean")
    that.states.activate("valid")
    that.states.reset("verify")
    that.states.reset("pull")
    that.states.reset("push")
    return data
  }, function(err){
    that.states.deactivate("clean")
    that.states.deactivate("valid")
    throw err
  })
}

classPrototype.verify = function( promise ) {
  //this function will be called after user's handler
  var that = this
  return Promise.resolve(promise).then(function () {
    that.states.activate("valid")
  }, function () {
    that.states.deactivate("valid")
  })
}


//this is important
NodeActions.forEach(function( action ){
  util.decorateWithMiddleware( classPrototype, action )
  util.decorateWithState( classPrototype, action )
})


classPrototype.combine = function( actionsToCombine ){
  if( this.combinedActions ){
    return console.warn("This instance already combined actions : ", this.combine)
  }
  var mainAction = actionsToCombine[0]
  var that = this
  that[mainAction] = function(){
    var argv = Array.prototype.slice.call(arguments)
    return util.promiseSeries( actionsToCombine, function(action){
      return classPrototype[action].call( that, new CombinedArgv( _.clone(actionsToCombine), _.cloneDeep(argv)) )
    })
  }
  this.combinedActions = actionsToCombine
}

function CombinedArgv( combine, argv ){
  var that = this
  argv.forEach(function( v, k ){
    that[k] = v
  })

  that.combine = combine
  that.length = argv.length
}


module.exports = Node