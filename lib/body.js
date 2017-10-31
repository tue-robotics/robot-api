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

    // this.cmdVelTopic = ros.Topic({
    //   name: 'base/references',
    //   messageType: 'geometry_msgs/Twist'
    // });

  }  // End of constructor

}  // End of class Body

export default Body;
