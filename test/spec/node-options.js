var assert = require("assert")
var _ = require("lodash")
var Node = require("../../lib/node")
var async = require("async")

describe("options test", function(){
  var User = Node.createClass({},{
    static : {
      fire : function(){
        return true
      }
    },
    decorator : {
      get : function( _get ){
        return '_' + _get.apply( this, Array.prototype.slice.call(arguments, 1))
      },
      $class : function( _Node, data  ){
        _Node.call(this, data)
        this.set('mark', 1)
      }
    }
  })

  var ian = new User({name:"ian",familyName:"William"})
  it("static method should work", function(){
    assert.equal( User.fire(), true )
  })

  it("decorator should work", function(){
    assert.equal( ian.get('name'), '_ian')
  })


  it("class decorator should work", function(){
    assert.equal( ian.get("mark"), '_1')
  })
})

