var assert = require("assert")
var _ = require("lodash")
var Node = require("../../lib/node")
var async = require("async")

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
    var errorHappend = false
    try{
      Node.createClass({
        set : function( name ){
          this.set("name", name)
        },
        get : function(){
          return this.get("familyName") + this.get("name")
        }
      })
      assert.equal('should not working',true)
    }catch(e){
      errorHappend= true
    }
    assert.equal(errorHappend, true)
  })


  it("destroyed item will lock methods", function(){
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

