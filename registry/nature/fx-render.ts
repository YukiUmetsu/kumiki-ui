/**
 * FX1 rendering: a fire at a moment `t` (seconds), as a photograph-like raster, from the flame physics in `fx-data.ts`.
 *
 * - The flame is a volume: a teardrop envelope as tall as Heskestad's mean flame height for the fire's heat release,
 *   puffing at its flicker frequency (1.5/√D Hz), with turbulence carried upward at the plume's speed (eddies scaled
 *   to the fire: a candle is nearly laminar, a bonfire tears into tongues).
 * - Each point's soot temperature sets its colour (Planck's law through the CIE observer, `blackbodyRGB`) and its
 *   brightness (rising steeply with temperature); soot also absorbs. Small flames show a faint blue premixed base.
 * - Smoke rises above the flame in billows widening at the plume angle, white-grey or black by the fuel, lit warm from
 *   below by the fire.
 * - Sparks ride the plume, cooling from yellow to red, drawn with a 1/48 s motion blur.
 * - Firelight lights the ground (or a candle's wax) with an inverse-square falloff; a soft bloom round the flame.
 */
import { createRaster, downsample, encodeSrgb, fbm, fbm3, linearOf, worley } from "../anatomy/foundation-raster";
import { blackbodyRGB, blackbodyRadiance, findFire, fireball, flameHeight, flickerHz, SMOKE } from "./fx-data";
import type { FireId } from "./fx-data";

export interface FireRenderOptions {
  fire?: FireId;
  /** Seconds into the fire (animation time). */
  t?: number;
  width?: number; height?: number; supersample?: number;
  /** Night, dusk or day behind it. Default night. */
  background?: "night" | "dusk" | "day";
  smoke?: boolean; sparks?: boolean;
  /** Sideways wind, m/s (leans the flame and smoke). */
  wind?: number;
  seed?: number;
}
export interface FireRender { width: number; height: number; rgba: Uint8ClampedArray; ms: number; flameHeight: number; flickerHz: number }

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** A fuel-air fireball at time `t` (s) after ignition, for a fuel mass (kg): see `renderFireball`. */
export interface FireballRenderOptions { mass?: number; t?: number; width?: number; height?: number; supersample?: number; seed?: number }

/**
 * A fireball (a burning fuel-air cloud) at a moment after ignition. Its full diameter and burn time follow the CCPS
 * relations for hydrocarbon fireballs (`fireball`: D ≈ 5.8 M^(1/3) m, t ≈ 0.45 M^(1/3) s). It grows fast (full size by
 * about a fifth of the burn), then lifts on its own buoyancy into a rising, rolling ball over a stem; the burning gas
 * cools from yellow-white through orange to dull red while soot thickens into dark smoke from the edges inward.
 */
