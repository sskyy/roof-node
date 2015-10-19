var util = require('./util')

function Container(){
  this.data = {}
}

Container.prototype.set = function( path , value ){
  var that = this
  if( util.isPlainObject(path) ){
    util.forEach( path, function( v, k ){
      setRef(that.data, k, v)
    })
  }else{
    return setRef(that.data, path, value)
  }
}

Container.prototype.merge = function( path, value ){
  var that = this
  if( util.isPlainObject(path) ){
    util.forEach( path, function( v, k ){
      setRef(that.data, k, v, true)
    })
  }else{
    return setRef(that.data, path, value, true)
  }
}

Container.prototype.fill = function( obj ){
  this.data = obj
}

Container.prototype.get = function( path ){
  return getRef(this.data, path)
}


Container.prototype.toObject = function(){
  return util.cloneDeep( this.data )
}

function getRef( obj, name ){
  var ns = name.split('.'),
    ref = obj,
    currentName

  while( currentName = ns.shift() ){
    if(util.isObject(ref) && ref[currentName]!==undefined){
      ref = ref[currentName]
    }else{
      ref = undefined
      break;
    }
  }

  return  ref
}

function setRef( obj, name, data, merge ){

  var ns = name.split('.'),
    ref = obj,
    currentName

  while( currentName = ns.shift() ){
    if( ns.length == 0 ){
      //这里不再隐式地提供merge功能
      //要merge请使用merge接口
      if( util.isObject(ref[currentName]) && merge ){
        ref[currentName] = util.merge({},ref[currentName], data)
      }else{
        if( ref[currentName] !== undefined ) console.warn("you are replacing a exist data", name)
        ref[currentName] = data
      }



    }else{
      if( !util.isObject(ref[currentName])) {
        if( ref[currentName] !== undefined ) console.warn("your data will be reset to an object", currentName)
        ref[currentName] = {}
      }
      ref = ref[currentName]
    }
  }
}

module.exports = Container