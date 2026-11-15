/**
 * ANAT1 hair: measured hair data and a deterministic strand generator on the body's scalp.
 *
 * `growHair(body, points, params)` plants roots inside an anatomical hairline (trichion from facial norms, temples,
 * above the ears, the nape), orients them from the crown whorl, grows strands under gravity with collision against
 * the head and shoulders, clumps them and adds waves or helical curls by curl type (I straight … VIII tightly coiled).
 * `renderHairSegments` projects strands with the body frame's camera, hides those behind the body and shades them with
 * Marschner-style highlights; any painter can stroke the segments in its own medium.
 *
 * Evidence grades: M measured, B standard/clinical fact, E estimate for drawing.
 */
import type { HumanBody, Vec3 } from "./anatomy-body";
import { humanLandmarks } from "./anatomy-body";
import type { HumanFrame } from "./anatomy-view";
import { projectPoint } from "./anatomy-view";
import type { RGB } from "./anatomy-color";
import { hairAlbedo, hairSigmaA, rgbToHex, shadeHair, toSrgb } from "./anatomy-color";

// ---- Data ------------------------------------------------------------------------------------------------------------------------

export interface HairGroupData { crossSectionUm2: [number, number]; equivalentDiameterUm: number; ellipticity: number; densityPerCm2: [number, number]; growthUmPerDay: [number, number]; shape: string }
/**
 * Scalp hair by broad ancestry group (mean ± SD). Density, cross-section and growth: Leerunyakul & Suchonwanit 2020,
 * Table 1, summarising Loussouarn 2005, Franbourg 2003 and others (grade M, secondary). Ellipticity (major/minor axis):
 * Franbourg 2003 converted to the standard definition (≈1.75 / 1.35 / 1.25, grade M, secondary). Within-group variation
 * is large: these are drawing defaults, never identities.
 */
export const HAIR_GROUPS: Record<"east-asian" | "african" | "european", HairGroupData> = {
  "east-asian": { crossSectionUm2: [4804, 159], equivalentDiameterUm: 78, ellipticity: 1.25, densityPerCm2: [175, 54], growthUmPerDay: [411, 53], shape: "Straightest; round section." },
  "african": { crossSectionUm2: [4274, 215], equivalentDiameterUm: 74, ellipticity: 1.75, densityPerCm2: [161, 50], growthUmPerDay: [280, 50], shape: "Curliest, often spiral; flattened elliptical section; most fragile at the curl turns." },
  "european": { crossSectionUm2: [3857, 132], equivalentDiameterUm: 70, ellipticity: 1.35, densityPerCm2: [226, 73], growthUmPerDay: [367, 56], shape: "Straight to curly; round to oval section." },
};
export const HAIR_FACTS: readonly { fact: string; grade: "M" | "B" }[] = [
  { fact: "A scalp carries on the order of 100,000 hairs; they grow in follicular units of 1–4 hairs.", grade: "B" },
  { fact: "Scalp hair grows roughly 0.3–0.4 mm a day (about 1 cm a month); growth rate differs by group (see HAIR_GROUPS).", grade: "M" },
  { fact: "The parietal whorl is usually clockwise (≈ 84% of single whorls in 519 children, Schmidt et al. 2008) and sits right of the midline in about 56% of people, left 30%, midline 14% (Caucasian sample).", grade: "M" },
  { fact: "Upper eyelashes number about 90–160, lower 75–80; upper lashes are commonly 7–10 mm (rarely beyond 12 mm), lower 5–6 mm.", grade: "B" },
  { fact: "Greying is a mixture: pigmented and unpigmented fibres side by side, not a uniform tint.", grade: "B" },
  { fact: "Male-pattern recession starts at the temples and crown (Hamilton–Norwood); female-pattern thinning widens the central part (Ludwig).", grade: "B" },
];

export interface CurlType { id: number; label: string; amplitude: number; wavelength: number; helix: boolean; shrinkage: number; lift: number; stiffness: number; grade: "E" }
/**
 * Eight curl types after the worldwide shape classification of de la Mettrie et al. (Human Biology 2007; curve diameter,
 * curl index and wave count, I = straight … VIII = tightest). The published per-type values were not accessible; the
 * geometry below (metres) is a drawing estimate that preserves the ordering: waves for II–III, helices of shrinking
 * diameter and pitch for IV–VIII, more shrinkage, lift and stiffness as curl tightens.
 */
