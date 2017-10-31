import {EventEmitter2} from 'eventemitter2';
import {Message} from 'roslib';

class Body extends EventEmitter2 {
  constructor(robot) {
    super();

    const ros = robot.ros;

    this.action = new ROSLIB.ActionClient({
      ros: ros,
      serverName: 'body/joint_trajectory_action',
      actionName: 'control_msgs/FollowJointTrajectoryAction',
      timeout: 10,
    });

    // this.torso_joints = [""]

    // this.cmdVelTopic = ros.Topic({
    //   name: 'base/references',
    //   messageType: 'geometry_msgs/Twist'
    // });

  }  // End of constructor

  sendGoal(cmd) {
    console.log("Robot body: sending goal", cmd)

    var goal = new ROSLIB.Goal({
        actionClient: this.action,
        goalMessage: {
          trajectory: {
            joint_names: cmd.joint_names,
            points: [{positions: cmd.positions}]
          }
        }
      })

      goal.send(10.0)

      console.log("Body goal: ", goal)

    }

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
