var assert = require("assert")
var _ = require("lodash")
var Node = require("../../lib/node")
var Nodes = require("../../lib/nodes")
var async = require("async")

var pushAction = [function(){
  return new Promise(resolve=>{
    setTimeout( resolve, 50)
  })
},'unpushed','pushing','pushed']

var User = Node.createClass({
  push:pushAction
})
var Users= Nodes.createClass( {
  $factory : User,
  push :pushAction
} )

describe("states test", function(){
  var users = new Users

  it("states from instance methods", function(done){
    users.insert({name:"A",age:16})
    assert.equal( users.is("inserted"), true )

    users.push().then(function(){
      assert.equal(users.is("pushed"),true)
      done()
    })
    assert.equal( users.is("pushing"), true )
  })

  it("states from sub object test", function(){
    var userData = {name:"B",age:18}
    users.insert(userData)
    var user = users.findOne({name:userData.name})
    user.push()
    assert.equal( user.is("pushing"), true)
    assert.equal( users.is("pushing"), false)
    assert.equal( users.isAny("pushing"), true)
  })
})
