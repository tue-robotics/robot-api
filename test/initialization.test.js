/* eslint no-unused-expressions: 0 */
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import {stub} from 'sinon';
import ROSLIB from 'roslib';
import {
  Base, Ed, Hardware, Head, Robot,
} from '../lib/index.js';

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

describe('Module initialization', () => {
  let fixtures;

  beforeEach('stub callOnConnection', () => {
    fixtures = setup();
    const callOnConnection = stub(fixtures.ros, 'callOnConnection');
    callOnConnection.throws();
  });

  afterEach('restore callOnConnection', () => {
    fixtures.ros.callOnConnection.restore();
  });

  // TODO: remove skipped modules
  const skipModules = new Set([Hardware, Head]);

  for (const Module in [Base, Ed, Hardware, Head].values()) { // eslint-disable-line guard-for-in
    describe(`${Module.name} initialization`, () => {
      const it2 = skipModules.has(Module) ? it.skip : it;

      it2('should do nothing on creation', () => {
        const m = new Module(fixtures.robot);

        m.should.be.ok;
        fixtures.ros.callOnConnection.should.not.have.been.called;
      });
    });
  }
});

describe('Robot initialization', () => {
  it('should not crash', () => {
    const robot = new Robot();
    robot.should.be.ok;
  });
});
