import {hostname} from 'os';
import {EventEmitter2} from 'eventemitter2';
import {Ros} from 'roslib';

import EdRobocup from './ed-robocup';
import Hardware from './hardware';
import Head from './head';
import Base from './base';
import ActionServer from './action-server';

// Private variables
const host = hostname() || 'localhost';
const defaultUrl = `ws://${host}:9090`;

// reconnect timeout in ms
const RECONNECT_TIMEOUT = 5000;

// Robot constructor
class Robot extends EventEmitter2 {

  constructor(modules = {}) {
    // parent constructor
    // EventEmitter2.apply(this);
    super();

    this.ros = new Ros({
      encoding: 'ascii'
    });

    this.ros.on('connection', this.onConnection.bind(this));
    this.ros.on('close', this.onClose.bind(this));
    this.ros.on('error', this.onError.bind(this));

    // reconnect behavior
    this.on('status', function (status) {
      switch (status) {
        case 'closed':
          setTimeout(this.connect.bind(this), RECONNECT_TIMEOUT);
          break;
        default:
          break;
      }
    });

    console.log('Creating a robot with the following settings:', modules);
    if ('ed' in modules) {
      this.ed = new EdRobocup(this);
    }
    if ('hardware' in modules) {
      this.hardware = new Hardware(this);
    }
    if ('head' in modules) {
      this.head = new Head(this);
    }
    if ('base' in modules) {
      this.base = new Base(this);
    }
    if ('actionServer' in modules) {
      this.actionServer = new ActionServer(this);
    }
  }

  get status() {
    return this._status;
  }

  set status(value) {
    this._status = value;
    this.emit('status', value);
  }

  /**
   * Connect to rosbridge
   *
   * If an url is provided, it will connect to that one. Else it will
   * use the previous url. Uses a url based on the hostname if no urls
   * are provided.
   */
  connect(url) {
    this.url = url || this.url || defaultUrl;

    console.log(`connecting to ${this.url}`);
    this.ros.connect(this.url);
    this.status = 'connecting';
  }

  // ros status event handling
  onConnection() {
    console.log('connection');
    this.status = 'connected';
  }

  onClose() {
    console.log('connection closed');
    this.status = 'closed';
  }

  onError() {
    // console.log('connection error');
    this.status = 'error';
  }
}

// module.exports = Robot;
export default Robot;
