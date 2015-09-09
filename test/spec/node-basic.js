var assert = require("assert")
var _ = require("lodash")
var Node = require("../../lib/node")
var async = require("async")

var User = Node.createClass( {})

describe('data set and get test', function() {
  var props
  var snow
  beforeEach(function () {
    props = {name: 'Snow', age: 22}
    snow = new User(props)
  })

  describe('create new User', function () {
    it('constructor should set data', function () {
      _.forEach(props, function (v, k) {
        assert.equal(snow.get(k), props[k])
      })
    })
  })

  describe('use set', function () {
    it('naive set', function () {
      snow.set('family', 'Stark')
      assert.equal(snow.get('family'), 'Stark')
    })

    it('deep set', function () {
      snow.set('friends.best', 'Sam')
      assert.equal(snow.get('friends.best'), 'Sam')
      assert.equal(snow.get('friends').best, 'Sam')
    })

    it('change original', function () {
      snow.set('age', 23)
      assert.equal(snow.get('age'), 23)
    })

    it('batch set', function(){
      var batchData = {
        'favorite.music' : 'Winter is comming',
        'favorite.girl' : 'Igere'
      }
      snow.set(batchData)
      _.forEach( batchData, function(v, k){
        assert.equal( snow.get(k), batchData[k])
      })
    })

    it('set reference', function(){
      var father = {name:'Edd', age:44}
      snow.set('father', father)
      assert.equal( snow.get('father'), father)
    })

    it('merge', function(){
      snow.set('friends.best', 'Sam')
      snow.merge('friends',  {normal:'Ted'})
      assert.equal( snow.get('friends.normal'), 'Ted')
    })
  })
})

describe("prototype test", function(){
  var maya = new User
  var User2 = Node.createClass({})
  var jesper = new User2
  var Fake = function(){}

  it("instanceof should work", function(){
    assert.equal( maya instanceof  User, true)
    assert.equal( jesper instanceof  User2, true)
    assert.equal( jesper instanceof  User, false)
  })

  it("work with old api", function(){
    assert.equal(Node.isNodeInstance(maya), true)
    assert.equal(Node.isNodeInstance(jesper), true)
    assert.equal(Node.isNodeClass(User), true)
    assert.equal(Node.isNodeClass(Fake), false)
  })
})

