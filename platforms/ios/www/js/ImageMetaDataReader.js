var ExifReader = {
    getExifData: function(filepath, success, fail) {
        // alert("Calling cordova exif reader getExifData" + filepath);
        return Cordova.exec(success, 
                            fail,
                            "ExifReader",
                            "getExifData",
                            [filepath,"{Exif}"]);
    },
    getTiffData: function(filepath, success, fail) {
        return Cordova.exec(success,
                            fail,
                            "ExifReader",
                            "getTiffData",
                            [filepath, "{Tiff}"]);
    }
};
