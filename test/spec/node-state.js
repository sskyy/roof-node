var assert = require("assert")
var _ = require("lodash")
var Node = require("../../lib/node")
var async = require("async")

var User = Node.createClass({
  push : [function(){
    return new Promise(resolve=>{
      this.set('id', Date.now())
      setTimeout(resolve, 50)
    })
  }, 'unpushed', 'pushing', 'pushed']
})


describe("initial states test",function(){
  var john = new User
  it("initial state should match",function(){

    assert.equal( john.is("unset"), true )
    assert.equal( john.is("set"), false )
    assert.equal( john.is("undestroyed"), true )
    assert.equal( john.is("unreplaced"), true )

  })
})

//
//describe("async state test", function(){
//
//  it('async method should have async state', function( done ){
//    var props = {
//      name : "disel",
//      age : 32
//    }
//
//    var disel = new User(props)
//
//    assert.equal( disel.is("unpushed"), true )
//    disel.push().then(function(){
//      assert.equal( disel.is("pushed"), true )
//      assert.notEqual( disel.get("id"), undefined )
//      assert.equal( disel.is("unset"), false )
//      assert.equal( disel.is("set"), true )
//      assert.equal( disel.is("undestroyed"), true )
//      assert.equal( disel.is("unreplaced"), true )
//      done()
//    }).catch(function(err){
//      console.log( err )
//      done(err)
//    })
//
//    console.log( JSON.stringify(disel.states))
//    assert.equal( disel.is("pushing"), true )
//  })
//})