export function renderFireball(o: FireballRenderOptions = {}): FireRender {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const M = o.mass ?? 100, fb = fireball(M), seed = o.seed ?? 9, T = fb.seconds, t = Math.max(0, o.t ?? T * 0.35);
  const W = o.width ?? 360, H = o.height ?? 300, SS = Math.max(1, Math.round(o.supersample ?? 2)), w = W * SS, h = H * SS;
  const D = fb.diameter, grow = Math.min(1, Math.pow(t / (T * 0.2), 0.45)), R = (D / 2) * (0.25 + 0.75 * grow);
  // buoyant rise: the ball's centre lifts from about R off the ground at about 0.3 √(g D)
  const rise = R + Math.max(0, t - T * 0.12) * 0.55 * Math.sqrt(9.81 * D), burn = Math.min(1, t / T);
  const sceneH = D * 1.9, mpp = sceneH / (h * 0.9), yBase = h * 0.92, x0 = -w / 2 * mpp;
  const out = createRaster(w, h);
  const Thot = 2200 - 1150 * Math.pow(burn, 0.8), eddy = R * 0.35, steps = 40;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x0 + (i + 0.5) * mpp, Y = (yBase - j - 0.5) * mpp, k0 = j * w + i;
    let c: [number, number, number] = [0.02, 0.025, 0.035];
    if (Y < 0) { const gl = Math.min(2, 0.6 * (1 - burn) * Math.exp(-(X * X) / (D * D))); c = [0.05 + gl * 0.9, 0.04 + gl * 0.5, 0.03 + gl * 0.2]; }
    else {
      const half = R * 1.25, dz = (2 * half) / steps;
      let tr = 1, er = 0, eg = 0, eb = 0;
      for (let st = 0; st < steps && tr > 0.004; st++) {
        const Z = -half + (st + 0.5) * dz, dy = Y - rise, k = 1 / eddy, yt = Y - t * Math.sqrt(9.81 * D) * 0.25;
        const n1 = fbm3(seed, X * k, yt * k, Z * k, 4), r = Math.hypot(X, dy * 1.1, Z) / R + 0.35 * n1;
        // the stem: a narrower column from the ground up into the ball as it rises
        const stem = Math.hypot(X, Z) / (R * 0.35 + 0.05 * Y) + 0.4 * n1;
        const inBall = 1 - r, inStem = Y < rise ? 1 - stem : -1;
        const d = Math.max(inBall, inStem * 0.8);
        if (d <= 0) continue;
        // hot, burning gas inside; soot toward the outside and later in the burn
        const core = Math.min(1, d * 2.2), Tg = 900 + (Thot - 900) * core * (0.85 + 0.15 * fbm3(seed + 3, X * k * 2, yt * k * 2, Z * k * 2, 2));
        const soot = Math.min(1, (1 - core) * 0.9 + burn * burn * 0.9);
        const bb = blackbodyRGB(Tg), rad = blackbodyRadiance(Tg) * (16 / R) * (1 - soot * 0.75) * d;
        er += tr * bb[0] * rad * dz; eg += tr * bb[1] * rad * dz; eb += tr * bb[2] * rad * dz;
        tr *= Math.exp(-soot * dz / R * 3.2);
      }
      c = [c[0] * tr + er, c[1] * tr + eg, c[2] * tr + eb];
    }
    out.rgb[k0 * 3] = c[0]; out.rgb[k0 * 3 + 1] = c[1]; out.rgb[k0 * 3 + 2] = c[2]; out.alpha[k0] = 1;
  }
  const fin = downsample(out, SS), rgba = encodeSrgb(fin, { toneMap: "filmic", exposure: 0.9, white: 6 });
  return { width: W, height: H, rgba, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, flameHeight: D, flickerHz: 1 / T };
}

