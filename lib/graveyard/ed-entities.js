

class EdEntities {
  constructor(ros) {
    console.log('init EdEntities');

    // World model entities
    this.entities = [];
    this.meshes = {};
    this.entities_topic = ros.Topic({
      name: 'ed/gui/entities',
      messageType: 'ed_gui_server_msgs/EntityInfos',
      throttle_rate: 5000,
    });
    // this.entities_topic.subscribe(this.onEntities.bind(this));
  }
}

/**
 * World model entities
 */

Object.defineProperty(EdEntities.prototype, 'entities', {
  get: function() {
    return this._entities;
  },
  set: function(entities) {
    this._entities = entities;
    this.emit('entities', entities);
  }
});

EdEntities.prototype.onEntities = function(msg) {
  console.log(msg);
  this.entities = msg.entities;

  var mesh_queue = [];
  this.entities.forEach(function (entity) {
    if (this.meshes[entity.id] && this.meshes[entity.id].revision === entity.mesh_revision) {
      console.log('correct revision');
    } else {
      mesh_queue.push(entity.id);
    }
  }.bind(this));

  console.log(mesh_queue);
  var request = { entity_ids: mesh_queue};
  this.query_meshes_service.callService(request, function (response) {
    var error_msg = response.error_msg;
    if (error_msg) {
      console.warn('query_meshes_service:', error_msg);
    }

    response.entity_ids.forEach(function (id, i) {
      // TODO: check revisions
      this.meshes[id] = response.meshes[i];
    }.bind(this));
  }.bind(this));
};

export default EdEntities;
