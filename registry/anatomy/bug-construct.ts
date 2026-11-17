/**
 * BUG1 construction: a top-view drawing of a species (`bugTopView`), in millimetres, head up (toward −y), the body
 * centred on x = 0. Parts carry roles (body, head, thorax, abdomen, segment, elytra, wing, vein, spot, leg, antenna,
 * eye, mandible, horn, glow, shell), so any style can paint them.
 *
 * - Insects: head, a thorax of three segments and a segmented abdomen; six jointed legs (coxa, femur, tibia, tarsus),
 *   one pair per thoracic segment, posed by the alternating tripod gait (`gait`, 0–1 a stride); antennae; wings by
 *   order from the second and third thoracic segments (`wing`, 0 closed … 1 open; flapping scales their spread).
 * - Spiders: cephalothorax and abdomen, eight legs and two palps from the cephalothorax, legs arched.
 * - Snails: a spiral shell over a foot, two pairs of tentacles.
 */
import type { FPoint } from "./foundation-shapes";
import { ellipsePoints, seeded } from "./foundation-shapes";
import { findBug } from "./bug-data";
import type { BugSpecies } from "./bug-data";

export type BugRole = "body" | "head" | "thorax" | "abdomen" | "segment" | "elytra" | "wing" | "vein" | "spot" | "leg" | "antenna" | "eye" | "mandible" | "horn" | "glow" | "shell" | "band";
export interface BugPart { role: BugRole; pts: FPoint[]; closed: boolean; width?: number; colour?: string; opacity?: number }
export interface BugDrawing { species: BugSpecies; parts: BugPart[]; size: number }
export interface BugPose { gait?: number; wing?: number; glow?: number; seed?: number }

const rot = (p: FPoint, a: number): FPoint => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const ell = (cx: number, cy: number, rx: number, ry: number, n = 28) => ellipsePoints({ cx, cy, rx, ry, angle: 0 }, n);

