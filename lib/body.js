import {EventEmitter2} from 'eventemitter2';
import {Message} from 'roslib';

class Body extends EventEmitter2 {
  constructor(robot) {
    super();

    const ros = robot.ros;

    // Define the action
    this.action = new ROSLIB.ActionClient({
      ros: ros,
      serverName: 'body/joint_trajectory_action',
      actionName: 'control_msgs/FollowJointTrajectoryAction',
      timeout: 10,
    });

    // Get the skills parameters from the parameter server to extract the
    // possible motions.
    // ToDo: get rid of hardcoded "amigo"
    var param = new ROSLIB.Param({
      ros: ros,
      name: '/amigo/skills'
    });

    var that = this
    param.get(function(param) {
      that.joint_names = {}
      that.default_configurations = {}
      that.joint_names["torso"] = param.torso.joint_names
      that.default_configurations["torso"] = param.torso.default_configurations
      that.default_configurations["left_arm"] = param.arm.default_configurations
      that.default_configurations["right_arm"] = param.arm.default_configurations
      that.joint_names["left_arm"] = []
      that.joint_names["right_arm"] = []
      param.arm.joint_names.forEach(function(e) {
        that.joint_names["left_arm"].push(e + "_left")
        that.joint_names["right_arm"].push(e + "_right")
      })

    });

    // Define the gripper action
    this.left_gripper_action = new ROSLIB.ActionClient({
      ros: ros,
      serverName: 'left_arm/gripper/action',
      actionName: 'tue_manipulation_msgs/GripperCommandAction',
      timeout: 10,
    });

    // Define the gripper action
    this.right_gripper_action = new ROSLIB.ActionClient({
      ros: ros,
      serverName: 'right_arm/gripper/action',
      actionName: 'tue_manipulation_msgs/GripperCommandAction',
      timeout: 10,
    });

  }  // End of constructor

  sendGoal(cmd) {
    console.log("Robot body: sending goal", cmd)

    // New goals with parameters from the parameter server
    var goal = new ROSLIB.Goal({
        actionClient: this.action,
        goalMessage: {
          trajectory: {
            joint_names: this.joint_names[cmd.body_part],
            points: [{positions: this.default_configurations[cmd.body_part][cmd.configuration]}]
          }
        }
      })

      goal.send(10.0)

    };  // End of sendGoal

    sendGripperGoal(cmd) {

      console.log("Robot body: gripper goal: ", cmd)

      // Get the side
      if (cmd.side == 'left') {
        var action_client = this.left_gripper_action
      } else if (cmd.side == 'right') {
        var action_client = this.right_gripper_action
      } else {
        console.error('Gripper command side must be either left or right. Right now, it is ', cmd.side);
        return;
      }

      // Get the direction: open or close. This is mapped to the enum defined in the action description
      //int8 OPEN=-1
      //int8 CLOSE=1
      if (cmd.direction == 'open') {
        var direction = -1
      } else if (cmd.direction == 'close') {
        var direction = 1
      } else {
        console.error('Gripper command direction must be either open or close. Right now, it is ', cmd.direction)
        return;
      }

      // Create the goal
      var goal = new ROSLIB.Goal({
        actionClient: action_client,
        goalMessage: {
          command: {direction: direction,
                    max_torque: 10.0}
        }
      })

      goal.send(10.0)

    }; // End of sendGripperGoal

}  // End of class Body

export default Body;
