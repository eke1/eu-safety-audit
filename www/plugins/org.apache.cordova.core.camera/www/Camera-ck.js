cordova.define("org.apache.cordova.core.camera.camera",function(e,t,n){var r=e("cordova/argscheck"),i=e("cordova/exec"),s=e("./Camera"),o=e("./CameraPopoverHandle"),u={};for(var a in s)u[a]=s[a];u.getPicture=function(e,t,n){r.checkArgs("fFO","Camera.getPicture",arguments);n=n||{};var u=r.getValue,a=u(n.quality,50),f=u(n.destinationType,s.DestinationType.FILE_URI),l=u(n.sourceType,s.PictureSourceType.CAMERA),c=u(n.targetWidth,-1),h=u(n.targetHeight,-1),p=u(n.encodingType,s.EncodingType.JPEG),d=u(n.mediaType,s.MediaType.PICTURE),v=!!n.allowEdit,m=!!n.correctOrientation,g=!!n.saveToPhotoAlbum,y=u(n.popoverOptions,null),b=u(n.cameraDirection,s.Direction.BACK),w=[a,f,l,c,h,p,d,v,m,g,y,b];i(e,t,"Camera","takePicture",w);return new o};u.cleanup=function(e,t){i(e,t,"Camera","cleanup",[])};n.exports=u});