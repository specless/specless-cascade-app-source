define(['exports'], function (exports) {
	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});
	var jetpack = require('fs-jetpack');

	var utils = {
		handleMessage: function handleMessage(message, code, details) {
			var obj = {
				message: message,
				code: code,
				details: details
			};
			global.app.message.emit('new', obj);
			// if (code === 0) {
			// 	console.log('%c' + message, 'color: #b3b3b3;');
			// }
		},
		logStream: function logStream(stream) {
			stream.stdout.setEncoding('utf8');
			stream.stdout.on('data', function (data) {
				var str = data.toString(),
				    lines = str.split(/(\r?\n)/g);
				for (var i = 0; i < lines.length; i++) {
					utils.handleMessage(str, 0);
				}
			});
			stream.stderr.on('data', function (data) {
				var str = data.toString(),
				    lines = str.split(/(\r?\n)/g);
				for (var i = 0; i < lines.length; i++) {
					utils.handleMessage(str, 0);
				}
			});
		}
	};
	exports.utils = utils;
});
//# sourceMappingURL=utils.js.map
