import _ from 'lodash';

/**
 * World model snapshots
 */
class EdSnapshots  {
  constructor(ros) {
    console.log('init EdSnapshots', this);

    this.snapshots = {};
    this.snapshot_revision = 0;
    this.snapshot_service = ros.Service({
      name: 'ed/gui/get_snapshots',
      serviceType: 'ed_sensor_integration_msgs/GetSnapshots',
    });

    this.delete_snapshot_queue = [];

    // timer_id to avoid updating while one is in progress
    // during an update, it will be null
    this.snapshots_timer_id = null;
    // this.start_update_loop();

    this.make_snapshot_service = ros.Service({
      name: 'ed/make_snapshot',
      serviceType: 'ed_sensor_integration_msgs/MakeSnapshot',
    })
  }
}

/**
 * World model snapshots
 */

EdSnapshots.prototype.update_snapshots = function(callback, max_num_revisions) {
  callback = callback || _.noop;
  max_num_revisions = max_num_revisions || 0;

  var request = {
    revision: this.snapshot_revision,
    delete_ids: this.delete_snapshot_queue,
    max_num_revisions: max_num_revisions,
  };
  if (this.delete_snapshot_queue.length) {
    console.log('deleting snapshots:', this.delete_snapshot_queue);
    this.snapshots = _.omit(this.snapshots, this.delete_snapshot_queue);
    this.delete_snapshot_queue = [];
  }

  var start_time = new Date();

  // console.debug('update %d snapshots', max_num_revisions);
  this.snapshot_service.callService(request, function (response) {
    var diff = new Date() - start_time;
    this.emit('update_time', diff);
    if (!response.new_revision && _.size(this.snapshots) || // revision 0 && old snapshots
        response.new_revision < this.snapshot_revision) {
      console.warn('ed restart detected, reloading...');
      this.snapshots = {}; // clear snapshots
      this.update_models(); // reload model db
    }
    this.snapshot_revision = response.new_revision;

    var snapshots = process_snapshots(response);
    _.assign(this.snapshots, snapshots);

    this.emit('snapshots', this.snapshots);

    callback(null, snapshots);
  }.bind(this), function (err) {
    console.warn('update_snapshots failed:', err);
    callback(err, null);
  }.bind(this));
};

function process_snapshots (response) {
  var snapshots = {};

  response.image_ids.forEach(function (id, i) {
    var image_binary = response.images[i];

    var encoding = image_binary.encoding;
    image_binary.src = 'data:image/' + encoding + ';base64,' + image_binary.data;
    image_binary.short_id = _.trunc(id, {
      'length': 8,
      'omission': '',
    });
    image_binary.id = id;

    var ts = response.image_timestamps[i];
    image_binary.timestamp = new Date(ts.secs + ts.nsecs*1e-9);

    snapshots[id] = image_binary;
  }.bind(this));

  return snapshots;
}

EdSnapshots.prototype.delete_snapshot = function(id) {
  this.delete_snapshot_queue.push(id);
  this.force_update();
};

EdSnapshots.prototype.start_update_loop = function () {
  this.snapshots_timer_id = null;
  this.update_snapshots(function update_again(err, new_snapshots) {
    // console.debug('i got %d new snapshots', _.size(new_snapshots));

    var delay = 500;
    if (err) {
      delay = 5000;
    } else if (_.size(_.omit(new_snapshots, 'current'))) {
      delay = 0;
    }

    this.snapshots_timer_id = _.delay(function (callback) {
      this.snapshots_timer_id = null;
      this.update_snapshots(callback);
    }.bind(this), delay, update_again.bind(this));
  }.bind(this), 1);
};

EdSnapshots.prototype.force_update = function() {
  if (this.snapshots_timer_id) {
    console.log('force update');
    window.clearTimeout(this.snapshots_timer_id);
    this.snapshots_timer_id = null;
    this.start_update_loop();
  } else {
    // else an update is already in progress
    console.log('update is already in progress');
  }
};

EdSnapshots.prototype.make_snapshot = function(callback) {
  this.make_snapshot_service.callService(null, callback);
  this.force_update();
};

export default EdSnapshots;
