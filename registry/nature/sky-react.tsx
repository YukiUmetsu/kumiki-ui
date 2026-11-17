/**
 * SKY1 React pieces: a cloud painted from its shape, a weather scene drawn from a weather state (sky, cloud deck in
 * perspective, hills fading with distance, rain, snow, a rainbow and lightning), and the reference sheet. They show the
 * data and the construction; styles paint the same shapes their own way.
 */
import { useId } from "react";
import type { ReactNode } from "react";
import type { FPoint } from "../anatomy/foundation-shapes";
import { linePath, seeded, smoothClosedPath } from "../anatomy/foundation-shapes";
import { MUTED, SheetCard, sheetGrid, sheetList, sheetSmall, SwatchList } from "../anatomy/foundation-react";
import { growPlant, plantConstruction, plantShapes } from "../anatomy/plant-construct";
import type { PlantShapes, PlantSkeleton } from "../anatomy/plant-construct";
import { TreePaint } from "../anatomy/plant-react";
import type { CloudGenus } from "./sky-data";
import { BEAUFORT, CLOUD_GENERA, HYDROMETEORS, LIGHTNING, RAIN_CLASSES, RAINBOW, SKY_PHASES, SKY_SOURCES } from "./sky-data";
import type { CloudOptions, CloudShape, CloudTone } from "./sky-clouds";
import { cloudDeck, cloudShape } from "./sky-clouds";
import { CUMULUS_LADDERS, ladderColour } from "./sky-cumulus";
import type { WeatherInput, WeatherState } from "./sky-physics";
import { cloudBase, contrastAt, dropFallSpeed, dropSpectrum, exposureTime, lightningChannel, lightningFlash, mixColour, rainbow, streakLength, thunderDelay, weatherState } from "./sky-physics";

const toneColour = (genus: CloudGenus, tone: CloudTone, light = 1) => {
  const c = CLOUD_GENERA[genus].colours, base = mixColour(c.shade, "#2c3138", .35);
  const raw = tone === "lit" ? c.lit : tone === "mid" ? mixColour(c.lit, c.shade, .5) : tone === "shade" ? c.shade : tone === "base" ? base : c.shade;
  return light >= 1 ? raw : mixColour("#10141c", raw, light);
};

/** A cloud's layers as SVG (inside an `<svg>` whose y axis already points up). `fade` mixes it toward `horizon` (distance haze). */
export function CloudLayers({ shape, light = 1, colours, fade = 0, horizon = "#b8c4cc" }: { shape: CloudShape; light?: number; colours?: Partial<Record<CloudTone, string>>; fade?: number; horizon?: string }) {
  const id = `sky${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const layer = (l: CloudShape["layers"][number], i: number) => <path key={i} d={l.d} fill={mixColour(colours?.[l.tone] ?? toneColour(shape.genus, l.tone, light), horizon, Math.max(fade, l.fade ?? 0))} opacity={l.opacity} clipPath={l.clip ? `url(#${id}-clip)` : undefined} />;
  const at = shape.lumps ? shape.lumpsAt ?? 0 : shape.layers.length;
  return (
    <g>
      <clipPath id={`${id}-clip`}><path d={shape.outline} /></clipPath>
      {shape.layers.slice(0, at).map(layer)}
      {shape.lumps ? <LumpLayer shape={shape} light={light} fade={fade} horizon={horizon} id={id} /> : null}
      {shape.layers.slice(at).map((l, i) => layer(l, i + at))}
    </g>
  );
}

const LUMP_LEVELS = 14;
/** A lump as a slightly irregular rounded shape (two low harmonics on its radius), so no perfect circles show. */
function lumpPath(l: { c: readonly [number, number]; r: number }, i: number) {
  const p1 = (i * 2.399) % (Math.PI * 2), p2 = (i * 1.731) % (Math.PI * 2), pts: [number, number][] = [];
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, rr = l.r * (1 + .06 * Math.sin(3 * a + p1) + .04 * Math.sin(5 * a + p2)); pts.push([l.c[0] + Math.cos(a) * rr, l.c[1] + Math.sin(a) * rr]); }
  return smoothClosedPath(pts);
}
/**
 * A heaped cloud's lumps, back to front. Each lump first casts a soft occlusion shadow down and away from the sun onto
 * what lies behind it (the crevices), then is painted with its crown brightest toward the sun, fading into its own
 * tone with no dark rim, so lumps read by their crowns, not as balls. A body half-tone fills the gaps, the flat base
 * darkens in a band, and a slight blur turns vector edges into vapour.
 */
