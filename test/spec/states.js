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
  "valid" : ["valid","invalid"],
  "clean" : ["clean","dirty"]
}


describe("state test", function(){
  var states

  beforeEach(function(){
    states = new States({
      tenses : NodeActionTense,
      naive : NaiveStates
    })
  })

  it("basic set test", function(){
    states.set("clean", "clean")
    assert(states.is("clean"))
    states.set("clean", "dirty")
    assert(states.is("dirty"))

    states.set("valid", "valid")
    assert(states.is("valid"))
    states.set("valid", "invalid")
    assert(states.is("invalid"))

    states.set("push", "started")
    assert(!states.is("clean"))
    assert(states.is("dirty"))
    assert(states.is("invalid"))
    assert(!states.is("valid"))

    states.set("push", "ended")
    assert(!states.is("clean"))
    assert(states.is("dirty"))
    assert(states.is("invalid"))
    assert(!states.is("valid"))
  })

  it("basic action test",function(){
    states.start("push")
    assert.equal( states.is("pushing"), true )
    assert.equal( states.is("pushed"), false )
    
    states.end("push")
    assert.equal( states.is("pushed"), true )
    assert.equal( states.is("pushing"), false )
    
    assert.throws(
      function() {
        states.reset("fetch")
      },
      function(e) {
        return e.message === "there is no state for action fetch"
      }
    );
    
    states.reset("pull");
    assert(states.is("unpulled"))
  })

  it("basic naive state test", function(){
    states.activate("valid")
    assert.equal( states.is("valid"), true )
    states.deactivate("valid")
    assert.equal( states.is("invalid"), true )
    
    states.activate("clean")
    assert.equal( states.is("clean"), true )
    states.deactivate("clean")
    assert.equal( states.is("dirty"), true )
    
    assert.throws(
      function() {
        states.activate("fetch")
      },
      function(e) {
        return e.message === "there is no naive state fetch"
      }
    );
    
    assert.throws(
      function() {
        states.deactivate("fetch")
      },
      function(e) {
        return e.message === "there is no naive state fetch"
      }
    );

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