/** A top view of a species in a pose. */
export function bugTopView(id: string, pose: BugPose = {}): BugDrawing {
  const s = findBug(id), L = s.length.typical, sh = s.shape, parts: BugPart[] = [], rnd = seeded(pose.seed ?? 1);
  const add = (role: BugRole, pts: FPoint[], closed = true, extra: Partial<BugPart> = {}) => parts.push({ role, pts, closed, ...extra });
  const gait = pose.gait ?? 0.25, wing = pose.wing ?? (s.wings === "net" ? 1 : s.wings === "scaled" ? 1 : 0);
  if (s.plan === "snail") return snail(s, add, parts);
  // body stations along y (head at the top)
  const yHead = -L / 2, hLen = L * sh.head, tLen = L * sh.thorax, aLen = L * sh.abdomen;
  const W = L * sh.width, Wa = L * sh.abdomenWidth;
  const headC: FPoint = [0, yHead + hLen / 2], thoraxC: FPoint = [0, yHead + hLen + tLen / 2], abdC: FPoint = [0, yHead + hLen + tLen + aLen / 2];
  // legs first (under the body)
  if (s.plan === "spider") {
    const cephC: FPoint = [0, yHead + hLen / 2], legL = L * s.legs;
    for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
      // spider legs: the front two pairs reach forward, the back two backward; long, arched
      const base: FPoint = [side * W * 0.42, cephC[1] - hLen * 0.25 + k * hLen * 0.17];
      const ang = (-55 + k * 38) * (Math.PI / 180), stride = 0.12 * Math.sin(2 * Math.PI * (gait + (k % 2 ? 0.5 : 0) + (side > 0 ? 0.5 : 0)));
      const dir: FPoint = [side * Math.cos(ang + stride * side), Math.sin(ang + stride * side)], len = legL * (k === 0 ? 1.05 : k === 3 ? 0.95 : k === 1 ? 0.95 : 0.75);
      const knee: FPoint = [base[0] + dir[0] * len * 0.45 + side * len * 0.06, base[1] + dir[1] * len * 0.45 - len * 0.04];
      const ankle: FPoint = [base[0] + dir[0] * len * 0.85, base[1] + dir[1] * len * 0.85];
      const tip: FPoint = [base[0] + dir[0] * len, base[1] + dir[1] * len + len * 0.03];
      add("leg", [base, knee, ankle, tip], false, { width: L * 0.045 });
      // bands on the legs (jorō spider)
      for (const u of [0.3, 0.62]) { const a = u < 0.45 ? base : knee, b = u < 0.45 ? knee : ankle, t = u < 0.45 ? u / 0.45 : (u - 0.45) / 0.4; add("band", [[a[0] + (b[0] - a[0]) * (t - 0.05), a[1] + (b[1] - a[1]) * (t - 0.05)], [a[0] + (b[0] - a[0]) * (t + 0.05), a[1] + (b[1] - a[1]) * (t + 0.05)]], false, { width: L * 0.05, colour: s.colours.accent }); }
    }
    for (const side of [-1, 1]) add("leg", [[side * W * 0.2, cephC[1] - hLen * 0.45], [side * W * 0.4, cephC[1] - hLen * 0.8], [side * W * 0.35, cephC[1] - hLen * 1.0]], false, { width: L * 0.04 });
    add("head", ell(cephC[0], cephC[1], W * 0.5, hLen * 0.55));
    add("abdomen", ell(0, cephC[1] + hLen * 0.5 + aLen * 0.5, Wa * 0.5, aLen * 0.52));
    // the jorō's yellow and blue-black bands across the abdomen
    for (let k = 0; k < 5; k++) { const y = cephC[1] + hLen * 0.5 + aLen * (0.15 + k * 0.17); add("band", [[-Wa * 0.42, y], [Wa * 0.42, y]], false, { width: aLen * 0.06, colour: k % 2 ? s.colours.accent : "#1d2a3a" }); }
    for (let k = 0; k < 4; k++) add("eye", ell((k - 1.5) * W * 0.12, cephC[1] - hLen * 0.4, W * 0.045, W * 0.045, 10));
    return { species: s, parts, size: L * (1 + 2 * s.legs) };
  }
  // insects: six legs from the thorax, one pair per segment, in tripod gait
  // a mantis's prothorax is a long neck: the forelegs at its front, the middle and hind legs well behind it
  const isMantis = s.id === "mantis", jumper = s.id === "bell-cricket";
  const legL = L * s.legs, segY = isMantis ? [thoraxC[1] - tLen * 0.38, thoraxC[1] + tLen * 0.3, thoraxC[1] + tLen * 0.46] : [thoraxC[1] - tLen * 0.3, thoraxC[1], thoraxC[1] + tLen * 0.32];
  const restAngle = [-48, 12, 52], reach = [0.9, 0.95, 1.2];
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    if (s.legs <= 0) break;
    const id2 = `${side < 0 ? "L" : "R"}${k + 1}`, group = ["L1", "R2", "L3"].includes(id2) ? 0 : 1;
    const phase = (gait + group * 0.5) % 1, swing = phase < 0.5 ? Math.sin(phase * 2 * Math.PI) * 0.0 + (phase * 2 - 0.5) : (1.5 - phase * 2);
    const ang = ((restAngle[k] + swing * 22) * Math.PI) / 180, len = legL * reach[k] * (s.id === "mantis" && k === 0 ? 0.75 : 1);
    const base: FPoint = [side * W * 0.38, segY[k]], dir: FPoint = [side * Math.cos(ang), Math.sin(ang)];
    // femur out and a little forward of the line to the foot; the knee bends; the tibia and tarsus reach the ground
    const knee: FPoint = [base[0] + dir[0] * len * 0.42 + side * len * 0.08, base[1] + dir[1] * len * 0.42 - len * 0.05];
    const foot: FPoint = [base[0] + dir[0] * len * 0.86, base[1] + dir[1] * len * 0.86];
    const tip: FPoint = [base[0] + dir[0] * len, base[1] + dir[1] * len + (k === 2 ? len * 0.05 : 0)];
    if (isMantis && k === 0) {
      // raptorial forelegs held folded before the face: a long coxa forward, a thick spined femur back up alongside it,
      // the tibia folded against the femur like a jackknife, a fine tarsus
      const cx: FPoint = [side * W * 0.35, base[1] - len * 0.38], fe: FPoint = [side * W * 0.85, base[1] - len * 0.1], ti: FPoint = [side * W * 0.45, base[1] - len * 0.5];
      add("leg", [base, cx], false, { width: L * 0.03 });
      add("leg", [cx, fe], false, { width: L * 0.05 });
      add("leg", [fe, ti], false, { width: L * 0.026 });
      add("leg", [ti, [ti[0] - side * W * 0.15, ti[1] - len * 0.05]], false, { width: L * 0.012 });
      // the femur's spines, pointing inward
      for (let q = 1; q < 6; q++) { const a: FPoint = [cx[0] + (fe[0] - cx[0]) * (q / 6), cx[1] + (fe[1] - cx[1]) * (q / 6)]; add("leg", [a, [a[0] - side * L * 0.025, a[1] - L * 0.01]], false, { width: L * 0.006 }); }
      continue;
    }
    // a cricket's hind legs are its jumping legs: a long, thick femur angled back, a slender spined tibia
    const hindJump = jumper && k === 2;
    // the leg by segment: a stout femur, a slimmer tibia, then the fine tarsus of jointed tarsomeres ending in claws
    const w0 = L * (s.id === "rhino-beetle" || s.id === "stag-beetle" ? 0.045 : s.id === "honeybee" || s.id === "cicada" ? 0.034 : 0.03);
    if (hindJump) {
      const fk: FPoint = [base[0] + side * L * 0.28, base[1] + L * 0.55], ft: FPoint = [fk[0] + side * L * 0.05, fk[1] + L * 0.55];
      add("leg", [base, [base[0] + side * L * 0.16, base[1] + L * 0.28], fk], false, { width: L * 0.085 });
      add("leg", [fk, ft], false, { width: L * 0.025 });
      for (let q = 1; q < 6; q++) { const a: FPoint = [fk[0] + (ft[0] - fk[0]) * (q / 6), fk[1] + (ft[1] - fk[1]) * (q / 6)]; add("leg", [a, [a[0] + side * L * 0.025, a[1] - L * 0.005]], false, { width: L * 0.006 }); }
      add("leg", [ft, [ft[0], ft[1] + L * 0.12]], false, { width: L * 0.014 });
      continue;
    }
    add("leg", [base, knee], false, { width: w0 });
    add("leg", [knee, foot], false, { width: w0 * 0.68 });
    const nT = 4;
    for (let q = 0; q < nT; q++) {
      const a: FPoint = [foot[0] + ((tip[0] - foot[0]) * q) / nT, foot[1] + ((tip[1] - foot[1]) * q) / nT], b: FPoint = [foot[0] + ((tip[0] - foot[0]) * (q + 0.85)) / nT, foot[1] + ((tip[1] - foot[1]) * (q + 0.85)) / nT];
      add("leg", [a, b], false, { width: w0 * (0.42 - q * 0.04) });
    }
    // the claws: a small fork at the tip
    const tdx = tip[0] - foot[0], tdy = tip[1] - foot[1], tl = Math.hypot(tdx, tdy) || 1, cl = w0 * 0.9;
    for (const sg of [-1, 1]) add("leg", [tip, [tip[0] + (tdx / tl) * cl * 0.6 + (-tdy / tl) * cl * 0.5 * sg, tip[1] + (tdy / tl) * cl * 0.6 + (tdx / tl) * cl * 0.5 * sg]], false, { width: w0 * 0.18 });
    // the knee: a small swelling at the femur–tibia joint
    add("leg", ellipsePoints({ cx: knee[0], cy: knee[1], rx: w0 * 0.5, ry: w0 * 0.5, angle: 0 }, 10), true, { width: 0 });
  }
  // wings (under the body for open wings, over it for closed ones)
  const wingRoot1: FPoint = [0, segY[1]], wingRoot2: FPoint = [0, segY[2]];
  const openWings: BugPart[] = [], closedWings: BugPart[] = [];
  if (s.wings === "scaled") {
    const span = (s.wingspan?.typical ?? L * 2.6) / 2, k = 0.25 + 0.75 * wing;
    const fore: FPoint[] = [[0, -0.05], [0.25, -0.38], [0.7, -0.6], [1, -0.55], [0.92, -0.12], [0.55, 0.05], [0.1, 0.06]];
    const swallow = s.id === "swallowtail";
    const hind: FPoint[] = swallow ? [[0, 0], [0.45, 0.02], [0.72, 0.18], [0.66, 0.45], [0.5, 0.58], [0.44, 0.92], [0.36, 0.6], [0.12, 0.42]] : [[0, 0], [0.5, 0.02], [0.72, 0.22], [0.62, 0.5], [0.35, 0.56], [0.1, 0.38]];
    for (const side of [-1, 1]) {
      const map = (q: FPoint, root: FPoint): FPoint => [root[0] + side * q[0] * span * k, root[1] + q[1] * span];
      openWings.push({ role: "wing", pts: hind.map(q => map(q, wingRoot2)), closed: true, colour: s.colours.wing });
      openWings.push({ role: "wing", pts: fore.map(q => map(q, wingRoot1)), closed: true, colour: s.colours.wing });
      // the pattern: dark veins and bands (swallowtail), dark tips and spots (cabbage white)
      if (swallow) {
        for (let v = 0; v < 6; v++) openWings.push({ role: "vein", pts: [map([0.05, -0.02], wingRoot1), map([0.35 + v * 0.11, -0.55 + v * 0.09], wingRoot1)], closed: false, width: span * 0.012, colour: s.colours.accent });
        openWings.push({ role: "band", pts: [map([0.72, -0.6], wingRoot1), map([1, -0.55], wingRoot1), map([0.92, -0.12], wingRoot1), map([0.78, -0.08], wingRoot1)], closed: true, colour: s.colours.accent });
        openWings.push({ role: "band", pts: [map([0.5, 0.45], wingRoot2), map([0.66, 0.45], wingRoot2), map([0.72, 0.18], wingRoot2), map([0.6, 0.15], wingRoot2)], closed: true, colour: s.colours.accent });
        openWings.push({ role: "spot", pts: ell(...map([0.5, 0.4], wingRoot2), span * 0.04, span * 0.04, 12), closed: true, colour: "#3d64b8" });
        openWings.push({ role: "spot", pts: ell(...map([0.38, 0.5], wingRoot2), span * 0.035, span * 0.03, 12), closed: true, colour: "#d1452f" });
      } else {
        openWings.push({ role: "band", pts: [map([0.75, -0.6], wingRoot1), map([1, -0.55], wingRoot1), map([0.96, -0.32], wingRoot1), map([0.8, -0.42], wingRoot1)], closed: true, colour: "#57544c" });
        openWings.push({ role: "spot", pts: ell(...map([0.6, -0.28], wingRoot1), span * 0.05, span * 0.05, 12), closed: true, colour: "#3a3833" });
      }
    }
  } else if (s.wings === "net") {
    const span = (s.wingspan?.typical ?? L * 1.6) / 2;
    for (const side of [-1, 1]) for (const [root, back] of [[wingRoot1, -0.06], [wingRoot2, 0.1]] as const) {
      const w0 = span * 0.12, pts: FPoint[] = [[0, 0], [span * 0.3, -w0 * 0.6 + back * span], [span * 0.95, -w0 * 0.4 + back * span * 1.4], [span, back * span * 1.4], [span * 0.9, w0 * 0.5 + back * span * 1.4], [span * 0.3, w0 * 1.1 + back * span], [0, w0 * 0.8]];
      const m = (q: FPoint): FPoint => [root[0] + side * q[0], root[1] + q[1]];
      openWings.push({ role: "wing", pts: pts.map(m), closed: true, colour: s.colours.wing, opacity: 0.55 });
      // a net of veins and the dark pterostigma near the tip
      for (let v = 0; v < 4; v++) openWings.push({ role: "vein", pts: [m([0, w0 * 0.2 * v]), m([span * 0.98, back * span * 1.4 - w0 * 0.3 + w0 * 0.2 * v])], closed: false, width: span * 0.006, colour: "#5a4a3a" });
      for (let u = 1; u < 18; u++) { const x = (span * u) / 18; openWings.push({ role: "vein", pts: [m([x, -w0 * 0.5 + back * span * (0.6 + x / span * 0.8)]), m([x, w0 * 0.9 + back * span * (0.6 + x / span * 0.8)])], closed: false, width: span * 0.003, colour: "#5a4a3a" }); }
      openWings.push({ role: "spot", pts: [m([span * 0.8, -w0 * 0.35 + back * span * 1.32]), m([span * 0.88, -w0 * 0.33 + back * span * 1.36]), m([span * 0.88, -w0 * 0.15 + back * span * 1.36]), m([span * 0.8, -w0 * 0.17 + back * span * 1.32])], closed: true, colour: s.colours.accent });
    }
  } else if (s.wings === "membrane" || s.wings === "one-pair" || s.wings === "tegmina") {
    // folded over the back, tent-wise (resting), or spread out sideways (wing > 0)
    const len = s.wings === "tegmina" ? aLen * 1.05 + tLen * 0.3 : s.id === "cicada" ? aLen * 1.3 + tLen * 0.3 : aLen * 0.95, spread = wing;
    for (const side of [-1, 1]) {
      const root: FPoint = [side * W * 0.12, wingRoot1[1]], ang = side * spread * 1.2;
      const shape: FPoint[] = [[0, 0], [W * 0.42, len * 0.12], [W * 0.5, len * 0.6], [W * 0.3, len * 0.95], [W * 0.1, len], [-W * 0.02, len * 0.7]];
      const place = (q: FPoint): FPoint => { const r = rot([side * q[0], q[1]], -ang); return [root[0] + r[0], root[1] + r[1]]; };
      (wing > 0.3 ? openWings : closedWings).push({ role: "wing", pts: shape.map(place), closed: true, colour: s.colours.wing, opacity: s.wings === "tegmina" ? 0.9 : 0.65 });
      (wing > 0.3 ? openWings : closedWings).push({ role: "vein", pts: ([[W * 0.05, len * 0.05], [W * 0.3, len * 0.5], [W * 0.22, len * 0.92]] as FPoint[]).map(place), closed: false, width: L * 0.006, colour: "#3a2a20" });
    }
  }
  parts.push(...openWings);
  // the body: head, thorax, abdomen (with segment lines); a waist for ants
  const abdPts: FPoint[] = [];
  for (let k = 0; k <= 30; k++) { const a = (k / 30) * Math.PI * 2, y = Math.sin(a), taper = y > 0 ? 1 - 0.55 * y * y : 1; abdPts.push([Math.cos(a) * (Wa / 2) * taper, abdC[1] + y * aLen * 0.52]); }
  if (s.wings !== "elytra") {
    add("abdomen", abdPts);
    const nSeg = s.wings === "net" ? 10 : 7;
    for (let k = 1; k < nSeg; k++) { const y = abdC[1] - aLen * 0.5 + (aLen * k) / nSeg, half = (Wa / 2) * Math.sqrt(Math.max(0, 1 - ((y - abdC[1]) / (aLen * 0.52)) ** 2)) * 0.95; add("segment", [[-half, y], [half, y]], false, { width: L * 0.008 }); }
    if (s.id === "honeybee") for (let k = 1; k < 5; k++) { const y = abdC[1] - aLen * 0.35 + (aLen * k) / 6, half = (Wa / 2) * 0.85; add("band", [[-half, y], [half, y]], false, { width: aLen * 0.07, colour: s.colours.accent }); }
  }
  if (s.id === "ant") add("body", ell(0, thoraxC[1] + tLen * 0.55, W * 0.12, tLen * 0.14, 12));
  // thorax (pronotum on top)
  if (isMantis) {
    add("thorax", ell(0, thoraxC[1] - tLen * 0.12, W * 0.26, tLen * 0.4));
    add("thorax", ell(0, thoraxC[1] + tLen * 0.36, W * 0.5, tLen * 0.18));
  } else add("thorax", ell(thoraxC[0], thoraxC[1], W * (s.wings === "net" ? 0.5 : s.wings === "elytra" ? 0.52 : 0.48), tLen * 0.52));
  if (s.id === "firefly") { add("spot", ell(0, thoraxC[1] - tLen * 0.18, W * 0.42, tLen * 0.28), true, { colour: s.colours.accent }); add("segment", [[0, thoraxC[1] - tLen * 0.42], [0, thoraxC[1] + tLen * 0.05]], false, { width: L * 0.025 }); add("segment", [[-W * 0.15, thoraxC[1] - tLen * 0.2], [W * 0.15, thoraxC[1] - tLen * 0.2]], false, { width: L * 0.02 }); }
  // beetles: elytra cover the abdomen, meeting in a straight line
  if (s.wings === "elytra") {
    const ey0 = thoraxC[1] + tLen * 0.45, eLen = aLen * 1.0, ew = Wa / 2;
    for (const side of [-1, 1]) {
      // half of one rounded shell: straight along the midline, shoulders square, the tip rounded
      const pts: FPoint[] = [[0, ey0], [side * ew * 0.88, ey0 + eLen * 0.01], [side * ew * 1.0, ey0 + eLen * 0.12], [side * ew * 1.02, ey0 + eLen * 0.5], [side * ew * 0.9, ey0 + eLen * 0.78], [side * ew * 0.55, ey0 + eLen * 0.96], [0, ey0 + eLen * (1 - 0.03 * wing)]];
      const lift = wing * 0.6;
      parts.push({ role: "elytra", pts: pts.map(([x, y]) => [x + side * lift * ew * (y - ey0) / eLen, y] as FPoint), closed: false, colour: s.colours.wing });
      parts[parts.length - 1].closed = true;
      // the suture between the two elytra
      add("segment", [[0, ey0], [0, ey0 + eLen * 0.97]], false, { width: L * 0.01 });
    }
    if (s.id === "ladybird") {
      add("spot", ell(0, ey0 + eLen * 0.06, Wa * 0.11, Wa * 0.08, 14), true, { colour: s.colours.accent });
      for (const side of [-1, 1]) for (const [x, y, rr] of [[0.45, 0.28, 0.09], [0.6, 0.55, 0.11], [0.35, 0.8, 0.08]]) add("spot", ell(side * ew * x, ey0 + eLen * y, Wa * rr, Wa * rr, 14), true, { colour: s.colours.accent });
    }
    if (s.id === "firefly") { add("glow", ell(0, ey0 + eLen * 0.94, Wa * 0.3, aLen * 0.12, 16), true, { colour: s.colours.glow, opacity: pose.glow ?? 1 }); }
  }
  parts.push(...closedWings);
  // head with eyes, antennae, mouthparts, horns
  const headW = s.wings === "net" ? W * 0.95 : s.id === "cicada" ? W * 1.05 : W * (s.id === "ant" || s.id === "honeybee" ? 0.7 : 0.6);
  if (isMantis) {
    // a mantis's head: a triangle, broad at the top with the big compound eyes at its corners, narrowing to the mouth
    const hw = W * 1.15;
    add("head", [[-hw * 0.5, headC[1] - hLen * 0.35], [hw * 0.5, headC[1] - hLen * 0.35], [hw * 0.12, headC[1] + hLen * 0.6], [-hw * 0.12, headC[1] + hLen * 0.6]]);
    for (const side of [-1, 1]) add("eye", ell(side * hw * 0.42, headC[1] - hLen * 0.28, hw * 0.16, hLen * 0.3, 14));
  } else add("head", ell(headC[0], headC[1], headW / 2, hLen * 0.55));
  const eyeR = s.wings === "net" ? headW * 0.3 : headW * 0.16;
  if (!isMantis) for (const side of [-1, 1]) add("eye", ell(side * headW * (s.wings === "net" ? 0.22 : 0.38), headC[1] - hLen * 0.05, eyeR, eyeR * (s.wings === "net" ? 1.1 : 1.2), 14));
  const antL = L * s.antennae;
  if (antL > 0.3) for (const side of [-1, 1]) {
    const elbow = s.id === "ant" || s.id === "honeybee";
    const a0: FPoint = [side * headW * 0.15, headC[1] - hLen * 0.45], a1: FPoint = elbow ? [side * antL * 0.35, a0[1] - antL * 0.25] : [side * antL * 0.25, a0[1] - antL * 0.45], a2: FPoint = elbow ? [side * antL * 0.55, a0[1] - antL * 0.75] : [side * antL * 0.45, a0[1] - antL * 0.95];
    add("antenna", [a0, a1, a2], false, { width: L * (s.wings === "scaled" ? 0.012 : 0.015) });
    if (s.wings === "scaled") add("antenna", ell(a2[0], a2[1], L * 0.025, L * 0.04, 8), true);
  }
  if (s.id === "stag-beetle") for (const side of [-1, 1]) add("mandible", [[side * headW * 0.2, headC[1] - hLen * 0.4], [side * headW * 0.55, headC[1] - hLen * 1.2], [side * headW * 0.35, headC[1] - hLen * 1.9], [side * headW * 0.12, headC[1] - hLen * 2.0], [side * headW * 0.28, headC[1] - hLen * 1.5], [side * headW * 0.05, headC[1] - hLen * 0.6]], true);
  if (s.id === "rhino-beetle") add("horn", [[-headW * 0.12, headC[1] - hLen * 0.3], [-headW * 0.1, headC[1] - hLen * 1.6], [-headW * 0.3, headC[1] - hLen * 2.1], [-headW * 0.05, headC[1] - hLen * 1.9], [0, headC[1] - hLen * 2.2], [headW * 0.05, headC[1] - hLen * 1.9], [headW * 0.3, headC[1] - hLen * 2.1], [headW * 0.1, headC[1] - hLen * 1.6], [headW * 0.12, headC[1] - hLen * 0.3]], true);
  void rnd;
  const extent = Math.max(L, (s.wingspan?.typical ?? 0), L * (1 + 1.3 * s.legs));
  return { species: s, parts, size: extent };
}

