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
  /* eslint-disable camelcase -- ROS hardware part IDs use snake_case */
  all: 0,
  base: 1,
  spindle: 2,
  left_arm: 3,
  right_arm: 4,
  head: 5,
  /* eslint-enable camelcase */
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
  #status = defaultStatus;
  #resetHardwareLater = debounce(this.#resetHardware, HARDWARE_TIMEOUT);
  #battery = null;
  #resetBatteryLater = debounce(this.#resetBattery, BATTERY_TIMEOUT);
  #ebuttons = null;
  #resetEbuttonsLater = debounce(this.#resetEbuttons, EBUTTONS_TIMEOUT);

  constructor(robot) {
    super();
    const {ros} = robot;

    // hardware status init
    const statusTopic = ros.Topic({
      name: 'hardware_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      /* eslint-disable-next-line camelcase -- ROSLIB topic option uses snake_case */
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
      /* eslint-disable-next-line camelcase -- ROSLIB topic option uses snake_case */
      throttle_rate: 200,
    });
    batteryTopic.subscribe(this.#onBattery.bind(this));

    // ebutton status init
    const ebuttonTopic = ros.Topic({
      name: 'ebutton_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      /* eslint-disable-next-line camelcase -- ROSLIB topic option uses snake_case */
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
   Callback for battery percentage messages
   @param {object} message - ROS std_msgs/Float32 message
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
    // const status = msg.status.map(status => {
    //   return _.pick(status, ['name', 'level']);
    // });
    const status = message.status.map(({name, level}) => ({name, level}));

    this.ebuttons = status;
    this.#resetEbuttonsLater();
  }

  #resetEbuttons() {
    console.log('ebuttons message timeout');
    this.ebuttons = null;
  }

  /**
   Public status API
   */
  get status() {
    return this.#status;
  }

  set status(value) {
    this.#status = value;
    this.emit('status', value);
  }

  /**
   Public battery API
   */
  get battery() {
    return this.#battery;
  }

  set battery(value) {
    this.#battery = value;
    this.emit('battery', value);
  }

  /**
   Public ebutton status API
   */
  get ebuttons() {
    return this.#ebuttons;
  }

  set ebuttons(value) {
    this.#ebuttons = value;
    this.emit('ebuttons', value);
  }

  /**
   Send a command to the hardware

   example:
   > hardware.sendCommand('head', 'start')
   @param {string} part - The hardware part name
   @param {string} command - The command to send
   */
  sendCommand(part, command) {
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
  let hardwareStatus = {};
  /* eslint-disable camelcase -- ROS message fields use snake_case */
  for (const {name, level, message_info} of message.status) {
    const homed = message_info === 'homed';
    /* eslint-enable camelcase */
    hardwareStatus[name] = {level, homed};
  }

  // fill all missing hardware parts with 'idle'
  hardwareStatus = {...defaultStatus, ...hardwareStatus};

  // add actions
  for (const [name, part] of Object.entries(hardwareStatus)) {
    part.actions = getActions(name, part);
  }

  return hardwareStatus;
}

// return all possible actions for a hardware part
function getActions(name, part) {
  const properties_ = properties[name];
  if (!properties_) {
    return null;
  }

  const level = part ? part.level : -1;
  const homed = part ? part.homed : false;

  const actions = {};

  // only show the home action if homeable
  if (properties_.homeable) {
    actions.home = {
      enabled: level === levels.IDLE,
      warning: homed
        ? 'This part was already homed, Are you sure you want to redo homing?'
        : false,
    };
  }

  // always show start action
  actions.start = {
    enabled: level === levels.IDLE && (homed || !properties_.homeable_mandatory),
    warning: properties_.homeable && !homed
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
