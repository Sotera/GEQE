var querystring = require('querystring');
var http = require('http');

exports.performAjaxRequest = function (hostname, port, path, method, data, success, error) {
	var dataString = null;
	var headers = {};

	if (data) {
		if (method == 'GET') {
			path += '?' + querystring.stringify(data);
		}
		else {
			dataString = JSON.stringify(data);
			headers = {
				'Content-Type': 'application/json',
				'Content-Length': dataString.length
			};
		}
	} 

	var options = {
		hostname: hostname,
		port: port,
		path: path,
		method: method,
		headers: headers
	};

	var req = http.request(options, function (res) {
		res.setEncoding('utf-8');

		var responseString = '';

		res.on('data', function (data) {
			responseString += data;
		});

		res.on('end', function () {
			//console.log(responseString);
			var responseObject = null;
			try{
				responseObject = JSON.parse(responseString);
			}catch(e){
				responseObject = responseString;
				console.log(responseString);
			}
			success(responseObject);
		});
	});

	if(dataString){
		req.write(dataString);
	}

	req.on('error', function(e) {
		if(error)
			error(e);
	});

	req.end();
};

exports.getHostname = function (cb) {
	var interfaces = require('os').networkInterfaces();
	for (var k in interfaces) {
		for (var k2 in interfaces[k]) {
			var address = interfaces[k][k2];
			if (address.family == 'IPv4' && !address.internal) {
				require('dns').reverse(address.address, function (err, domains) {
					if (domains) {
						cb(domains[0]);
					}
				});
			}
		}
	}
};

exports.getCookies = function (req) {
	var cookies = {};
	req.headers.cookie && req.headers.cookie.split(';').forEach(function (cookie) {
		var parts = cookie.split('=');
		cookies[parts[0].trim()] = (parts[1] || '').trim();
	});
	return cookies;
};

exports.setCookies = function (res, cookies) {
	//Example only, this won't work right !!
	res.writeHead(200, {
		'Set-Cookie': 'mycookie=test'
	});
};

//JReeme sez: I lifted this from the http-proxy NPM and modified it a taste so I could get the complete
//POST buffer before making the proxyRequest.
//
// ### function buffer (obj)
// #### @obj {Object} Object to pause events from
// Buffer `data` and `end` events from the given `obj`.
// Consumers of HttpProxy performing async tasks
// __must__ utilize this utility, to re-emit data once
// the async operation has completed, otherwise these
// __events will be lost.__
//
//      var buffer = httpProxy.buffer(req);
//      fs.readFile(path, function(){
//         httpProxy.proxyRequest(req, res, host, port, buffer);
//      });
//
// __Attribution:__ This approach is based heavily on
// [Connect](https://github.com/senchalabs/connect/blob/master/lib/utils.js#L157).
// However, this is not a big leap from the implementation in node-http-proxy < 0.4.0.
// This simply chooses to manage the scope of the events on a new Object literal as opposed to
// [on the HttpProxy instance](https://github.com/nodejitsu/node-http-proxy/blob/v0.3.1/lib/node-http-proxy.js#L154).
//
exports.getPostBuffer = function (req, bufferLoadedCB) {
	var events = [],
			utf8Data = '',
			onData,
			onEnd;

	req.on('data', onData = function (data, encoding) {
		events.push(['data', data, encoding]);
		utf8Data += data.toString('utf8');
	});

	req.on('end', onEnd = function (data, encoding) {
		events.push(['end', data, encoding]);
		//I've never seen 'data' be defined here but it was in the code I lifted so I'm keeping it
		if (data) utf8Data += data.toString('utf8');
		bufferLoadedCB({
			utf8Data: utf8Data,
			end: function () {
				req.removeListener('data', onData);
				req.removeListener('end', onEnd);
			},
			destroy: function () {
				this.end();
				this.resume = function () {
					Ext.log({level: 'warn'}, 'Cannot resume buffer after destroying it.');
				};
				onData = onEnd = events = req = null;
			},
			resume: function () {
				this.end();
				for (var i = 0, len = events.length; i < len; ++i) {
					req.emit.apply(req, events[i]);
				}
			}
		});
	});
};
