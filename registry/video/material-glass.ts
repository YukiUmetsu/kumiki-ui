/**
 * Glass transitions (registry item `material-transitions`).
 *
 * - **refract**: a sheet of reeded glass passes close to the lens. Each flute is a cylindrical lens: Snell's law at its
 *   curved face bends the view, so every flute shows a magnified strip of what lies behind, stretched toward its edges.
 *   The cut between the scenes lies behind the glass, at the sheet's centre, so the flutes break it into strips as the
 *   sheet slides by. The flutes move with the sheet; at speed they smear (a 180° shutter), and they sharpen where the
 *   sheet slows over the middle of the frame. Fresnel loss darkens the steep sides of each flute; its crest catches light.
 * - **shatter**: a pane breaks from a point. Radial cracks run out from the impact to the frame's edges and concentric
 *   cracks link them, the pattern of a struck plate (Vandenberghe, Vermorel & Villermaux 2013); more cracks start partway
 *   out and fork. The impact point is crushed white. The shards hold for a moment, slipping a little, then fall under
 *   gravity, the loosened ones near the impact first, tumbling and drifting back from the lens, their faces glinting as
 *   they turn. Each shard carries its piece of the outgoing scene; the incoming scene is behind the glass.
 */
import { clamp01, clipToFrame, eachCellInRing, hash, ringArea, smooth } from "./material-kit";
import type { MaterialFrame, MaterialLayer, MaterialVector } from "./material-kit";

export type GlassKind = "refract" | "shatter";
export type MaterialDirection = "left" | "right" | "up" | "down";

interface Shard {
  /** Rest outline, frame heights, counter-clockwise. */
  ring: number[];
  cx: number;
  cy: number;
  size: number;
  /** Seconds after the impact when the shard comes loose. */
  release: number;
  vx: number;
  vy: number;
  /** Speed away from the lens, frame heights per second. */
  vz: number;
  spin: number;
  tumble: number;
  axis: number;
  slipX: number;
  slipY: number;
  /** The crushed zone at the impact. */
  crushed: boolean;
}

export interface GlassPlan {
  material: GlassKind;
  cols: number;
  rows: number;
  aspect: number;
  seed: number;
  /** The transition's length, seconds: shards fall at the real rate of gravity. */
  seconds: number;
  direction: MaterialDirection;
  color: string;
  /** shatter: the impact, frame heights. */
  origin: { x: number; y: number };
  shards: Shard[];
  /** shatter: crack lines for drawing, polylines with the distance from the impact at each point. */
  cracks: { pts: number[]; rho: number[] }[];
  /** shatter: short cracks around the impact. */
  starburst: number[][];
}

export const GLASS_FRAMES: Readonly<Record<GlassKind, number>> = { refract: 34, shatter: 44 };
const DEFAULT_COLOR: Record<GlassKind, string> = { refract: "#eef4f1", shatter: "#ffffff" };

/** Soda-lime glass. */
const N_GLASS = 1.52;
/** Gravity for a pane about 1.35 m tall in frame: 9.81 / 1.35 frame heights per second². */
const GRAVITY = 7.3;
/** The camera's distance from the pane, frame heights: sets how fast a receding shard shrinks. */
const CAMERA = 1.8;
/** How long the cracks take to cross the pane (truly under a millisecond; two frames so the eye can see them run). */
const CRACK_SECONDS = 0.07;

/* ------------------------------------------------------------------ *
 * Plans
 * ------------------------------------------------------------------ */

export function planGlass(material: GlassKind, opts: { cols: number; rows: number; aspect: number; seed: number; seconds: number; direction?: MaterialDirection; color?: string; origin?: { x: number; y: number } }): GlassPlan {
  const { cols, rows, aspect, seed, seconds } = opts;
  const origin = { x: (opts.origin?.x ?? 0.5) * aspect, y: opts.origin?.y ?? 0.45 };
  const base = { material, cols, rows, aspect, seed, seconds, direction: opts.direction ?? "right", color: opts.color ?? DEFAULT_COLOR[material], origin, shards: [], cracks: [], starburst: [] };
  if (material === "refract") return base;
  return { ...base, ...breakPane(origin, aspect, seed, seconds) };
}

