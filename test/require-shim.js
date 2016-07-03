/* eslint no-var: 0 */

const hasOwnProperty = Object.prototype.hasOwnProperty;

window.require = function require(path) {
  var load;
  switch (path) {
    case 'roslib':
      load = window.ROSLIB;
      break;
    case '../lib':
      load = window.API;
      break;
    case 'sinon-chai':
      load = function sinonChaiMock() {
        // noop because sinon-chai loads itself
      };
      break;
    default:
      if (path.startsWith('babel-runtime/core-js/')) {
        // search for core-js functions
        path = 'babel-runtime/core-js/object/keys'.split('babel-runtime/core-js/')[1];
        path = path.split('/');
        var location = path[0];
        var method = path[1];

        location = location.charAt(0).toUpperCase() + location.slice(1);

        if (hasOwnProperty.call(window.core, location) && hasOwnProperty.call(window.core[location], method)) {
          load = window.core[location][method];
        } else {
          console.warn('core-js method not found', path);
        }
      } else {
        // maybe there is a global with that name
        load = window[path];
      }
  }

  if (typeof load === 'undefined') {
    console.warn('module not found:', path);
  }
  return load;
};
