/**
 * ng-upload-window v0.1.0 (http://github.com/abidibo/ng-upload-window.git)
 * This is a wrapper around ng-file-upload (https://github.com/danialfarid/ng-file-upload) in order to have
 * a window (google drive style) showing all the current uploads. The cancel feature is enabled by default.
 * Copyright 2015 abidibo (http://www.abidibo.net)
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */
(function(window, angular, undefined) {
    'use strict';

    angular.module('ngUploadWindow.provider', ['ngFileUpload'])
    .provider('UploadWindow', [
        function() {
            var uploads = [];
            var running = {uploads: 0};
            this.$get = ['$timeout', 'Upload', function($timeout, Upload) {
                return {
                    uploads: uploads,
                    running: running,
                    /**
                     * Upload function
                     * Wrapper around ng-file-upload upload function in order to decorate the
                     * success, error and progress callbacks
                     * @param {Object} obj The ng-file-upload upload object argument
                     * @return object with the 'then' method decorated
                     */
                    upload: function(obj) {
                        var file = obj.file;
                        // extending file properties
                        file.progress = 0;
                        file.error = false;
                        file.success = false;
                        file.start = new Date().getTime();
                        file.now = new Date().getTime() + 1;
                        file.size_mb = Math.ceil((file.size / 1000 / 1000) * 10) / 10;
                        // calling the ng-file-upload upload function
                        file.upload = Upload.upload(obj);
                        // check uploads
                        var _check_uploads = function() {
                            var cnt_running = 0;
                            uploads.forEach(function(file) {
                                cnt_running += file.error || file.success ? 0 : 1;
                            });
                            if(!cnt_running) {
                                $timeout(function() {
                                    uploads.length = 0;
                                }, 11118000);
                            }
                            running.uploads = cnt_running;
                        };
                        // this wrapper wraps the callback method then, in order to add uploadWindow features
                        var wrapper = {};
                        wrapper.then = function(success, error, progress) {
                            var _success = function(response) {
                                file.success = true;
                                if(success) {
                                    success(response);
                                }
                                _check_uploads();
                            };
                            var _error = function(response) {
                                file.error = true;
                                if(error) {
                                    error(response);
                                }
                                _check_uploads();
                            }
                            var _progress = function(evt) {
                                var progressPercentage = parseInt(100.0 * evt.loaded / evt.total, 10);
                                file.progress = progressPercentage;
                                file.now = new Date().getTime();
                                if(progress) {
                                    progress(evt);
                                }
                            }
                            running.uploads++;
                            file.upload.then(_success, _error, _progress);
                        }
                        uploads.push(file);
                        return wrapper;
                    }
                };
            }];
        }
    ]);

})(window, window.angular);

(function(window, angular) {
    'use strict';

    angular.module('ngUploadWindow.directives', ['ngUploadWindow.provider'])
    .directive('uploadWindow', ['$compile','$templateCache', '$http', 'UploadWindow',

        function($compile,$templateCache, $http, UploadWindow){
            return {
                restrict: 'E',
                link: function(scope, element, attrs, fn) {
                    var _format_date_number = function(n) {
                        return n < 10 ? '0' + n : n;
                    }
                    $http.get('upload-window.html', {cache: $templateCache}).success(function(windowTemplate){
                        scope.remainingTime = function(file) {
                            if(!file.progress) {
                                return '∞';
                            }
                            var difference = file.now - file.start;
                            var ms = Math.round(difference * (100 - file.progress) / file.progress);
                            var x = ms / 1000;
                            var seconds = x % 60;
                            x /= 60;
                            var minutes = x % 60;
                            x /= 60;
                            var hours = x % 24;
                            x /= 24;
                            var days = x;
                            return (Math.floor(hours) ? _format_date_number(Math.floor(hours)) + ':' : '') + _format_date_number(Math.floor(minutes)) + ':' + _format_date_number(Math.floor(seconds));
                        }
                        scope.abort = function(file) {
                            file.upload.abort();
                        }
                        scope.uploads = UploadWindow.uploads;
                        scope.running = UploadWindow.running;
                        scope.iconized = false;
                        scope.close = function() {
                            if(!scope.running.uploads) {
                                scope.uploads.length = 0;
                            }
                        };
                        var templateElement = $compile(windowTemplate)(scope);
                        element.append(templateElement);

                    }).error(function(data){
                        throw new Error('Template \'upload-window.html\' could not be loaded. ' + data);
                    });
                }
            };
        }
    ]);
})(window, window.angular);

(function(window, angular) {
  'use strict';

  angular
    .module('ngUploadWindow', [
      'ngUploadWindow.directives',
      'ngUploadWindow.provider'
    ]).run(['$templateCache', function($templateCache) {
        $templateCache.put('upload-window.html',
            '<div class="upload-window {{ uploads.length ? \'active\' : \'\' }} {{ iconized ? \'iconized\' : \'\' }}">' +
            '    <div class="upload-window-title\">' +
            '        <a ng-class="{\'active-ctrl\': 1, \'running\': running.uploads}" ng-click="close()"></a>' +
            '        Uploads ({{ running.uploads }} running)' +
            '        <a class="iconize-ctrl" ng-click="iconized = !iconized"></a>' +
            '    </div>' +
            '    <div class="upload-window-body">' +
            '        <table class="table table-bordered">' +
            '            <tr ng-repeat="file in uploads" ng-class="{ \'error\': file.error }">' +
            '                <td>' +
            '                {{ file.name }} ({{ file.size_mb }}Mb)' +
            '                </td>' +
            '                <td>' +
            '                    <div class="uw-progress-bar"><span class="inner" style="width: {{ file.progress }}%;"></span></div>' +
            '                </td>' +
            '                <td>' +
            '                    {{ remainingTime(file) }}' +
            '                </td>' +
            '                <td>' +
            '                    <a ng-show="!file.error && !file.success" class="fa fa-remove" ng-click="abort(file)"></a>' +
            '                    <i ng-show="file.error" class="fa fa-exclamation-circle"></i>' +
            '                    <i ng-show="file.success" class="fa fa-check-circle"></i>' +
            '                </td>' +
            '            </tr>' +
            '        </table>' +
            '    </div>' +
            '</div>'
        );

    }]);

})(window, window.angular);
