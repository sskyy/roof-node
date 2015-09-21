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


describe("state event test", function(){

  it("state change should fire event", function(done){
    var miya = new User
    var setFired = false
    var changeFired = false
    async.parallel([
      function( cb ){
        miya.on("set", function( val, oldVal){
          setFired = true
          assert.equal( val, 'set')
          assert.equal( oldVal, 'unset')
          cb()
        })
      },
      function( cb ){
        miya.on('change', function(){
          if( !changeFired){
            changeFired = true
            cb()
          }
        })
      }
    ], function(err){
      assert.equal( setFired, true)
      assert.equal( changeFired, true)
      done(err)
    });

    miya.set("name","miya")
  })

  it("action change should fire event", function(done){
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
    jane.once("set", function(){
      fired ++
    })
    jane.set("name","jane")
    jane.set("name","jone")

    assert.equal( fired, 1)
  })

})