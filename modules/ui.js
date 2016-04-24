define(['exports', './utils'], function (exports, _utils) {
	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});
	var EventEmitter = require('events');
	var util = require('util');
	var open = require("open");

	var Ui = function Ui() {

		var self = this;
		var $ = global.$;
		var app = global.app;

		self._el = {
			$projectTitle: $('#projectTitle'),
			$projectPath: $('#projectPath'),
			$openProject: $('#openProject'),
			$newProject: $('#newProject'),
			$openProjectFolder: $('#openProjectFolder'),
			$publishProject: $('#publishProject'),
			$serverPort: $('#serverPort'),
			$restartServer: $('#restartServer'),
			$cascadeVersion: $('#cascadeVersion'),
			$cascadePath: $('#cascadePath'),
			$chooseCascade: $('#chooseCascade'),
			$toggleCustomCascade: $('#toggleCustomCascade'),
			$restartCascade: $('#restartCascade'),
			$pluginsPath: $('#pluginsPath'),
			$showPlugins: $('#showPlugins'),
			$openDirectory: $('#openDirectory'),
			$newDirectory: $('#newDirectory'),
			$previewProject: $('.app-preview'),
			$openIn: $('.app-open-in')
		};

		self._set = function (key, value) {
			var el = self._el;
			if (key === 'projectTitle') {
				el.$projectTitle.html(app.cascade.get('settings').currentProjectDir.split('/').pop());
			} else if (key === 'projectPath') {
				el.$projectPath.html(app.cascade.get('settings').currentProjectDir);
			} else if (key === 'serverPort') {
				el.$serverPort.attr('value', app.cascade.get('serverPort'));
			} else if (key === 'cascadePath') {
				el.$cascadePath.html(app.get('altGulpPath'));
			} else if (key === 'cascadeVersion') {
				el.$cascadeVersion.html(app.cascade.get('version'));
			} else if (key === 'pluginsPath') {
				el.$pluginsPath.html(app.cascade.get('userPluginsFolder'));
			} else if (key === 'customCascade') {
				if (app.get('useAltGulpPath') === true) {
					el.$toggleCustomCascade.val("true");
					el.$toggleCustomCascade.attr("checked", true);
				} else {
					el.$toggleCustomCascade.val("false");
					el.$toggleCustomCascade.attr("checked", false);
				}
			}
		};

		self._fileSelect = function (callback) {
			var chooser = self._el.$openDirectory;
			chooser.unbind('change');
			chooser.change(function (evt) {
				if ($(this).val() !== "") {
					if (callback) {
						callback($(this).val());
					}
				}
			});
			chooser.trigger('click');
		};

		self._fileSave = function (callback) {
			var chooser = self._el.$newDirectory;
			chooser.unbind('change');
			chooser.change(function (evt) {
				if ($(this).val() !== "") {
					if (callback) {
						callback($(this).val());
					}
				}
			});
			chooser.trigger('click');
		};

		self._bind_projectOpen = function (element, callback) {
			element.click(function () {
				self._fileSelect(function (path) {
					app.open(path, function (success) {
						if (callback) {
							callback(success);
						}
					});
				});
			});
		};

		self._bind_projectPublish = function (element, callback) {
			element.click(function () {
				app.project.publish(function (success) {
					if (callback) {
						callback(success);
					}
				});
			});
		};

		self._bind_projectNew = function (element, callback) {
			element.click(function () {
				self._fileSave(function (path) {
					path = path.split('/');
					var name = path.pop();
					path = path.join('/');
					app['new'](path, name, function (success) {
						if (callback) {
							callback(success);
						}
					});
				});
			});
		};

		self._bind_projectPreview = function (element) {
			element.click(function () {
				var target = $(this).attr('data-target');
				app.project.preview(target);
			});
		};

		self._bind_projectOpenIn = function (element) {
			element.click(function () {
				var target = $(this).attr('data-target');
				app.project.viewIn(target);
			});
		};

		self._bind_serverRestart = function (element) {
			var el = self._el;
			var validateServerPort = function validateServerPort(port) {
				var isnum = /^\d+$/.test(port);
				return isnum;
			};
			element.click(function () {
				var serverPort = el.$serverPort.val();
				var oldServerPort = app.get('serverPort');
				var changed = false;
				if (validateServerPort(serverPort) === true && serverPort.split("").length === 4) {
					if (serverPort !== oldServerPort) {
						app.set('serverPort', serverPort);
						app.restart('cascade');
					}
				} else {
					el.$serverPort.val(oldServerPort);
					_utils.utils.handleMessage("Not a valid server port", 0);
				}
			});
		};

		self._bind_pluginsShowFolder = function (element) {
			element.click(function () {
				open(app.get('userPluginsFolder'), 'finder');
			});
		};

		self._bind_cascadeToggleCustom = function (element) {
			var el = self._el;
			element.click(function (event) {
				if (element.val() === "true") {
					element.val("false");
					app.set("useAltGulpPath", false);
				} else {
					element.val("true");
					app.set("useAltGulpPath", true);
				}
			});
		};

		self._bind_cascadeChooseCustom = function (element) {
			var el = self._el;
			element.click(function () {
				self._fileSelect(function (path) {
					el.$cascadePath.html(path);
					app.set("altGulpPath", path);
				});
			});
		};

		self._bind_cascadeRestart = function (element) {
			element.click(function () {
				app.restart('cascade');
			});
		};

		self._bind_toggleMenu = function (element) {};

		self._bind_clickOutsideCloseMenu = function (element) {};

		self._create_nativeMenus = function () {};

		self._bindAll = function () {
			var el = self._el;
			self._bind_projectOpen(el.$openProject);
			self._bind_projectNew(el.$newProject);
			self._bind_projectPreview(el.$previewProject);
			self._bind_projectOpenIn(el.$openIn);
			self._bind_projectPublish(el.$publishProject);
			self._bind_serverRestart(el.$restartServer);
			self._bind_pluginsShowFolder(el.$showPlugins);
			self._bind_cascadeToggleCustom(el.$toggleCustomCascade);
			self._bind_cascadeChooseCustom(el.$chooseCascade);
			self._bind_cascadeRestart(el.$restartCascade);
		};

		self._setAll = function () {
			self._set('serverPort');
			self._set('cascadePath');
			self._set('cascadeVersion');
			self._set('pluginsPath');
			self._set('customCascade');
		};

		self._init = function () {
			self._bindAll();
			self._setAll();

			app.on('open', function () {
				self._set('projectTitle');
				self._set('projectPath');
				app.project.on('set', function () {
					self._setAll();
				});
			});
			app.on('new', function () {
				self._set('projectTitle');
				self._set('projectPath');
				app.project.on('set', function () {
					self._setAll();
				});
			});
			app.on('set', function () {
				self._setAll();
			});
			app.on('init', function () {
				app.cascade.on('set', function () {
					self._setAll();
				});
			});

			self.emit('init');
		};

		self.notify = function (title, message, type) {
			var config = {
				body: message
			};

			if (type === "success") {
				config.icon = 'file://' + app.path + '/assets/logo.png';
			} else if (type === "failure") {
				config.icon = 'file://' + app.path + '/assets/logo.png';
			}

			var notificaation = new Notification(title, config);
		};

		self._init();
	};

	exports.Ui = Ui;
	util.inherits(Ui, EventEmitter);
});
//# sourceMappingURL=ui.js.map
