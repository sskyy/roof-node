var _ = require("lodash")
var Node = require("../lib/node.js")
var Nodes = require("../lib/nodes.js")
var React = require("react")

function getRef( obj, name ){
  var ns = !_.isArray(name) ? name.split('.') : name,
      ref = obj,
      currentName

  while( currentName = ns.shift() ){
    if(_.isObject(ref) && ref[currentName]){
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
  def = _.defaults(def,{
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
    this[def.attach] = _.mapValues( def.cursors, function( name){
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


    //utilities
    this[def.attach]._handleFormChange = function( cursor, field, e ){
      cursor.set(field, e.target.value)
    }


    return getStateProxy(randomKey)
  }

  mixinInstance.componentDidMount = function(){
    var that = this
    updater = updateComponentFromDataChange.bind(that,randomKey)

    _.forEach( this[def.attach], function( obj ){
      if(  Node.isNodeInstance(obj)  ||  Nodes.isNodesInstance(obj) ){
        obj.on("change",updater)
        if( Nodes.isNodesInstance( obj )){
          obj.onAny( "change", updater)
        }
      }
    })
  }

  mixinInstance.componentWillUnmount = function(){
    _.forEach( this[def.attach], function( obj ){
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
