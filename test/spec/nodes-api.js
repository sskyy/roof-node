var assert = require("assert")
var _ = require("lodash")
var Node = require("../../src/node")
var Nodes = require("../../src/nodes")
var async = require("async")


var User = Node.createClass()
var Users= Nodes.createClass( User )


describe("nodes api test", function(){
  it("api should work", function(){
    var UserList = Nodes.createClass({
      setAllName : function(name){
        return this.forEach(function(node){
          node.set("name", name)
        })
      },
      getTotalAge : function( ){
        var total = 0
        this.forEach(function( node){
          total += node.get("age")
        })
        return total
      }
    })

    var users = new UserList
    users.insert({"name":"jhon", age:21})
    users.insert({"name":"maya", age:32})

    assert.equal( users.getTotalAge(), 53)
    users.setAllName("jesper")

    assert.equal( users.getTotalAge(), 53)
    assert.equal( users.get(0).get("name"), "jesper")
  })

  it("api conflict should fail", function(){
    var error =false
    try{
      Node.createClass({
        set : function(){},
        get : function(){},
        commit : function(){}
      })
    }catch(e){
      console.log(e)
      error = true
    }
    assert.equal( error, true)
  })
})