/** A struck pane: radial cracks, concentric cracks between them, secondary radials that start partway out, and shards. */
function breakPane(origin: { x: number; y: number }, aspect: number, seed: number, seconds: number) {
  const reach = Math.max(...[[0, 0], [aspect, 0], [0, 1], [aspect, 1]].map(([x, y]) => Math.hypot(x - origin.x, y - origin.y))) + 0.06;
  // The radii of the concentric cracks, about 1.85× apart (fine near the impact, wide outside), the last beyond the frame
  // so every shard closes.
  const ringR: number[] = [];
  for (let r = 0.055; ; r *= 1.85) { ringR.push(r); if (r > reach) break; }
  const K = ringR.length;
  const KNOT = 0.035, knots = Math.ceil(reach / KNOT) + 2;
  // Radial cracks: angles θ(ρ) at knots every KNOT, wandering a little, with the odd kink.
  const N = 10 + Math.floor(hash(1, 1, seed) * 4), theta0 = hash(2, 1, seed) * Math.PI * 2;
  type Crack = { start: number; rho0: number; theta: Float64Array };
  const cracks: Crack[] = [];
  const angles = Array.from({ length: N }, (_, i) => theta0 + ((i + 0.38 * (hash(i, 3, seed) - 0.5)) * Math.PI * 2) / N);
  for (let i = 0; i < N; i++) {
    const gap = (Math.PI * 2) / N, theta = new Float64Array(knots);
    let w = 0, drift = 0;
    for (let m = 0; m < knots; m++) {
      drift += 0.022 * (hash(i, m, seed + 7) - 0.5);
      w += drift + (hash(i, m, seed + 8) < 0.08 ? 0.09 * (hash(i, m, seed + 9) - 0.5) : 0);
      w = Math.max(-0.28 * gap, Math.min(0.28 * gap, w));
      theta[m] = angles[i] + w;
    }
    cracks.push({ start: -1, rho0: 0, theta });
  }
  const thetaAt = (c: Crack, rho: number) => {
    const f = Math.max(0, rho) / KNOT, m = Math.min(knots - 2, Math.floor(f)), t = Math.min(1, f - m);
    return c.theta[m] * (1 - t) + c.theta[m + 1] * t;
  };
  const point = (c: Crack, rho: number): [number, number] => { const a = thetaAt(c, rho); return [origin.x + rho * Math.cos(a), origin.y + rho * Math.sin(a)]; };
  /** Points along a crack from radius r0 to r1 (either way), endpoints included. */
  const along = (c: Crack, r0: number, r1: number): number[] => {
    const out: number[] = [...point(c, r0)];
    const lo = Math.min(r0, r1), hi = Math.max(r0, r1), inner: number[] = [];
    for (let m = Math.ceil(lo / KNOT + 1e-6); m * KNOT < hi - 1e-6; m++) inner.push(m * KNOT);
    if (r1 < r0) inner.reverse();
    for (const r of inner) out.push(...point(c, r));
    out.push(...point(c, r1));
    return out;
  };
  /** Unwrapped angle of a crack in a band, relative to the first crack, for ordering. */
  const order = (c: Crack, rho: number) => { let a = thetaAt(c, rho) - theta0; a -= Math.floor(a / (Math.PI * 2)) * Math.PI * 2; return a; };
  // Ring segments: for ring k and a sector (a, b) of the band inside it, the segment's radius and its polyline a → b.
  const radius = (k: number, a: number, b: number) => ringR[k] * (k === 0 ? 1 + 0.25 * (hash(a, b, seed + 31) - 0.5) : 1 + 0.2 * (hash(k * 97 + a, b, seed + 11) - 0.5));
  const segment = (k: number, a: number, b: number): number[] => {
    const r = radius(k, a, b), ca = cracks[a], cb = cracks[b];
    const ta = thetaAt(ca, r);
    let tb = thetaAt(cb, r);
    while (tb <= ta) tb += Math.PI * 2;
    const out: number[] = [];
    for (let s = 0; s <= 4; s++) {
      const t = s / 4, wobble = s === 0 || s === 4 ? 0 : 0.035 * (hash(k * 131 + a, b * 7 + s, seed + 13) - 0.5);
      // Concentric cracks are chords that sag a little toward the impact, not perfect circles.
      const rr = r * (1 + wobble - (s === 0 || s === 4 ? 0 : 0.03 * Math.sin(Math.PI * t)));
      const ang = ta + (tb - ta) * t;
      if (s === 0) out.push(...point(ca, r)); else if (s === 4) out.push(...point(cb, r)); else out.push(origin.x + rr * Math.cos(ang), origin.y + rr * Math.sin(ang));
    }
    return out;
  };
  const present = (k: number, a: number, b: number) => k === 0 || k === K - 1 || hash(k * 53 + a, b, seed + 17) > 0.3;
  // Walk outward band by band. Open cells carry their inner boundary until a present ring segment closes them.
  type Open = { a: number; b: number; inner: number[]; ra: number; rb: number };
  let sectors: [number, number][] = Array.from({ length: N }, (_, i) => [i, (i + 1) % N]);
  let open: Open[] = sectors.map(([a, b]) => ({ a, b, inner: [origin.x, origin.y], ra: 0, rb: 0 }));
  const rings: { ring: number[]; band: number }[] = [];
  const ringLines: number[][] = [];
  for (let k = 0; k < K; k++) {
    const nextOpen: Open[] = [], nextSectors: [number, number][] = [];
    for (const cell of open) {
      const { a, b } = cell;
      // A secondary radial starts in this sector at this ring, from a vertex of the segment (a fork when it is near a crack).
      const spawn = k >= 2 && k <= 4 && k < K - 1 && ringR[k] < reach * 0.7 && hash(k * 71 + a, b, seed + 19) < 0.2;
      if (!present(k, a, b) && !spawn) { nextOpen.push(cell); nextSectors.push([a, b]); continue; }
      const seg = segment(k, a, b), r = radius(k, a, b);
      ringLines.push(seg);
      const ring = [...cell.inner, ...along(cracks[b], cell.rb, r).slice(2), ...seg.slice(0, -2).reverse().reduce<number[]>((acc, _, i, arr) => (i % 2 ? acc : (acc.push(arr[i + 1], arr[i]), acc)), []), ...along(cracks[a], r, cell.ra).slice(2, -2)];
      rings.push({ ring, band: k === 0 ? -1 : k - 1 });
      if (k === K - 1) continue;
      if (spawn) {
        const v = 1 + Math.floor(hash(k, a * 13 + b, seed + 23) * 3);
        const sx = seg[2 * v], sy = seg[2 * v + 1], rho0 = Math.hypot(sx - origin.x, sy - origin.y);
        const gap = order(cracks[b], rho0) - order(cracks[a], rho0), start = Math.atan2(sy - origin.y, sx - origin.x);
        const theta = new Float64Array(knots), bend = (hash(k, a, seed + 29) - 0.5) * 0.5 * gap;
        let w = 0;
        for (let m = 0; m < knots; m++) {
          const rho = m * KNOT, out = Math.max(0, rho - rho0);
          w += 0.02 * (hash(m, a * 17 + k, seed + 37) - 0.5);
          // Stay inside the sector: keep clear of the cracks on either side.
          const mid = (order(cracks[a], Math.max(rho, rho0)) + order(cracks[b], Math.max(rho, rho0))) / 2;
          const own = start - theta0 - Math.floor((start - theta0) / (Math.PI * 2)) * Math.PI * 2;
          const target = own + bend * smooth(0, 0.35, out) + w, half = 0.38 * (order(cracks[b], Math.max(rho, rho0)) - order(cracks[a], Math.max(rho, rho0)));
          theta[m] = theta0 + Math.max(mid - half, Math.min(mid + half, target));
        }
        cracks.push({ start: k, rho0, theta });
        const s = cracks.length - 1;
        nextOpen.push({ a, b: s, inner: seg.slice(0, 2 * v + 2), ra: r, rb: rho0 }, { a: s, b, inner: seg.slice(2 * v), ra: rho0, rb: r });
        nextSectors.push([a, s], [s, b]);
      } else {
        nextOpen.push({ a, b, inner: seg, ra: r, rb: r });
        nextSectors.push([a, b]);
      }
    }
    open = nextOpen;
    sectors = nextSectors;
  }
  // Shards and their motion. The picture is on the pane only inside the frame, so shards are cut to it.
  const shards: Shard[] = rings.map(({ ring, band }) => ({ ring: clipToFrame(ring, aspect), band })).filter(({ ring }) => ring.length >= 6 && Math.abs(ringArea(ring)) > 1e-6).map(({ ring, band }, idx) => {
    if (ringArea(ring) < 0) {
      const flipped: number[] = [];
      for (let i = ring.length - 2; i >= 0; i -= 2) flipped.push(ring[i], ring[i + 1]);
      ring = flipped;
    }
    let ax = 0, ay = 0, aa = 0;
    for (let i = 0, n = ring.length; i < n; i += 2) {
      const j = (i + 2) % n, cr = ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
      ax += (ring[i] + ring[j]) * cr; ay += (ring[i + 1] + ring[j + 1]) * cr; aa += cr;
    }
    const cx = ax / (3 * aa), cy = ay / (3 * aa), size = Math.sqrt(Math.abs(aa) / 2);
    const rho = Math.min(1, Math.hypot(cx - origin.x, cy - origin.y) / reach), crushed = band < 0;
    const h = (s: number) => hash(idx, s, seed + 41);
    const out = Math.atan2(cy - origin.y, cx - origin.x), vr = crushed ? 0.5 + 0.4 * h(1) : 0.1 * (1 - rho) ** 1.5 + 0.03 * h(1);
    // The loosened glass near the impact goes first; the rest follows outward, the supported bottom of the pane last.
    const release = crushed ? 0.07 + 0.03 * h(2) : 0.16 + Math.max(0.2, seconds - 0.8) * rho ** 0.8 + 0.07 * (h(2) - 0.5) + 0.06 * clamp01(cy - 0.6);
    const shard: Shard = {
      ring, cx, cy, size, release, crushed,
      vx: vr * Math.cos(out) + 0.04 * (h(3) - 0.5), vy: vr * Math.sin(out) - 0.05 * h(4),
      vz: crushed ? 1.2 : 0.2 + 0.35 * (1 - rho) * h(5),
      // Small pieces spin faster; big plates mostly drop edge-down and tip.
      spin: (h(6) - 0.5) * 2 * (0.35 / (size * 4 + 0.35)),
      tumble: (h(7) < 0.5 ? -1 : 1) * (0.5 + 1.3 * h(8)) * (crushed ? 3 : 1),
      axis: h(9) * Math.PI,
      slipX: 0.0028 * (h(10) - 0.5), slipY: 0.0015 + 0.0025 * h(11),
    };
    // Every shard must have left the frame by the last frame: come loose early enough to fall clear.
    if (!gone(shard, seconds * 0.985, aspect)) {
      let lo = 0.06, hi = shard.release;
      for (let it = 0; it < 24; it++) { const mid = (lo + hi) / 2; shard.release = mid; if (gone(shard, seconds * 0.985, aspect)) lo = mid; else hi = mid; }
      shard.release = lo;
    }
    return shard;
  });
  // Lines to draw while the cracks run: radials with their distance from the impact at each point, then the rings.
  const lines = cracks.map((c) => {
    const r0 = c.start < 0 ? 0 : c.rho0, pts = along(c, r0, reach), rho: number[] = [];
    for (let i = 0; i < pts.length; i += 2) rho.push(Math.hypot(pts[i] - origin.x, pts[i + 1] - origin.y));
    return { pts, rho };
  });
  for (const seg of ringLines) {
    const rho: number[] = [];
    for (let i = 0; i < seg.length; i += 2) rho.push(Math.hypot(seg[i] - origin.x, seg[i + 1] - origin.y));
    // A concentric crack forms once the radials have passed it.
    const r = Math.max(...rho);
    lines.push({ pts: seg, rho: rho.map(() => r * 1.15) });
  }
  // A starburst of short cracks in the crushed glass at the impact.
  const starburst = Array.from({ length: 26 }, (_, i) => {
    const a = hash(i, 51, seed) * Math.PI * 2, len = 0.012 + 0.05 * hash(i, 52, seed) ** 2, mid = 0.4 + 0.3 * hash(i, 53, seed);
    const bend = (hash(i, 54, seed) - 0.5) * 0.4;
    return [origin.x, origin.y, origin.x + len * mid * Math.cos(a), origin.y + len * mid * Math.sin(a), origin.x + len * Math.cos(a + bend), origin.y + len * Math.sin(a + bend)];
  });
  return { shards, cracks: lines, starburst };
}

