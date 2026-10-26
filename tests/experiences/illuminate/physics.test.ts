import { describe, expect, it } from "bun:test";
import {
  createFixedStepper,
  createIlluminatePhysics,
  FIXED_STEP,
} from "../../../app/experiences/illuminate/physics";

function stepsForOneSecond(fps: number) {
  const stepper = createFixedStepper();
  let steps = 0;
  for (let frame = 0; frame < fps; frame++) steps += stepper.advance(1 / fps);
  return steps;
}

/** Seconds until a light dropped from the legacy spawn height falls asleep on the ground. */
function settleTime() {
  const physics = createIlluminatePhysics();
  physics.addLight({ x: 0, y: 25, z: 6 }, { x: 0, y: 0, z: 0 });
  let time = 0;
  while (!physics.isSleeping(0) && time < 20) {
    physics.step(1 / 60);
    time += 1 / 60;
  }
  physics.dispose();
  return time;
}

describe("createFixedStepper", () => {
  it("should advance 60 steps over one second when frames run at 30 fps", () => {
    expect(stepsForOneSecond(30)).toBe(60);
  });

  it("should advance 60 steps over one second when frames run at 60 fps", () => {
    expect(stepsForOneSecond(60)).toBe(60);
  });

  it("should advance 60 steps over one second when frames run at 120 fps", () => {
    expect(stepsForOneSecond(120)).toBe(60);
  });

  it("should cap the steps of a single long frame", () => {
    expect(createFixedStepper({ maxSubSteps: 5 }).advance(2)).toBe(5);
  });

  it("should use a 1/60 s step like the legacy per-frame step", () => {
    expect(FIXED_STEP).toBe(1 / 60);
  });
});

describe("createIlluminatePhysics", () => {
  it("should use the legacy effective contact values between a light and the ground", () => {
    const physics = createIlluminatePhysics();
    const contact = physics.contact("light", "ground");
    expect([contact.friction, contact.restitution]).toEqual([0.01, 0.3025]);
    physics.dispose();
  });

  it("should use the legacy effective contact values between a light and the text", () => {
    const physics = createIlluminatePhysics();
    const contact = physics.contact("light", "text");
    expect([contact.friction, contact.restitution]).toEqual([0.01, 0.3025]);
    physics.dispose();
  });

  it("should use the legacy effective contact values between two lights", () => {
    const physics = createIlluminatePhysics();
    const contact = physics.contact("light", "light");
    expect([contact.friction, contact.restitution]).toEqual([0.01, 0.3025]);
    physics.dispose();
  });

  it("should use the world default contact values between a light and the wall", () => {
    const physics = createIlluminatePhysics();
    const contact = physics.contact("light", "wall");
    expect([contact.friction, contact.restitution]).toEqual([0.3, 0]);
    physics.dispose();
  });

  it("should settle a dropped light within the legacy sleep window", () => {
    const time = settleTime();
    expect(time).toBeGreaterThan(3);
    expect(time).toBeLessThan(6);
  });

  it("should send lights upward when gravity is flipped for the reset", () => {
    const physics = createIlluminatePhysics();
    physics.addLight({ x: 0, y: 0, z: 6 }, { x: 0, y: 0, z: 0 });
    physics.flipGravity();
    physics.step(0.1);
    expect(physics.positions[1]!).toBeGreaterThan(0);
    physics.dispose();
  });

  it("should remove every light and restore gravity when cleared", () => {
    const physics = createIlluminatePhysics();
    physics.addLight({ x: 0, y: 0, z: 6 }, { x: 0, y: 0, z: 0 });
    physics.flipGravity();
    physics.clear();
    expect([physics.count, physics.world.gravity.y]).toEqual([0, -100]);
    physics.dispose();
  });
});
