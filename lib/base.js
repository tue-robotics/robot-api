import {EventEmitter2} from 'eventemitter2';
import {Message} from 'roslib';

class Base extends EventEmitter2 {
  constructor(robot) {
    super();

    const {ros} = robot;

    this.cmdVelTopic = ros.Topic({
      name: 'base/references',
      messageType: 'geometry_msgs/Twist',
    });

    this.localPlannerTopic = ros.Topic({
      name: 'local_planner/action_server/goal',
      messageType: 'cb_base_navigation_msgs/LocalPlannerActionGoal',
    });
  }

  sendTwist(vx, vy, vth) {
    // publish the command
    const twist = new Message({
      angular: {
        x: 0,
        y: 0,
        z: vth,
      },
      linear: {
        x: vx,
        y: vy,
        z: 0,
      },
    });
    this.cmdVelTopic.publish(twist);
    // console.log(this.cmdVelTopic);
    // console.log(twist);
    console.log(`sendTwist: ${vx}, ${vy}, ${vth}`);
  }

  sendLocalPlannerGoal(plan, look_at_x, look_at_y) {
    // std_msgs/Header header
    //   uint32 seq
    //   time stamp
    //   string frame_id
    // actionlib_msgs/GoalID goal_id
    //   time stamp
    //   string id
    // cb_base_navigation_msgs/LocalPlannerGoal goal
    //   geometry_msgs/PoseStamped[] plan
    //     std_msgs/Header header
    //       uint32 seq
    //       time stamp
    //       string frame_id
    //     geometry_msgs/Pose pose
    //       geometry_msgs/Point position
    //         float64 x
    //         float64 y
    //         float64 z
    //       geometry_msgs/Quaternion orientation
    //         float64 x
    //         float64 y
    //         float64 z
    //         float64 w
    //   cb_base_navigation_msgs/OrientationConstraint orientation_constraint
    //     string frame
    //     geometry_msgs/Point look_at
    //       float64 x
    //       float64 y
    //       float64 z
    //     float64 angle_offset

    // publish the command
    const goal = new Message({
      /* eslint camelcase:0 */
      goal: {
        plan,
        orientation_constraint: {
          frame: '/map',
          look_at: {
            x: look_at_x,
            y: look_at_y,
          },
        },
      },
    });
    this.localPlannerTopic.publish(goal);
    // console.log(this.cmdVelTopic);
    // console.log(twist);
    console.log(`sendGoal to local planner: ${goal}`);
  }
}

export default Base;
