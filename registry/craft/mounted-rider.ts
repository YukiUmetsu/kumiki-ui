/** A rider coupled to a moving mount: seat, stirrups and reins, for any rigged humanoid (glTF).
 *
 * Biomechanics (Pfau et al. 2009, Science 325:289; western riding practice): at a gallop a skilled rider does
 * not ride the horse's every bounce. The legs and hips work as springs, so the rider's centre of mass moves
 * far less than the saddle. Here:
 * - The pelvis follows the seat socket through a critically damped spring on the vertical axis only;
 *   `absorption` blends between rigidly seated (0) and fully isolated (1). Horizontally it stays on the
 *   seat, and it can never leave a ±`travel` band around the seat (it inherits the mount's transform).
 * - The pelvis takes part of the saddle's pitch and roll; the spine leans forward with speed; the head is
 *   held level and looks along the direction of travel (vestibular stabilisation).
 * - Boots are locked to the stirrup sockets every frame with analytic two-bone IK (thigh, calf, foot;
 *   knees forward and out round the barrel), and each foot copies the stirrup's orientation with the heel
 *   down: there is nothing to slide.
 * - With a `LateralHull` of the mount (its barrel, saddle, skirts and fenders, measured from their meshes), each knee
 *   swings about the hip–ankle line just far enough that thigh and calf stay outside it: the leg lies on the
 *   fender instead of passing through the saddle, and the boot stays locked in the stirrup.
 * - Hands close into fists round the reins a hand's width above the horn, thumbs up and palms facing each other.
 *   The torso is an elliptic cylinder along the spine, narrower at the waist than at the chest; each elbow swings about the shoulder–wrist line until upper
 *   arm and forearm lie outside it, so the arms hang from the shoulders down the rider's sides and never pass
 *   through the chest or stomach.
 *
 * The rider faces +Z in its glTF (as Rocketbox avatars do); `facing` turns it to the mount's +X.
 */
import { MathUtils, Matrix4, Object3D, Quaternion, Vector3 } from "three";
import type { Mesh } from "three";

export interface HumanoidBones {
  pelvis: string;
  spine: readonly string[];
  neck: string;
  head: string;
  thigh: readonly [string, string];
  calf: readonly [string, string];
  foot: readonly [string, string];
  upperArm: readonly [string, string];
  forearm: readonly [string, string];
  hand: readonly [string, string];
  /** Finger chains per hand, root to tip, [left, right]; the first chain is the thumb. Optional. */
  fingers?: readonly [readonly (readonly string[])[], readonly (readonly string[])[]];
}

/** Microsoft Rocketbox (3ds Max Biped) bone names after glTF conversion; [left, right]. */
export const ROCKETBOX_BONES: HumanoidBones = {
  pelvis: "Bip01_Pelvis", spine: ["Bip01_Spine", "Bip01_Spine1", "Bip01_Spine2"], neck: "Bip01_Neck", head: "Bip01_Head",
  thigh: ["Bip01_L_Thigh", "Bip01_R_Thigh"], calf: ["Bip01_L_Calf", "Bip01_R_Calf"], foot: ["Bip01_L_Foot", "Bip01_R_Foot"],
  upperArm: ["Bip01_L_UpperArm", "Bip01_R_UpperArm"], forearm: ["Bip01_L_Forearm", "Bip01_R_Forearm"], hand: ["Bip01_L_Hand", "Bip01_R_Hand"],
  fingers: (["L", "R"] as const).map(h => [0, 1, 2, 3, 4].map(f => [`Bip01_${h}_Finger${f}`, `Bip01_${h}_Finger${f}1`, `Bip01_${h}_Finger${f}2`])) as unknown as HumanoidBones["fingers"],
};

/**
 * The lateral extent of a mount round a rider's legs: for each (x, y) cell in a frame that rides the mount's trunk,
 * how far out the barrel and tack reach on the near (−Z) and far (+Z) side. Built once from the meshes' vertices in
 * their bind pose; the legs are checked against it every frame.
 */
export class LateralHull {
  private constructor(readonly frame: Object3D, private readonly min: readonly [number, number], private readonly cell: number,
    private readonly nx: number, private readonly ny: number, private readonly sides: readonly [Float32Array, Float32Array]) {}

