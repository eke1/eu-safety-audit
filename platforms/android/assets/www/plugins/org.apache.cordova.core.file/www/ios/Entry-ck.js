cordova.define("org.apache.cordova.core.file.Entry1",function(e,t,n){n.exports={toURL:function(){return"file://localhost"+this.fullPath},toURI:function(){console.log("DEPRECATED: Update your code to use 'toURL'");return"file://localhost"+this.fullPath}}});