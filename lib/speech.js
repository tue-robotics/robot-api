import {EventEmitter2} from 'eventemitter2';
import {Message} from 'roslib';

class Speech extends EventEmitter2 {
  constructor(robot) {
    super();

    const ros = robot.ros;

    this.speechTopic = ros.Topic({
      name: '/amigo/text_to_speech/input',
      messageType: 'std_msgs/String'
    });

  }

  speak(vx, vy, vth) {
    // publish the command
    const twist = new Message({
      angular: {
        x: 0,
        y: 0,
        z: vth
      },
      linear: {
        x: vx,
        y: vy,
        z: 0
      }
    });
    this.cmdVelTopic.publish(twist);
    // console.log(this.cmdVelTopic);
    // console.log(twist);
    console.log(`sendTwist: ${vx}, ${vy}, ${vth}`);
  }
