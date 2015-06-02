var Promise = require("bluebird")

module.exports = {
  push : {
    fn : function fakePush(){
      var that = this
      if( that.is("committed") ) {
        console.warn("you are trying to push a uncommitted data")
      }

      var data = that.toArray()
      data.forEach(function(node, index){
        node.id = index
      })
      return new Promise(function( resolve ){
        setTimeout(function(){
          that.empty( data )
          that.fill( data )
          resolve(data)
        },100)
      })
    }
  },
  pull : function(){
    fn : function fakePull(){
      var that = this
      console.log("its working")

      var data = [{id:1,name:"miya"},{id:2,name:"walker"}]

      return new Promise(function( resolve ){
        setTimeout(function(){
          that.fill( data )
          resolve(data)
        },100)
      })
    }
  }
}