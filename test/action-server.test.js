/* eslint no-unused-expressions: 0 */
import chai from 'chai';
import sinonChai from 'sinon-chai';
import {stub} from 'sinon';
import {Ros} from 'roslib';

import {ActionServer} from '../lib';

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

describe('ActionServer', () => {
  let fixtures;
  let callOnConnection;

  let actionServer;

  before('stub callOnConnection', () => {
    fixtures = setup();
    callOnConnection = stub(fixtures.ros, 'callOnConnection');
    callOnConnection.returns();

    actionServer = new ActionServer(fixtures.robot);
  });

  after('restore callOnConnection', () => {
    callOnConnection.restore();
  });

  describe('ActionServer.doAction', () => {
    it('should send a service call', () => {
      actionServer.doAction('pick-up', 'chair');

      const expected = {action: 'pick-up', parameters: '{"entity":{"id":"chair"}}'};

      callOnConnection.should.have.been.calledOnce;
      const message = callOnConnection.firstCall.args[0];
      message.op.should.equal('call_service');
      message.service.should.equal('action_server/add_action');
      message.args.should.deep.equal(expected);
    });
  });
});
