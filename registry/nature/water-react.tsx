/**
 * WATER1 React pieces: a sea seen from the shore (every colour from Fresnel and the sky, glints only where a facet
 * mirrors the sun), breakers in cross-section, the sea by wind at true scale, wakes, ripples, reflections, meanders,
 * colours, and the reference sheet. They show the data and the construction; styles paint the same shapes their way.
 */
import { useId } from "react";
import type { FPoint } from "../anatomy/foundation-shapes";
import { linePath, polyPath, seeded, smoothClosedPath, smoothTube } from "../anatomy/foundation-shapes";
import { MUTED, SheetCard, sheetGrid, sheetList, sheetSmall, SwatchList } from "../anatomy/foundation-react";
import { beaufortSpeed, mixColour, skyGradient } from "./sky-physics";
import { BEAUFORT } from "./sky-data";
import type { BreakerType } from "./water-data";
import { BREAKER_PALETTE, BREAKERS, FOAM_DECAY, FOAM_LIT, MEANDERS, SLOPES, WATER_COLOURS, WATER_SOURCES, WAVE_LIMITS } from "./water-data";
import {
  breakerDetail, breakerShape, fresnel, fullyDevelopedSea, glitterPath, kelvinWake, meanderPath, orbit, reflectanceAt, rippleRings, seaForBeaufort, seaSurface, throughWater, trochoidProfile,
} from "./water-physics";