export const CURL_TYPES: readonly CurlType[] = [
  { id: 1, label: "I — straight", amplitude: 0, wavelength: 1, helix: false, shrinkage: 0, lift: 10, stiffness: 0.25, grade: "E" },
  { id: 2, label: "II — slightly wavy", amplitude: 0.004, wavelength: 0.09, helix: false, shrinkage: 0.04, lift: 14, stiffness: 0.3, grade: "E" },
  { id: 3, label: "III — wavy", amplitude: 0.007, wavelength: 0.055, helix: false, shrinkage: 0.1, lift: 20, stiffness: 0.35, grade: "E" },
  { id: 4, label: "IV — loose curls", amplitude: 0.011, wavelength: 0.045, helix: true, shrinkage: 0.22, lift: 32, stiffness: 0.45, grade: "E" },
  { id: 5, label: "V — curly", amplitude: 0.008, wavelength: 0.03, helix: true, shrinkage: 0.32, lift: 38, stiffness: 0.55, grade: "E" },
  { id: 6, label: "VI — tight curls", amplitude: 0.006, wavelength: 0.019, helix: true, shrinkage: 0.45, lift: 46, stiffness: 0.65, grade: "E" },
  { id: 7, label: "VII — coils", amplitude: 0.004, wavelength: 0.011, helix: true, shrinkage: 0.58, lift: 55, stiffness: 0.75, grade: "E" },
  { id: 8, label: "VIII — tight coils", amplitude: 0.0028, wavelength: 0.0065, helix: true, shrinkage: 0.68, lift: 62, stiffness: 0.85, grade: "E" },
];

// ---- Generator -------------------------------------------------------------------------------------------------------------------

export interface HairParams {
  /** Strand length in metres before curl shrinkage (0.005 buzz … 0.9 very long). Default 0.12. */
  length?: number;
  /** Curl type 1–8 (CURL_TYPES). Default 1. */
  curl?: number;
  /** Strands to generate (drawing guides, not the real ~100k). Default 1800. */
  strands?: number;
  parting?: "none" | "left" | "right" | "center";
  /** Overall combing direction. "natural" follows the whorl. */
  flow?: "natural" | "down" | "back" | "forward";
  /** 0 full hairline … 1 strongly receded temples and front. */
  recession?: number;
  whorl?: { side?: "right" | "left" | "center"; clockwise?: boolean };
  /** Distance the hair mass stands off the scalp (m). Default grows with curl. */
  volume?: number;
  /** 0 loose … 1 strands gather into locks. Default 0.45. */
  clump?: number;
  /** Stray-hair noise 0–1. Default 0.15. */
  frizz?: number;
  /** Bangs: front strands are cut just above the brows instead of being swept clear of the face. Default false. */
  fringe?: boolean;
  seed?: number;
}

export interface HairStrands {
  /** All strand points × 3 (metres), strand after strand. */
  points: Float32Array;
  /** First point index and point count per strand. */
  starts: Uint32Array; counts: Uint16Array;
  /** Per render point of the body: 1 when it lies on the scalp (for tinting the skin under the hair). */
  scalpMask: Uint8Array;
  /** Per strand: 0–1 random value (painters use it for colour or width jitter). */
  jitter: Float32Array;
  params: Required<Omit<HairParams, "whorl">> & { whorl: { side: "right" | "left" | "center"; clockwise: boolean } };
}

const mulberry = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a: Vec3): Vec3 => sc(a, 1 / (len(a) || 1));
const tangential = (v: Vec3, n: Vec3) => nrm(sub(v, sc(n, dot(v, n))));
const rotAbout = (v: Vec3, axis: Vec3, ang: number): Vec3 => { const c = Math.cos(ang), s = Math.sin(ang); return add(add(sc(v, c), sc(cross(axis, v), s)), sc(axis, dot(axis, v) * (1 - c))); };

/** Head frame from landmarks: origin between the ear openings, axes left / up / forward, and a size factor (1 = 23 cm head). */
export function headFrame(body: HumanBody, pts: ArrayLike<number>) {
  const L = humanLandmarks(body, pts);
  const o = sc(add(L["tragion.L"], L["tragion.R"]), 0.5);
  const up = nrm(sub(L.vertex, o));
  const left = tangential(sub(L["tragion.L"], L["tragion.R"]), up);
  const fwd = cross(left, up);
  const local = (p: Vec3): Vec3 => { const d = sub(p, o); return [dot(d, left), dot(d, up), dot(d, fwd)]; };
  const world = (q: Vec3): Vec3 => add(o, add(add(sc(left, q[0]), sc(up, q[1])), sc(fwd, q[2])));
  const k = (L.vertex[1] - L.menton[1]) / 0.23;
  return { o, up, left, fwd, local, world, k, L };
}

