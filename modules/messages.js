define(['exports'], function (exports) {
	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});
	var EventEmitter = require('events');
	var util = require('util');

	var Messages = function Messages() {

		var self = this;
		var app = global.app;

		self.codes = {
			0: {
				title: "Gulp Console",
				handle: function handle(message, details) {
					console.log('%c[Gulp] ' + message, 'color: #b3b3b3;');
				}
			},
			1: {
				title: "Cascade Compiler Commands",
				handle: function handle(message, details) {
					console.log('%c[Cascade Compiler] ' + message, 'color: #7C8691;');
				}
			},
			2: {
				title: "Cascade Compiler General Messages",
				handle: function handle(message, details) {
					console.log('%c[Cascade Compiler] ' + message, 'color: #00C0D8;');
				}
			},
			3: {
				title: "Cascade Compiler General Errors",
				handle: function handle(message, details) {
					console.log('%c[Cascade Compiler] ' + message, 'color: #F7425A;');
				}
			},
			4: {
				title: "Cascade Compile Success",
				handle: function handle(message, details) {
					console.log('%c[Cascade Compiler] ' + message, 'color: #00C0D8;');
					app.ui.notify("Compile Success", message, 'success');
				}
			},
			5: {
				title: "Cascade Compile Failure",
				handle: function handle(message, details) {
					console.log('%c[Cascade Compiler] ' + message, 'color: #F7425A;');
					app.ui.notify("Compile Failed", message, 'failure');
				}
			}
		};

		self.on('new', function (data) {
			self.codes[data.code].handle(data.message, data.details);
		});
	};

	exports.Messages = Messages;
	util.inherits(Messages, EventEmitter);
});
//# sourceMappingURL=messages.js.map
