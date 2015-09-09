var assert = require("assert")
var _ = require("lodash")
var Nodes = require("../../lib/nodes")
var async = require("async")

describe("options test", function(){
  var data = {name:'jason', age:1}

  var Users = Nodes.createClass({},{
    static : {
      fire : function(){
        return true
      }
    },
    decorator : {
      get : function( _get ){
        var node =  _get.apply( this, Array.prototype.slice.call(arguments, 1))
        node.set('mark', 2)
        return node
      },
      $class : function( _Node, data  ){
        _Node.call(this, data)
        this.insert(data)
      }
    }
  })

  var users = new Users
  it("static method should work", function(){
    assert.equal( Users.fire(), true )
  })

  it("decorator and $class should work", function(){
    var user = users.get(0)
    assert.equal( user.get('mark'), 2)
  })


})

