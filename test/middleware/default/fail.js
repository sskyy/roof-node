function fail(){
    return new Promise(function(resolve, reject){
        setTimeout(function(){
            reject("something wrong")
        }, 100)
    })
}

module.exports = {
    push :{
        fn : fail
    },
    pull :{
        fn : fail
    }
}