export function renderFire(o: FireRenderOptions = {}): FireRender {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const f = findFire(o.fire ?? "candle"), t = o.t ?? 0, seed = o.seed ?? 5, wind = o.wind ?? 0;
  const W = o.width ?? 360, H = o.height ?? 300, SS = Math.max(1, Math.round(o.supersample ?? 2)), w = W * SS, h = H * SS;
  const small = f.D < 0.05, Lm = f.laminar?.height ?? flameHeight(f.Q, f.D), fHz = flickerHz(f.D), Dw = f.laminar?.width ?? f.D;
  // the plume's speed inside the flame (McCaffrey: about 1.9 Q^(1/5) m/s), the eddy size
  const u = 1.9 * Math.pow(f.Q, 0.2) * (small ? 0.35 : 1), eddy = Math.max(0.004, f.D * (small ? 0.6 : 0.45));
  // framing: the flame and some smoke above; metres per pixel
  const sceneH = small ? Lm * 2.4 : (o.smoke ?? true) ? Lm * 2.1 + f.D * 0.5 : Lm * 1.5 + f.D * 0.5, mpp = sceneH / (h * 0.82), x0 = -w / 2 * mpp, yBase = h * 0.82;
  const puff = 1 + (small ? 0.06 : 0.22) * Math.sin(2 * Math.PI * fHz * t) + (small ? 0.03 : 0.08) * Math.sin(2 * Math.PI * fHz * 2.3 * t + 1);
  const L = Lm * puff;
  const bg = o.background ?? "night";
  const bgTop = linearOf(bg === "night" ? "#06080d" : bg === "dusk" ? "#2b2f4a" : "#9fb4c8"), bgBot = linearOf(bg === "night" ? "#0d0b0a" : bg === "dusk" ? "#5a4637" : "#c8c0ae");
  const out = createRaster(w, h);
  const Tcore = small ? 1950 : 1700, sootK = f.soot * (small ? 900 : 18) / Math.max(0.01, Dw); // absorption per m at full soot
  // a camera exposes for the flame: its core about 8–10 in linear light (filmic: yellow-white), the edges and tip about 1 (orange)
  const emitK = 7 / Math.max(0.006, Dw * (small ? 1.2 : 0.6));
  // the envelope radius at height y (m): wide low, tapering to the tip; a candle's is a slender teardrop
  const radiusAt = (y: number) => { const s = y / L; if (s < 0 || s > 1.25) return 0; return (Dw / 2) * (small ? 1.3 * Math.sqrt(Math.min(1, Math.max(0, s * 3.2))) * Math.pow(Math.max(0, 1.08 - s), 0.55) : (0.9 + 0.3 * (1 - s)) * Math.pow(Math.max(0, 1.15 - s), 0.7)); };
  const field = (x: number, y: number, z: number) => {
    // turbulence carried up with the plume; stronger higher up; the wind leans it
    const lean = wind * y * 0.6 / Math.max(0.5, u);
    const k = 1 / eddy, yt = y - u * t, amp = (small ? 0.06 : 1.1) * eddy * ss(0, L * 0.5, y);
    const dx = amp * (fbm3(seed, x * k, yt * k, z * k, 3) + 0.35 * fbm3(seed + 2, x * k * 3, yt * k * 3, z * k * 3, 2)), dz = amp * fbm3(seed + 7, x * k, yt * k, z * k + 5, 3);
    const px = x - lean - dx, pz = z - dz, rr = radiusAt(y) * (1 + (small ? 0.02 : 0.35) * fbm3(seed + 3, x * k * 0.7, yt * k * 1.2, z * k * 0.7, 3));
    if (rr <= 0) return { T: 0, soot: 0, blue: 0 };
    const d = Math.hypot(px, pz) / rr;
    if (d > 1) return { T: 0, soot: 0, blue: 0 };
    const s = y / L, edge = 1 - d * d;
    // hottest low-middle, cooling to the tip and the sides; soot builds up through the middle
    const T = 900 + (Tcore - 900) * Math.pow(edge, 0.6) * (1 - 0.45 * ss(0.5, 1.15, s)) * (0.92 + 0.08 * fbm3(seed + 11, x * k * 2, yt * k * 2, z * k * 2, 2));
    // flames tear into tongues with gaps between them higher up (intermittency); a candle's stays whole
    const gaps = small ? 1 : ss(-0.25, 0.25, fbm3(seed + 13, x * k * 1.8, yt * k * 1.4, z * k * 1.8, 3) + 0.8 - s * 0.85);
    const soot = ss(0.06, 0.3, s) * (1 - ss(0.95, 1.2, s)) * Math.pow(edge, 0.5) * gaps;
    const blue = small ? (1 - ss(0.05, 0.22, s)) * ss(0.2, 0.9, d) : 0;
    return { T, soot, blue };
  };
  // smoke: a plume from the flame tip widening at about 7° half-angle, billowing; colour by the fuel
  // a still candle hardly smokes; fires do
  const smokeCol = linearOf(SMOKE.colours[f.smoke]), smokeOn = o.smoke ?? !small;
  const smokeAt = (x: number, y: number, z: number) => {
    const yy = y - L * 0.75;
    if (!smokeOn || yy < 0) return 0;
    const rr = Dw * 0.25 + Math.tan((SMOKE.halfAngle.typical * Math.PI) / 180) * yy * 2.2 + Dw * 0.1, lean = wind * yy * 0.8;
    const d = Math.hypot(x - lean, z) / rr;
    if (d > 1.4) return 0;
    // wisps: the plume's turbulence, domain-warped so it rolls and folds; thin threads, not a uniform haze
    const k = 1 / Math.max(eddy * 1.5, rr * 0.6), yt = y - u * 0.6 * t;
    const wx = fbm3(seed + 27, x * k * 0.5, yt * k * 0.5, z * k * 0.5, 2) * 1.6, wz = fbm3(seed + 29, x * k * 0.5 + 3, yt * k * 0.5, z * k * 0.5, 2) * 1.6;
    const b = 0.5 + 0.5 * fbm3(seed + 21, x * k + wx, yt * k, z * k + wz, 4), wisp = Math.pow(Math.max(0, b), f.smoke === "black" ? 1.2 : 2.6);
    return Math.max(0, wisp - d * 0.45) * ss(0, L * 0.3, yy) * Math.exp(-yy / (L * 2.5)) * (f.smoke === "black" ? 2.5 : f.smoke === "grey" ? 1.6 : 0.4);
  };
  const steps = 36;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x0 + (i + 0.5) * mpp, Y = (yBase - j - 0.5) * mpp, k0 = j * w + i;
    const bgt = j / h;
    let c: [number, number, number] = [bgTop[0] + (bgBot[0] - bgTop[0]) * bgt, bgTop[1] + (bgBot[1] - bgTop[1]) * bgt, bgTop[2] + (bgBot[2] - bgTop[2]) * bgt];
    // the ground (or the candle) lit by the fire
    if (Y < 0) {
      if (small) {
        const wax = Math.abs(X) < 0.011 && Y > -0.08;
        const ground = linearOf("#1b1612");
        const light = 0.012 / (0.0004 + X * X + Y * Y) * 0.0015;
        if (wax) { const glow = Math.exp(Y / 0.025); c = [0.78 * (0.15 + 0.85 * glow) * 0.9, 0.66 * (0.12 + 0.88 * glow) * 0.75, 0.52 * (0.1 + 0.9 * glow) * 0.5]; }
        else c = [ground[0] + light, ground[1] + light * 0.6, ground[2] + light * 0.3];
      } else {
        const ground = linearOf(bg === "day" ? "#6b5e4a" : "#2a221b"), r2 = X * X + (Y * 3) ** 2, light = 0.12 / (0.3 + r2 / (f.D * f.D));
        const tex = 0.8 + 0.2 * fbm(seed + 31, X / 0.05, Y / 0.02, 3);
        c = [ground[0] * tex + light * 0.9, ground[1] * tex + light * 0.5, ground[2] * tex + light * 0.18];
      }
    }
    // the fuel: wood fires burn on logs; charred bark (near black, cracked into blocks by the heat) with the cracks
    // glowing orange-red where the wood is burning, hottest under the flame, and a bed of embers between the logs
    let logCover = 0;
    if (!small && f.smoke !== "black") {
      const lr = f.D * 0.09, logs = [[-0.48, 0.02, 0.38, 0.13], [0.46, 0.03, -0.32, 0.15], [-0.36, 0.08, 0.42, 0.06], [0.1, 0.01, 0.5, 0.02]] as const;
      // embers: a low glowing bed
      if (Math.abs(X) < f.D * 0.45 && Y > -0.002 && Y < lr * 0.8) {
        const wv = worley(seed + 51, X / (f.D * 0.05), Y / (f.D * 0.05)), em = (1 - Math.min(1, wv.f1 * 1.8)) * (0.6 + 0.4 * fbm(seed + 53, X / (f.D * 0.1), t * 0.7, 2));
        const T = 900 + 350 * em * (1 - Math.abs(X) / (f.D * 0.45)), bb = blackbodyRGB(T), rad = blackbodyRadiance(T) * 1.4 * em;
        c = [0.03 + bb[0] * rad, 0.02 + bb[1] * rad, 0.015 + bb[2] * rad];
      }
      for (const [ax, ay, bx, by] of logs) {
        const Ax = ax * f.D, Ay = ay * f.D + lr, Bx = bx * f.D, By = by * f.D + lr, ex = Bx - Ax, ey = By - Ay, l2 = ex * ex + ey * ey;
        const tt = Math.max(0, Math.min(1, ((X - Ax) * ex + (Y - Ay) * ey) / l2)), dx = X - Ax - ex * tt, dy = Y - Ay - ey * tt, d = Math.hypot(dx, dy);
        if (d > lr) continue;
        // the cylinder: shading round it, bark cracked into blocks along its length
        const across = d / lr, ny = dy / lr, along = tt * Math.sqrt(l2);
        const cr = worley(seed + 61, along / (lr * 0.55), (Math.asin(Math.max(-1, Math.min(1, ny))) * lr) / (lr * 0.35)), crack = 1 - Math.min(1, (cr.f2 - cr.f1) / 0.12);
        const heat = Math.exp(-((X / (f.D * 0.35)) ** 2)) * (0.5 + 0.5 * ss(0.3, -0.6, ny)) * (0.7 + 0.3 * fbm(seed + 63, along / lr, t * 0.6, 2));
        const shade = 0.25 + 0.75 * Math.sqrt(Math.max(0, 1 - across * across)) * (0.6 + 0.4 * Math.max(0, ny + 0.3));
        let lc: [number, number, number] = [0.012 * shade, 0.011 * shade, 0.01 * shade];
        // ash on the unburnt top, glowing cracks where it burns
        lc = lc.map((v, k) => v + [0.04, 0.038, 0.036][k] * Math.max(0, ny) * (1 - heat) * 0.6 * (0.5 + 0.5 * cr.id)) as [number, number, number];
        if (crack > 0.3 && heat > 0.15) { const T = 850 + 400 * heat * crack, bb = blackbodyRGB(T), rad = blackbodyRadiance(T) * 2.2 * crack * heat; lc = [lc[0] + bb[0] * rad, lc[1] + bb[1] * rad, lc[2] + bb[2] * rad]; }
        const edge = Math.min(1, (lr - d) / (mpp * 1.2));
        c = [c[0] * (1 - edge) + lc[0] * edge, c[1] * (1 - edge) + lc[1] * edge, c[2] * (1 - edge) + lc[2] * edge];
        logCover = Math.max(logCover, edge);
      }
    }
    // integrate the flame and smoke along the view ray (z through the volume)
    const R = Math.max(radiusAt(Math.max(0, Y)) * 1.6, smokeOn ? Dw * 0.7 + Y * 0.3 : 0) + eddy;
    if (Y > -0.001 && R > 0 && Y < sceneH * 1.2) {
      const dz = (2 * R) / steps;
      let tr = 1, er = 0, eg = 0, eb = 0;
      for (let s = 0; s < steps && tr > 0.004; s++) {
        const Z = -R + (s + 0.5) * dz;
        // a log in front of the fire's middle hides what burns behind it
        // (flames rise off the log's surface: thin right at the wood, so its char and glowing cracks show through)
        if (logCover > 0.5 && Z < f.D * 0.09) continue;
        const fl = field(X, Y, Z);
        if (fl.T > 0) {
          const bb = blackbodyRGB(fl.T), rad = blackbodyRadiance(fl.T) * emitK * fl.soot * dz;
          er += tr * (bb[0] * rad + fl.blue * 0.004 * dz * emitK); eg += tr * (bb[1] * rad + fl.blue * 0.012 * dz * emitK); eb += tr * (bb[2] * rad + fl.blue * 0.06 * dz * emitK);
          tr *= Math.exp(-sootK * fl.soot * dz * 0.02);
        }
        const sm = smokeAt(X, Y, Z);
        if (sm > 0) {
          const a = 1 - Math.exp(-sm * dz / Math.max(0.01, Dw) * 2.2), warm = Math.exp(-(Y - L) / (L * 1.5)) * 0.35;
          er += tr * a * (smokeCol[0] * (0.05 + warm * 0.9)); eg += tr * a * (smokeCol[1] * (0.05 + warm * 0.5)); eb += tr * a * (smokeCol[2] * (0.05 + warm * 0.25));
          tr *= 1 - a;
        }
      }
      c = [c[0] * tr + er, c[1] * tr + eg, c[2] * tr + eb];
    }
    out.rgb[k0 * 3] = c[0]; out.rgb[k0 * 3 + 1] = c[1]; out.rgb[k0 * 3 + 2] = c[2]; out.alpha[k0] = 1;
  }
  // sparks: born at a steady rate from the fire, carried up and sideways by the plume, cooling as they go
  if ((o.sparks ?? !small) && !small) {
    for (let n = 0; n < 60; n++) {
      const life = 0.8 + 1.4 * ((n * 0.618) % 1), born = -((n * 0.377) % 1) * 3 + Math.floor(t / 3) * 3, age = ((t - born) % 3 + 3) % 3;
      if (age > life) continue;
      // each spark its own launch point, sideways drift and swirl (a small fire's sparks still wander 10–30 cm)
      const spread = Math.max(f.D, 0.25), h1 = ((n * 0.731) % 1) - 0.5, h2 = ((n * 0.457 + 0.13) % 1) - 0.5, h3 = (n * 0.619) % 1;
      const lx = h1 * f.D * 0.8, rise = Math.min(u, 2.4) * (0.5 + 0.8 * h3), drift = h2 * spread * 4.5;
      const pos = (a: number): [number, number] => [lx + (wind * 0.8 + drift) * a + 0.8 * spread * Math.sin(n * 1.7 + a * (2 + 2 * h3)) * a, L * 0.3 + rise * a - 1.2 * a * a];
      const [sx, sy] = pos(age), [px, py] = pos(Math.max(0, age - 1 / 48));
      const T = 1300 - 500 * (age / life), bb = blackbodyRGB(T), br = blackbodyRadiance(T) * 6 * (1 - age / life);
      const ax = (sx - x0) / mpp, ay = yBase - sy / mpp, bx = (px - x0) / mpp, by = yBase - py / mpp, len = Math.max(1, Math.hypot(ax - bx, ay - by));
      for (let q = 0; q <= len; q++) {
        const x = Math.round(bx + ((ax - bx) * q) / len), y = Math.round(by + ((ay - by) * q) / len);
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
        for (const [ox, oy, wgt] of [[0, 0, 1], [1, 0, 0.35], [-1, 0, 0.35], [0, 1, 0.35], [0, -1, 0.35]] as const) { const k = (y + oy) * w + x + ox; out.rgb[k * 3] += bb[0] * br * wgt; out.rgb[k * 3 + 1] += bb[1] * br * wgt; out.rgb[k * 3 + 2] += bb[2] * br * wgt; }
      }
    }
  }
  // bloom: a soft glow round the brightest light (a lens's veiling glare)
  const fin = downsample(out, SS);
  {
    const n = fin.width * fin.height, bright = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) for (let c2 = 0; c2 < 3; c2++) bright[k * 3 + c2] = Math.max(0, fin.rgb[k * 3 + c2] - 0.6);
    const sig = Math.max(2, fin.width * 0.025);
    // a separable box-ish blur (three passes)
    const blur = (src: Float32Array) => { let a = src; for (let pass = 0; pass < 3; pass++) { const b = new Float32Array(a.length), rr = Math.round(sig); for (let y = 0; y < fin.height; y++) for (let x = 0; x < fin.width; x++) for (let c2 = 0; c2 < 3; c2++) { let s = 0, m = 0; for (let d = -rr; d <= rr; d++) { const xx = x + d; if (xx < 0 || xx >= fin.width) continue; s += a[(y * fin.width + xx) * 3 + c2]; m++; } b[(y * fin.width + x) * 3 + c2] = s / m; } const c = new Float32Array(a.length); for (let y = 0; y < fin.height; y++) for (let x = 0; x < fin.width; x++) for (let c2 = 0; c2 < 3; c2++) { let s = 0, m = 0; for (let d = -rr; d <= rr; d++) { const yy = y + d; if (yy < 0 || yy >= fin.height) continue; s += b[(yy * fin.width + x) * 3 + c2]; m++; } c[(y * fin.width + x) * 3 + c2] = s / m; } a = c; } return a; };
    const bl = blur(bright);
    for (let k = 0; k < n * 3; k++) fin.rgb[k] += bl[k] * 0.55;
  }
  const rgba = encodeSrgb(fin, { toneMap: "filmic", exposure: 0.9, white: 6 });
  return { width: W, height: H, rgba, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, flameHeight: Lm, flickerHz: fHz };
}
