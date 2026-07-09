import EventEmitter2 from 'eventemitter2';
import ROSLIB from 'roslib';

class Head extends EventEmitter2 {
  constructor(robot) {
    super();

    const {ros} = robot;

    this.getImageService = ros.Service({
      name: 'ed/get_image',
      serviceType: 'rgbd_msgs/GetRGBD',
    });

    this.goal = null;
    this.headAc = ros.ActionClient({
      serverName: 'head_ref/action_server',
      actionName: 'head_ref_msgs/HeadReferenceAction',
    });
  }

  /**
   Get a rgbd image from the kinect
   @param {number} width Width of the requested image
   @param {(rgbUrl: string|null, depthUrl: string|null, timeDiff: number) => void} callback Callback with the Image
   */
  getImage(width = 128, callback) {
    // uint8 JPEG=0
    // uint8 PNG=1
    const request = new ROSLIB.ServiceRequest({
      width,
      compression: 0,
    });
    const startTime = Date.now();
    this.getImageService.callService(request, response => {
      const timeDiff = Date.now() - startTime;

      /* eslint-disable camelcase -- ROS response fields use snake_case */
      const {rgb_data, depth_data} = response;

      if (rgb_data) {
        const rgbImageUrl = `data:image/jpeg;base64,${rgb_data}`;
        const depthImageUrl = `data:image/jpeg;base64,${depth_data}`;
        /* eslint-enable camelcase */

        callback(rgbImageUrl, depthImageUrl, timeDiff);
      } else {
        callback(null, null, timeDiff);
      }

      this.emit('update_time', timeDiff);
    }, error => {
      console.error(`Head:getImage callService ${this.getImageService.name} failed:`, error);
    });
  }

  sendPanTiltGoal(pan, tilt) {
    this.goal = new ROSLIB.Goal({
      actionClient: this.headAc,
      goalMessage: {
        /* eslint-disable camelcase -- ROS action message fields use snake_case */
        // either LOOKAT or PAN_TILT
        goal_type: 1,

        // [1-255] (action client calls with the same priority cancel each other)
        priority: 0,

        pan_vel: 1,
        tilt_vel: 1,

        // in case of LOOKAT:
        target_point: {},

        // in case of PAN_TILT
        pan,
        tilt,

        // goal cancels automatically after this time (seconds), if 0, no auto cancel
        end_time: 0,
        /* eslint-enable camelcase */
      },
    });

    this.goal.send();
  }

  cancelGoal() {
    if (this.goal) {
      this.goal.cancel();
    }
  }

  cancelAllGoals() {
    this.headAc.cancel();
  }
}

export default Head;
