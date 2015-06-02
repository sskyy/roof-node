var States = require("../../src/states")
var assert = require("assert")
var async = require("async")

var NodeActionTense = {
  'push':['unpushed','pushing','pushed'],
  'pull':['unpulled','pulling','pulled'],
  'set':['unset','setting','set'],
  'verify':['unverified','verifying','verified'],
  'commit':['uncommitted','committing','committed'],
  'rollback':['unrollbacked','rollbacking','rollbacked'],
  'replace' : ['unreplaced','replacing','replaced']
}

var NaiveStates = {
  "valid" : ["valid","invalid"]
}


describe("state test", function(){
  var states

  beforeEach(function(){
    states = new States({
      tenses:NodeActionTense,
      naive : NaiveStates
    })
  })

  it("basic action test",function(){
    states.start("push")
    assert.equal( states.is("pushing"), true )
    assert.equal( states.is("pushed"), false )
    states.end("push")
    assert.equal( states.is("pushed"), true )
    assert.equal( states.is("pushing"), false )
  })

  it("basic naive state test", function(){
    states.activate("valid")
    assert.equal( states.is("valid"), true )
    states.deactivate("valid")
    assert.equal( states.is("invalid"), true )
  })

  it("combined state test", function(){
    states.activate("valid")
    states.start("push")
    assert.equal( states.is("valid","pushing"), true )
    assert.equal( states.is("valid","pushed"), false )
    assert.equal( states.is(["valid","pushed"]), true)
    assert.equal( states.is(["valid","pushed"],"committed"), false)
    assert.equal( states.is(["valid","pushed"],"pushing"), true)
  })

  it("state change event test",function(done){
    async.parallel([
      function( cb ){
        states.on("change", function( val, oldVal){
          assert.equal( oldVal, "unpushed")
          assert.equal( val, 'pushing')
          console.log("change")
          cb()
        })
      },
      function( cb ){
        states.on("pushing", function(val, oldVal){
          assert.equal( oldVal, "unpushed")
          assert.equal( val, 'pushing')
          console.log("pushing")

          cb()
        })
      }
    ], function(){
      done()
    });

    states.start("push")
  })

  it("naive state event test", function(){
    async.parallel([
      function( cb ){
        states.on("change", function( val, oldVal){
          assert.equal( oldVal, null)
          assert.equal( val, 'valid')
          cb()
        })
      },
      function( cb ){
        states.on("pushing", function(val, oldVal){
          assert.equal( oldVal, null)
          assert.equal( val, 'valid')
          cb()
        })
      }
    ], function(){
      done()
    });
    states.activate("valid")
  })
})