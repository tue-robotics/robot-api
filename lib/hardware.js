import EventEmitter2 from 'eventemitter2';
import ROSLIB from 'roslib';
import debounce from 'lodash/debounce.js';
// Robot specific Hardware constants that should come from the parameter server
import properties from './hardware-properties.js';

// Hardware constants

const levels = {
  STALE: 0,
  IDLE: 1,
  OPERATIONAL: 2,
  HOMING: 3,
  ERROR: 4,
};

// define how the actions map to hardware commands
const commands = {
  restart: 0,
  home: 21,
  start: 22,
  stop: 23,
  reset: 24,
};

const hardwareIds = {
  /* eslint camelcase:0 -- ROS hardware part names use snake_case */
  all: 0,
  base: 1,
  spindle: 2,
  left_arm: 3,
  right_arm: 4,
  head: 5,
};

const defaultStatus = {};
for (const name of Object.keys(hardwareIds)) {
  defaultStatus[name] = {
    level: levels.STALE,
    homed: false,
  };
}

// hardware timeouts in ms
const HARDWARE_TIMEOUT = 2000;
const BATTERY_TIMEOUT = 2000;
const EBUTTONS_TIMEOUT = 2000;

/**
 Hardware module
 @param {Robot} robot A valid robot object
 */
class Hardware extends EventEmitter2 {
  static levels = levels;
  // Public status, battery and ebutton state, exposed through the getters/setters below
  #status = defaultStatus;
  #battery = null;
  #ebuttons = null;
  #resetHardwareLater = debounce(this.#resetHardware, HARDWARE_TIMEOUT);
  #resetBatteryLater = debounce(this.#resetBattery, BATTERY_TIMEOUT);
  #resetEbuttonsLater = debounce(this.#resetEbuttons, EBUTTONS_TIMEOUT);

  constructor(robot) {
    super();
    const {ros} = robot;

    // hardware status init
    const statusTopic = ros.Topic({
      name: 'hardware_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      throttle_rate: 500,
    });
    statusTopic.subscribe(this.#onStatus.bind(this));

    this._commandTopic = ros.Topic({
      name: 'dashboard_ctrlcmds',
      messageType: 'std_msgs/UInt8MultiArray',
    });

    // battery status init
    const batteryTopic = ros.Topic({
      name: 'battery_percentage',
      messageType: 'std_msgs/Float32',
      throttle_rate: 200,
    });
    batteryTopic.subscribe(this.#onBattery.bind(this));

    // ebutton status init
    const ebuttonTopic = ros.Topic({
      name: 'ebutton_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      throttle_rate: 200,
    });
    ebuttonTopic.subscribe(this.#onEbuttons.bind(this));
  }

  #onStatus(message) {
    this.status = diagnosticMessageToStatus(message);
    this.#resetHardwareLater();
  }

  #resetHardware() {
    console.log('hardware message timeout');
    this.status = defaultStatus;
  }

  /**
   Handle an incoming battery message.
   @param {object} message ROS std_msgs/Float32 message
   */
  #onBattery(message) {
    const percent = message.data;
    this.battery = percent;
    this.#resetBatteryLater();
  }

  #resetBattery() {
    console.log('battery message timeout');
    this.battery = null;
  }

  #onEbuttons(message) {
    const status = message.status.map(({name, level}) => ({name, level}));

    this.ebuttons = status;
    this.#resetEbuttonsLater();
  }

  #resetEbuttons() {
    console.log('ebuttons message timeout');
    this.ebuttons = null;
  }

  get status() {
    return this.#status;
  }

  set status(value) {
    this.#status = value;
    this.emit('status', value);
  }

  get battery() {
    return this.#battery;
  }

  set battery(value) {
    this.#battery = value;
    this.emit('battery', value);
  }

  get ebuttons() {
    return this.#ebuttons;
  }

  set ebuttons(value) {
    this.#ebuttons = value;
    this.emit('ebuttons', value);
  }

  /**
   Send a command to the partware

   example:
   > hardware.send_command('head', 'start')
   @param {string} part Hardware part to address (e.g. 'head', 'base')
   @param {string} command Command to send (e.g. 'start', 'stop')
   */
  send_command(part, command) {
    if (!Object.hasOwn(hardwareIds, part)) {
      throw new RangeError('Invalid part');
    }

    if (!Object.hasOwn(commands, command)) {
      throw new RangeError('Invalid command');
    }

    const i1 = hardwareIds[part];
    const i2 = commands[command];
    console.log('hardware command: %s %s (%i, %i)', command, part, i1, i2);

    const cmd = new ROSLIB.Message({
      data: [i1, i2],
    });

    this._commandTopic.publish(cmd);
  }
}

/**
 Private functions
 */

// convert an incoming status message to actual workable properties
function diagnosticMessageToStatus(message) {
  // convert array to object
  let hardware_status = {};
  for (const {name, level, message_info} of message.status) {
    const isHomed = message_info === 'homed';
    hardware_status[name] = {level, homed: isHomed};
  }

  // fill all missing hardware parts with 'idle'
  hardware_status = {...defaultStatus, ...hardware_status};

  // add actions
  for (const [name, part] of Object.entries(hardware_status)) {
    part.actions = getActions(name, part);
  }

  return hardware_status;
}

// return all possible actions for a hardware part
function getActions(name, part) {
  const properties_ = properties[name];
  if (!properties_) {
    return null;
  }

  const level = part ? part.level : -1;
  const isHomed = part ? part.homed : false;

  const actions = {};

  // only show the home action if homeable
  if (properties_.homeable) {
    actions.home = {
      enabled: level === levels.IDLE,
      warning: isHomed
        ? 'This part was already homed, Are you sure you want to redo homing?'
        : false,
    };
  }

  // always show start action
  actions.start = {
    enabled: level === levels.IDLE && (isHomed || !properties_.homeable_mandatory),
    warning: properties_.homeable && !isHomed
      ? 'This part is not yet homed, Are you sure you want to proceed?'
      : false,
  };

  // always show stop action
  actions.stop = {
    enabled: level === levels.HOMING || level === levels.OPERATIONAL,
  };

  // always show restart action
  actions.restart = {
    enabled: true,
    warning: 'This will restart the robot hardware interface, Are you sure you want to proceed?',
  };

  // only show reset action if resetable
  if (properties_.resetable) {
    actions.reset = {
      enabled: level === levels.ERROR,
    };
  }

  return actions;
}

export default Hardware;
