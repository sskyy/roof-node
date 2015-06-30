
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
    ], function(err){
      done(err)
    });

    users.push()
  })


  it("sub object event should propagate", function(done){
    var users = new UserNodes
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
})

describe("prototype test", function(){
  it("instance of should work", function(){
    var users = new UserNodes
    var UserNodes2 = Nodes.createClass(User)
    var users2 = new UserNodes2
    assert.equal( users instanceof  UserNodes, true)
    assert.equal( users2 instanceof  UserNodes2, true)
    assert.equal( users instanceof  UserNodes2, false)
    assert.equal( users2 instanceof  UserNodes, false)
  })
  it("old api should work too", function(){
    var users = new UserNodes
    assert.equal( Nodes.isNodesInstance(users) ,true)
    assert.equal( Nodes.isNodesClass(UserNodes) ,true)
  })
})

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

describe("nodes order should follow the same", function(){
  it("order of initial", function(){
    var data = [{name:"jason"},{name:"tommy"}]
    var List = Nodes.createClass()
    var list = new List(data)
    list.forEach(function( item, i){
      assert.equal( item.get("name") , data[i].name)
    })
  })
})

describe("remove item test", function(){
  it("destroy should remove item", function(){
    var data = [{name:"jason"},{name:"tommy"}]
    var List = Nodes.createClass()
    var list = new List(data)

    assert.equal( list.length, data.length )
    var jason = list.findOne({name:"jason"})
    jason.destroy()

    assert.equal( list.length, data.length - 1 )
  })
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