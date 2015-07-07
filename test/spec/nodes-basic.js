
var assert = require("assert")
var _ = require("lodash")
var Node = require("../../src/node")
var Nodes = require("../../src/nodes")
var async = require("async")


var User = Node.createClass()
var Users= Nodes.createClass( User )


describe('basic create and insert', function(){

  var data = [{
    name : 'lufy',
    age : 16
  },{
    name : 'zoro',
    age : 21
  }]

  function assertion( users ){
    assert.equal( users.length, 2)
    assert.equal( users.get(0) instanceof User,  true )
    data.forEach(function(v,k){
      assert.equal( users.get(k).get('name'),  v.name )
    })
  }

  it('use constructor', function(){
    var users = new Users(data)
    assertion( users )
  })

  it('use fill', function(){
    var users = new Users()
    users.fill( data )
    assertion( users )
  })

  it('use insert', function(){
    var users = new Users()
    data.forEach(function( item){
      users.insert( item )
    })
    assertion( users )
  })
})



describe("remove item test", function(){

  var data = [{name:"jason"},{name:"tommy"},{name:'nami'}]
  var List = Nodes.createClass()

  function assertion(list, removedIndex){
    var left =  _.clone(data)
    _.pullAt(left, removedIndex)

    assert.equal( list.length, data.length - 1 )
    left.forEach(function( v, k){
      assert.equal( list.get(k).get('name'),  v.name )
    })
  }

  it('remove by ref', function(){
    var list = new List(data)
    var jason = list.findOne({name: data[0].name})
    list.remove( jason )
    assertion( list, 0)
  })

  it('remove by condition', function(){
    var list = new List(data)
    list.remove( {name: data[1].name} )
    assertion( list, 1)
  })

  it("destroy should remove item", function(){
    var list = new List(data)
    var jason = list.findOne({name: data[0].name})
    jason.destroy()
    assertion( list, 0)
  })
})



describe("prototype test", function(){
  it("instance of should work", function(){
    var users = new Users
    var Users2 = Nodes.createClass(User)
    var users2 = new Users2
    assert.equal( users instanceof  Users, true)
    assert.equal( users2 instanceof  Users2, true)
    assert.equal( users instanceof  Users2, false)
    assert.equal( users2 instanceof  Users, false)
  })
  it("old api should work too", function(){
    var users = new Users
    assert.equal( Nodes.isNodesInstance(users) ,true)
    assert.equal( Nodes.isNodesClass(Users) ,true)
  })
})


describe('array like api test', function(){
  it('insert can specify index', function(){
    var users = new Users
    var data = [{
      name : 'lufy',
      age : 16
    },{
      name : 'zoro',
      age : 21
    }]
    data.forEach(function( item){
      users.insert( item )
    })

    var nami = {name:'nami', age:22}
    users.insert(nami, 0)
    var newData = [nami].concat( data )
    newData.forEach(function( user,i ){
      assert.equal( user.name, users.get(i).get('name'))
      assert.equal( user.age, users.get(i).get('age'))
    })
  })
})