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
    const ros = robot.ros;

    // Define the action
    this.action = new ActionClient({
      ros,
      serverName: 'body/joint_trajectory_action',
      actionName: 'control_msgs/FollowJointTrajectoryAction',
      timeout: 10
    });

    // Get the skills parameters from the parameter server to extract the
    // possible motions.
    const param = new Param({
      ros,
      name: 'skills'
    });

    // Extract all relevant parameter from the parameter group
    const that = this;
    param.get(param => {
      // Joint names
      that.jointNames = {};
      // Arm joint names. N.B.: the suffices 'left' and 'right'
      // must be added
      that.jointNames.arm = [];
      that.jointNames.leftArm = [];
      that.jointNames.rightArm = [];
      param.arm.joint_names.forEach(e => {
        that.jointNames.arm.push(`${e}`);
        that.jointNames.leftArm.push(`${e}_left`);
        that.jointNames.rightArm.push(`${e}_right`);
      });
      // Torso joint name
      that.jointNames.torso = param.torso.joint_names;

      // Default joint configuration. N.B., the configurations for the left
      // and right arm are equal
      that.defaultConfigurations = {};
      that.defaultConfigurations.torso = param.torso.default_configurations;
      that.defaultConfigurations.arm = param.arm.default_configurations;
      that.defaultConfigurations.leftArm = param.arm.default_configurations;
      that.defaultConfigurations.rightArm = param.arm.default_configurations;
    });

    // Define the gripper action
    this.leftGripperAction = new ActionClient({
      ros,
      serverName: 'left_arm/gripper/action',
      actionName: 'tue_manipulation_msgs/GripperCommandAction',
      timeout: 0.0
    });

    // Define the gripper action
    this.rightGripperAction = new ActionClient({
      ros,
      serverName: 'right_arm/gripper/action',
      actionName: 'tue_manipulation_msgs/GripperCommandAction',
      timeout: 0.0
    });
  }  // End of constructor

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
            time_from_start: {
              secs: 1,
              nsecs: 500000000
            }
          }]
        },
        goal_time_tolerance: {
          secs: 5
        }
      }
    });

    // Send the goal with a default timeout of 10.0 seconds
    goal.send(10.0);
  }  // End of sendGoal

  /**
   * Sends a gripper goal
   * @param {object} cmd: object containing 'side' ('left' or 'right') and 'direction' ('open' or 'close')
   */
  sendGripperGoal(cmd) {
    console.log('Robot body: gripper goal: ', cmd);

    let actionClient;
    // Get the side
    if (cmd.side === 'left') {
      actionClient = this.leftGripperAction;
    } else if (cmd.side === 'right') {
      actionClient = this.rightGripperAction;
    } else {
      console.error('Gripper command side must be either left or right. Right now, it is ', cmd.side);
      return;
    }

    // Get the direction: open or close. This is mapped to the enum defined in the action description
    // int8 OPEN=-1
    // int8 CLOSE=1
    let direction;
    if (cmd.direction === 'open') {
      direction = -1;
    } else if (cmd.direction === 'close') {
      direction = 1;
    } else {
      console.error('Gripper command direction must be either open or close. Right now, it is ', cmd.direction);
      return;
    }

    // Create the goal
    const goal = new Goal({
      actionClient,
      goalMessage: {
        command: {
          /* eslint camelcase:0 */
          direction,
          max_torque: 10.0}
      }
    });

    // Send the goal with a zero timeout
    goal.send(0.0);
  }  // End of sendGripperGoal

}  // End of class Body

export default Body;
