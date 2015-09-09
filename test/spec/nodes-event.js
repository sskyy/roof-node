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


describe("events test", function(){

  it("state change should fire event", function(done){
    var users = new Users
    async.parallel([
      function( cb ){
        users.on("pushing", function( val, oldVal){
          assert.equal( val, 'pushing')
          assert.equal( oldVal, 'unpushed')
          cb()
        })
      },
      function( cb ){
        users.on("pushed", function( val, oldVal){
          assert.equal( val, 'pushed')
          assert.equal( oldVal, 'pushing')
          cb()
        })
      }
    ], function(err){
      done(err)
    });

    users.push()
  })


  it("sub object event should propagate", function(done){
    var users = new Users
    var user = new User
    async.parallel([
      function( cb ){
        users.onAny("pushing", function( val, oldVal){

          assert.equal( val, 'pushing')
          assert.equal( oldVal, 'unpushed')
          cb()
        })
      },
      function( cb ){
        users.onAny("pushed", function( val, oldVal){
          assert.equal( val, 'pushed')
          assert.equal( oldVal, 'pushing')
          cb()
        })
      },
      function(cb){
        users.insert(user)
        cb()
      }
    ], function(err){
      done(err)
    });

    user.push()
  })

  it("sub object destroy should propagate", function(done){
    var users = new Users
    var user = new User
    var destroyFired = false
    async.parallel([
      function( cb ){
        users.onAny("change", function( val, oldVal){
          if( !destroyFired ){
            destroyFired = true
            cb()
          }
        })
      },
      function(cb){
        users.insert(user)
        cb()
      }
    ], function(err){
      assert.equal( destroyFired, true)
      done(err)
    });

    user.destroy()
  })
})