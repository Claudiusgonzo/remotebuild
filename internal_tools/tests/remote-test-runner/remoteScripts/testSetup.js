var child_process = require("child_process");
var http = require("http");
var path = require("path");
var Q = require("q");
var querystring = require("querystring");

// Constants
var HOST_IP = "dans-mac-mini";
var HOST_PORT = "53541";
var REMOTEBUILD_PORT = "3000";

// Main promise chain
Q({})
	.then(function () {
		// Start remotebuild with the test agent on this VM
		// Note: This assumes remotebuild and taco-test-agent are installed in the same folder as this script
		var deferred = Q.defer();
		var command = path.join(__dirname, "node_modules", ".bin", "remotebuild");
		var args = [
			"--secure=false",
			"--port=" + REMOTEBUILD_PORT,
			"--config",
			path.join(__dirname, "node_modules", "taco-test-agent", "testAgentConfig.conf")
		];
		var options = {
			stdio: "inherit",
		};
		var cp = child_process.spawn(command, args, options);
		
		cp.on("error", function (err) {
			deferred.reject(err);
		});
		
		cp.on("exit", function (code) {
			if (code) {
				deferred.reject(new Error("remotebuild exited with code: " + code));
			}
		});
		
		// Give remotebuild time to fail (in case of port in use, etc)
		setTimeout(function () { deferred.resolve() }, 3000);
		
		return deferred.promise;
	})
	.then(function (ipAddr) {
		// Contact host test server to let it know we are listening, and give Remotebuild's port
	    var qs = querystring.stringify({ port: REMOTEBUILD_PORT });
		var urlPath = "/listening?" + qs;
		
		sendRequest(urlPath);
	})
	.catch(function (err) {
		sendError(err);
	})
	.done();

function sendError(err) {
	var qs = querystring.stringify({ error: encodeURIComponent(err.toString()) });
	var urlPath = "/error?" + qs;
	
	console.log(err.toString());
	sendRequest(urlPath);
}

function sendRequest(urlPath, callback) {
	var options = {
		host: HOST_IP,
		port: HOST_PORT,
		path: urlPath
	};
	var req = !!callback ? http.request(options, callback) : http.request(options); 
	
	req.end();
}
