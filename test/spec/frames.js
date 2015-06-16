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

    //test with negative value
    frames.set({age:0})
    assert.equal(frames.get("age"), 0)


    frames.set({"features": {lobby: "soccer", education: "doctor"}})
    // deep clone
    assert.notEqual(frames.get("features"), {lobby: "soccer", education: "doctor"})
    assert.equal(frames.get("features.lobby"), "soccer")
    assert.equal(frames.get("features.education"), "doctor")

    frames.set("features.lobby", "football")
    assert.equal(frames.get("features.lobby"), "football")
  })

  it("frame has limit", function() {
    frames.commit()
    frames.commit()
    assert.equal(frames.length, 1)
  })

  it("set method use replace mechanism as default", function(){
    var frames = new Frames()
    var musics = ['a','b','c']
    var newMusics = ['d','e','f','g']

    frames.set("jhon",{
      like : {
        music : musics,
        movie : {
          "goneWithWind" : 5,
          "Xman" : 6
        }
      }
    })

    assert.equal(frames.get("jhon.like.music").length, musics.length)
    frames.set("jhon.like.music",newMusics)
    assert.equal(frames.get("jhon.like.music").length, newMusics.length)
    assert.equal(frames.get("jhon.like.music")[0], newMusics[0])

    //保存的是对象引用
    assert.equal(frames.get("jhon.like.music")===newMusics,true)

  })


  it("merge method use merge mechanism ", function(){
    var frames = new Frames()
    var movies = {
      "goneWithWind" : 5,
      "Xman" : 6
    }
    var newMovies = {
      "nancy" :1
    }

    frames.set("jhon",{
      like : {
        movie : movies
      }
    })


    frames.merge("jhon.like.movie",newMovies)

    assert.equal(frames.get("jhon.like.movie").nancy, newMovies.nancy)
    assert.equal(frames.get("jhon.like.movie").goneWithWind, movies.goneWithWind)
    assert.equal(frames.get("jhon.like.movie").Xman, movies.Xman)

    //merge的不是原来的对象引用
    assert.equal(frames.get("jhon.like.movie")===movies,false)

    frames.set("jhon.like.movie",newMovies)
    assert.equal(frames.get("jhon.like.movie").nancy, newMovies.nancy)
    assert.equal(frames.get("jhon.like.movie").goneWithWind,undefined)
    assert.equal(frames.get("jhon.like.movie").Xman, undefined)




  })




  

  
})