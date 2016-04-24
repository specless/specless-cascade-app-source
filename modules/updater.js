define(["exports"], function (exports) {
    "use strict";

    var UPDATER = (function (my) {
        var gui = require('nw.gui');
        var win = gui.Window.get();

        var fs = require("fs");
        var path = require("path");
        var request = require("request");
        var zlib = require("zlib");
        var tar = require("tar");
        var archiver = require('archiver');

        // to determine where our package.nw lies we need a bit of trickery (for OSX at least)
        var findlocal = function findlocal() {
            if (process.platform != "darwin") return path.dirname(process.execPath);else return process.execPath.substr(0, process.execPath.indexOf("node-webkit.app")); // I'm open to better ways of doing that
        };

        var exepath = findlocal();

        my.check_for_update = function (author, repo, success, failure) {

            // we need the author and repo for github
            if (author && repo) {

                // we check what our local version is (defaulting to something which will ALWAYS update)
                var local_version = localStorage.UPDATERversion || "0.00";

                // we now get the GitHub 'latest releases' page to check if it differs to local_version
                request({
                    uri: "http://github.com/" + author + "/" + repo + "/releases/latest",
                    headers: {
                        'Content-Type': 'text/html'
                    }
                }, function (err, response, body) {
                    if (!err && response.statusCode == 200) {

                        // scrape the latest release-tag from that page
                        var latest = body.match(new RegExp("\/" + author + "\/" + repo + "\/tree\/([0-9\.]+)"));

                        // assuming we found one
                        if (latest && latest.length && latest[1] != local_version) if (success) success(latest[1]);else if (failure) failure();
                    } else {
                        console.log("UPDATER error: cannot access GitHub or author/repo not found");
                    }
                });
            } else console.log("UPDATER error: requires author and repo");
        };

        my.update = function (author, repo, cb) {

            // get the latest_version
            my.check_for_update(author, repo, function (latest_version) {

                // if it's an update - we update!
                if (latest_version) {

                    // create an output stream to overwrite the existing package.nw
                    var output = fs.createWriteStream(path.join(exepath, "package.nw")).on('close', function () {

                        // zip now safely written - restart the client
                        my.restart();
                    }).on('error', function (err) {

                        // we failed to write package.nw - what to do?

                    });

                    // setup archiver to write a zip
                    var archive = archiver('zip');
                    archive.pipe(output);

                    // download the source.tar.gz, unpack, strip header and repack as zip
                    req = request("http://github.com/" + author + "/" + repo + "/archive/" + latest_version + ".tar.gz").pipe(zlib.createGunzip()).pipe(tar.Parse()).on("entry", function (e) {

                        // for each file unpacked
                        if (e.type == 'File') {

                            // create a buffer and an offset
                            var b = new Buffer(e["_header"].size);
                            var boff = 0;

                            e.on("data", function (d) {

                                // for each block of data - copy it into the buffer and move the offset
                                d.copy(b, boff);
                                boff += d.length;
                            }).on("end", function () {

                                // all data received - send the file to archiver with the 'header' directory name removed
                                archive.append(b, { name: e.path.replace(repo + "-" + latest_version + '/', '') });
                            });
                        }
                    }).on("end", function () {

                        // store the version we've received
                        localStorage.UPDATERversion = latest_version;

                        // all done - close archiver
                        archive.finalize();
                    });
                }
            });
        };

        my.restart = function () {
            // determine path to executable - it's different on OSX
            var getexecutable = function getexecutable() {
                if (process.platform == "darwin") return path.join(process.cwd(), "node-webkit.app", "Contents", "MacOS", "node-webkit");else return process.execPath;
            };

            // spawn a new child of ourself
            var child_process = require("child_process");
            var child = child_process.spawn(getexecutable(), [], { detached: true });

            // orphan it
            child.unref();

            // quit
            win.close();
        };

        return my;
    })(UPDATER || {});
});
//# sourceMappingURL=updater.js.map
