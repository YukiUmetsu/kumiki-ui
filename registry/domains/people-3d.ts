/** Crafted people: a reusable presenter figure for explainers.
 *
 * Stylized-realistic, not photoreal (that needs scanned assets and risks the
 * uncanny valley). Built like a real-time character:
 * - a dressed body (blazer with lapels and buttons, shirt V with tie, creased
 *   trousers, leather shoes) sculpted as one SDF at 1.2 cm and auto-rigged;
 * - head and hands meshed separately at 4 / 3.5 mm and carried rigidly by
 *   their bones, seams hidden under collar and cuffs;
 * - hands sculpted in four poses (relaxed, open, point, grip) and switched
 *   per action; seated, lidded eyes; sculpted hair, brows and lips.
 * Units are meters; the figure faces +Z; "left/right" are the figure's own.
 */
import { Group, Mesh } from "three";
import { Euler, MeshPhysicalMaterial, Vector3 } from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { paintTexture } from "../craft/canvas-texture";
import type { Object3D } from "three";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import {
  bounded, chain, clamp01, displace, ellipsoid, fbm3, linearRgb, meshSdfCached, mirrorX, mix, roundBox, roundCone,
  sculptGeometry, smoothstep, smoothSubtract, smoothUnion, sphere, torus, union,
} from "../craft/sdf-sculpt";
import type { Sdf, SculptShading, Vec3 } from "../craft/sdf-sculpt";
import { createSculptMaterial } from "../craft/sculpt-finish";
import { createAutoRig } from "../craft/auto-rig";
import type { AutoRig, RigBoneSpec } from "../craft/auto-rig";
import { actionTime, easeInOut, findAction, pulse, smooth, TAU, window01 } from "../craft/hero-action";
import type { HeroActionSpec, HeroActionState } from "../craft/hero-action";

export type SkinTone = "light" | "medium" | "tan" | "deep";
const SKIN: Record<SkinTone, string> = { light: "#e9c3a6", medium: "#cc966f", tan: "#a66f4c", deep: "#6e432c" };

export interface PresenterOptions {
  id?: string;
  skin?: SkinTone;
  hair?: string;
  hairStyle?: "short" | "long";
  eyes?: string;
  jacket?: string;
  trousers?: string;
  tie?: string;
  /** A prop held in the right hand (e.g. a smartphone or card asset). Scaled from its metersPerUnit. */
  holding?: HeroAsset;
}

// ------------------------------------------------------------------ anatomy

const L = { shoulder: [.185, 1.38, -.005] as Vec3, elbow: [.235, 1.1, -.02] as Vec3, wrist: [.262, .845, .005] as Vec3 };
const HIP: Vec3 = [.09, .925, 0], KNEE: Vec3 = [.1, .5, .015], ANKLE: Vec3 = [.1, .09, -.01];
const COLLAR_Y = 1.43;

