import {EventEmitter2} from 'eventemitter2';
import {Message} from 'roslib';

/**
 * Class exposes the interface to the text to speech 
 * module of the robot
 */
class Speech extends EventEmitter2 {

  /**
   * Constructor
   * @param {Robot} robot: Robot object of which this body is a part of
   */
  constructor(robot) {
    super();

    const ros = robot.ros;

    // Setup the speech topic
    this.speechTopic = ros.Topic({
      name: 'text_to_speech/input',
      messageType: 'std_msgs/String'
    });

  }  // End of constructor

  /**
   * Sends a speech command to the tts module
   * @param {object} cmd: contains 'sentence' mapping to the string the 
   * robot should pronounce.
   */
  speak(cmd) {

    console.log("Speaking: ", cmd)

    // Create the message
    var msg = new Message({
      data: cmd.sentence
    });

    // Publish the message
    this.speechTopic.publish(msg);

  }  // End of speak

}  // End of class Speech

export default Speech;
