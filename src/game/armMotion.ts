import * as CANNON from "cannon-es";

// A ball joint controls position, but it leaves an arm free to spin forever
// about its own axis. Damp that otherwise-uncontrolled twist relative to the
// torso while keeping the arm free to swing, punch, grab, and ragdoll.
const Y = new CANNON.Vec3(0, 1, 0);
const Z = new CANNON.Vec3(0, 0, 1);
const axis = new CANNON.Vec3();
const front = new CANNON.Vec3();
const ref = new CANNON.Vec3();
const cross = new CANNON.Vec3();
const rel = new CANNON.Vec3();
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function stabilizeArmRotation(arm: CANNON.Body, torso: CANNON.Body, dt: number) {
  arm.quaternion.vmult(Y, axis);
  arm.quaternion.vmult(Z, front);
  torso.quaternion.vmult(Z, ref);
  const projection = ref.dot(axis);
  ref.x -= axis.x * projection;
  ref.y -= axis.y * projection;
  ref.z -= axis.z * projection;
  let goal = 0;
  const len = ref.length();
  if (len > 0.15) {
    ref.scale(1 / len, ref);
    // An arm pointing directly forward has no unique projected reference.
    // Choose the nearest equivalent orientation to avoid a sudden half-turn.
    if (front.dot(ref) < 0) ref.negate(ref);
    front.cross(ref, cross);
    const error = Math.atan2(axis.dot(cross), clamp(front.dot(ref), -1, 1));
    goal = clamp(error * 3, -2.5, 2.5);
  }
  arm.angularVelocity.vsub(torso.angularVelocity, rel);
  const twist = rel.dot(axis);
  const change = (goal - twist) * (1 - Math.exp(-10 * Math.max(0, dt)));
  arm.angularVelocity.x += axis.x * change;
  arm.angularVelocity.y += axis.y * change;
  arm.angularVelocity.z += axis.z * change;
  // A hard relative-speed ceiling also prevents violent impulses from creating
  // multi-revolution spins, without suppressing the torso's own rotation.
  arm.angularVelocity.vsub(torso.angularVelocity, rel);
  const speed = rel.length();
  if (speed > 12) {
    rel.scale(12 / speed, rel);
    torso.angularVelocity.vadd(rel, arm.angularVelocity);
  }
}
