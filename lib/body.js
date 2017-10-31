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

    // Define all joint names
    // this.torso_joints = ["torso_joint"]
    // this.left_arm_joints = ["shoulder_yaw_joint_left",
    //                         "shoulder_pitch_joint_left",
    //                         "shoulder_roll_joint_left",
    //                         "elbow_pitch_joint_left",
    //                         "elbow_roll_joint_left",
    //                         "wrist_pitch_joint_left",
    //                         "wrist_yaw_joint_left"];
    // this.right_arm_joints = ["shoulder_yaw_joint_right",
    //                          "shoulder_pitch_joint_right",
    //                          "shoulder_roll_joint_right",
    //                          "elbow_pitch_joint_right",
    //                          "elbow_roll_joint_right",
    //                          "wrist_pitch_joint_right",
    //                          "wrist_yaw_joint_right"];
    //
    // console.log("Joints", this.torso_joints, this.left_arm_joints, this.right_arm_joints)

    // Get all default joint configurations from the parameter server
  //   ros.getParams(function(params) {
  //   console.log(params);
  // });

  // var skills = new ROSLIB.Param({
  //   ros : ros,
  //   name : 'max_vel_y'
  // });
  //
  // maxVelX.set(0.8);
  // maxVelX.get(function(value) {
  //   console.log('MAX VAL: ' + value);
  // });
    var param = new ROSLIB.Param({
      ros: ros,
      name: '/amigo/skills'
    });

    // this.torso_joint_names = []
    // this.left_arm_joint_names = []
    // this.right_arm_joint_names = []
    // param.get(function(param) {
    //   console.log('Skill param: ', param)
    //   console.log('Torso skill param: ', param.torso)
    //   console.log('Torso joint names: ', param.torso.joint_names)
    //   this.torso_joint_names = param.torso.joint_names
    //   this.left_arm_joint_names = param.arm.joint_names
    //   this.right_arm_joint_names = param.arm.joint_names
    //   console.log("Joint names: ", this.torso_joint_names, this.left_arm_joint_names, this.right_arm_joint_names)
    // });

    var that = this
    param.get(function(param) {
      console.log('Skill param: ', param)
      console.log('Torso skill param: ', param.torso)
      console.log('Torso joint names: ', param.torso.joint_names)
      that.joint_names = {}
      that.default_configurations = {}
      that.joint_names["torso"] = param.torso.joint_names
      that.default_configurations["torso"] = param.torso.default_configurations
      that.default_configurations["left_arm"] = param.arm.default_configurations
      that.default_configurations["right_arm"] = param.arm.default_configurations
      that.joint_names["left_arm"] = []
      that.joint_names["right_arm"] = []
      param.arm.joint_names.each(function(e) {
        that.joint_names["left_arm"].push(e + "_left")
        that.joint_names["right_arm"].push(e + "_right")
      })

      console.log(that.default_configurations['torso'], "blaat")

      // Iterate over arm joint names and add the side
      // console.log("Joint names: ", this.joint_names)
      // console.log("Joint configurations: ", this.default_configurations)

      // this.torso_joint_names = param.torso.joint_names
      // this.torso_configurations = param.torso.default_configurations
      // this.left_arm_joint_names = param.arm.joint_names
      // this.right_arm_joint_names = param.arm.joint_names
      // console.log("Joint names: ", this.torso_joint_names, this.left_arm_joint_names, this.right_arm_joint_names)
    });

    // ros.getParams(function(params) {
    //     console.log(params);
    // });
    //
    // var skills = new ROSLIB.Param({
    //     ros : ros,
    //     name : 'skills'
    // });
    // ROSLIB.Param()

    // this.cmdVelTopic = ros.Topic({
    //   name: 'base/references',
    //   messageType: 'geometry_msgs/Twist'
    // });

  }  // End of constructor



  sendGoal(cmd) {
    console.log("Robot body: sending goal", cmd)

    // 'Old' implementation based on fixed goals
    // var goal = new ROSLIB.Goal({
    //     actionClient: this.action,
    //     goalMessage: {
    //       trajectory: {
    //         joint_names: cmd.joint_names,
    //         points: [{positions: cmd.positions}]
    //       }
    //     }
    //   })

    // New goals with parameters from the parameter server
    var goal = new ROSLIB.Goal({
        actionClient: this.action,
        goalMessage: {
          trajectory: {
            joint_names: this.joint_names[cmd.body_part],
            points: [{positions: this.default_configurations[cmd.configuration]}]
          }
        }
      })
      console.log("Body goal: ", goal)

      goal.send(10.0)

    };  // End of sendGoal

}  // End of class Body

export default Body;

//   function handleJointState(device,name_arguments,position_arguments) {
//
//   /* parse argument array */
//   position_arguments = position_arguments.split(',');
//   for (var i=0; i<position_arguments.length; i++) {
//     position_arguments[i] = parseFloat(position_arguments[i]);
//   }
//
//   /* Joint names */
//   name_arguments = name_arguments.split(',');
//
//
//   console.log('device: ', device);
//   console.log('name_arguments: ', name_arguments);
//   console.log('position_arguments: ', position_arguments);
//
//   var action = new ROSLIB.ActionClient({
//     ros: ros,
//     serverName: 'body/joint_trajectory_action',
//     actionName: 'control_msgs/FollowJointTrajectoryAction',
//     timeout: 10,
//   });
//
//   var goal = new ROSLIB.Goal({
//     actionClient: action,
//     goalMessage: {
//       trajectory: {
//         joint_names: name_arguments,
//         points: [{
//           positions: position_arguments
//         }]
//       }
//     }
//   });
