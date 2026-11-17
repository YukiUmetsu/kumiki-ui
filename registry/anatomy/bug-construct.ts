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
const L2 = (p: FPoint, q: FPoint, t: number): FPoint => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

/*
 * Butterfly wings are drawn in their vein cells, as lepidopterists read a pattern: each band, spot and lunule sits in
 * the cell between two veins at a set distance from the wing's base. A vein is a line from its inner end (the discal
 * cell) to the margin; `cellPatch` and `lunule` place a mark between two of them. Coordinates are in forewing lengths,
 * x outward from the root, y toward the tail.
 */
type VeinLine = readonly [FPoint, FPoint];
type Mark = { role: BugRole; pts: FPoint[]; closed: boolean; colour?: string; width?: number; opacity?: number };
function cellPatch(A: VeinLine, B: VeinLine, r0: number, r1: number, s0: number, s1: number, n = 3): FPoint[] {
  const at = (r: number, q: number) => L2(L2(A[0], A[1], r), L2(B[0], B[1], r), q), pts: FPoint[] = [];
  for (let i = 0; i <= n; i++) pts.push(at(r0, s0 + ((s1 - s0) * i) / n));
  for (let i = 1; i <= n; i++) pts.push(at(r0 + ((r1 - r0) * i) / n, s1));
  for (let i = n - 1; i >= 0; i--) pts.push(at(r1, s0 + ((s1 - s0) * i) / n));
  for (let i = n - 1; i >= 1; i--) pts.push(at(r0 + ((r1 - r0) * i) / n, s0));
  return pts;
}
/** A lunule: a crescent across a cell near `r`, bowed toward the wing's base, thickest in the middle. */
function lunule(A: VeinLine, B: VeinLine, r: number, depth: number, s0: number, s1: number): FPoint[] {
  const at = (rr: number, q: number) => L2(L2(A[0], A[1], rr), L2(B[0], B[1], rr), q), pts: FPoint[] = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8, b = 4 * u * (1 - u); pts.push(at(r - 0.5 * depth * b, s0 + (s1 - s0) * u)); }
  for (let i = 7; i >= 1; i--) { const u = i / 8, b = 4 * u * (1 - u); pts.push(at(r - depth * (0.15 + b), s0 + (s1 - s0) * u)); }
  return pts;
}
const disc = (cx: number, cy: number, r: number): FPoint[] => ell(cx, cy, r, r, 16);

/**
 * Papilio xuthus, measured from a museum specimen photographed from above (MZLU 00129145, CC0): a triangular forewing
 * with a nearly straight outer margin; a scalloped hindwing with a tail at vein M3 and a lobe at the tornus. Black
 * ground with cream marks: four streaks along the forewing's discal cell and two along its inner margin, a postdiscal
 * band of wedges growing toward the inner margin, a row of submarginal lunules; the hindwing's basal half cream crossed
 * by black veins, a band of blue scales, cream lunules and margin crescents, an orange eyespot with a black pupil at the
 * tornus, a cream line in the tail.
 */
