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
  frames.set("name", "lily")
  it("options.frameLimit should equal to 1", function(){
    assert.equal(frames.options.frameLimit, 1)
  })
  it("get and set test", function(){
    assert.equal(frames.get("name"), "lily")
  })
})