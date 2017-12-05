/* eslint no-unused-expressions: 0 */
import chai from 'chai';
import sinonChai from 'sinon-chai';
import {stub} from 'sinon';
import {Ros} from 'roslib';

import {Base} from '../lib';

chai.use(sinonChai);
chai.should();

const setup = () => {
  const ros = new Ros({
    encoding: 'ascii'
  });

  const robot = {
    ros
  };

  const fixtures = {
    ros,
    robot
  };

  return fixtures;
};

describe('Base', () => {
  let fixtures;
  let callOnConnection;

  let base;

  before('stub callOnConnection', () => {
    fixtures = setup();
    callOnConnection = stub(fixtures.ros, 'callOnConnection');
    callOnConnection.returns();

    base = new Base(fixtures.robot);
  });

  after('restore callOnConnection', () => {
    callOnConnection.restore();
  });

  describe('Base.sendTwist', () => {
    it('should send a message', () => {
      base.sendTwist(0.1, 0.2, 0.3);
      const expected = {angular: {x: 0, y: 0, z: 0.3}, linear: {x: 0.1, y: 0.2, z: 0}};

      callOnConnection.should.have.been.calledTwice;
      const message = callOnConnection.secondCall.args[0];
      message.op.should.equal('publish');
      message.topic.should.equal('base/references');
      message.msg.should.deep.equal(expected);
    });
  });
});