function papilioWings(cream: string): { fore: FPoint[]; hind: FPoint[]; foreMarks: Mark[]; hindMarks: Mark[] } {
  const fore: FPoint[] = [[0, 0.02], [0.1, -0.1], [0.28, -0.28], [0.48, -0.44], [0.66, -0.55], [0.785, -0.6], [0.815, -0.565], [0.775, -0.43], [0.715, -0.29], [0.655, -0.15], [0.6, -0.03], [0.555, 0.035], [0.4, 0.055], [0.2, 0.055], [0.06, 0.045]];
  const apex: FPoint = [0.8, -0.585], tornus: FPoint = [0.555, 0.04], cTop: FPoint = [0.43, -0.3], cBot: FPoint = [0.37, -0.05];
  const margin = (u: number): FPoint => { const q = L2(apex, tornus, u); return [q[0] - 0.015 * Math.sin(Math.PI * u), q[1]]; };
  const fv: VeinLine[] = [[[0.45, -0.37], [0.79, -0.575]], ...Array.from({ length: 8 }, (_, i) => [L2(cTop, cBot, i / 7), margin((i + 1) / 9)] as VeinLine), [[0.3, 0.05], [0.55, 0.04]]];
  const foreMarks: Mark[] = [];
  const cm = (pts: FPoint[]) => foreMarks.push({ role: "band", pts, closed: true, colour: cream });
  const cellU: VeinLine = [[0.04, -0.01], [0.42, -0.305]], cellD: VeinLine = [[0.06, 0.03], [0.37, -0.045]], inner: VeinLine = [[0.06, 0.05], [0.5, 0.05]];
  for (let q = 0; q < 4; q++) cm(cellPatch(cellU, cellD, 0.08, 0.86, (q + 0.14) / 4, (q + 0.56) / 4));
  cm(cellPatch(cellD, inner, 0.1, 0.8, 0.22, 0.5)); cm(cellPatch(cellD, inner, 0.12, 0.66, 0.66, 0.92));
  for (let c = 0; c < 9; c++) cm(cellPatch(fv[c], fv[c + 1], c === 0 ? 0.52 : 0.6 - 0.032 * c, 0.73 - 0.008 * c, 0.14, 0.86));
  for (let c = 0; c < 9; c++) cm(lunule(fv[c], fv[c + 1], 0.95, 0.07, 0.16, 0.84));
  const hind: FPoint[] = [[0, 0], [0.18, -0.04], [0.38, -0.03], [0.52, 0.01], [0.565, 0.09], [0.548, 0.16], [0.575, 0.24], [0.55, 0.32], [0.54, 0.4], [0.5, 0.45], [0.47, 0.52], [0.54, 0.62], [0.6, 0.72], [0.62, 0.765], [0.585, 0.755], [0.5, 0.66], [0.41, 0.58], [0.36, 0.61], [0.31, 0.635], [0.25, 0.6], [0.17, 0.44], [0.09, 0.24], [0.03, 0.08]];
  const hT: FPoint = [0.3, 0.06], hB: FPoint = [0.21, 0.22];
  const hv: VeinLine[] = [[[0.12, -0.03], [0.53, 0.02]], [hT, [0.565, 0.12]], [L2(hT, hB, 0.25), [0.565, 0.24]], [L2(hT, hB, 0.5), [0.54, 0.38]], [L2(hT, hB, 0.75), [0.48, 0.5]], [hB, [0.38, 0.6]], [[0.1, 0.25], [0.29, 0.62]]];
  const hindMarks: Mark[] = [];
  const hm = (pts: FPoint[], colour = cream, opacity?: number) => hindMarks.push({ role: "band", pts, closed: true, colour, opacity });
  hm([[0.01, 0.0], [0.18, -0.03], [0.42, -0.012], [0.3, 0.06], [0.21, 0.22], [0.12, 0.3], [0.06, 0.18], [0.02, 0.06]]);
  for (let c = 0; c < 6; c++) hm(cellPatch(hv[c], hv[c + 1], 0, c === 5 ? 0.4 : 0.48, 0.1, 0.9));
  for (let c = 1; c < 5; c++) hm(cellPatch(hv[c], hv[c + 1], 0.6, 0.71, 0.18, 0.82), "#4b6fb4", 0.9);
  for (let c = 0; c < 5; c++) { hm(lunule(hv[c], hv[c + 1], 0.9, 0.08, 0.2, 0.8)); hm(lunule(hv[c], hv[c + 1], 1.0, 0.035, 0.25, 0.75)); }
  // black veins across the cream base and a bar closing the discal cell
  for (const [a, b] of [[[0.01, 0.0], hT], [[0.03, 0.08], hB], [hT, hB], ...hv.slice(1, 6).map(l => [l[0], L2(l[0], l[1], 0.5)])] as [FPoint, FPoint][]) hindMarks.push({ role: "vein", pts: [a, b], closed: false, width: 0.012 });
  // the eyespot at the tornus: orange, a black pupil, a little blue above; a cream line down the tail
  hm(disc(0.315, 0.585, 0.034), "#de5f2b"); hm(disc(0.322, 0.592, 0.014), "#1a1814"); hm(lunule([[0.27, 0.5], [0.28, 0.54]], [[0.36, 0.5], [0.37, 0.54]], 1.2, 0.5, 0.15, 0.85), "#4b6fb4", 0.9);
  hindMarks.push({ role: "vein", pts: [[0.515, 0.63], [0.59, 0.735]], closed: false, width: 0.012, colour: cream });
  return { fore, hind, foreMarks, hindMarks };
}

