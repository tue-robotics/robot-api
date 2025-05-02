import EventEmitter2 from 'eventemitter2';
import ROSLIB from 'roslib';

class ActionServer extends EventEmitter2 {
  constructor(robot) {
    super();
    const {ros} = robot;

    // Action client
    this.actionClient = new ROSLIB.ActionClient({
      ros,
      serverName: 'action_server/task',
      actionName: 'action_server_msgs/TaskAction',
    });
  }

  doAction(recipe) {
    // Create actionlib goal
    const goal = new ROSLIB.Goal({
      actionClient: this.actionClient,
      goalMessage: {
        recipe: JSON.stringify(recipe),
      },
    });

    // Add feedback callback
    goal.on('feedback', feedback => {
      this.emit('feedback', feedback);
    });

    // Add status callback
    goal.on('status', status => {
      this.emit('status', status);
    });

    // Send goal
    goal.send();
  }

  cancelAllActions() {
    this.actionClient.cancel();
  }
}

export default ActionServer;
