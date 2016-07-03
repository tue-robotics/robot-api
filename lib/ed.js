import {EventEmitter2} from 'eventemitter2';
import {ServiceRequest} from 'roslib';

const hasOwnProperty = Object.prototype.hasOwnProperty;

class Ed extends EventEmitter2 {

  constructor(robot) {
    super();
    const ros = robot.ros;

    this.queryService = ros.Service({
      name: 'ed/query',
      serviceType: 'ed/Query'
    });
  }

  entities = new Map();

  revision = 0;
  query(callback) {
    const request = new ServiceRequest({
      /* eslint camelcase:0 */
      // string[] ids
      // string[] properties
      since_revision: this.revision
    });

    this.queryService.callService(request, response => {
      const new_revision = response.new_revision;

      if (new_revision <= this.revision) {
        console.error('ed:query incorrect revision');
        return;
      }
      this.revision = new_revision;

      const data = JSON.parse(response.human_readable);

      this._updateEntities(data.entities);

      callback && callback();
    }, error => {
      console.error(`ed:query callService ${this.queryService.name} failed:`, error);
    });
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

  _updateEntities(entities) {
    const add = [];
    const update = [];
    const remove = [];

    for (const entity of entities) {
      const id = entity.id;
      const newObj = {id};

      if (this.entities.has(id)) {
        // update object
        const oldObj = this.entities.get(id);

        if (hasOwnProperty.call(entity, 'pose')) {
          const {position, quaternion} = parseEdPosition(entity.pose);
          newObj.position = position;
          newObj.quaternion = quaternion;
        } else {
          // use the old position
          oldObj.position && (newObj.position = oldObj.position);
          oldObj.quaternion && (newObj.quaternion = oldObj.quaternion);
        }

        if (hasOwnProperty.call(entity, 'mesh')) {
          const {vertices, faces} = parseEdMesh(entity.mesh);
          newObj.vertices = vertices;
          newObj.faces = faces;
        } else if (hasOwnProperty.call(entity, 'convex_hull')) {
          const {vertices, faces} = parseEdConvexHull(entity.convex_hull);
          newObj.vertices = vertices;
          newObj.faces = faces;
        } else {
          // use the old mesh
          oldObj.vertices && (newObj.vertices = oldObj.vertices);
          oldObj.faces && (newObj.faces = oldObj.faces);
        }

        this.entities.set(id, newObj);

        // only queue full objects for update
        const props = ['position', 'quaternion', 'vertices', 'faces'];
        if (props.every(key => key in newObj)) {
          update.push([newObj, oldObj]);
        }
      } else {
        // add object

        if (hasOwnProperty.call(entity, 'pose')) {
          const {position, quaternion} = parseEdPosition(entity.pose);
          newObj.position = position;
          newObj.quaternion = quaternion;
        }

        if (hasOwnProperty.call(entity, 'mesh')) {
          const {vertices, faces} = parseEdMesh(entity.mesh);
          newObj.vertices = vertices;
          newObj.faces = faces;
        } else if (hasOwnProperty.call(entity, 'convex_hull')) {
          const {vertices, faces} = parseEdConvexHull(entity.convex_hull);
          newObj.vertices = vertices;
          newObj.faces = faces;
        }

        this.entities.set(id, newObj);

        // only queue full objects for update
        const props = ['position', 'quaternion', 'vertices', 'faces'];
        if (props.every(key => key in newObj)) {
          add.push(newObj);
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
}

function parseEdPosition(pose) {
  return {
    position: [pose.x, pose.y, pose.z],
    quaternion: [pose.qx, pose.qy, pose.qz, pose.qw]
  };
}

function parseEdConvexHull(chull) {
  // Add vertices
  const vertices = [];
  for (const point of chull.points) {
    vertices.push([point.x, point.y, chull.z_min]);
    vertices.push([point.x, point.y, chull.z_max]);
  }

  const faces = [];

  // Calculate top and bottom triangles
  for (let i = 1; i < chull.points.length - 1; i++) {
    const i2 = 2 * i;

    // bottom
    faces.push([i2 + 2, i2, 0]);

    // top
    faces.push([i2 + 1, i2 + 3, 1]);
  }

  // Calculate side triangles
  for (let i = 0; i < chull.points.length; i++) {
    const j = (i + 1) % chull.points.length;
    faces.push([j * 2, i * 2 + 1, i * 2]);
    faces.push([j * 2, j * 2 + 1, i * 2 + 1]);
  }

  return {vertices, faces};
}

function parseEdMesh(mesh) {
  const vertices = [];
  for (const vertex of mesh.vertices) {
    vertices.push([
      vertex.x,
      vertex.y,
      vertex.z
    ]);
  }

  const faces = [];
  for (const triangle of mesh.triangles) {
    faces.push([
      triangle.i1,
      triangle.i2,
      triangle.i3
    ]);
  }

  return {vertices, faces};
}

export default Ed;
