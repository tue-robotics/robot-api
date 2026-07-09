import _ from 'lodash';
import Ed from './ed.js';

const NAVIGATE_TYPES = {
  NAVIGATE_TO_PIXEL: 1,
  TURN_LEFT: 2,
  TURN_RIGHT: 3,
};

export default class EdRobocup extends Ed {
  /**
   World model database
   */
  updateModels = () => {
    const request = {};

    this.modelsService.callService(request, response => {
      for (const model of response.models) {
        const {name, encoding, data} = model;
        this.models[name] = {
          src: `data:image/${encoding};base64,${data}`,
        };
      }

      this.emit('models', this.models);
    }, message => {
      console.warn('update models failed:', message);
      _.delay(this.updateModels, 5000);
    });
  };

  constructor(robot) {
    super(robot);
    const {ros} = robot;

    // World model database
    this.models = {};
    this.modelsService = ros.Service({
      name: 'ed/get_model_images',
      serviceType: 'ed_robocup_msgs/GetModelImages',
    });
    this.updateModels();

    // World model fitting
    this.fitModelService = ros.Service({
      name: 'ed/fit_entity_in_image',
      serviceType: 'ed_robocup_msgs/FitEntityInImage',
    });

    this.navigateToService = ros.Service({
      name: 'ed/navigate_to',
      serviceType: 'ed_sensor_integration_msgs/NavigateTo',
    });

    this.createWallsService = ros.Service({
      name: 'ed/create_walls',
      serviceType: 'std_srvs/Empty',
    });
  }

  /**
   World model fitting
   @param {string} modelName - Name of the model to fit
   @param {number} px - X pixel coordinate
   @param {number} py - Y pixel coordinate
   */
  fitModel(modelName, px, py) {
    const request = {
      /* eslint-disable-next-line camelcase -- ROS service field name uses snake_case */
      entity_type: modelName,
      px,
      py,
    };

    this.fitModelService.callService(request, response => {
      const {error_msg: errorMessage} = response;
      if (errorMessage) {
        console.warn('fit model error:', errorMessage);
      }
    });
  }

  undoFitModel(callback) {
    const request = {
      /* eslint-disable-next-line camelcase -- ROS service field name uses snake_case */
      undo_latest_fit: true,
    };

    this.fitModelService.callService(request, response => {
      const {error_msg: errorMessage} = response;
      if (errorMessage) {
        console.warn('fit model error:', errorMessage);
        callback(errorMessage);
      } else {
        callback(null);
      }
    }, error => {
      console.warn('fit model error:', error);
      callback(error);
    });
  }

  navigateTo(x, y, snapshotId) {
    this.navigateToService.callService({
      /* eslint-disable camelcase -- ROS service fields use snake_case */
      snapshot_id: snapshotId,
      navigation_type: NAVIGATE_TYPES.NAVIGATE_TO_PIXEL,
      click_x_ratio: x,
      click_y_ratio: y,
      /* eslint-enable camelcase */
    }, result => {
      const {error_msg: errorMessage} = result;
      if (errorMessage) {
        console.warn(errorMessage);
      }
    });
  }

  createWalls(callback) {
    callback ||= _.noop;
    this.createWallsService.callService({}, () => {
      callback();
    });
  }
}
