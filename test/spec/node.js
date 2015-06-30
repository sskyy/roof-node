var assert = require("assert")
var _ = require("lodash")
var Node = require("../../src/node")
var defaultMiddleWare = require("../middleware/default/node")
var failMiddleWare = require("../middleware/default/fail.js")
var async = require("async")

var userDef = {}
var User = Node.createClass( userDef, {middleware:defaultMiddleWare} )
var UserFail = Node.createClass( userDef, {middleware:failMiddleWare})


describe("initial states test",function(){
  var john = new User
  it("initial state should match",function(){

    assert.equal( john.is("unpulled"), true )
    assert.equal( john.is("pulled"), false )
    assert.equal( john.is("unpushed"), true )
    assert.equal( john.is("pushed"), false )
    assert.equal( john.is("unset"), true )
    assert.equal( john.is("set"), false )
    assert.equal( john.is("uncommitted"), true )
    assert.equal( john.is("committed"), false )
    assert.equal( john.is("unverified"), true )
    assert.equal( john.is("verified"), false )
    assert.equal( john.is("unrollbacked"), true )
    assert.equal( john.is("rollbacked"), false )

  })

  it("state combo should match", function(){
    assert.equal( john.is("unpulled","unpushed"), true )
    assert.equal( john.is("unpulled","pushed"), false )
    assert.equal( john.is(["unset","uncommited"]), true )
    assert.equal( john.is(["unset","pushed"]), true )
    assert.equal( john.is(["set","pushed"]), false )
    assert.equal( john.is(["set","pushed"],"committed"), false )
    assert.equal( john.is(["unset","unpushed"],"committed"), false )
    assert.equal( john.is(["unset","unpushed"],"uncommitted"), true )
    assert.equal( john.is(["unset","pushed"],"uncommitted"), true )
  })
})

describe("data set test", function(){
  var jason = new User
  var props = {
    name : "jason",
    age : 25
  }

  _.forEach( props, function(v, k){
    jason.set(k,v)
  })

  it("set state should change", function(){
    assert.equal( jason.is("set"), true )
  })

  it("data should change", function(){
    _.forEach( props, function(v, k){
      assert.equal( jason.get(k), v)
    })
  })
})

describe("commit and rollback test", function(){
  var walker = new User
  var commitName = "first_commit"
  var props = {
    name : "walker",
    age : 32
  }

  _.forEach( props, function(v, k){
    walker.set(k,v)
  })

  it("data length should change", function(){
    walker.commit(commitName)
    assert.equal( walker.data.length, 1 )
    assert.equal( walker.is("committed"), true )
    assert.equal( walker.is("unset"), true )
  })

  it("data should change", function(){
    walker.set("age",26)
    assert.equal( walker.get("age"), 26 )
    assert.equal( walker.is("unset"), false )
    walker.rollback(commitName)
    assert.equal( walker.data.length, 0)
    assert.equal( walker.get("age"), 32)
    assert.equal( walker.is("unset"), true)
  })
})


describe("async state test", function(){
  it('async method should have async state', function( done ){
    var disel = new User
    var props = {
      name : "disel",
      age : 32
    }

    _.forEach( props, function(v, k){
      disel.set(k,v)
    })

    assert.equal( disel.is("unpushed"), true )
    disel.commit()
    assert.equal( disel.is("committed"), true )
    disel.push().then(function(data){
      assert.notEqual( disel.get("id"), undefined )
      assert.equal( disel.is("pushed"), true )
      assert.equal( disel.is("clean"), true )
      assert.equal( disel.is("valid"), true)
      assert.equal( disel.is("invalid"), false)
      assert.equal( disel.is("pulled"), false)
      assert.equal( disel.is("verified"), false)



      done()
    }).catch(function(err){
      console.log( err )
      done(err)
    })

    assert.equal( disel.is("pushing"), true )
  })
})

