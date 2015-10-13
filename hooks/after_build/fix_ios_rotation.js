#! /usr/local/bin/node

// Set support for all orienations in iOS .plist - workaround for this cordova bug: https://issues.apache.org/jira/browse/CB-8953
var platforms = process.env.CORDOVA_PLATFORMS.split(',');
platforms.forEach(function(p) {
    if (p == "ios") {
        console.log("Updating iOS plist");
        var fs = require('fs'),
            plist = require('plist'),
            xmlParser = new require('xml2js').Parser(),
            plistPath = '',
            configPath = 'config.xml';
        // Construct plist path.
        if (fs.existsSync(configPath)) {
            var configContent = fs.readFileSync(configPath);
            // Callback is synchronous.
            xmlParser.parseString(configContent, function (err, result) {
                var name = result.widget.name;
                plistPath = 'platforms/ios/' + name + '/' + name + '-Info.plist';
            });
        }
        // Change plist and write.
        if (fs.existsSync(plistPath)) {
            var pl = plist.parseFileSync(plistPath);
            configure(pl);
            
            console.log("plist is updated! " + plistPath);

            fs.writeFileSync(plistPath, plist.build(pl).toString());

            console.log("plist saved!");
        }
        else
            console.log("plist does not exist: " + plistPath);

        process.exit();
    }
});
function configure(plist) {
    var iPhoneOrientations = [
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
        'UIInterfaceOrientationPortrait'
    ];
    var iPadOrientations = [
            'UIInterfaceOrientationLandscapeLeft',
            'UIInterfaceOrientationLandscapeRight',
            'UIInterfaceOrientationPortrait',
            'UIInterfaceOrientationPortraitUpsideDown'
    ];
    plist["UISupportedInterfaceOrientations"] = iPhoneOrientations;
    plist["UISupportedInterfaceOrientations~ipad"] = iPadOrientations;
}