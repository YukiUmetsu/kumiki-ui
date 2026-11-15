/**
 * SHO1 brush (筆): a 3D fude drawn with Canvas 2D under a top-down pinhole camera.
 *
 * Construction, from the paper up:
 * - 穂 tuft: a flame-shaped bundle (命毛 point, 腹 belly, 腰 waist at the ferrule). In
 *   contact, the pressed part lies flat on the paper as the same teardrop the ink model
 *   deposits, then bends up to the ferrule. In the air it springs back with a damped
 *   wobble. Ink soaks the hair from the tip up to a load line; wet hair is glossy.
 * - Ferrule band where the tuft is glued into the handle.
 * - 軸 handle: bamboo with nodes (節), fibre streaks and mottling, a cut end and a cord.
 * - A cast shadow on the paper that tightens to the contact as the brush lands.
 *
 * Every input comes from `shodoBrushPose`; the brush and the ink share one contact patch.
 */
import { inkHash } from "../ink-brush";
import type { ShodoBrushPose } from "./shodo-hand";
import { SHODO_TIP_SHARE, shodoContactLength, shodoContactWidth } from "./shodo-hand";
import type { ShodoBrush, ShodoInk } from "./shodo-style";
import { shodoRgb } from "./shodo-style";
import type { ShodoTextures } from "./shodo-textures";

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
  /** Flattened half-width on the paper for contact samples (0 elsewhere). */
  flat: number[];
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
  const spine: V3[] = [], radius: number[] = [], flat: number[] = [];
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
    const bentShare = free / Lt;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      if (s <= bentShare) {
        const u = s / Math.max(1e-3, bentShare);
        spine.push(bezier3(ferrule, c1, c2, belly, u));
        // Pressed, the bundle stays fat through the knee and splays to the contact width.
        const knee = r0 * (1 + .14 * Math.sin(Math.PI * u) + .1 * pose.p);
        radius.push(lerp(knee, Math.max(knee * .92, w / 2), smooth01(u) * smooth01(u)));
        flat.push(0);
      } else {
        const u = (s - bentShare) / Math.max(1e-3, 1 - bentShare);
        spine.push([lerp(belly[0], tip[0], u), lerp(belly[1], tip[1], u), D * .04 * (1 - u)]);
        const hw = w / 2 * Math.pow(Math.max(0, 1 - u), .8);
        radius.push(Math.max(.4, hw * .32));
        flat.push(hw);
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
  return { spine, radius, flat, frameN, frameB, ferrule, axis };
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
  // Tuft shadow: sharper near the contact.
  ctx.filter = "blur(2.5px)";
  ctx.strokeStyle = `rgba(30,24,18,${(.45 * look.shadow).toFixed(3)})`;
  for (let i = 0; i < g.spine.length - 1; i++) {
    const p = shadowOf(g.spine[i]), q = shadowOf(g.spine[i + 1]);
    ctx.lineWidth = Math.max(1, g.radius[i] * 2 * scaleAt(cam, 0));
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
  }
  ctx.restore();
}

interface HairLook { dry: number[]; wet: number[]; inkLine: number }