const RAD = Math.PI / 180;
const useWaterId = () => `wtr${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
const DEEP = "#146593", SAND = "#d8c49a";

/** A deterministic standard normal from integers (for sub-grid facet slopes). */
function gauss(a: number, b: number, c: number) {
  const r = seeded((a * 73856093) ^ (b * 19349663) ^ (c * 83492791));
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface SeaSceneProps {
  /** Beaufort force of the wind raising the sea (fully developed). */
  beaufort?: number;
  /** Sun elevation, degrees; `sunAhead` puts it in front of the viewer (glitter path), else behind. */
  sunElevation?: number; sunAhead?: boolean;
  /** Eye height above the water, m. */
  eyeHeight?: number;
  time?: number; seed?: number;
  width?: number; height?: number;
  /** The water's body colour (default a clear deep sea, measured). */
  body?: string;
  label?: string;
}

/**
 * A sea from the shore, level camera. The surface is sampled in rows of distance; each band takes its colour from the
 * water body and the reflected sky mixed by Fresnel at the facet's own tilt, so the horizon goes to sky colour and
 * the faces of waves turned to the viewer show the darker body. Whitecaps cover the share Monahan & O'Muircheartaigh
 * give; glints appear only where a facet (with Cox–Munk sub-grid slopes) reflects the sun to the eye.
 */
export function SeaScene({ beaufort = 4, sunElevation = 20, sunAhead = true, eyeHeight = 4, time = 0, seed = 1, width = 640, height = 360, body = DEEP, label }: SeaSceneProps) {
  const id = useWaterId(), W = width, H = height, H0 = H * .42, f = W * .9, eye = eyeHeight;
  const wind = beaufortSpeed(beaufort), surf = seaSurface(wind, { seed, components: 16, spread: 50 }), sea = surf.sea;
  const sky = skyGradient(sunElevation, 0), skyAt = (elev: number) => {
    const st = sky.stops, e = Math.max(0, Math.min(90, elev));
    const i = e < st[1].elevation ? 0 : 1, t = (e - st[i].elevation) / (st[i + 1].elevation - st[i].elevation);
    return mixColour(st[i].colour, st[i + 1].colour, t);
  };
  const colourAt = (depression: number) => mixColour(body, skyAt(depression), reflectanceAt(depression));
  // Base gradient: level water, sky reflected by Fresnel.
  const baseStops = [0, .01, .03, .08, .18, .4, 1].map(u => { const y = H0 + u * (H - H0), dep = Math.atan2(y - H0, f) / RAD; return { u, colour: colourAt(Math.max(.01, dep)) }; });
  // Rows of distance from the bottom of the frame to the horizon: a fifth of the shortest wave apart near the viewer,
  // and about 1.2 px apart on screen farther out (where single waves are smaller than a pixel row).
  const L = Math.max(.5, sea.wavelength), Lmin = L / 9, dNear = eye * f / (H - H0) * .92, dMax = f * eye / .8, colStep = 8, cols = Math.ceil(W / colStep) + 1;
  const glint = glitterPath(sunElevation, wind), msTotal = SLOPES.base + SLOPES.perWind * wind;
  const lines: { d: number; pts: FPoint[]; eta: number[]; slope: number[]; lat: number[] }[] = [];
  const ds: number[] = [];
  for (let d = dNear; d < dMax && ds.length < 420; d += Math.max(Lmin / 5, 1.2 * d * d / (f * eye))) ds.push(d);
  for (const d of ds.reverse()) {
    const pts: FPoint[] = [], eta: number[] = [], slope: number[] = [], lat: number[] = [], h = Math.max(.05, Lmin / 12);
    for (let c = 0; c < cols; c++) {
      const sx = c * colStep, y = (sx - W / 2) * d / f, e = surf.at(d, time, y);
      pts.push([sx, H0 + f * (eye - e) / d]); eta.push(e);
      slope.push((surf.at(d + h, time, y) - surf.at(d - h, time, y)) / (2 * h));
      lat.push((surf.at(d, time, y + h) - surf.at(d, time, y - h)) / (2 * h));
    }
    lines.push({ d, pts, eta, slope, lat });
  }
  // Whitecaps: the highest crests, so foam covers about the reported share (the mapping from share to crest height is estimated).
  // Weighted by the sea area each sample stands for (far rows hold many samples per square metre).
  const weighted = lines.flatMap((l, i) => { const dd = i ? Math.abs(lines[i - 1].d - l.d) : 0, wgt = dd * l.d; return l.eta.map(e => [e, wgt] as const); }).sort((x, y) => x[0] - y[0]);
  const totalW = weighted.reduce((acc, [, w]) => acc + w, 0), share = Math.min(.3, sea.whitecaps * 5);
  let foamAbove = Infinity;
  if (share > 0) { let acc = 0; for (let j = weighted.length - 1; j >= 0; j--) { acc += weighted[j][1]; if (acc >= totalW * share) { foamAbove = weighted[j][0]; break; } } }
  const resolvedMs = (() => { const sl = lines.flatMap(l => l.slope); return sl.reduce((acc, v) => acc + v * v, 0) / Math.max(1, sl.length); })();
  const subRms = Math.max(.01, Math.sqrt(Math.max(0, msTotal - resolvedMs) / 2));
  // Paths grouped by reflectance level and by how far below the horizon (which part of the sky they mirror).
  const levels = 28, buckets = [0, 1, 2.5, 5, 9, 15, 25, 90], bands = new Map<string, string[]>(), foams: string[] = [], glints: string[] = [];
  // Residual foam: where a crest broke within the last few seconds, lace remains and fades with the measured decay
  // (e-folding about 5 s); bubbly water beneath it is paler; backlit crests glow teal when the sun is low ahead.
  const lace: { d: string; o: number }[] = [], aerated: string[] = [], glow: string[] = [];
  const ago = [1.2, 2.6, 4.5, 7.5], tau = FOAM_DECAY.median, windStreaks = beaufort >= 7, lowSunAhead = sunAhead && sunElevation > 0 && sunElevation < 30;
  const bucketOf = (dep: number) => Math.max(0, buckets.findIndex(b => dep < b) - 1);
  for (let i = 1; i < lines.length; i++) {
    const far = lines[i - 1], near = lines[i], dep = Math.atan2(eye, near.d) / RAD, k = f / near.d;
    // Runs of columns with the same reflectance level become one quad strip between the far and near rows.
    let start = 0;
    const level = (c: number) => { const eff = dep + Math.atan(near.slope[c]) / RAD; return eff <= .05 ? levels : Math.round(fresnel(Math.sin(eff * RAD)) * levels); };
    for (let c = 1; c <= cols; c++) {
      if (c < cols && level(c) === level(start)) continue;
      const a0 = start, a1 = Math.min(cols - 1, c);
      const top = far.pts.slice(a0, a1 + 1), bottom = near.pts.slice(a0, a1 + 1).reverse();
      const key = `${level(start)}:${bucketOf(dep)}`;
      if (!bands.has(key)) bands.set(key, []);
      bands.get(key)!.push(`M${[...top, ...bottom].map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}Z`);
      start = c;
    }
    for (let c = 0; c < cols; c++) {
      const [sx, sy] = near.pts[c];
      // Foam at crest maxima along the line of sight, broken into a few patches with a streak down the face.
      if (near.eta[c] > foamAbove && near.eta[c] >= far.eta[c] && (i + 1 >= lines.length || near.eta[c] >= lines[i + 1].eta[c]) && gauss(i, c, seed + 3) > .6) {
        const r = seeded(i * 7919 + c * 31 + seed), size = Math.min(60, Math.max(1.2, (.4 + 1.2 * r()) * k));
        for (let j = 0; j < 3; j++) {
          const cx = sx + (r() - .5) * size * 1.6, cy = sy + (r() - .2) * size * .12, rx = size * (.25 + .35 * r()), ry = Math.max(.6, rx * (.12 + .1 * r()));
          foams.push(smoothClosedPath([[cx - rx, cy], [cx - rx * .3, cy - ry], [cx + rx * .5, cy - ry * .6], [cx + rx, cy + ry * .2], [cx + rx * .1, cy + ry]]));
        }
        if (size > 4) foams.push(smoothTube([[sx - size * .2, sy + size * .05], [sx, sy + size * .22], [sx + size * .15, sy + size * .4]], [size * .1, size * .06, size * .01]));
      }
      // Lace left by earlier breaks at this spot (the water barely moves while the crest runs on).
      if (foamAbove < Infinity && k > 4) {
        const y = (sx - W / 2) * near.d / f;
        for (const dt of ago) {
          if (surf.at(near.d, time - dt, y) <= foamAbove) continue;
          const o = Math.exp(-dt / tau), r = seeded(i * 6151 + c * 13 + Math.round(dt * 10)), size = Math.min(40, Math.max(1.5, (.6 + r()) * k * .9));
          // A loose net of short curved threads around the spot, opener as it ages.
          const threads: string[] = [];
          for (let q = 0; q < 4; q++) {
            const ax = sx + (r() - .5) * size * 1.8, ay = sy + (r() - .3) * size * .25, len = size * (.3 + r() * .5), bend = (r() - .5) * size * .2;
            if (windStreaks) {
              // Strong winds draw the foam into streaks along the wind: here toward the viewer, so the threads lie along
              // lines from the vanishing point, short and broken.
              const vx = ax - W / 2, vy = ay - H0, vl = Math.hypot(vx, vy) || 1, sl = len * 1.4;
              threads.push(`M${ax.toFixed(1)} ${ay.toFixed(1)}l${(vx / vl * sl).toFixed(1)} ${(vy / vl * sl).toFixed(1)}`);
            } else threads.push(`M${ax.toFixed(1)} ${ay.toFixed(1)}q${(len / 2).toFixed(1)} ${bend.toFixed(1)} ${len.toFixed(1)} ${(bend * .2).toFixed(1)}`);
          }
          lace.push({ d: threads.join(""), o });
          aerated.push(`M${(sx - size).toFixed(1)} ${(sy + size * .08).toFixed(1)}a${size.toFixed(1)} ${(size * .22).toFixed(1)} 0 1 0 ${(size * 2).toFixed(1)} 0a${size.toFixed(1)} ${(size * .22).toFixed(1)} 0 1 0 ${(-size * 2).toFixed(1)} 0`);
          // Strong winds draw foam into streaks along the wind (toward the viewer here, so down the picture).
          break;
        }
      }
      // A low sun ahead lights the thin crests from behind: teal near the top of faces turned to the viewer.
      if (lowSunAhead && near.eta[c] > sea.height * .25 && near.slope[c] > .05 && k > 3) {
        const gw = Math.min(30, colStep * .9), gh = Math.max(1, Math.min(8, near.eta[c] * k * .35));
        glow.push(`M${(sx - gw).toFixed(1)} ${sy.toFixed(1)}h${(gw * 2).toFixed(1)}v${gh.toFixed(1)}h${(-gw * 2).toFixed(1)}Z`);
      }
      if (sunAhead && sunElevation > 0) {
        // A glint needs a facet tilted to mirror the sun: half the gap between the sun and the view, beyond the
        // resolved slope, drawn from the Cox–Munk sub-grid spread. Its chance sets the glints' density.
        const az = Math.atan2(sx - W / 2, f), needAlong = Math.tan((sunElevation - dep) / 2 * RAD) - near.slope[c], needAcross = Math.tan(-az / 2) - near.lat[c];
        const p = Math.exp(-(needAlong * needAlong + needAcross * needAcross) / (2 * subRms * subRms));
        const hash = (seeded(i * 104729 + c * 7 + seed)() + seeded(Math.floor(time * 6) * 13 + i * 3 + c)() ) % 1;
        // Sparkles, not dashes: short, jittered inside the cell so the sampling grid never shows.
        if (hash < p * .6) {
          const r = seeded(i * 3571 + c * 17 + seed * 5 + Math.floor(time * 6)), gw = Math.max(.5, Math.min(2.6, .05 * k)) * (.6 + r());
          const gx = sx + (r() - .5) * colStep, gy = sy + (r() - .5) * Math.max(1, Math.abs(near.pts[c][1] - far.pts[c][1]));
          glints.push(`M${(gx - gw).toFixed(1)} ${gy.toFixed(1)}h${(gw * 2).toFixed(1)}`);
        }
      }
    }
  }
  const fillOf = (key: string) => { const [lv, bk] = key.split(":").map(Number); return mixColour(body, skyAt((buckets[bk] + buckets[bk + 1]) / 2), lv / levels); };
  const skyMid = skyAt(3);
  return (
    <svg role="img" aria-label={label ?? `Sea at Beaufort ${beaufort} (${BEAUFORT[beaufort]?.name ?? ""}): significant height ${sea.height.toFixed(1)} m, period ${sea.period.toFixed(1)} s, whitecaps ${(sea.whitecaps * 100).toFixed(1)}%.`} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto", borderRadius: 6 }}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={sky.stops[2].colour} /><stop offset=".6" stopColor={sky.stops[1].colour} /><stop offset="1" stopColor={sky.stops[0].colour} /></linearGradient>
        <linearGradient id={`${id}-sea`} x1="0" x2="0" y1="0" y2="1">{baseStops.map(s => <stop key={s.u} offset={s.u} stopColor={s.colour} />)}</linearGradient>
      </defs>
      <rect width={W} height={H0} fill={`url(#${id}-sky)`} />
      {sunAhead && sunElevation > 0 && sunElevation < 40 ? <circle cx={W / 2} cy={H0 - f * Math.tan(sunElevation * RAD)} r={f * Math.tan(.27 * RAD) * 1.6} fill={sky.sunDisc} /> : null}
      <rect y={H0} width={W} height={H - H0} fill={`url(#${id}-sea)`} />
      {[...bands.entries()].map(([key, ds]) => <path key={key} d={ds.join("")} fill={fillOf(key)} />)}
      <path d={aerated.join("")} fill={BREAKER_PALETTE.aerated} opacity=".22" />
      <path d={glow.join("")} fill={BREAKER_PALETTE.lipThin} opacity={.35 * (1 - sunElevation / 30)} />
      {lace.map((l, i) => <path key={`lace${i}`} d={l.d} fill="none" stroke={FOAM_LIT} strokeWidth={.9} strokeLinecap="round" opacity={(.75 * l.o).toFixed(2)} />)}
      <path d={foams.join("")} fill={FOAM_LIT} opacity=".92" />
      <path d={glints.join("")} stroke="#fffbe8" strokeWidth={1.4} strokeLinecap="round" opacity=".95" />
      <title>{`Glitter half-height about ${glint.halfHeight.toFixed(0)}° (rms slope ${glint.rmsSlope.toFixed(2)}); sky reflected ${skyMid}`}</title>
    </svg>
  );
}

