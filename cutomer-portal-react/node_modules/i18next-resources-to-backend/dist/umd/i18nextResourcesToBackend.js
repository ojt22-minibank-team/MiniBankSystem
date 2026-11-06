(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.i18nextResourcesToBackend = factory());
})(this, (function () { 'use strict';

  var UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype'];
  var isSafeIdentifier = function isSafeIdentifier(v, allowSlash) {
    if (typeof v !== 'string') return false;
    if (v.length > 128) return false;
    if (UNSAFE_KEYS.indexOf(v) > -1) return false;
    if (v.indexOf('..') > -1) return false;
    if (v.indexOf('\\') > -1) return false;
    if (!allowSlash && v.indexOf('/') > -1) return false;
    if (/[\x00-\x1F\x7F]/.test(v)) return false;
    return true;
  };
  var resourcesToBackend = function resourcesToBackend(res) {
    return {
      type: 'backend',
      init: function init(services, backendOptions, i18nextOptions) {},
      read: function read(language, namespace, callback) {
        if (!isSafeIdentifier(language, false) || !isSafeIdentifier(namespace, true)) {
          return callback(new Error('i18next-resources-to-backend: unsafe language/namespace value'), false);
        }
        if (typeof res === 'function') {
          if (res.length < 3) {
            try {
              var r = res(language, namespace);
              if (r && typeof r.then === 'function') {
                r.then(function (data) {
                  return callback(null, data && data.default || data);
                }).catch(callback);
              } else {
                callback(null, r);
              }
            } catch (err) {
              callback(err);
            }
            return;
          }
          res(language, namespace, callback);
          return;
        }
        callback(null, res && res[language] && res[language][namespace]);
      }
    };
  };

  return resourcesToBackend;

}));