function bodySdf() {
  const wrinkle = fbm3(13, 3);
  // Blazer: chest, waist, skirt to the hip, shoulder pads, sleeves to the wrist with cuffs.
  const torso = smoothUnion(.06,
    ellipsoid([0, 1.3, -.008], [.18, .16, .112]),                    // chest
    ellipsoid([0, 1.12, -.002], [.142, .14, .1]),                    // waist, tailored in
    ellipsoid([0, .97, 0], [.142, .095, .102]),                      // jacket hem over the hips
    mirrorX(ellipsoid([.172, 1.392, -.012], [.06, .034, .07])),      // squared shoulder pad
    roundCone([0, 1.36, -.02], [0, COLLAR_Y + .01, -.01], .1, .07),  // upper back / neck base
  );
  const sleeves = mirrorX(smoothUnion(.012,
    chain([[.172, 1.375, -.008], L.elbow, [L.wrist[0], L.wrist[1] + .035, L.wrist[2]]], [.049, .041, .034], .02),
    torus([L.wrist[0] - .001, L.wrist[1] + .04, L.wrist[2]], .03, .008),          // cuff
  ));
  // Small blend radius keeps the armpit defined instead of fusing arms to torso.
  const jacket = smoothUnion(.018, torso, sleeves);
  // Lapels: shallow ridges framing the shirt V, plus three buttons.
  const lapels = mirrorX(roundCone([.03, 1.16, .106], [.08, 1.37, .092], .009, .013));
  const buttons = union(...[1.13, 1.04, .95].map(y => sphere([0, y, .108], .009)));
  const coat = displace(smoothUnion(.02, jacket, lapels, buttons), (x, y, z) => .0025 * wrinkle(x * 18, y * 18, z * 18));
  // Shirt collar ring.
  const collar = smoothSubtract(.01, torus([0, COLLAR_Y, .005], .058, .016), ellipsoid([0, COLLAR_Y + .02, .07], [.03, .03, .03]));
  // Trousers with a front crease, slight break at the hem.
  const legs = mirrorX(smoothUnion(.04,
    chain([[.082, .95, 0], HIP, KNEE, [ANKLE[0], ANKLE[1] + .03, ANKLE[2]]], [.079, .071, .054, .047], .04),
    ellipsoid([.09, .76, -.015], [.066, .11, .066]),
  ));
  const trousers = displace(smoothUnion(.03, ellipsoid([0, .905, 0], [.132, .088, .096]), legs), (x, y, z) => {
    const crease = Math.exp(-Math.pow((Math.abs(x) - .1) / .008, 2)) * smoothstep(.1, .3, y) * (1 - smoothstep(.85, .92, y));
    return -.004 * crease * (z > 0 ? 1 : 0) + .0018 * wrinkle(x * 22, y * 22, z * 22);
  });
  // Leather shoes with welt and sole.
  const shoe = mirrorX(smoothUnion(.02,
    roundBox([.1, .045, .045], [.045, .04, .125], .03, { taper: .15 }),
    ellipsoid([.1, .055, -.06], [.045, .05, .05]),
  ));
  const neckBase = roundCone([0, COLLAR_Y - .05, -.005], [0, COLLAR_Y + .03, 0], .058, .056);
  const surface = union(smoothUnion(.015, coat, collar), trousers, shoe, neckBase);
  return { surface, coat, collar, trousers, shoe };
}

/** Stylized editorial head: egg-shaped skull, soft jaw, small nose, smile groove, bold sculpted hair. */
function headSdf(style: "short" | "long") {
  const strands = fbm3(29, 3);
  const skull = smoothUnion(.035,
    ellipsoid([0, 1.652, -.004], [.084, .106, .094]),                 // egg-shaped skull
    ellipsoid([0, 1.588, .014], [.064, .055, .078]),                  // soft jaw and cheeks
    mirrorX(ellipsoid([.081, 1.632, -.006], [.011, .024, .017], [0, .3, 0])), // ears
    roundCone([0, 1.56, -.014], [0, COLLAR_Y - .03, -.004], .046, .05), // neck into the collar
  );
  const nose = ellipsoid([0, 1.62, .093], [.0105, .016, .0125]);
  let head = smoothUnion(.01, skull, nose);
  // Gentle smile: a shallow groove along a short arc.
  const arc: Vec3[] = Array.from({ length: 7 }, (_, i) => { const a = -.55 + i * (1.1 / 6); return [Math.sin(a) * .022, 1.585 - Math.cos(a) * .006 + .006, .088 - Math.abs(Math.sin(a)) * .006]; });
  head = smoothSubtract(.003, head, chain(arc, arc.map(() => .0022), .002));
  const eyes = mirrorX(ellipsoid([.033, 1.637, .084], [.0095, .0125, .006]));
  // Hair: a bold shape with a side part and a quiff; long style adds back and side curtains.
  // Hugs the skull at the sides, gains volume on top, sweeps into a soft quiff.
  let hair = smoothSubtract(.02, ellipsoid([0, 1.678, -.012], [.089, .093, .101]),
    ellipsoid([0, 1.6, .1], [.13, .062, .075]));
  hair = smoothUnion(.03, hair, ellipsoid([.012, 1.738, .022], [.08, .036, .075], [-.2, 0, .1]));     // quiff volume
  hair = smoothSubtract(.008, hair, ellipsoid([-.032, 1.758, .01], [.005, .025, .075]));               // side part
  if (style === "long") hair = smoothUnion(.03, hair, ellipsoid([0, 1.57, -.06], [.092, .12, .05]), mirrorX(ellipsoid([.074, 1.6, -.005], [.02, .08, .05])));
  // Broad, smooth clumps (stylized), not fine bristles.
  hair = displace(hair, (x, y, z) => -.0035 * Math.pow(Math.abs(Math.sin(Math.atan2(x, z + .02) * 7 + strands(x * 12, y * 12, z * 12) * 2.5)), 3));
  const brows = mirrorX(roundCone([.017, 1.666, .088], [.048, 1.669, .079], .0042, .0032));
  const surface = smoothUnion(.004, head, hair, brows);
  return { surface, base: smoothUnion(.004, head, hair), eyes, hair, brows, lips: (x: number, y: number, z: number) => .5 + 0 * (x + y + z) };
}

