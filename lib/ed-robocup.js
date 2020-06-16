import _ from 'lodash';
import Ed from './ed';

const NAVIGATE_TYPES = {
  NAVIGATE_TO_PIXEL: 1,
  TURN_LEFT: 2,
  TURN_RIGHT: 3
};

export default class EdRobocup extends Ed {
  constructor(robot) {
    super(robot);
    const {ros} = robot;

    // World model database
    this.models = {};
    this.modelsService = ros.Service({
      name: 'ed/get_model_images',
      serviceType: 'ed_robocup_msgs/GetModelImages'
    });
    this.updateModels();

    // World model fitting
    this.fitModelService = ros.Service({
      name: 'ed/fit_entity_in_image',
      serviceType: 'ed_robocup_msgs/FitEntityInImage'
    });

    this.navigateToService = ros.Service({
      name: 'ed/navigate_to',
      serviceType: 'ed_sensor_integration_msgs/NavigateTo'
    });

    this.createWallsService = ros.Service({
      name: 'ed/create_walls',
      serviceType: 'std_srvs/Empty'
    });
  }

  /**
   * World model database
   */
  updateModels = () => {
    const request = {};

    this.modelsService.callService(request, response => {
      for (const model of response.models) {
        const {name, encoding, data} = model;
        this.models[name] = {
          src: `data:image/${encoding};base64,${data}`
        };
      }

      this.emit('models', this.models);
    }, message => {
      console.warn('update models failed:', message);
      _.delay(this.updateModels, 5000);
    });
  }

  /**
   * World model fitting
   */
  fit_model(model_name, px, py) {
    const request = {
      /* eslint camelcase:0 */
      entity_type: model_name,
      px,
      py
    };

    this.fitModelService.callService(request, response => {
      const {error_msg} = response;
      if (error_msg) {
        console.warn('fit model error:', error_msg);
      }
    });
  }

  undo_fit_model(callback) {
    const request = {
      undo_latest_fit: true
    };

    this.fitModelService.callService(request, response => {
      const {error_msg} = response;
      if (error_msg) {
        console.warn('fit model error:', error_msg);
        callback(error_msg);
      } else {
        callback(null);
      }
    }, err => {
      console.warn('fit model error:', err);
      callback(err);
    });
  }

  navigate_to(x, y, snapshot_id) {
    this.navigateToService.callService({
      snapshot_id,
      navigation_type: NAVIGATE_TYPES.NAVIGATE_TO_PIXEL,
      click_x_ratio: x,
      click_y_ratio: y
    }, result => {
      const {error_msg} = result;
      if (error_msg) {
        console.warn(error_msg);
      }
    });
  }

  create_walls(callback) {
    callback = callback || _.noop;
    this.createWallsService.callService({}, () => {
      callback();
    });
  }
}
