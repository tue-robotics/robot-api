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

}  // End of class Body

export default Body;