/** Hairline height (local y, metres) as a function of azimuth (0 = front, 180 = back) for a head of size k. */
function hairlineY(az: number, k: number, ySellion: number, recession: number): number {
  const a = Math.abs(az);
  const front = ySellion + (0.056 + 0.03 * recession) * k, temple = front - (0.008 - 0.03 * recession) * k;
  const knots: [number, number][] = [[0, front], [40, temple], [70, 0.045 * k], [98, 0.032 * k], [125, -0.004 * k], [155, -0.04 * k], [180, -0.052 * k]];
  for (let i = 1; i < knots.length; i++) if (a <= knots[i][0]) { const [a0, y0] = knots[i - 1], [a1, y1] = knots[i]; return y0 + ((a - a0) / (a1 - a0)) * (y1 - y0); }
  return knots[knots.length - 1][1];
}

/** Grow hair on a (posed) body. Deterministic for the same body, points and params. */
export function growHair(body: HumanBody, pts: Float32Array = body.points, input: HairParams = {}): HairStrands {
  const ct = CURL_TYPES[Math.min(7, Math.max(0, Math.round(input.curl ?? 1) - 1))];
  const p = {
    length: Math.max(0.004, input.length ?? 0.12), curl: ct.id, strands: Math.max(50, Math.round(input.strands ?? 1800)), parting: input.parting ?? "none",
    flow: input.flow ?? "natural", recession: Math.min(1, Math.max(0, input.recession ?? 0)), volume: input.volume ?? 0.004 + ct.id * 0.0018,
    clump: Math.min(1, Math.max(0, input.clump ?? 0.45)), frizz: Math.min(1, Math.max(0, input.frizz ?? 0.15)), seed: input.seed ?? 1, fringe: input.fringe ?? false,
    whorl: { side: input.whorl?.side ?? "right", clockwise: input.whorl?.clockwise ?? true },
  } as HairStrands["params"];
  const rnd = mulberry(p.seed * 9973 + 17);
  const H = headFrame(body, pts);
  const nb = body.model.header.counts.body, F = body.faces, nf = body.model.header.counts.bodyFaces;
  const P = (i: number): Vec3 => [pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]];
  const ySe = H.local(H.L.sellion)[1];
  // vertex normals (for collision and root orientation)
  const vn = new Float32Array(nb * 3);
  for (let f = 0; f < nf; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    const n = cross(sub(P(b), P(a)), sub(P(c), P(a)));
    for (const v of [a, b, c]) if (v < nb) { vn[v * 3] += n[0]; vn[v * 3 + 1] += n[1]; vn[v * 3 + 2] += n[2]; }
  }
  const N = (i: number): Vec3 => nrm([vn[i * 3], vn[i * 3 + 1], vn[i * 3 + 2]]);
  // scalp mask: above the hairline, excluding the ears (they stick out beyond the skull's width)
  const loc = Array.from({ length: nb }, (_, i) => H.local(P(i)));
  let skullHalf = 0;
  for (const q of loc) if (q[1] > 0.05 * H.k && q[1] < 0.09 * H.k) skullHalf = Math.max(skullHalf, Math.abs(q[0]));
  const scalpMask = new Uint8Array(body.renderCount);
  for (let i = 0; i < nb; i++) {
    const q = loc[i], az = (Math.atan2(q[0], q[2]) * 180) / Math.PI;
    if (q[1] < hairlineY(az, H.k, ySe, p.recession)) continue;
    if (q[1] < 0.06 * H.k && Math.abs(q[0]) > skullHalf + 0.004 * H.k) continue;
    if (Math.hypot(q[0], q[1], q[2]) > 0.2 * H.k) continue;
    scalpMask[i] = 1;
  }
  // scalp triangles and areas
  const tris: number[] = [], cum: number[] = [];
  let total = 0;
  for (let f = 0; f < nf; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    if (!(scalpMask[a] && scalpMask[b] && scalpMask[c])) continue;
    total += len(cross(sub(P(b), P(a)), sub(P(c), P(a)))) / 2; tris.push(f); cum.push(total);
  }
  // whorl on the crown: tilted back from the vertex, offset to one side
  const side = p.whorl.side === "right" ? -1 : p.whorl.side === "left" ? 1 : 0;
  const crownDir = nrm(add(add(sc(H.up, Math.cos(0.62)), sc(H.fwd, -Math.sin(0.62))), sc(H.left, 0.12 * side)));
  let whorl = H.L.vertex, best = -Infinity;
  for (let i = 0; i < nb; i++) if (scalpMask[i]) { const d = dot(nrm(sub(P(i), H.o)), crownDir); if (d > best) { best = d; whorl = P(i); } }
  const spin = (p.whorl.clockwise ? -1 : 1) * 0.6;
  const partX = p.parting === "left" ? 0.028 * H.k : p.parting === "right" ? -0.028 * H.k : 0;
  // spatial hash of body points for collision
  const cell = 0.03, hash = new Map<string, number[]>();
  const keyOf = (q: Vec3) => `${Math.floor(q[0] / cell)},${Math.floor(q[1] / cell)},${Math.floor(q[2] / cell)}`;
  for (let i = 0; i < nb; i++) { const k = keyOf(P(i)); (hash.get(k) ?? hash.set(k, []).get(k)!).push(i); }
  const nearest = (q: Vec3) => {
    let bi = -1, bd = Infinity;
    const cx = Math.floor(q[0] / cell), cy = Math.floor(q[1] / cell), cz = Math.floor(q[2] / cell);
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (const i of hash.get(`${cx + x},${cy + y},${cz + z}`) ?? []) {
      const d = (pts[i * 3] - q[0]) ** 2 + (pts[i * 3 + 1] - q[1]) ** 2 + (pts[i * 3 + 2] - q[2]) ** 2; if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };
  const effLen = p.length * (1 - ct.shrinkage);
  const segs = Math.min(64, Math.max(4, Math.ceil(effLen / 0.007) + (ct.helix ? Math.ceil(p.length / ct.wavelength) * 3 : 0)));
  const step = effLen / segs;
  const gravity: Vec3 = [0, -1, 0];
  // roots
  const roots: { pos: Vec3; n: Vec3; dir: Vec3; off: number; front: boolean; side: number }[] = [];
  // face window in head coordinates: between the outer eye corners widened to the cheeks, brow to chin
  const yBrow = H.local(H.L.glabella)[1], yChin = H.local(H.L.menton)[1];
  const faceHalf = Math.abs(H.local(H.L["zygion.L"])[0] - H.local(H.L["zygion.R"])[0]) / 2 * 0.92;
  const faceZ = H.local(H.L["zygion.L"])[2] + 0.004;
  for (let s = 0; s < p.strands && total > 0; s++) {
    const r = rnd() * total;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
    const f = tris[lo], a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const pos = add(add(sc(P(a), 1 - u - v), sc(P(b), u)), sc(P(c), v));
    const n = nrm(add(add(sc(N(a), 1 - u - v), sc(N(b), u)), sc(N(c), v)));
    const q = H.local(pos);
    // natural direction: away from the whorl, spiralling; the front fringe falls forward
    let dir = tangential(sub(pos, whorl), n);
    if (len(sub(pos, whorl)) < 1e-4) dir = tangential(sc(H.fwd, -1), n);
    dir = tangential(rotAbout(dir, n, spin * Math.max(0, 1 - len(sub(pos, whorl)) / (0.09 * H.k))), n);
    const frontness = Math.max(0, Math.min(1, (q[2] / (0.07 * H.k))));
    dir = tangential(add(sc(dir, 1 - frontness * 0.25), sc(tangential(H.fwd, n), frontness * 0.25)), n);
    if (p.flow === "down") dir = tangential(add(dir, sc(tangential(gravity, n), 1.4)), n);
    if (p.flow === "back") dir = tangential(add(sc(dir, 0.4), sc(tangential(sc(H.fwd, -1), n), 1.6)), n);
    if (p.flow === "forward") dir = tangential(add(sc(dir, 0.4), sc(tangential(H.fwd, n), 1.6)), n);
    // front hair sweeps toward its own side before it reaches the face (unless a fringe is wanted)
    if (!p.fringe && frontness > 0 && Math.abs(q[0]) < faceHalf) dir = tangential(add(dir, sc(tangential(add(sc(H.left, q[0] >= partX ? 1 : -1), sc(H.up, -0.55)), n), 1.4 * frontness)), n);
    if (p.parting !== "none" && q[2] > -0.05 * H.k && q[1] > 0.04 * H.k) {
      const away = tangential(sc(H.left, q[0] >= partX ? 1 : -1), n);
      const w = (Math.exp(-Math.abs(q[0] - partX) / (0.04 * H.k)) * 1.6 + frontness * 0.8);
      dir = tangential(add(dir, sc(away, w)), n);
    }
    roots.push({ pos, n, dir, off: 0.35 + 0.65 * rnd(), front: q[2] > 0.03 * H.k, side: q[0] >= partX ? 1 : -1 });
  }
  // centrelines
  const lines: Vec3[][] = roots.map(rt => {
    const lift = (ct.lift * Math.PI) / 180;
    let d = nrm(add(sc(rt.dir, Math.cos(lift)), sc(rt.n, Math.sin(lift))));
    let x = add(rt.pos, sc(rt.n, 0.0008));
    const out: Vec3[] = [x];
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const g = (1 - ct.stiffness) * (Math.pow(t, 0.6) * 0.42 + 0.08) + 0.03;
      d = nrm(add(d, sc(gravity, g)));
      let nx = add(x, sc(d, step));
      // collision: stay `volume` outside the nearest body surface, more for outer layers
      const bi = nearest(nx);
      if (bi >= 0) {
        const bp = P(bi), bn = N(bi), off = p.volume * rt.off + 0.0015;
        const h = dot(sub(nx, bp), bn);
        if (len(sub(nx, bp)) < 0.06) {
          if (h < off) nx = add(nx, sc(bn, off - h));
          // close to the skull the hair lies along it instead of standing up
          if (h < off + 0.012 && dot(nrm(sub(nx, x)), bn) > 0) nx = add(x, sc(nrm(add(sc(tangential(sub(nx, x), bn), 0.8), sc(nrm(sub(nx, x)), 0.2))), step));
        }
      }
      // keep the face clear: strands that reach the front of the face below the hairline slide to the sides
      const ql = H.local(nx);
      if (ql[2] > faceZ && ql[1] < yBrow + 0.02 * H.k && ql[1] > yChin - 0.06 * H.k) {
        if (p.fringe && rt.front) break;
        const side = Math.sign(ql[0] || rt.side), edge = faceHalf + (ql[2] - faceZ) * 0.6;
        // a gentle sideways slide (at most ~1.2 steps per segment) keeps strands continuous
        if (Math.abs(ql[0]) < edge) {
          nx = H.world([ql[0] + side * Math.min(edge - Math.abs(ql[0]), step * 1.2), ql[1], ql[2]]);
          // and turn it to fall down the side of the face instead of shooting out sideways
          d = nrm(add(sc(d, 0.4), sc(nrm(add(add(sc(H.left, side * 0.45), sc(H.up, -1)), sc(H.fwd, -0.3))), 0.6)));
          nx = add(x, sc(nrm(add(sc(nrm(sub(nx, x)), 0.5), sc(d, 0.5))), step));
        }
      }
      d = nrm(sub(nx, x)); x = nx; out.push(x);
    }
    while (out.length < segs + 1) out.push(out[out.length - 1]);
    return out;
  });
  // clumping: blend each strand toward a nearby clump leader, increasingly toward the tip
  const leaders: number[] = [];
  const every = Math.max(4, Math.round(10 + 30 * (1 - p.clump)));
  for (let i = 0; i < lines.length; i += every) leaders.push(i);
  const leaderOf = roots.map(rt => { let bi = 0, bd = Infinity; for (const l of leaders) { const d = len(sub(roots[l].pos, rt.pos)); if (d < bd) { bd = d; bi = l; } } return bi; });
  const clumped = lines.map((ln, s) => {
    const L0 = lines[leaderOf[s]];
    return ln.map((q, i) => { const t = i / segs, w = p.clump * Math.pow(t, 1.4) * 0.85; const target = add(L0[i], sub(roots[s].pos, roots[leaderOf[s]].pos)); return add(sc(q, 1 - w), sc(add(sc(target, 0.6), sc(L0[i], 0.4)), w)); });
  });
  // curl: offsets in a parallel-transported frame; locks share a phase
  const phase = roots.map((_, s) => (leaderOf[s] * 2.399963) % (Math.PI * 2) + (rnd() - 0.5) * 0.6);
  const strands = clumped.map((ln, s) => {
    if (ct.amplitude === 0 && p.frizz === 0) return ln;
    let ref = roots[s].n;
    let arc = 0;
    return ln.map((q, i) => {
      if (i === 0) return q;
      const tgt = nrm(sub(q, ln[i - 1]));
      ref = tangential(ref, tgt);
      const bin = cross(tgt, ref);
      arc += step;
      const ramp = Math.min(1, arc / 0.015);
      const th = (2 * Math.PI * arc) / ct.wavelength + phase[s];
      let o: Vec3 = ct.helix ? add(sc(ref, Math.cos(th) * ct.amplitude), sc(bin, Math.sin(th) * ct.amplitude)) : sc(bin, Math.sin(th) * ct.amplitude);
      o = sc(o, ramp);
      const fz = p.frizz * 0.0025 * (i / segs);
      return add(add(q, o), [(rnd() - 0.5) * fz, (rnd() - 0.5) * fz, (rnd() - 0.5) * fz]);
    });
  });
  const counts = new Uint16Array(strands.length), starts = new Uint32Array(strands.length);
  let n = 0; strands.forEach((s, i) => { starts[i] = n; counts[i] = s.length; n += s.length; });
  const out = new Float32Array(n * 3);
  strands.forEach((s, i) => s.forEach((q, j) => out.set(q, (starts[i] + j) * 3)));
  const jitter = new Float32Array(strands.length).map(() => rnd());
  return { points: out, starts, counts, scalpMask, jitter, params: p };
}