type HandPose = "relaxed" | "open" | "point" | "grip";
const CURL: Record<HandPose, { fingers: [number, number, number, number]; thumb: number; index?: number }> = {
  relaxed: { fingers: [.45, .55, .6, .65], thumb: .35 },
  open: { fingers: [.05, .05, .08, .1], thumb: .1 },
  point: { fingers: [1.35, 1.45, 1.5, 1.5], thumb: 1.0, index: .02 },
  grip: { fingers: [1.05, 1.1, 1.15, 1.2], thumb: .8 },
};

/** Left hand in wrist-local space: hangs along -Y, palm faces -X, thumb toward +Z. */
function handSdf(pose: HandPose): Sdf {
  const c = CURL[pose];
  const palm = roundBox([0, -.05, .004], [.013, .045, .038], .012);
  const fingers: Sdf[] = [];
  const lengths = [.075, .082, .077, .062], zs = [.027, .009, -.009, -.026];
  zs.forEach((z, i) => {
    const curl = i === 0 && c.index !== undefined ? c.index : c.fingers[i];
    let p: Vec3 = [-.002, -.093, z], dir = -Math.PI / 2;
    const pts: Vec3[] = [p];
    for (const seg of [.45, .3, .25]) {
      dir -= curl * (seg === .45 ? .5 : .8);               // curl toward the palm (-X)
      p = [p[0] + Math.cos(dir) * lengths[i] * seg, p[1] + Math.sin(dir) * lengths[i] * seg, p[2]];
      pts.push(p);
    }
    fingers.push(chain(pts, [.0095, .0088, .008, .0072], .004));
  });
  const thumbPts: Vec3[] = [[-.008, -.02, .03], [-.022, -.045, .048]];
  const tc = c.thumb;
  thumbPts.push([-.03 - .012 * tc, -.07 + .01 * tc, .055 - .02 * tc], [-.036 - .02 * tc, -.09 + .02 * tc, .052 - .035 * tc]);
  const thumb = chain(thumbPts, [.012, .011, .0095, .0085], .005);
  const wrist = roundCone([0, .02, 0], [0, -.012, .002], .025, .022);
  return smoothUnion(.008, palm, thumb, wrist, ...fingers);
}

// ------------------------------------------------------------------ shading

function presenterShading(opts: Required<Omit<PresenterOptions, "id" | "holding">>, regions: Record<string, Sdf>): SculptShading {
  const skin = linearRgb(SKIN[opts.skin]), blush = linearRgb("#c56a5c"), hair = linearRgb(opts.hair);
  const jacket = linearRgb(opts.jacket), shirt = linearRgb("#eef0f2");
  const trousers = linearRgb(opts.trousers), shoe = linearRgb("#3a2418"), sole = linearRgb("#16110e"), button = linearRgb("#15171b");
  const lips = linearRgb("#a45a52");
  const tone = fbm3(3, 2);
  return ({ x, y, z, occlusion, curvature }) => {
    const shade = mix(.42, 1, occlusion);
    // A vertex takes the material of the region whose surface it lies on (within 5 mm); else it is skin.
    let best = "skin", d = .005;
    for (const [name, region] of Object.entries(regions)) {
      const v = region(x, y, z);
      if (v < d) { d = v; best = name; }
    }
    let c: number[], rough = 1;
    // Hair and lips blend softly into skin (no jagged color edges at the hairline).
    const hairW = clamp01((.008 - Math.min(regions.hair(x, y, z), regions.brows(x, y, z))) / .006);
    const lipW = clamp01((.004 - regions.lips(x, y, z)) / .006);
    if (best === "hair" || best === "brows" || best === "lips") best = "skin";
    switch (best) {
      case "coat": {
        // Shirt and tie are a projected decal (crisp); vertices carry cloth and buttons.
        const isButton = z > .1 && Math.abs(x) < .012 && [1.13, 1.04, .95].some(b => Math.abs(y - b) < .011);
        c = isButton ? button : jacket.map(v => v * (1 + clamp01(curvature) * .25));
        rough = isButton ? .4 : 1;
        break;
      }
      case "collar": c = shirt; rough = .8; break;
      case "trousers": c = trousers; rough = .9; break;
      case "shoe": c = y < .012 ? sole : shoe; rough = y < .012 ? .9 : .38; break;
      default: {
        // Skin: warmer on cheeks, nose and ears; slight tonal variation.
        const warm = clamp01(1 - Math.hypot(Math.abs(x) - .045, y - 1.6, z - .06) / .04) * .35 + clamp01(1 - Math.hypot(x, y - 1.6, z - .1) / .025) * .3;
        c = skin.map((v, i) => mix(v, blush[i], warm) * (.94 + .12 * tone(x * 30, y * 30, z * 30)));
        c = c.map((v, i) => mix(v, lips[i], lipW * .6));
        const strands = hair.map(v => v * (.8 + .35 * tone(x * 40, y * 40, z * 40)));
        c = c.map((v, i) => mix(v, strands[i], hairW));
        rough = mix(mix(.68, .65, lipW), .78, hairW);
      }
    }
    return [c[0] * shade, c[1] * shade, c[2] * shade, rough, 1];
  };
}

