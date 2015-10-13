cordova.define("org.apache.cordova.core.file.FileWriter",function(e,t,n){var r=e("cordova/exec"),i=e("./FileError"),s=e("./ProgressEvent"),o=function(e){this.fileName="";this.length=0;if(e){this.fileName=e.fullPath||e;this.length=e.size||0}this.position=0;this.readyState=0;this.result=null;this.error=null;this.onwritestart=null;this.onprogress=null;this.onwrite=null;this.onwriteend=null;this.onabort=null;this.onerror=null};o.INIT=0;o.WRITING=1;o.DONE=2;o.prototype.abort=function(){if(this.readyState===o.DONE||this.readyState===o.INIT)throw new i(i.INVALID_STATE_ERR);this.error=new i(i.ABORT_ERR);this.readyState=o.DONE;typeof this.onabort=="function"&&this.onabort(new s("abort",{target:this}));typeof this.onwriteend=="function"&&this.onwriteend(new s("writeend",{target:this}))};o.prototype.write=function(e){var t=this,n=typeof window.Blob!="undefined"&&typeof window.ArrayBuffer!="undefined",u;if(e instanceof File||n&&e instanceof Blob){var a=new FileReader;a.onload=function(){o.prototype.write.call(t,this.result)};n?a.readAsArrayBuffer(e):a.readAsText(e);return}u=n&&e instanceof ArrayBuffer;if(this.readyState===o.WRITING)throw new i(i.INVALID_STATE_ERR);this.readyState=o.WRITING;var f=this;typeof f.onwritestart=="function"&&f.onwritestart(new s("writestart",{target:f}));r(function(e){if(f.readyState===o.DONE)return;f.position+=e;f.length=f.position;f.readyState=o.DONE;typeof f.onwrite=="function"&&f.onwrite(new s("write",{target:f}));typeof f.onwriteend=="function"&&f.onwriteend(new s("writeend",{target:f}))},function(e){if(f.readyState===o.DONE)return;f.readyState=o.DONE;f.error=new i(e);typeof f.onerror=="function"&&f.onerror(new s("error",{target:f}));typeof f.onwriteend=="function"&&f.onwriteend(new s("writeend",{target:f}))},"File","write",[this.fileName,e,this.position,u])};o.prototype.seek=function(e){if(this.readyState===o.WRITING)throw new i(i.INVALID_STATE_ERR);if(!e&&e!==0)return;e<0?this.position=Math.max(e+this.length,0):e>this.length?this.position=this.length:this.position=e};o.prototype.truncate=function(e){if(this.readyState===o.WRITING)throw new i(i.INVALID_STATE_ERR);this.readyState=o.WRITING;var t=this;typeof t.onwritestart=="function"&&t.onwritestart(new s("writestart",{target:this}));r(function(e){if(t.readyState===o.DONE)return;t.readyState=o.DONE;t.length=e;t.position=Math.min(t.position,e);typeof t.onwrite=="function"&&t.onwrite(new s("write",{target:t}));typeof t.onwriteend=="function"&&t.onwriteend(new s("writeend",{target:t}))},function(e){if(t.readyState===o.DONE)return;t.readyState=o.DONE;t.error=new i(e);typeof t.onerror=="function"&&t.onerror(new s("error",{target:t}));typeof t.onwriteend=="function"&&t.onwriteend(new s("writeend",{target:t}))},"File","truncate",[this.fileName,e])};n.exports=o});