  /**
   * Sample the vertices of `meshes` (each mesh on its own, not its children: a skinned body carries its bones and
   * whatever rides them) in `frame`'s space over the box `min`–`max` (x, y in metres). Call in the bind pose. A part
   * that a leg presses in (a fender hanging off the barrel) counts inset by its `give` (m).
   */
  static fromMeshes(frame: Object3D, meshes: ReadonlyArray<Mesh | { mesh: Mesh; give: number }>, min: readonly [number, number], max: readonly [number, number], cell = .02) {
    const nx = Math.ceil((max[0] - min[0]) / cell), ny = Math.ceil((max[1] - min[1]) / cell);
    const raw = [new Float32Array(nx * ny).fill(-Infinity), new Float32Array(nx * ny).fill(-Infinity)] as const;
    frame.updateWorldMatrix(true, false);
    const inv = new Matrix4().copy(frame.matrixWorld).invert(), m = new Matrix4(), p = new Vector3();
    for (const part of meshes) {
      const mesh = "give" in part ? part.mesh : part, give = "give" in part ? part.give : 0;
      mesh.updateWorldMatrix(true, false);
      m.multiplyMatrices(inv, mesh.matrixWorld);
      const pos = mesh.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(m);
        const cx = Math.floor((p.x - min[0]) / cell), cy = Math.floor((p.y - min[1]) / cell);
        if (cx < 0 || cy < 0 || cx >= nx || cy >= ny) continue;
        const side = p.z < 0 ? 0 : 1, k = cy * nx + cx, out = Math.abs(p.z) - give;
        if (out > raw[side][k]) raw[side][k] = out;
      }
    }
    // Fill cells no vertex fell in from their neighbours along x (meshes are denser than the grid, so these are rare);
    // never widen along y, where the back rounds over quickly and a neighbour would overstate the width.
    const sides = raw.map(src => {
      const dst = src.slice();
      for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
        const k = y * nx + x;
        if (dst[k] === -Infinity) dst[k] = Math.max(x > 0 ? src[k - 1] : -Infinity, x + 1 < nx ? src[k + 1] : -Infinity);
      }
      return dst;
    }) as unknown as [Float32Array, Float32Array];
    return new LateralHull(frame, [min[0], min[1]], cell, nx, ny, sides);
  }

  /** How far the mount reaches outward (|z|, in the hull frame) at (x, y) on the side of `z`; −Infinity outside the box. */
  extent(x: number, y: number, z: number) {
    const cx = Math.floor((x - this.min[0]) / this.cell), cy = Math.floor((y - this.min[1]) / this.cell);
    if (cx < 0 || cy < 0 || cx >= this.nx || cy >= this.ny) return -Infinity;
    return this.sides[z < 0 ? 0 : 1][cy * this.nx + cx];
  }

  /** Depth (in the hull frame's units) by which a sphere at `p` (hull frame) of radius `r` reaches into the mount. */
  depth(p: Vector3, r: number) { return this.extent(p.x, p.y, p.z) + r - Math.abs(p.z); }
}

export interface MountSockets {
  seat: Object3D;
  /** Stirrup tread tops [near/left (−Z), far/right (+Z)]. */
  stirrups: readonly [Object3D, Object3D];
  /** Horn or pommel: the hands hold the reins just above it. */
  horn: Object3D;
}

export interface MountedRiderOptions {
  /** 0 = rides every bounce, 1 = fully isolated like a jockey. Default 0.55 (a western rider at a gallop). */
  absorption?: number;
  /** Height above the seat (m): 0 sitting deep, ~0.06 standing slightly in the stirrups. */
  rise?: number;
  /** Max vertical travel away from the seat (m). */
  travel?: number;
  /** Forward lean of the torso at the reference speed (radians). */
  lean?: number;
  referenceSpeed?: number;
  /** Heel-down angle in the stirrup (radians). */
  heelDown?: number;
  /** Rein grips relative to the horn, in the mount's frame (+X forward, −Z left) [left, right] (m). */
  grips?: readonly [readonly [number, number, number], readonly [number, number, number]];
  /** Rotation that turns the rider's forward (+Z) to the mount's forward (+X). */
  facing?: Quaternion;
  /** The mount's barrel and tack round the legs; without it the knees follow the pole only. */
  hull?: LateralHull;
  /** Leg radii (m) for clearance: thigh, knee, calf (with clothing). */
  legRadius?: readonly [number, number, number];
  /** Finger flexion for the rein grip (radians at the knuckle, middle and end joints). */
  grip?: readonly [number, number, number];
  /** Torso half-width and half-depth (m) round the spine with the shirt, at the waist and at the chest; and the
   * upper-arm and forearm radii. */
  torso?: readonly [number, number, number, number];
  armRadius?: readonly [number, number];
}

const UP = new Vector3(0, 1, 0);

/** Analytic two-bone IK (after D. Holden, "Simple Two Joint IK"): rotates `a` and `b` so `c` reaches `target`,
 * bending in the plane of `pole`. Works for any bone axis convention. Scratch vectors avoid allocation. */
