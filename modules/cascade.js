define(['exports', './utils'], function (exports, _utils) {
	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});
	var jetpack = require('fs-jetpack');
	var spawn = require('child_process').spawn;
	var Q = require('q');
	var EventEmitter = require('events');
	var util = require('util');
	var gui = require('nw.gui');
	var win = gui.Window.get();

	var io = require('socket.io-client');
	var http = require('http');
	var chokidar = require('chokidar');

	var Cascade = function Cascade(path, cb) {

		var self = this;
		var app = global.app;
		self.path = path;

		var gulpProcess;

		self.get = function (type, callback) {
			var settings = jetpack.read(self.path + '/package.json', 'json')['specless-cascade'];
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
			var packageJson = jetpack.read(self.path + '/package.json', 'json');
			var settings = packageJson['specless-cascade'];
			settings[key] = value;
			jetpack.write(path + '/package.json', packageJson);
			self.emit('set');
			if (callback) {
				callback(settings[key]);
			}
			self.emit('set:' + key);
			return settings[key];
		};

		self._run = function (task, callback, args) {
			self.emit('runStart');
			self.emit('runStart:' + task);
			var command = ['run', 'gulp', task, '--'];
			if (args) {
				command = command.concat(args);
			}
			var deferred = Q.defer();
			var process = spawn('npm', command, { cwd: self.path });
			_utils.utils.logStream(process);

			process.on('close', function (exitCode) {
				var success;
				if (exitCode === 0) {
					success = true;
					if (callback) {
						callback(success);
					}
					self.emit('runEnd');
					self.emit('runEnd:' + task);
					deferred.resolve();
				} else {
					success = false;
					if (callback) {
						callback(success);
					}
					self.emit('runEnd');
					self.emit('runEnd:fail:' + task);
					deferred.reject();
				}
			});
			return deferred.promise;
		};

		self.start = function (projPath, callback) {
			var settings = self.get('settings');
			self.messageListener();
			self._run('set-project', function (success) {
				if (success === true) {
					self.socket = io('http://localhost:' + settings.serverPort);
					_utils.utils.handleMessage("Project validated.", 0);
					self.emit('validProject');
					self.emit('newProject');

					if (settings.currentProjectDir === projPath && gulpProcess && gulpProcess.killed === false) {
						if (callback) {
							callback('running');
							self.emit('alreadyRunning');
						}
						_utils.utils.handleMessage("Project already running.", 0);
					} else {
						if (gulpProcess && gulpProcess.killed === false) {
							self.stop();
						}
						http.get({
							hostname: 'localhost',
							port: settings.serverPort,
							path: '/killme',
							agent: false
						});
						gulpProcess = spawn('npm', ['run', 'gulp', 'start'], { cwd: self.path, detached: true });
						self.socket.emit("connected");
						self.socket.on('file change', function (data) {
							app.project.emit('file change', data);
						});
						var once = false;
						gulpProcess.stdout.on('data', function (data) {
							if (once === false) {
								_utils.utils.handleMessage("Project running.", 0);
								if (callback) {
									callback('started');
									self.emit('start');
								}
							}
							once = true;
						});
						gulpProcess.on('exit', function (exitCode) {
							if (callback) {
								callback('exited', exitCode);
								self.emit('exit');
								if (exitCode > 0) {
									_utils.utils.handleMessage("Project exited.", 0);
								}
							}
						});
						_utils.utils.logStream(gulpProcess);
					}
					self.process = gulpProcess;
					return gulpProcess;
				} else {
					_utils.utils.handleMessage("The project at '" + projPath + "' is not a valid Cascade project.", 0);
					if (callback) {
						callback('failed');
						self.emit('invalidProject');
					}
					return false;
				}
			}, ['--path=' + projPath]);
		};

		self.stop = function (callback) {

			if (self.messageListener) {
				self.messageListener.kill();
			}

			if (self.socket) {
				self.socket.close();
				self.socket.destroy();
			}
			try {
				http.get({
					hostname: 'localhost',
					port: self.get('serverPort'),
					path: '/killme',
					agent: false
				});
			} catch (error) {
				console.log(error);
				_utils.utils.handleMessage("Cannot stop project. May already be stopped.", 0);
			}

			if (gulpProcess && gulpProcess.killed === false) {
				try {
					process.kill(-gulpProcess.pid);
				} catch (error) {}
				_utils.utils.handleMessage("Project stopped.", 0);
				self.emit('stop');
				if (callback) {
					callback(true);
				}
			} else {
				_utils.utils.handleMessage("Cannot stop project. May already be stopped.", 0);
				self.emit('stop:fail');
				if (callback) {
					callback(false);
				}
			}
			return gulpProcess;
		};

		self.create = function (path, name, callback) {
			self._run('new', callback, ['--path=' + self.path, '--name=' + name]);
		};

		self.publish = function (callback) {
			self._run('publish', function (success) {
				if (success === true) {
					if (callback) {
						callback(success);
					}
					self.emit('publish');
				} else if (success === false) {
					if (callback) {
						callback(success);
					}
					self.emit('publish:fail');
				}
			});
		};

		self.messageListener = function () {
			var messageLog = self.path + '/message-log.json';
			jetpack.write(messageLog, '[]');
			self.messageListener.log = [];

			self.messageListener.watching = chokidar.watch(messageLog, { persistent: true, usePolling: true, interval: 250 });
			self.messageListener.watching.on('change', function (path) {
				var prevCount = self.messageListener.log.length;
				self.messageListener.log = jetpack.read(path, 'json');
				var newCount = self.messageListener.log.length;
				for (var i = 0; i < self.messageListener.log.length; i++) {
					if (i >= prevCount) {
						var message = self.messageListener.log[i];
						_utils.utils.handleMessage(message.message, message.code, message.details);
					}
				}
			});

			self.messageListener.kill = function () {
				self.messageListener.watching.close();
			};
		};

		self._init = function (callback) {
			var appSettings = jetpack.read('./package.json', 'json')['specless-cascade'];
			try {
				var cascadeSettings = jetpack.read(self.path + '/package.json', 'json')['specless-cascade'];
				var version = cascadeSettings.version;
			} catch (error) {
				_utils.utils.handleMessage("Not a valid Cascade compiler", 0);
				console.warn("Not a valid Cascade compiler located at '" + self.path + "'. Using built-in Cascade compiler instead.");
				self.path = appSettings.appPath + appSettings.gulpPath;
				app.set('useAltGulpPath', false);
				var version = jetpack.read(self.path + '/package.json', 'json').version;
			}

			win.on('closed', function () {
				self.stop();
			});
			self.set('version', version);
			self.set('serverPort', appSettings.serverPort);
			self.set('autoReload', appSettings.autoReload);
			self.set('userPluginsFolder', appSettings.userPluginsFolder);
			self.emit('init');
			if (callback) {
				callback();
			}
		};

		self._init(cb);
	};

	exports.Cascade = Cascade;
	util.inherits(Cascade, EventEmitter);
});
//# sourceMappingURL=cascade.js.map
