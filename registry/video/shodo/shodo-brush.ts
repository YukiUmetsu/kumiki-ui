/**
 * SHO1 brush (筆): a 3D fude drawn with Canvas 2D under a top-down pinhole camera.
 *
 * Construction, from the paper up:
 * - 穂 tuft: a flame-shaped bundle (命毛 point, 腹 belly, 腰 waist at the ferrule). In
 *   contact, the pressed part lies flat on the paper as the same teardrop the ink model
 *   deposits, then bends up to the ferrule. In the air it springs back with a damped
 *   wobble. Ink soaks the hair from the tip up to a load line; wet hair is glossy.
 * - A long black lacquer collar (首) where the tuft is set into the handle.
 * - 軸 handle: procedural cane with one node (節), grain and specks, a black end cap and a cord.
 * See docs/research/shodo-brush-reference-2026-11-16.md for the photographs these follow (R1–R6).
 * - A cast shadow on the paper that tightens to the contact as the brush lands.
 *
 * Every input comes from `shodoBrushPose`; the brush and the ink share one contact patch.
 */
import { inkHash } from "../ink-brush";
import type { ShodoBrushPose } from "./shodo-hand";
import { SHODO_TIP_SHARE, shodoContactLength, shodoContactWidth } from "./shodo-hand";
import type { ShodoBrush, ShodoInk } from "./shodo-style";
import { shodoNoise, shodoRgb } from "./shodo-style";

export interface ShodoCamera {
  /** Camera centre over the paper, canvas px. */
  x: number;
  y: number;
  /** Height above the paper in canvas px; lower gives stronger perspective. */
  height: number;
  /**
   * "top" (default) is a pinhole camera above the paper. "side" looks at the brush from
   * the writer's side, as in side-view teaching videos: screen x = paper x, and height
   * rises up the screen from `ground` (orthographic, with a slight look-down by `depth`).
   */
  view?: "top" | "side";
  ground?: number;
  /** Side view: screen px per design px of paper depth (y), for a slight elevated look. 0..0.5. */
  depth?: number;
}

/**
 * How the brush is lit and dressed. Its lean and height are not here: they come from the
 * hand (`ShodoBrushPose.leanX/leanY`, press and z), so they change as the brush writes.
 */
export interface ShodoBrushLook {
  /** Light direction (from the light toward the paper), degrees clockwise from +x, and elevation. */
  lightAzimuth: number;
  lightElevation: number;
  /** Shadow strength, 0..1. */
  shadow: number;
  /** Draw the hanging cord at the handle end. */
  cord: boolean;
}

export const DEFAULT_BRUSH_LOOK: ShodoBrushLook = {
  lightAzimuth: 50, lightElevation: 52, shadow: .5, cord: false,
};

