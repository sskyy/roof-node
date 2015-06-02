
var userDef = {}
var assert = require("assert")
var _ = require("lodash")
var Node = require("../../src/node")
var Nodes = require("../../src/nodes")
var defaultNodeMiddleWare = require("../middleware/default/node")
var defaultNodesMiddleWare = require("../middleware/default/nodes")
var facade = require("../middleware/default/facade")
var async = require("async")
var Promise= require("bluebird")


var User = Node.createClass( userDef, {middleware:defaultNodeMiddleWare} )
var UserNodes = Nodes.createClass( User , {middleware:defaultNodesMiddleWare,facade:facade} )


describe("nodes facade methods test",function(){

  it('basic methods test', function(done){
    //use UserNodes basic methods as facade
    Promise.all([UserNodes.insert({age:">5"}),UserNodes.update(1, {age :"15"}),UserNodes.remove({age:">5"}) ]).then(function(){
      done()
    })
  })
})


describe("states test", function(){
  var users = new UserNodes

  it("states from instance methods", function(done){
    users.insert({name:"A",age:16})
    assert.equal( users.is("inserted"), true )

    users.pull({age:"<5"}).then(function(){
      assert.equal(users.is("pulled"),true)
      done()
    })
    assert.equal( users.is("pulling"), true )
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

describe("events test", function(){
  it("state change should fire event", function(done){
    var users = new UserNodes
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
    ], function(){
      done()
    });

    users.push()
  })
  //
  //it("sub object event should propagate", function(done){
  //  var users = new UserNodes
  //  var user = User.new()
  //  users.insert( user )
  //  async.parallel([
  //    function( cb ){
  //      users.onAny("pushing", function( val, oldVal){
  //        assert.equal( val, 'pushing')
  //        assert.equal( oldVal, 'unpushed')
  //        cb()
  //      })
  //    },
  //    function( cb ){
  //      users.onAny("pushed", function( val, oldVal){
  //        assert.equal( val, 'pushed')
  //        assert.equal( oldVal, 'pushing')
  //        cb()
  //      })
  //    }
  //  ], function(){
  //    done()
  //  });
  //
  //  user.push()
  //})
})

//
//describe("commit and rollback test", function(){
////commit changes
//  //if validation not passed, we will warn you but not stop you.
//  //if validation promise not finished, commit will wait.
//  //commit will return a promise too.
//  users.commit()
//
//  //save changes to server
//  //how to transfer data changes depend on `dct`
//  //if push failed, the collection will be marked as dirty.
//  users.push()
//
//  //if push failed, should we rollback?
//  users.rollback()
//})
//
//

//
//
//describe("util method test", function(){
////get a single
//  users.findOne(1)
//
//  //get a sub collection
//  users.find({name:"A"})
//
//  //custom filter
//  users.find(function(obj){
//    return obj.name === "A"
//  })
//})