// ---- Rendering --------------------------------------------------------------------------------------------------------------------

export interface HairSegment { x1: number; y1: number; x2: number; y2: number; depth: number; color: string; width: number; strand: number; t: number }
export interface HairRenderOptions {
  eumelanin?: number; pheomelanin?: number;
  /** Fraction of unpigmented (grey/white) strands. */
  grey?: number;
  light?: Vec3;
  /** Depth buffer from `rasterizeHumanFrame` (same frame and scale) to hide strands behind the body. */
  depth?: { data: Float32Array; width: number; height: number; scale: number };
  /** Base stroke width in pixels at the root (tapers to 45% at the tip). */
  width?: number;
}
/** Project and shade hair strands for a painter: segments sorted far → near, already depth-culled. */
export function renderHairSegments(hair: HairStrands, frame: HumanFrame, o: HairRenderOptions = {}): HairSegment[] {
  const L = nrm(o.light ?? [-0.62, 0.58, 0.52]);
  const back = frame.projection.back;
  const albedo = hairAlbedo(hairSigmaA(o.eumelanin ?? 1.3, o.pheomelanin ?? 0)), white = hairAlbedo(hairSigmaA(0.02, 0.01));
  const tol = 0.012, segs: HairSegment[] = [];
  const w0 = o.width ?? Math.max(0.5, frame.pixelsPerMetre / 900);
  for (let s = 0; s < hair.starts.length; s++) {
    const st = hair.starts[s], c = hair.counts[s];
    const isGrey = (o.grey ?? 0) > 0 && hair.jitter[s] < (o.grey ?? 0);
    const base = isGrey ? white : albedo.map(v => v * (0.82 + 0.36 * hair.jitter[s])) as RGB;
    let prev = projectPoint(frame, [hair.points[st * 3], hair.points[st * 3 + 1], hair.points[st * 3 + 2]]);
    for (let j = 1; j < c; j++) {
      const i = st + j;
      const a: Vec3 = [hair.points[(i - 1) * 3], hair.points[(i - 1) * 3 + 1], hair.points[(i - 1) * 3 + 2]];
      const b: Vec3 = [hair.points[i * 3], hair.points[i * 3 + 1], hair.points[i * 3 + 2]];
      const cur = projectPoint(frame, b);
      const t = j / (c - 1);
      const mx = (prev[0] + cur[0]) / 2, my = (prev[1] + cur[1]) / 2, mz = (prev[2] + cur[2]) / 2;
      let hidden = false;
      if (o.depth) {
        const gx = Math.floor(mx * o.depth.scale), gy = Math.floor(my * o.depth.scale);
        if (gx >= 0 && gy >= 0 && gx < o.depth.width && gy < o.depth.height) { const z = o.depth.data[gy * o.depth.width + gx]; if (z !== -Infinity && mz < z - tol) hidden = true; }
      }
      if (!hidden) {
        const tg = nrm(sub(b, a));
        const lin = shadeHair(tg, L, back, base, 1);
        segs.push({ x1: prev[0], y1: prev[1], x2: cur[0], y2: cur[1], depth: mz, color: rgbToHex(toSrgb(lin.map(v => Math.min(1, v)) as RGB)), width: w0 * (1 - 0.55 * t), strand: s, t });
      }
      prev = cur;
    }
  }
  return segs.sort((p, q) => p.depth - q.depth);
}

