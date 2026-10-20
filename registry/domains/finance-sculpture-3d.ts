/** Market-sentiment sculptures: an original charging bull and a swiping bear.
 *
 * Hero-tier, sculpted as one continuous signed-distance body (not separate
 * primitives): anatomical masses blend into each other, joints have bony
 * landmarks, folds and recesses receive baked patina and raised ridges show
 * polished wear. Both stand on a chamfered granite plinth.
 *
 * Original forms authored for Kumiki; they do not replicate any specific
 * public artwork. Coordinates: +X is the animal's forward direction, +Y is
 * up, the plinth top is y = 0, and 1 unit ≈ 0.5 m at maquette scale.
 */
import { Group, Mesh, MeshPhysicalMaterial } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import type { AssetResources, HeroAsset } from "../craft/hero-asset";
import {
  bounded, chain, clipBelow, displace, ellipsoid, fbm3, meshSdfCached, mirrorZ, roundBox, roundCone,
  sculptGeometry, smoothSubtract, smoothUnion, smoothstep, sphere, union, valueNoise3,
} from "../craft/sdf-sculpt";
import type { Sdf, SculptShading, Vec3 } from "../craft/sdf-sculpt";
import { clamp01, linearRgb, mix } from "../craft/sdf-sculpt";
import { carveSocket, createEyeball, createEyelidPatch, seatEye } from "../craft/sculpt-anatomy";
import type { EyeSpec, EyeStyle } from "../craft/sculpt-anatomy";
import { createAutoRig } from "../craft/auto-rig";
import type { AutoRig, RigBoneSpec } from "../craft/auto-rig";
import { actionTime, easeInOut, easeOutCubic, findAction, pulse, smooth, spring, TAU, window01 } from "../craft/hero-action";
import type { HeroActionSpec, HeroActionState } from "../craft/hero-action";
import { createSculptMaterial, sculptFinishShading } from "../craft/sculpt-finish";
import type { SculptFinish } from "../craft/sculpt-finish";
import { applySurfaceDetail } from "../craft/surface-detail";

export interface MarketSculptureOptions {
  id?: string;
  /** "aged-bronze" statue (default) or "natural" living coat with wet eyes. */
  finish?: SculptFinish;
  /** Granite plinth under the animal (default: on for metal finishes, off for natural). */
  plinth?: boolean;
  /** Mesh resolution: "hero" for close-ups, "supporting" for medium shots. */
  quality?: "hero" | "supporting";
}

const CELL = { hero: .0165, supporting: .026 } as const;

/** Sculpted surface, its smooth anatomical base (drives patina and wear),
 * named regions for region-aware coloring and eye placements. */
interface Sculpt { surface: Sdf; base?: Sdf; regions: Record<string, Sdf>; eyes: EyeSpec[] }

/** Bounded smooth union for one limb: cheap rejection away from the limb. */
const limb = (center: Vec3, radius: number, ...parts: Sdf[]) => bounded(smoothUnion(.05, ...parts), center, radius);

