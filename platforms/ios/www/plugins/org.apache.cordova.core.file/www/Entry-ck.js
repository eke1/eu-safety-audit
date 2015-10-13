cordova.define("org.apache.cordova.core.file.Entry",function(e,t,n){function u(e,t,n,r,i){this.isFile=!!e;this.isDirectory=!!t;this.name=n||"";this.fullPath=r||"";this.filesystem=i||null}var r=e("cordova/argscheck"),i=e("cordova/exec"),s=e("./FileError"),o=e("./Metadata");u.prototype.getMetadata=function(e,t){r.checkArgs("FF","Entry.getMetadata",arguments);var n=e&&function(t){var n=new o(t);e(n)},u=t&&function(e){t(new s(e))};i(n,u,"File","getMetadata",[this.fullPath])};u.prototype.setMetadata=function(e,t,n){r.checkArgs("FFO","Entry.setMetadata",arguments);i(e,t,"File","setMetadata",[this.fullPath,n])};u.prototype.moveTo=function(t,n,o,u){r.checkArgs("oSFF","Entry.moveTo",arguments);var a=u&&function(e){u(new s(e))},f=this.fullPath,l=n||this.name,c=function(t){if(t){if(o){var n=t.isDirectory?new(e("./DirectoryEntry"))(t.name,t.fullPath):new(e("org.apache.cordova.core.file.FileEntry"))(t.name,t.fullPath);o(n)}}else a&&a(s.NOT_FOUND_ERR)};i(c,a,"File","moveTo",[f,t.fullPath,l])};u.prototype.copyTo=function(t,n,o,u){r.checkArgs("oSFF","Entry.copyTo",arguments);var a=u&&function(e){u(new s(e))},f=this.fullPath,l=n||this.name,c=function(t){if(t){if(o){var n=t.isDirectory?new(e("./DirectoryEntry"))(t.name,t.fullPath):new(e("org.apache.cordova.core.file.FileEntry"))(t.name,t.fullPath);o(n)}}else a&&a(s.NOT_FOUND_ERR)};i(c,a,"File","copyTo",[f,t.fullPath,l])};u.prototype.toURL=function(){return this.fullPath};u.prototype.toURI=function(e){console.log("DEPRECATED: Update your code to use 'toURL'");return this.toURL()};u.prototype.remove=function(e,t){r.checkArgs("FF","Entry.remove",arguments);var n=t&&function(e){t(new s(e))};i(e,n,"File","remove",[this.fullPath])};u.prototype.getParent=function(t,n){r.checkArgs("FF","Entry.getParent",arguments);var o=t&&function(n){var r=e("./DirectoryEntry"),i=new r(n.name,n.fullPath);t(i)},u=n&&function(e){n(new s(e))};i(o,u,"File","getParent",[this.fullPath])};n.exports=u});