/** Draw the brush itself. */
export function drawShodoBrush(
  ctx: CanvasRenderingContext2D, cam: ShodoCamera, pose: ShodoBrushPose, brush: ShodoBrush, ink: ShodoInk, D: number,
  look: ShodoBrushLook, seed: number, textures?: ShodoTextures | null,
): void {
  const g = tuftGeometry(pose, brush, D);
  const L = lightVector(look);
  const view: V3 = [0, 0, 1];
  const halfway = unit(add(L, view));
  const dryRgb = shodoRgb(brush.hairColor), wetRgb = shodoRgb(pose.color || ink.color);
  const hair: HairLook = { dry: [...dryRgb], wet: [...wetRgb], inkLine: clamp(.05 + .62 * (1 - pose.ink), .04, .86) };
  const N = g.spine.length - 1;
  const P = (i: number, ang: number, rho: number): V3 => {
    const flatHw = g.flat[i];
    if (flatHw > 0) {
      // On the paper the hairs fan across the contact width.
      const lateral = Math.cos(ang) * rho * flatHw;
      const up = Math.max(0, Math.sin(ang)) * rho * g.radius[i] * .9;
      const t = unit(sub(g.spine[Math.min(N, i + 1)], g.spine[Math.max(0, i - 1)]));
      const side = unit(cross([0, 0, 1], t));
      return add(g.spine[i], add(mul(side, lateral), [0, 0, up]));
    }
    const r = g.radius[i] * rho;
    return add(g.spine[i], add(mul(g.frameN[i], Math.cos(ang) * r), mul(g.frameB[i], Math.sin(ang) * r)));
  };
  const handleRgb = shodoRgb(brush.handleColor);

  // ── Tuft body: silhouette fill so the hair layer never shows gaps ──
  const left: V2[] = [], right: V2[] = [];
  for (let i = 0; i <= N; i++) {
    const c = project(cam, g.spine[i]);
    const next = project(cam, g.spine[Math.min(N, i + 1)]), prev = project(cam, g.spine[Math.max(0, i - 1)]);
    const dx = next[0] - prev[0], dy = next[1] - prev[1], l = Math.hypot(dx, dy) || 1;
    const w = (g.flat[i] > 0 ? g.flat[i] : g.radius[i]) * scaleAt(cam, g.spine[i][2]);
    left.push([c[0] - dy / l * w, c[1] + dx / l * w]);
    right.push([c[0] + dy / l * w, c[1] - dx / l * w]);
  }
  const tipScreen = project(cam, g.spine[N]), rootScreen = project(cam, g.spine[0]);
  const grad = ctx.createLinearGradient(rootScreen[0], rootScreen[1], tipScreen[0], tipScreen[1]);
  const wetDark = mix(hair.wet, [0, 0, 0], .25);
  grad.addColorStop(0, css(mix(hair.dry, [0, 0, 0], .18)));
  grad.addColorStop(Math.max(0, hair.inkLine - .1), css(hair.dry));
  grad.addColorStop(hair.inkLine, css(mix(hair.dry, wetDark, .7)));
  grad.addColorStop(Math.min(1, hair.inkLine + .06), css(wetDark));
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
  ctx.restore();

  // ── Individual hairs (back to front), coloured by their own ink line ──
  const count = Math.round(140 + brush.bristles * 2.2);
  // Hairs belong to clumps: a wet brush holds one point; a drying brush splits into clumps.
  const clumps = Array.from({ length: 9 }, (_, c) => ({ ang: inkHash(seed, c, 91) * Math.PI * 2, rho: .25 + .6 * inkHash(seed, c, 93) }));
  const hairs: { ang: number; rho: number; jitter: number; line: number; depth: number; clump: number }[] = [];
  for (let h = 0; h < count; h++) {
    const ang = inkHash(seed, h, 3) * Math.PI * 2;
    const rho = Math.sqrt(inkHash(seed, h, 5)) * .98;
    hairs.push({ ang, rho, jitter: inkHash(seed, h, 7) - .5, line: hair.inkLine + (inkHash(seed, h, 11) - .5) * .09,
      depth: Math.sin(ang) * rho, clump: Math.floor(inkHash(seed, h, 13) * clumps.length) });
  }
  hairs.sort((a, b) => a.depth - b.depth);
  ctx.save();
  ctx.lineCap = "round";
  const splitDry = clamp(1 - pose.ink * 1.3, 0, 1) * (pose.contact ? 1 : .6);
  for (const h of hairs) {
    const pts: V2[] = [];
    let wetFrom = -1;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      // Wet hair clings into clumps toward the point; dry hair separates and fans.
      const spread = 1 + splitDry * Math.pow(s, 2) * (.6 + h.jitter);
      const cl = clumps[h.clump], pull = smooth01((s - .5) / .45) * (.55 + .35 * pose.ink);
      const ang = lerp(h.ang + h.jitter * .2 * s, cl.ang, pull * .7);
      const rho = lerp(h.rho, cl.rho * (1 + splitDry * .9), pull * .8);
      const q = P(i, ang, Math.min(1.25, rho * spread));
      pts.push(project(cam, q));
      if (wetFrom < 0 && s >= h.line) wetFrom = i;
    }
    // Lambert + Kajiya-Kay style highlight from the hair's normal and tangent.
    const midI = Math.floor(N * .45);
    const nrm = unit(add(mul(g.frameN[midI], Math.cos(h.ang)), mul(g.frameB[midI], Math.sin(h.ang))));
    const lam = clamp(dot(nrm, L) * .5 + .55, .15, 1);
    const tan = unit(sub(g.spine[Math.min(N, midI + 1)], g.spine[midI]));
    const th = dot(tan, halfway), kk = Math.pow(Math.sqrt(Math.max(0, 1 - th * th)), 60);
    const dryCol = mix(hair.dry, [0, 0, 0], (1 - lam) * .55);
    const wetCol = mix(hair.wet, [255, 255, 255], kk * .55 * (.4 + .6 * pose.ink) + .03 * lam);
    const widthPx = Math.max(.35, D * .012 * scaleAt(cam, 20));
    const alpha = .55 + .4 * h.rho;
    ctx.lineWidth = widthPx;
    const drawRun = (from: number, to: number, col: number[]) => {
      if (to - from < 1) return;
      ctx.strokeStyle = css(col, alpha);
      ctx.beginPath();
      ctx.moveTo(pts[from][0], pts[from][1]);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    const split = wetFrom < 0 ? N : wetFrom;
    drawRun(0, split, dryCol);
    drawRun(Math.max(0, split - 1), N, wetCol);
  }
  // Wet sheen: a broad, soft reflection of the window along the soaked part, with a
  // thin bright core, as on a freshly dipped brush.
  if (pose.ink > .05) {
    // Follow the spine on screen, offset toward the light, and smooth it, so the reflection
    // stays one calm streak through the bend instead of a zigzag.
    const raw: V2[] = [];
    for (let i = Math.floor(N * hair.inkLine) + 1; i <= N - 2; i++) {
      // Only the free, rounded part of the tuft reflects the light; the part lying on the
      // paper is flat and dull.
      if (g.flat[i] > 0) break;
      const c = project(cam, g.spine[i]), d = project(cam, g.spine[Math.min(N, i + 1)]), b = project(cam, g.spine[Math.max(0, i - 1)]);
      const tx = d[0] - b[0], ty = d[1] - b[1], tl = Math.hypot(tx, ty) || 1;
      let nx = -ty / tl, ny = tx / tl;
      if (nx * -L[0] + ny * -L[1] < 0) { nx = -nx; ny = -ny; }
      const r = (g.flat[i] > 0 ? g.flat[i] : g.radius[i]) * scaleAt(cam, g.spine[i][2]) * .42;
      raw.push([c[0] + nx * r, c[1] + ny * r]);
    }
    const sheen = raw.map((_, i) => {
      let x = 0, y = 0, n = 0;
      for (let k = Math.max(0, i - 6); k <= Math.min(raw.length - 1, i + 6); k++) { x += raw[k][0]; y += raw[k][1]; n++; }
      return [x / n, y / n] as V2;
    });
    if (sheen.length > 2) {
      const trace = () => { ctx.beginPath(); sheen.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); };
      ctx.save();
      ctx.filter = `blur(${Math.max(1, D * .05).toFixed(1)}px)`;
      ctx.strokeStyle = `rgba(235,240,255,${(.1 + .16 * pose.ink).toFixed(3)})`;
      ctx.lineWidth = Math.max(2, D * .22);
      trace();
      ctx.filter = "none";
      ctx.strokeStyle = `rgba(255,255,255,${(.16 + .26 * pose.ink).toFixed(3)})`;
      ctx.lineWidth = Math.max(.7, D * .035);
      trace();
      ctx.restore();
    }
  }
  ctx.restore();

  // ── Ferrule and handle ──
  const Lh = D * brush.length * brush.handleLength, rh = D * .56;
  const top = add(g.ferrule, mul(g.axis, Lh));
  const cane = textures ? tintedCane(textures.cane, handleRgb) : null;
  drawCylinder(ctx, cam, add(g.ferrule, mul(g.axis, D * .5)), top, rh, rh * .98, handleRgb, L, seed + 1, true, cane);
  // The lacquered ring where the hair is set into the handle covers the junction.
  drawCylinder(ctx, cam, g.ferrule, add(g.ferrule, mul(g.axis, D * .62)), rh * 1.04, rh * 1.06, [26, 22, 20], L, seed, false, null);
  if (look.cord) drawCord(ctx, cam, top, g.axis, rh, seed);
}

