import {EventEmitter2} from 'eventemitter2';
import {Message} from 'roslib';

import debounce from 'lodash/debounce';

// Robot specific Hardware constants that should come from the parameter server
import properties from './hardware-properties';

// Hardware constants

const levels = {
  STALE: 0,
  IDLE: 1,
  OPERATIONAL: 2,
  HOMING: 3,
  ERROR: 4
};

// define how the actions map to hardware commands
const commands = {
  restart: 0,
  home: 21,
  start: 22,
  stop: 23,
  reset: 24
};

const hardwareIds = {
  /* eslint camelcase:0 */
  all: 0,
  base: 1,
  spindle: 2,
  left_arm: 3,
  right_arm: 4,
  head: 5
};

const defaultStatus = {};
for (const name of Object.keys(hardwareIds)) {
  defaultStatus[name] = {
    level: levels.STALE,
    homed: false
  };
}

// hardware timeouts in ms
const HARDWARE_TIMEOUT = 2000;
const BATTERY_TIMEOUT = 2000;
const EBUTTONS_TIMEOUT = 2000;

/**
 * Hardware module
 * @param {Robot} robot A valid robot object
 */
class Hardware extends EventEmitter2 {
  static levels = levels;

  constructor(robot) {
    super();
    const {ros} = robot;

    // hardware status init
    const statusTopic = ros.Topic({
      name: 'hardware_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      throttle_rate: 500
    });
    statusTopic.subscribe(this._onStatus.bind(this));

    this._commandTopic = ros.Topic({
      name: 'dashboard_ctrlcmds',
      messageType: 'std_msgs/UInt8MultiArray'
    });

    // battery status init
    const batteryTopic = ros.Topic({
      name: 'battery_percentage',
      messageType: 'std_msgs/Float32',
      throttle_rate: 200
    });
    batteryTopic.subscribe(this._onBattery.bind(this));

    // ebutton status init
    const ebuttonTopic = ros.Topic({
      name: 'ebutton_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      throttle_rate: 200
    });
    ebuttonTopic.subscribe(this._onEbuttons.bind(this));
  }

  /**
   * Public status API
   */
  _status = defaultStatus;
  get status() {
    return this._status;
  }

  set status(value) {
    this._status = value;
    this.emit('status', value);
  }

  _onStatus(message) {
    this.status = diagnosticMessageToStatus(message);
    this._resetHardwareLater();
  }

  _resetHardwareLater = debounce(this._resetHardware, HARDWARE_TIMEOUT);
  _resetHardware() {
    console.log('hardware message timeout');
    this.status = defaultStatus;
  }

  /**
   * Send a command to the partware
   *
   * example:
   * > hardware.send_command('head', 'start')
   */
  send_command(part, command) {
    if (!Object.prototype.hasOwnProperty.call(hardwareIds, part)) {
      throw new RangeError('Invalid part');
    }

    if (!Object.prototype.hasOwnProperty.call(commands, command)) {
      throw new RangeError('Invalid command');
    }

    const i1 = hardwareIds[part];
    const i2 = commands[command];
    console.log('hardware command: %s %s (%i, %i)', command, part, i1, i2);

    const cmd = new Message({
      data: [i1, i2]
    });

    this._commandTopic.publish(cmd);
  }

  /**
   * Public battery API
   */
  _battery = null;
  get battery() {
    return this._battery;
  }

  set battery(value) {
    this._battery = value;
    this.emit('battery', value);
  }

  /**
   * @param {Object} msg - ROS std_msgs/Float32 message
   */
  _onBattery(message) {
    const percent = message.data;
    this.battery = percent;
    this._resetBatteryLater();
  }

  _resetBatteryLater = debounce(this._resetBattery, BATTERY_TIMEOUT);
  _resetBattery() {
    console.log('battery message timeout');
    this.battery = null;
  }

  /**
   * Public ebutton status API
   */
  _ebuttons = null;
  get ebuttons() {
    return this._ebuttons;
  }

  set ebuttons(value) {
    this._ebuttons = value;
    this.emit('ebuttons', value);
  }

  _onEbuttons(message) {
    // const status = msg.status.map(status => {
    //   return _.pick(status, ['name', 'level']);
    // });
    const status = message.status.map(({name, level}) => ({name, level}));

    this.ebuttons = status;
    this._resetEbuttonsLater();
  }

  _resetEbuttonsLater = debounce(this._resetEbuttons, EBUTTONS_TIMEOUT);
  _resetEbuttons() {
    console.log('ebuttons message timeout');
    this.ebuttons = null;
  }
}

/**
 * Private functions
 */

// convert an incoming status message to actual workable properties
function diagnosticMessageToStatus(message) {
  // convert array to object
  let hardware_status = {};
  for (const {name, level, message_info} of message.status) {
    const homed = message_info === 'homed';
    hardware_status[name] = {level, homed};
  }

  // fill all missing hardware parts with 'idle'
  hardware_status = Object.assign({}, defaultStatus, hardware_status);

  // add actions
  for (const name of Object.keys(hardware_status)) {
    const part = hardware_status[name];
    part.actions = getActions(name, part);
  }

  return hardware_status;
}

// return all possible actions for a hardware part
function getActions(name, part) {
  const props = properties[name];
  if (!props) {
    return null;
  }

  const level = part ? part.level : -1;
  const homed = part ? part.homed : false;

  const actions = {};

  // only show the home action if homeable
  if (props.homeable) {
    actions.home = {
      enabled: level === levels.IDLE,
      warning: homed ?
        'This part was already homed, Are you sure you want to redo homing?' : false
    };
  }

  // always show start action
  actions.start = {
    enabled: level === levels.IDLE && (homed || !props.homeable_mandatory),
    warning: props.homeable && !homed ?
      'This part is not yet homed, Are you sure you want to proceed?' : false
  };

  // always show stop action
  actions.stop = {
    enabled: level === levels.HOMING || level === levels.OPERATIONAL
  };

  // always show restart action
  actions.restart = {
    enabled: true,
    warning: 'This will restart the robot hardware interface, Are you sure you want to proceed?'
  };

  // only show reset action if resetable
  if (props.resetable) {
    actions.reset = {
      enabled: level === levels.ERROR
    };
  }

  return actions;
}

export default Hardware;