// ---- Facial hair: brows and lashes on the face study -----------------------------------------------------------------------------

export interface FaceHairStroke { points: Vec3[]; kind: "brow" | "lash-upper" | "lash-lower"; side: "L" | "R" }
/**
 * Eyebrow and eyelash strokes (mm, face-study coordinates) along the face's brow and lid loops. Brow hairs point up at
 * the inner head, lateral-up through the body and lateral-down in the tail; lashes leave the lid edge forward, curve
 * up (upper) or down (lower), longest in the middle third and fanning outward at the outer corner. Grade E (drawing
 * conventions) with counts and lengths from HAIR_FACTS.
 */
export function faceHair(vertices: readonly Vec3[], loops: Record<string, { loop: number[] }>, opts: { browDensity?: number; lashes?: number; seed?: number } = {}): FaceHairStroke[] {
  const rnd = mulberry((opts.seed ?? 3) * 7919);
  const out: FaceHairStroke[] = [];
  const along = (loop: number[], t: number): { p: Vec3; tan: Vec3 } => {
    const n = loop.length - 1, x = t * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
    const a = vertices[loop[i]], b = vertices[loop[i + 1]];
    return { p: add(sc(a, 1 - f), sc(b, f)), tan: nrm(sub(b, a)) };
  };
  for (const side of ["L", "R"] as const) {
    const lat = side === "L" ? 1 : -1;
    // brows: loop runs outer → inner in FACE_FEATURES; walk inner (t=1) → outer (t=0)
    const brow = loops[`brow.${side}`].loop, count = Math.round(70 * (opts.browDensity ?? 1));
    for (let k = 0; k < count; k++) {
      const u = rnd(), t = 1 - u; // u: 0 inner … 1 outer
      const { p } = along(brow, t);
      const band = (rnd() - 0.5) * (5 - 3 * u);
      const root: Vec3 = [p[0], p[1] + band - 1.5, p[2] + 0.6];
      const angle = u < 0.25 ? 75 - u * 120 : u < 0.7 ? 30 - (u - 0.25) * 30 : 15 - (u - 0.7) * 110;
      const a = (angle * Math.PI) / 180, l = 6 + 4 * (1 - Math.abs(u - 0.4)) + rnd() * 2;
      const dir: Vec3 = [Math.cos(a) * lat, Math.sin(a), 0.25];
      const mid = add(root, sc(dir, l * 0.55)), tip = add(add(root, sc(dir, l)), [0, -0.8, 0.4]);
      out.push({ points: [root, mid, tip], kind: "brow", side });
    }
    for (const [kind, loopId, n, maxLen, up] of [["lash-upper", `eye-upper.${side}`, opts.lashes ?? 45, 8.5, 1], ["lash-lower", `eye-lower.${side}`, Math.round((opts.lashes ?? 45) * 0.35), 5, -1]] as const) {
      const loop = loops[loopId].loop; // outer (t=0) → inner (t=1)
      for (let k = 0; k < n; k++) {
        const t = (k + rnd() * 0.6) / n, outer = 1 - t;
        const { p } = along(loop, t);
        const lenMm = maxLen * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, outer * 1.15))) * (0.85 + rnd() * 0.3);
        const fan = (outer - 0.45) * 1.3 * lat + (rnd() - 0.5) * 0.25;
        const d0 = nrm([fan, 0.25 * up, 1]);
        const r0: Vec3 = add(p, [0, 0, 0.4]);
        const m: Vec3 = add(r0, add(sc(d0, lenMm * 0.5), [0, 0.6 * up, 0]));
        const tip: Vec3 = add(r0, add(sc(d0, lenMm * 0.85), [fan * lenMm * 0.25, lenMm * 0.32 * up, 0]));
        out.push({ points: [r0, m, tip], kind, side });
      }
    }
  }
  return out;
}
