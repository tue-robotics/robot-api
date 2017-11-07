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

  }  // End of constructor

  speak(cmd) {

    console.log("Speaking: ", cmd)

    // Create the message
    var msg = new Message({
      data: cmd.sentence
    });

    // Publish the message
    this.speechTopic.publish(msg);

  }  // End of speak

};  // End of class Speech

export default Speech;