function plinth(res: AssetResources, group: Group, width: number, depth: number, height: number) {
  const granite = res.own(applySurfaceDetail(new MeshPhysicalMaterial({
    color: "#1c1d20", roughness: .42, metalness: 0, clearcoat: .3, clearcoatRoughness: .32, envMapIntensity: .3,
  }), { kind: "stone", frequency: 34, strength: .00012, roughnessVariation: .35, albedoVariation: .9 }));
  const honed = res.own(applySurfaceDetail(new MeshPhysicalMaterial({
    color: "#1d1e21", roughness: .7, metalness: 0, envMapIntensity: .5,
  }), { kind: "stone", frequency: 30, strength: .0006, roughnessVariation: .3, albedoVariation: .7 }));
  // Stepped base: wide honed footing, polished main block, recessed reveal line.
  const footing = new Mesh(res.own(new RoundedBoxGeometry(width + .16, height * .22, depth + .16, 3, .02)), honed);
  footing.position.y = -height + height * .11;
  const reveal = new Mesh(res.own(new RoundedBoxGeometry(width - .06, height * .06, depth - .06, 2, .01)), honed);
  reveal.position.y = -height + height * .25;
  const block = new Mesh(res.own(new RoundedBoxGeometry(width, height * .72, depth, 4, .035)), granite);
  block.position.y = -height * .36;
  for (const mesh of [footing, reveal, block]) { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
  res.name(block, "plinth-polished-granite");
  res.name(footing, "plinth-honed-footing");
  res.name(reveal, "plinth-shadow-reveal");
}

function sculpt(res: AssetResources, group: Group, built: Sculpt, name: string, min: Vec3, max: Vec3,
  finish: SculptFinish, quality: "hero" | "supporting", shading: SculptShading, eyeStyle: EyeStyle,
  look: { flow?: Vec3; detailStrength?: number; sheenColor?: string }, rigSpec: readonly RigBoneSpec[]): AutoRig {
  // Key by the sculpted shape (not the finish-specific part name): bronze and natural share one mesh.
  const shapeKey = name.split("-")[0] + "-sculpt";
  const mesh = meshSdfCached(shapeKey + ":" + quality, () => ({ surface: built.surface, shading: built.base }),
    { min, max, cellSize: CELL[quality], occlusionDistance: .16 });
  const material = res.own(createSculptMaterial(finish, {
    detail: look.flow ? "fur" : undefined, flow: look.flow, detailStrength: look.detailStrength,
    detailFrequency: look.flow ? 34 : undefined, sheenColor: look.sheenColor,
  }));
  // Skinned body: auto-rigged from the same anatomical chains used to sculpt it.
  // Sharp falloff keeps skull skin rigid with the eyes riding the head bone.
  const rig = createAutoRig(res.own(sculptGeometry(mesh, shading)), material, rigSpec, { sharpness: 3.2 });
  const body = rig.mesh;
  body.castShadow = true; body.receiveShadow = true;
  group.add(res.name(body, name));
  // Eyes: fine-resolution lid patches (same material) and painted eyeballs, riding the head bone.
  const context = built.base ?? built.surface;
  for (const eye of built.eyes) {
    const side = eye.center[2] >= 0 ? "left" : "right";
    const lids = createEyelidPatch(res, eye, context, shading, material, `${name}-eyelids-${side}`, quality === "hero" ? .0042 : .007);
    const ball = createEyeball(res, eye, eyeStyle, `${name}-eye-${side}`);
    group.add(lids, ball);
    rig.attach("head", lids); rig.attach("head", ball);
  }
  return rig;
}

/** Leg bones from joint points: upper → lower → … → hoof/paw. */
const legBones = (prefix: string, parent: string, joints: Vec3[], radii: number[]): RigBoneSpec[] =>
  joints.slice(0, -1).map((head, i) => ({
    name: `${prefix}-${i}`, parent: i ? `${prefix}-${i - 1}` : parent, head, tail: joints[i + 1], radius: radii[i],
  }));

const mirrorEye = (eye: EyeSpec): EyeSpec[] => [eye, {
  ...eye, center: [eye.center[0], eye.center[1], -eye.center[2]], gaze: [eye.gaze[0], eye.gaze[1], -eye.gaze[2]],
}];

/** Region-aware natural coloring helper: distance to a region SDF → 0..1 weight. */
const inside = (region: Sdf, x: number, y: number, z: number, soft: number) => clamp01(.5 - region(x, y, z) / soft);

// ------------------------------------------------------------------ bull

/** Charging bull: lowered head, horns forward, hind legs driving off the plinth. */
export function bullSdf(): Sculpt {
  const torso = smoothUnion(.16,
    ellipsoid([.05, 1.13, 0], [1.0, .5, .5], [0, 0, .06]),           // barrel
    ellipsoid([.72, 1.2, 0], [.6, .58, .54], [0, 0, -.15]),           // forequarters
    ellipsoid([.86, 1.52, 0], [.56, .36, .37], [0, 0, -.42]),         // crest / hump
    roundCone([1.02, 1.36, 0], [1.42, 1.02, 0], .43, .3),             // neck
    ellipsoid([-.78, 1.17, 0], [.56, .48, .45]),                      // hindquarters
    ellipsoid([-.9, 1.37, 0], [.5, .22, .35], [0, 0, .12]),           // rump / pelvis line
    ellipsoid([.05, .96, 0], [.74, .27, .42], [0, 0, .05]),           // belly, tucked up
    ellipsoid([1.12, .9, 0], [.28, .4, .21], [0, 0, -.3]),            // brisket
    ellipsoid([1.3, .9, 0], [.22, .26, .12], [0, 0, -.6]),            // dewlap fold
    mirrorZ(ellipsoid([.78, 1.28, .33], [.34, .3, .16], [0, 0, -.6])), // shoulder blade
    mirrorZ(ellipsoid([-.78, 1.0, .3], [.4, .44, .2], [0, 0, .28])),  // thigh
  );
  // Flank tuck in front of the stifle and a soft groove behind the shoulder.
  let body = smoothSubtract(.12, torso, mirrorZ(ellipsoid([-.42, .74, .52], [.26, .2, .14])));
  body = smoothSubtract(.1, body, mirrorZ(ellipsoid([.42, 1.0, .56], [.08, .28, .07], [0, 0, -.3])));
  // Rib relief: shallow ridges on the barrel sides only.
  body = displace(body, (x, y, z) => {
    const side = smoothstep(.3, .46, Math.abs(z)), band = smoothstep(.82, .95, y) * (1 - smoothstep(1.2, 1.34, y));
    const span = smoothstep(-.35, -.15, x) * (1 - smoothstep(.35, .5, x));
    return side * band * span * .0045 * Math.sin((x + (1.25 - y) * .35) * 21);
  });

  // Short, broad bovine head: wide flat forehead, deep jaw, broad muzzle.
  const head = bounded(smoothUnion(.07,
    ellipsoid([1.5, 1.07, 0], [.3, .29, .3]),                         // cranium
    roundBox([1.6, 1.0, 0], [.13, .2, .23], .12, { rotation: [0, 0, -.75] }), // flat forehead plate
    roundCone([1.56, 1.0, 0], [1.8, .7, 0], .26, .2),                 // face
    ellipsoid([1.84, .63, 0], [.17, .17, .22], [0, 0, -.6]),          // broad muzzle
    ellipsoid([1.6, .74, 0], [.25, .15, .19], [0, 0, -.6]),           // deep jaw
    ellipsoid([1.42, 1.28, 0], [.15, .11, .27]),                      // poll
    mirrorZ(ellipsoid([1.6, 1.07, .2], [.09, .065, .08])),            // brow ridge
    mirrorZ(ellipsoid([1.36, 1.1, .38], [.05, .085, .15], [.5, 0, -.25])), // ear, tucked back
  ), [1.62, .95, 0], .78);
  // Lateral, slightly forward-looking eyes with horizontal pupils (grazing animal).
  const eye = seatEye(head, [1.56, .99, .1], { radius: .056, gaze: [.42, -.1, .9],
    aperture: { width: .98, height: .4 }, tilt: .16, lid: .16 }, .32);
  let skull = mirrorZ(carveSocket(head, eye));
  skull = smoothSubtract(.02, skull, mirrorZ(sphere([1.97, .6, .1], .038)));              // nostrils
  skull = smoothSubtract(.012, skull, ellipsoid([1.88, .5, 0], [.1, .016, .15], [0, 0, -.6])); // mouth line
  const horns = bounded(mirrorZ(chain(
    [[1.42, 1.24, .2], [1.42, 1.3, .42], [1.52, 1.37, .6], [1.72, 1.45, .68], [1.92, 1.57, .62], [2.03, 1.71, .51]],
    [.105, .088, .07, .05, .032, .012], .03)), [1.7, 1.45, 0], .9);
  // Ridged horn bases (growth rings) near the skull.
  const hornRings = displace(horns, (x, _y, z) => {
    const r = Math.hypot(x - 1.42, z - Math.sign(z) * .3);
    return Math.abs(z) < .5 && x < 1.55 ? .005 * Math.sin(r * 90) : 0;
  });

  const leg = (points: Vec3[], radii: number[]) => chain(points, radii, .06);
  const hoof = (at: Vec3, yaw = 0) => {
    const base = roundBox(at, [.1, .055, .078], .035, { rotation: [0, yaw, 0], taper: .2 });
    // Cleft between the two claws of the cloven hoof.
    return smoothSubtract(.01, base, roundBox([at[0] + .05, at[1], at[2]], [.08, .1, .007], .004, { rotation: [0, yaw, 0] }));
  };
  const legs = union(
    // Front left: reaching forward mid-stride.
    limb([1.2, .5, .31], .62,
    ellipsoid([.92, .92, .33], [.24, .3, .16], [0, 0, -.35]),
    leg([[.92, .92, .33], [1.06, .62, .31], [1.27, .37, .3], [1.42, .15, .29], [1.47, .085, .29]], [.19, .14, .09, .078, .082]),
    ellipsoid([1.05, .63, .31], [.1, .19, .1], [0, 0, -.7]),
    sphere([1.27, .37, .3], .085),                                    // knee (carpus)
    sphere([1.42, .15, .29], .075),                                   // fetlock
    hoof([1.53, .055, .29], -.05)),
    // Front right: planted, taking the weight.
    limb([.84, .5, -.31], .58,
    ellipsoid([.8, .92, -.33], [.24, .3, .16], [0, 0, -.1]),
    leg([[.8, .92, -.33], [.8, .6, -.31], [.84, .37, -.3], [.86, .15, -.29], [.9, .085, -.29]], [.19, .14, .09, .078, .082]),
    ellipsoid([.8, .62, -.31], [.1, .19, .1]),
    sphere([.84, .37, -.3], .085), sphere([.86, .15, -.29], .075),
    hoof([.95, .055, -.29])),
    // Hind left: stifle forward, hock back.
    limb([-.85, .52, .3], .6,
    leg([[-.7, .98, .32], [-.66, .74, .31], [-1.04, .5, .29], [-1.0, .16, .28], [-.97, .085, .28]], [.24, .18, .092, .078, .082]),
    ellipsoid([-.86, .66, .3], [.2, .1, .1], [0, 0, .55]),          // gaskin
    sphere([-1.1, .54, .29], .06),                                    // point of hock
    sphere([-1.0, .16, .28], .072),
    hoof([-.92, .055, .28])),
    // Hind right: driving back hard.
    limb([-1.0, .52, -.3], .66,
    leg([[-.72, .98, -.32], [-.7, .74, -.31], [-1.14, .52, -.29], [-1.31, .17, -.28], [-1.34, .085, -.28]], [.24, .18, .092, .078, .082]),
    ellipsoid([-.93, .66, -.3], [.21, .1, .1], [0, 0, .5]),
    sphere([-1.2, .56, -.29], .06), sphere([-1.31, .17, -.28], .072),
    hoof([-1.29, .055, -.28], .15)),
  );
  const tail = bounded(smoothUnion(.04,
    chain([[-1.2, 1.36, 0], [-1.45, 1.5, .04], [-1.62, 1.72, .08], [-1.63, 1.98, .06], [-1.52, 2.15, 0]],
      [.075, .05, .04, .034, .03], .03),
    displace(roundCone([-1.5, 2.16, 0], [-1.38, 2.36, -.02], .045, .085),
      (x, y, z) => .01 * Math.sin(Math.atan2(z, x + 1.44) * 11 + y * 14)),   // tuft locks
  ), [-1.45, 1.75, 0], .65);

  const animal = smoothUnion(.09, smoothUnion(.11, body, skull), legs);
  const surface = clipBelow(smoothUnion(.035, animal, hornRings, tail), 0);
  return {
    surface, eyes: mirrorEye(eye),
    regions: {
      horns: hornRings,
      muzzle: ellipsoid([1.9, .6, 0], [.15, .14, .2], [0, 0, -.6]),
      tuft: ellipsoid([-1.44, 2.26, 0], [.1, .16, .1], [0, 0, -.5]),
    },
  };
}

/** Living bull: near-black coat warmed by sun on the topline, grey muzzle ring,
 * wet nose, keratin horns grading from ivory base to dark tips, dark hooves. */
function bullNatural(regions: Record<string, Sdf>): SculptShading {
  const coat = linearRgb("#140d0a"), sun = linearRgb("#3a2216"), muzzleRing = linearRgb("#4d4039");
  const nose = linearRgb("#231c1a"), hornBase = linearRgb("#d6cbb0"), hornMid = linearRgb("#a8916a");
  const hornTip = linearRgb("#211c18"), hoof = linearRgb("#1a1715");
  const mottle = fbm3(5, 3);
  return ({ x, y, z, ny, occlusion }) => {
    const m = mottle(x * 3, y * 3, z * 3);
    const shade = mix(.35, 1, occlusion);
    const horn = clamp01((inside(regions.horns, x, y, z, .014) - .4) / .6);
    const t = clamp01((Math.hypot(x - 1.42, z) - .25) / .55);
    const hornColor = t < .55 ? hornBase.map((v, i) => mix(v, hornMid[i], t / .55)) : hornMid.map((v, i) => mix(v, hornTip[i], (t - .55) / .45));
    if (horn > .98) return [hornColor[0] * shade, hornColor[1] * shade, hornColor[2] * shade, mix(.55, .4, t), 0];
    if (y < .13) return [hoof[0] * shade, hoof[1] * shade, hoof[2] * shade, .6, 0];
    const muzzle = inside(regions.muzzle, x, y, z, .05);
    let c = coat.map((v, i) => mix(v, sun[i], clamp01(ny * .8 + m * .6) * .55));
    c = c.map((v, i) => mix(v, muzzleRing[i], muzzle * .7));
    const wet = smoothstep(1.93, 2.0, x) * smoothstep(.45, .55, y) * (1 - smoothstep(.68, .75, y));
    c = c.map((v, i) => mix(v, nose[i], wet));
    c = c.map((v, i) => mix(v, hornColor[i], horn));
    return [c[0] * shade, c[1] * shade, c[2] * shade, mix(mix(1, .35, wet), .5, horn), 0];
  };
}

const BULL_RIG: RigBoneSpec[] = [
  { name: "pelvis", head: [-.55, 1.2, 0], tail: [-1.15, 1.25, 0], radius: .5 },
  { name: "spine", parent: "pelvis", head: [-.55, 1.2, 0], tail: [.6, 1.3, 0], radius: .55 },
  { name: "neck", parent: "spine", head: [.75, 1.3, 0], tail: [1.3, 1.15, 0], radius: .36 },
  { name: "head", parent: "neck", head: [1.32, 1.14, 0], tail: [1.95, .6, 0], radius: .34 },
  { name: "tail-0", parent: "pelvis", head: [-1.2, 1.36, 0], tail: [-1.5, 1.55, .05], radius: .1 },
  { name: "tail-1", parent: "tail-0", head: [-1.5, 1.55, .05], tail: [-1.63, 1.9, .07], radius: .1 },
  { name: "tail-2", parent: "tail-1", head: [-1.63, 1.9, .07], tail: [-1.42, 2.36, 0], radius: .12 },
  ...legBones("fl", "spine", [[.9, 1.02, .33], [1.06, .62, .31], [1.42, .15, .29], [1.55, .04, .29]], [.2, .13, .11]),
  ...legBones("fr", "spine", [[.8, 1.02, -.33], [.8, .6, -.31], [.86, .15, -.29], [.97, .04, -.29]], [.2, .13, .11]),
  ...legBones("hl", "pelvis", [[-.72, 1.06, .32], [-.66, .74, .31], [-1.04, .5, .29], [-1.0, .16, .28], [-.9, .04, .28]], [.2, .15, .1, .1]),
  ...legBones("hr", "pelvis", [[-.72, 1.06, -.32], [-.7, .74, -.31], [-1.14, .52, -.29], [-1.31, .17, -.28], [-1.27, .04, -.28]], [.2, .15, .1, .1]),
];

export const BULL_ACTIONS: readonly HeroActionSpec[] = [
  { id: "charge", label: "Charge", durationFrames: 22, loop: true, meaning: "Momentum: the market drives forward (bull run)." },
  { id: "horn-thrust", label: "Horn thrust", durationFrames: 40, loop: false, meaning: "Prices tossed upward: the bull attacks by thrusting its horns up." },
  { id: "paw-ground", label: "Paw the ground", durationFrames: 60, loop: false, meaning: "Building pressure before a rally." },
];

function poseBull(rig: AutoRig, state: HeroActionState) {
  rig.reset();
  if (!state.id) return;
  const spec = findAction(BULL_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
  if (spec.id === "charge") {
    const a = t * TAU;
    // Trot: diagonal pairs (front-left with hind-right) swing together.
    const swing = (phase: number) => Math.sin(a + phase);
    const lift = (phase: number) => Math.max(0, Math.cos(a + phase));
    for (const [leg, phase] of [["fl", 0], ["hr", 0], ["fr", Math.PI], ["hl", Math.PI]] as const) {
      const front = leg[0] === "f";
      rig.set(`${leg}-0`, [0, 0, .32 * swing(phase) * (front ? 1 : .8)]);
      // Knees fold during the forward swing; hocks flex the other way.
      rig.set(`${leg}-1`, [0, 0, (front ? -.75 : .55) * lift(phase)]);
      rig.set(`${leg}-2`, [0, 0, (front ? .45 : -.5) * lift(phase)]);
    }
    rig.set("pelvis", [0, 0, .035 * Math.sin(a * 2)], [0, .03 * Math.sin(a * 2 + .6), 0]);
    rig.set("spine", [0, 0, -.025 * Math.sin(a * 2)]);
    rig.set("neck", [0, 0, -.06 * Math.sin(a * 2 + .8)]);
    rig.set("head", [0, .04 * Math.sin(a), -.08 * Math.sin(a * 2 + 1.2)]);
    rig.set("tail-0", [.15 * Math.sin(a), 0, .12 * Math.sin(a)]);
    rig.set("tail-1", [.2 * Math.sin(a - .7), 0, .2 * Math.sin(a - .7)]);
    rig.set("tail-2", [.3 * Math.sin(a - 1.4), 0, .25 * Math.sin(a - 1.4)]);
  } else if (spec.id === "horn-thrust") {
    // Crouch, then drive the head up and forward with an overshooting spring.
    const crouch = pulse(t, 0, .25, .3, .45), thrust = spring(Math.max(0, t - .3) * 1.4, 1.6, .38) * (1 - window01(t, .8, 1));
    rig.set("pelvis", [0, 0, -.04 * crouch + .05 * thrust], [0, -.05 * crouch, 0]);
    rig.set("neck", [0, 0, -.22 * crouch + .4 * thrust]);
    rig.set("head", [0, 0, -.18 * crouch + .34 * thrust]);
    for (const leg of ["hl", "hr"]) rig.set(`${leg}-1`, [0, 0, .25 * crouch]);
    rig.set("tail-1", [0, 0, .4 * thrust]); rig.set("tail-2", [0, 0, .5 * thrust]);
  } else {
    // Two scrapes with the front-left hoof, head lowering, tail lashing.
    const scrape = Math.sin(window01(t, .1, .8) * TAU * 2) * pulse(t, .05, .15, .75, .9);
    rig.set("fl-0", [0, 0, -.35 * Math.max(0, scrape) + .1 * Math.min(0, scrape)]);
    rig.set("fl-1", [0, 0, -.5 * Math.abs(scrape)]);
    rig.set("neck", [0, 0, -.18 * pulse(t, 0, .2, .85, 1)]);
    rig.set("head", [0, .1 * Math.sin(t * TAU * 3) * pulse(t, .1, .3, .7, .95), -.12 * pulse(t, 0, .2, .85, 1)]);
    rig.set("tail-1", [.35 * Math.sin(t * TAU * 4), 0, 0]); rig.set("tail-2", [.5 * Math.sin(t * TAU * 4 - .8), 0, 0]);
  }
}

const BRONZE_EYE: EyeStyle = { pupil: "round", iris: "#3a2414", irisLight: "#6b4a2c", sclera: "#8a6440", finish: "bronze" };

export function createBullSculpture(options: MarketSculptureOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "bull-sculpture";
  const finish = options.finish ?? "aged-bronze";
  const natural = finish === "natural";
  const built = bullSdf();
  const rig = sculpt(res, group, built, natural ? "bull-hide" : "bull-cast-body", [-1.85, -.02, -.9], [2.2, 2.45, .9], finish,
    options.quality ?? "hero", natural ? bullNatural(built.regions) : sculptFinishShading(finish),
    natural ? { pupil: "horizontal", iris: "#2a1a10", irisLight: "#5a3a22", sclera: "#5a4234", finish: "wet", irisSize: .95 } : { ...BRONZE_EYE, pupil: "horizontal" },
    natural ? { flow: [-1, -.2, 0], detailStrength: .0014, sheenColor: "#5a4232" } : {}, BULL_RIG);
  const withPlinth = options.plinth ?? !natural;
  if (withPlinth) plinth(res, group, 4.3, 1.75, .42);
  return {
    id: group.name, group, parts: res.parts, tier: "hero",
    bounds: { min: [-2.2, withPlinth ? -.42 : 0, -.95], max: [2.25, 2.45, .95] },
    exposure: natural ? 1.05 : 1,
    studio: { palette: natural ? "sand" : "graphite", keyAzimuth: -40 },
    craft: {
      materials: natural
        ? ["short-haired hide with sheen and strand relief", "keratin horns (ivory → dark tip)", "wet nose and eyes under clearcoat"]
        : ["cast bronze with chemical patina and polished wear", "polished and honed granite"],
      details: ["single continuous sculpted hide", "crest, shoulder blade and thigh muscle masses", "almond eyelids, horizontal-pupil eyes",
        "brow ridges, carved nostrils", "ringed elliptical horn bases", "carpus, fetlock and hock landmarks", "cloven hooves",
        "rib relief and flank tuck", "whipped tail with tuft"],
      stylization: "Original maquette; slightly heroic proportions for the market metaphor.",
    },
    metersPerUnit: .8,
    actions: BULL_ACTIONS,
    pose: state => poseBull(rig, state),
    dispose: res.dispose,
  };
}

// ------------------------------------------------------------------ bear

/** Swiping bear: heavy shoulder hump, head carried low, right fore-paw raised to strike down. */
export function bearSdf(): Sculpt {
  const coarse = fbm3(31, 3), locks = valueNoise3(57);
  const torso = smoothUnion(.2,
    ellipsoid([-.1, 1.2, 0], [.95, .55, .55]),                        // barrel
    ellipsoid([.5, 1.22, 0], [.56, .6, .56], [0, 0, -.1]),            // chest / forequarters
    ellipsoid([.3, 1.66, 0], [.52, .3, .42], [0, 0, -.12]),           // shoulder hump (grizzly)
    ellipsoid([-.78, 1.22, 0], [.56, .56, .52], [0, 0, .1]),          // rump, lower than hump
    ellipsoid([-.1, .96, 0], [.78, .3, .46]),                         // belly
    roundCone([.78, 1.4, 0], [1.15, 1.2, 0], .44, .36),               // thick neck
    mirrorZ(ellipsoid([-.76, 1.14, .34], [.38, .46, .2], [0, 0, .2])),// haunch
    mirrorZ(ellipsoid([.5, 1.32, .38], [.3, .36, .18], [0, 0, -.3])), // shoulder
  );
  // Broad round head, short dished muzzle, small eyes, cupped ears.
  const head = bounded(smoothUnion(.08,
    ellipsoid([1.3, 1.2, 0], [.36, .33, .36]),                         // skull
    mirrorZ(ellipsoid([1.34, 1.08, .2], [.22, .19, .16])),             // cheek ruff
    roundCone([1.48, 1.12, 0], [1.76, 1.03, 0], .21, .155),            // muzzle, short and broad
    ellipsoid([1.44, 1.32, 0], [.16, .1, .22]),                        // forehead stop
    ellipsoid([1.8, 1.03, 0], [.075, .07, .105]),                      // nose pad
    ellipsoid([1.5, 1.0, 0], [.24, .13, .21], [0, 0, -.2]),            // jaw
    mirrorZ(ellipsoid([1.17, 1.6, .27], [.07, .12, .115], [.35, 0, .1])),// ear, high and round
    mirrorZ(ellipsoid([1.5, 1.28, .15], [.08, .05, .07])),             // brow
  ), [1.45, 1.2, 0], .75);
  // Small, forward-set eyes with round pupils (predator).
  const eye = seatEye(head, [1.42, 1.2, .08], { radius: .034, gaze: [.78, .08, .62],
    aperture: { width: .9, height: .46 }, tilt: .1, lid: .2 }, .33);
  let skull = smoothSubtract(.02, head, mirrorZ(sphere([1.865, 1.03, .045], .024)));      // nostrils
  skull = smoothSubtract(.025, skull, mirrorZ(ellipsoid([1.23, 1.62, .29], [.04, .075, .07], [.35, 0, .1]))); // ear cups
  skull = mirrorZ(carveSocket(skull, eye));
  skull = smoothSubtract(.01, skull, ellipsoid([1.66, .93, 0], [.15, .012, .14], [0, 0, -.2])); // mouth line

  const allClaws: Sdf[] = [];
  const paw = (at: Vec3, yaw = 0, pitch = 0) => {
    const pad = roundBox(at, [.16, .07, .14], .06, { rotation: [0, yaw, pitch] });
    // Five long, curved claws from the front of the paw (pitch tilts the whole paw).
    const c = Math.cos(pitch), s = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const local = (dx: number, dy: number, dz: number): Vec3 => {
      const rx = dx * c - dy * s, ry = dx * s + dy * c;
      return [at[0] + rx * cy + dz * sy, at[1] + ry, at[2] - rx * sy + dz * cy];
    };
    const claws: Sdf[] = [];
    for (let i = 0; i < 5; i++) {
      const dz = (i - 2) * .052 * (1 - Math.abs(i - 2) * .06);
      claws.push(chain([local(.13, -.01, dz), local(.21, -.035, dz * 1.05), local(.26, -.085, dz * 1.08)], [.024, .015, .005], .006));
    }
    allClaws.push(...claws);
    return smoothUnion(.012, pad, ...claws);
  };
  const legs = union(
    // Raised right fore-leg, mid-swipe: paw at chest height, claws hooked down.
    limb([1.05, 1.1, .42], .68,
      chain([[.6, 1.32, .4], [.9, 1.2, .44], [1.18, 1.02, .46], [1.32, .9, .46]], [.24, .19, .15, .13], .07),
      paw([1.42, .84, .46], 0, -.75)),
    // Planted left fore-leg.
    limb([.66, .62, -.38], .78,
      chain([[.6, 1.2, -.38], [.64, .72, -.39], [.68, .3, -.39], [.7, .13, -.38]], [.25, .19, .155, .145], .08),
      paw([.8, .07, -.38], .1)),
    // Hind legs: columnar and plantigrade.
    limb([-.72, .6, .34], .76,
      chain([[-.76, 1.15, .34], [-.7, .68, .34], [-.78, .28, .34], [-.76, .13, .34]], [.27, .2, .16, .15], .08),
      paw([-.66, .07, .34], -.05)),
    limb([-.82, .6, -.34], .76,
      chain([[-.8, 1.15, -.34], [-.82, .68, -.34], [-.9, .28, -.34], [-.88, .13, -.34]], [.27, .2, .16, .15], .08),
      paw([-.78, .07, -.34], .05)),
  );
  const tail = ellipsoid([-1.34, 1.36, 0], [.1, .08, .08], [0, 0, .6]);
  const animal = smoothUnion(.1, smoothUnion(.2, torso, skull), legs, tail);
  // Sculpted coat: strand-like locks elongated along the body (hair lies back),
  // deeper on the hump and haunches, absent on the face plate and paw pads.
  const base = clipBelow(animal, 0);
  const coat = displace(animal, (x, y, z) => {
    const face = 1 - smoothstep(1.38, 1.55, x) * (1 - smoothstep(1.42, 1.56, y));
    const paws = smoothstep(.16, .32, y);
    const hump = .6 + .4 * smoothstep(1.2, 1.7, y);
    const warp = coarse(x * 2, y * 2, z * 2) * .35;
    return face * paws * hump * (.0065 * locks(x * 3.2, (y + warp) * 24, (z + warp) * 24) + .004 * coarse(x * 1.6, y * 7, z * 7));
  });
  return {
    surface: clipBelow(coat, 0), base, eyes: mirrorEye(eye),
    regions: {
      claws: union(...allClaws),
      nose: ellipsoid([1.81, 1.03, 0], [.085, .08, .115]),
      muzzle: roundCone([1.52, 1.1, 0], [1.8, 1.03, 0], .2, .16),
      ears: mirrorZ(ellipsoid([1.23, 1.62, .29], [.05, .08, .075])),
    },
  };
}

/** Living brown bear: darker legs, grizzled tips on hump and back, tan muzzle,
 * black wet nose pad, pale claws darkening toward the tips. */
function bearNatural(regions: Record<string, Sdf>): SculptShading {
  const coat = linearRgb("#3a2416"), leg = linearRgb("#1a110b"), tip = linearRgb("#8a6a4a");
  const muzzle = linearRgb("#6e5238"), nose = linearRgb("#100c0b"), claw = linearRgb("#c7b898"), clawTip = linearRgb("#3a3127");
  const grizzle = fbm3(23, 4), patch = fbm3(41, 2);
  return ({ x, y, z, ny, occlusion, curvature }) => {
    const shade = mix(.3, 1, occlusion);
    const c1 = inside(regions.claws, x, y, z, .01);
    if (c1 > .5) {
      // Claw tips are the most convex points: darken them.
      const c = claw.map((v, i) => mix(v, clawTip[i], smoothstep(.3, .9, curvature)));
      return [c[0] * shade, c[1] * shade, c[2] * shade, .45, 0];
    }
    const n = inside(regions.nose, x, y, z, .02);
    let c = coat.map((v, i) => mix(v, leg[i], 1 - smoothstep(.45, .95, y)));
    const g = grizzle(x * 9, y * 9, z * 9) * .5 + .5;
    c = c.map((v, i) => mix(v, tip[i], smoothstep(.45, .8, g) * clamp01(ny + .2) * smoothstep(1.0, 1.5, y) * .45));
    c = c.map((v, i) => mix(v, muzzle[i], inside(regions.muzzle, x, y, z, .06) * .8));
    c = c.map(v => v * (1 - inside(regions.ears, x, y, z, .04) * .5));
    c = c.map(v => v * (.85 + patch(x * 2, y * 2, z * 2) * .3));
    c = c.map((v, i) => mix(v, nose[i], n));
    return [c[0] * shade, c[1] * shade, c[2] * shade, mix(1, .3, n), 0];
  };
}

const BEAR_RIG: RigBoneSpec[] = [
  { name: "pelvis", head: [-.4, 1.2, 0], tail: [-1.2, 1.25, 0], radius: .55 },
  { name: "spine", parent: "pelvis", head: [-.4, 1.2, 0], tail: [.6, 1.4, 0], radius: .6 },
  { name: "neck", parent: "spine", head: [.7, 1.38, 0], tail: [1.05, 1.24, 0], radius: .34 },
  { name: "head", parent: "neck", head: [1.12, 1.2, 0], tail: [1.9, 1.02, 0], radius: .4 },
  ...legBones("fr", "spine", [[.6, 1.32, .4], [.9, 1.2, .44], [1.18, 1.02, .46], [1.34, .88, .46], [1.62, .62, .46]], [.22, .16, .13, .12]),
  ...legBones("fl", "spine", [[.6, 1.2, -.38], [.64, .72, -.39], [.68, .3, -.39], [.7, .13, -.38], [.98, .05, -.38]], [.22, .17, .14, .12]),
  ...legBones("hl", "pelvis", [[-.76, 1.15, .34], [-.7, .68, .34], [-.78, .28, .34], [-.76, .13, .34], [-.5, .05, .34]], [.24, .18, .15, .12]),
  ...legBones("hr", "pelvis", [[-.8, 1.15, -.34], [-.82, .68, -.34], [-.9, .28, -.34], [-.88, .13, -.34], [-.62, .05, -.34]], [.24, .18, .15, .12]),
];

export const BEAR_ACTIONS: readonly HeroActionSpec[] = [
  { id: "swipe", label: "Swipe down", durationFrames: 36, loop: false, meaning: "Prices struck down: the bear attacks by swiping its paw downward." },
  { id: "growl", label: "Growl", durationFrames: 48, loop: false, meaning: "Threat and pessimism: shoulders hunch, head lunges low." },
  { id: "idle", label: "Idle breathing", durationFrames: 90, loop: true, meaning: "Living presence without changing the message." },
];

function poseBear(rig: AutoRig, state: HeroActionState) {
  rig.reset();
  if (!state.id) return;
  const spec = findAction(BEAR_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
  if (spec.id === "swipe") {
    // Wind-up (paw rises and draws back), fast strike down through the arc, follow-through, recover.
    const wind = easeInOut(t / .35) * (1 - window01(t, .35, .48));
    const strike = easeOutCubic((t - .35) / .15) * (1 - window01(t, .7, 1));
    // Big readable arc: paw raised to head height, then slammed down to the ground.
    rig.set("fr-0", [-.2 * wind, 0, 1.0 * wind - .95 * strike]);
    rig.set("fr-1", [0, 0, -.55 * wind + .45 * strike]);
    rig.set("fr-2", [0, 0, .45 * wind - .35 * strike]);
    rig.set("spine", [.06 * strike, 0, -.1 * strike + .07 * wind]);
    rig.set("pelvis", [0, 0, 0], [-.06 * wind + .07 * strike, -.03 * strike, 0]);
    rig.set("neck", [0, .05 * strike, -.1 * strike + .1 * wind]);
    rig.set("head", [0, .05 * strike, -.06 * strike]);
  } else if (spec.id === "growl") {
    const hunch = smooth(t / .3) * (1 - window01(t, .8, 1));
    const shake = Math.sin(t * TAU * 6) * pulse(t, .3, .4, .65, .8);
    rig.set("spine", [0, 0, .06 * hunch]);
    rig.set("neck", [0, .04 * shake, -.25 * hunch]);
    rig.set("head", [.05 * shake, .05 * shake, -.12 * hunch]);
    rig.set("fr-0", [0, 0, -.15 * hunch]);
  } else {
    const breath = Math.sin(t * TAU);
    rig.set("spine", [0, 0, .012 * breath], [0, .008 * breath, 0]);
    rig.set("head", [0, .04 * Math.sin(t * TAU * 2), .02 * breath]);
  }
}

export function createBearSculpture(options: MarketSculptureOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "bear-sculpture";
  const finish = options.finish ?? "aged-bronze";
  const natural = finish === "natural";
  const built = bearSdf();
  const rig = sculpt(res, group, built, natural ? "bear-coat" : "bear-cast-body", [-1.55, -.02, -.85], [2.0, 2.1, .85], finish,
    options.quality ?? "hero", natural ? bearNatural(built.regions) : sculptFinishShading(finish),
    natural ? { pupil: "round", iris: "#2a180c", irisLight: "#5a3618", sclera: "#3c2a1e", finish: "wet", irisSize: 1.0 } : BRONZE_EYE,
    { flow: [-1, -.25, 0], detailStrength: natural ? .0045 : .0022, sheenColor: "#8a6a4c" }, BEAR_RIG);
  const withPlinth = options.plinth ?? !natural;
  if (withPlinth) plinth(res, group, 3.7, 1.7, .42);
  return {
    id: group.name, group, parts: res.parts, tier: "hero",
    bounds: { min: [-1.95, withPlinth ? -.42 : 0, -.9], max: [2.0, 2.05, .9] },
    exposure: natural ? 1 : 1,
    studio: { palette: natural ? "sand" : "graphite", keyAzimuth: -40 },
    craft: {
      materials: natural
        ? ["brown coat with grizzled tips, sheen and strand relief", "keratin claws", "wet nose pad and eyes"]
        : ["cast bronze with chemical patina and polished wear", "polished and honed granite"],
      details: ["shoulder hump and hanging belly", "dished face, almond-lidded round-pupil eyes, cupped round ears", "raised fore-paw mid-swipe",
        "five curved claws per paw", "sculpted fur locks flowing back and down", "plantigrade hind legs"],
      stylization: "Original maquette; fur is sculpted relief, not simulated hair.",
    },
    metersPerUnit: .65,
    actions: BEAR_ACTIONS,
    pose: state => poseBear(rig, state),
    dispose: res.dispose,
  };
}
