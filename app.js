define(['exports', './modules/cascade', './modules/messages', './modules/project', './modules/ui'], function (exports, _modulesCascade, _modulesMessages, _modulesProject, _modulesUi) {
	'use strict';

	var jetpack = require('fs-jetpack');
	var gui = require('nw.gui');
	var fs = require('fs');
	var EventEmitter = require('events');
	var util = require('util');
	global.$ = $;

	var win = gui.Window.get();
	global.win = win;
	win.setVisibleOnAllWorkspaces(true);
	win.setAlwaysOnTop(true);
	var tray = new gui.Tray({ title: "cscd" });
	var showing = false;
	tray.on('click', function (event) {
		win.moveTo(event.x + 14 - win.width / 2, event.y);
		if (showing === false) {
			win.show();
			win.focus();
			showing = true;
		} else {
			win.hide();
			showing = false;
		}
	});

	var App = function App(settings) {

		var self = this;
		global.app = self;

		self.emit('start');

		self.path = settings.appPath;

		var gulpPath;
		var cascade;

		self.open = function (path, callback, first) {
			self.project = new _modulesProject.Project(path, function (success) {
				var defaultProjectDir = gulpPath + cascade.defaultProjectDir;
				if (success === false && first === true) {
					self.project = new _modulesProject.Project(defaultProjectDir, function (success) {
						if (callback) {
							callback(success);
						}
						if (success === true) {
							self.emit('open:default');
						} else if (success === false) {
							self.emit('open:fail');
						}
					});
				} else {
					if (callback) {
						callback(success);
					}
					if (success === true) {
						self.emit('open');
					} else if (success === false) {
						self.emit('open:fail');
					}
				}
			});
		};

		self.close = function (callback) {
			var cascade = self.cascade.get('settings');
			self.cascade.stop(function () {
				self.project = self.open(gulpPath + cascade.defaultProjectDir, function (success) {
					if (callback) {
						callback(success);
					}
					if (success === true) {
						self.emit('close');
					} else if (success === false) {
						self.emit('close:fail');
					}
				});
			});
		};

		self['new'] = function (path, name, callback) {
			self.project = new _modulesProject.Project(path, function (success) {
				if (callback) {
					callback(success);
				}
				if (success === true) {
					self.emit('new');
				} else if (success === false) {
					self.emit('new:fail');
				}
			}, name);
		};

		self.get = function (type, callback) {
			self.emit('get');
			if (type === 'project') {
				if (callback) {
					callback(self.project);
				}
				self.emit('get:project');
				return self.project;
			} else if (type === 'settings') {
				self.emit('get:settings');
				if (callback) {
					callback(settings);
				}
				return settings;
			} else if (type === 'cascade') {
				self.emit('get:cascade');
				if (callback) {
					callback(self.cascade);
				}
				return self.cascade;
			} else if (type === undefined) {
				self.emit('get:self');
				if (callback) {
					callback(self);
				}
				return self;
			} else {
				self.emit('get:' + type);
				if (callback) {
					callback(settings[type]);
				}
				return settings[type];
			}
		};

		self.set = function (key, value, callback) {
			settings[key] = value;
			var packageJson = jetpack.read('./package.json', 'json');
			packageJson['specless-cascade'] = settings;
			jetpack.write('./package.json', packageJson);
			self.emit('set');
			if (callback) {
				callback(settings[key]);
				self.emit('set:' + key);
			}
			return settings[key];
		};

		self.restart = function (type, callback) {
			var path = self.cascade.get('currentProjectDir');
			if (type === 'server') {
				self.emit('restartServer');
				self.emit('restartServerStart');
				self.cascade.stop(function (success) {
					self.cascade.start(path, function (status) {
						self.emit('restartServerEnd');
						if (callback) {
							callback(status);
						}
					});
				});
			} else if (type === 'cascade') {
				self.emit('restartCascade');
				self.emit('restartCascadeStart');
				self.cascade.stop(function (success) {
					var newSettings = app.get('settings');
					if (newSettings.useAltGulpPath === true && newSettings.altGulpPath !== null) {
						gulpPath = newSettings.altGulpPath;
						console.warn("Using alternative Cascade compiler located at '" + gulpPath + "'.");
					} else {
						gulpPath = newSettings.appPath + newSettings.gulpPath;
						console.warn("Using built-in Cascade compiler located at '" + gulpPath + "'.");
					}
					self.cascade = new _modulesCascade.Cascade(gulpPath, function () {
						self.cascade.start(self.cascade.get('currentProjectDir'));
						self.emit('restartCascadeEnd');
					});
				});
			} else {
				self.emit('restart');
				self.emit('restartStart');
				self.cascade.stop(function (success) {
					self.removeAllListeners();
					self.cascade.removeAllListeners();
					self.project.removeAllListeners();
					self.ui.removeAllListeners();
					var settings = jetpack.read('./package.json', 'json')['specless-cascade'];
					self = null;
					global.app = new App(settings);
					global.app.emit('restartEnd');
				});
			}
		};

		self._init = function () {
			self.set('appPath', settings.appPath);
			self.set('userPluginsFolder', settings.userPluginsFolder);
			if (settings.useAltGulpPath === true && settings.altGulpPath !== null) {
				gulpPath = settings.altGulpPath;
				console.warn("Using alternative Cascade compiler located at '" + gulpPath + "'.");
			} else {
				gulpPath = settings.appPath + settings.gulpPath;
				console.warn("Using built-in Cascade compiler located at '" + gulpPath + "'.");
			}
			self.message = new _modulesMessages.Messages();
			self.cascade = new _modulesCascade.Cascade(gulpPath);
			self.ui = new _modulesUi.Ui();
			cascade = self.cascade.get('settings');
			fs.access(settings.userPluginsFolder, fs.F_OK, function (err) {
				if (err) {
					console.warn("Plugins folder doesn't exist. Creating '" + settings.userPluginsFolder + "'");
					fs.mkdirSync(settings.userPluginsFolder);
				}
			});
			self.open(cascade.currentProjectDir, function (success) {
				if (success === false) {
					self.emit('init:fail');
				} else {
					self.emit('init');
				}
			}, true);
		};

		self._init();
	};

	util.inherits(App, EventEmitter);

	var settings = jetpack.read('./package.json', 'json')['specless-cascade'];
	settings.appPath = process.cwd();
	settings.userPluginsFolder = gui.App.dataPath + '/Plugins';

	var app = new App(settings);

	//global.myProject = new Project('/Users/scorby/Dev/defaultCascadeProjectTest', "My Name");
});
//# sourceMappingURL=app.js.map