/** Shirt V with knotted tie and soft lapel shadows, painted for a chest decal. */
const shirtFront = (tieColor: string) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.clearRect(0, 0, w, h);
  const vTop = 0, vBottom = h * .97;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(w * .03, vTop); ctx.lineTo(w * .97, vTop); ctx.lineTo(w * .5, vBottom); ctx.closePath(); ctx.clip();
  const cloth = ctx.createLinearGradient(0, 0, w, 0);
  cloth.addColorStop(0, "#d9dde2"); cloth.addColorStop(.5, "#f4f6f8"); cloth.addColorStop(1, "#d6dadf");
  ctx.fillStyle = cloth; ctx.fillRect(0, 0, w, h);
  // Placket fold and soft lapel shadows along both edges.
  ctx.strokeStyle = "rgba(120,130,140,.25)"; ctx.lineWidth = w * .006;
  ctx.beginPath(); ctx.moveTo(w * .5, h * .25); ctx.lineTo(w * .5, vBottom); ctx.stroke();
  for (const s of [-1, 1]) {
    const g = ctx.createLinearGradient(w * .5 + s * w * .5, 0, w * .5 + s * w * .3, 0);
    g.addColorStop(0, "rgba(10,20,40,.55)"); g.addColorStop(1, "rgba(10,20,40,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  // Tie: knot, then a blade that widens toward the bottom, with diagonal stripes.
  ctx.fillStyle = tieColor;
  ctx.beginPath(); ctx.moveTo(w * .43, h * .02); ctx.lineTo(w * .57, h * .02); ctx.lineTo(w * .54, h * .13); ctx.lineTo(w * .46, h * .13); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w * .465, h * .13); ctx.lineTo(w * .535, h * .13); ctx.lineTo(w * .58, h * .9); ctx.lineTo(w * .5, h * .99); ctx.lineTo(w * .42, h * .9); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = w * .012;
  for (let i = -10; i < 30; i++) { ctx.beginPath(); ctx.moveTo(w * .3, h * .05 * i); ctx.lineTo(w * .7, h * .05 * i + h * .12); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(w * .44, h * .125, w * .12, h * .012); // knot shadow
  ctx.restore();
};

// ------------------------------------------------------------------ rig and actions

const side = (s: 1 | -1, p: Vec3): Vec3 => [p[0] * s, p[1], p[2]];
const RIG: RigBoneSpec[] = [
  { name: "pelvis", head: [0, .94, 0], tail: [0, 1.06, 0], radius: .14 },
  { name: "spine", parent: "pelvis", head: [0, 1.06, 0], tail: [0, 1.26, 0], radius: .15 },
  { name: "chest", parent: "spine", head: [0, 1.26, 0], tail: [0, COLLAR_Y, 0], radius: .15 },
  { name: "neck", parent: "chest", head: [0, COLLAR_Y, -.005], tail: [0, 1.52, 0], radius: .05 },
  { name: "head", parent: "neck", head: [0, 1.52, 0], tail: [0, 1.75, 0], radius: .1 },
  ...([1, -1] as const).flatMap(s => {
    const n = s > 0 ? "l" : "r";
    return [
      { name: `arm-${n}`, parent: "chest", head: side(s, L.shoulder), tail: side(s, L.elbow), radius: .05 },
      { name: `forearm-${n}`, parent: `arm-${n}`, head: side(s, L.elbow), tail: side(s, L.wrist), radius: .045 },
      { name: `hand-${n}`, parent: `forearm-${n}`, head: side(s, L.wrist), tail: side(s, [L.wrist[0], .7, .02]), radius: .03 },
      { name: `thigh-${n}`, parent: "pelvis", head: side(s, HIP), tail: side(s, KNEE), radius: .08 },
      { name: `shin-${n}`, parent: `thigh-${n}`, head: side(s, KNEE), tail: side(s, ANKLE), radius: .06 },
      { name: `foot-${n}`, parent: `shin-${n}`, head: side(s, ANKLE), tail: side(s, [.1, .03, .15]), radius: .055 },
    ] satisfies RigBoneSpec[];
  }),
];

export const PRESENTER_ACTIONS: readonly HeroActionSpec[] = [
  { id: "wave", label: "Wave hello", durationFrames: 60, loop: false, meaning: "Greeting / introduction: the presenter waves." },
  { id: "point", label: "Point", durationFrames: 48, loop: false, meaning: "Look here: points to the figure's left (screen right)." },
  { id: "present", label: "Present", durationFrames: 45, loop: false, meaning: "Here it is: both palms open toward the subject." },
  { id: "hold-out", label: "Hold out", durationFrames: 40, loop: false, meaning: "Shows the held prop (card, phone) to the viewer." },
  { id: "walk", label: "Walk (in place)", durationFrames: 32, loop: true, meaning: "Moving on / a journey: an in-place walk cycle." },
  { id: "idle", label: "Idle", durationFrames: 120, loop: true, meaning: "Alive and attentive without changing the message." },
];

function posePresenter(rig: AutoRig, state: HeroActionState, setHands: (l: HandPose, r: HandPose) => void) {
  rig.reset();
  setHands("relaxed", "relaxed");
  if (!state.id) return;
  const spec = findAction(PRESENTER_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
  const inOut = (a: number, b: number, c: number, d: number) => easeInOut(window01(t, a, b)) * (1 - easeInOut(window01(t, c, d)));
  switch (spec.id) {
    case "wave": {
      const up = inOut(0, .2, .8, 1), wave = Math.sin(window01(t, .2, .8) * TAU * 3) * up;
      rig.set("arm-r", [-.2 * up, 0, -2.45 * up]);
      rig.set("forearm-r", [0, 0, -.35 * up + .3 * wave]);
      rig.set("chest", [0, -.1 * up, .04 * up]);
      rig.set("head", [.05 * up, -.12 * up, .04 * up]);
      setHands("relaxed", up > .3 ? "open" : "relaxed");
      break;
    }
    case "point": {
      const k = inOut(0, .3, .85, 1);
      rig.set("arm-l", [-.25 * k, .3 * k, 1.42 * k]);
      rig.set("forearm-l", [0, 0, .08 * k]);
      rig.set("chest", [0, .18 * k, 0]);
      rig.set("head", [0, .42 * k, 0]);
      setHands(k > .3 ? "point" : "relaxed", "relaxed");
      break;
    }
    case "present": {
      const k = inOut(0, .3, .8, 1);
      // Elbows stay low and soft; forearms come forward with palms up and out.
      for (const [n, s] of [["l", 1], ["r", -1]] as const) {
        rig.set(`arm-${n}`, [-.32 * k, 0, s * .32 * k]);
        rig.set(`forearm-${n}`, [-1.05 * k, s * .25 * k, 0]);
        rig.set(`hand-${n}`, [0, s * -1.2 * k, 0]);
      }
      rig.set("chest", [-.04 * k, 0, 0]);
      setHands(k > .3 ? "open" : "relaxed", k > .3 ? "open" : "relaxed");
      break;
    }
    case "hold-out": {
      const k = easeInOut(t / .6);
      rig.set("arm-r", [-.85 * k, 0, -.12 * k]);
      rig.set("forearm-r", [-.75 * k, 0, 0]);
      // Turn the wrist so the held object stands upright and faces the viewer.
      rig.set("hand-r", [1.45 * k, .2 * k, 0]);
      rig.set("head", [.18 * k, -.12 * k, 0]);
      setHands("relaxed", "grip");
      break;
    }
    case "walk": {
      const a = t * TAU;
      for (const [n, s] of [["l", 1], ["r", -1]] as const) {
        const ph = s > 0 ? 0 : Math.PI;
        rig.set(`thigh-${n}`, [-.42 * Math.sin(a + ph), 0, 0]);
        rig.set(`shin-${n}`, [.7 * Math.max(0, Math.sin(a + ph + 1.2)), 0, 0]);
        rig.set(`foot-${n}`, [-.15 * Math.sin(a + ph), 0, 0]);
        rig.set(`arm-${n}`, [.32 * Math.sin(a + ph), 0, s * .06]);
        rig.set(`forearm-${n}`, [-.25 - .15 * Math.sin(a + ph), 0, 0]);
      }
      rig.set("pelvis", [0, .06 * Math.sin(a), 0], [0, .012 * Math.cos(a * 2), 0]);
      rig.set("chest", [0, -.08 * Math.sin(a), 0]);
      break;
    }
    default: {
      const b = Math.sin(t * TAU), sway = Math.sin(t * TAU * .5);
      rig.set("chest", [-.015 * b, 0, 0]);
      rig.set("pelvis", [0, 0, .015 * sway], [.008 * sway, 0, 0]);
      rig.set("head", [.02 * Math.sin(t * TAU * 2 + 1), .05 * sway, 0]);
      void pulse; void smooth;
    }
  }
}

// ------------------------------------------------------------------ asset

export function createPresenter(options: PresenterOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "presenter";
  const o = {
    skin: options.skin ?? "medium", hair: options.hair ?? "#2b1d15", hairStyle: options.hairStyle ?? "short",
    eyes: options.eyes ?? "#1c1410", jacket: options.jacket ?? "#1f2c44", trousers: options.trousers ?? "#2c2f35", tie: options.tie ?? "#8a2f3a",
  } as const;
  const body = bodySdf(), head = headSdf(o.hairStyle);
  const regions = { coat: body.coat, collar: body.collar, trousers: body.trousers, shoe: body.shoe, hair: head.hair, brows: head.brows, lips: head.lips };
  const shading = presenterShading({ ...o }, regions);
  const fabric = res.own(createSculptMaterial("natural", { detail: "fabric", detailFrequency: 380, detailStrength: .00012, flow: [0, 1, 0], sheenColor: "#8a94a8" }));
  fabric.sheen = .35;
  const skinMat = res.own(createSculptMaterial("natural", { detail: "glaze", detailFrequency: 260, detailStrength: .00003, sheenColor: "#ffd9c4" }));
  skinMat.sheen = .2; skinMat.roughness = .68;
  // Body (skinned).
  const bodyMesh = meshSdfCached("presenter-body", () => body.surface,
    { min: [-.36, -.01, -.2], max: [.36, 1.5, .22], cellSize: .012, occlusionDistance: .05 });
  const rig = createAutoRig(res.own(sculptGeometry(bodyMesh, shading)), fabric, RIG, { sharpness: 2.6 });
  rig.mesh.castShadow = true; rig.mesh.receiveShadow = true;
  group.add(res.name(rig.mesh, "presenter-dressed-body"));
  // Crisp shirt V and tie: a painted decal projected onto the chest, carried by the chest bone.
  rig.mesh.updateMatrixWorld(true);
  const shirtMap = res.own(paintTexture(512, 820, shirtFront(o.tie), { seed: 2, fallback: [0, 0, 0, 0] }));
  const shirtDecal = new Mesh(res.own(new DecalGeometry(rig.mesh, new Vector3(0, 1.295, .13), new Euler(0, 0, 0), new Vector3(.17, .28, .12))),
    res.own(new MeshPhysicalMaterial({ map: shirtMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: .7, sheen: .2 })));
  group.add(res.name(shirtDecal, "presenter-shirt-and-tie"));
  rig.attach("chest", shirtDecal);
  // Head (rigid on the head bone), eyes and lids.
  const headMesh = meshSdfCached(`presenter-head-${o.hairStyle}`, () => ({ surface: head.surface, shading: head.base }),
    { min: [-.11, COLLAR_Y - .06, -.13], max: [.11, 1.8, .135], cellSize: .0042, occlusionDistance: .025 });
  // Stylized proportion: the head is 1.1× life size, scaled about the neck pivot.
  const HEAD_SCALE = 1.1, scaleHead = <T extends import("three").BufferGeometry>(g: T) => g.translate(0, -1.52, 0).scale(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE).translate(0, 1.52, 0);
  const headObj = new Mesh(res.own(scaleHead(sculptGeometry(headMesh, shading))), skinMat);
  headObj.castShadow = true; headObj.receiveShadow = true;
  group.add(res.name(headObj, "presenter-head"));
  rig.attach("head", headObj);
  // Eyes: glossy dark inlays, set into the surface (stylized, friendly at every distance).
  const eyeMesh = meshSdfCached("presenter-eyes", () => head.eyes, { min: [-.05, 1.62, .07], max: [.05, 1.655, .096], cellSize: .0012, occlusionDistance: .004 });
  const eyeMat = res.own(new MeshPhysicalMaterial({ color: o.eyes, roughness: .08, clearcoat: 1, clearcoatRoughness: .02 }));
  const eyeObj = new Mesh(res.own(scaleHead(sculptGeometry(eyeMesh))), eyeMat);
  group.add(res.name(eyeObj, "presenter-eyes"));
  rig.attach("head", eyeObj);
  // Hands: four sculpted poses per side, toggled per action.
  const hands: Record<"l" | "r", Record<HandPose, Object3D>> = { l: {} as Record<HandPose, Object3D>, r: {} as Record<HandPose, Object3D> };
  for (const pose of ["relaxed", "open", "point", "grip"] as HandPose[]) {
    const mesh = meshSdfCached(`presenter-hand-${pose}`, () => bounded(handSdf(pose), [0, -.05, 0], .16),
      { min: [-.09, -.17, -.06], max: [.06, .04, .09], cellSize: .0035, occlusionDistance: .015 });
    const geo = res.own(sculptGeometry(mesh, () => [...linearRgb(SKIN[o.skin]), .55, 1] as const));
    for (const s of [1, -1] as const) {
      const n = s > 0 ? "l" : "r";
      const hand = new Mesh(geo, skinMat as MeshPhysicalMaterial);
      hand.scale.x = s;              // mirror for the right hand
      hand.position.set(...side(s, L.wrist));
      hand.castShadow = true; hand.receiveShadow = true;
      hand.visible = pose === "relaxed";
      group.add(res.name(hand, `presenter-hand-${n}-${pose}`));
      rig.attach(`hand-${n}`, hand);
      hands[n][pose] = hand;
    }
  }
  const setHands = (l: HandPose, r: HandPose) => {
    for (const pose of Object.keys(hands.l) as HandPose[]) { hands.l[pose].visible = pose === l; hands.r[pose].visible = pose === r; }
  };
  // Optional prop in the right hand at true scale.
  if (options.holding) {
    const prop = new Group();
    prop.name = "presenter-held-prop";
    prop.scale.setScalar(options.holding.metersPerUnit);
    prop.add(options.holding.group);
    prop.position.set(-L.wrist[0] + .012, L.wrist[1] - .1, L.wrist[2] + .035); // seated in the grip, against the palm
    prop.rotation.set(0, 0, 0); // screen faces forward when the wrist turns up (hold-out)
    group.add(prop);
    rig.attach("hand-r", prop);
  }
  const held = options.holding;
  return {
    id: group.name, group, parts: res.parts, tier: "hero", metersPerUnit: 1, exposure: 1,
    bounds: { min: [-.45, 0, -.25], max: [.45, 1.85, .3] },
    studio: { palette: "slate", keyAzimuth: -30 },
    craft: {
      materials: ["wool blazer and trousers with weave relief and sheen", "cotton shirt and silk tie", "leather shoes", "skin with warm zones and sheen", "wet eyes"],
      details: ["blazer lapels, three buttons, squared shoulders and cuffs", "trouser crease", "egg-shaped head, inlaid glossy eyes, brows, small nose, smile groove",
        "sculpted hair with side part, quiff and strand grooves", "fine hand meshes in four poses", "auto-rigged body; rigid head and hands with seams under collar and cuffs"],
      stylization: "Stylized editorial character (designer-toy face) by design: friendly at every distance, avoids the uncanny valley; not a likeness of any person.",
    },
    actions: PRESENTER_ACTIONS,
    pose(state) {
      posePresenter(rig, state, setHands);
      held?.pose?.({ id: null, frame: 0 });
    },
    dispose() { res.dispose(); held?.dispose(); },
  };
}