function LumpLayer({ shape, light, fade, horizon, id }: { shape: CloudShape; light: number; fade: number; horizon: string; id: string }) {
  const ladder = CUMULUS_LADDERS[shape.ladder ?? "fair"], w = shape.width, h = shape.height, sun = shape.sunSide ?? -1;
  const tone = (t: number) => mixColour(light >= 1 ? ladderColour(ladder, t) : mixColour("#10141c", ladderColour(ladder, t), light), horizon, fade);
  const fx = .5 + sun * .2, fy = .74, shade = tone(.12);
  const flat = !!shape.flatBase, lumps = flat ? shape.lumps!.filter(l => l.c[1] + l.r * .3 > h * .06) : shape.lumps!;
  return (
    <g>
      <defs>
        <clipPath id={`${id}-base`}><rect x={-w * 3} y={0} width={w * 6} height={h * 4} /></clipPath>
        <clipPath id={`${id}-mass`}>{shape.lumps!.filter(l => l.level === 0).map((l, i) => <circle key={i} cx={l.c[0]} cy={l.c[1]} r={l.r} />)}</clipPath>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={flat ? w * .0018 : .5} /></filter>
        <radialGradient id={`${id}-occ`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={shade} stopOpacity=".55" /><stop offset=".7" stopColor={shade} stopOpacity=".22" /><stop offset="1" stopColor={shade} stopOpacity="0" /></radialGradient>
        {/* Half-tone lumps: a gentle crown, so the face keeps its texture in shade. */}
        {Array.from({ length: LUMP_LEVELS }, (_, k) => {
          const t = k / (LUMP_LEVELS - 1);
          return (
            <radialGradient key={`h${k}`} id={`${id}-h${k}`} cx=".5" cy=".5" r=".5" fx={fx} fy={fy}>
              <stop offset="0" stopColor={tone(Math.min(1, t + .045))} /><stop offset=".6" stopColor={tone(t)} /><stop offset="1" stopColor={tone(t * .95)} />
            </radialGradient>
          );
        })}
        {/* Silver lining: bright only at the lump's outer edge, in eight directions. */}
        {Array.from({ length: 8 }, (_, k) => {
          const a = k / 8 * Math.PI * 2;
          return (
            <radialGradient key={`rim${k}`} id={`${id}-rim${k}`} cx={.5 - Math.cos(a) * .3} cy={.5 - Math.sin(a) * .3} r=".85">
              <stop offset=".72" stopColor="#ffffff" stopOpacity="0" /><stop offset=".88" stopColor="#fffdf6" stopOpacity="1" /><stop offset=".96" stopColor="#ffffff" stopOpacity=".7" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          );
        })}
        <linearGradient id={`${id}-baseg`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={tone(.18)} stopOpacity=".6" /><stop offset=".45" stopColor={tone(.3)} stopOpacity=".25" /><stop offset="1" stopColor={tone(.3)} stopOpacity="0" /></linearGradient>
        {/* The big forms: a bright cap toward the sun, rolling down to a shaded underside. */}
        {Array.from({ length: LUMP_LEVELS }, (_, k) => {
          const t = k / (LUMP_LEVELS - 1);
          return (
            <radialGradient key={`m${k}`} id={`${id}-m${k}`} cx=".5" cy=".5" r=".5" fx={.5 + sun * .16} fy={.7}>
              <stop offset="0" stopColor={tone(Math.min(1, t + .08))} /><stop offset=".5" stopColor={tone(t)} /><stop offset=".85" stopColor={tone(t * .86)} /><stop offset="1" stopColor={tone(t * .78)} />
            </radialGradient>
          );
        })}
        {Array.from({ length: LUMP_LEVELS }, (_, k) => {
          const t = k / (LUMP_LEVELS - 1);
          return (
            <radialGradient key={k} id={`${id}-l${k}`} cx=".5" cy=".5" r=".5" fx={fx} fy={fy}>
              <stop offset="0" stopColor={tone(Math.min(1, t + .07))} /><stop offset=".55" stopColor={tone(t)} /><stop offset="1" stopColor={tone(t * .94)} />
            </radialGradient>
          );
        })}
      </defs>
      <g clipPath={flat ? `url(#${id}-base)` : undefined} filter={`url(#${id}-soft)`}>
        {/* The body: every mass in a half-tone first, so no sky shows between lumps (the star-shaped outline would
            bridge the notches between towers, so it is not filled). */}
        {shape.lumps!.filter(l => l.level === 0).map((l, i) => <circle key={`b${i}`} cx={l.c[0]} cy={l.c[1]} r={l.r * .97} fill={tone(Math.min(.55, l.light))} opacity={l.opacity < 1 ? l.opacity : undefined} />)}
        {lumps.map((l, i) => (
          <g key={i} opacity={l.opacity < 1 ? l.opacity : undefined}>
            <ellipse cx={l.c[0] - sun * l.r * .18} cy={l.c[1] - l.r * .42} rx={l.r * 1.05} ry={l.r * .9} fill={`url(#${id}-occ)`} opacity={(l.level === 0 ? .7 : .45) * Math.max(.25, l.light) ** 1.5} />
            {/* Sunlit lumps carry their crown highlight; lumps in half-tone and shadow are flat, separated by the crevice shadows. */}
            <path d={lumpPath(l, i)} fill={l.light < .42 ? tone(l.light * (l.level === 0 ? .96 : 1)) : `url(#${id}-${l.level === 0 ? "m" : l.light < .72 ? "h" : "l"}${Math.round(l.light * (LUMP_LEVELS - 1))})`} />
            {l.glow ? <path d={lumpPath(l, i)} fill={`url(#${id}-rim${Math.round(((l.out ?? 0) / (Math.PI * 2) + 1) * 8) % 8})`} opacity={Math.min(1, l.glow * 1.4)} /> : null}
          </g>
        ))}
        {flat ? <rect x={-w * 3} y={0} width={w * 6} height={h * .2} fill={`url(#${id}-baseg)`} clipPath={`url(#${id}-mass)`} /> : null}
      </g>
    </g>
  );
}

/** One genus drawn on its own sky. */
export function CloudFigure({ genus, options, label, height = 150 }: { genus: CloudGenus; options?: CloudOptions; label?: string; height?: number }) {
  const s = cloudShape(genus, options), [x0, y0, x1, y1] = s.bounds, pad = (x1 - x0) * .06, W = x1 - x0 + pad * 2, H = y1 - y0 + pad * 2;
  const id = `sky${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg role="img" aria-label={label ?? `${genus} cloud`} viewBox={`${x0 - pad} ${-y1 - pad} ${W} ${H}`} style={{ display: "block", width: "100%", height, background: `linear-gradient(#2f69a6, #6f9ccb 70%, #9fbdd8)`, borderRadius: 6 }} preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4f7fb3" /><stop offset="1" stopColor="#9cbad2" /></linearGradient></defs>
      <g transform="scale(1 -1)"><CloudLayers shape={s} /></g>
    </svg>
  );
}

export interface WeatherSceneProps {
  weather: WeatherInput | WeatherState;
  width?: number; height?: number;
  /** Time in seconds (moves rain, snow and the lightning flash). */
  time?: number;
  /** Seconds since a lightning flash began (when the weather has thunder). */
  flashAge?: number;
  seed?: number;
  label?: string;
  /** Draw the rainbow when the sun is behind the viewer and it rains. */
  rainbowVisible?: boolean;
}

const isState = (w: WeatherInput | WeatherState): w is WeatherState => "sky" in w;

/**
 * A weather scene in a level pinhole camera: eye 1.6 m up, horizon at 62% of the height, focal length 0.8 × width.
 * Rain streaks are the drops over 2 mm within 2–8 m, at their real fall speed and slant, exposed for 1/48 s (24 fps,
 * 180° shutter); farther rain becomes the veil that the visibility sets. Hills at 0.3, 1, 3 and 8 km fade toward the
 * horizon colour by the Koschmieder contrast.
 */
/** Scene trees grown once per species, seed and month (the scene redraws every frame for rain and snow). */
const TREE_CACHE = new Map<string, { sk: PlantSkeleton; sh: PlantShapes }>();
function sceneTree(plant: string, seed: number, month: 1 | 7) {
  const key = `${plant}|${seed}|${month}`;
  let t = TREE_CACHE.get(key);
  if (!t) {
    const sk = growPlant(plantConstruction(plant), { seed, month });
    t = { sk, sh: plantShapes(sk) };
    if (TREE_CACHE.size > 64) TREE_CACHE.clear();
    TREE_CACHE.set(key, t);
  }
  return t;
}

export function WeatherScene({ weather, width = 640, height = 360, time = 0, flashAge, seed = 1, label, rainbowVisible = true }: WeatherSceneProps) {
  const st = isState(weather) ? weather : weatherState(weather), id = `sky${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const W = width, H = height, horizon = H * .62, f = W * .8, rnd = seeded(seed);
  const flash = st.thunder && flashAge !== undefined ? lightningFlash(seed).at(flashAge) : 0;
  const sky = st.sky.stops, skyTop = sky[2].colour, skyMid = sky[1].colour, skyHz = sky[0].colour;
  const lit = (c: string) => (flash > 0 ? mixColour(c, LIGHTNING.colour, flash * .6) : c);
  // Hills: farther ridges lower and paler.
  const ground = st.precipitation === "snow" ? "#e8ecef" : "#4d5a3c";
  // Hills on the ground plane: each ridge's foot at its distance, its height in metres; farther ridges paler.
  const ridges = ([[8, 420], [3, 150], [1, 45], [.3, 9]] as const).map(([km, metres], i) => {
    const r = seeded(seed * 13 + i), foot = horizon + f * 1.6 / (km * 1000), amp = f * metres / (km * 1000), p1 = r() * 6, p2 = r() * 6, f1 = 1 + r() * 1.5, f2 = 3 + r() * 3;
    const top: FPoint[] = [];
    for (let k = 0; k <= 32; k++) { const u = k / 32; top.push([W * (u * 1.2 - .1), foot - amp * Math.max(.05, .5 + .35 * Math.sin(u * f1 * 6.283 + p1) + .15 * Math.sin(u * f2 * 6.283 + p2))]); }
    const c = contrastAt(km, st.visibility), shadeGround = mixColour(ground, "#1d241a", st.precipitation === "snow" ? 0 : .3 * i / 3);
    const curve = top.map((p, k) => `${k ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
    return { d: `${curve}L${(W * 1.1).toFixed(1)} ${(foot + 1).toFixed(1)}L${(-W * .1).toFixed(1)} ${(foot + 1).toFixed(1)}Z`, fill: lit(mixColour(skyHz, shadeGround, c)), km };
  });
  // The ground plane itself, fading toward the horizon by distance (d = focal × eye height ÷ depth below the horizon).
  const groundStops = [0, .02, .06, .15, .35, 1].map(t => { const y = horizon + t * (H - horizon), d = f * 1.6 / Math.max(.5, y - horizon); return { t, colour: lit(mixColour(skyHz, ground, contrastAt(d / 1000, st.visibility))) }; });
  // FLORA1 trees on the ground plane at 30–300 m (bare in snow), so the fade with distance reads near at hand too.
  // Painted in FLORA1's crown detail: tufts lit by the sun (from above under overcast), sky holes, shaded trunks; as
  // much detail as their size on screen shows, faded toward the horizon colour by Koschmieder contrast.
  const overcast = st.cover >= .85 || st.precipitation !== "none", sunDeg = (st.sky.phase.sun[0] + Math.min(60, st.sky.phase.sun[1])) / 2;
  const treeDim = Math.min(.85, (overcast ? .3 : 0) + (1 - Math.max(.15, Math.min(1, (st.sky.phase.sun[1] + 12) / 22))) * .8);
  const trees = ([["japanese-cedar", 300, 22], ["zelkova", 120, 16], ["camphor", 60, 12], ["zelkova", 30, 10]] as const).map(([plant, d, metres], i) => {
    const k = f / d, x = W * (.1 + i * .25), y = horizon + k * 1.6, c = contrastAt(d / 1000, st.visibility);
    const { sk, sh } = sceneTree(plant, seed + i, st.precipitation === "snow" ? 1 : 7), sc = metres / sh.bounds[3] * k, px = metres * k;
    return <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(3)} ${(-sc).toFixed(3)})`}>
      <TreePaint skeleton={sk} shapes={sh} detail={px > 220 ? "full" : px > 90 ? "medium" : "low"} sunAzimuth={overcast ? 0 : 35} sunElevation={overcast ? 85 : Math.max(5, sunDeg)}
        haze={{ colour: lit(skyHz), amount: Math.min(1, 1 - c) }} dim={treeDim} wet={st.precipitation === "rain" || st.precipitation === "drizzle"} lineWidth={1 / sc} seed={seed + i} />
    </g>;
  });
  // Clouds on their deck: one base plane per genus, receding to the horizon. Rain fills only the column under the
  // base, so the path up to the clouds keeps more contrast than the horizontal visibility (×2.5, estimated).
  const light = Math.max(.15, Math.min(1, (st.sky.phase.sun[1] + 12) / 22));
  const clouds: ReactNode[] = st.clouds.flatMap((genus, gi) => cloudDeck(genus, { width: W, height: H, horizonY: horizon, focal: f, seed: seed + gi, cover: st.cover, visibility: Math.max(st.visibility * 2.5, 8) })
    .map((it, i) => <g key={`${genus}-${i}`} transform={`translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) scale(${it.scale.toFixed(5)} ${(-it.scale).toFixed(5)})`}><CloudLayers shape={it.shape} light={light} fade={it.fade} horizon={lit(skyHz)} /></g>));
  // Rain and snow.
  const marks: ReactNode[] = [];
  if (st.precipitation === "rain" || st.precipitation === "hail") {
    const exp = exposureTime(24), vol = (W * H) / (f * f) * (8 ** 3 - 2 ** 3) / 3;
    const count = st.precipitation === "hail" ? 160 : Math.min(1400, Math.round(dropSpectrum(st.rate).larger(2) * vol));
    for (let i = 0; i < count; i++) {
      const z = 2 + 6 * Math.cbrt(rnd()), D = st.precipitation === "hail" ? 15 : 2 + rnd() * 2.5, v = st.precipitation === "hail" ? st.fallSpeed : dropFallSpeed(D);
      const L = streakLength(v, st.wind, exp) * f / z, ux = st.wind / Math.hypot(v, st.wind || 1e-9) * (st.wind ? 1 : 0), uy = v / Math.hypot(v, st.wind);
      const travel = (time * v * f / z) % (H + L), x = (rnd() * (W + 200) - 100 + time * st.wind * f / z) % (W + 200) - 50, y = ((rnd() * (H + L)) + travel) % (H + L) - L;
      const a = Math.max(.08, .55 * contrastAt(z / 1000, st.visibility) * (2.5 / z + .3));
      marks.push(st.precipitation === "hail"
        ? <circle key={i} cx={x} cy={y} r={Math.max(.8, .007 * f / z)} fill="#f4f6f8" opacity={a + .2} />
        : <line key={i} x1={x} y1={y} x2={x + ux * L} y2={y + uy * L} stroke="#e6eef6" strokeWidth={Math.max(.6, D / 1000 * f / z * .8)} strokeLinecap="round" opacity={a} />);
    }
  } else if (st.precipitation === "snow") {
    const count = Math.round(Math.min(700, 150 / st.visibility)), fl = st.flutter ?? { amplitude: .07, period: 1 };
    for (let i = 0; i < count; i++) {
      const z = 1.5 + 10 * rnd(), ph = rnd() * 6.283, k = f / z;
      const x = ((rnd() * (W + 200) + time * st.wind * k + Math.sin(time * 6.283 / fl.period + ph) * fl.amplitude * k) % (W + 200) + W + 200) % (W + 200) - 100;
      const y = (rnd() * H + time * st.fallSpeed * k) % H;
      marks.push(<circle key={i} cx={x} cy={y} r={Math.max(.7, st.diameter / 1000 * k * 2.5)} fill="#ffffff" opacity={Math.max(.25, Math.min(.95, 2 / z + .15))} />);
    }
  }
  // Rainbow: centred on the antisolar point below the horizon.
  let bow: ReactNode = null;
  // A rainbow needs the sun shining from behind the viewer: rain with broken cloud, the sun under 42°.
  if (rainbowVisible && st.precipitation === "rain" && st.cover < .75 && st.sky.phase.id !== "night") {
    const sun = Math.max(0, Math.min(40, st.sky.phase.id === "day" ? 25 : 6)), g = rainbow(sun), cy = horizon + f * Math.tan(sun * Math.PI / 180);
    if (g.visible) bow = <g opacity=".55">{RAINBOW.colours.map((c, i) => <circle key={c} cx={W * .68} cy={cy} r={f * Math.tan((g.primary[0] - i * RAINBOW.width / RAINBOW.colours.length) * Math.PI / 180)} fill="none" stroke={c} strokeWidth={f * Math.tan(RAINBOW.width / RAINBOW.colours.length * Math.PI / 180) * 1.2} />)}</g>;
  }
  // Lightning.
  let bolt: ReactNode = null;
  if (flash > 0) {
    const ch = lightningChannel([W * .3, horizon - H * .55], [W * .36, horizon - H * .02], { seed });
    bolt = <g stroke={LIGHTNING.colour} fill="none" strokeLinejoin="round" opacity={Math.min(1, flash * 1.4)}>{ch.map((p, i) => <path key={i} d={linePath(p)} strokeWidth={i ? 1.2 : 2.6} />)}</g>;
  }
  return (
    <svg role="img" aria-label={label ?? st.notes.join(" ")} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto", borderRadius: 6 }}>
      <defs>
        <linearGradient id={`${id}-ground`} x1="0" x2="0" y1="0" y2="1">{groundStops.map(s => <stop key={s.t} offset={s.t} stopColor={s.colour} />)}</linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2={horizon / H}>
          <stop offset="0" stopColor={lit(skyTop)} /><stop offset=".55" stopColor={lit(skyMid)} /><stop offset="1" stopColor={lit(skyHz)} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      {bow}
      {clouds}
      {bolt}
      <rect y={horizon} width={W} height={H - horizon} fill={`url(#${id}-ground)`} />
      {ridges.map(r => <path key={r.km} d={r.d} fill={r.fill} />)}
      {trees}
      <rect width={W} height={H} fill={lit(skyHz)} opacity={Math.max(0, 1 - contrastAt(.01, st.visibility)) * .9} />
      {marks}
    </svg>
  );
}