describe("push and pull", function(){
  it( "get resolve data", function(done){
    var disel = new User({name:"disel"})
    disel.push().then(function(data){
      //resolve得到的数据
      assert.equal( data.id, disel.get("id"))
      assert.equal( data.name, disel.get("name"))
      done()
    })
  })

  it("push should fail", function(done){
    var disel = new UserFail({name:"disel"})
    disel.push().then(function(){
      //resolve得到的数据
      done("should not be called")
    }).catch(function(err){
      assert.equal( disel.get("id"), undefined )
      assert.notEqual( disel.get("name"), undefined )
      assert.notEqual( err, undefined )
      done()
    })
  })

})

describe("combine action test", function(){

  var lati = new User
  lati.combine(["set","commit"])

  it("set and commit state should change together", function( done ){
    assert.equal( lati.is("unset","uncommitted"), true)
    lati.set("name","lati").then(function(){
      assert.equal( lati.is("unset","committed"), true)
      done()
    })
  })

  var rome = new User
  rome.combine(['push','commit'])

  it("auto commit after push", function(done){
    assert.equal( rome.is("unpushed","uncommitted"), true)
    rome.push().then(function(data){
      assert.equal( rome.is("pushed","committed"), true)
      assert.notEqual( rome.get("id"), undefined)
      done()
    })
  })
})


describe("state event test", function(){

  it("state change should fire event", function(done){
    var miya = new User
    async.parallel([
      function( cb ){
        miya.on("set", function( val, oldVal){
          assert.equal( val, 'set')
          assert.equal( oldVal, 'setting')
          cb()
        })
      },
      function( cb ){
        miya.on("setting", function( val, oldVal){
          assert.equal( val, 'setting')
          assert.equal( oldVal, 'unset')
          cb()
        })
      }
    ], function(){
      done()
    });

    miya.set("name","miya")
  })

  it("push change should fire event", function(done){
    var miya = new User
    async.parallel([
      function( cb ){
        miya.on("pushing", function( val, oldVal){
          assert.equal( val, 'pushing')
          assert.equal( oldVal, 'unpushed')
          cb()
        })
      },
      function( cb ){
        miya.on("pushed", function( val, oldVal){
          assert.equal( val, 'pushed')
          assert.equal( oldVal, 'pushing')
          cb()
        })
      }
    ], function(){
      done()
    });

    miya.push()
  })

  it("once should fire only once", function(){
    var jane = new User
    var fired = 0
    jane.once("setting", function(){
      fired ++
    })
    jane.set("name","jane")
    jane.set("name","jone")

    assert.equal( fired, 1)
  })

})

describe("prototype test", function(){
  var maya = new User
  var User2 = Node.createClass({})
  var jesper = new User2
  it("instanceof should work", function(){
    assert.equal( maya instanceof  User, true)
    assert.equal( jesper instanceof  User2, true)
    assert.equal( jesper instanceof  User, false)
  })

  it("work with old api", function(){
    assert.equal(Node.isNodeInstance(maya), true)
    assert.equal(Node.isNodeInstance(jesper), true)
    assert.equal(Node.isNodeClass(User), true)
  })
})

describe("class api test", function(){
  var User = Node.createClass({
    setName : function( name ){
      this.set("name", name)
    },
    getFullName : function(){
      return this.get("familyName") + this.get("name")
    }
  })

  var ian = new User({name:"ian",familyName:"William"})
  it("api should work", function(){
    assert.equal( ian.getFullName(), "Williamian")
    ian.setName("jhon")
    assert.equal( ian.getFullName(), "Williamjhon")
  })

  it("api conflict should fail", function(){
    var error = false
    try{
      Node.createClass({
        set : function( name ){
          this.set("name", name)
        },
        get : function(){
          return this.get("familyName") + this.get("name")
        }
      })
    }catch(e){
      console.log( e)
      error = true
    }
    assert.equal(error, true)
  })



  it("destroyed item method will be locked", function(){
    var jane = new User
    var fired = 0
    jane.once("setting", function() {
      fired++
    })

    jane.destroy()
    assert.equal( jane.is("destroyed"), true )
    jane.set("name","jane")
    assert.equal( jane.get("name"), undefined )
  })
})

describe("push wrong data should change local object state to error",function(){

})