/**
 * Pieris rapae (observed in photographs): rounded wings, white with a little cream; a charcoal patch at the forewing's
 * apex with a ragged inner edge; one black spot in the forewing's postdiscal area (two in the female); a dark spot on
 * the hindwing's costa; grey dusting at the wing bases; faint grey veins.
 */
function pierisWings(): { fore: FPoint[]; hind: FPoint[]; foreMarks: Mark[]; hindMarks: Mark[] } {
  const fore: FPoint[] = [[0, 0.02], [0.12, -0.1], [0.3, -0.26], [0.5, -0.4], [0.66, -0.49], [0.76, -0.505], [0.805, -0.45], [0.795, -0.3], [0.745, -0.15], [0.665, -0.02], [0.575, 0.06], [0.42, 0.08], [0.22, 0.07], [0.06, 0.05]];
  const hind: FPoint[] = [[0, 0], [0.2, -0.04], [0.4, -0.02], [0.52, 0.06], [0.565, 0.18], [0.545, 0.32], [0.47, 0.44], [0.35, 0.5], [0.22, 0.46], [0.12, 0.32], [0.04, 0.12]];
  const vein = (a: FPoint, b: FPoint): Mark => ({ role: "vein", pts: [a, b], closed: false, width: 0.005, colour: "#b9b5aa" });
  const foreMarks: Mark[] = [
    { role: "band", pts: [[0, 0.02], [0.1, -0.08], [0.2, -0.17], [0.23, -0.05], [0.18, 0.06], [0.06, 0.05]], closed: true, colour: "#7f7c75", opacity: 0.45 },
    vein([0.03, 0.0], [0.36, -0.22]), vein([0.05, 0.03], [0.3, -0.04]), vein([0.06, -0.02], [0.6, -0.465]),
    ...([[0.7, -0.47], [0.77, -0.4], [0.79, -0.28], [0.74, -0.16], [0.67, -0.04], [0.57, 0.05]] as FPoint[]).map((q, i) => vein(L2([0.36, -0.22], [0.3, -0.04], i / 5), q)),
    { role: "band", pts: [[0.6, -0.465], [0.7, -0.5], [0.76, -0.505], [0.805, -0.45], [0.8, -0.33], [0.775, -0.3], [0.755, -0.345], [0.735, -0.33], [0.71, -0.39], [0.68, -0.4], [0.655, -0.44]], closed: true, colour: "#4d4a44", opacity: 0.9 },
    { role: "spot", pts: disc(0.565, -0.17, 0.034), closed: true, colour: "#2f2d29" },
  ];
  const hindMarks: Mark[] = [
    { role: "band", pts: [[0, 0], [0.12, -0.03], [0.18, 0.06], [0.14, 0.16], [0.05, 0.12]], closed: true, colour: "#7f7c75", opacity: 0.4 },
    vein([0.02, 0.0], [0.26, 0.08]), vein([0.03, 0.06], [0.2, 0.2]), vein([0.04, 0.1], [0.24, 0.47]),
    ...([[0.5, 0.05], [0.56, 0.2], [0.53, 0.33], [0.45, 0.45], [0.33, 0.5]] as FPoint[]).map((q, i) => vein(L2([0.26, 0.08], [0.2, 0.2], i / 4), q)),
    { role: "spot", pts: disc(0.37, -0.005, 0.026), closed: true, colour: "#3a3833" },
  ];
  return { fore, hind, foreMarks, hindMarks };
}

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
    // the forewing's length (root to apex) is about the half-span; the wings narrow in view as they close upright
    const F = ((s.wingspan?.typical ?? L * 2.6) / 2) * 0.98, k = 0.25 + 0.75 * wing;
    const g = s.id === "swallowtail" ? papilioWings(s.colours.wing ?? "#f1d36a") : pierisWings();
    const ground = s.id === "swallowtail" ? (s.colours.accent ?? "#1f1c18") : (s.colours.wing ?? "#f3f1e8");
    for (const side of [-1, 1]) {
      const map = (root: FPoint) => (q: FPoint): FPoint => [root[0] + side * q[0] * F * k, root[1] + q[1] * F];
      // the hindwing first, the forewing over it
      for (const [outline, marks, m] of [[g.hind, g.hindMarks, map(wingRoot2)], [g.fore, g.foreMarks, map(wingRoot1)]] as const) {
        openWings.push({ role: "wing", pts: outline.map(m), closed: true, colour: ground });
        for (const mk of marks) openWings.push({ ...mk, pts: mk.pts.map(m), width: mk.width !== undefined ? mk.width * F : undefined, colour: mk.colour ?? (s.colours.accent ?? "#1f1c18") });
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
      const into = wing > 0.3 ? openWings : closedWings;
      if (s.id === "cicada") {
        // the aburazemi's forewing (observed in photographs): opaque brown, widest a third of the way back, the tip
        // well past the abdomen; pale veins run its length to a line of cross-veins about 0.6 back, beyond which they
        // close the apical cells; darker clouding between the veins
        const cw: FPoint[] = [[0, 0], [W * 0.28, len * 0.03], [W * 0.46, len * 0.2], [W * 0.52, len * 0.45], [W * 0.45, len * 0.72], [W * 0.3, len * 0.93], [W * 0.15, len * 1.0], [W * 0.03, len * 0.97], [-W * 0.1, len * 0.75], [-W * 0.12, len * 0.4], [-W * 0.06, len * 0.12]];
        into.push({ role: "wing", pts: cw.map(place), closed: true, colour: s.colours.wing, opacity: 1 });
        for (let q = 0; q < 9; q++) { const cx = W * (0.3 - 0.06 * q + 0.1 * rnd()), cy = len * (0.25 + 0.08 * q); into.push({ role: "spot", pts: ell(cx, cy, W * 0.07, len * 0.035, 10).map(place), closed: true, colour: "#2b1a10", opacity: 0.3 }); }
        const nodal: FPoint[] = [[W * 0.5, len * 0.58], [W * 0.3, len * 0.62], [W * 0.1, len * 0.62], [-W * 0.09, len * 0.6]];
        for (const [i, t] of [[0, len * 0.55], [1, len * 0.6], [2, len * 0.62], [3, len * 0.6]] as const) into.push({ role: "vein", pts: ([[W * 0.02, len * 0.03], [nodal[i][0] * 0.9, t * 0.5], nodal[i]] as FPoint[]).map(place), closed: false, width: L * 0.005, colour: "#cfae7e" });
        into.push({ role: "vein", pts: nodal.map(place), closed: false, width: L * 0.005, colour: "#cfae7e" });
        const tips: FPoint[] = [[W * 0.48, len * 0.7], [W * 0.42, len * 0.8], [W * 0.33, len * 0.9], [W * 0.22, len * 0.97], [W * 0.1, len * 0.99], [-W * 0.02, len * 0.93], [-W * 0.08, len * 0.8]];
        tips.forEach((tq, i) => into.push({ role: "vein", pts: [nodal[Math.min(3, Math.floor((i * 4) / tips.length))], tq].map(place), closed: false, width: L * 0.004, colour: "#cfae7e" }));
        continue;
      }
      if (s.id === "mantis") {
        // Tenodera sinensis's tegmina (observed in photographs): long and narrow, folded flat over the abdomen and past
        // it, brown with a green stripe along the outer (costal) edge, fine veins along their length
        const Wt = W * 1.5, teg: FPoint[] = [[0, 0], [Wt * 0.42, len * 0.12], [Wt * 0.5, len * 0.6], [Wt * 0.3, len * 0.95], [Wt * 0.1, len], [-Wt * 0.02, len * 0.7]];
        into.push({ role: "wing", pts: teg.map(place), closed: true, colour: s.colours.wing, opacity: 0.95 });
        into.push({ role: "band", pts: ([[Wt * 0.36, len * 0.08], [Wt * 0.47, len * 0.35], [Wt * 0.5, len * 0.6], [Wt * 0.33, len * 0.92], [Wt * 0.26, len * 0.9], [Wt * 0.38, len * 0.6], [Wt * 0.36, len * 0.35], [Wt * 0.27, len * 0.1]] as FPoint[]).map(place), closed: true, colour: s.colours.body });
        for (const f of [0.12, 0.2, 0.28]) into.push({ role: "vein", pts: ([[Wt * f * 0.5, len * 0.05], [Wt * f, len * 0.5], [Wt * f * 0.6, len * 0.95]] as FPoint[]).map(place), closed: false, width: L * 0.003, colour: "#5d4a2c" });
        continue;
      }
      into.push({ role: "wing", pts: shape.map(place), closed: true, colour: s.colours.wing, opacity: s.wings === "tegmina" ? 0.9 : 0.65 });
      into.push({ role: "vein", pts: ([[W * 0.05, len * 0.05], [W * 0.3, len * 0.5], [W * 0.22, len * 0.92]] as FPoint[]).map(place), closed: false, width: L * 0.006, colour: "#3a2a20" });
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
    if (s.id === "swallowtail") for (const side of [-1, 1]) add("band", [[side * Wa * 0.3, abdC[1] - aLen * 0.45], [side * Wa * 0.34, abdC[1]], [side * Wa * 0.22, abdC[1] + aLen * 0.42]], false, { width: L * 0.018, colour: s.colours.wing });
    if (s.id === "honeybee") for (let k = 1; k < 5; k++) { const y = abdC[1] - aLen * 0.35 + (aLen * k) / 6, half = (Wa / 2) * 0.85; add("band", [[-half, y], [half, y]], false, { width: aLen * 0.07, colour: s.colours.accent }); }
  }
  if (s.id === "ant") add("body", ell(0, thoraxC[1] + tLen * 0.55, W * 0.12, tLen * 0.14, 12));
  // thorax (pronotum on top)
  if (isMantis) {
    add("thorax", ell(0, thoraxC[1] - tLen * 0.12, W * 0.26, tLen * 0.4));
    add("thorax", ell(0, thoraxC[1] + tLen * 0.36, W * 0.5, tLen * 0.18));
  } else add("thorax", ell(thoraxC[0], thoraxC[1], W * (s.wings === "net" ? 0.5 : s.id === "stag-beetle" ? 0.6 : s.wings === "elytra" ? 0.52 : 0.48), tLen * 0.52));
  if (s.id === "ladybird") for (const side of [-1, 1]) add("spot", ell(side * W * 0.34, thoraxC[1] - tLen * 0.08, W * 0.11, tLen * 0.24, 14), true, { colour: "#efece4" });
  // a cicada's pronotum: a pale collar along its back edge; the mesonotum behind it raised in a cross
  if (s.id === "cicada") {
    add("band", [[-W * 0.44, thoraxC[1] - tLen * 0.08], [0, thoraxC[1] - tLen * 0.02], [W * 0.44, thoraxC[1] - tLen * 0.08]], false, { width: tLen * 0.06, colour: s.colours.accent });
    for (const sg of [-1, 1]) add("segment", [[sg * W * 0.12, thoraxC[1] + tLen * 0.18], [-sg * W * 0.12, thoraxC[1] + tLen * 0.4]], false, { width: L * 0.014, colour: "#8a6a48" });
  }
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
  const headW = s.wings === "net" ? W * 0.95 : s.id === "cicada" ? W * 1.05 : s.id === "stag-beetle" ? W * 0.85 : W * (s.id === "ant" || s.id === "honeybee" ? 0.7 : 0.6);
  if (isMantis) {
    // a mantis's head: a triangle, broad at the top with the big compound eyes at its corners, narrowing to the mouth
    const hw = W * 1.15;
    add("head", [[-hw * 0.5, headC[1] - hLen * 0.35], [hw * 0.5, headC[1] - hLen * 0.35], [hw * 0.12, headC[1] + hLen * 0.6], [-hw * 0.12, headC[1] + hLen * 0.6]]);
    for (const side of [-1, 1]) add("eye", ell(side * hw * 0.42, headC[1] - hLen * 0.28, hw * 0.16, hLen * 0.3, 14));
  } else if (s.id === "stag-beetle") add("head", [[-headW * 0.5, headC[1] - hLen * 0.38], [headW * 0.5, headC[1] - hLen * 0.38], [headW * 0.56, headC[1] - hLen * 0.05], [headW * 0.46, headC[1] + hLen * 0.4], [-headW * 0.46, headC[1] + hLen * 0.4], [-headW * 0.56, headC[1] - hLen * 0.05]]);
  else add("head", ell(headC[0], headC[1], headW / 2, hLen * 0.55));
  // (a beetle's eyes are small and sit at the sides of its head; a cicada's at the far corners of its broad head)
  const smallEyes = s.id === "stag-beetle" || s.id === "rhino-beetle" || s.id === "ladybird" || s.id === "cicada";
  const eyeR = s.wings === "net" ? headW * 0.3 : smallEyes ? headW * (s.id === "cicada" ? 0.12 : 0.09) : headW * 0.16;
  if (!isMantis) for (const side of [-1, 1]) add("eye", ell(side * headW * (s.wings === "net" ? 0.22 : smallEyes ? 0.46 : 0.38), headC[1] - hLen * (s.id === "stag-beetle" ? 0.15 : 0.05), eyeR, eyeR * (s.wings === "net" ? 1.1 : 1.2), 14));
  const antL = L * s.antennae;
  if (antL > 0.3) for (const side of [-1, 1]) {
    const elbow = s.id === "ant" || s.id === "honeybee";
    const a0: FPoint = [side * headW * 0.15, headC[1] - hLen * 0.45], a1: FPoint = elbow ? [side * antL * 0.35, a0[1] - antL * 0.25] : [side * antL * 0.25, a0[1] - antL * 0.45], a2: FPoint = elbow ? [side * antL * 0.55, a0[1] - antL * 0.75] : [side * antL * 0.45, a0[1] - antL * 0.95];
    add("antenna", [a0, a1, a2], false, { width: L * (s.wings === "scaled" ? 0.012 : 0.015) });
    if (s.wings === "scaled") add("antenna", ell(a2[0], a2[1], L * 0.025, L * 0.04, 8), true);
  }
  if (s.id === "stag-beetle") {
    const y0 = headC[1] - hLen * 0.36, M = L * 0.32;
    for (const side of [-1, 1]) add("mandible", ([[0.44, 0], [0.56, 0.3], [0.5, 0.65], [0.32, 0.9], [0.12, 1.0], [0.1, 0.94], [0.26, 0.8], [0.34, 0.58], [0.17, 0.48], [0.3, 0.4], [0.24, 0.12], [0.2, 0]] as FPoint[]).map(([x, y]) => [side * headW * x, y0 - M * y] as FPoint), true);
  }
  if (s.id === "rhino-beetle") add("horn", [[-headW * 0.12, headC[1] - hLen * 0.3], [-headW * 0.1, headC[1] - hLen * 1.6], [-headW * 0.3, headC[1] - hLen * 2.1], [-headW * 0.05, headC[1] - hLen * 1.9], [0, headC[1] - hLen * 2.2], [headW * 0.05, headC[1] - hLen * 1.9], [headW * 0.3, headC[1] - hLen * 2.1], [headW * 0.1, headC[1] - hLen * 1.6], [headW * 0.12, headC[1] - hLen * 0.3]], true);
  // the pronotum's short forked horn reaches forward over the head
  if (s.id === "rhino-beetle") add("horn", [[-W * 0.07, thoraxC[1] - tLen * 0.42], [-W * 0.04, headC[1] + hLen * 0.1], [-W * 0.09, headC[1] - hLen * 0.12], [0, headC[1] - hLen * 0.02], [W * 0.09, headC[1] - hLen * 0.12], [W * 0.04, headC[1] + hLen * 0.1], [W * 0.07, thoraxC[1] - tLen * 0.42]], true);
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
