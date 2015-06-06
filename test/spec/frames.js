var Frames = require("../../src/frames")
var assert = require("assert")


describe("initialize with empty options", function (){
  var frames = new Frames()
  it("options.frameLimit should equal to 5", function(){
    assert.equal(frames.options.frameLimit, 5)
  })
  it("new object's length should equal to 0", function(){
    assert.equal(frames.length, 0)
  })
})

describe("initialize with options", function(){
  var frames = new Frames({frameLimit: 1})

  it("options.frameLimit should equal to 1", function(){
    assert.equal(frames.options.frameLimit, 1)
  })

  it("get and set test", function(){
    frames.set("name", "lily")
    assert.equal(frames.get("name"), "lily")
    frames.set("id", "95527")
    assert.equal(frames.get("id"), "95527")
    frames.set({"age": 27, "country": "uk"})
    assert.equal(frames.get("age"), 27)
    assert.equal(frames.get("country"), "uk")

    frames.set({"features": {lobby: "soccer", education: "doctor"}})
    assert.equal(frames.get("features.lobby"), "soccer")
    assert.equal(frames.get("features.education"), "doctor")
  })

  it("frame has limit", function() {
    frames.commit()
    frames.commit()
    assert.equal(frames.length, 1)
  })

  

  
})