function snail(s: BugSpecies, add: (role: BugRole, pts: FPoint[], closed?: boolean, extra?: Partial<BugPart>) => void, parts: BugPart[]): BugDrawing {
  const L = s.length.typical;
  // the foot, longer than the shell, the head with two pairs of tentacles (eyes on the upper pair)
  const foot: FPoint[] = [];
  for (let k = 0; k <= 30; k++) { const a = (k / 30) * Math.PI * 2; foot.push([Math.cos(a) * L * 0.16 * (1 - 0.3 * Math.max(0, Math.sin(a))), -L * 0.05 + Math.sin(a) * L * 0.55]); }
  add("body", foot);
  for (const side of [-1, 1]) {
    add("antenna", [[side * L * 0.05, -L * 0.52], [side * L * 0.16, -L * 0.82]], false, { width: L * 0.03 });
    add("eye", ell(side * L * 0.16, -L * 0.83, L * 0.025, L * 0.025, 10));
    add("antenna", [[side * L * 0.04, -L * 0.56], [side * L * 0.08, -L * 0.66]], false, { width: L * 0.022 });
  }
  // the shell: a logarithmic spiral (dextral), whorls widening
  const shell: FPoint[] = [], cx = 0, cy = L * 0.08;
  for (let k = 0; k <= 160; k++) { const a = (k / 160) * Math.PI * 2 * 2.6, r = Math.min(L * 0.33, L * 0.03 * Math.exp(0.147 * a)); shell.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  add("shell", ell(cx, cy, L * 0.36, L * 0.34, 40));
  add("band", shell, false, { width: L * 0.025, colour: s.colours.accent });
  return { species: s, parts, size: L * 1.4 };
}
