var Node = require("../lib/node.js")
var Nodes = require("../lib/nodes.js")
var React = require("react")

function forEach( obj, handler ){
  for( var i in obj ){
    if( obj.hasOwnProperty(i)){
      handler( obj[i], i)
    }
  }
}

function isArray( arr ){
  return Object.prototype.toString.call(arr) === '[object Array]'
}

function isObject( obj ){
  return typeof obj === 'object'
}

function defaults( def, source ){
  var output = {}
  forEach(def, function( v,k){
    output[k] = v
  })

  forEach(source, function(v,k){
    if( output[k] === undefined ){
      output[k] = v
    }
  })
  return output
}

function mapValues( obj, handler ){
  var output = {}
  forEach( obj, function(v, k){
    output[k] = handler(v, k )
  })
  return output
}

function getRef( obj, name ){
  var ns = !isArray(name) ? name.split('.') : name,
      ref = obj,
      currentName

  while( currentName = ns.shift() ){
    if(isObject(ref) && ref[currentName]){
      ref = ref[currentName]
    }else{
      ref = undefined
      break;
    }
  }

  return ref
}

function getStateProxy( randomKey ){
  var proxyState =  {}
  proxyState[randomKey] = (new Date()).getTime()
  return proxyState
}

function Mixin( data, def ){
  def = defaults(def,{
    attach : "cursors",
    cursors : {}
  })
  var randomKey = (new Date()).getTime()
  var mixinInstance = {}
  var updater


  function updateComponentFromDataChange(randomKey){
    this.setState(getStateProxy(randomKey))
  }

  if( data.isServerRendering === true){
    mixinInstance.contextTypes =  {
      roofServerRenderingKey: React.PropTypes.string.isRequired
    }
  }


  mixinInstance.getInitialState = function(){
    var that = this
    this[def.attach] = mapValues( def.cursors, function( name){
      var dataRef
      if( data.isServerRendering === true) {
        //服务器端渲染
        dataRef = getRef(data.getData(that.context.roofServerRenderingKey), name)
      }else{
        //非服务器端渲染
        dataRef = getRef(data, name)
      }
      if (!dataRef) {
        console.warn("you are requiring an undefined cursor", name, JSON.stringify(data))
      }
      return dataRef
    })


    ////utilities
    //this[def.attach]._handleFormChange = function( cursor, field, e ){
    //  cursor.set(field, e.target.value)
    //}


    return getStateProxy(randomKey)
  }

  mixinInstance.componentDidMount = function(){
    var that = this
    updater = updateComponentFromDataChange.bind(that,randomKey)

    forEach( this[def.attach], function( obj ){
      if(  Node.isNodeInstance(obj)  ||  Nodes.isNodesInstance(obj) ){
        obj.on("change",updater)
        if( Nodes.isNodesInstance( obj )){
          obj.onAny( "change", updater)
        }
      }
    })
  }

  mixinInstance.componentWillUnmount = function(){
    forEach( this[def.attach], function( obj ){
      if(  Node.isNodeInstance(obj)  ||  Nodes.isNodesInstance(obj) ){
        obj.off("change",updater)
        if( Nodes.isNodesInstance( obj )){
          obj.offAny( "change", updater)
        }
      }
    })
  }

  return mixinInstance
}



module.exports = Mixin;

module.exports.util = {
  handleFormChange : function( data, field, e ){
    data.set(field, e.target.value)
  }
}
