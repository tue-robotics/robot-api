/* eslint no-unused-expressions: 0 */
import chai from 'chai';
import sinonChai from 'sinon-chai';
import {stub, useFakeTimers} from 'sinon';

import {Robot} from '../lib';

chai.use(sinonChai);
const should = chai.should();

describe('Robot', () => {
  const exampleUrl = 'ws://example.com:9090';

  let robot;
  beforeEach('create a robot', () => {
    robot = new Robot();
  });

  let connect;
  beforeEach('stub connect', () => {
    connect = stub(robot.ros, 'connect');
    connect.returns();
  });

  afterEach('restore connect', () => {
    connect.restore();
  });

  describe('Robot.connect', () => {
    it('should connect to a custom url', () => {
      connect.should.have.not.been.called;
      robot.connect(exampleUrl);
      connect.should.have.been.calledOnce;
      connect.should.have.been.calledWithExactly(exampleUrl);
    });

    it('should connect to a default url', () => {
      connect.should.have.not.been.called;
      robot.connect();
      connect.should.have.been.calledOnce;
      connect.should.have.been.calledWithMatch(/ws:\/\/[a-zA-Z0-9-]+:9090/);
    });

    it('should remember the previous url', () => {
      connect.should.have.not.been.called;

      robot.connect(exampleUrl);
      connect.should.have.been.calledOnce;

      robot.connect();
      connect.should.have.been.calledTwice;
      connect.should.always.have.been.calledWithExactly(exampleUrl);
    });
  });

  describe('Robot.status', () => {
    /**
     * Stubs
     */
    let send;
    beforeEach('stub ros.socket.send', () => {
      // stub callOnConnection to prevent sending something on the websocket
      should.not.exist(null);
      should.not.exist(robot.ros.socket);

      send = stub();
      send.returns();
      robot.ros.socket = {
        send
      };
    });

    afterEach('stub callOnConnection', () => {
      robot.ros.socket = null;
    });

    let clock;
    beforeEach('stub setTimeout', () => {
      clock = useFakeTimers();
    });

    afterEach('restore setTimeout', () => {
      clock.restore();
    });

    /**
     * Tests
     */
    it.skip('should have a default status', () => {
      robot.status.should.equal('closed');
    });

    it('should respond to the ros::connection event', () => {
      robot.connect(exampleUrl);
      robot.status.should.equal('connecting');
      connect.should.have.been.calledOnce;
      connect.should.have.been.calledWithExactly(exampleUrl);

      robot.ros.emit('connection');
      robot.status.should.equal('connected');
    });

    it('should reconnect after the ros::closed event', () => {
      robot.connect(exampleUrl);
      connect.should.have.been.calledOnce;
      connect.should.have.been.calledWithExactly(exampleUrl);

      robot.ros.emit('close');
      robot.status.should.equal('closed');
      clock.tick(500);

      connect.should.have.been.calledOnce;
      connect.should.have.been.calledWithExactly(exampleUrl);

      clock.tick(5000);

      connect.should.have.been.calledTwice;
      connect.should.always.have.been.calledWithExactly(exampleUrl);
    });

    it('should respond to the ros::error event', () => {
      robot.ros.emit('error');
      robot.status.should.equal('error');
    });
  });
});
