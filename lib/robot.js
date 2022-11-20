import AutoRos from 'auto-ros';
import {EventEmitter2} from 'eventemitter2';

import EdRobocup from './ed-robocup.js';
import Hardware from './hardware.js';
import Head from './head.js';
import Base from './base.js';
import Body from './body.js';
import Speech from './speech.js';
import ActionServer from './action-server.js';

// Robot constructor
class Robot extends EventEmitter2 {
  constructor(modules = {}) {
    super();

    this.autoRos = new AutoRos({rosOptions: {encoding: 'ascii'},
    });
    this.ros = this.autoRos.ros;

    this.autoRos.on('status', this.onStatus.bind(this));

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

    if ('body' in modules) {
      this.body = new Body(this);
    }

    if ('speech' in modules) {
      this.speech = new Speech(this);
    }

    if ('actionServer' in modules) {
      this.actionServer = new ActionServer(this);
    }
  }

  get status() {
    return this._status;
  }

  set status(value) {
    console.debug(`robot: setting status to "${value}"`);
    this._status = value;
    this.emit('status', value);
  }

  /**
   * Connect to rosbridge
   */
  connect(url) {
    this.autoRos.connect(url);
  }

  // ros status event handling
  onStatus(value) {
    this.status = value;
  }
}

export default Robot;
