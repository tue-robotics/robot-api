/* eslint no-unused-expressions: 0 */
/* eslint no-use-extend-native/no-use-extend-native: 0 */
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import {stub} from 'sinon';
import ROSLIB from 'roslib';
import {Hardware} from '../lib/index.js';

chai.use(sinonChai);
chai.should();

const setup = () => {
  const ros = new ROSLIB.Ros({
    encoding: 'ascii',
  });

  const robot = {
    ros,
  };

  const fixtures = {
    ros,
    robot,
  };

  return fixtures;
};

describe('Hardware', () => {
  let fixtures;
  let callOnConnection;

  let hardware;

  before('stub callOnConnection', () => {
    fixtures = setup();
    callOnConnection = stub(fixtures.ros, 'callOnConnection');
    callOnConnection.returns();

    hardware = new Hardware(fixtures.robot);
  });

  beforeEach('reset stub callOnConnection', () => {
    callOnConnection.reset();
  });

  after('restore callOnConnection', () => {
    callOnConnection.restore();
  });

  describe('Hardware.send_command', () => {
    it('should send a start command to the head', () => {
      hardware.send_command('all', 'home');

      const expected = {data: [0, 21]};

      callOnConnection.should.have.been.calledTwice;
      const message = callOnConnection.secondCall.args[0];
      message.op.should.equal('publish');
      message.topic.should.equal('dashboard_ctrlcmds');
      message.msg.should.deep.equal(expected);
    });

    const bodyParts = {
      /* eslint camelcase:0 */
      all: 0,
      base: 1,
      spindle: 2,
      left_arm: 3,
      right_arm: 4,
      head: 5,
    };

    for (const name in bodyParts) { // eslint-disable-line guard-for-in
      it(`it should work for the bodypart ${name}`, () => {
        hardware.send_command(name, 'home');
        const expected = {data: [bodyParts[name], 21]};

        callOnConnection.should.have.been.calledOnce;
        const message = callOnConnection.lastCall.args[0];
        message.msg.should.deep.equal(expected);
      });
    }

    const commands = {
      home: 21,
      start: 22,
      stop: 23,
      reset: 24,
    };

    for (const name in commands) { // eslint-disable-line guard-for-in
      it(`it should work for the command ${name}`, () => {
        hardware.send_command('all', name);
        const expected = {data: [0, commands[name]]};

        callOnConnection.should.have.been.calledOnce;
        const message = callOnConnection.lastCall.args[0];
        message.msg.should.deep.equal(expected);
      });
    }

    it('should throw for an unknown bodypart', () => {
      (function () {
        hardware.send_command('ear', 'home');
      }).should.throw(RangeError);
    });

    it('should throw for an unknown command', () => {
      (function () {
        hardware.send_command('all', 'dance');
      }).should.throw(RangeError);
    });
  });
});