function PhaseStrip() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
      {SKY_PHASES.map(p => (
        <figure key={p.id} style={{ margin: 0, display: "grid", gap: 4 }}>
          <div aria-hidden style={{ height: 90, borderRadius: 6, background: `linear-gradient(${p.zenith}, ${p.mid} 60%, ${p.horizon})`, position: "relative" }} />
          <figcaption style={sheetSmall}><b>{p.label}</b> · sun {p.sun[0]}° to {p.sun[1]}° · {p.grade}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/** The ten genera at their heights: high (5–12 km), middle (2–7 km), low (under 2 km), and the vertical clouds that span them. */
export function CloudAtlas() {
  const H = 12000, Wd = 1040, rows: { g: CloudGenus; x: number }[] = [
    // The left 60 units stay clear for the height labels.
    { g: "cirrus", x: 160 }, { g: "cirrocumulus", x: 385 }, { g: "cirrostratus", x: 590 }, { g: "altocumulus", x: 190 }, { g: "altostratus", x: 470 },
    { g: "stratocumulus", x: 172 }, { g: "cumulus", x: 334 }, { g: "stratus", x: 500 }, { g: "nimbostratus", x: 690 }, { g: "cumulonimbus", x: 915 },
  ];
  const yOf = (m: number) => 380 - m / H * 360;
  return (
    // Labels stay at least 12 px: below 860 px wide the atlas scrolls sideways inside its card instead of shrinking.
    <div style={{ overflowX: "auto" }} tabIndex={0} aria-label="Cloud atlas, scrolls sideways on narrow screens">
    <svg role="img" aria-label="The ten cloud genera drawn at their heights" viewBox={`0 0 ${Wd} 400`} style={{ display: "block", width: "100%", minWidth: 860, height: "auto", borderRadius: 6, background: "linear-gradient(#3f6e9f, #a9c4d8)" }}>
      {[2000, 5000, 7000, 12000].map(m => <g key={m}><line x1={0} x2={Wd} y1={yOf(m)} y2={yOf(m)} stroke="#fff" strokeOpacity=".35" strokeDasharray="4 6" /><text x={6} y={yOf(m) - 4} fill="#fff" fontSize="15">{m / 1000} km</text></g>)}
      {rows.map(({ g, x }) => {
        const rec = CLOUD_GENERA[g], base = cloudBase(g), w = rec.form === "tower" ? 140 : rec.form === "heaps" ? 110 : rec.level === "low" || rec.level === "vertical" ? 180 : 200;
        // The anvil leans left over the empty sky; the tower is drawn from its base to 10 km.
        const s = cloudShape(g, { width: w, seed: 2, species: "mediocris", wind: rec.form === "tower" ? -1 : 1 }), y = rec.form === "tower" ? yOf(rec.base[0]) : yOf(base);
        const sc = rec.form === "tower" ? (yOf(rec.base[0]) - yOf(10000)) / s.height : 1;
        return (
          <g key={g}>
            <g transform={`translate(${x} ${y}) scale(${sc} ${-sc})`}><CloudLayers shape={s} /></g>
            <text x={x} y={Math.min(394, y + 17)} fill="#fff" fontSize="15" textAnchor="middle" style={{ paintOrder: "stroke" }} stroke="#26405c" strokeWidth={3}>{rec.abbr} {g}</text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/** The SKY1 reference sheet. */
export function SkySheet() {
  const exp = exposureTime(24);
  return (
    <div style={sheetGrid}>
      <SheetCard title="Clouds by height (WMO genera)" wide>
        <CloudAtlas />
        <p style={{ ...sheetSmall, margin: 0 }}>Heights for temperate latitudes (reported: Wikipedia, List of cloud types). The cumulonimbus is drawn compressed; its anvil spreads at the tropopause.</p>
      </SheetCard>
      {(Object.keys(CLOUD_GENERA) as CloudGenus[]).map(g => {
        const r = CLOUD_GENERA[g];
        return (
          <SheetCard key={g} title={`${r.abbr} ${g} · ${r.ja}`}>
            <CloudFigure genus={g} options={{ seed: 3 }} label={`${g}: ${r.look}`} />
            <p style={{ ...sheetSmall, margin: 0 }}>{r.look} {r.weather}</p>
            <p style={{ ...sheetSmall, margin: 0 }}>{r.level}, base {r.base[0] / 1000}–{r.base[1] / 1000} km{r.top ? `, tops to ${r.top[1] / 1000} km` : ""}. Reference: <a href={r.reference.url}>{r.reference.title}</a> ({r.reference.rights}).</p>
          </SheetCard>
        );
      })}
      <SheetCard title="The sky through the day" wide>
        <PhaseStrip />
        <p style={{ ...sheetSmall, margin: 0 }}>Measured palettes were sampled off one photograph each (exposure and white balance vary); the others are estimated. Twilight bands are reported; golden and blue hour have several definitions.</p>
      </SheetCard>
      <SheetCard title="Rain, snow and fog" wide>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 8 }}>
          {([["Light rain, calm", { precipitation: "rain", intensity: "light" }], ["Heavy rain, force 6", { precipitation: "rain", intensity: "heavy", wind: 6 }], ["Moderate snow, force 3", { precipitation: "snow", intensity: "moderate", wind: 3 }], ["Fog", { obscurity: "fog", clouds: ["stratus"], cover: 1 }]] as const).map(([t, w]) => (
            <figure key={t} style={{ margin: 0, display: "grid", gap: 4 }}>
              <WeatherScene weather={w as WeatherInput} width={480} height={270} label={t} />
              <figcaption style={sheetSmall}><b>{t}.</b> {weatherState(w as WeatherInput).notes.join(" ")}</figcaption>
            </figure>
          ))}
        </div>
      </SheetCard>
      <SheetCard title="Drops and flakes">
        <ul style={{ ...sheetList, ...sheetSmall }}>
          {[1, 2, 3, 5].map(d => <li key={d}>{d} mm drop: falls {dropFallSpeed(d).toFixed(1)} m/s; a {streakLength(dropFallSpeed(d), 0, exp).toFixed(2)} m streak at 1/48 s.</li>)}
          {RAIN_CLASSES.map(c => <li key={c.id}>{c.label}: {c.range[0]}–{c.range[1]} mm/h; median drop {dropSpectrum((c.range[0] + c.range[1]) / 2 || 1).medianDiameter.toFixed(1)} mm.</li>)}
          {Object.values(HYDROMETEORS).map(h => <li key={h.id}>{h.id}: {h.size.min}–{h.size.max} mm, {h.fallSpeed.min}–{h.fallSpeed.max} m/s ({h.fallSpeed.grade}). {h.look[0]}</li>)}
        </ul>
      </SheetCard>
      <SheetCard title="Wind (Beaufort)">
        <ul style={{ ...sheetList, ...sheetSmall }}>
          {BEAUFORT.filter(b => b.force % 2 === 0 || b.force === 3).map(b => <li key={b.force}><b>{b.force} {b.name}</b> ({b.speed[0]}–{b.speed[1]} m/s): {b.land}.</li>)}
        </ul>
      </SheetCard>
      <SheetCard title="Lightning, thunder, rainbow">
        <LightningTimeline />
        <ul style={{ ...sheetList, ...sheetSmall }}>
          {LIGHTNING.look.map(t => <li key={t}>{t}</li>)}
          <li>Thunder from 1 km: {thunderDelay(1).toFixed(1)} s; from 5 km: {thunderDelay(5).toFixed(1)} s.</li>
          {RAINBOW.look.map(t => <li key={t}>{t}</li>)}
        </ul>
        <SwatchList items={RAINBOW.colours.map((hex, i) => ({ name: ["red", "orange", "yellow", "green", "blue", "violet"][i], hex }))} />
      </SheetCard>
      <SheetCard title="Sources" wide>
        <ul style={{ ...sheetList, ...sheetSmall }}>{SKY_SOURCES.map(s => <li key={s.url}><a href={s.url}>{s.title}</a></li>)}</ul>
      </SheetCard>
    </div>
  );
}

/** A flash's brightness over its strokes (the strobe), 0 to 0.3 s. */
export function LightningTimeline({ seed = 2 }: { seed?: number }) {
  const fl = lightningFlash(seed), T = .3, pts: FPoint[] = [];
  for (let i = 0; i <= 300; i++) { const t = i / 300 * T; pts.push([i / 300 * 300, 60 - fl.at(t) * 54]); }
  return (
    <svg role="img" aria-label={`A flash of ${fl.strokes.length} strokes over ${(fl.duration * 1000).toFixed(0)} ms`} viewBox="0 0 300 78" style={{ display: "block", width: "100%", height: "auto" }}>
      <path d={smoothClosedPath([[0, 60], [300, 60], [300, 61], [0, 61]])} fill={MUTED} />
      <path d={linePath(pts)} fill="none" stroke="#5a78c8" strokeWidth={1.4} />
      {[0, .1, .2, .3].map(t => <text key={t} x={t / T * 300} y={75} fontSize="11" fill={MUTED} textAnchor={t === 0 ? "start" : t === T ? "end" : "middle"}>{(t * 1000).toFixed(0)} ms</text>)}
    </svg>
  );
}
