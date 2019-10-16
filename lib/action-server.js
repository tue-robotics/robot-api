import {EventEmitter2} from 'eventemitter2';
import {ActionClient, Goal} from 'roslib';

class ActionServer extends EventEmitter2 {
  constructor(robot) {
    super();
    const {ros} = robot;

    // Action client
    this.actionClient = new ActionClient({
      ros,
      serverName: 'action_server/task',
      actionName: 'action_server_msgs/TaskAction'
    });
  }

  doAction(recipe) {
    // Create actionlib goal
    const that = this;
    const goal = new Goal({
      actionClient: this.actionClient,
      goalMessage: {
        recipe: JSON.stringify(recipe)
      }
    });

    // Add feedback callback
    goal.on('feedback', feedback => {
      that.emit('feedback', feedback);
    });

    // Add status callback
    goal.on('status', status => {
      that.emit('status', status);
    });

    // Send goal
    goal.send();
  }

  cancelAllActions() {
    this.actionClient.cancel();
  }
}

export default ActionServer;