type V3 = [number, number, number];
type V2 = [number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => lerp(v, b[i], t));
const smooth01 = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const css = (c: readonly number[], alpha = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;

function project(cam: ShodoCamera, p: V3): V2 {
  if (cam.view === "side") return [p[0], (cam.ground ?? 0) - p[2] + (p[1] - cam.y) * (cam.depth ?? .12)];
  const k = cam.height / Math.max(1, cam.height - p[2]);
  return [cam.x + (p[0] - cam.x) * k, cam.y + (p[1] - cam.y) * k];
}
const scaleAt = (cam: ShodoCamera, z: number) => cam.view === "side" ? 1 : cam.height / Math.max(1, cam.height - z);

function bezier3(p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 {
  const a = 1 - t;
  return [0, 1, 2].map(i => a * a * a * p0[i] + 3 * a * a * t * p1[i] + 3 * a * t * t * p2[i] + t * t * t * p3[i]) as V3;
}

/** Radius profile of the tuft, 0 = ferrule, 1 = tip: waist, belly, then the long point. */
function tuftRadius(s: number): number {
  return (1 + .62 * s * (1 - s)) * Math.pow(Math.max(0, 1 - Math.pow(s, 1.55)), .82);
}

interface TuftGeometry {
  spine: V3[];
  radius: number[];
  /** Half-width of the hair fanned out on the paper (on the paper and through the knee; 0 in the air). */
  flat: number[];
  /** How far each sample is pressed flat: 0 a round bundle, 1 hair lying on the paper. */
  blend: number[];
  frameN: V3[];
  frameB: V3[];
  ferrule: V3;
  axis: V3;
}

/** Handle axis (unit, pointing up the handle) from the hand's lean vector in degrees. */
function handleAxis(pose: ShodoBrushPose): V3 {
  const deg = Math.hypot(pose.leanX, pose.leanY), th = Math.min(70, deg) * Math.PI / 180;
  const dx = deg > 1e-6 ? pose.leanX / deg : 0, dy = deg > 1e-6 ? pose.leanY / deg : 0;
  return [Math.sin(th) * dx, Math.sin(th) * dy, Math.cos(th)];
}

function tuftGeometry(pose: ShodoBrushPose, brush: ShodoBrush, D: number): TuftGeometry {
  const Lt = D * brush.length, r0 = D / 2;
  let axis = handleAxis(pose);
  const N = 36;
  const spine: V3[] = [], radius: number[] = [], flat: number[] = [], blend: number[] = [];
  let ferrule: V3;
  if (pose.contact && pose.p > .004) {
    const ell = Lt * shodoContactLength(pose.p), w = D * shodoContactWidth(pose.p, brush.stiffness);
    const tip: V3 = [pose.x + pose.tx * SHODO_TIP_SHARE * ell, pose.y + pose.ty * SHODO_TIP_SHARE * ell, 0];
    const belly: V3 = [pose.x - pose.tx * (1 - SHODO_TIP_SHARE) * ell, pose.y - pose.ty * (1 - SHODO_TIP_SHARE) * ell, 0];
    const free = Lt - ell;
    // Side-view study: the free hair leaves the paper along the lying part, bends at a knee
    // and meets the ferrule along the handle. The harder the press, the lower the ferrule
    // (≈ 0.9 tuft lengths at a touch, ≈ 0.45 at full press) and the sharper the knee.
    const beta = clamp(.7 * pose.p, 0, .55);
    const chordDir = unit(add(mul(axis, 1 - beta), [-pose.tx * beta, -pose.ty * beta, 0]));
    ferrule = add(belly, mul(chordDir, free * (1 - .3 * pose.p)));
    const c1 = add(ferrule, mul(axis, -free * .45));
    const c2: V3 = [belly[0] - pose.tx * free * (.15 + .35 * beta), belly[1] - pose.ty * free * (.15 + .35 * beta), Math.min(free * .1, D * .25)];
    const bentShare = free / Lt, lie = D * .04;
    // The bundle flattens gradually: from six samples before the knee to two after it, the hair
    // fans out toward the contact width and its round section turns into the flat fan on the paper,
    // so the pressed and the free part join without a seam.
    const knee = bentShare * N;
    const ending: V3 = [belly[0], belly[1], lie];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      blend.push(smooth01((i - (knee - 6)) / 8));
      if (s <= bentShare) {
        const u = s / Math.max(1e-3, bentShare);
        // The curve from the collar ends at the height of the lying part, not on the paper below it.
        spine.push(bezier3(ferrule, c1, c2, ending, u));
        // Pressed, the bundle stays fat through the knee and splays to the contact width.
        const fat = r0 * (1 + .14 * Math.sin(Math.PI * u) + .1 * pose.p);
        radius.push(lerp(fat, Math.max(fat * .92, w / 2), smooth01(u) * smooth01(u)));
        flat.push(w / 2);
      } else {
        const u = (s - bentShare) / Math.max(1e-3, 1 - bentShare);
        spine.push([lerp(belly[0], tip[0], u), lerp(belly[1], tip[1], u), lie * (1 - u)]);
        const hw = w / 2 * Math.pow(Math.max(0, 1 - u), .8);
        // The bundle thins from its round radius to a flat layer over the first quarter.
        radius.push(Math.max(.4, lerp(w / 2, hw * .32, smooth01(u / .25))));
        flat.push(hw);
      }
    }
    // Round the corner of the knee a little (three relaxation passes, weighted around the knee):
    // the knee stays sharper under a harder press, as in the side-view study, but has no corner.
    for (let pass = 0; pass < 3; pass++) {
      const prev = spine.map(q => [...q] as V3);
      for (let i = 1; i < N; i++) {
        const k = .6 * Math.exp(-Math.pow((i - knee) / 3, 2));
        for (let c = 0; c < 3; c++) spine[i][c] = lerp(prev[i][c], (prev[i - 1][c] + prev[i + 1][c]) / 2, k);
      }
    }
  } else {
    // In the air the tuft hangs along the axis with a damped spring-back.
    const base: V3 = [pose.x, pose.y, pose.z];
    ferrule = add(base, mul(axis, Lt));
    const bend = pose.bend;
    const side: V3 = [pose.tx * Lt * .28 * bend, pose.ty * Lt * .28 * bend, 0];
    const c1 = add(ferrule, mul(axis, -Lt * .4));
    const c2 = add(add(base, mul(axis, Lt * .3)), mul(side, .9));
    const tipPt = add(base, side);
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      spine.push(bezier3(ferrule, c1, c2, tipPt, s));
      radius.push(r0 * tuftRadius(s) * (1 - .12 * (1 - pose.ink)));
      flat.push(0);
      blend.push(0);
    }
  }
  // Rotation-minimizing-ish frame along the spine.
  const frameN: V3[] = [], frameB: V3[] = [];
  let ref: V3 = Math.abs(axis[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
  for (let i = 0; i <= N; i++) {
    const t = unit(sub(spine[Math.min(N, i + 1)], spine[Math.max(0, i - 1)]));
    let n = unit(cross(ref, t));
    if (len(n) < .1) n = unit(cross([0, 1, 0], t));
    const b = unit(cross(t, n));
    frameN.push(n); frameB.push(b);
    ref = b;
  }
  axis = unit(axis);
  return { spine, radius, flat, blend, frameN, frameB, ferrule, axis };
}

function lightVector(look: ShodoBrushLook): V3 {
  const a = look.lightAzimuth * Math.PI / 180, e = look.lightElevation * Math.PI / 180;
  // Direction from the surface toward the light.
  return unit([-Math.cos(a) * Math.cos(e), -Math.sin(a) * Math.cos(e), Math.sin(e)]);
}

/** Height of the ferrule (where the hair meets the handle) above the paper, design px. */
export function shodoFerruleHeight(pose: ShodoBrushPose, brush: ShodoBrush, D: number): number {
  return tuftGeometry(pose, brush, D).ferrule[2];
}

/** Draw the cast shadow of the brush on the paper (call before drawing the brush). */
export function drawShodoBrushShadow(
  ctx: CanvasRenderingContext2D, cam: ShodoCamera, pose: ShodoBrushPose, brush: ShodoBrush, D: number, look: ShodoBrushLook,
): void {
  if (look.shadow <= 0 || cam.view === "side") return;
  const g = tuftGeometry(pose, brush, D);
  const L = lightVector(look);
  const shadowOf = (p: V3): V2 => project(cam, [p[0] - p[2] * L[0] / L[2], p[1] - p[2] * L[1] / L[2], 0]);
  const Lh = D * brush.length * brush.handleLength, rh = D * .56;
  const top = add(g.ferrule, mul(g.axis, Lh));
  ctx.save();
  ctx.lineCap = "round";
  // Handle shadow: soft, widening with height.
  const a = shadowOf(g.ferrule), b = shadowOf(top);
  const softness = clamp(g.ferrule[2] / (D * 6), .2, 1.4);
  ctx.filter = `blur(${(3 + 9 * softness).toFixed(1)}px)`;
  ctx.strokeStyle = `rgba(38,30,22,${(.42 * look.shadow).toFixed(3)})`;
  ctx.lineWidth = rh * 2.1;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  // Tuft shadow: one filled outline, sharper near the contact. (Overlapping round segments added
  // their alphas into visible rings.)
  ctx.filter = "blur(2.5px)";
  ctx.fillStyle = `rgba(30,24,18,${(.45 * look.shadow).toFixed(3)})`;
  const S = g.spine.map(shadowOf), k0 = scaleAt(cam, 0), sideA: V2[] = [], sideB: V2[] = [];
  for (let i = 0; i < S.length; i++) {
    const p = S[Math.max(0, i - 1)], q = S[Math.min(S.length - 1, i + 1)];
    const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1, w = Math.max(.5, g.radius[i] * k0);
    sideA.push([S[i][0] - ty / tl * w, S[i][1] + tx / tl * w]);
    sideB.push([S[i][0] + ty / tl * w, S[i][1] - tx / tl * w]);
  }
  ctx.beginPath();
  sideA.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  for (let i = sideB.length - 1; i >= 0; i--) ctx.lineTo(sideB[i][0], sideB[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

interface HairLook { dry: number[]; wet: number[]; inkLine: number }

/** Draw the brush itself. */
export function drawShodoBrush(
  ctx: CanvasRenderingContext2D, cam: ShodoCamera, pose: ShodoBrushPose, brush: ShodoBrush, ink: ShodoInk, D: number,
  look: ShodoBrushLook, seed: number,
): void {
  const g = tuftGeometry(pose, brush, D);
  const L = lightVector(look);
  const view: V3 = [0, 0, 1];
  const halfway = unit(add(L, view));
  const dryRgb = shodoRgb(brush.hairColor), wetRgb = shodoRgb(pose.color || ink.color);
  // Photographs of loaded 大筆 and 小筆: the ink reaches from the point to about three quarters
  // of the tuft; the quarter at the collar stays dry and pale, with a soft wicking edge.
  const hair: HairLook = { dry: [...dryRgb], wet: [...wetRgb], inkLine: clamp(.24 + .52 * (1 - pose.ink), .22, .86) };
  const N = g.spine.length - 1;
  const P = (i: number, ang: number, rho: number): V3 => {
    const r = g.radius[i] * rho;
    const round = add(g.spine[i], add(mul(g.frameN[i], Math.cos(ang) * r), mul(g.frameB[i], Math.sin(ang) * r)));
    const b = g.blend[i];
    if (b <= 0) return round;
    // On the paper the hairs fan across the contact width; through the knee each hair moves from
    // its place in the round bundle to its place in the fan, so no hair jumps.
    const t = unit(sub(g.spine[Math.min(N, i + 1)], g.spine[Math.max(0, i - 1)]));
    const side = unit(cross([0, 0, 1], t));
    const fan = add(g.spine[i], add(mul(side, Math.cos(ang) * rho * g.flat[i]), [0, 0, Math.max(0, Math.sin(ang)) * rho * g.radius[i] * .9]));
    return b >= 1 ? fan : add(mul(round, 1 - b), mul(fan, b));
  };
  const handleRgb = shodoRgb(brush.handleColor);

  // ── Tuft body: silhouette fill so the hair layer never shows gaps ──
  // The body sits a little inside the hair, so the outline is made by the hairs and their clumps,
  // which bulge on their own (R2); the body only follows them softly.
  const left: V2[] = [], right: V2[] = [];
  for (let i = 0; i <= N; i++) {
    const c = project(cam, g.spine[i]);
    // The side direction over a few samples: at the knee, where the tuft turns onto the paper, the
    // nearest neighbours turn so sharply that the two sides would cross into spikes.
    const next = project(cam, g.spine[Math.min(N, i + 3)]), prev = project(cam, g.spine[Math.max(0, i - 3)]);
    const dx = next[0] - prev[0], dy = next[1] - prev[1], l = Math.hypot(dx, dy) || 1;
    const w = lerp(g.radius[i], g.flat[i], g.blend[i]) * scaleAt(cam, g.spine[i][2]);
    const bump = .95 + .06 * (shodoNoise(seed + 5, i * .32, 0) - .5) * (1 - smooth01((i / N - .8) / .2));
    const bump2 = .95 + .06 * (shodoNoise(seed + 6, i * .32, 0) - .5) * (1 - smooth01((i / N - .8) / .2));
    left.push([c[0] - dy / l * w * bump, c[1] + dx / l * w * bump]);
    right.push([c[0] + dy / l * w * bump2, c[1] - dx / l * w * bump2]);
  }
  const tipScreen = project(cam, g.spine[N]), rootScreen = project(cam, g.spine[0]);
  const grad = ctx.createLinearGradient(rootScreen[0], rootScreen[1], tipScreen[0], tipScreen[1]);
  // Soaked hair reads charcoal, not ink black: the wet surface of many hairs reflects the room (R2).
  const wetDark = mix(hair.wet, [255, 255, 255], .07);
  grad.addColorStop(0, css(mix(hair.dry, [60, 50, 40], .3)));
  grad.addColorStop(Math.max(.05, hair.inkLine - .14), css(mix(hair.dry, [110, 104, 96], .12)));
  grad.addColorStop(Math.max(.08, hair.inkLine - .04), css(mix(hair.dry, wetDark, .45)));
  grad.addColorStop(hair.inkLine + .03, css(mix(hair.dry, wetDark, .82)));
  grad.addColorStop(Math.min(1, hair.inkLine + .1), css(wetDark));
  grad.addColorStop(1, css(wetDark));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const p of left) ctx.lineTo(p[0], p[1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();
  // Side shading across the body: shadowed on the far side from the light.
  const mid = Math.floor(N * .35);
  const c = project(cam, g.spine[mid]);
  const sideN = g.frameN[mid];
  const lit = [c[0] - sideN[0] * D * 2, c[1] - sideN[1] * D * 2], dark = [c[0] + sideN[0] * D * 2, c[1] + sideN[1] * D * 2];
  const shade = ctx.createLinearGradient(lit[0], lit[1], dark[0], dark[1]);
  const facing = dot(sideN, L) > 0;
  shade.addColorStop(0, `rgba(0,0,0,${facing ? .28 : 0})`);
  shade.addColorStop(.5, "rgba(0,0,0,0)");
  shade.addColorStop(1, `rgba(0,0,0,${facing ? 0 : .28})`);
  ctx.fillStyle = shade;
  ctx.fillRect(Math.min(lit[0], dark[0]) - D * 6, Math.min(lit[1], dark[1]) - D * 6, D * 12 + Math.abs(lit[0] - dark[0]), D * 12 + Math.abs(lit[1] - dark[1]));

  // ── Strand clumps: wide translucent ribbons, each with its own ink line. Ink climbs higher on
  // some clumps and stops lower on others, so dry and soaked hair interleave like the teeth of a
  // comb instead of meeting at one smooth gradient (R1, R2). ──
  const ribbons = Array.from({ length: 30 }, (_, k) => {
    const step = inkHash(seed, k, 201) < .24 ? (inkHash(seed, k, 203) < .5 ? -.2 : .16) : 0;
    const ang = inkHash(seed, k, 205) * Math.PI * 2, rho = .3 + .66 * Math.sqrt(inkHash(seed, k, 207));
    return { ang, rho, width: .18 + .2 * inkHash(seed, k, 209), tone: inkHash(seed, k, 213),
      line: clamp(hair.inkLine + (inkHash(seed, k, 211) - .5) * .2 + step, .04, .97), depth: Math.sin(ang) * rho };
  }).sort((a, b) => a.depth - b.depth);
  const midN = Math.floor(N * .45);
  for (const rb of ribbons) {
    const pts: V2[] = [], half: number[] = [];
    for (let i = 0; i <= N; i++) {
      pts.push(project(cam, P(i, rb.ang, rb.rho)));
      half.push(Math.max(.3, lerp(g.radius[i], g.flat[i] * .5, g.blend[i]) * rb.width * scaleAt(cam, g.spine[i][2])));
    }
    const nrm = unit(add(mul(g.frameN[midN], Math.cos(rb.ang)), mul(g.frameB[midN], Math.sin(rb.ang))));
    const lam = clamp(dot(nrm, L) * .5 + .5, 0, 1);
    const split = clamp(Math.round(rb.line * N), 1, N);
    // Round-joined strokes, one width per run, inside the body's outline: a clump never folds into
    // a hard-edged facet where the tuft bends.
    const band = (from: number, to: number, col: string) => {
      if (to - from < 1) return;
      let w = 0;
      for (let i = from; i <= to; i++) w += half[i];
      ctx.lineWidth = 2 * w / (to - from + 1);
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(pts[from][0], pts[from][1]);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    // Dry clumps are translucent cream with grey between the hairs; soaked clumps are near black,
    // a little lighter where they face the light.
    band(0, split, css(mix(mix(hair.dry, [118, 110, 100], .08 + .26 * rb.tone), [70, 58, 46], (1 - lam) * .25), .36 * (1.2 - .5 * rb.rho)));
    band(Math.max(0, split - 1), N, css(mix(wetDark, [255, 255, 255], .03 + .08 * lam + .06 * rb.tone), .42));
  }
  ctx.restore();

  // ── Individual hairs (back to front), coloured by their own ink line ──
  const count = Math.round(140 + brush.bristles * 2.2);
  // Hairs belong to clumps: a wet brush holds one point; a drying brush splits into clumps.
  const clumps = Array.from({ length: 9 }, (_, c) => ({ ang: inkHash(seed, c, 91) * Math.PI * 2, rho: .25 + .6 * inkHash(seed, c, 93) }));
  const hairs: { ang: number; rho: number; jitter: number; line: number; depth: number; clump: number; tone: number; end: number; fork: number; h: number }[] = [];
  for (let h = 0; h < count; h++) {
    const ang = inkHash(seed, h, 3) * Math.PI * 2;
    const rho = Math.sqrt(inkHash(seed, h, 5)) * .98;
    // Ink wicks unevenly: most hairs near the clump's line, some far above or below it (R2).
    const step = inkHash(seed, h, 17) < .16 ? (inkHash(seed, h, 19) < .5 ? -.22 : .18) : 0;
    hairs.push({ ang, rho, jitter: inkHash(seed, h, 7) - .5, line: hair.inkLine + (inkHash(seed, h, 11) - .5) * .2 + step,
      depth: Math.sin(ang) * rho, clump: Math.floor(inkHash(seed, h, 13) * clumps.length), tone: inkHash(seed, h, 23),
      // The point is made by the long core hairs; mantle hairs end a little short of it.
      end: N - Math.floor(rho * rho * inkHash(seed, h, 29) * N * .14),
      // A few hairs fork away from the point (a ragged tip, R2).
      fork: inkHash(seed, h, 31) < .2 ? (inkHash(seed, h, 37) - .5) * 2.6 : 0, h });
  }
  hairs.sort((a, b) => a.depth - b.depth);
  ctx.save();
  ctx.lineCap = "round";
  const splitDry = clamp(1 - pose.ink * 1.3, 0, 1) * (pose.contact ? 1 : .6);
  const widthPx = Math.max(.35, D * .012 * scaleAt(cam, 20));
  // Tangent of the spine at each sample, for the strand highlights.
  const tangents = g.spine.map((_, i) => unit(sub(g.spine[Math.min(N, i + 1)], g.spine[Math.max(0, i - 1)])));
  for (const h of hairs) {
    const pts: V2[] = [];
    let wetFrom = -1;
    for (let i = 0; i <= h.end; i++) {
      const s = i / N;
      // Wet hair clings into clumps toward the point; dry hair separates and fans.
      const spread = 1 + splitDry * Math.pow(s, 2) * (.6 + h.jitter);
      const cl = clumps[h.clump], pull = smooth01((s - .5) / .45) * (.55 + .35 * pose.ink);
      const tipOut = h.fork * smooth01((s - .86) / .14);
      const ang = lerp(h.ang + h.jitter * .2 * s, cl.ang, pull * .7) + tipOut * .9;
      const rho = lerp(h.rho, cl.rho * (1 + splitDry * .9), pull * .8) + Math.abs(tipOut) * .35;
      // Each clump bulges and narrows along the tuft on its own: the soft, bumpy outline (R2).
      const bulge = 1 + .16 * (shodoNoise(seed + 50 + h.clump, i * .3, 0) - .5) * (1 - smooth01((s - .8) / .2));
      pts.push(project(cam, P(i, ang, Math.min(1.3, rho * spread * bulge))));
      if (wetFrom < 0 && s >= h.line) wetFrom = i;
    }
    const nrm = unit(add(mul(g.frameN[midN], Math.cos(h.ang)), mul(g.frameB[midN], Math.sin(h.ang))));
    const lam = clamp(dot(nrm, L) * .5 + .55, .15, 1);
    // Dry goat hair is translucent: cream to ivory, a little grey or warm hair by hair (R4).
    const dryCol = mix(mix(hair.dry, h.tone > .5 ? [255, 251, 242] : [150, 142, 128], Math.abs(h.tone - .5) * .5), [70, 58, 46], (1 - lam) * .32);
    const wetCol = mix(hair.wet, [255, 255, 255], .05 + .08 * lam + .05 * h.tone);
    const alpha = .55 + .4 * h.rho;
    ctx.lineWidth = widthPx;
    const drawRun = (from: number, to: number, col: number[], a = alpha) => {
      if (to - from < 1) return;
      ctx.strokeStyle = css(col, a);
      ctx.beginPath();
      ctx.moveTo(pts[from][0], pts[from][1]);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    const last = pts.length - 1;
    const split = wetFrom < 0 ? last : Math.min(last, wetFrom);
    // Dry run, then a short wicking run in between, then the soaked run.
    drawRun(0, Math.max(0, split - 2), dryCol, alpha * .7);
    drawRun(Math.max(0, split - 3), Math.min(last, split + 1), mix(dryCol, wetCol, .55), alpha * .85);
    drawRun(split, last, wetCol);
    // Strand highlight (Kajiya-Kay): wet hair throws short, broken light dashes along its own
    // direction where the strand faces the light (R2), not one long stripe down the tuft.
    if (h.depth > 0) {
      ctx.lineWidth = widthPx * 1.1;
      // The highlight along the hair, smoothed over neighbouring samples so a tight bend does not
      // flicker it on and off.
      const k: number[] = [];
      for (let i = 0; i <= last; i++) {
        if (g.blend[i] > .5) { k.push(0); continue; }
        const n = unit(add(mul(g.frameN[i], Math.cos(h.ang)), mul(g.frameB[i], Math.sin(h.ang))));
        const th = dot(tangents[i], halfway);
        k.push(Math.pow(Math.sqrt(Math.max(0, 1 - th * th)), 30) * clamp(dot(n, L) + .3, 0, 1));
      }
      let from = -1;
      for (let i = 1; i <= last + 1; i++) {
        const ks = i <= last ? (k[i - 1] + 2 * k[i] + k[Math.min(last, i + 1)]) / 4 : 0;
        const on = ks > .38 && inkHash(seed, h.h, 400 + Math.floor(i / 4)) > .52;
        if (on && from < 0) from = i;
        if (!on && from >= 0) {
          const wet = from >= split;
          drawRun(from - 1, i - 1, wet ? [196, 201, 208] : [255, 252, 244], (wet ? .12 + .14 * pose.ink : .14));
          from = -1;
        }
      }
    }
  }
  // Flyaways: two to four single hairs stand out of the base at an angle and catch the light (R1).
  const flyaways = 2 + Math.floor(inkHash(seed, 7, 501) * 3);
  ctx.lineWidth = widthPx * .9;
  for (let f = 0; f < flyaways; f++) {
    const i0 = Math.round(N * (.03 + .2 * inkHash(seed, f, 503)));
    const ang = inkHash(seed, f, 505) * Math.PI * 2;
    const base = P(i0, ang, 1);
    const radial = unit(sub(base, g.spine[i0]));
    const t = tangents[i0];
    const len = D * brush.length * (.16 + .26 * inkHash(seed, f, 507)), th = .25 + .45 * inkHash(seed, f, 509);
    const curl = (inkHash(seed, f, 511) - .5) * .6;
    const ctrl = add(base, add(mul(t, len * .55), add(mul(radial, len * Math.sin(th) * .35), mul(g.frameB[i0], len * curl * .3))));
    const end = add(base, add(mul(t, len * Math.cos(th)), add(mul(radial, len * Math.sin(th)), mul(g.frameB[i0], len * curl))));
    const p0 = project(cam, base), p1 = project(cam, ctrl), p2 = project(cam, end);
    const lightCol = mix(hair.dry, [255, 255, 255], .3);
    ctx.strokeStyle = css(lightCol, .6);
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke();
  }
  ctx.restore();

  // ── Collar (首), handle (軸) and end cap ──
  // As on school 大筆 (R1, R2, R4): the hair leaves a long black collar, about 1.6 handle
  // diameters long, tapering slightly toward the hair. The collar goes first and the handle over
  // it, because the handle is nearer to a camera above the paper; the collar's top face shows as
  // a small step around the cane. A short black cap with a groove ring closes the top (R3).
  const Lh = D * brush.length * brush.handleLength, rh = D * .56;
  const collarLen = rh * 3.2, capLen = rh * .9;
  const collarTop = add(g.ferrule, mul(g.axis, collarLen));
  const top = add(g.ferrule, mul(g.axis, Lh)), capBase = add(top, mul(g.axis, -capLen));
  drawLacquer(ctx, cam, g.ferrule, collarTop, rh * 1.0, rh * 1.04, LACQUER, L, { mouth: true, topFace: true });
  // One node (節) at about 58 % of the handle (R3).
  const node = (.58 * Lh - collarLen) / Math.max(1, Lh - collarLen - capLen);
  drawCane(ctx, cam, collarTop, capBase, rh, rh * .95, handleRgb, L, seed, node);
  drawLacquer(ctx, cam, capBase, top, rh * .97, rh * .95, LACQUER, L, { groove: .3, endFace: true });
  if (look.cord) drawCord(ctx, cam, top, g.axis, rh, seed);
}

/** Black lacquer of the collar and the end cap. */
const LACQUER = [26, 24, 24] as const;

/** Length (x, along the cane) and girth (y, across the drawn width) of the cane surface strip, px. */
const CANE_W = 1024, CANE_H = 64;
const caneCache = new Map<string, { colour: HTMLCanvasElement; detail: HTMLCanvasElement }>();
/**
 * The cane surface, procedural and cached per colour and seed (R1, R3, R6): long fibre bands and
 * finer fibres along the length, a slow change of tone along the cane, and a few small elongated
 * specks. `colour` is the tinted surface; `detail` is the same grain as grey for a multiply pass
 * that breaks the sheen.
 */
function caneLayers(rgb: readonly number[], seed: number): { colour: HTMLCanvasElement; detail: HTMLCanvasElement } | null {
  const key = rgb.join(",") + "|" + seed;
  const hit = caneCache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const colour = document.createElement("canvas"), detail = document.createElement("canvas");
  colour.width = detail.width = CANE_W; colour.height = detail.height = CANE_H;
  const cx = colour.getContext("2d"), dx = detail.getContext("2d");
  if (!cx || !dx) return null;
  const ci = cx.createImageData(CANE_W, CANE_H), di = dx.createImageData(CANE_W, CANE_H);
  const speck = new Float32Array(CANE_W * CANE_H);
  for (let k = 0; k < 40; k++) {
    const x0 = Math.floor(inkHash(seed, k, 301) * CANE_W), y0 = Math.floor(inkHash(seed, k, 303) * CANE_H);
    const n = 4 + Math.floor(inkHash(seed, k, 305) * 12), depth = .06 + .14 * inkHash(seed, k, 307);
    for (let j = 0; j < n; j++) {
      const i = y0 * CANE_W + (x0 + j) % CANE_W;
      speck[i] = Math.max(speck[i], depth * Math.sin(Math.PI * (j + .5) / n));
    }
  }
  for (let y = 0; y < CANE_H; y++) for (let x = 0; x < CANE_W; x++) {
    const i = y * CANE_W + x, o = i * 4;
    const band = shodoNoise(seed + 11, x / 170, y * .8) - .5;
    const fine = shodoNoise(seed + 13, x / 16, y * 1.6) - .5;
    const drift = shodoNoise(seed + 17, x / 260, 2.5) - .5;
    const t = 1 + .1 * band + .055 * fine + .12 * drift - speck[i];
    // Darker cane is warmer: blue falls faster than red.
    ci.data[o] = clamp(rgb[0] * t * (t > 1 ? 1.01 : 1), 0, 255);
    ci.data[o + 1] = clamp(rgb[1] * t * (t > 1 ? 1 : .97), 0, 255);
    ci.data[o + 2] = clamp(rgb[2] * t * (t > 1 ? .98 : .9), 0, 255);
    ci.data[o + 3] = 255;
    const v = clamp(255 * (1 + .12 * band + .08 * fine - .8 * speck[i]), 0, 255);
    di.data[o] = di.data[o + 1] = di.data[o + 2] = v; di.data[o + 3] = 255;
  }
  cx.putImageData(ci, 0, 0); dx.putImageData(di, 0, 0);
  const layers = { colour, detail };
  caneCache.set(key, layers);
  return layers;
}

/** Screen geometry of a cylinder from a to b: end points, axis direction, normal and end ellipse ratio. */
function cylinderFrame(cam: ShodoCamera, a: V3, b: V3) {
  const pa = project(cam, a), pb = project(cam, b);
  const dx = pb[0] - pa[0], dy = pb[1] - pa[1], l = Math.hypot(dx, dy) || 1;
  const axis = unit(sub(b, a));
  // The end caps are seen as ellipses whose roundness is the axis part pointing at the camera.
  return { pa, pb, dx, dy, l, nx: -dy / l, ny: dx / l, cap: clamp(Math.abs(cam.view === "side" ? axis[1] : axis[2]), .08, 1) };
}

/**
 * The cane handle: a natural cane, not a lathe part. Its outline swells at the node; the grain
 * runs along it; the satin sheen is broken by the grain; the node has a dark groove, a light ridge
 * and a darker band (R3).
 */
function drawCane(
  ctx: CanvasRenderingContext2D, cam: ShodoCamera, a: V3, b: V3, ra: number, rb: number, rgb: readonly number[], L: V3, seed: number, node: number,
): void {
  const f = cylinderFrame(cam, a, b), { pa, pb, dx, dy, l, nx, ny, cap } = f;
  const span = len(sub(b, a)), nodeW = clamp(ra * 1.3 / Math.max(1, span), .01, .2);
  const radius = (s: number) => lerp(ra, rb, s) * (1 + .05 * Math.exp(-Math.pow((s - node) / nodeW, 2)) + .006 * Math.sin(s * 9 + seed));
  const M = 32, side: V2[] = [], other: V2[] = [];
  const at = (s: number): V3 => add(a, mul(sub(b, a), s));
  for (let k = 0; k <= M; k++) {
    const s = k / M, c = project(cam, at(s)), w = radius(s) * scaleAt(cam, at(s)[2]);
    side.push([c[0] + nx * w, c[1] + ny * w]); other.push([c[0] - nx * w, c[1] - ny * w]);
  }
  const wa = radius(0) * scaleAt(cam, a[2]), wb = radius(1) * scaleAt(cam, b[2]), wm = (wa + wb) / 2, rot = Math.atan2(ny, nx);
  ctx.save();
  // Outline: the two sides and the outer half of each end ellipse, so the outline is convex at the
  // ends (in the ellipse frame, angle π/2 points from b back toward a).
  ctx.beginPath();
  ctx.moveTo(side[0][0], side[0][1]);
  for (const p of side) ctx.lineTo(p[0], p[1]);
  ctx.ellipse(pb[0], pb[1], wb, wb * cap, rot, 0, Math.PI, true);
  for (let k = M; k >= 0; k--) ctx.lineTo(other[k][0], other[k][1]);
  ctx.ellipse(pa[0], pa[1], wa, wa * cap, rot, Math.PI, 0, true);
  ctx.closePath();
  const layers = caneLayers(rgb, seed);
  // The strip starts a little before the rounded end, so the end ellipse never wraps to its far end.
  const along = new DOMMatrix().translate(pa[0] - dx / l * wm * 1.5, pa[1] - dy / l * wm * 1.5).rotate(Math.atan2(dy, dx) * 180 / Math.PI).scale((l + wm * 3) / CANE_W, (2 * wm) / CANE_H).translate(0, -CANE_H / 2);
  const colour = layers && ctx.createPattern(layers.colour, "repeat");
  if (colour) colour.setTransform(along);
  ctx.fillStyle = colour || css(rgb);
  ctx.fill();
  ctx.clip();
  const litSide = dot(unit([nx, ny, 0]), L) > 0 ? 1 : -1;
  const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
  const across = (stops: [number, string][]) => {
    const gr = ctx.createLinearGradient(mx - nx * wm * litSide, my - ny * wm * litSide, mx + nx * wm * litSide, my + ny * wm * litSide);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    ctx.fillStyle = gr;
    ctx.fillRect(Math.min(pa[0], pb[0]) - wm * 3, Math.min(pa[1], pb[1]) - wm * 3, Math.abs(dx) + wm * 6, Math.abs(dy) + wm * 6);
  };
  // Cylinder light: darker flanks, a soft waxy band and a narrow sheen line on the lit side.
  across([[0, "rgba(40,24,8,.6)"], [.22, "rgba(40,24,8,.17)"], [.5, "rgba(40,24,8,0)"], [.86, "rgba(40,24,8,0)"], [1, "rgba(40,24,8,.34)"]]);
  across([[.54, "rgba(255,248,228,0)"], [.67, "rgba(255,248,228,.26)"], [.715, "rgba(255,252,240,.42)"], [.75, "rgba(255,248,228,.18)"], [.86, "rgba(255,248,228,0)"]]);
  // The grain breaks the sheen: the grey grain multiplied over everything, strongest on the band.
  const grain = layers && ctx.createPattern(layers.detail, "repeat");
  if (grain) {
    grain.setTransform(along);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = .7;
    ctx.fillStyle = grain;
    ctx.fillRect(Math.min(pa[0], pb[0]) - wm * 3, Math.min(pa[1], pb[1]) - wm * 3, Math.abs(dx) + wm * 6, Math.abs(dy) + wm * 6);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  if (node > 0 && node < 1) {
    // Node: a darker band about one diameter long, a dark groove and a light ridge just above it.
    const c3 = at(node), cN = project(cam, c3), wN = radius(node) * scaleAt(cam, c3[2]);
    const ux = dx / l, uy = dy / l, reach = wN * 1.5;
    const gB = ctx.createLinearGradient(cN[0] - ux * reach, cN[1] - uy * reach, cN[0] + ux * reach, cN[1] + uy * reach);
    gB.addColorStop(0, "rgba(70,44,14,0)"); gB.addColorStop(.42, "rgba(70,44,14,.14)"); gB.addColorStop(.5, "rgba(70,44,14,.24)");
    gB.addColorStop(.6, "rgba(70,44,14,.1)"); gB.addColorStop(1, "rgba(70,44,14,0)");
    ctx.fillStyle = gB;
    ctx.fillRect(cN[0] - reach * 2, cN[1] - reach * 2, reach * 4, reach * 4);
    ctx.lineWidth = Math.max(.6, wN * .07);
    ctx.strokeStyle = "rgba(62,36,12,.62)";
    ctx.beginPath(); ctx.ellipse(cN[0], cN[1], wN, wN * cap, rot, 0, Math.PI); ctx.stroke();
    ctx.lineWidth = Math.max(.5, wN * .05);
    ctx.strokeStyle = "rgba(255,246,224,.45)";
    ctx.beginPath(); ctx.ellipse(cN[0] + ux * wN * .15, cN[1] + uy * wN * .15, wN, wN * cap, rot, 0, Math.PI); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Black lacquer (the collar and the end cap): satin, with one broad soft band and a faint narrow
 * line, not a mirror (R1, R2). `mouth`: a pale rim where the hair leaves the collar; `topFace`: the
 * top face at b, which shows as a step around a narrower handle; `groove`: a ring at that share of
 * the length; `endFace`: the closed top end of a cap.
 */
function drawLacquer(
  ctx: CanvasRenderingContext2D, cam: ShodoCamera, a: V3, b: V3, ra: number, rb: number, rgb: readonly number[], L: V3,
  opts: { mouth?: boolean; topFace?: boolean; groove?: number; endFace?: boolean },
): void {
  const { pa, pb, dx, dy, l, nx, ny, cap } = cylinderFrame(cam, a, b);
  const wa = ra * scaleAt(cam, a[2]), wb = rb * scaleAt(cam, b[2]), wm = (wa + wb) / 2, rot = Math.atan2(ny, nx);
  ctx.save();
  if (opts.topFace) {
    // The face is drawn first; the body covers its near half.
    ctx.fillStyle = css(mix(rgb, [0, 0, 0], .2));
    ctx.beginPath(); ctx.ellipse(pb[0], pb[1], wb, wb * cap, rot, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(pa[0] + nx * wa, pa[1] + ny * wa);
  ctx.lineTo(pb[0] + nx * wb, pb[1] + ny * wb);
  ctx.ellipse(pb[0], pb[1], wb, wb * cap, rot, 0, Math.PI, true);
  ctx.lineTo(pa[0] - nx * wa, pa[1] - ny * wa);
  ctx.ellipse(pa[0], pa[1], wa, wa * cap, rot, Math.PI, 0, true);
  ctx.closePath();
  const litSide = dot(unit([nx, ny, 0]), L) > 0 ? 1 : -1;
  const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
  const gr = ctx.createLinearGradient(mx - nx * wm * litSide, my - ny * wm * litSide, mx + nx * wm * litSide, my + ny * wm * litSide);
  gr.addColorStop(0, css(mix(rgb, [0, 0, 0], .6)));
  gr.addColorStop(.32, css(rgb));
  gr.addColorStop(.52, css(mix(rgb, [140, 144, 152], .14)));
  gr.addColorStop(.63, css(mix(rgb, [175, 180, 190], .3)));
  gr.addColorStop(.69, css(mix(rgb, [205, 210, 218], .27)));
  gr.addColorStop(.73, css(mix(rgb, [175, 180, 190], .2)));
  gr.addColorStop(.84, css(rgb));
  gr.addColorStop(1, css(mix(rgb, [0, 0, 0], .45)));
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.clip();
  if (opts.groove !== undefined) {
    const s = opts.groove, cx = lerp(pa[0], pb[0], s), cy = lerp(pa[1], pb[1], s), w = lerp(wa, wb, s);
    ctx.lineWidth = Math.max(.6, w * .08);
    ctx.strokeStyle = "rgba(0,0,0,.7)";
    ctx.beginPath(); ctx.ellipse(cx, cy, w, w * cap, rot, 0, Math.PI); ctx.stroke();
    ctx.lineWidth = Math.max(.5, w * .045);
    ctx.strokeStyle = "rgba(200,205,215,.3)";
    ctx.beginPath(); ctx.ellipse(cx + dx / l * w * .1, cy + dy / l * w * .1, w, w * cap, rot, 0, Math.PI); ctx.stroke();
  }
  ctx.restore();
  if (opts.mouth) {
    // The rounded lip where the hair leaves the collar catches a thin line of light.
    ctx.save();
    ctx.lineWidth = Math.max(.5, wa * .035);
    ctx.strokeStyle = "rgba(170,172,178,.3)";
    ctx.beginPath(); ctx.ellipse(pa[0], pa[1], wa * .97, wa * cap * .97, rot, 0, Math.PI); ctx.stroke();
    ctx.restore();
  }
  if (opts.endFace) {
    // The closed end of the cap: a dark disc with a soft reflection toward the light.
    ctx.save();
    const hx = pb[0] - L[0] * wb * .35, hy = pb[1] - L[1] * wb * .35;
    const eg = ctx.createRadialGradient(hx, hy, 0, pb[0], pb[1], wb);
    eg.addColorStop(0, css(mix(rgb, [150, 155, 165], .35)));
    eg.addColorStop(.55, css(rgb));
    eg.addColorStop(1, css(mix(rgb, [0, 0, 0], .4)));
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.ellipse(pb[0], pb[1], wb, wb * cap, rot, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawCord(ctx: CanvasRenderingContext2D, cam: ShodoCamera, top: V3, axis: V3, rh: number, seed: number): void {
  const p = project(cam, top), k = scaleAt(cam, top[2]);
  const away: V2 = [axis[0], axis[1]];
  const l = Math.hypot(away[0], away[1]) || 1;
  const ux = away[0] / l, uy = away[1] / l;
  const loop = rh * 3.2 * k, sway = (inkHash(seed, 1, 1) - .5) * rh;
  ctx.save();
  ctx.strokeStyle = "rgba(62,48,36,.9)";
  ctx.lineWidth = Math.max(.8, rh * .12 * k);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(p[0] - uy * rh * .3 * k, p[1] + ux * rh * .3 * k);
  ctx.bezierCurveTo(p[0] + ux * loop - uy * (loop * .6 + sway), p[1] + uy * loop + ux * (loop * .6 + sway),
    p[0] + ux * loop + uy * (loop * .6 - sway), p[1] + uy * loop - ux * (loop * .6 - sway),
    p[0] + uy * rh * .3 * k, p[1] - ux * rh * .3 * k);
  ctx.stroke();
  ctx.restore();
}
