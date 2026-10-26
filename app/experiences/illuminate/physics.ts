import {
  Body,
  Box,
  ContactMaterial,
  type GSSolver,
  Material,
  Plane,
  SAPBroadphase,
  Sphere,
  Vec3,
  World,
} from "cannon-es";

export const FIXED_STEP = 1 / 60;
export const MAX_SUB_STEPS = 5;

const GRAVITY = -100;
// The legacy reset multiplied gravity by -25.
const RESET_GRAVITY = GRAVITY * -25;
const LIGHT_RADIUS = 1;
// The legacy scaled light velocity by 0.99 after every (per-frame) step.
const VELOCITY_SCALE = 0.99;

// Legacy bodies each carried a material with friction 0.1 and restitution 0.55, so cannon combined them by product (0.1², 0.55²).
const LEGACY_CONTACT = { friction: 0.01, restitution: 0.3025 };
// The legacy wall material had no values, so the world default applied.
const WALL_CONTACT = { friction: 0.3, restitution: 0 };

export interface FixedStepperOptions {
  step?: number;
  maxSubSteps?: number;
}

export interface FixedStepper {
  /** Accumulates dt seconds and returns how many fixed steps to run now. */
  advance(dt: number): number;
}

export function createFixedStepper({
  step = FIXED_STEP,
  maxSubSteps = MAX_SUB_STEPS,
}: FixedStepperOptions = {}): FixedStepper {
  // Tolerance keeps float drift (120 × 1/120) from losing a step.
  const epsilon = step * 1e-6;
  let accumulator = 0;
  return {
    advance(dt) {
      accumulator += dt;
      let steps = 0;
      while (accumulator + epsilon >= step && steps < maxSubSteps) {
        accumulator -= step;
        steps++;
      }
      // A frame too long to catch up drops the backlog instead of spiralling.
      if (steps === maxSubSteps && accumulator >= step) accumulator = 0;
      return steps;
    },
  };
}

export type SurfaceKind = "light" | "ground" | "text" | "wall";

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface TextBox {
  halfExtents: Vec3Like;
  position: Vec3Like;
}

export interface IlluminatePhysics {
  readonly world: World;
  readonly count: number;
  /** xyz per light, refreshed after every step. */
  readonly positions: Float32Array;
  /** Adds a light body with an initial velocity; returns false when the capacity is full. */
  addLight(position: Vec3Like, velocity: Vec3Like): boolean;
  setText(box: TextBox): void;
  /** Runs the fixed steps owed for dt seconds; returns how many ran. */
  step(dt: number): number;
  isSleeping(index: number): boolean;
  flipGravity(): void;
  clear(): void;
  contact(a: SurfaceKind, b: SurfaceKind): ContactMaterial;
  dispose(): void;
}

export interface IlluminatePhysicsOptions {
  capacity?: number;
}

export function createIlluminatePhysics({
  capacity = 512,
}: IlluminatePhysicsOptions = {}): IlluminatePhysics {
  const world = new World({
    gravity: new Vec3(0, GRAVITY, 0),
    allowSleep: true,
  });
  world.broadphase = new SAPBroadphase(world);
  (world.solver as GSSolver).iterations = 10;

  const materials: Record<SurfaceKind, Material> = {
    light: new Material("light"),
    ground: new Material("ground"),
    text: new Material("text"),
    wall: new Material("wall"),
  };
  world.addContactMaterial(
    new ContactMaterial(materials.light, materials.light, LEGACY_CONTACT),
  );
  world.addContactMaterial(
    new ContactMaterial(materials.light, materials.ground, LEGACY_CONTACT),
  );
  world.addContactMaterial(
    new ContactMaterial(materials.light, materials.text, LEGACY_CONTACT),
  );
  world.addContactMaterial(
    new ContactMaterial(materials.light, materials.wall, WALL_CONTACT),
  );

  const ground = new Body({
    mass: 0,
    material: materials.ground,
    shape: new Plane(),
  });
  ground.position.set(0, -12.5, 0);
  ground.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(ground);

  const wall = new Body({
    mass: 0,
    material: materials.wall,
    shape: new Plane(),
  });
  wall.position.set(0, 0, -35);
  world.addBody(wall);

  let text: Body | null = null;
  const lights: Body[] = [];
  const positions = new Float32Array(capacity * 3);
  const stepper = createFixedStepper();

  const syncPositions = () => {
    for (let i = 0; i < lights.length; i++) {
      const p = lights[i]!.position;
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
  };

  return {
    world,
    get count() {
      return lights.length;
    },
    positions,
    addLight(position, velocity) {
      if (lights.length >= capacity) return false;
      const body = new Body({
        mass: 1,
        material: materials.light,
        shape: new Sphere(LIGHT_RADIUS),
        allowSleep: true,
        sleepSpeedLimit: 1,
        sleepTimeLimit: 3,
      });
      body.position.set(position.x, position.y, position.z);
      body.velocity.set(velocity.x, velocity.y, velocity.z);
      world.addBody(body);
      const i = lights.length;
      lights.push(body);
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      return true;
    },
    setText({ halfExtents, position }) {
      if (text) world.removeBody(text);
      text = new Body({
        mass: 0,
        material: materials.text,
        shape: new Box(new Vec3(halfExtents.x, halfExtents.y, halfExtents.z)),
      });
      text.position.set(position.x, position.y, position.z);
      world.addBody(text);
    },
    step(dt) {
      const steps = stepper.advance(dt);
      for (let s = 0; s < steps; s++) {
        world.step(FIXED_STEP);
        for (const body of lights)
          body.velocity.scale(VELOCITY_SCALE, body.velocity);
      }
      if (steps > 0) syncPositions();
      return steps;
    },
    isSleeping(index) {
      return lights[index]?.sleepState === Body.SLEEPING;
    },
    flipGravity() {
      world.gravity.set(0, RESET_GRAVITY, 0);
      for (const body of lights) body.wakeUp();
    },
    clear() {
      for (const body of lights) world.removeBody(body);
      lights.length = 0;
      world.gravity.set(0, GRAVITY, 0);
    },
    contact(a, b) {
      return (
        world.getContactMaterial(materials[a], materials[b]) ??
        world.defaultContactMaterial
      );
    },
    dispose() {
      for (const body of [...world.bodies]) world.removeBody(body);
      lights.length = 0;
      text = null;
    },
  };
}
