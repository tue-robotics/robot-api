import EventEmitter2 from 'eventemitter2';
import ServiceRequest from 'roslib';

class Ed extends EventEmitter2 {
  constructor(robot) {
    super();
    const {ros} = robot;

    this.queryService = ros.Service({
      name: 'ed/query',
      serviceType: 'ed_msgs/Query',
    });

    this.resetService = ros.Service({
      name: 'ed/reset',
      serviceType: 'ed_msgs/Reset',
    });
    this.entities = new Map();
    this.revision = 0;
  }

  #updateEntities(entities) {
    const add = [];
    const update = [];
    const remove = [];

    for (const entity of entities) {
      const {id} = entity;
      const newObject = {id};

      if (this.entities.has(id)) {
        // update object
        const oldObject = this.entities.get(id);

        if (Object.hasOwn(entity, 'pose')) {
          const {position, quaternion} = parseEdPosition(entity.pose);
          newObject.position = position;
          newObject.quaternion = quaternion;
        } else {
          // use the old position
          oldObject.position && (newObject.position = oldObject.position);
          oldObject.quaternion && (newObject.quaternion = oldObject.quaternion);
        }

        if (Object.hasOwn(entity, 'mesh')) {
          const {vertices, faces} = parseEdMesh(entity.mesh);
          newObject.vertices = vertices;
          newObject.faces = faces;
        } else if (Object.hasOwn(entity, 'convex_hull')) {
          const {vertices, faces} = parseEdConvexHull(entity.convex_hull);
          newObject.vertices = vertices;
          newObject.faces = faces;
        } else {
          // use the old mesh
          oldObject.vertices && (newObject.vertices = oldObject.vertices);
          oldObject.faces && (newObject.faces = oldObject.faces);
        }

        this.entities.set(id, newObject);

        // only queue full objects for update
        const properties = ['position', 'quaternion', 'vertices', 'faces'];
        if (properties.every(key => Object.hasOwn(newObject, key))) {
          update.push([newObject, oldObject]);
        }
      } else {
        // add object

        if (Object.hasOwn(entity, 'pose')) {
          const {position, quaternion} = parseEdPosition(entity.pose);
          newObject.position = position;
          newObject.quaternion = quaternion;
        }

        if (Object.hasOwn(entity, 'mesh')) {
          const {vertices, faces} = parseEdMesh(entity.mesh);
          newObject.vertices = vertices;
          newObject.faces = faces;
        } else if (Object.hasOwn(entity, 'convex_hull')) {
          const {vertices, faces} = parseEdConvexHull(entity.convex_hull);
          newObject.vertices = vertices;
          newObject.faces = faces;
        }

        this.entities.set(id, newObject);

        // only queue full objects for update
        const properties = ['position', 'quaternion', 'vertices', 'faces'];
        if (properties.every(key => Object.hasOwn(newObject, key))) {
          add.push(newObject);
        }
      }
    }

    // TODO: parse 'remove_entities'

    // invoke callbacks
    for (const data of add) {
      this.emit('entities.add', data);
    }

    for (const data of update) {
      this.emit('entities.update', ...data);
    }

    for (const data of remove) {
      this.emit('entities.remove', data);
    }
  }

  query(callback) {
    const request = new ServiceRequest({
      /* eslint-disable camelcase -- ROS message fields use snake_case */
      // string[] ids
      // string[] properties
      since_revision: this.revision,
      /* eslint-enable camelcase */
    });

    this.queryService.callService(request, response => {
      /* eslint-disable camelcase -- ROS response fields use snake_case */
      const {new_revision} = response;

      if (new_revision <= this.revision) {
        console.error('ed:query incorrect revision');
        return;
      }

      this.revision = new_revision;
      /* eslint-enable camelcase */

      const data = JSON.parse(response.human_readable);

      this.#updateEntities(data.entities);

      callback && callback();
    }, error => {
      console.error(`ed:query callService ${this.queryService.name} failed:`, error);
    });
  }

  /**
   Resets the world model
   @param {boolean} keepShapes - indicates whether all objects with shapes (e.g., furniture must be kept)
   */
  reset(keepShapes) {
    // Setup the request
    const request = new ServiceRequest({
      /* eslint-disable-next-line camelcase -- ROS message field uses snake_case */
      keep_all_shapes: keepShapes,
    });

    // Send the request
    // console.log("Reset request: ", request);
    this.resetService.callService(request);
  }

  watch(callbacks) {
    if (callbacks.add) {
      this.on('entities.add', callbacks.add);
    }

    if (callbacks.update) {
      this.on('entities.update', callbacks.update);
    }

    if (callbacks.remove) {
      this.on('entities.remove', callbacks.remove);
    }
  }
}

function parseEdPosition(pose) {
  return {
    position: [pose.x, pose.y, pose.z],
    quaternion: [pose.qx, pose.qy, pose.qz, pose.qw],
  };
}

function parseEdConvexHull(chull) {
  // Add vertices
  const vertices = [];
  for (const point of chull.points) {
    vertices.push([point.x, point.y, chull.z_min], [point.x, point.y, chull.z_max]);
  }

  const faces = [];

  // Calculate top and bottom triangles
  for (let i = 1; i < chull.points.length - 1; i++) {
    const i2 = 2 * i;

    // bottom, top
    faces.push([i2 + 2, i2, 0], [i2 + 1, i2 + 3, 1]);
  }

  // Calculate side triangles
  for (let i = 0; i < chull.points.length; i++) {
    const i2 = (i + 1) % chull.points.length;
    faces.push([i2 * 2, (i * 2) + 1, i * 2], [i2 * 2, (i2 * 2) + 1, (i * 2) + 1]);
  }

  return {vertices, faces};
}

function parseEdMesh(mesh) {
  const vertices = Array.from(mesh.vertices, vertex => [
    vertex.x,
    vertex.y,
    vertex.z,
  ]);

  const faces = Array.from(mesh.triangles, triangle => [
    triangle.i1,
    triangle.i2,
    triangle.i3,
  ]);

  return {vertices, faces};
}

export default Ed;
