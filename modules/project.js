define(['exports', './utils'], function (exports, _utils) {
	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});
	var spawn = require('child_process').spawn;
	var Q = require('q');
	var jetpack = require('fs-jetpack');
	var open = require("open");
	var EventEmitter = require('events');
	var util = require('util');

	var Project = function Project(path, cb, name) {

		var self = this;
		var app = global.app;

		self.path = path;

		self.get = function (type, callback) {
			var settingsFile = self.path + '/' + app.cascade.get('settingsFileName');
			var settings = jetpack.read(settingsFile, 'json');
			self.emit('get');
			if (type === 'settings') {
				if (callback) {
					callback(settings);
				}
				self.emit('get:settings');
				return settings;
			} else if (type === undefined) {
				if (callback) {
					callback(self);
				}
				self.emit('get:self');
				return self;
			} else {
				if (callback) {
					callback(settings[type]);
				}
				self.emit('get:' + type);
				return settings[type];
			}
		};

		self.set = function (key, value, callback) {
			var settingsFile = self.path + '/' + app.cascade.get('settingsFileName');
			var settings = jetpack.read(settingsFile, 'json');
			settings[key] = value;
			jetpack.write(settingsFile, settings);
			if (callback) {
				callback(settings[key]);
			}
			self.emit('set');
			self.emit('set:' + key);
			return settings[key];
		};

		self.preview = function (target) {
			if (target === undefined) {
				open("http://localhost:" + app.get('serverPort') + "/");
			} else {
				open("http://localhost:" + app.get('serverPort') + "/", target);
			}
		};

		self.viewIn = function (target) {
			if (target === undefined) {
				open(app.project.get('path'), 'finder');
			} else {
				open(app.project.get('path'), target);
			}
		};

		self.publish = function (callback) {
			self.emit('publishStart');
			app.cascade._run('publish', function (success) {
				if (success === true) {
					if (callback) {
						callback(success);
					}
					self.emit('publish');
					self.emit('publishEnd');
					open(app.project.get('path'), 'finder');
				} else if (success === false) {
					if (callback) {
						callback(success);
					}
					self.emit('publishEnd');
					self.emit('publish:fail');
				}
			});
		};

		self._init = function (callback) {
			if (name) {
				_utils.utils.handleMessage("Creating new project at '" + path + "'.", 0);
				app.cascade.create(path, name, function (success) {
					if (success === false) {
						_utils.utils.handleMessage("Failed to create project.", 0);
						if (callback) {
							callback(false);
						}
						self.emit('init:fail');
						return false;
					} else {
						self.path = path + '/' + name;
						_utils.utils.handleMessage("Project created.", 0);
						app.cascade.start(self.path, function (status) {
							if (status === 'started') {
								if (callback) {
									callback(true);
								}
								self.emit('init');
								return true;
							}
						});
					}
				});
			} else {
				_utils.utils.handleMessage("Opening existing project at '" + self.path + "'.", 0);
				app.cascade.start(self.path, function (status) {
					if (status === 'started') {
						if (callback) {
							callback(true);
						}
						self.emit('init');
						return true;
					}
				});
			}
		};
		self._init(cb);
	};

	exports.Project = Project;
	util.inherits(Project, EventEmitter);
});
//# sourceMappingURL=project.js.map
