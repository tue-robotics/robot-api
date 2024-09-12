import {ActionClient, Goal, Param} from 'roslib';

/**
 * Class to expose the interface to the torso, arms and grippers of the robot
 */
class Body {
  /**
   * Constructor
   * @param {Robot} robot: Robot object of which this body is a part of
   */
  constructor(robot) {
    const {ros} = robot;

    // Define the action
    this.action = new ActionClient({
      ros,
      serverName: 'body/joint_trajectory_action',
      actionName: 'control_msgs/FollowJointTrajectoryAction',
      timeout: 10,
    });

    // Get the skills parameters from the parameter server to extract the
    // possible motions.
    const parameter = new Param({
      ros,
      name: 'skills',
    });

    // Extract all relevant parameter from the parameter group
    parameter.get(parameter_ => {
      // Joint names
      this.jointNames = {};
      this.defaultConfigurations = {};
      this.grippers = {};

      for (const [partName, part] of Object.entries(parameter_)) {
        if (Object.hasOwn(part, 'joint_names')) { // eslint-disable-line no-use-extend-native/no-use-extend-native
          this.jointNames[partName] = part.joint_names;
        }

        if (Object.hasOwn(part, 'default_configurations')) { // eslint-disable-line no-use-extend-native/no-use-extend-native
          this.defaultConfigurations[partName] = part.default_configurations;
        }

        if (Object.hasOwn(part, 'ac_gripper')) { // eslint-disable-line no-use-extend-native/no-use-extend-native
          this.grippers[partName] = new ActionClient({
            ros,
            serverName: part.ac_gripper,
            actionName: 'tue_manipulation_msgs/GripperCommandAction',
            timeout: 0,
          });
        }
      }
    });
  } // End of constructor

  /**
   * Sends a body goal
   * @param {object} cmd: cmd must contain two name, value pairs: 'body_part'
   * (torso, left_arm or right_arm) identifies which part to use and 'configuration'
   * the default configuration to which the part move.
   */
  sendGoal(cmd) {
    console.log('Robot body: sending goal', cmd);

    // New goals with parameters from the parameter server
    const goal = new Goal({
      actionClient: this.action,
      goalMessage: {
        trajectory: {
          /* eslint camelcase:0 */
          joint_names: this.jointNames[cmd.body_part],
          points: [{
            positions: this.defaultConfigurations[cmd.body_part][cmd.configuration],
            time_from_start: {secs: 2},
          }],
        },
        goal_time_tolerance: {
          secs: 5,
        },
      },
    });
    console.debug(goal);

    // Send the goal with a default timeout of 10.0 seconds
    goal.send(10);
  } // End of sendGoal

  /**
   * Sends a gripper goal
   * @param {object} cmd: object containing 'side' and 'direction' ('open' or 'close')
   */
  sendGripperGoal(cmd) {
    console.log('Robot body: gripper goal:', cmd);

    if (!Object.hasOwn(this.grippers, cmd.side)) { // eslint-disable-line no-use-extend-native/no-use-extend-native
      console.error(`Gripper command side must be one of [${Object.keys(this.grippers)}]. Right now, it is '${cmd.side}'`);
      return;
    }

    const actionClient = this.grippers[cmd.side];

    // Get the direction: open or close. This is mapped to the enum defined in the action description
    // int8 OPEN=-1
    // int8 CLOSE=1
    let direction;
    if (cmd.direction === 'open') {
      direction = -1;
    } else if (cmd.direction === 'close') {
      direction = 1;
    } else {
      console.error('Gripper command direction must be either open or close. Right now, it is', cmd.direction);
      return;
    }

    // Create the goal
    const goal = new Goal({
      actionClient,
      goalMessage: {
        command: {
          /* eslint camelcase:0 */
          direction,
          max_torque: 10,
        },
      },
    });

    // Send the goal with a zero timeout
    goal.send(0);
  } // End of sendGripperGoal
} // End of class Body

export default Body;