/** A shard's affine map from rest to the frame at time t (seconds), and its tilt. */
function pose(s: Shard, t: number, aspect: number) {
  const tau = Math.max(0, t - s.release);
  const slip = smooth(CRACK_SECONDS, CRACK_SECONDS + 0.2, t);
  const wx = s.cx + s.slipX * slip + s.vx * tau, wy = s.cy + s.slipY * slip + s.vy * tau + 0.5 * GRAVITY * tau * tau;
  const k = 1 / (1 + (s.vz * tau) / CAMERA);
  const psi = s.spin * tau + 0.004 * slip * Math.sign(s.slipX), phi = s.tumble * tau;
  // Tumbling about an axis in the pane's plane foreshortens the shard across that axis.
  const ca = Math.cos(s.axis), sa = Math.sin(s.axis), cphi = Math.cos(phi), fold = Math.sign(cphi || 1) * Math.max(0.07, Math.abs(cphi));
  const bx = -sa, by = ca, f = 1 - fold;
  const F = [1 - f * bx * bx, -f * bx * by, -f * bx * by, 1 - f * by * by];
  const cp = Math.cos(psi), sp = Math.sin(psi);
  // M = k · R(ψ) · F, column-major [a b c d].
  const a = k * (cp * F[0] - sp * F[1]), b = k * (sp * F[0] + cp * F[1]), c = k * (cp * F[2] - sp * F[3]), d = k * (sp * F[2] + cp * F[3]);
  const C = { x: aspect / 2, y: 0.5 };
  const ox = C.x + k * (wx - C.x), oy = C.y + k * (wy - C.y);
  // Surface normal after the tumble and the spin, for glints.
  const nx0 = Math.sin(phi) * sa, ny0 = -Math.sin(phi) * ca, nz = Math.cos(phi);
  return { m: [a, b, c, d, ox - a * s.cx - c * s.cy, oy - b * s.cx - d * s.cy] as [number, number, number, number, number, number], n: [cp * nx0 - sp * ny0, sp * nx0 + cp * ny0, nz], moved: tau > 0 || slip > 0 };
}