export function solveTwoBoneIK(a: Object3D, b: Object3D, c: Object3D, target: Vector3, pole: Vector3, s: IkScratch = new IkScratch()) {
  a.updateWorldMatrix(true, true);
  const pa = s.pa.setFromMatrixPosition(a.matrixWorld), pb = s.pb.setFromMatrixPosition(b.matrixWorld), pc = s.pc.setFromMatrixPosition(c.matrixWorld);
  const lab = pa.distanceTo(pb), lcb = pb.distanceTo(pc), eps = 1e-4;
  const lat = MathUtils.clamp(s.t.subVectors(target, pa).length(), eps, lab + lcb - eps);
  const acab0 = Math.acos(MathUtils.clamp(s.u.subVectors(pc, pa).normalize().dot(s.v.subVectors(pb, pa).normalize()), -1, 1));
  const babc0 = Math.acos(MathUtils.clamp(s.u.subVectors(pa, pb).normalize().dot(s.v.subVectors(pc, pb).normalize()), -1, 1));
  const acat0 = Math.acos(MathUtils.clamp(s.u.subVectors(pc, pa).normalize().dot(s.v.subVectors(target, pa).normalize()), -1, 1));
  const acab1 = Math.acos(MathUtils.clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
  const babc1 = Math.acos(MathUtils.clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
  const axis0 = s.axis0.crossVectors(s.u.subVectors(pc, pa), s.v.subVectors(pole, pa)).normalize();
  const axis1 = s.axis1.crossVectors(s.u.subVectors(pc, pa), s.v.subVectors(target, pa));
  if (axis1.lengthSq() < 1e-12) axis1.copy(axis0); else axis1.normalize();
  const ga = a.getWorldQuaternion(s.qa), gb = b.getWorldQuaternion(s.qb);
  const ia = s.qi.copy(ga).invert();
  const r0 = s.r0.setFromAxisAngle(s.u.copy(axis0).applyQuaternion(ia), acab1 - acab0);
  const r2 = s.r2.setFromAxisAngle(s.u.copy(axis1).applyQuaternion(ia), acat0);
  const r1 = s.r1.setFromAxisAngle(s.u.copy(axis0).applyQuaternion(s.qi.copy(gb).invert()), babc1 - babc0);
  a.quaternion.multiply(r0.multiply(r2));
  b.quaternion.multiply(r1);
  a.updateWorldMatrix(false, true);
}

export class IkScratch {
  pa = new Vector3(); pb = new Vector3(); pc = new Vector3(); t = new Vector3(); u = new Vector3(); v = new Vector3();
  axis0 = new Vector3(); axis1 = new Vector3(); qa = new Quaternion(); qb = new Quaternion(); qi = new Quaternion();
  r0 = new Quaternion(); r1 = new Quaternion(); r2 = new Quaternion();
}

/** Set a bone's world orientation (keeps its position). */
function setWorldQuaternion(bone: Object3D, world: Quaternion, scratch: Quaternion) {
  const parent = bone.parent;
  if (parent) { parent.getWorldQuaternion(scratch); bone.quaternion.copy(scratch.invert().multiply(world)); }
  else bone.quaternion.copy(world);
}

export class MountedRider {
  readonly root: Object3D;
  private readonly bones: Record<string, Object3D> = {};
  private readonly o: Required<Omit<MountedRiderOptions, "hull">>;
  private readonly hull: LateralHull | null;
  /** Thigh and calf lengths (m), per side. */
  private readonly legLength: Array<[number, number]> = [];
  /** Finger bones per hand with the flexion axis in each bone's parent frame and its rest local rotation. */
  private readonly fingerJoints: Array<Array<{ bone: Object3D; axis: Vector3; rest: Quaternion; joint: number; thumb: boolean }>> = [[], []];
  /** The fist's centre in the hand bone's rotation frame (m), where the reins run. */
  private readonly gripOffset = new Vector3();
  /** Deepest leg sample inside the hull this frame (m), after the knee solve; for QA. */
  legDepth = 0;
  /** Rest orientations relative to the rider root, captured in the bind pose. */
  private readonly restRel = new Map<Object3D, Quaternion>();
  private readonly pelvisOffset = new Vector3();
  private readonly ball: [Vector3, Vector3] = [new Vector3(), new Vector3()];
  // Spring state for the pelvis height relative to the seat.
  private height = 0; private heightVel = 0; private seatYPrev = NaN; private started = false;
  private readonly ik = new IkScratch();
  private readonly tmpQ = new Quaternion(); private readonly tmpQ2 = new Quaternion(); private readonly frameQ = new Quaternion();
  private readonly levelQ = new Quaternion(); private readonly v1 = new Vector3(); private readonly v2 = new Vector3(); private readonly v3 = new Vector3();
  private readonly q3 = new Quaternion(); private readonly q4 = new Quaternion();
  private readonly v4 = new Vector3(); private readonly v5 = new Vector3(); private readonly v6 = new Vector3();

  constructor(root: Object3D, private readonly names: HumanoidBones, private readonly sockets: MountSockets, options: MountedRiderOptions = {}) {
    this.root = root;
    this.o = {
      absorption: options.absorption ?? .55, rise: options.rise ?? .045, travel: options.travel ?? .07, lean: options.lean ?? .45,
      referenceSpeed: options.referenceSpeed ?? 12, heelDown: options.heelDown ?? .22,
      // Fists a hand's width above and just ahead of the horn, about 15 cm apart (two-handed, at speed).
      grips: options.grips ?? [[.05, .1, -.075], [.05, .1, .075]],
      facing: options.facing ?? new Quaternion().setFromAxisAngle(UP, Math.PI / 2),
      // Jeans over the lower thigh, the knee and the calf in a boot top: the largest radii measured on the Rocketbox
      // mesh round each bone (mean 8–9.6, 7.1, 7.5 cm; most 8.9–11, 8.7, 8.9 cm).
      legRadius: options.legRadius ?? [.095, .085, .088],
      grip: options.grip ?? [1.25, 1.45, .8],
      // Waist and ribcage (below the armpits) of an adult man in a shirt, about 29 × 24 and 32 × 26 cm: the arms hang
      // just clear of it from shoulder joints about 19 cm off the spine. Upper arm and forearm (Rocketbox mesh: 5.5–6
      // and 3.3–5 cm mean).
      torso: options.torso ?? [.145, .12, .16, .13],
      armRadius: options.armRadius ?? [.058, .045],
    };
    this.hull = options.hull ?? null;
    const all = [names.pelvis, ...names.spine, names.neck, names.head, ...names.thigh, ...names.calf, ...names.foot, ...names.upperArm, ...names.forearm, ...names.hand];
    for (const name of all) {
      const bone = root.getObjectByName(name);
      if (!bone) throw new Error(`MountedRider: the rider has no bone "${name}".`);
      this.bones[name] = bone;
    }
    // Capture rest orientations (bind pose) relative to the root, and the pelvis offset in metres in the root's
    // rotation frame (glTF characters often carry a unit scale on the root, so never use local units here).
    root.updateMatrixWorld(true);
    const rootQInv = root.getWorldQuaternion(new Quaternion()).invert(), rootPos = new Vector3().setFromMatrixPosition(root.matrixWorld);
    for (const bone of Object.values(this.bones)) this.restRel.set(bone, rootQInv.clone().multiply(bone.getWorldQuaternion(new Quaternion())));
    this.pelvisOffset.setFromMatrixPosition(this.bones[names.pelvis].matrixWorld).sub(rootPos).applyQuaternion(rootQInv);
    for (let side = 0; side < 2; side++) {
      const hip = this.bones[names.thigh[side]], knee = this.bones[names.calf[side]], ankle = this.bones[names.foot[side]];
      const at = (o: Object3D) => new Vector3().setFromMatrixPosition(o.matrixWorld);
      this.legLength.push([at(hip).distanceTo(at(knee)), at(knee).distanceTo(at(ankle))]);
      const upper = this.bones[names.upperArm[side]], elbow = this.bones[names.forearm[side]], wrist = this.bones[names.hand[side]];
      this.armLength.push([at(upper).distanceTo(at(elbow)), at(elbow).distanceTo(at(wrist))]);
    }
    // Fingers: every joint flexes about the hand's own lateral axis (the hand bone's local Z when the fingers run
    // along local X with the palm on +Y, as in Biped rigs: the thumb then sits on the palm side).
    const hands = [this.bones[names.hand[0]], this.bones[names.hand[1]]];
    names.fingers?.forEach((chains, side) => chains.forEach((chain, c) => chain.forEach((name, joint) => {
      const bone = root.getObjectByName(name);
      if (!bone?.parent) return;
      const handQ = hands[side].getWorldQuaternion(new Quaternion()), parentQ = bone.parent.getWorldQuaternion(new Quaternion());
      const axis = new Vector3(0, 0, 1).applyQuaternion(handQ).applyQuaternion(parentQ.invert()).normalize();
      this.fingerJoints[side].push({ bone, axis, rest: bone.quaternion.clone(), joint, thumb: c === 0 });
    })));
    // The reins run through the fist about 8.5 cm along the hand from the wrist and 2.5 cm toward the palm.
    this.gripOffset.set(.085, .025, 0);
    // Ball of the foot: ahead of the ankle, near where the toe bone starts; stored in the foot's rotation frame.
    for (let side = 0; side < 2; side++) {
      const foot = this.bones[names.foot[side]], toe = foot.children.find(c => /toe/i.test(c.name));
      const ankle = new Vector3().setFromMatrixPosition(foot.matrixWorld);
      const tip = toe ? new Vector3().setFromMatrixPosition(toe.matrixWorld) : ankle.clone().add(new Vector3(0, -.06, .12));
      this.ball[side].copy(tip.lerp(ankle, .15)).sub(ankle).applyQuaternion(foot.getWorldQuaternion(new Quaternion()).invert());
    }
  }

  private rest(name: string) { return this.restRel.get(this.bones[name])!; }

  /**
   * Pose the rider for this frame. Call after the mount is animated and its world matrices are current.
   * `heading` is the mount's yaw-only orientation (the direction of travel), `speed` in m/s.
   */
  update(dt: number, heading: Quaternion, speed: number) {
    const o = this.o, b = this.bones, n = this.names;
    dt = Math.min(Math.max(dt, 0), .05);
    const seat = this.sockets.seat;
    seat.updateWorldMatrix(true, false);
    const seatPos = this.v1.setFromMatrixPosition(seat.matrixWorld);
    const seatQ = seat.getWorldQuaternion(this.tmpQ);
    // Vertical absorption: the pelvis height above the seat rides a spring that resists the seat's bounce.
    if (!this.started || !Number.isFinite(this.seatYPrev)) { this.seatYPrev = seatPos.y; this.height = o.rise; this.heightVel = 0; this.started = true; }
    const seatDy = seatPos.y - this.seatYPrev; this.seatYPrev = seatPos.y;
    // Relative to the seat, isolation means moving opposite the seat's motion by `absorption`.
    this.height -= seatDy * o.absorption;
    const omega = 9, k = omega * omega, c = 2 * omega;
    this.heightVel += (-(this.height - o.rise) * k - this.heightVel * c) * dt;
    this.height = MathUtils.clamp(this.height + this.heightVel * dt, o.rise - o.travel, o.rise + o.travel);

    // Rider frame: the mount's heading with a share of the saddle's pitch and roll, turned to face forward.
    const share = 1 - .6 * o.absorption;
    this.levelQ.copy(heading);
    this.frameQ.copy(this.levelQ).slerp(seatQ, share).multiply(o.facing);
    const pelvisTarget = this.v2.copy(seatPos).addScaledVector(UP, this.height);
    // Place the root so the pelvis lands on the target.
    this.root.quaternion.copy(this.frameQ);
    this.root.position.copy(pelvisTarget).sub(this.v3.copy(this.pelvisOffset).applyQuaternion(this.frameQ));
    this.root.updateMatrixWorld(true);

    // Pelvis tilts back a little in the saddle; the spine leans forward with speed and the head stays level.
    const lean = o.lean * MathUtils.clamp(speed / o.referenceSpeed, 0, 1.3);
    const lateral = this.v3.set(1, 0, 0).applyQuaternion(this.frameQ); // the rider's right/left axis (+X in rider space)
    const pelvisQ = this.tmpQ2.setFromAxisAngle(lateral, -.12).multiply(this.frameQ).multiply(this.rest(n.pelvis));
    setWorldQuaternion(b[n.pelvis], pelvisQ, this.tmpQ);
    b[n.pelvis].updateWorldMatrix(false, true);
    const perSpine = lean / n.spine.length;
    for (let i = 0; i < n.spine.length; i++) {
      const bone = b[n.spine[i]];
      const q = this.tmpQ2.setFromAxisAngle(lateral, perSpine * (i + 1) + .12 * (i === 0 ? 1 : 0)).multiply(this.frameQ).multiply(this.rest(n.spine[i]));
      setWorldQuaternion(bone, q, this.tmpQ); bone.updateWorldMatrix(false, true);
    }
    // Head and neck: level and looking along the travel direction, whatever the torso does.
    const levelFace = this.tmpQ2.copy(this.levelQ).multiply(o.facing);
    for (let k = 0; k < 2; k++) {
      const name = k ? n.head : n.neck, bone = b[name], torso = this.q3.copy(this.frameQ).slerp(levelFace, k ? 1 : .5);
      setWorldQuaternion(bone, torso.multiply(this.rest(name)), this.tmpQ); bone.updateWorldMatrix(false, true);
    }

    // Limbs start each frame from their bind orientation in the rider's frame: the two-bone IK turns them from there,
    // so the twist of thigh and arm about their own axes never accumulates from frame to frame.
    for (const name of [...n.thigh, ...n.calf, ...n.upperArm, ...n.forearm]) {
      setWorldQuaternion(b[name], this.q3.copy(this.frameQ).multiply(this.rest(name)), this.tmpQ);
      b[name].updateWorldMatrix(false, true);
    }
    // Legs: boots locked in the stirrups, knees forward and out round the barrel, heel down.
    for (let side = 0; side < 2; side++) {
      const stirrup = this.sockets.stirrups[side];
      stirrup.updateWorldMatrix(true, false);
      const foot = b[n.foot[side]], thigh = b[n.thigh[side]], calf = b[n.calf[side]];
      const stirrupQ = stirrup.getWorldQuaternion(this.q3);
      // Foot orientation: the stirrup's frame, the rider's rest foot, the heel lowered about the mount's lateral axis.
      const heelAxis = this.v2.set(0, 0, 1).applyQuaternion(stirrupQ);
      const footQ = this.q4.copy(stirrupQ).multiply(o.facing).multiply(this.rest(n.foot[side]));
      footQ.premultiply(this.tmpQ.setFromAxisAngle(heelAxis, o.heelDown));
      // Ankle target: the tread minus the ball-of-foot offset in that orientation.
      const target = this.v5.setFromMatrixPosition(stirrup.matrixWorld).sub(this.v3.copy(this.ball[side]).applyQuaternion(footQ));
      // Knee pole: forward, a little down and out to this side, in the mount's level frame; then swung out of the hull.
      const hip = this.v1.setFromMatrixPosition(thigh.matrixWorld);
      const pole = this.v4.set(.6, -.1, side === 0 ? -.35 : .35).applyQuaternion(this.levelQ).add(hip);
      if (this.hull) this.clearKnee(side, hip, target, pole, this.v2.set(1, 0, 0).applyQuaternion(this.levelQ));
      // Twice: the first pass starts from the bind pose and puts the bend in the pole's plane; the second is then exact.
      solveTwoBoneIK(thigh, calf, foot, target, pole, this.ik);
      solveTwoBoneIK(thigh, calf, foot, target, pole, this.ik);
      setWorldQuaternion(foot, footQ, this.tmpQ);
      foot.updateWorldMatrix(false, true);
    }

    // Arms: fists on the reins above the horn, thumbs up, palms facing each other; elbows back at the sides.
    const horn = this.sockets.horn;
    horn.updateWorldMatrix(true, false);
    const hornPos = this.v5.setFromMatrixPosition(horn.matrixWorld), mountQ = horn.getWorldQuaternion(this.q4);
    for (let side = 0; side < 2; side++) {
      const g = o.grips[side], medial = side === 0 ? 1 : -1;
      const grip = this.v2.set(g[0], g[1], g[2]).applyQuaternion(mountQ).add(hornPos);
      const upper = b[n.upperArm[side]], fore = b[n.forearm[side]], hand = b[n.hand[side]];
      // Hand frame in the mount's level frame: along the hand forward, a little down and in; the palm faces in.
      const along = this.v3.set(.82, -.2, .45 * medial).normalize().applyQuaternion(this.levelQ);
      const palm = this.v4.set(0, -.25, medial).applyQuaternion(this.levelQ);
      palm.addScaledVector(along, -palm.dot(along)).normalize();
      const handQ = this.q3.setFromRotationMatrix(this.basis.makeBasis(along, palm, this.v6.crossVectors(along, palm)));
      // Wrist target: the grip minus the fist's offset in that frame.
      const wrist = this.v6.copy(this.gripOffset).applyQuaternion(handQ).negate().add(grip);
      const shoulder = this.v1.setFromMatrixPosition(upper.matrixWorld);
      // Elbows down by the sides, a little forward (the horn is ahead of an upright rider's reach), close to the body;
      // then swung just clear of the torso.
      const pole = this.v4.set(.08, -.9, .2 * -medial).applyQuaternion(this.levelQ).add(shoulder);
      this.clearElbow(side, shoulder, wrist, pole);
      solveTwoBoneIK(upper, fore, hand, wrist, pole, this.ik);
      solveTwoBoneIK(upper, fore, hand, wrist, pole, this.ik);
      setWorldQuaternion(hand, handQ, this.tmpQ);
      hand.updateWorldMatrix(false, true);
      // Close the fingers round the reins; the thumb rests along the top of the fist.
      for (const f of this.fingerJoints[side]) {
        const angle = f.thumb ? [.25, .3, .25][f.joint] ?? 0 : o.grip[f.joint] ?? 0;
        f.bone.quaternion.setFromAxisAngle(f.axis, angle).multiply(f.rest);
      }
      hand.updateWorldMatrix(false, true);
    }
  }

  /**
   * Swing the knee pole about the hip–ankle line by the smallest angle that keeps thigh and calf outside the hull
   * (bisected to a continuous angle), so the leg wraps the fender instead of passing through it. A rider's knee never
   * swings behind the hip: such angles count as blocked by the distance it would be behind.
   */
  private clearKnee(side: number, hip: Vector3, ankle: Vector3, pole: Vector3, forward: Vector3) {
    const hull = this.hull!, [l1, l2] = this.legLength[side];
    hull.frame.updateWorldMatrix(true, false);
    this.toHull.copy(hull.frame.matrixWorld).invert();
    const unit = 1 / hull.frame.matrixWorld.getMaxScaleOnAxis();
    const axis = this.ax.subVectors(ankle, hip), d = MathUtils.clamp(axis.length(), 1e-4, l1 + l2 - 1e-4);
    axis.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const perp0 = this.pp.subVectors(pole, hip);
    perp0.addScaledVector(axis, -perp0.dot(axis)).normalize();
    const [rThigh, rKnee, rCalf] = this.o.legRadius;
    const depthAt = (phi: number) => {
      const perp = this.pr.copy(perp0).applyAxisAngle(axis, phi);
      const knee = this.kn.copy(hip).addScaledVector(axis, a).addScaledVector(perp, h);
      let worst = -((knee.x - hip.x) * forward.x + (knee.y - hip.y) * forward.y + (knee.z - hip.z) * forward.z);
      for (let i = 0; i < 9; i++) {
        // The lower thigh from 70% of its length, the knee, and the calf to 85% (above the boot in the stirrup). Higher up
        // the inner thigh rests on the seat and jockeys; there, and against the fender, a rider's soft tissue gives
        // about 2.5 cm.
        const thigh = i < 3, t = thigh ? .7 + i * .15 : (i - 3) * .85 / 5;
        const p = thigh ? this.sp.lerpVectors(hip, knee, t) : this.sp.lerpVectors(knee, ankle, t);
        const r = (thigh ? MathUtils.lerp(rThigh, rKnee, t) : MathUtils.lerp(rKnee, rCalf, t / .85)) - (thigh ? .02 : .01);
        worst = Math.max(worst, hull.depth(p.applyMatrix4(this.toHull), r * unit) / unit);
      }
      return worst;
    };
    let phi = 0, depth = depthAt(0);
    if (depth > 0) {
      // Search outward both ways in 4° steps; bisect the first clear step against the one before it.
      let best = 0, bestDepth = depth, found = false;
      for (let k = 1; k <= 24 && !found; k++) for (const sgn of [1, -1]) {
        const angle = sgn * k * 4 * MathUtils.DEG2RAD, dd = depthAt(angle);
        if (dd < bestDepth) { best = angle; bestDepth = dd; }
        if (dd <= 0) {
          let lo = sgn * (k - 1) * 4 * MathUtils.DEG2RAD, hi = angle;
          for (let it = 0; it < 6; it++) { const mid = (lo + hi) / 2; if (depthAt(mid) <= 0) hi = mid; else lo = mid; }
          best = hi; bestDepth = depthAt(hi); found = true; break;
        }
      }
      phi = best; depth = bestDepth;
    }
    this.legDepth = Math.max(side === 0 ? 0 : this.legDepth, depth);
    pole.copy(hip).add(this.pr.copy(perp0).applyAxisAngle(axis, phi));
  }
  /**
   * Swing the elbow about the shoulder–wrist line by the smallest angle that keeps the upper arm (from 40% of its
   * length: the shoulder joint sits inside the deltoid) and the forearm (from a third: the elbow rests against the
   * shirt) outside the torso.
   */
  private clearElbow(side: number, shoulder: Vector3, wrist: Vector3, pole: Vector3) {
    const n = this.names, b = this.bones, [l1, l2] = this.armLength[side];
    const pelvis = this.tb.setFromMatrixPosition(b[n.pelvis].matrixWorld), neck = this.tn.setFromMatrixPosition(b[n.neck].matrixWorld);
    const spine = this.ts.subVectors(neck, pelvis), spineLen2 = Math.max(1e-6, spine.lengthSq());
    // The rider's lateral and front axes (rider space: +X left, +Z forward), square to the spine.
    const across = this.tx.set(1, 0, 0).applyQuaternion(this.frameQ), front = this.tz.crossVectors(across, spine).normalize();
    across.crossVectors(spine, front).normalize();
    const [waistWidth, waistDepth, chestWidth, chestDepth] = this.o.torso, [rUpper, rFore] = this.o.armRadius;
    const depthOf = (p: Vector3, r: number) => {
      const t = MathUtils.clamp(this.tq.subVectors(p, pelvis).dot(spine) / spineLen2, 0, 1), k = MathUtils.smoothstep(t, .3, .8);
      const halfWidth = MathUtils.lerp(waistWidth, chestWidth, k), halfDepth = MathUtils.lerp(waistDepth, chestDepth, k);
      this.tq.copy(pelvis).addScaledVector(spine, t).sub(p).negate();
      const x = this.tq.dot(across), z = this.tq.dot(front), e = Math.hypot(x / halfWidth, z / halfDepth);
      // Distance outside the ellipse, approximated along the ray from the spine (exact on the axes).
      return r - (e - 1) * Math.hypot(x, z) / Math.max(e, 1e-6);
    };
    const axis = this.ax.subVectors(wrist, shoulder), d = MathUtils.clamp(axis.length(), 1e-4, l1 + l2 - 1e-4);
    axis.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const perp0 = this.pp.subVectors(pole, shoulder);
    perp0.addScaledVector(axis, -perp0.dot(axis)).normalize();
    const at = (phi: number) => {
      const elbow = this.kn.copy(shoulder).addScaledVector(axis, a).addScaledVector(this.pr.copy(perp0).applyAxisAngle(axis, phi), h);
      let worst = -Infinity;
      // Upper arm from 40% of its length (above, the armpit and deltoid meet the chest); forearm from a third (at the
      // elbow the sleeve rests against the shirt).
      for (let i = 0; i < 7; i++) {
        const upper = i < 3, t = upper ? .4 + i * .3 : .35 + (i - 3) * .65 / 3;
        const p = upper ? this.sp.lerpVectors(shoulder, elbow, t) : this.sp.lerpVectors(elbow, wrist, t);
        worst = Math.max(worst, depthOf(p, upper ? rUpper : rFore));
      }
      return worst;
    };
    let phi = 0, depth = at(0);
    if (depth > 0) {
      let best = 0, bestDepth = depth, found = false;
      for (let k = 1; k <= 30 && !found; k++) for (const sgn of [1, -1]) {
        const angle = sgn * k * 4 * MathUtils.DEG2RAD, dd = at(angle);
        if (dd < bestDepth) { best = angle; bestDepth = dd; }
        if (dd <= 0) {
          let lo = sgn * (k - 1) * 4 * MathUtils.DEG2RAD, hi = angle;
          for (let it = 0; it < 6; it++) { const mid = (lo + hi) / 2; if (at(mid) <= 0) hi = mid; else lo = mid; }
          best = hi; bestDepth = at(hi); found = true; break;
        }
      }
      phi = best; depth = bestDepth;
    }
    this.armDepth = Math.max(side === 0 ? 0 : this.armDepth, depth);
    pole.copy(shoulder).add(this.pr.copy(perp0).applyAxisAngle(axis, phi));
  }
  /** Deepest arm sample inside the torso this frame (m), after the elbow solve; for QA. */
  armDepth = 0;
  private readonly armLength: Array<[number, number]> = [];
  private readonly tb = new Vector3(); private readonly tn = new Vector3(); private readonly ts = new Vector3(); private readonly tx = new Vector3();
  private readonly tz = new Vector3(); private readonly tq = new Vector3();
  private readonly basis = new Matrix4(); private readonly toHull = new Matrix4();
  private readonly ax = new Vector3(); private readonly pp = new Vector3(); private readonly pr = new Vector3(); private readonly kn = new Vector3(); private readonly sp = new Vector3();

  /** World positions of the hip, knee and ankle joints of a leg (scratch vectors, valid until the next call). */
  legJoints(side: 0 | 1): readonly [Vector3, Vector3, Vector3] {
    const n = this.names, b = this.bones, j = this.joints;
    j[0].setFromMatrixPosition(b[n.thigh[side]].matrixWorld); j[1].setFromMatrixPosition(b[n.calf[side]].matrixWorld); j[2].setFromMatrixPosition(b[n.foot[side]].matrixWorld);
    return j;
  }
  private readonly joints: [Vector3, Vector3, Vector3] = [new Vector3(), new Vector3(), new Vector3()];
  /** Thigh, knee and calf radii used for clearance (m). */
  get legRadius() { return this.o.legRadius; }

  /** World position of the fist's centre, where the reins run (for attaching them). */
  handPosition(side: 0 | 1, out: Vector3) {
    const hand = this.bones[this.names.hand[side]];
    return out.copy(this.gripOffset).applyQuaternion(hand.getWorldQuaternion(this.q3)).add(this.v6.setFromMatrixPosition(hand.matrixWorld));
  }
  /** World position of a foot's ball (for checking it stays in the stirrup). */
  ballPosition(side: 0 | 1, out: Vector3) {
    const foot = this.bones[this.names.foot[side]];
    return out.copy(this.ball[side]).applyQuaternion(foot.getWorldQuaternion(this.q3)).add(this.v6.setFromMatrixPosition(foot.matrixWorld));
  }
  /** Head bone (for the hat). */
  get head() { return this.bones[this.names.head]; }
  get neck() { return this.bones[this.names.neck]; }
}