const caneCache = new Map<string, HTMLCanvasElement>();
/** The scanned cane detail, tinted to the handle colour once per colour. */
function tintedCane(source: CanvasImageSource, rgb: readonly number[]): HTMLCanvasElement | null {
  const key = rgb.join(",");
  const hit = caneCache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 768; c.height = 32;
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) return null;
  x.drawImage(source, 0, 0, 768, 32);
  const img = x.getImageData(0, 0, 768, 32), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Detail is stored as luminance / 1.35; above 1 the cane turns slightly warmer.
    const l = d[i] / 255 * 1.35;
    d[i] = clamp(rgb[0] * l * (l > 1 ? 1.02 : 1), 0, 255);
    d[i + 1] = clamp(rgb[1] * l, 0, 255);
    d[i + 2] = clamp(rgb[2] * l * (l > 1 ? .96 : 1), 0, 255);
  }
  x.putImageData(img, 0, 0);
  caneCache.set(key, c);
  return c;
}

function drawCylinder(
  ctx: CanvasRenderingContext2D, cam: ShodoCamera, a: V3, b: V3, ra: number, rb: number, rgb: readonly number[], L: V3, seed: number, bamboo: boolean,
  cane: HTMLCanvasElement | null = null,
): void {
  const pa = project(cam, a), pb = project(cam, b);
  const ka = scaleAt(cam, a[2]), kb = scaleAt(cam, b[2]);
  const dx = pb[0] - pa[0], dy = pb[1] - pa[1], l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l;
  const wa = ra * ka, wb = rb * kb;
  const axis = unit(sub(b, a));
  // The end caps are seen as ellipses whose roundness is the axis part pointing at the camera.
  const capRatio = clamp(Math.abs(cam.view === "side" ? axis[1] : axis[2]), .08, 1);
  ctx.save();
  // Body.
  ctx.beginPath();
  ctx.moveTo(pa[0] + nx * wa, pa[1] + ny * wa);
  ctx.lineTo(pb[0] + nx * wb, pb[1] + ny * wb);
  ctx.ellipse(pb[0], pb[1], wb, wb * capRatio, Math.atan2(ny, nx), 0, Math.PI, false);
  ctx.lineTo(pa[0] - nx * wa, pa[1] - ny * wa);
  ctx.ellipse(pa[0], pa[1], wa, wa * capRatio, Math.atan2(ny, nx), Math.PI, Math.PI * 2, false);
  ctx.closePath();
  // Light falls on the side whose normal faces the light.
  const side: V3 = unit([nx, ny, 0]);
  const litSide = dot(side, L) > 0 ? 1 : -1;
  const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2, wm = (wa + wb) / 2;
  const g = ctx.createLinearGradient(mx - nx * wm * litSide, my - ny * wm * litSide, mx + nx * wm * litSide, my + ny * wm * litSide);
  if (bamboo) {
    g.addColorStop(0, css(mix(rgb, [0, 0, 0], .5)));
    g.addColorStop(.18, css(mix(rgb, [0, 0, 0], .18)));
    g.addColorStop(.52, css(rgb));
    g.addColorStop(.7, css(mix(rgb, [255, 250, 235], .38)));
    g.addColorStop(.8, css(mix(rgb, [255, 250, 235], .12)));
    g.addColorStop(1, css(mix(rgb, [0, 0, 0], .22)));
  } else {
    // Black lacquer: deep body with one narrow, sharp reflection.
    g.addColorStop(0, css(mix(rgb, [0, 0, 0], .6)));
    g.addColorStop(.6, css(rgb));
    g.addColorStop(.7, css(mix(rgb, [200, 205, 215], .32)));
    g.addColorStop(.75, css(rgb));
    g.addColorStop(1, css(mix(rgb, [0, 0, 0], .4)));
  }
  if (bamboo && cane) {
    // Real cane surface: the scanned strip runs along the axis, one node about mid-handle.
    const pattern = ctx.createPattern(cane, "repeat");
    if (pattern) {
      const span = .55, ang = Math.atan2(dy, dx) * 180 / Math.PI;
      pattern.setTransform(new DOMMatrix().translate(pa[0], pa[1]).rotate(ang).scale(l / (768 * span), (2 * wm) / 32).translate(-768 * .05, -16));
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.clip();
      // Cylinder light over the texture: darker flanks, a soft waxy highlight, a crisp sheen line.
      const shadeG = ctx.createLinearGradient(mx - nx * wm * litSide, my - ny * wm * litSide, mx + nx * wm * litSide, my + ny * wm * litSide);
      shadeG.addColorStop(0, "rgba(40,24,8,.62)"); shadeG.addColorStop(.22, "rgba(40,24,8,.18)");
      shadeG.addColorStop(.5, "rgba(40,24,8,0)"); shadeG.addColorStop(.86, "rgba(40,24,8,0)"); shadeG.addColorStop(1, "rgba(40,24,8,.34)");
      ctx.fillStyle = shadeG;
      ctx.fillRect(Math.min(pa[0], pb[0]) - wm * 3, Math.min(pa[1], pb[1]) - wm * 3, Math.abs(dx) + wm * 6, Math.abs(dy) + wm * 6);
      const hiG = ctx.createLinearGradient(mx - nx * wm * litSide, my - ny * wm * litSide, mx + nx * wm * litSide, my + ny * wm * litSide);
      hiG.addColorStop(.56, "rgba(255,248,228,0)"); hiG.addColorStop(.69, "rgba(255,248,228,.34)");
      hiG.addColorStop(.72, "rgba(255,252,240,.5)"); hiG.addColorStop(.76, "rgba(255,248,228,.22)"); hiG.addColorStop(.86, "rgba(255,248,228,0)");
      ctx.fillStyle = hiG;
      ctx.fillRect(Math.min(pa[0], pb[0]) - wm * 3, Math.min(pa[1], pb[1]) - wm * 3, Math.abs(dx) + wm * 6, Math.abs(dy) + wm * 6);
    }
  } else {
    ctx.fillStyle = g;
    ctx.fill();
  }
  if (bamboo && !cane) {
    ctx.clip();
    // Fine longitudinal grain: many thin, broken streaks of slightly darker cane.
    ctx.lineCap = "round";
    const grains = Math.round(30 + wm * 1.6);
    for (let i = 0; i < grains; i++) {
      const off = (inkHash(seed, i, 41) * 2 - 1) * .95;
      const s0 = inkHash(seed, i, 43) * .95, s1 = Math.min(1, s0 + .04 + inkHash(seed, i, 47) * .35);
      // Streaks near the silhouette are foreshortened and fainter.
      const edgeFade = 1 - Math.pow(Math.abs(off), 3);
      ctx.strokeStyle = css(mix(rgb, [70, 45, 20], .5), (.06 + .12 * inkHash(seed, i, 53)) * edgeFade);
      ctx.lineWidth = Math.max(.35, wm * (.012 + .02 * inkHash(seed, i, 59)));
      ctx.beginPath();
      ctx.moveTo(lerp(pa[0], pb[0], s0) + nx * off * lerp(wa, wb, s0), lerp(pa[1], pb[1], s0) + ny * off * lerp(wa, wb, s0));
      ctx.lineTo(lerp(pa[0], pb[0], s1) + nx * off * lerp(wa, wb, s1), lerp(pa[1], pb[1], s1) + ny * off * lerp(wa, wb, s1));
      ctx.stroke();
    }
    // Mottling of natural cane: long, soft, irregular streak-spots along the grain.
    for (let i = 0; i < 7; i++) {
      const s = inkHash(seed, i, 61), off = (inkHash(seed, i, 67) * 2 - 1) * .6;
      const cx = lerp(pa[0], pb[0], s) + nx * off * wm, cy = lerp(pa[1], pb[1], s) + ny * off * wm;
      const len = wm * (.8 + 2.2 * inkHash(seed, i, 71)), wid = wm * (.06 + .1 * inkHash(seed, i, 79));
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, len);
      g2.addColorStop(0, css(mix(rgb, [110, 70, 30], .55), .14));
      g2.addColorStop(1, css(mix(rgb, [110, 70, 30], .55), 0));
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, len, wid, Math.atan2(dy, dx), 0, Math.PI * 2);
      ctx.fill();
    }
    // Nodes (節): a dark ring line with a raised highlight just above it.
    for (const s of [.3, .78]) {
      const cx = lerp(pa[0], pb[0], s), cy = lerp(pa[1], pb[1], s), w = lerp(wa, wb, s);
      ctx.lineWidth = Math.max(.8, w * .11);
      ctx.strokeStyle = css(mix(rgb, [50, 30, 12], .55), .75);
      ctx.beginPath(); ctx.ellipse(cx, cy, w, w * capRatio, Math.atan2(ny, nx), 0, Math.PI); ctx.stroke();
      ctx.strokeStyle = css(mix(rgb, [255, 248, 230], .5), .5);
      ctx.lineWidth = Math.max(.6, w * .06);
      ctx.beginPath(); ctx.ellipse(cx + dx / l * w * .16, cy + dy / l * w * .16, w, w * capRatio, Math.atan2(ny, nx), 0, Math.PI); ctx.stroke();
    }
  }
  ctx.restore();
  // Cut end of the cane: a pale wall ring around a shaded, plugged core.
  if (bamboo) {
    ctx.save();
    const rot = Math.atan2(ny, nx);
    const endG = ctx.createRadialGradient(pb[0], pb[1], wb * .2, pb[0], pb[1], wb);
    endG.addColorStop(0, css(mix(rgb, [70, 45, 22], .45)));
    endG.addColorStop(.62, css(mix(rgb, [90, 60, 30], .3)));
    endG.addColorStop(.7, css(mix(rgb, [250, 238, 210], .3)));
    endG.addColorStop(1, css(mix(rgb, [120, 85, 45], .25)));
    ctx.fillStyle = endG;
    ctx.beginPath(); ctx.ellipse(pb[0], pb[1], wb, wb * capRatio, rot, 0, Math.PI * 2); ctx.fill();
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