function gone(s: Shard, t: number, aspect: number): boolean {
  const { m } = pose(s, t, aspect);
  let minY = Infinity, minX = Infinity, maxX = -Infinity;
  for (let i = 0; i < s.ring.length; i += 2) {
    const x = m[0] * s.ring[i] + m[2] * s.ring[i + 1] + m[4], y = m[1] * s.ring[i] + m[3] * s.ring[i + 1] + m[5];
    minY = Math.min(minY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  }
  return minY > 1.01 || maxX < -0.01 || minX > aspect + 0.01;
}

/* ------------------------------------------------------------------ *
 * Frames
 * ------------------------------------------------------------------ */

export function glassFrame(plan: GlassPlan, progress: number): MaterialFrame {
  return plan.material === "refract" ? refractFrame(plan, clamp01(progress)) : shatterFrame(plan, clamp01(progress));
}

/** The fraction of a flute's half-width the view at its edge is pulled toward the crest: higher magnifies more. */
const PULL = 0.8;
/** Half the width of the soft cut behind the glass, frame heights. */
const SEAM = 0.11;
/** Steepest slope of a flute's face; below the critical angle (41° in glass), so no flute goes black. */
const SLOPE = (32 * Math.PI) / 180;

function refractFrame(plan: GlassPlan, p: number): MaterialFrame {
  const { cols, rows, aspect } = plan, n = cols * rows;
  const across = plan.direction === "left" || plan.direction === "right", sign = plan.direction === "right" || plan.direction === "down" ? 1 : -1;
  const U = across ? aspect : 1, pane = 0.62 * U, period = 0.072, edge = 0.012;
  // The sheet slides by quickly at the frame's edges and slows over the middle, where the cut crosses the frame.
  const travel = U + pane + 2 * edge, ease = p + (0.5 * Math.sin(2 * Math.PI * p)) / (2 * Math.PI);
  const centre = sign > 0 ? -pane / 2 - edge + ease * travel : U + pane / 2 + edge - ease * travel;
  // Motion blur: a 180° shutter at 30 fps sees the flutes move for 1/60 s.
  const speed = (travel * (1 + 0.5 * Math.cos(2 * Math.PI * p))) / plan.seconds, smear = speed / 60;
  const R = period / (2 * Math.sin(SLOPE)), deltaMax = Math.asin(N_GLASS * Math.sin(SLOPE)) - SLOPE, tanMax = Math.tan(deltaMax);
  const fresnel = (alpha: number) => {
    const out = Math.asin(Math.min(1, N_GLASS * Math.sin(alpha))), ci = Math.cos(alpha), co = Math.cos(out);
    const rs = ((N_GLASS * ci - co) / (N_GLASS * ci + co)) ** 2, rp = ((N_GLASS * co - ci) / (N_GLASS * co + ci)) ** 2;
    return (rs + rp) / 2;
  };
  const r0 = fresnel(0), rMax = fresnel(SLOPE);
  const dx = new Float32Array(n), dy = new Float32Array(n), reveal = new Uint8ClampedArray(n);
  const tint = new Uint8ClampedArray(n), valley = new Uint8ClampedArray(n), crest = new Uint8ClampedArray(n), inside = new Uint8ClampedArray(n);
  // Flute shading, widened by the smear so moving flutes blur rather than strobe.
  const blurF = smear / period, width = (w: number) => Math.sqrt(w * w + (blurF * blurF) / 12), peak = (w: number) => w / width(w);
  const phase = hash(3, 3, plan.seed);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = i + j * cols, x = ((i + 0.5) / cols) * aspect, y = (j + 0.5) / rows, u = across ? x : y;
      const s = (u - centre) * sign;
      let source = u;
      const cover = smooth(pane / 2 + 0.6 / rows, pane / 2 - 0.6 / rows, Math.abs(s));
      if (cover > 0) {
        const q = s / period + phase, f = q - Math.floor(q) - 0.5;
        const alpha = Math.asin(Math.min(1, (Math.abs(f) * period) / R));
        const delta = Math.asin(Math.min(1, N_GLASS * Math.sin(alpha))) - alpha;
        const pull = PULL * (period / 2) * (Math.tan(delta) / tanMax);
        source = u - sign * Math.sign(f) * pull * cover;
        tint[k] = Math.round(255 * cover);
        inside[k] = Math.round(255 * cover);
        valley[k] = Math.round(255 * cover * clamp01(0.55 * ((fresnel(alpha) - r0) / (rMax - r0)) ** 1.5 + 0.35 * Math.exp(-((0.5 - Math.abs(f)) ** 2) / (2 * width(0.035) ** 2)) * peak(0.035)));
        // Light from the upper left: a bright line just left of each crest, and a faint second one right of it.
        const g = (c: number, w: number) => Math.exp(-((f - c) ** 2) / (2 * width(w) ** 2)) * peak(w);
        crest[k] = Math.round(255 * cover * clamp01(0.3 * g(-0.2, 0.035) + 0.1 * g(0.28, 0.05)));
      }
      source = Math.max(0.001, Math.min(U - 0.001, source));
      if (across) dx[k] = source - u; else dy[k] = source - u;
      // The cut lies behind the glass at the sheet's centre: the incoming scene is wherever the view lands behind it.
      // A soft cut: each flute magnifies a different part of it, so the sheet turns the change into stepped strips.
      reveal[k] = Math.round(255 * smooth(SEAM, -SEAM, (source - centre) * sign));
    }
  }
  const sigma = 1000 * smear * 0.4;
  const warp = { dx, dy, blur: (across ? [sigma, 0] : [0, sigma]) as [number, number], blurMask: inside };
  // The sheet's polished edges: a dark band where the edge turns the light away, and a bright line on its outer face.
  const vectors: MaterialVector[] = [];
  const band: number[][] = [], line: number[][] = [];
  for (const side of [-1, 1]) {
    const at = centre + sign * side * pane / 2, a = at - (sign * side * edge) / 2, b = at + (sign * side * edge) / 2;
    const rect = (u0: number, u1: number) => (across ? [u0, -0.01, u1, -0.01, u1, 1.01, u0, 1.01] : [-0.01, u0, aspect + 0.01, u0, aspect + 0.01, u1, -0.01, u1]);
    band.push(rect(Math.min(a, b), Math.max(a, b)));
    line.push(across ? [b, -0.01, b, 1.01] : [-0.01, b, aspect + 0.01, b]);
  }
  const soft = Math.max(0.6, 1000 * smear * 0.35);
  vectors.push({ id: "glass-edge", rings: band, closed: true, fill: "#16201d", alpha: 0.5, blend: "normal", blur: soft });
  vectors.push({ id: "glass-edge-light", rings: line, closed: false, stroke: "#ffffff", width: 1.6, alpha: 0.55, blend: "screen", blur: soft * 0.6 });
  const layers: MaterialLayer[] = [
    { id: "glass-tint", color: plan.color, alpha: tint, blend: "multiply" },
    { id: "glass-flute-shade", color: "#56645f", alpha: valley, blend: "multiply" },
    { id: "glass-flute-light", color: "#ffffff", alpha: crest, blend: "screen" },
  ];
  return { reveal, layers, vectors, warpOut: warp, warpIn: warp };
}