/** Stretches of the surface lying flat near still-water level (ahead of the face and far behind the crest). */
function surfaceRuns(surface: readonly FPoint[], crest: FPoint) {
  const runs: FPoint[][] = [];
  let cur: FPoint[] = [];
  for (const p of surface) {
    const flat = p[1] < .1 && (p[0] > crest[0] + .25 || p[0] < crest[0] - 2.6);
    if (flat) cur.push(p); else if (cur.length) { if (cur.length > 1) runs.push(cur); cur = []; }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}

/**
 * A breaker in cross-section at a stage, painted after photographs of breaking waves: a sky, the face darkening from
 * the sky-lit trough to deep blue-green, the thin crest and lip glowing teal, flow lines up the face, the tube lit
 * through its lip, whitewater of shaded bubbles over an aerated plume, foam lace on the water, and spindrift off the crest.
 */
export function BreakerFigure({ type, stage, label, height = 150, seed = 1 }: { type: BreakerType; stage: number; label?: string; height?: number; seed?: number }) {
  const id = useWaterId(), b = breakerShape(type, stage), dt = breakerDetail(b, seed), [x0, y0, x1, y1] = b.bounds, P = BREAKER_PALETTE, cy = dt.crest[1];
  return (
    <svg role="img" aria-label={label ?? `${type} breaker, stage ${stage}`} viewBox={`${x0} ${-y1} ${x1 - x0} ${y1 - y0}`} style={{ display: "block", width: "100%", height }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6f9fcc" /><stop offset="1" stopColor="#cfe0ee" /></linearGradient>
        <linearGradient id={`${id}-water`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y0} y2={cy}>
          <stop offset="0" stopColor="#06253a" /><stop offset=".55" stopColor={P.face} /><stop offset=".85" stopColor={P.lip} /><stop offset="1" stopColor={P.lip} />
        </linearGradient>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".09" /></filter>
        <linearGradient id={`${id}-thin`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={cy - .9} y2={cy}><stop offset="0" stopColor={P.lipThin} stopOpacity="0" /><stop offset="1" stopColor={P.lipThin} stopOpacity=".8" /></linearGradient>
        <radialGradient id={`${id}-tube`} fx=".62" fy=".5"><stop offset="0" stopColor="#a9d6e1" /><stop offset=".55" stopColor={P.tube} /><stop offset="1" stopColor={P.lip} /></radialGradient>
        <linearGradient id={`${id}-plume`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={P.aerated} stopOpacity=".85" /><stop offset="1" stopColor={P.aerated} stopOpacity="0" /></linearGradient>
        <radialGradient id={`${id}-bub`} cx=".5" cy=".5" r=".5" fx=".45" fy=".65"><stop offset="0" stopColor="#ffffff" /><stop offset=".75" stopColor={P.whitewater} /><stop offset="1" stopColor={P.whitewater} stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-ww`} x1="0" x2="0" y1="1" y2="0"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor={P.whitewater} /><stop offset="1" stopColor={P.whitewaterShade} /></linearGradient>
        <filter id={`${id}-soft2`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".025" /></filter>
        <clipPath id={`${id}-wclip`}><path d={polyPath(b.water)} /></clipPath>
      </defs>
      <rect x={x0} y={-y1} width={x1 - x0} height={y1 - y0} fill={`url(#${id}-sky)`} />
      <g transform="scale(1 -1)">
        <path d={polyPath([...b.bed, [b.bed[1][0], y0 - 1], [b.bed[0][0], y0 - 1]])} fill={SAND} />
        <path d={polyPath(b.water)} fill={`url(#${id}-water)`} />
        <g clipPath={`url(#${id}-wclip)`}>
          <path d={polyPath(dt.translucent)} fill={`url(#${id}-thin)`} />
          {dt.faceLines.map((l, i) => <path key={i} d={linePath(l)} fill="none" stroke="#5fb3bb" strokeOpacity={.32 - i * .04} strokeWidth={.012} />)}
          {dt.plume.map((p, i) => <path key={i} d={smoothClosedPath(p)} fill={`url(#${id}-plume)`} opacity=".7" filter={`url(#${id}-soft)`} />)}
        </g>
        {b.air ? <path d={polyPath(b.air)} fill={`url(#${id}-tube)`} /> : null}
        {/* The surface ahead mirrors the sky: a thin light line along the water. */}
        {surfaceRuns(b.surface, dt.crest).map((run, i) => <path key={`s${i}`} d={linePath(run)} fill="none" stroke={P.lowerFace} strokeWidth={.05} opacity=".8" />)}
        {dt.lace.map((l, i) => <path key={i} d={linePath(l)} fill="none" stroke={FOAM_LIT} strokeWidth={.018} strokeLinecap="round" opacity=".85" />)}
        {/* Whitewater: each patch a soft white mass shaded beneath, its top roughened by bubbles. */}
        {b.foam.map((f, i) => <path key={`f${i}`} d={smoothClosedPath(f)} fill={`url(#${id}-ww)`} filter={`url(#${id}-soft2)`} />)}
        {dt.bubbles.filter((_, i) => i % 2 === 0).map((q, i) => <circle key={i} cx={q.c[0]} cy={q.c[1]} r={q.r * .9} fill={`url(#${id}-bub)`} opacity=".75" />)}
        {b.spray.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={.025} fill={FOAM_LIT} opacity=".8" />)}
        {dt.spindrift.map((s, i) => <line key={i} x1={s.from[0]} y1={s.from[1]} x2={s.to[0]} y2={s.to[1]} stroke="#ffffff" strokeOpacity=".35" strokeWidth={.012} strokeLinecap="round" />)}
        <line x1={x0} x2={x1} y1={0} y2={0} stroke={MUTED} strokeWidth={.012} strokeDasharray=".1 .1" opacity=".5" />
      </g>
    </svg>
  );
}

/**
 * The sea by wind at true scale: a 300 m section of the fully developed sea for several forces, each row tall enough
 * for its own waves, with the Beaufort table's typical open-sea height beside the Pierson–Moskowitz one (real seas
 * rarely reach full development above force 9: duration and fetch limit them).
 */
export function SeaByWind({ forces = [2, 4, 6, 8, 10] }: { forces?: readonly number[] }) {
  const Lm = 300, Wd = 1000, k = Wd / Lm, rows: { F: number; top: number; bottom: number; d: string; text: string }[] = [];
  let top = 0;
  for (const F of forces) {
    const sf = seaSurface(beaufortSpeed(F), { seed: 3 + F }), xs = Array.from({ length: Lm + 1 }, (_, x) => x), eta = xs.map(x => sf.at(x, 0)), hi = Math.max(...eta) * k, lo = Math.min(...eta) * k;
    const base = top + 26 + hi + 4, sea = sf.sea, b = BEAUFORT[F];
    const d = `${linePath(xs.map((x, i) => [x * k, base - eta[i] * k] as FPoint))}L${Wd} ${base - lo + 10}L0 ${base - lo + 10}Z`;
    rows.push({ F, top, bottom: base - lo + 12, d, text: `Force ${F} (${b.name}) · fully developed H⅓ ${sea.height.toFixed(1)} m, T ${sea.period.toFixed(1)} s, L ${sea.wavelength.toFixed(0)} m · Beaufort table ${b.waves[0]}–${b.waves[1]} m · whitecaps ${(sea.whitecaps * 100).toFixed(1)}%` });
    top = base - lo + 18;
  }
  // Labels are HTML above each strip, so they stay readable at any width.
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {rows.map(r => (
        <figure key={r.F} style={{ margin: 0 }}>
          <figcaption style={sheetSmall}>{r.text}</figcaption>
          <svg role="img" aria-label={r.text} viewBox={`0 ${r.top + 22} ${Wd} ${r.bottom - r.top - 22}`} style={{ display: "block", width: "100%", height: "auto" }}>
            <path d={r.d} fill={DEEP} opacity=".85" />
          </svg>
        </figure>
      ))}
    </div>
  );
}

/** A boat's Kelvin wake in plan, for speeds side by side: the same angle at every speed, wider spacing when faster. */
export function WakeFigure({ speeds = [3, 6] }: { speeds?: readonly number[] }) {
  const len = 160;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${speeds.length}, 1fr)`, gap: 8 }}>
      {speeds.map(v => {
        const w = kelvinWake(v, len);
        return (
          <figure key={v} style={{ margin: 0 }}>
            <svg role="img" aria-label={`Kelvin wake at ${v} m/s: arms at ${w.halfAngle}°, transverse waves ${w.transverseWavelength.toFixed(1)} m apart`} viewBox={`-8 ${-len * .42} ${len + 12} ${len * .84}`} style={{ display: "block", width: "100%", height: "auto", background: "#2f6f96", borderRadius: 6 }}>
              {w.arms.map((a, i) => <path key={i} d={linePath(a)} stroke="#fff" strokeOpacity=".35" strokeDasharray="3 3" strokeWidth={.6} fill="none" />)}
              {w.crests.map((c, i) => <path key={i} d={linePath(c)} stroke="#e8f1f7" strokeWidth={.8} fill="none" opacity={.9 - i * .04} />)}
              <path d="M-6 0L2 -2.4L2 2.4Z" fill="#f4efe6" />
            </svg>
            <figcaption style={sheetSmall}>{v} m/s: arms {w.halfAngle}°, transverse crests {w.transverseWavelength.toFixed(1)} m apart.</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/** Rings from a drop, at a few moments. */
export function RippleFigure({ times = [.2, .5, 1, 1.6] }: { times?: readonly number[] }) {
  // One scale for every moment, so the rings' growth reads; the largest fits its cell.
  const maxR = Math.max(...times.flatMap(t => rippleRings(t).map(r => r.radius)), .01), sc = 44 / maxR;
  return (
    <figure style={{ margin: 0 }}>
    <svg role="img" aria-label={`Rings spreading from a drop at ${times.join(", ")} s`} viewBox={`0 0 ${times.length * 100} 100`} style={{ display: "block", width: "100%", height: "auto", background: "#35586f", borderRadius: 6 }}>
      {times.map((t, i) => (
        <g key={t} transform={`translate(${i * 100 + 50} 50)`}>
          {rippleRings(t).map((r, j) => <ellipse key={j} rx={r.radius * sc} ry={r.radius * sc * .45} fill="none" stroke="#dfeaf2" strokeOpacity={Math.min(1, r.amplitude * 12)} strokeWidth={1.4} />)}
        </g>
      ))}
    </svg>
    <figcaption style={sheetSmall}>Rings from a drop at {times.join(", ")} s, left to right.</figcaption>
    </figure>
  );
}

/** Reflections: the mirror rule in side view, and how much the surface reflects by viewing angle (Fresnel). */
export function ReflectionFigure() {
  const pts: FPoint[] = [];
  for (let a = 0; a <= 90; a += 1) pts.push([a * 3, 100 - reflectanceAt(a) * 100]);
  const lake = WATER_COLOURS.find(c => c.id === "mirror-lake")!;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <svg role="img" aria-label="A post on a bank and its reflection, mirrored about the water plane under it" viewBox="0 0 300 150" style={{ display: "block", width: "100%", height: "auto" }}>
        <rect width="300" height="75" fill="#cfe2f0" /><rect y="75" width="300" height="75" fill="#5d86a3" />
        <path d="M120 75L150 60L300 60L300 75Z" fill="#7a8a52" />
        <path d="M120 75L150 90L300 90L300 75Z" fill="#56633a" />
        <rect x="60" y="30" width="4" height="45" fill="#3a2a1e" /><rect x="60" y="75" width="4" height="45" fill="#3a2a1e" opacity=".55" />
        <rect x="220" y="20" width="4" height="40" fill="#3a2a1e" /><rect x="220" y="90" width="4" height="40" fill="#3a2a1e" opacity=".55" />
        <line x1="0" x2="300" y1="75" y2="75" stroke="#fff" strokeOpacity=".6" />
      </svg>
      <p style={{ ...sheetSmall, margin: 0 }}>Left: a post standing in the water reflects whole. Right: a post on a bank is mirrored about the water plane under it, so its reflection starts below the bank's own reflection and shows only the top.</p>
      <svg role="img" aria-label="Reflectance of water by angle below the horizon" viewBox="-36 -10 316 132" style={{ display: "block", width: "100%", height: "auto" }}>
        <path d={linePath(pts)} fill="none" stroke="#2f6f96" strokeWidth={1.6} />
        <line x1={0} x2={270} y1={100} y2={100} stroke={MUTED} strokeWidth={.6} />
        {[0, 30, 60, 90].map(a => <text key={a} x={a * 3} y={116} fontSize="13" fill={MUTED} textAnchor="middle">{a}°</text>)}
        {[0, 50, 100].map(v => <text key={v} x={-6} y={104 - v} fontSize="13" fill={MUTED} textAnchor="end">{v}%</text>)}
      </svg>
      <SwatchList items={lake.swatches.map(s => ({ name: s.name, hex: s.hex }))} />
    </div>
  );
}

/** Meanders in plan at three sinuosities, with point bars on the inside of each bend. */
export function MeanderFigure({ sinuosities = [1.2, 1.7, 2.6] }: { sinuosities?: readonly number[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {sinuosities.map(K => {
        // Point bars lie on the inside of each bend, at its apex: where the turning (curvature) peaks.
        const w = 10, pts = meanderPath({ width: w, sinuosity: K, bends: 2.5, seed: 2, jitter: .07 }), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const minY = Math.min(...ys) - w * 2, maxY = Math.max(...ys) + w * 2, bars: string[] = [];
        const heading = pts.slice(1).map((p, i) => Math.atan2(p[1] - pts[i][1], p[0] - pts[i][0]));
        const turn = heading.map((_, i) => (i < 4 || i >= heading.length - 4 ? 0 : Math.atan2(Math.sin(heading[i + 4] - heading[i - 4]), Math.cos(heading[i + 4] - heading[i - 4]))));
        for (let i = 8; i < turn.length - 8; i++) {
          const win = turn.slice(i - 12, i + 13).map(Math.abs);
          if (Math.abs(turn[i]) < .5 || Math.abs(turn[i]) < Math.max(...win)) continue;
          const a = pts[i - 1], c = pts[i + 1], dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1, side = Math.sign(turn[i]);
          const nx = -dy / l * side, ny = dx / l * side, tx = dx / l, ty = dy / l, b0 = pts[i];
          bars.push(smoothClosedPath([[b0[0] + nx * w * .35 - tx * w * 1.9, b0[1] + ny * w * .35 - ty * w * 1.9], [b0[0] + nx * w * 1.25, b0[1] + ny * w * 1.25], [b0[0] + nx * w * .35 + tx * w * 1.9, b0[1] + ny * w * .35 + ty * w * 1.9], [b0[0] + nx * w * .3, b0[1] + ny * w * .3]]));
        }
        return (
          <figure key={K} style={{ margin: 0 }}>
            <svg role="img" aria-label={`A meander of sinuosity ${K}`} viewBox={`${-w} ${minY} ${Math.max(...xs) + w * 2} ${maxY - minY}`} style={{ display: "block", width: "100%", height: "auto", background: "#8a9a5b", borderRadius: 6 }}>
              <path d={bars.join("")} fill={SAND} />
              <path d={smoothTube(pts, pts.map(() => w))} fill="#3d5c5f" />
            </svg>
            <figcaption style={sheetSmall}>Sinuosity {K} ({K < MEANDERS.sinuosity.meandering[0] ? "sinuous" : "meandering"}); meander length {MEANDERS.wavelength.typical} widths.</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/** Stokes crests vs a sine, and the paths water takes under a wave in deep and shallow water. */
export function WaveShapeFigure() {
  const H = 1, L = 7.1, sine: FPoint[] = [], st = trochoidProfile(H, L, 2 * L);
  for (let x = 0; x <= 2 * L; x += .05) sine.push([x, H / 2 * Math.cos(2 * Math.PI * x / L)]);
  const orbitsDeep: string[] = [], orbitsShallow: string[] = [];
  for (const z of [-.2, -1.2, -2.4]) {
    const c: FPoint[] = [], d: FPoint[] = [];
    for (let i = 0; i < 36; i++) { const th = i / 36 * Math.PI * 2; const o = orbit(1.2, L, z, th), o2 = orbit(1.2, L * 2.2, z, th, 3); c.push([L * .5 + o[0], z + o[1]]); d.push([L * 1.5 + o2[0], z + o2[1]]); }
    orbitsDeep.push(smoothClosedPath(c)); orbitsShallow.push(smoothClosedPath(d));
  }
  return (
    <svg role="img" aria-label="Stokes wave (sharp crests, flat troughs) over a sine wave; water particle orbits, circles in deep water and ellipses in shallow" viewBox={`-0.3 -3.3 ${2 * L + .6} 4.4`} style={{ display: "block", width: "100%", height: "auto" }}>
      <g transform="scale(1 -1)">
        <path d={linePath(sine.map(([x, y]) => [x, y + .6] as FPoint))} fill="none" stroke={MUTED} strokeWidth={.03} strokeDasharray=".1 .08" />
        <path d={linePath(st.map(([x, y]) => [x, y + .6] as FPoint))} fill="none" stroke="#2f6f96" strokeWidth={.05} />
        <path d={orbitsDeep.join("")} fill="none" stroke="#2f6f96" strokeWidth={.03} />
        <path d={orbitsShallow.join("")} fill="none" stroke="#7a5a2e" strokeWidth={.03} />
        <line x1={L * 1.1} x2={2 * L} y1={-3} y2={-3} stroke="#7a5a2e" strokeWidth={.05} />
      </g>
    </svg>
  );
}

/** The WATER1 reference sheet. */
export function WaterSheet() {
  const stages = [.2, .55, .9];
  return (
    <div style={sheetGrid}>
      <SheetCard title="The sea from the shore" wide>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 8 }}>
          {[[2, 25, "Force 2, sun ahead: a glitter path"], [5, 35, "Force 5, sun ahead"], [8, 30, "Force 8, sun behind"]].map(([F, e, t]) => (
            <figure key={String(t)} style={{ margin: 0 }}><SeaScene beaufort={F as number} sunElevation={e as number} sunAhead={F !== 8} width={480} height={270} /><figcaption style={sheetSmall}>{t}</figcaption></figure>
          ))}
        </div>
        <p style={{ ...sheetSmall, margin: 0 }}>Every band mixes the water body with the reflected sky by Fresnel at its own tilt: the horizon goes to sky colour, faces turned to the viewer show the body. Glints appear only where a facet mirrors the sun (Cox–Munk slopes); whitecaps cover the share Monahan & O'Muircheartaigh give.</p>
      </SheetCard>
      <SheetCard title="The sea by wind (fully developed, true scale)" wide>
        <SeaByWind />
        <p style={{ ...sheetSmall, margin: 0 }}>Pierson–Moskowitz: H⅓ ≈ 0.22 U²/g, peak period 2π U₁₉.₅ / (0.877 g). Seen at true scale, real seas are much flatter than most drawings: the steepest steady wave is H/λ ≈ {WAVE_LIMITS.steepest} with a {WAVE_LIMITS.crestAngle}° crest; real waves break near {WAVE_LIMITS.breakSteepness}.</p>
      </SheetCard>
      <SheetCard title="Breakers by beach slope" wide>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 8 }}>
          {(Object.keys(BREAKERS) as BreakerType[]).map(t => (
            <figure key={t} style={{ margin: 0, display: "grid", gap: 4 }}>
              {stages.map(s => <BreakerFigure key={s} type={t} stage={s} height={90} />)}
              <figcaption style={sheetSmall}><b>{t}</b> (ξ₀ {BREAKERS[t].iribarren[0]}–{BREAKERS[t].iribarren[1]}, {BREAKERS[t].beach}). {BREAKERS[t].look}</figcaption>
            </figure>
          ))}
        </div>
      </SheetCard>
      <SheetCard title="Wave shape and the water under it">
        <WaveShapeFigure />
        <p style={{ ...sheetSmall, margin: 0 }}>{WAVE_LIMITS.look.join(" ")} Blue: deep water; brown: water 3 m deep over the bed.</p>
      </SheetCard>
      <SheetCard title="Wakes and ripples">
        <WakeFigure />
        <RippleFigure />
        <p style={{ ...sheetSmall, margin: 0 }}>A Kelvin wake keeps its 19.47° arms at any ordinary speed; faster boats space the transverse crests further apart. Ripples under 1.7 cm are capillary waves, never slower than 0.23 m/s.</p>
      </SheetCard>
      <SheetCard title="Reflections">
        <ReflectionFigure />
        <p style={{ ...sheetSmall, margin: 0 }}>A reflection hangs from the water plane directly under the object, so things set back on a bank show only their tops. Water reflects about 2% looking straight down and nearly everything at the horizon; the measured lake reflects the sky at about 0.6 of its luminance and dark forest at nearly its own value.</p>
      </SheetCard>
      <SheetCard title="Rivers">
        <MeanderFigure />
        <p style={{ ...sheetSmall, margin: 0 }}>{MEANDERS.look.join(" ")} Bend radius {MEANDERS.radius.min}–{MEANDERS.radius.max} channel widths.</p>
      </SheetCard>
      <SheetCard title="Water colours" wide>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
          {WATER_COLOURS.map(c => (
            <div key={c.id} style={{ display: "grid", gap: 4 }}>
              <b style={{ font: "600 14px var(--km-font-sans, system-ui, sans-serif)" }}>{c.label} <span style={{ ...sheetSmall }}>({c.grade})</span></b>
              <SwatchList items={c.swatches.map(s => ({ name: s.name, hex: s.hex }))} />
              <span style={sheetSmall}>{c.why}{c.reference ? <> <a href={c.reference.url}>{c.reference.title}</a> ({c.reference.rights}).</> : null}</span>
            </div>
          ))}
          <div style={{ display: "grid", gap: 4 }}>
            <b style={{ font: "600 14px var(--km-font-sans, system-ui, sans-serif)" }}>Sand seen through depth <span style={sheetSmall}>(estimated)</span></b>
            <SwatchList items={[0, 1, 2, 4, 8, 16].map(d => ({ name: `${d} m`, hex: throughWater(SAND, DEEP, d) }))} />
          </div>
        </div>
      </SheetCard>
      <SheetCard title="Sources" wide>
        <ul style={{ ...sheetList, ...sheetSmall }}>{WATER_SOURCES.map(s => <li key={s.url}><a href={s.url}>{s.title}</a></li>)}</ul>
        <p style={{ ...sheetSmall, margin: 0 }}>Sea for force 6: {fullyDevelopedSea(beaufortSpeed(6)).height.toFixed(1)} m; glitter half-height at 7 m/s about {glitterPath(20, 7).halfHeight.toFixed(0)}°.</p>
      </SheetCard>
    </div>
  );
}

export { seaForBeaufort };