function shatterFrame(plan: GlassPlan, p: number): MaterialFrame {
  const { cols, rows, aspect, shards } = plan, n = cols * rows, t = p * plan.seconds;
  const reveal = new Uint8ClampedArray(n).fill(255);
  const vectors: MaterialVector[] = [];
  const running = t < CRACK_SECONDS;
  const poses = shards.map((s) => pose(s, t, aspect));
  const current = shards.map((s, i) => {
    const m = poses[i].m, ring: number[] = [];
    for (let q = 0; q < s.ring.length; q += 2) ring.push(m[0] * s.ring[q] + m[2] * s.ring[q + 1] + m[4], m[1] * s.ring[q] + m[3] * s.ring[q + 1] + m[5]);
    if (ringArea(ring) < 0) { const flip: number[] = []; for (let q = ring.length - 2; q >= 0; q -= 2) flip.push(ring[q], ring[q + 1]); return flip; }
    return ring;
  });
  const visible = shards.map((s, i) => !gone(s, t, aspect) && Math.abs(poses[i].m[0] * poses[i].m[3] - poses[i].m[1] * poses[i].m[2]) > 1e-4);
  const moving = poses.some((q) => q.moved);
  const loose = shards.some((s) => t > s.release);
  let warpOut: MaterialFrame["warpOut"];
  if (moving) {
    // Rasterise the shards far to near: each cell shows its shard's piece of the outgoing scene.
    const owner = new Int16Array(n).fill(-1), dx = new Float32Array(n), dy = new Float32Array(n);
    const depth = shards.map((s, i) => ({ i, z: s.vz * Math.max(0, t - s.release) })).sort((a, b) => b.z - a.z);
    for (const { i } of depth) {
      if (!visible[i]) continue;
      const [a, b, c, d, e, f] = poses[i].m, det = a * d - b * c;
      eachCellInRing(current[i], cols, rows, aspect, (k) => {
        const x = (((k % cols) + 0.5) / cols) * aspect, y = (Math.floor(k / cols) + 0.5) / rows;
        const rx = (d * (x - e) - c * (y - f)) / det, ry = (-b * (x - e) + a * (y - f)) / det;
        owner[k] = i; dx[k] = rx - x; dy[k] = ry - y;
      });
    }
    warpOut = { dx, dy, owner };
  }
  // Cracks: while they run, lines grow out from the impact; then each shard's outline follows the shard.
  const front = (smooth(0, CRACK_SECONDS, t) ** 0.6) * 3;
  const crackLines: number[][] = [];
  if (running) {
    for (const c of plan.cracks) {
      const pts: number[] = [];
      for (let q = 0; q < c.rho.length; q++) { if (c.rho[q] > front) break; pts.push(c.pts[2 * q], c.pts[2 * q + 1]); }
      if (pts.length >= 4) crackLines.push(pts);
    }
  }
  const outlines = running ? crackLines : current.filter((_, i) => visible[i]).map((r) => [...r, r[0], r[1]]);
  // Fracture faces catch the light: brighter on shards that have turned.
  const tiltLight = running ? [] : shards.map((_, i) => 1 - Math.abs(poses[i].n[2])).filter((_, i) => visible[i]);
  if (outlines.length) {
    vectors.push({ id: "crack-shadow", rings: outlines, closed: false, stroke: "#000000", width: 3, alpha: 0.45, blend: "multiply" });
    vectors.push({ id: "crack-light", rings: outlines, closed: false, stroke: plan.color, width: 1.4, alpha: 0.9, alphas: running ? undefined : tiltLight.map((v) => 0.75 + 0.25 * v), blend: "screen" });
  }
  // The crushed glass at the impact is white, scattered light; it bursts out first.
  const crushed = shards.map((s, i) => (s.crushed && visible[i] ? current[i] : null)).filter((r): r is number[] => r !== null);
  if (crushed.length && t > 0) vectors.push({ id: "crush", rings: crushed, closed: true, fill: "#f4f7f8", alpha: 0.55 * smooth(0, CRACK_SECONDS, t), blend: "screen" });
  if (t > 0 && !loose) vectors.push({ id: "starburst", rings: plan.starburst, closed: false, stroke: "#ffffff", width: 1.2, alpha: 0.8 * smooth(0, CRACK_SECONDS * 0.6, t), blend: "screen" });
  // Glints: a turning shard reflects the light (Fresnel rises toward grazing) and flashes as its face sweeps the light.
  const light = [-0.42, -0.62, 0.66], hx = light[0], hy = light[1], hz = light[2] + 1, hl = Math.hypot(hx, hy, hz);
  const glintRings: number[][] = [], glintAlpha: number[] = [];
  shards.forEach((s, i) => {
    if (!visible[i] || t <= s.release) return;
    let [nx, ny, nz] = poses[i].n;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const spec = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl) ** 48, fres = 0.04 + 0.96 * (1 - nz) ** 5;
    // Edge-on slivers are mostly their bright edge, drawn with the outlines.
    const a = Math.min(0.45, 0.4 * spec + 0.6 * (fres - 0.04)) * smooth(0.04, 0.2, nz);
    if (a > 0.01) { glintRings.push(current[i]); glintAlpha.push(a); }
  });
  if (glintRings.length) vectors.push({ id: "glint", rings: glintRings, closed: true, fill: "#eef5f8", alpha: 1, alphas: glintAlpha, blend: "screen" });
  const outClip = loose ? current.filter((_, i) => visible[i]) : undefined;
  return { reveal, layers: [], vectors, warpOut, outClip, incomingBelow: true };
}
