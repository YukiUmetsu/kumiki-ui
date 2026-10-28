import type { ReactNode } from "react";
import type { BranchingFrame, BranchingFrameGeometry, BranchingTheme } from "./interactive-branching-player";
import { worldLand } from "./branching-world-map";

/*
 * Frame art for InteractiveBranchingPlayer. Every frame is generated for the
 * measured stage, so stones, flutes and blossoms keep their proportions at any
 * width or aspect instead of stretching a fixed illustration. Randomness is
 * seeded: the same size always produces the same frame.
 */

type Pt = readonly [number, number];
type Rect = BranchingFrameGeometry["window"];
type Rng = () => number;

function seeded(seed: number): Rng {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const n = (value: number) => Math.round(value * 10) / 10;
const xy = (p: Pt) => `${n(p[0])} ${n(p[1])}`;
const svgProps = (g: BranchingFrameGeometry) => ({
  viewBox: `0 0 ${g.width} ${g.height}`, width: g.width, height: g.height, "aria-hidden": true as const, focusable: "false" as const,
});

/** Catmull-Rom samples through control points. */
function smooth(points: Pt[], samples = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < samples; s++) {
      const t = s / samples, t2 = t * t, t3 = t2 * t;
      const axis = (k: 0 | 1) => .5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([axis(0), axis(1)]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** A filled outline that narrows from `start` to `end` width (or follows `widthAt`): stems, branches, twigs. */
function taper(points: Pt[], start: number, end: number, widthAt?: (t: number) => number): string {
  const line = smooth(points);
  const left: Pt[] = [], right: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
    const t = i / (line.length - 1), half = (widthAt ? widthAt(t) : lerp(start, end, t)) / 2;
    left.push([p[0] + nx * half, p[1] + ny * half]);
    right.push([p[0] - nx * half, p[1] - ny * half]);
  });
  return `M${left.map(xy).join("L")}L${right.reverse().map(xy).join("L")}Z`;
}

/** Position and heading at fraction `t` along a smoothed path. */
function along(points: Pt[], t: number): { p: Pt; angle: number } {
  const line = smooth(points);
  const i = Math.min(line.length - 2, Math.max(0, Math.round(t * (line.length - 1))));
  const a = line[i], b = line[i + 1];
  return { p: a, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}

/** A polygon with softened, slightly irregular corners. */
function roundedPoly(points: Pt[], radius: number): string {
  const parts: string[] = [];
  points.forEach((p, i) => {
    const prev = points[(i - 1 + points.length) % points.length], next = points[(i + 1) % points.length];
    const toward = (q: Pt) => {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, r = Math.min(radius, d / 2.2);
      return [p[0] + (q[0] - p[0]) / d * r, p[1] + (q[1] - p[1]) / d * r] as Pt;
    };
    const a = toward(prev), b = toward(next);
    parts.push(`${i ? "L" : "M"}${xy(a)}Q${xy(p)} ${xy(b)}`);
  });
  return `${parts.join("")}Z`;
}

/** Keeps front ornaments out of the protected reading area of the window. */
function clearOfText({ width, height, window }: BranchingFrameGeometry, reach: number, insideStage = true) {
  const inner = { x0: window.x + reach, y0: window.y + reach, x1: window.x + window.width - reach, y1: window.y + window.height - reach };
  return (x: number, y: number, radius: number) =>
    (!insideStage || (x - radius >= 0 && y - radius >= 0 && x + radius <= width && y + radius <= height))
    && (x + radius < inner.x0 || x - radius > inner.x1 || y + radius < inner.y0 || y - radius > inner.y1);
}

/** Leaf outline pointing along +x from the origin. */
const leafPath = (length: number, width: number) =>
  `M0 0C${n(length * .22)} ${n(-width * .62)} ${n(length * .64)} ${n(-width * .52)} ${n(length)} 0C${n(length * .64)} ${n(width * .52)} ${n(length * .22)} ${n(width * .62)} 0 0Z`;
const leafHalf = (length: number, width: number) =>
  `M0 0C${n(length * .22)} ${n(-width * .62)} ${n(length * .64)} ${n(-width * .52)} ${n(length)} 0Q${n(length * .5)} ${n(width * .04)} 0 0Z`;

/** Shadow cast into a recessed opening by light from the upper left. */
function WindowRecess({ window: w, id, depth, strength = 1 }: { window: Rect; id: string; depth: number; strength?: number }) {
  const s = Math.max(4, depth);
  return <g data-km-frame-recess="">
    <defs>
      <linearGradient id={`${id}-rt`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#000" stopOpacity={.62 * strength} /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}-rl`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#000" stopOpacity={.46 * strength} /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}-rr`} x1="1" y1="0" x2="0" y2="0"><stop stopColor="#000" stopOpacity={.2 * strength} /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}-rb`} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#fff" stopOpacity={.12 * strength} /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    <rect x={w.x} y={w.y} width={w.width} height={s * 1.2} fill={`url(#${id}-rt)`} />
    <rect x={w.x} y={w.y} width={s} height={w.height} fill={`url(#${id}-rl)`} />
    <rect x={w.x + w.width - s * .7} y={w.y} width={s * .7} height={w.height} fill={`url(#${id}-rr)`} />
    <rect x={w.x} y={w.y + w.height - s * .5} width={w.width} height={s * .5} fill={`url(#${id}-rb)`} />
  </g>;
}

/** Rough stone surface lit from the upper left, multiplied over flat fills. */
function StoneTexture({ id, scale, grain = .22, seed = 3, stain = "#2a3320" }: { id: string; scale: number; grain?: number; seed?: number; stain?: string }) {
  // Height field: broad undulation for chisel-worn faces plus fine pitting.
  return <filter id={id} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency={grain / scale} numOctaves="3" seed={seed} result="fine" />
    <feTurbulence type="fractalNoise" baseFrequency={.045 / scale} numOctaves="3" seed={seed + 4} result="broad" />
    <feComposite in="fine" in2="broad" operator="arithmetic" k2=".28" k3=".72" result="height" />
    <feDiffuseLighting in="height" surfaceScale={3.2 * scale} lightingColor="#fff" result="lit">
      <feDistantLight azimuth="225" elevation="56" />
    </feDiffuseLighting>
    <feComposite in="lit" in2="SourceGraphic" operator="arithmetic" k1="1.16" k2="0" k3="0" k4="0" result="rough" />
    <feTurbulence type="fractalNoise" baseFrequency={.012 / scale} numOctaves="3" seed={seed + 9} result="weather" />
    <feComponentTransfer in="weather" result="patches"><feFuncR type="linear" slope="2.4" intercept="-.95" /></feComponentTransfer>
    <feColorMatrix in="patches" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .42 0 0 0 0" result="mask" />
    <feFlood floodColor={stain} />
    <feComposite in2="mask" operator="in" result="stain" />
    <feComposite in="stain" in2="rough" operator="atop" result="stained" />
    <feComposite in="stained" in2="SourceAlpha" operator="in" />
  </filter>;
}

/* ------------------------------------------------------------------ */
/* Moss stone: dry-laid masonry, flat arch, sill, moss and willow vines */
/* ------------------------------------------------------------------ */

const MOSS = ["#7a9a2c", "#93b236", "#a9c445", "#c2d860", "#46621f"];

function mossStoneBack(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const rng = seeded(1207);
  const u = Math.max(16, A.x);
  const gap = Math.max(1.6, u * .05);
  const stones: Array<{ d: string; fill: string; key: string }> = [];
  const moss: Array<{ d: string; fill: string; key: string }> = [];
  const stoneFill = () => {
    const light = between(rng, 33, 55), hue = between(rng, 80, 210), sat = between(rng, 3, 9);
    return `hsl(${n(hue)} ${n(sat)}% ${n(light)}%)`;
  };
  const addMoss = (x0: number, x1: number, top: number, depth: number, key: string) => {
    const span = x1 - x0;
    if (span < 4) return;
    const steps = Math.max(4, Math.round(span / (u * .09)));
    const upper: Pt[] = [], lower: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = x0 + span * i / steps, edge = Math.sin(Math.PI * i / steps);
      upper.push([x, top - gap * .4 - edge * between(rng, 0, depth * .45)]);
      lower.push([x, top + edge * between(rng, depth * .25, depth)]);
    }
    moss.push({ key, fill: MOSS[Math.floor(rng() * 4)], d: `M${upper.map(xy).join("L")}L${lower.reverse().map(xy).join("L")}Z` });
  };
  const stone = (points: Pt[], key: string, mossChance: number, fill = stoneFill()) => {
    const jitter = gap * .55;
    const shaped = points.map(([x, y]) => [x + between(rng, -jitter, jitter), y + between(rng, -jitter, jitter)] as Pt);
    stones.push({ key, fill, d: roundedPoly(shaped, between(rng, u * .07, u * .17)) });
    if (rng() < mossChance) {
      const left = Math.min(shaped[0][0], shaped[3][0]), right = Math.max(shaped[1][0], shaped[2][0]);
      const from = lerp(left, right, rng() < .5 ? 0 : between(rng, 0, .45));
      const to = lerp(from, right, between(rng, .45, 1));
      addMoss(from, to, Math.min(shaped[0][1], shaped[1][1]), between(rng, u * .12, u * .3), `m${key}`);
    }
  };
  const course = (x0: number, x1: number, y0: number, y1: number, key: string, mossChance: number) => {
    let x = x0, i = 0;
    while (x < x1 - 1) {
      let w = u * between(rng, .62, 1.45);
      if (x1 - (x + w) < u * .38) w = x1 - x;
      const gx = gap / 2;
      stone([[x + gx, y0 + gx], [x + w - gx, y0 + gx], [x + w - gx, y1 - gx], [x + gx, y1 - gx]], `${key}-${i++}`, mossChance);
      x += w;
    }
  };
  const band = (y0: number, y1: number, rows: number) => {
    const weights = Array.from({ length: rows }, () => between(rng, .75, 1.3));
    const total = weights.reduce((a, b) => a + b, 0);
    let y = y0;
    return weights.map(weight => { const top = y; y += (y1 - y0) * weight / total; return [top, y] as const; });
  };

  // Flat arch of wedge-shaped voussoirs over the window, with a raised keystone.
  const ext = u * .42;
  const archTop = A.y - Math.min(A.y * .62, u * .78);
  const above = band(0, archTop, Math.max(1, Math.round(archTop / (u * .5))));
  above.forEach(([y0, y1], r) => course(-u * (r % 2 ? .45 : .1), W + u * .5, y0, y1, `t${r}`, .7 - r * .12));
  course(-u * .25, A.x - ext, archTop, A.y, "al", .45);
  course(A.x + A.width + ext, W + u * .5, archTop, A.y, "ar", .45);
  const count = Math.max(7, Math.round((A.width + ext * 2) / (u * .62)) | 1);
  const focus: Pt = [A.x + A.width / 2, A.y + (A.width + ext * 2) * .9];
  const bottomX = (i: number) => A.x - ext * .35 + (A.width + ext * .7) * i / count;
  const topAt = (x: number) => {
    const t = (archTop - focus[1]) / (A.y - focus[1]);
    return focus[0] + (x - focus[0]) * t;
  };
  for (let i = 0; i < count; i++) {
    const b0 = bottomX(i), b1 = bottomX(i + 1), key = i === (count - 1) / 2;
    const lift = key ? (A.y - archTop) * .16 : 0, g2 = gap / 2;
    stone([[topAt(b0) + g2, archTop - lift + g2], [topAt(b1) - g2, archTop - lift + g2], [b1 - g2, A.y + (key ? gap : 0)], [b0 + g2, A.y + (key ? gap : 0)]],
      `v${i}`, key ? .9 : .4, key ? "hsl(48 7% 58%)" : undefined);
  }

  // Coursed jambs either side of the window.
  const jambRows = band(A.y, A.y + A.height, Math.max(2, Math.round(A.height / (u * .5))));
  jambRows.forEach(([y0, y1], r) => {
    course(-u * (r % 2 ? .5 : .15), A.x, y0, y1, `l${r}`, .32);
    course(A.x + A.width, W + u * (r % 2 ? .15 : .5), y0, y1, `r${r}`, .32);
  });

  // A projecting sill stone under the window, then the footing courses.
  const sillH = Math.min((H - A.y - A.height) * .48, u * .5);
  const sillY = A.y + A.height;
  course(-u * .3, A.x - ext * .7, sillY, sillY + sillH, "sl", .3);
  course(A.x + A.width + ext * .7, W + u * .3, sillY, sillY + sillH, "sr", .3);
  stone([[A.x - ext * .7, sillY + gap * .2], [A.x + A.width + ext * .7, sillY + gap * .2], [A.x + A.width + ext * .7, sillY + sillH], [A.x - ext * .7, sillY + sillH]], "sill", .85, "hsl(60 6% 54%)");
  band(sillY + sillH, H, Math.max(1, Math.round((H - sillY - sillH) / (u * .5))))
    .forEach(([y0, y1], r) => course(-u * (r % 2 ? .1 : .5), W + u * .4, y0, y1, `b${r}`, .5));

  // Moss creeping along the joints shows only through the mortar gaps.
  const jointMoss = stones.filter(() => rng() < .38).map(s => {
    const box = /M([\d.-]+) ([\d.-]+)/.exec(s.d);
    return box && <rect key={s.key} x={+box[1] - u * .3} y={+box[2] - gap * 1.5} width={u * between(rng, .7, 1.6)} height={u * between(rng, .55, .9)} fill={MOSS[4]} />;
  });
  const spores = Array.from({ length: 160 }, (_, i) => {
    const pick = moss[Math.floor(rng() * moss.length)];
    if (!pick) return null;
    const match = /M([\d.-]+) ([\d.-]+)/.exec(pick.d);
    if (!match) return null;
    return <circle key={i} cx={+match[1] + between(rng, 0, u * .9)} cy={+match[2] + between(rng, -gap, gap * 1.5)}
      r={between(rng, .5, 1.2) * Math.max(1, u / 70)} fill={rng() < .5 ? "#cfe27a" : "#e6f19c"} opacity={between(rng, .45, .85)} />;
  });

  return <svg {...svgProps(g)}>
    <defs>
      <StoneTexture id={`${id}-stone`} scale={Math.max(.7, u / 90)} />
      <clipPath id={`${id}-bounds`}><rect width={W} height={H} rx={gap * 2} /></clipPath>
      {/* Cushion moss: ragged edges, then tufted relief lit from the upper left. */}
      <filter id={`${id}-moss`} x="-10%" y="-30%" width="120%" height="160%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={n(Math.min(.5, 14 / u) * 100) / 100} numOctaves="4" seed="5" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={Math.max(4, u * .14)} xChannelSelector="R" yChannelSelector="G" result="fuzzy" />
        <feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="4" seed="9" result="tuft" />
        <feGaussianBlur in="fuzzy" stdDeviation={Math.max(1, u * .02)} result="soft" />
        <feComposite in="tuft" in2="soft" operator="arithmetic" k2=".55" k3=".0" k4=".2" result="relief" />
        <feDiffuseLighting in="relief" surfaceScale="4" lightingColor="#fff" result="lit"><feDistantLight azimuth="225" elevation="48" /></feDiffuseLighting>
        <feComposite in="lit" in2="fuzzy" operator="arithmetic" k1="1.45" k2="0" k3="0" k4="0" result="shaded" />
        <feComposite in="shaded" in2="fuzzy" operator="in" />
      </filter>
      <linearGradient id={`${id}-bevel`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#fff" stopOpacity=".2" /><stop offset=".32" stopColor="#fff" stopOpacity="0" />
        <stop offset=".7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".34" />
      </linearGradient>
    </defs>
    <g clipPath={`url(#${id}-bounds)`}>
      <g filter={`url(#${id}-moss)`} opacity=".9">{jointMoss}</g>
      <g filter={`url(#${id}-stone)`}>{stones.map(s => <path key={s.key} d={s.d} fill={s.fill} />)}</g>
      <g>{stones.map(s => <path key={s.key} d={s.d} fill={`url(#${id}-bevel)`} />)}</g>
      <g filter={`url(#${id}-moss)`}>{moss.map(m => <path key={m.key} d={m.d} fill={m.fill} />)}</g>
      <g>{spores}</g>
    </g>
    <rect x={A.x - gap} y={A.y - gap} width={A.width + gap * 2} height={A.height + gap * 2} rx={gap} fill="#0b0f0c" />
  </svg>;
}

function willowVine(points: Pt[], rng: Rng, u: number, allowed: ReturnType<typeof clearOfText>, key: string, id: string): ReactNode {
  const leaves: ReactNode[] = [];
  const stepCount = Math.round(points.reduce((sum, p, i) => i ? sum + Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) : 0, 0) / (u * .24));
  for (let i = 1; i < stepCount; i++) {
    const t = i / stepCount, { p, angle } = along(points, t), side = i % 2 ? 1 : -1;
    const length = u * between(rng, .38, .62) * (1 - t * .35), width = length * .24;
    // Willow-like leaves hang: rotate away from the stem and then toward gravity.
    const heading = angle + side * between(rng, 32, 58);
    const droop = heading + (90 - ((heading % 360) + 360) % 360 > 0 ? 1 : -1) * between(rng, 6, 22);
    const tipX = p[0] + Math.cos(droop * Math.PI / 180) * length, tipY = p[1] + Math.sin(droop * Math.PI / 180) * length;
    if (!allowed(tipX, tipY, width) || !allowed((p[0] + tipX) / 2, (p[1] + tipY) / 2, width)) continue;
    leaves.push(<g key={`${key}${i}`} transform={`translate(${n(p[0])} ${n(p[1])}) rotate(${n(droop)})`}>
      <path d={leafPath(length, width)} fill={`url(#${id}-leaf)`} />
      <path d={leafHalf(length, width)} fill="#d8ec8a" opacity=".22" />
      <path d={`M${n(length * .04)} 0Q${n(length * .5)} ${n(width * .07)} ${n(length * .94)} 0`} fill="none" stroke="#e6f0b0" strokeOpacity=".55" strokeWidth={Math.max(.5, width * .07)} />
    </g>);
  }
  return <g key={key}>
    <path d={taper(points, u * .055, u * .016)} fill="#53622f" />
    {leaves}
  </g>;
}

function mossStoneFront(g: BranchingFrameGeometry): ReactNode {
  const { window: A, id } = g;
  const rng = seeded(88);
  const u = Math.max(16, A.x);
  const allowed = clearOfText(g, g.width * MOSS_STONE.intrusion!);
  const left: Pt[] = [[A.x * .3, u * .12], [A.x * .7, A.y * .45], [A.x * .9, A.y + A.height * .12], [A.x - u * .1, A.y + A.height * .42], [A.x * .55, A.y + A.height * .56]];
  // Stems stay on the masonry; only leaves may lean into the window's edge band.
  const right: Pt[] = [[A.x + A.width + u * .6, g.height - u * .1], [A.x + A.width + u * .22, A.y + A.height + u * .2], [A.x + A.width + u * .04, A.y + A.height * .76], [A.x + A.width + u * .14, A.y + A.height * .44]];
  return <svg {...svgProps(g)}>
    <defs>
      <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#3f6a24" /><stop offset=".55" stopColor="#6f9b34" /><stop offset="1" stopColor="#a9c95a" />
      </linearGradient>
      <filter id={`${id}-vine-shadow`}><feDropShadow dx={u * .03} dy={u * .07} stdDeviation={u * .05} floodColor="#030604" floodOpacity=".5" /></filter>
    </defs>
    <WindowRecess window={A} id={`${id}-recess`} depth={u * .22} />
    <g filter={`url(#${id}-vine-shadow)`}>
      {willowVine(left, rng, u, allowed, "vl", id)}
      {willowVine(right, rng, u, allowed, "vr", id)}
    </g>
  </svg>;
}

/* ----------------------------------------------------------- */
/* Columns shared by the marble colonnade and the stone portico */
/* ----------------------------------------------------------- */

interface ColumnSpec { cx: number; top: number; bottom: number; width: number; order: "corinthian" | "ionic"; id: string; tone?: number }

/** An acanthus leaf: scalloped lobes on each side of a midrib, the tip bending forward. */
function acanthus(x: number, base: number, width: number, height: number): string {
  const half = width / 2;
  // Right edge from base to tip as [lobe outer point, notch between lobes].
  const lobes: Array<[Pt, Pt]> = [
    [[x + half * 1.02, base - height * .2], [x + half * .7, base - height * .32]],
    [[x + half * .94, base - height * .46], [x + half * .58, base - height * .56]],
    [[x + half * .72, base - height * .7], [x + half * .36, base - height * .78]],
  ];
  const mirror = (p: Pt): Pt => [2 * x - p[0], p[1]];
  let d = `M${xy([x + half * .46, base])}`;
  let from: Pt = [x + half * .46, base];
  for (const [outer, notch] of lobes) {
    d += `Q${xy([outer[0] + half * .08, (from[1] + outer[1]) / 2])} ${xy(outer)}Q${xy([outer[0] - half * .06, notch[1] + height * .02])} ${xy(notch)}`;
    from = notch;
  }
  d += `Q${xy([x + half * .3, base - height * 1.02])} ${xy([x, base - height])}Q${xy([x - half * .3, base - height * 1.02])} ${xy(mirror(from))}`;
  for (const [outer, notch] of [...lobes].reverse()) {
    const prev = mirror(notch), o = mirror(outer);
    d += `L${xy(prev)}Q${xy([o[0] + half * .06, notch[1] + height * .02])} ${xy(o)}`;
  }
  return `${d}Q${xy([x - half * 1.06, base - height * .08])} ${xy([x - half * .46, base])}Z`;
}

function Column({ cx, top, bottom, width, order, id, tone = 1 }: ColumnSpec) {
  const capH = order === "corinthian" ? width * 1.2 : width * .72;
  const baseH = width * .5;
  const shaftTop = top + capH, shaftBottom = bottom - baseH;
  const wb = width, wt = width * .86, flutes = 9;
  const shaft = `M${xy([cx - wb / 2, shaftBottom])}C${xy([cx - wb * .52, shaftBottom - (shaftBottom - shaftTop) * .35])} ${xy([cx - wt / 2, shaftTop + (shaftBottom - shaftTop) * .2])} ${xy([cx - wt / 2, shaftTop])}L${xy([cx + wt / 2, shaftTop])}C${xy([cx + wt / 2, shaftTop + (shaftBottom - shaftTop) * .2])} ${xy([cx + wb * .52, shaftBottom - (shaftBottom - shaftTop) * .35])} ${xy([cx + wb / 2, shaftBottom])}Z`;
  const fluteShapes = Array.from({ length: flutes }, (_, i) => {
    const a0 = (i + .14) / flutes, a1 = (i + .86) / flutes;
    // Project flutes on a cylinder: they compress toward the silhouette.
    const project = (a: number, w: number) => cx - Math.cos(a * Math.PI) * w / 2;
    return `M${xy([project(a0, wb), shaftBottom - width * .1])}L${xy([project(a0, wt), shaftTop + width * .14])}Q${xy([(project(a0, wt) + project(a1, wt)) / 2, shaftTop + width * .04])} ${xy([project(a1, wt), shaftTop + width * .14])}L${xy([project(a1, wb), shaftBottom - width * .1])}Q${xy([(project(a0, wb) + project(a1, wb)) / 2, shaftBottom])} ${xy([project(a0, wb), shaftBottom - width * .1])}Z`;
  });
  const abacusW = order === "corinthian" ? width * 1.52 : width * 1.6, abacusH = capH * (order === "corinthian" ? .15 : .2);
  const abacus = `M${xy([cx - abacusW / 2, top])}L${xy([cx + abacusW / 2, top])}Q${xy([cx + abacusW * .4, top + abacusH / 2])} ${xy([cx + abacusW / 2, top + abacusH])}L${xy([cx - abacusW / 2, top + abacusH])}Q${xy([cx - abacusW * .4, top + abacusH / 2])} ${xy([cx - abacusW / 2, top])}Z`;
  const torus = (y: number, w: number, h: number) => <rect x={cx - w / 2} y={y} width={w} height={h} rx={h / 2} />;
  const plinthH = baseH * .34;
  const shade = `url(#${id}-cyl)`;
  return <g>
    {/* base */}
    <g fill={`url(#${id}-marble)`} stroke="#00000026" strokeWidth=".6">
      <rect x={cx - wb * .7} y={bottom - plinthH} width={wb * 1.4} height={plinthH} />
      {torus(bottom - plinthH - baseH * .26, wb * 1.3, baseH * .27)}
      <rect x={cx - wb * .56} y={bottom - plinthH - baseH * .42} width={wb * 1.12} height={baseH * .17} />
      {torus(bottom - plinthH - baseH * .62, wb * 1.18, baseH * .21)}
    </g>
    <rect x={cx - wb * .56} y={bottom - plinthH - baseH * .42} width={wb * 1.12} height={baseH * .17} fill="#000" opacity=".22" />
    <g fill={`url(#${id}-torus)`}>
      {torus(bottom - plinthH - baseH * .26, wb * 1.3, baseH * .27)}
      {torus(bottom - plinthH - baseH * .62, wb * 1.18, baseH * .21)}
    </g>
    {/* shaft */}
    <path d={shaft} fill={`url(#${id}-marble)`} />
    <g fill={`url(#${id}-flute)`}>{fluteShapes.map((d, i) => <path key={i} d={d} />)}</g>
    <path d={shaft} fill={shade} />
    {tone < 1 && <path d={shaft} fill="#000" opacity={1 - tone} />}
    {/* capital */}
    {order === "corinthian" ? <g>
      <path d={`M${xy([cx - wt / 2, shaftTop])}C${xy([cx - wt * .52, top + abacusH + capH * .3])} ${xy([cx - abacusW * .4, top + abacusH * 1.2])} ${xy([cx - abacusW * .44, top + abacusH])}L${xy([cx + abacusW * .44, top + abacusH])}C${xy([cx + abacusW * .4, top + abacusH * 1.2])} ${xy([cx + wt * .52, top + abacusH + capH * .3])} ${xy([cx + wt / 2, shaftTop])}Z`} fill={`url(#${id}-marble)`} />
      {/* caulicoli: stalks rising between the upper leaves to the corner volutes and inner helices */}
      <g fill="none" stroke="#4d483f" strokeOpacity=".7" strokeLinecap="round" strokeWidth={Math.max(1, width * .035)}>
        {[-1, 1].map(side => <g key={side}>
          <path d={`M${xy([cx + side * wt * .16, shaftTop - capH * .5])}C${xy([cx + side * wt * .2, shaftTop - capH * .78])} ${xy([cx + side * abacusW * .34, top + abacusH * 2.6])} ${xy([cx + side * abacusW * .42, top + abacusH * 1.9])}`} />
          <path d={`M${xy([cx + side * wt * .14, shaftTop - capH * .55])}C${xy([cx + side * wt * .1, shaftTop - capH * .72])} ${xy([cx + side * wt * .1, top + abacusH * 2.2])} ${xy([cx + side * wt * .2, top + abacusH * 1.7])}`} />
        </g>)}
      </g>
      {[[-.5, capH * .3, capH * .62, wt * .5], [.5, capH * .3, capH * .62, wt * .5], [-.7, 0, capH * .42, wt * .44], [0, 0, capH * .44, wt * .5], [.7, 0, capH * .42, wt * .44]].map(([o, lift, h, w], i) => {
        const lx = cx + o * wt * .62, base = shaftTop - lift;
        return <g key={i}>
          <path d={acanthus(lx, base, w, h)} fill={`url(#${id}-marble)`} stroke="#4a453c" strokeOpacity=".75" strokeWidth=".8" />
          <path d={`M${n(lx)} ${n(base - h * .06)}L${n(lx)} ${n(base - h * .86)}`} stroke="#4a453c" strokeOpacity=".55" strokeWidth={Math.max(.7, width * .018)} />
          {/* the tip curls forward and casts a small shadow under itself */}
          <ellipse cx={lx} cy={base - h * .9} rx={w * .2} ry={h * .1} fill="#3a362f" opacity=".42" />
          <ellipse cx={lx} cy={base - h * .97} rx={w * .18} ry={h * .085} fill={`url(#${id}-marble)`} stroke="#4a453c" strokeOpacity=".6" strokeWidth=".6" />
        </g>;
      })}
      {[-1, 1].map(side => {
        const vx = cx + side * abacusW * .43, vy = top + abacusH * 1.75, r = capH * .1;
        const spiral = Array.from({ length: 22 }, (_, i) => {
          const a = i / 21 * Math.PI * 2.6, rr = r * (1 - i / 25);
          return [vx + side * Math.cos(a) * rr, vy + Math.sin(a) * rr] as Pt;
        });
        return <g key={side}>
          <circle cx={vx} cy={vy} r={r} fill={`url(#${id}-marble)`} stroke="#4a453c" strokeOpacity=".7" strokeWidth=".8" />
          <path d={`M${spiral.map(xy).join("L")}`} fill="none" stroke="#4a453c" strokeOpacity=".75" strokeWidth={Math.max(.7, r * .14)} />
        </g>;
      })}
    </g> : <g>
      <rect x={cx - wt * .58} y={shaftTop - capH * .42} width={wt * 1.16} height={capH * .3} rx={capH * .1} fill={`url(#${id}-marble)`} />
      <g fill="#00000033">{Array.from({ length: 5 }, (_, i) => <ellipse key={i} cx={cx - wt * .4 + i * wt * .2} cy={shaftTop - capH * .27} rx={wt * .06} ry={capH * .1} />)}</g>
      <path d={`M${xy([cx - abacusW * .5, top + abacusH])}L${xy([cx + abacusW * .5, top + abacusH])}L${xy([cx + abacusW * .5, top + abacusH + capH * .26])}Q${xy([cx, top + abacusH + capH * .4])} ${xy([cx - abacusW * .5, top + abacusH + capH * .26])}Z`} fill={`url(#${id}-marble)`} />
      {[-1, 1].map(side => {
        const vx = cx + side * abacusW * .4, vy = top + abacusH + capH * .34, r = capH * .33;
        const spiral = Array.from({ length: 26 }, (_, i) => {
          const a = i / 25 * Math.PI * 3.2, rr = r * (1 - i / 29);
          return [vx + side * Math.cos(a + Math.PI) * rr, vy - Math.sin(a + Math.PI) * rr] as Pt;
        });
        return <g key={side}>
          <circle cx={vx} cy={vy} r={r} fill={`url(#${id}-marble)`} stroke="#2d302b55" strokeWidth=".8" />
          <path d={`M${spiral.map(xy).join("L")}`} fill="none" stroke="#2d302b88" strokeWidth={Math.max(.8, r * .1)} strokeLinecap="round" />
          <circle cx={vx} cy={vy} r={r * .14} fill="#2d302b77" />
        </g>;
      })}
    </g>}
    <path d={abacus} fill={`url(#${id}-marble)`} stroke="#00000022" strokeWidth=".6" />
    <rect x={cx - abacusW / 2} y={top + abacusH * .78} width={abacusW} height={abacusH * .22} fill="#000" opacity=".18" />
    {order === "corinthian" && <g transform={`translate(${n(cx)} ${n(top + abacusH * .5)})`}>
      {Array.from({ length: 5 }, (_, k) => <ellipse key={k} cy={-abacusH * .28} rx={abacusH * .16} ry={abacusH * .3} transform={`rotate(${k * 72})`} fill={`url(#${id}-marble)`} stroke="#4a453c" strokeOpacity=".6" strokeWidth=".6" />)}
      <circle r={abacusH * .14} fill="#8a8377" />
    </g>}
  </g>;
}

function ColumnDefs({ id, base, light, dark }: { id: string; base: string; light: string; dark: string }) {
  return <>
    <linearGradient id={`${id}-marble`} x1="0" y1="0" x2="1" y2="1">
      <stop stopColor={light} /><stop offset=".55" stopColor={base} /><stop offset="1" stopColor={dark} />
    </linearGradient>
    <linearGradient id={`${id}-cyl`} x1="0" y1="0" x2="1" y2="0">
      <stop stopColor="#fff" stopOpacity=".1" /><stop offset=".2" stopColor="#fff" stopOpacity=".34" />
      <stop offset=".42" stopColor="#fff" stopOpacity="0" /><stop offset=".78" stopColor="#000" stopOpacity=".22" /><stop offset="1" stopColor="#000" stopOpacity=".46" />
    </linearGradient>
    <linearGradient id={`${id}-flute`} x1="0" y1="0" x2="1" y2="0">
      <stop stopColor="#000" stopOpacity=".34" /><stop offset=".38" stopColor="#000" stopOpacity=".05" />
      <stop offset=".8" stopColor="#fff" stopOpacity=".22" /><stop offset="1" stopColor="#fff" stopOpacity=".05" />
    </linearGradient>
    <linearGradient id={`${id}-torus`} x1="0" y1="0" x2="0" y2="1">
      <stop stopColor="#fff" stopOpacity=".35" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".4" />
    </linearGradient>
    <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
      <stop stopColor="#fff" stopOpacity=".3" /><stop offset=".22" stopColor="#fff" stopOpacity="0" /><stop offset=".85" stopColor="#000" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".32" />
    </linearGradient>
    <linearGradient id={`${id}-under`} x1="0" y1="0" x2="0" y2="1">
      <stop stopColor="#000" stopOpacity=".5" /><stop offset="1" stopColor="#000" stopOpacity="0" />
    </linearGradient>
  </>;
}

/** Veined, slightly weathered marble applied over shaded geometry. */
function MarbleVeins({ id, scale, seed = 8, vein = "#86817a", grime = .12 }: { id: string; scale: number; seed?: number; vein?: string; grime?: number }) {
  // Veins are thin contour lines through stretched noise; a second, fainter
  // set at another scale gives the soft secondary veining of real marble.
  const contour = "0 0 0 0 0 0 0 0 0 .04 .4 .04 0 0 0 0 0 0 0 0 0";
  return <filter id={id} x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency={`${n(.9 / scale) / 100} ${n(2.2 / scale) / 100}`} numOctaves="5" seed={seed} result="n" />
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="r" />
    <feComponentTransfer in="r" result="vein"><feFuncA type="table" tableValues={contour} /></feComponentTransfer>
    <feFlood floodColor={vein} result="ink" />
    <feComposite in="ink" in2="vein" operator="in" result="veins" />
    <feTurbulence type="fractalNoise" baseFrequency={`${n(2.4 / scale) / 100} ${n(1.4 / scale) / 100}`} numOctaves="4" seed={seed + 5} result="n2" />
    <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="r2" />
    <feComponentTransfer in="r2" result="vein2"><feFuncA type="table" tableValues="0 0 0 0 0 0 .18 0 0 0 0 0 0 .14 0 0 0 0" /></feComponentTransfer>
    <feFlood floodColor={vein} />
    <feComposite in2="vein2" operator="in" result="veins2" />
    <feTurbulence type="fractalNoise" baseFrequency={.02 / scale} numOctaves="3" seed={seed + 3} result="cloud" />
    <feColorMatrix in="cloud" type="matrix" values={`0 0 0 0 .32  0 0 0 0 .31  0 0 0 0 .28  ${grime * 2.4} 0 0 0 ${-grime * 1.1}`} result="dust" />
    <feComposite in="veins2" in2="SourceGraphic" operator="atop" result="soft" />
    <feComposite in="veins" in2="soft" operator="atop" result="veined" />
    <feComposite in="dust" in2="veined" operator="atop" />
  </filter>;
}

/** Dark drip streaks below projecting stone where rain has run off. */
function Streaks({ rng, x0, x1, y, length, count, opacity }: { rng: Rng; x0: number; x1: number; y: number; length: number; count: number; opacity: number }) {
  return <g>{Array.from({ length: count }, (_, i) => {
    const x = between(rng, x0, x1), w = between(rng, 1.5, 5), h = length * between(rng, .3, 1);
    return <rect key={i} x={x} y={y} width={w} height={h} rx={w / 2} fill="#2b2a24" opacity={opacity * between(rng, .3, 1)} />;
  })}</g>;
}

/* ------------------------------------------------------- */
/* Marble colonnade: Corinthian columns, dentilled cornice */
/* ------------------------------------------------------- */

function marbleColonnadeBack(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const rng = seeded(311);
  const S = A.x, T = A.y, B = H - A.y - A.height;
  const casing = Math.max(4, S * .1);
  const colW = S * .6, colX = (S - casing) * .5;
  // Entablature bands from top to bottom, as fractions of the top band.
  const bands = [["cyma", .1], ["corona", .17], ["dentils", .12], ["ovolo", .07], ["frieze", .3], ["architrave", .24]] as const;
  let y = 0;
  const rows = bands.map(([name, f]) => { const top = y; y += T * f; return { name, top, h: T * f }; });
  const row = (name: string) => rows.find(r => r.name === name)!;
  const project = S * .1;
  const bandX = (name: string) => ["cyma", "corona"].includes(name) ? 0 : name === "dentils" || name === "ovolo" ? project * .5 : project;
  const dentil = row("dentils"), ovolo = row("ovolo"), frieze = row("frieze"), arch = row("architrave");
  const dentilW = dentil.h * .62, dentilGap = dentil.h * .42;
  const dentils = Array.from({ length: Math.floor((W - project) / (dentilW + dentilGap)) }, (_, i) => project * .5 + dentilGap + i * (dentilW + dentilGap));
  const eggs = Array.from({ length: Math.floor((W - project) / (ovolo.h * 1.3)) }, (_, i) => project * .5 + ovolo.h * .8 + i * ovolo.h * 1.3);
  // Running laurel: a sinuous stem with paired leaves and a rosette in each loop.
  const period = Math.max(frieze.h * 2.6, 30), amp = frieze.h * .2, fcy = frieze.top + frieze.h / 2;
  const stemPoints: Pt[] = [];
  for (let x = project; x <= W - project; x += period / 8) stemPoints.push([x, fcy + Math.sin((x - project) / period * Math.PI * 2) * amp]);
  const laurel = stemPoints.slice(1, -1).map(([x, yy], i) => {
    const slope = Math.cos((x - project) / period * Math.PI * 2) * amp * Math.PI * 2 / period;
    const angle = Math.atan(slope) * 180 / Math.PI, len = frieze.h * .3;
    return <g key={i} transform={`translate(${n(x)} ${n(yy)}) rotate(${n(angle)})`}>
      <path d={leafPath(len, len * .42)} transform="rotate(-38)" />
      <path d={leafPath(len, len * .42)} transform="rotate(38)" />
    </g>;
  });
  const rosettes = Array.from({ length: Math.floor((W - project * 2) / period) * 2 }, (_, i) => {
    const x = project + period * (i / 2 + .25), up = i % 2 === 0;
    return <g key={i} transform={`translate(${n(x)} ${n(fcy + (up ? amp * 1.55 : -amp * 1.55))})`}>
      {Array.from({ length: 6 }, (_, k) => <ellipse key={k} cy={-frieze.h * .09} rx={frieze.h * .045} ry={frieze.h * .09} transform={`rotate(${k * 60})`} />)}
      <circle r={frieze.h * .045} fill="#8d867a" />
    </g>;
  });
  const sillTop = A.y + A.height;
  return <svg {...svgProps(g)}>
    <defs>
      <ColumnDefs id={id} base="#ebe8e2" light="#faf9f6" dark="#d3cfc7" />
      <MarbleVeins id={`${id}-veins`} scale={Math.max(.6, W / 900)} />
      <filter id={`${id}-cast`} x="-8%" y="-8%" width="116%" height="125%">
        <feDropShadow dx={S * .04} dy={S * .1} stdDeviation={S * .12} floodColor="#06080d" floodOpacity=".6" />
      </filter>
    </defs>
    <g filter={`url(#${id}-cast)`}>
      <g filter={`url(#${id}-veins)`}>
        {/* window casing and wall panel behind the columns */}
        <rect x={A.x - casing} y={T - casing * .2} width={A.width + casing * 2} height={A.height + casing * .4} fill={`url(#${id}-marble)`} />
        {/* entablature */}
        {rows.map(r => <rect key={r.name} x={bandX(r.name)} y={r.top} width={W - bandX(r.name) * 2} height={r.h} fill={`url(#${id}-marble)`} />)}
        {/* stylobate */}
        <rect x={0} y={sillTop} width={W} height={B * .3} fill={`url(#${id}-marble)`} />
        <rect x={S * .04} y={sillTop + B * .3} width={W - S * .08} height={B * .42} fill={`url(#${id}-marble)`} />
        <rect x={S * .1} y={sillTop + B * .72} width={W - S * .2} height={B * .28} fill={`url(#${id}-marble)`} />
        {[colX, W - colX].map(cx => <Column key={cx} cx={cx} top={T} bottom={sillTop + B * .02} width={colW} order="corinthian" id={id} />)}
      </g>
      {/* moulding light and shade */}
      {rows.map(r => <rect key={r.name} x={bandX(r.name)} y={r.top} width={W - bandX(r.name) * 2} height={r.h} fill={`url(#${id}-band)`} />)}
      <rect x={project * .5} y={row("corona").top + row("corona").h} width={W - project} height={dentil.h * .45} fill={`url(#${id}-under)`} />
      <g fill="#3a372f" opacity=".42">{dentils.map(x => <rect key={x} x={x - dentilGap} y={dentil.top} width={dentilGap} height={dentil.h} />)}</g>
      <g fill="#fff" opacity=".35">{dentils.map(x => <rect key={x} x={x} y={dentil.top} width={dentilW * .22} height={dentil.h} />)}</g>
      <g>{eggs.map(x => <g key={x}>
        <ellipse cx={x} cy={ovolo.top + ovolo.h * .5} rx={ovolo.h * .38} ry={ovolo.h * .44} fill="#00000038" />
        <ellipse cx={x - ovolo.h * .05} cy={ovolo.top + ovolo.h * .46} rx={ovolo.h * .3} ry={ovolo.h * .36} fill="#ffffff55" />
        <path d={`M${n(x + ovolo.h * .65)} ${n(ovolo.top + ovolo.h * .1)}l0 ${n(ovolo.h * .8)}`} stroke="#00000044" strokeWidth=".8" />
      </g>)}</g>
      <path d={`M${smooth(stemPoints, 4).map(xy).join("L")}`} fill="none" stroke="#8b8478" strokeWidth={Math.max(1, frieze.h * .045)} />
      <g fill="#d8d3c9" stroke="#7c7569" strokeOpacity=".7" strokeWidth=".7">{laurel}</g>
      <g fill="#dcd7cd" stroke="#7c7569" strokeOpacity=".6" strokeWidth=".6">{rosettes}</g>
      <rect x={project} y={frieze.top} width={W - project * 2} height={frieze.h} fill="none" stroke="#000" strokeOpacity=".1" />
      <g fill="#fff" opacity=".22">{[0, 1, 2].map(i => <rect key={i} x={project} y={arch.top + arch.h * i / 3} width={W - project * 2} height={Math.max(1, arch.h * .06)} />)}</g>
      <g fill="#000" opacity=".16">{[1, 2].map(i => <rect key={i} x={project} y={arch.top + arch.h * i / 3 - arch.h * .05} width={W - project * 2} height={arch.h * .05} />)}</g>
      <rect x={project} y={T - 1} width={W - project * 2} height={Math.max(2, T * .05)} fill={`url(#${id}-under)`} />
      <rect x={0} y={sillTop} width={W} height={B * .3} fill={`url(#${id}-band)`} />
      <rect x={S * .04} y={sillTop + B * .3} width={W - S * .08} height={B * .14} fill={`url(#${id}-under)`} />
      <Streaks rng={rng} x0={project} x1={W - project} y={row("corona").top + row("corona").h} length={T * .55} count={Math.round(W / 26)} opacity={.1} />
      <Streaks rng={rng} x0={S * .05} x1={W - S * .05} y={sillTop + B * .32} length={B * .6} count={Math.round(W / 40)} opacity={.08} />
      {/* inner casing reveal */}
      <rect x={A.x - casing * .32} y={A.y - casing * .32} width={A.width + casing * .64} height={A.height + casing * .64} fill="none" stroke="#2c2924" strokeOpacity=".35" strokeWidth={casing * .26} />
    </g>
  </svg>;
}

function shadowFront(depth: number, strength = 1) {
  return (g: BranchingFrameGeometry) => <svg {...svgProps(g)}>
    <WindowRecess window={g.window} id={`${g.id}-recess`} depth={g.window.x * depth} strength={strength} />
  </svg>;
}

/* --------------------------------------------------------------- */
/* Stone portico: pediment, garlands, Ionic columns, worn steps     */
/* --------------------------------------------------------------- */

function stonePorticoBack(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const rng = seeded(523);
  const S = A.x, T = A.y, B = H - A.y - A.height;
  const ent = T * .38, pedBase = T - ent;
  const rake = Math.max(4, ent * .3), apex = rake * 1.9;
  const corniceH = ent * .3, friezeH = ent * .38, archH = ent - corniceH - friezeH;
  const overhang = S * .1;
  const slope = (pedBase - apex) / (W / 2);
  const tympanum: Pt[] = [[overhang + rake * 2.4, pedBase], [W / 2, apex + rake * 1.7], [W - overhang - rake * 2.4, pedBase]];
  const colW = S * .44, front = S * .44, back = S * .86;
  const sillTop = A.y + A.height;
  const stepH = B / 3;
  const triglyphW = friezeH * .66;
  const triglyphCount = Math.max(3, Math.round((W - overhang * 2) / (friezeH * 2.2)));
  const triglyphs = Array.from({ length: triglyphCount }, (_, i) => lerp(overhang + triglyphW, W - overhang - triglyphW, i / (triglyphCount - 1)));
  const medallionR = Math.min((pedBase - apex) * .36, W * .07);
  const medallion: Pt = [W / 2, pedBase - (pedBase - apex) * .36];
  const swag = (x0: number, x1: number, y0: number, droop: number) => {
    const mid = (x0 + x1) / 2;
    return taper([[x0, y0], [lerp(x0, mid, .55), y0 + droop * .85], [mid, y0 + droop], [lerp(mid, x1, .45), y0 + droop * .85], [x1, y0]], medallionR * .12, medallionR * .12);
  };
  const leftSwag: Pt = [W / 2 - medallionR * 4.6, medallion[1] - medallionR * .1];
  const rightSwag: Pt = [W / 2 + medallionR * 4.6, medallion[1] - medallionR * .1];
  const lichen = Array.from({ length: Math.round(W / 9) }, (_, i) => {
    const x = between(rng, 0, W), yy = rng() < .6 ? between(rng, apex + (Math.abs(x - W / 2)) * slope, T) : between(rng, sillTop, H);
    return <ellipse key={i} cx={x} cy={yy} rx={between(rng, 1, 4.5) * Math.max(1, W / 900)} ry={between(rng, .8, 3) * Math.max(1, W / 900)} fill={rng() < .6 ? "#b9b46c" : "#d7d3a2"} opacity={between(rng, .2, .55)} />;
  });
  const wallStone = "url(#" + id + "-marble)";
  return <svg {...svgProps(g)}>
    <defs>
      <ColumnDefs id={id} base="#8d958a" light="#aeb5a7" dark="#6b7369" />
      <StoneTexture id={`${id}-stone`} scale={Math.max(.7, W / 1300)} grain={.3} seed={11} stain="#26302a" />
      <filter id={`${id}-cast`} x="-8%" y="-8%" width="116%" height="125%">
        <feDropShadow dx={S * .03} dy={S * .1} stdDeviation={S * .12} floodColor="#030605" floodOpacity=".6" />
      </filter>
      <linearGradient id={`${id}-recess-fill`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4e574f" /><stop offset="1" stopColor="#626b62" /></linearGradient>
    </defs>
    <g filter={`url(#${id}-cast)`}>
      <g filter={`url(#${id}-stone)`}>
        {/* rear wall around the window */}
        <rect x={front - colW * .1} y={pedBase} width={W - (front - colW * .1) * 2} height={sillTop - pedBase} fill="#59615a" />
        {/* pediment and raking cornice */}
        <path d={`M${xy([0, pedBase])}L${xy([W / 2, apex])}L${xy([W, pedBase])}Z`} fill={wallStone} />
        <path d={`M${tympanum.map(xy).join("L")}Z`} fill={`url(#${id}-recess-fill)`} />
        {/* entablature */}
        <rect x={0} y={pedBase} width={W} height={corniceH} fill={wallStone} />
        <rect x={overhang} y={pedBase + corniceH} width={W - overhang * 2} height={friezeH} fill={wallStone} />
        <rect x={overhang * 1.2} y={pedBase + corniceH + friezeH} width={W - overhang * 2.4} height={archH} fill={wallStone} />
        {/* relief: medallion, rosette and garlands */}
        <circle cx={medallion[0]} cy={medallion[1]} r={medallionR} fill={wallStone} />
        <circle cx={medallion[0]} cy={medallion[1]} r={medallionR * .8} fill="#5f685f" />
        <circle cx={medallion[0]} cy={medallion[1]} r={medallionR * .72} fill="#737c71" />
        {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx={medallion[0]} cy={medallion[1] - medallionR * .4} rx={medallionR * .15} ry={medallionR * .36}
          transform={`rotate(${i * 45} ${n(medallion[0])} ${n(medallion[1])})`} fill="#b3baa9" />)}
        <circle cx={medallion[0]} cy={medallion[1]} r={medallionR * .16} fill="#b6bdae" />
        {[swag(leftSwag[0], medallion[0] - medallionR * 1.05, leftSwag[1], medallionR * 1.1), swag(medallion[0] + medallionR * 1.05, rightSwag[0], rightSwag[1], medallionR * 1.1)].map(d => <g key={d}>
          <path d={d} fill="#3d443d" opacity=".5" transform={`translate(${n(medallionR * .06)} ${n(medallionR * .1)})`} />
          <path d={d} fill="#a9b19f" />
        </g>)}
        {[leftSwag, rightSwag].map(([x, yy], i) => <g key={i}>
          <circle cx={x} cy={yy} r={medallionR * .18} fill="#a8af9f" />
          <path d={taper([[x, yy], [x + (i ? 1 : -1) * medallionR * .2, yy + medallionR * .6], [x, yy + medallionR * 1.1]], medallionR * .12, medallionR * .03)} fill="#9aa293" />
        </g>)}
        {/* acroteria */}
        {([[W / 2, apex, 1.3], [rake * 1.6, pedBase - rake * .4, .9], [W - rake * 1.6, pedBase - rake * .4, .9]] as const).map(([x, yy, s], i) =>
          <g key={i}>{Array.from({ length: 5 }, (_, k) => <ellipse key={k} cx={x} cy={yy - rake * s * .8} rx={rake * s * .2} ry={rake * s * .7}
            transform={`rotate(${(k - 2) * 24} ${n(x)} ${n(yy)})`} fill="#9aa293" />)}
            <rect x={x - rake * s * .55} y={yy - rake * s * .2} width={rake * s * 1.1} height={rake * s * .55} fill={wallStone} /></g>)}
        {/* columns: a rear pair gives the porch depth */}
        {[back, W - back].map(cx => <Column key={cx} cx={cx} top={pedBase + ent} bottom={sillTop} width={colW * .82} order="ionic" id={id} tone={.72} />)}
        {[front, W - front].map(cx => <Column key={cx} cx={cx} top={pedBase + ent} bottom={sillTop + stepH * .05} width={colW} order="ionic" id={id} />)}
        {/* steps */}
        {[0, 1, 2].map(i => <rect key={i} x={S * (.16 - i * .07)} y={sillTop + i * stepH} width={W - S * (.32 - i * .14)} height={stepH} fill={wallStone} />)}
      </g>
      {/* raking cornice light/shade */}
      {/* raking cornice: lit on the left slope, in shade on the right, both inside the pediment */}
      <path d={`M${xy([0, pedBase])}L${xy([W / 2, apex])}L${xy([W / 2, apex + rake * 1.1])}L${xy([rake * 1.1 / slope, pedBase])}Z`} fill="#d3d8cb" opacity=".3" />
      <path d={`M${xy([W / 2, apex])}L${xy([W, pedBase])}L${xy([W - rake * 1.1 / slope, pedBase])}L${xy([W / 2, apex + rake * 1.1])}Z`} fill="#000" opacity=".14" />
      <path d={`M${xy([overhang + rake * 2.4, pedBase])}L${xy([W / 2, apex + rake * 1.7])}`} stroke="#000" strokeOpacity=".32" strokeWidth={rake * .45} />
      <path d={`M${xy([W / 2, apex + rake * 1.7])}L${xy([W - overhang - rake * 2.4, pedBase])}`} stroke="#fff" strokeOpacity=".12" strokeWidth={rake * .3} />
      <rect x={0} y={pedBase} width={W} height={corniceH} fill={`url(#${id}-band)`} />
      <rect x={overhang} y={pedBase + corniceH} width={W - overhang * 2} height={friezeH * .3} fill={`url(#${id}-under)`} />
      <g>{triglyphs.map(x => <g key={x}>
        <rect x={x - triglyphW / 2} y={pedBase + corniceH} width={triglyphW} height={friezeH} fill="#7d857a" />
        {[-.25, 0, .25].map(o => <rect key={o} x={x + o * triglyphW - triglyphW * .05} y={pedBase + corniceH + friezeH * .1} width={triglyphW * .1} height={friezeH * .8} rx={triglyphW * .05} fill="#3a413b" opacity=".55" />)}
        <rect x={x - triglyphW / 2} y={pedBase + corniceH} width={triglyphW * .1} height={friezeH} fill="#fff" opacity=".12" />
      </g>)}</g>
      <rect x={overhang * 1.2} y={pedBase + corniceH + friezeH} width={W - overhang * 2.4} height={archH} fill={`url(#${id}-band)`} />
      <rect x={front - colW * .1} y={A.y} width={W - (front - colW * .1) * 2} height={Math.max(3, ent * .14)} fill={`url(#${id}-under)`} />
      {[0, 1, 2].map(i => <g key={i}>
        <rect x={S * (.16 - i * .07)} y={sillTop + i * stepH} width={W - S * (.32 - i * .14)} height={stepH * .26} fill="#fff" opacity=".14" />
        <rect x={S * (.16 - i * .07)} y={sillTop + i * stepH + stepH * .26} width={W - S * (.32 - i * .14)} height={stepH * .2} fill={`url(#${id}-under)`} opacity=".7" />
      </g>)}
      <Streaks rng={rng} x0={overhang} x1={W - overhang} y={pedBase + corniceH} length={ent * .9} count={Math.round(W / 22)} opacity={.18} />
      <Streaks rng={rng} x0={0} x1={W} y={sillTop + stepH * .3} length={stepH * 2} count={Math.round(W / 30)} opacity={.1} />
      <g>{lichen}</g>
      <rect x={A.x - 2} y={A.y - 2} width={A.width + 4} height={A.height + 4} fill="#1a1f1b" />
    </g>
  </svg>;
}

/* ------------------------------------------------------------- */
/* Blossom branch: white moulding with cherry-blossom spray       */
/* ------------------------------------------------------------- */

const PETAL = (r: number) =>
  `M0 0C${n(-r * .46)} ${n(-r * .18)} ${n(-r * .6)} ${n(-r * .8)} ${n(-r * .2)} ${n(-r * .99)}L0 ${n(-r * .84)}L${n(r * .2)} ${n(-r * .99)}C${n(r * .6)} ${n(-r * .8)} ${n(r * .46)} ${n(-r * .18)} 0 0Z`;

function Blossom({ x, y, r, rotate, id, open, rng }: { x: number; y: number; r: number; rotate: number; id: string; open: "full" | "half" | "bud"; rng: Rng }) {
  if (open === "bud") {
    return <g transform={`translate(${n(x)} ${n(y)}) rotate(${n(rotate)})`}>
      <path d={`M0 0C${n(-r * .42)} ${n(-r * .3)} ${n(-r * .3)} ${n(-r * .9)} 0 ${n(-r)}C${n(r * .3)} ${n(-r * .9)} ${n(r * .42)} ${n(-r * .3)} 0 0Z`} fill={`url(#${id}-bud)`} />
      <path d={`M0 ${n(r * .05)}l${n(-r * .3)} ${n(-r * .32)}l${n(r * .3)} ${n(r * .12)}l${n(r * .3)} ${n(-r * .12)}Z`} fill="#7a2a22" />
      <path d={`M0 0l0 ${n(r * .45)}`} stroke="#5a2a1f" strokeWidth={Math.max(.8, r * .08)} />
    </g>;
  }
  const petals = open === "full" ? [0, 72, 144, 216, 288] : [-58, -18, 22, 62];
  const squash = open === "full" ? 1 : .62;
  const stamens = Array.from({ length: open === "full" ? 13 : 7 }, (_, i) => {
    const a = (i / 13) * Math.PI * 2 + between(rng, -.2, .2), len = r * between(rng, .36, .58);
    return [Math.cos(a) * len, Math.sin(a) * len * squash - (open === "half" ? r * .25 : 0)] as Pt;
  });
  return <g transform={`translate(${n(x)} ${n(y)}) rotate(${n(rotate)})`}>
    <g transform={`scale(1 ${squash})`}>
      {petals.map(a => <g key={a} transform={`rotate(${a + between(rng, -6, 6)})`}>
        <path d={PETAL(r * between(rng, .92, 1.06))} fill={`url(#${id}-petal)`} stroke="#fff" strokeOpacity=".7" strokeWidth={Math.max(.4, r * .025)} />
        <path d={`M0 ${n(-r * .12)}Q${n(r * .04)} ${n(-r * .5)} 0 ${n(-r * .78)}`} fill="none" stroke="#d65c8a" strokeOpacity=".28" strokeWidth={Math.max(.4, r * .03)} />
      </g>)}
      <circle r={r * .22} fill="#c23b67" />
      <circle r={r * .11} fill="#8f1f44" />
    </g>
    <g stroke="#b52d5c" strokeWidth={Math.max(.4, r * .035)} strokeLinecap="round">{stamens.map((p, i) => <line key={i} x1="0" y1={open === "half" ? -r * .2 : 0} x2={p[0]} y2={p[1]} />)}</g>
    <g fill="#f7cf5a">{stamens.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={Math.max(.7, r * .055)} />)}</g>
  </g>;
}

/** A bough bent around a frame corner: thickest at the bend, tapering to blossoming tips. */
function blossomSpray(points: Pt[], rng: Rng, size: number, allowed: ReturnType<typeof clearOfText>, id: string, key: string, twigs: number, bend: number): ReactNode {
  const flowers: ReactNode[] = [];
  const leaves: ReactNode[] = [];
  const profile = (t: number) => size * (.04 + .17 * Math.pow(Math.max(0, 1 - Math.abs(t - bend) / Math.max(bend, 1 - bend)), .8));
  const branches: ReactNode[] = [<path key="main" d={taper(points, 0, 0, profile)} fill={`url(#${id}-bark)`} />];
  const clusterAt = (p: Pt, spread: number, count: number, k: string) => {
    for (let i = 0; i < count; i++) {
      const x = p[0] + between(rng, -spread, spread), y = p[1] + between(rng, -spread, spread * .8);
      const roll = rng(), open = roll < .55 ? "full" : roll < .8 ? "half" : "bud";
      const r = size * (open === "bud" ? between(rng, .2, .28) : between(rng, .3, .52));
      if (!allowed(x, y, r)) continue;
      flowers.push(<Blossom key={`${k}${i}`} x={x} y={y} r={r} rotate={between(rng, -180, 180)} id={id} open={open} rng={rng} />);
    }
  };
  for (let i = 0; i < twigs; i++) {
    const t = (i + between(rng, .2, .8)) / twigs, { p, angle } = along(points, t), side = i % 2 ? -1 : 1;
    const a = (angle + side * between(rng, 28, 64)) * Math.PI / 180, len = size * between(rng, .7, 1.3);
    const end: Pt = [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len];
    const mid: Pt = [lerp(p[0], end[0], .5) + side * size * .08, lerp(p[1], end[1], .5)];
    if (!allowed(end[0], end[1], size * .2)) continue;
    branches.push(<path key={`t${i}`} d={taper([p, mid, end], size * .085, size * .022)} fill={`url(#${id}-bark)`} />);
    clusterAt(end, size * .3, 3, `${key}t${i}`);
    if (rng() < .5) {
      const leafAngle = Math.atan2(end[1] - p[1], end[0] - p[0]) * 180 / Math.PI + side * 40;
      leaves.push(<g key={`l${i}`} transform={`translate(${n(mid[0])} ${n(mid[1])}) rotate(${n(leafAngle)})`}>
        <path d={leafPath(size * .55, size * .26)} fill={`url(#${id}-young)`} />
        <path d={`M0 0L${n(size * .5)} 0`} stroke="#6f3a26" strokeOpacity=".5" strokeWidth=".7" />
      </g>);
    }
  }
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    clusterAt(along(points, t).p, size * .26, Math.abs(t - bend) < .15 ? 3 : i % 3 ? 1 : 2, `${key}m${i}`);
  }
  return <g key={key}>{branches}{leaves}{flowers}</g>;
}

function blossomBranchBack(g: BranchingFrameGeometry): ReactNode {
  const { window: A, id } = g;
  const bar = Math.max(5, g.width * .016);
  return <svg {...svgProps(g)}>
    <defs>
      <filter id={`${id}-cast`} x="-6%" y="-6%" width="114%" height="118%">
        <feDropShadow dx={bar * .9} dy={bar * 1.3} stdDeviation={bar * .9} floodColor="#7d3556" floodOpacity=".28" />
      </filter>
      <linearGradient id={`${id}-moulding`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#ffffff" /><stop offset=".5" stopColor="#fbf6f8" /><stop offset="1" stopColor="#efe4ea" />
      </linearGradient>
    </defs>
    <g filter={`url(#${id}-cast)`}>
      <path fillRule="evenodd" fill={`url(#${id}-moulding)`} d={`M${n(A.x - bar)} ${n(A.y - bar)}h${n(A.width + bar * 2)}v${n(A.height + bar * 2)}h${n(-A.width - bar * 2)}Z M${n(A.x)} ${n(A.y)}v${n(A.height)}h${n(A.width)}v${n(-A.height)}Z`} />
    </g>
    {/* bevel: the inner edge catches light on the lower right */}
    <path d={`M${n(A.x - bar)} ${n(A.y - bar)}h${n(A.width + bar * 2)}`} stroke="#fff" strokeWidth="1.2" />
    <path d={`M${n(A.x)} ${n(A.y)}h${n(A.width)}M${n(A.x)} ${n(A.y)}v${n(A.height)}`} stroke="#d9c4cf" strokeWidth="1.2" />
    <path d={`M${n(A.x - bar)} ${n(A.y + A.height + bar)}h${n(A.width + bar * 2)}v${n(-A.height - bar * 2)}`} stroke="#e2cdd8" strokeWidth="1" fill="none" />
  </svg>;
}

function blossomBranchFront(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const rng = seeded(4041);
  const size = Math.max(14, Math.min(W * .042, A.x * .95));
  const allowed = clearOfText(g, W * BLOSSOM_BRANCH.intrusion!);
  // Each bough bends around a corner of the moulding: along the top and down
  // the right side, and up the left side and along the bottom.
  const topRight: Pt[] = [[A.x + A.width * .44, A.y - A.x * .18], [A.x + A.width * .6, A.y - A.x * .45], [A.x + A.width * .78, A.y - A.x * .1], [A.x + A.width + A.x * .05, A.y - A.x * .5], [W - A.x * .45, A.y + A.height * .14], [A.x + A.width + A.x * .1, A.y + A.height * .32], [W - A.x * .4, A.y + A.height * .52]];
  const bottomLeft: Pt[] = [[A.x * .4, A.y + A.height * .46], [A.x - A.x * .1, A.y + A.height * .66], [A.x * .45, A.y + A.height * .86], [A.x - A.x * .05, A.y + A.height + A.x * .5], [A.x + A.width * .16, A.y + A.height + A.x * .1], [A.x + A.width * .3, A.y + A.height + A.x * .48], [A.x + A.width * .42, A.y + A.height + A.x * .2]];
  const drift = Array.from({ length: 9 }, (_, i) => {
    const x = rng() < .5 ? between(rng, 0, A.x * .9) : between(rng, A.x + A.width + A.x * .1, W);
    const y = between(rng, 0, H);
    const r = size * between(rng, .18, .3);
    return <path key={i} d={PETAL(r)} transform={`translate(${n(x)} ${n(y)}) rotate(${n(between(rng, 0, 360))}) scale(1 .7)`} fill={`url(#${id}-petal)`} opacity=".85" />;
  });
  return <svg {...svgProps(g)}>
    <defs>
      <radialGradient id={`${id}-petal`} cx=".5" cy="1" r="1.05">
        <stop stopColor="#d9467a" /><stop offset=".3" stopColor="#f08fb3" /><stop offset=".75" stopColor="#fcd3e3" /><stop offset="1" stopColor="#fff2f7" />
      </radialGradient>
      <linearGradient id={`${id}-bud`} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#a52454" /><stop offset="1" stopColor="#f07aa6" /></linearGradient>
      <linearGradient id={`${id}-bark`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8a4232" /><stop offset="1" stopColor="#4a1e1a" /></linearGradient>
      <linearGradient id={`${id}-young`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#8a5a2c" /><stop offset=".6" stopColor="#8c9a3c" /><stop offset="1" stopColor="#b6c46a" /></linearGradient>
      <filter id={`${id}-soft`}><feDropShadow dx={size * .06} dy={size * .12} stdDeviation={size * .08} floodColor="#8e2f57" floodOpacity=".3" /></filter>
    </defs>
    <WindowRecess window={A} id={`${id}-recess`} depth={size * .5} strength={.6} />
    <g filter={`url(#${id}-soft)`}>
      {blossomSpray(topRight, rng, size, allowed, id, "tr", 11, .55)}
      {blossomSpray(bottomLeft, rng, size, allowed, id, "bl", 11, .45)}
      {drift}
    </g>
  </svg>;
}

/* ----------------------------------------------------- */
/* Leaf canopy: flat illustrated branches on a cream mat */
/* ----------------------------------------------------- */

const LEAF_GREENS = ["#5d9e23", "#79b52a", "#9bcc3c", "#bfe063"];

function leafCluster(cx: number, cy: number, rx: number, ry: number, count: number, size: number, rng: Rng, allowed: ReturnType<typeof clearOfText>, key: string): ReactNode[] {
  const leaves = Array.from({ length: count }, () => {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
    return { x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, angle: between(rng, 0, 360), length: size * between(rng, .75, 1.2), shade: rng() };
  }).sort((a, b) => a.y - b.y);
  return leaves.filter(l => allowed(l.x, l.y, l.length * .7)).map((l, i) => {
    // Leaves further up and to the right catch more light.
    const tone = Math.min(3, Math.max(0, Math.floor(l.shade * 2.4 + (cy - l.y) / (ry * 2) + 1)));
    const width = l.length * .5;
    return <g key={`${key}${i}`} transform={`translate(${n(l.x)} ${n(l.y)}) rotate(${n(l.angle)})`}>
      <path d={leafPath(l.length, width)} fill={LEAF_GREENS[tone]} />
      <path d={leafHalf(l.length, width)} fill="#ffffff" opacity=".1" />
      <path d={`M0 0L${n(l.length * .82)} 0`} stroke="#3e7516" strokeOpacity=".55" strokeWidth={Math.max(.6, l.length * .035)} strokeLinecap="round" />
    </g>;
  });
}

function leafCanopyBack(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  return <svg {...svgProps(g)}>
    <defs>
      <radialGradient id={`${id}-mat`} cx=".5" cy=".45" r=".75"><stop stopColor="#fffdf2" /><stop offset=".75" stopColor="#f9f6e2" /><stop offset="1" stopColor="#efecd2" /></radialGradient>
      <filter id={`${id}-cast`} x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy={A.x * .08} stdDeviation={A.x * .12} floodColor="#1f3c12" floodOpacity=".28" /></filter>
    </defs>
    <rect width={W} height={H} rx={A.x * .3} fill={`url(#${id}-mat)`} filter={`url(#${id}-cast)`} />
    <rect x={A.x - 3} y={A.y - 3} width={A.width + 6} height={A.height + 6} rx={(LEAF_CANOPY.windowRadius ?? 0) + 3} fill="#e4e0c3" />
  </svg>;
}

function leafCanopyFront(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const rng = seeded(77);
  const size = Math.max(12, Math.min(W * .036, A.x * .66));
  const allowed = clearOfText(g, W * LEAF_CANOPY.intrusion!, false);
  const limb = (points: Pt[], start: number, end: number, key: string) => <g key={key}>
    <path d={taper(points, start, end)} fill="#7b4a2b" />
    <path d={taper(points.map(([x, y]) => [x, y - start * .16] as Pt), start * .42, end * .3)} fill="#a8693f" />
  </g>;
  const top: Pt[] = [[-size, A.y + A.height * .34], [A.x * .55, A.y + A.height * .1], [A.x + A.width * .06, A.y * .5], [A.x + A.width * .3, A.y * .3], [A.x + A.width * .55, -size * .3]];
  const twigTop: Pt[] = [[A.x + A.width * .06, A.y * .5], [A.x + A.width * .12, A.y + size * .15], [A.x + A.width * .2, A.y + size * .25]];
  const right: Pt[] = [[W + size, A.y + A.height * .3], [W - A.x * .45, A.y + A.height * .42], [A.x + A.width - size * .1, A.y + A.height * .52], [A.x + A.width - A.x * .2, A.y + A.height * .66]];
  const bottom: Pt[] = [[W + size, H - A.x * .2], [A.x + A.width * .72, A.y + A.height + A.x * .4], [A.x + A.width * .45, A.y + A.height + A.x * .1], [A.x + A.width * .28, A.y + A.height - size * .1]];
  const leaves = [
    ...leafCluster(A.x * .5, A.y * .9, A.x * 1.5, A.y * 1.1, 70, size, rng, allowed, "tl"),
    ...leafCluster(A.x + A.width * .16, A.y * .5, A.width * .16, A.y * .7, 52, size, rng, allowed, "tt"),
    ...leafCluster(A.x + A.width * .38, A.y * .32, A.width * .14, A.y * .55, 40, size, rng, allowed, "tf"),
    ...leafCluster(A.x + A.width * .56, A.y * .1, A.width * .06, A.y * .35, 14, size * .9, rng, allowed, "tx"),
    ...leafCluster(A.x * .35, A.y + A.height * .42, A.x * .7, A.height * .14, 22, size, rng, allowed, "lm"),
    ...leafCluster(W - A.x * .45, A.y + A.height * .4, A.x * 1.1, A.height * .2, 46, size, rng, allowed, "rm"),
    ...leafCluster(A.x + A.width * .3, H - A.x * .25, A.width * .14, A.x * .65, 40, size, rng, allowed, "bl"),
    ...leafCluster(A.x + A.width * .58, H - A.x * .32, A.width * .14, A.x * .75, 48, size, rng, allowed, "bm"),
    ...leafCluster(W - A.x * .6, H - A.x * .45, A.x * 1.6, A.x * 1.1, 52, size, rng, allowed, "br"),
    ...leafCluster(A.x * .55, H - A.x * .4, A.x * 1.1, A.x * .9, 34, size, rng, allowed, "bc"),
    ...leafCluster(A.x + A.width - A.x * .1, A.y + A.height * .64, A.x * .6, A.height * .08, 12, size * .9, rng, allowed, "re"),
  ];
  return <svg {...svgProps(g)}>
    <defs>
      <filter id={`${id}-lift`}><feDropShadow dx="0" dy={size * .1} stdDeviation={size * .1} floodColor="#2c4a12" floodOpacity=".3" /></filter>
      <clipPath id={`${id}-bounds`}><rect width={W} height={H} rx={A.x * .3} /></clipPath>
    </defs>
    <WindowRecess window={A} id={`${id}-recess`} depth={size * .45} strength={.5} />
    <g filter={`url(#${id}-lift)`} clipPath={`url(#${id}-bounds)`}>
      {limb(top, size * .62, size * .14, "top")}
      {limb(twigTop, size * .2, size * .06, "twig")}
      {limb(right, size * .56, size * .12, "right")}
      {limb(bottom, size * .6, size * .12, "bottom")}
      {leaves}
    </g>
  </svg>;
}

/* ---------------------------------------------------------------- */
/* Walnut lintel: through-tenon frame with swept cap and ebony keys  */
/* ---------------------------------------------------------------- */

function walnutLintelBack(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const S = A.x, T = A.y, Bt = H - A.y - A.height;
  const over = S * .44, stile = S - over;
  const capTop = T * .03, capBottom = T * .34, lift = T * .12;
  const railTop = T * .58;
  const footY = H - Bt * .02;
  // The cap is level across the middle and sweeps up toward both ends.
  const cap = `M0 ${n(capTop)}C${n(W * .18)} ${n(capTop + lift)} ${n(W * .3)} ${n(capTop + lift)} ${n(W / 2)} ${n(capTop + lift)}S${n(W * .82)} ${n(capTop + lift)} ${n(W)} ${n(capTop)}L${n(W - over * .1)} ${n(capBottom - lift * .55)}C${n(W * .8)} ${n(capBottom)} ${n(W * .7)} ${n(capBottom)} ${n(W / 2)} ${n(capBottom)}S${n(W * .2)} ${n(capBottom)} ${n(over * .1)} ${n(capBottom - lift * .55)}Z`;
  const bottomRail = `M${n(over * .55)} ${n(A.y + A.height)}H${n(W - over * .55)}V${n(footY)}H${n(W - over * .55 - stile * .9)}Q${n(W / 2)} ${n(footY - Bt * .34)} ${n(over * .55 + stile * .9)} ${n(footY)}H${n(over * .55)}Z`;
  const block = (cx: number, w: number) => {
    const y0 = capBottom - lift * .2, y1 = railTop, notch = w * .18;
    return `M${n(cx - w / 2)} ${n(y0)}H${n(cx + w / 2)}V${n(y1 - notch * 1.4)}Q${n(cx + w / 2 - notch)} ${n(y1 - notch * 1.4)} ${n(cx + w / 2 - notch)} ${n(y1)}H${n(cx - w / 2 + notch)}Q${n(cx - w / 2 + notch)} ${n(y1 - notch * 1.4)} ${n(cx - w / 2)} ${n(y1 - notch * 1.4)}Z`;
  };
  // Flat-sawn grain: repeated contour lines through noise stretched along the
  // member, a broad tonal "figure", and fine open pores.
  const grain = (name: string, along: "x" | "y") => {
    const s = Math.max(.6, W / 1000);
    const f = (lengthwise: number, across: number) => along === "x" ? `${n(lengthwise / s * 1e4) / 1e4} ${n(across / s * 1e3) / 1e3}` : `${n(across / s * 1e3) / 1e3} ${n(lengthwise / s * 1e4) / 1e4}`;
    return <filter id={`${id}-${name}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={f(.0016, .022)} numOctaves="3" seed="21" result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="r" />
      <feComponentTransfer in="r" result="rings"><feFuncA type="table" tableValues="0 .5 .05 0 .45 .08 0 .55 .05 0 .5 .06 0 .48 .04 0 .52 0" /></feComponentTransfer>
      <feFlood floodColor="#24130a" />
      <feComposite in2="rings" operator="in" result="lines" />
      <feTurbulence type="fractalNoise" baseFrequency={f(.003, .3)} numOctaves="2" seed="5" result="p" />
      <feColorMatrix in="p" type="matrix" values="0 0 0 0 .1  0 0 0 0 .05  0 0 0 0 .02  2.2 0 0 0 -1.2" result="pores" />
      <feTurbulence type="fractalNoise" baseFrequency={f(.001, .006)} numOctaves="2" seed="9" result="fig" />
      <feColorMatrix in="fig" type="matrix" values="0 0 0 0 .62  0 0 0 0 .4  0 0 0 0 .24  1.1 0 0 0 -.48" result="figure" />
      <feComposite in="figure" in2="SourceGraphic" operator="atop" result="toned" />
      <feComposite in="lines" in2="toned" operator="atop" result="grained" />
      <feComposite in="pores" in2="grained" operator="atop" />
    </filter>;
  };
  const edge = (d: string) => <><path d={d} fill={`url(#${id}-lacquer)`} /><path d={d} fill="none" stroke="#1c0e07" strokeOpacity=".55" strokeWidth=".9" /></>;
  const blocks = [W / 2, W * .27, W * .73];
  const keys = [over + stile * .3, over + stile * .7, W - over - stile * .3, W - over - stile * .7];
  return <svg {...svgProps(g)}>
    <defs>
      {grain("h", "x")}
      {grain("v", "y")}
      <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7a4b30" /><stop offset=".45" stopColor="#663c25" /><stop offset="1" stopColor="#4d2c1a" /></linearGradient>
      <linearGradient id={`${id}-wood-v`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#7b4c31" /><stop offset=".5" stopColor="#653b24" /><stop offset="1" stopColor="#4a2a18" /></linearGradient>
      <linearGradient id={`${id}-lacquer`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#ffd9a8" stopOpacity=".3" /><stop offset=".12" stopColor="#ffd9a8" stopOpacity=".05" /><stop offset=".8" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".3" />
      </linearGradient>
      <linearGradient id={`${id}-ebony`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#2b1d17" /><stop offset=".4" stopColor="#120a07" /><stop offset="1" stopColor="#0a0604" /></linearGradient>
      <filter id={`${id}-cast`} x="-6%" y="-6%" width="112%" height="120%">
        <feDropShadow dx={S * .06} dy={S * .14} stdDeviation={S * .14} floodColor="#3b2414" floodOpacity=".42" />
      </filter>
    </defs>
    <g filter={`url(#${id}-cast)`}>
      <g filter={`url(#${id}-v)`}>
        <rect x={over} y={capBottom - lift} width={stile} height={footY - capBottom + lift} fill={`url(#${id}-wood-v)`} />
        <rect x={W - over - stile} y={capBottom - lift} width={stile} height={footY - capBottom + lift} fill={`url(#${id}-wood-v)`} />
        {blocks.map(cx => <path key={cx} d={block(cx, stile * (cx === W / 2 ? .7 : .55))} fill={`url(#${id}-wood-v)`} />)}
      </g>
      <g filter={`url(#${id}-h)`}>
        <path d={cap} fill={`url(#${id}-wood)`} />
        <rect x={over * .5} y={railTop} width={W - over} height={T - railTop} fill={`url(#${id}-wood)`} />
        <path d={bottomRail} fill={`url(#${id}-wood)`} />
      </g>
      {/* finish, arrises and joinery */}
      {edge(cap)}
      {edge(`M${n(over * .5)} ${n(railTop)}h${n(W - over)}v${n(T - railTop)}h${n(-(W - over))}Z`)}
      {edge(bottomRail)}
      {[over, W - over - stile].map(x => <g key={x}>
        <rect x={x} y={capBottom} width={stile * .12} height={footY - capBottom} fill="#ffd9a8" opacity=".12" />
        <rect x={x + stile * .86} y={capBottom} width={stile * .14} height={footY - capBottom} fill="#000" opacity=".22" />
      </g>)}
      <rect x={over * .5} y={T - 2} width={W - over} height={2} fill="#000" opacity=".35" />
      <path d={`M${n(over * .1)} ${n(capBottom - lift * .55)}C${n(W * .2)} ${n(capBottom)} ${n(W * .3)} ${n(capBottom)} ${n(W / 2)} ${n(capBottom)}S${n(W * .8)} ${n(capBottom)} ${n(W - over * .1)} ${n(capBottom - lift * .55)}`} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth={Math.max(1.5, T * .025)} />
      {keys.map((x, i) => <g key={i}>
        <rect x={x - stile * .04} y={footY - Bt * 1.55} width={stile * .08} height={Bt * 1.3} fill={`url(#${id}-ebony)`} />
        <rect x={x - stile * .04} y={footY - Bt * 1.55} width={stile * .02} height={Bt * 1.3} fill="#fff" opacity=".12" />
      </g>)}
      {[over + stile / 2, W - over - stile / 2].map(cx => <g key={cx}>
        <rect x={cx - stile * .09} y={railTop + (T - railTop) * .32} width={stile * .18} height={stile * .18} fill={`url(#${id}-ebony)`} />
        <rect x={cx - stile * .09} y={railTop + (T - railTop) * .32} width={stile * .18} height={stile * .04} fill="#fff" opacity=".14" />
      </g>)}
    </g>
    <rect x={A.x - 1.5} y={A.y - 1.5} width={A.width + 3} height={A.height + 3} fill="#1a0f08" />
  </svg>;
}

/* ------------------------------------------------------------------ */
/* Forest grove: two old trees whose boughs meet over the window       */
/* ------------------------------------------------------------------ */

const fmt = (value: number) => String(Math.round(value * 1e4) / 1e4);

/** The stage minus the reading area: front art may lean over the window's edge band, never its text. */
function edgeBandClip({ width: W, height: H, window: A }: BranchingFrameGeometry, reach: number): string {
  return `M0 0H${n(W)}V${n(H)}H0Z M${n(A.x + reach)} ${n(A.y + reach)}V${n(A.y + A.height - reach)}H${n(A.x + A.width - reach)}V${n(A.y + reach)}Z`;
}

/** Samples along a smoothed spine with unit normals. */
function spine(points: Pt[]) {
  const line = smooth(points);
  return line.map((p, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { p, nx: -(b[1] - a[1]) / length, ny: (b[0] - a[0]) / length, t: i / (line.length - 1) };
  });
}

function curveLength(points: Pt[]): number {
  const line = smooth(points);
  return line.reduce((sum, p, i) => i ? sum + Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1]) : 0, 0);
}

/** Ridged bark: long furrows stretched along the trunk with grit between, lit from the upper left. */
function RidgedBark({ id, s, grain = "y" }: { id: string; s: number; grain?: "x" | "y" }) {
  const ridges = grain === "y" ? `${fmt(.07 / s)} ${fmt(.006 / s)}` : `${fmt(.006 / s)} ${fmt(.07 / s)}`;
  return <filter id={id} x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency={ridges} numOctaves="4" seed="17" result="ridges" />
    <feTurbulence type="fractalNoise" baseFrequency={fmt(.45 / s)} numOctaves="2" seed="4" result="grit" />
    <feComposite in="ridges" in2="grit" operator="arithmetic" k2=".8" k3=".2" result="height" />
    <feDiffuseLighting in="height" surfaceScale={fmt(4.6 * s)} lightingColor="#fff" result="lit"><feDistantLight azimuth="205" elevation="40" /></feDiffuseLighting>
    <feComposite in="lit" in2="SourceGraphic" operator="arithmetic" k1="1.26" k2="0" k3="0" k4="0" result="shaded" />
    <feComposite in="shaded" in2="SourceAlpha" operator="in" />
  </filter>;
}

/** Fissures follow the wood: a dark crack with a lit ridge on its upper-left side. */
function fissures(points: Pt[], widthAt: (t: number) => number, rng: Rng, s: number, count: number): ReactNode {
  const frames = spine(points);
  return <g>{Array.from({ length: count }, (_, k) => {
    const lane = between(rng, -.78, .78), from = between(rng, 0, .4), to = from + between(rng, .25, .6), phase = rng() * 6;
    const pts = frames.filter(f => f.t >= from && f.t <= to).map(f => {
      const off = (lane + Math.sin(f.t * 24 + phase) * .05) * widthAt(f.t) / 2;
      return [f.p[0] + f.nx * off, f.p[1] + f.ny * off] as Pt;
    });
    if (pts.length < 2) return null;
    const d = `M${pts.map(xy).join("L")}`;
    return <g key={k}>
      <path d={d} fill="none" stroke="#0b0705" strokeOpacity=".62" strokeWidth={n(s * between(rng, 1, 2.4))} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#a89077" strokeOpacity=".2" strokeWidth={n(s * .9)} transform={`translate(${n(-s * 1.7)} ${n(-s * .4)})`} />
    </g>;
  })}</g>;
}

/** A fern frond: tapering rachis with paired pinnae that shorten toward the tip. */
function fern(points: Pt[], size: number, rng: Rng, allowed: ReturnType<typeof clearOfText>, id: string, key: string): ReactNode {
  const steps = Math.max(5, Math.round(curveLength(points) / (size * .17)));
  const pinnae: ReactNode[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, { p, angle } = along(points, t);
    const len = size * (1 - t * .7) * between(rng, .85, 1.08);
    for (const side of [-1, 1]) {
      const heading = angle + side * between(rng, 55, 70), rad = heading * Math.PI / 180;
      if (!allowed(p[0] + Math.cos(rad) * len, p[1] + Math.sin(rad) * len, len * .2)) continue;
      pinnae.push(<g key={`${i}${side}`} transform={`translate(${n(p[0])} ${n(p[1])}) rotate(${n(heading)})`}>
        <path d={leafPath(len, len * .26)} fill={`url(#${id}-fern)`} />
        <path d={`M0 0L${n(len * .8)} 0`} stroke="#22401a" strokeOpacity=".4" strokeWidth={n(Math.max(.4, len * .03))} />
      </g>);
    }
  }
  return <g key={key}>
    <path d={taper(points, size * .08, size * .015)} fill="#36521c" />
    {pinnae}
  </g>;
}

interface FoliageLayer { count: number; size: number; colors: string[]; highlight?: string; vein?: boolean }

/** Leaves scattered around cluster centres, pointing outward like real sprays. */
function foliage(centers: Pt[], spread: number, layer: FoliageLayer, rng: Rng, allowed: ReturnType<typeof clearOfText>, key: string): ReactNode[] {
  const leaves: ReactNode[] = [];
  centers.forEach((c, ci) => {
    for (let i = 0; i < layer.count; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * spread;
      const x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d * .72;
      const len = layer.size * between(rng, .72, 1.28), w = len * between(rng, .42, .56);
      if (!allowed(x, y, len * .5)) continue;
      const angle = a * 180 / Math.PI + between(rng, -45, 45);
      leaves.push(<g key={`${key}${ci}-${i}`} transform={`translate(${n(x)} ${n(y)}) rotate(${n(angle)})`}>
        <path d={leafPath(len, w)} fill={layer.colors[Math.floor(rng() * layer.colors.length)]} />
        {layer.highlight && <path d={leafHalf(len, w)} fill={layer.highlight} opacity=".32" />}
        {layer.vein && <path d={`M${n(len * .08)} 0L${n(len * .86)} 0`} stroke="#0e1d0b" strokeOpacity=".35" strokeWidth={n(Math.max(.4, len * .04))} />}
      </g>);
    }
  });
  return leaves;
}

/** A five-lobed ivy leaf pointing up, with a notched heart at the stalk. */
function ivyLeaf(size: number): string {
  const outline: Array<[number, number]> = [[-168, .62], [-130, .38], [-90, 1], [-50, .38], [-12, .62], [40, .42], [90, .14], [140, .42]];
  return roundedPoly(outline.map(([a, r]) => [Math.cos(a * Math.PI / 180) * r * size, Math.sin(a * Math.PI / 180) * r * size] as Pt), size * .12);
}

function toadstool(x: number, y: number, h: number, kind: "red" | "tan", id: string, rng: Rng, key: string): ReactNode {
  const cw = h * .95, ch = h * .46, top = y - h * .62, lean = between(rng, -.1, .1) * h, cx = x + lean;
  const cap = `M${n(cx - cw / 2)} ${n(top)}C${n(cx - cw * .48)} ${n(top - ch * 1.3)} ${n(cx + cw * .48)} ${n(top - ch * 1.3)} ${n(cx + cw / 2)} ${n(top)}Q${n(cx)} ${n(top + ch * .24)} ${n(cx - cw / 2)} ${n(top)}Z`;
  const spots = kind === "red" ? Array.from({ length: 6 }, (_, i) => {
    const u = between(rng, -.75, .75), v = between(rng, .3, .92);
    return <ellipse key={i} cx={n(cx + u * cw * .42 * (1 - v * .35))} cy={n(top - ch * v * .92)} rx={n(h * between(rng, .03, .055))} ry={n(h * between(rng, .022, .04))} fill="#fff7e6" opacity=".92" />;
  }) : null;
  return <g key={key}>
    <path d={`M${n(x - h * .1)} ${n(y)}C${n(x - h * .12)} ${n(y - h * .3)} ${n(cx - h * .1)} ${n(top + h * .06)} ${n(cx - h * .07)} ${n(top + h * .02)}L${n(cx + h * .07)} ${n(top + h * .02)}C${n(cx + h * .1)} ${n(top + h * .06)} ${n(x + h * .12)} ${n(y - h * .3)} ${n(x + h * .1)} ${n(y)}Z`} fill={`url(#${id}-stem)`} />
    <ellipse cx={n(x + lean * .6)} cy={n(y - h * .4)} rx={n(h * .12)} ry={n(h * .035)} fill="#e6dabd" />
    <ellipse cx={n(cx)} cy={n(top + ch * .07)} rx={n(cw * .47)} ry={n(ch * .17)} fill="#7a6650" />
    <path d={cap} fill={`url(#${id}-cap-${kind})`} />
    {spots}
    <ellipse cx={n(cx - cw * .18)} cy={n(top - ch * .78)} rx={n(cw * .14)} ry={n(ch * .14)} fill="#fff" opacity=".28" />
  </g>;
}

/** Wood anemone: five white petals and a gold centre on a slender stalk. */
function anemone(x: number, y: number, r: number, rng: Rng, key: string): ReactNode {
  const head: Pt = [x + between(rng, -r, r), y - r * between(rng, 2.6, 3.6)];
  return <g key={key}>
    <path d={`M${n(x)} ${n(y)}Q${n(x)} ${n((y + head[1]) / 2)} ${xy(head)}`} fill="none" stroke="#4d6b2a" strokeWidth={n(Math.max(.6, r * .18))} />
    <g transform={`translate(${xy(head)}) rotate(${n(between(rng, 0, 72))})`}>
      {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cy={n(-r * .55)} rx={n(r * .36)} ry={n(r * .58)} transform={`rotate(${a})`} fill="#f7f4ea" stroke="#d8d2c0" strokeWidth=".4" />)}
      <circle r={n(r * .26)} fill="#e9c24c" />
    </g>
  </g>;
}

/** Dark backing behind the rails so the gap between bark and video reads as a deep rebate. */
function forestGroveBack(g: BranchingFrameGeometry): ReactNode {
  const { window: A } = g;
  const b = Math.min(A.x, A.y) * .56, pad = b * .55;
  return <svg {...svgProps(g)}>
    <rect x={n(A.x - pad)} y={n(A.y - pad)} width={n(A.width + pad * 2)} height={n(A.height + pad * 2)} rx={n(b * .25)} fill="#1a130d" />
  </svg>;
}

interface Rail { points: Pt[]; from: number; to: number; horizontal: boolean; main: boolean; out: Pt }

function forestGroveFront(g: BranchingFrameGeometry): ReactNode {
  const { width: W, window: A, id } = g;
  const rng = seeded(4242);
  const s = Math.max(.45, W / 1000);
  const reach = W * FOREST_GROVE.intrusion!;
  const inside = clearOfText(g, reach);
  // Rails are cut branches laid just outside the window and lashed where they cross.
  const b = Math.min(A.x, A.y) * .56, gap = b * .22, over = b * .7;
  const L = Math.max(6, b * .34);
  const top = A.y - gap - b * .5, bottom = A.y + A.height + gap + b * .5;
  const left = A.x - gap - b * .5, right = A.x + A.width + gap + b * .5;
  const jitter = (pts: Pt[]) => pts.map((p, i) => i === 0 || i === pts.length - 1 ? p : [p[0] + between(rng, -b * .06, b * .06), p[1] + between(rng, -b * .06, b * .06)] as Pt);
  const line = (a: Pt, c: Pt, bow: Pt): Pt[] => jitter([0, .25, .5, .75, 1].map(t => {
    const lift = Math.sin(Math.PI * t);
    return [lerp(a[0], c[0], t) + bow[0] * lift, lerp(a[1], c[1], t) + bow[1] * lift] as Pt;
  }));
  const rails: Rail[] = [
    { points: line([left, bottom + over * .55], [left - b * .06, top - over * .9], [-b * .14, 0]), from: b * .8, to: b * .55, horizontal: false, main: true, out: [-1, 0] },
    { points: line([right, top - over * .55], [right + b * .06, bottom + over * .9], [b * .14, 0]), from: b * .78, to: b * .55, horizontal: false, main: true, out: [1, 0] },
    { points: line([left + b * .26, top - over * .2], [left + b * .22, A.y + A.height * .62], [b * .06, 0]), from: b * .42, to: b * .1, horizontal: false, main: false, out: [-1, 0] },
    { points: line([right - b * .26, bottom + over * .2], [right - b * .22, A.y + A.height * .36], [-b * .06, 0]), from: b * .42, to: b * .1, horizontal: false, main: false, out: [1, 0] },
    { points: line([left - over * .55, top + b * .04], [right + over * .9, top - b * .04], [0, -b * .16]), from: b * .8, to: b * .56, horizontal: true, main: true, out: [0, -1] },
    { points: line([right + over * .55, bottom], [left - over * .9, bottom + b * .02], [0, b * .14]), from: b * .82, to: b * .55, horizontal: true, main: true, out: [0, 1] },
    { points: line([right + over * .3, top + b * .26], [A.x + A.width * .32, top + b * .22], [0, -b * .08]), from: b * .44, to: b * .1, horizontal: true, main: false, out: [0, -1] },
    { points: line([left - over * .3, bottom - b * .26], [A.x + A.width * .66, bottom - b * .22], [0, b * .06]), from: b * .44, to: b * .1, horizontal: true, main: false, out: [0, 1] },
  ];
  const widthOf = (r: Rail) => (t: number) => lerp(r.from, r.to, t);
  const endGrain = (p: Pt, q: Pt, w: number, key: string) => {
    const angle = Math.atan2(p[1] - q[1], p[0] - q[0]) * 180 / Math.PI;
    return <g key={key} transform={`translate(${xy(p)}) rotate(${n(angle)})`}>
      <ellipse rx={n(w * .18)} ry={n(w * .5)} fill={`url(#${id}-grain)`} stroke="#24170e" strokeWidth={n(Math.max(.7, w * .06))} />
      {[.36, .24, .12].map(f => <ellipse key={f} rx={n(w * f * .36)} ry={n(w * f)} fill="none" stroke="#8d6440" strokeOpacity=".6" strokeWidth={n(Math.max(.35, w * .018))} />)}
      <ellipse rx={n(w * .02)} ry={n(w * .04)} fill="#5a3b22" />
      <path d={`M${n(w * .02)} ${n(-w * .1)}L${n(w * .1)} ${n(-w * .42)}`} stroke="#4a2f1a" strokeOpacity=".5" strokeWidth={n(Math.max(.35, w * .02))} />
    </g>;
  };
  const knots = rails.filter(r => r.main).flatMap((r, ri) => [.3, .68].map(t => {
    const { p, angle } = along(r.points, t), w = widthOf(r)(t);
    return <g key={`${ri}${t}`} transform={`translate(${xy(p)}) rotate(${n(angle)})`}>
      <ellipse rx={n(w * .16)} ry={n(w * .11)} fill="#1c120b" />
      <ellipse rx={n(w * .24)} ry={n(w * .17)} fill="none" stroke="#7a5a3c" strokeOpacity=".45" strokeWidth={n(Math.max(.4, w * .03))} />
    </g>;
  }));
  const stubs = rails.filter(r => r.main).flatMap((r, ri) => [.22, .56].map(t => {
    const { p } = along(r.points, t), w = widthOf(r)(t), len = b * between(rng, .22, .34);
    const tip: Pt = [p[0] + r.out[0] * len + (r.horizontal ? between(rng, -1, 1) * len * .6 : 0), p[1] + r.out[1] * len + (r.horizontal ? 0 : between(rng, -1, 1) * len * .6)];
    // Broken stumps of side shoots: short, blunt, showing pale wood at the break.
    return <g key={`${ri}${t}`}>
      <path d={taper([p, [lerp(p[0], tip[0], .5), lerp(p[1], tip[1], .5)], tip], w * .34, w * .2)} fill={`url(#${id}-${r.horizontal ? "limb" : "bark"})`} />
      <circle cx={n(tip[0])} cy={n(tip[1])} r={n(w * .1)} fill="#b8936a" stroke="#3a2818" strokeWidth={n(Math.max(.4, w * .02))} />
    </g>;
  }));
  const lashing = ([cx, cy]: Pt, key: string) => <g key={key}>
    {[-2, -1, 0, 1, 2].map(k => <path key={k} d={taper([[cx + k * b * .15 - b * .32, cy - b * .44], [cx + k * b * .15 + b * .32, cy + b * .44]], b * .1, b * .1)} fill={`url(#${id}-twine)`} stroke="#5e4a2a" strokeWidth={n(Math.max(.35, s * .5))} />)}
    {[-1, 1].map(k => <path key={`x${k}`} d={taper([[cx + k * b * .2 - b * .34, cy + b * .42], [cx + k * b * .2 + b * .34, cy - b * .42]], b * .08, b * .08)} fill={`url(#${id}-twine)`} stroke="#5e4a2a" strokeWidth={n(Math.max(.35, s * .5))} />)}
    <path d={`M${n(cx + b * .32)} ${n(cy + b * .36)}q${n(b * .26)} ${n(b * .2)} ${n(b * .12)} ${n(b * .56)}`} fill="none" stroke="#b39a68" strokeWidth={n(Math.max(.8, b * .06))} strokeLinecap="round" />
  </g>;
  const mossOn = (r: Rail, ts: number[], key: string) => ts.map(t => {
    const { p } = along(r.points, t), w = widthOf(r)(t);
    const cx = p[0] - r.out[0] * 0 + (r.horizontal ? 0 : -r.out[0] * w * .1), cy = p[1] + (r.horizontal ? -w * .36 : 0);
    return <g key={`${key}${t}`}>{Array.from({ length: 5 }, (_, i) => <ellipse key={i} cx={n(cx + between(rng, -w * .7, w * .7))} cy={n(cy + between(rng, -w * .08, w * .12))}
      rx={n(w * between(rng, .22, .42))} ry={n(w * between(rng, .1, .18))} fill={["#4d7023", "#668d2e", "#86aa40"][i % 3]} />)}</g>;
  });
  const [lMain, rMain, , , tMain, bMain] = rails;

  // Corner sprays: leaves clustered along the rails from the top-left and bottom-right corners.
  const tl: Pt[] = [[left - b * .05, top - b * .05], [A.x + A.width * .05, top - b * .22], [A.x + A.width * .14, top - b * .3], [A.x + A.width * .24, top - b * .18], [left - b * .25, A.y + A.height * .12], [left - b * .2, A.y + A.height * .28]];
  const br: Pt[] = [[right + b * .05, bottom + b * .05], [A.x + A.width * .95, bottom + b * .22], [A.x + A.width * .86, bottom + b * .3], [A.x + A.width * .76, bottom + b * .18], [right + b * .25, A.y + A.height * .88], [right + b * .2, A.y + A.height * .72]];
  const sprays = [...tl, ...br], spread = b * .8;
  const backLeaves = foliage(sprays, spread * 1.15, { count: 20, size: L * 1.2, colors: ["#132b18", "#18331c", "#1d3b20"] }, rng, inside, "b");
  const midLeaves = foliage(sprays, spread, { count: 15, size: L * 1.05, colors: ["#24482a", "#2c5528", "#36622d", "#3f6d31"], vein: true }, rng, inside, "m");
  const frontLeaves = foliage(sprays.map(([x, y]) => [x - spread * .12, y - spread * .15] as Pt), spread * .7, { count: 9, size: L, colors: ["#4f7f33", "#64953a", "#7caa45", "#98bf55"], highlight: "#dcec96", vein: true }, rng, inside, "f");

  // Ivy trails off the top rail and down the right side.
  const ivyPath: Pt[] = [[A.x + A.width * .68, top - b * .1], [A.x + A.width * .8, top + b * .2], [A.x + A.width * .92, top - b * .15], [right - b * .05, top + b * .3], [right + b * .2, A.y + A.height * .2], [right - b * .2, A.y + A.height * .36], [right + b * .12, A.y + A.height * .52]];
  const ivy = ivyPath.slice(1).flatMap((p, i) => [0, 1].map(side => {
    const size = L * between(rng, .6, .85), x = p[0] + (side ? 1 : -1) * size * .55, y = p[1] - size * .15;
    return inside(x, y, size) ? <g key={`${i}${side}`} transform={`translate(${n(x)} ${n(y)}) rotate(${n((side ? 55 : -55) + between(rng, -25, 25))})`}>
      <path d={ivyLeaf(size)} fill={side ? "#2f5b2a" : "#3d6d31"} stroke="#1d3a1a" strokeWidth=".5" />
      <path d={`M0 ${n(size * .12)}L0 ${n(-size * .8)}M0 0L${n(-size * .5)} ${n(-size * .3)}M0 0L${n(size * .5)} ${n(-size * .3)}`} stroke="#a7c38a" strokeOpacity=".45" strokeWidth=".6" fill="none" />
    </g> : null;
  }));

  const ferns: Pt[][] = [
    [[left + b * .1, bottom - b * .1], [left - b * .45, bottom - b * 1.2], [left - b * .2, bottom - b * 2.5]],
    [[left + b * .1, bottom - b * .05], [A.x + b * .7, bottom + b * .52], [A.x + b * 2.1, bottom + b * .3]],
    [[left + b * .05, bottom], [left - b * .5, bottom + b * .35], [left - b * .62, bottom + b * .8]],
  ];
  const fireflies = Array.from({ length: 12 }, (_, i) => {
    const u = rng(), side = Math.floor(rng() * 4);
    const x = side < 2 ? lerp(left - b, right + b, u) : side === 2 ? left + between(rng, -b, b * .3) : right + between(rng, -b * .3, b);
    const y = side === 0 ? top + between(rng, -b, b * .2) : side === 1 ? bottom + between(rng, -b * .2, b) : lerp(top, bottom, u);
    return inside(x, y, s * 9) ? <g key={i} className={`${id}-ff`} style={{ animationDelay: `${n(-i * .8)}s` }}>
      <circle cx={n(x)} cy={n(y)} r={n(s * 10)} fill={`url(#${id}-glow)`} />
      <circle cx={n(x)} cy={n(y)} r={n(Math.max(.9, s * 1.5))} fill="#f4ffc4" />
    </g> : null;
  });
  const railBase = (r: Rail) => <path d={taper(r.points, r.from, r.to)} fill={`url(#${id}-${r.horizontal ? "limb" : "bark"})`} />;

  return <svg {...svgProps(g)}>
    <defs>
      <style>{`.${id}-ff{animation:${id}-ff 3.4s ease-in-out infinite alternate}@keyframes ${id}-ff{from{opacity:.2}to{opacity:1}}@media (prefers-reduced-motion:reduce){.${id}-ff{animation:none;opacity:.7}}`}</style>
      <clipPath id={`${id}-edge`}><path clipRule="evenodd" d={edgeBandClip(g, reach)} /></clipPath>
      <RidgedBark id={`${id}-ridged-y`} s={s} grain="y" />
      <RidgedBark id={`${id}-ridged-x`} s={s} grain="x" />
      <linearGradient id={`${id}-bark`} x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#1a130e" /><stop offset=".2" stopColor="#4a3a2c" /><stop offset=".4" stopColor="#6b5642" /><stop offset=".62" stopColor="#4a3a2c" /><stop offset="1" stopColor="#140e0a" />
      </linearGradient>
      <linearGradient id={`${id}-limb`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#5a4735" /><stop offset=".3" stopColor="#6b5642" /><stop offset=".62" stopColor="#3f3125" /><stop offset="1" stopColor="#140e0a" />
      </linearGradient>
      <radialGradient id={`${id}-grain`} cx=".4" cy=".4" r=".7"><stop stopColor="#e3c79a" /><stop offset=".7" stopColor="#c19a68" /><stop offset="1" stopColor="#8f6a42" /></radialGradient>
      <linearGradient id={`${id}-twine`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e2cd9c" /><stop offset=".5" stopColor="#c2a874" /><stop offset="1" stopColor="#8c7046" /></linearGradient>
      <linearGradient id={`${id}-fern`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#2f5a1e" /><stop offset=".6" stopColor="#5f9032" /><stop offset="1" stopColor="#a1c45a" /></linearGradient>
      <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#bfb291" /><stop offset=".45" stopColor="#f4ecd8" /><stop offset="1" stopColor="#a8987a" /></linearGradient>
      <radialGradient id={`${id}-cap-red`} cx=".36" cy=".25" r=".85"><stop stopColor="#ff8a5c" /><stop offset=".45" stopColor="#d2311f" /><stop offset="1" stopColor="#6f120c" /></radialGradient>
      <radialGradient id={`${id}-cap-tan`} cx=".36" cy=".25" r=".85"><stop stopColor="#e9c38e" /><stop offset=".5" stopColor="#a8713d" /><stop offset="1" stopColor="#4f3017" /></radialGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor="#e9ff8a" stopOpacity=".85" /><stop offset=".35" stopColor="#c8f060" stopOpacity=".3" /><stop offset="1" stopColor="#c8f060" stopOpacity="0" /></radialGradient>
      <filter id={`${id}-moss`} x="-15%" y="-40%" width="130%" height="180%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={fmt(.12 / s)} numOctaves="3" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={fmt(6 * s)} xChannelSelector="R" yChannelSelector="G" result="fuzzy" />
        <feTurbulence type="fractalNoise" baseFrequency={fmt(.5 / s)} numOctaves="3" seed="8" result="tuft" />
        <feDiffuseLighting in="tuft" surfaceScale={fmt(2.6 * s)} lightingColor="#fff" result="lit"><feDistantLight azimuth="225" elevation="48" /></feDiffuseLighting>
        <feComposite in="lit" in2="fuzzy" operator="arithmetic" k1="1.4" k2="0" k3="0" k4="0" result="shaded" />
        <feComposite in="shaded" in2="fuzzy" operator="in" />
      </filter>
      <filter id={`${id}-lift`} x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx={fmt(s * 1.4)} dy={fmt(s * 3)} stdDeviation={fmt(s * 2.4)} floodColor="#050c06" floodOpacity=".55" /></filter>
    </defs>
    <WindowRecess window={A} id={`${id}-recess`} depth={b * .45} strength={1} />
    <g clipPath={`url(#${id}-edge)`}>
      <g>{backLeaves}</g>
      <g filter={`url(#${id}-lift)`}>
        <g filter={`url(#${id}-ridged-y)`}>{rails.filter(r => !r.horizontal).map((r, i) => <g key={i}>{railBase(r)}</g>)}</g>
        {rails.filter(r => !r.horizontal && r.main).map((r, i) => <g key={i}>{fissures(r.points, widthOf(r), rng, s, 4)}</g>)}
        <g filter={`url(#${id}-ridged-x)`}>{rails.filter(r => r.horizontal).map((r, i) => <g key={i}>{railBase(r)}</g>)}</g>
        {rails.filter(r => r.horizontal && r.main).map((r, i) => <g key={i}>{fissures(r.points, widthOf(r), rng, s, 4)}</g>)}
        {stubs}
        {knots}
        {rails.filter(r => r.main).flatMap((r, i) => {
          const pts = r.points;
          return [endGrain(pts[0], pts[1], r.from, `e${i}a`), endGrain(pts[pts.length - 1], pts[pts.length - 2], r.to, `e${i}b`)];
        })}
        {([[left, top], [right, top], [left, bottom], [right, bottom]] as Pt[]).map((p, i) => lashing(p, `l${i}`))}
        <g filter={`url(#${id}-moss)`}>
          {mossOn(tMain, [.12, .38, .62, .86], "mt")}
          {mossOn(bMain, [.2, .5, .78], "mb")}
          {mossOn(lMain, [.3, .7], "ml")}
          {mossOn(rMain, [.5], "mr")}
        </g>
        <path d={`M${smooth(ivyPath, 8).map(xy).join("L")}`} fill="none" stroke="#2a3a1a" strokeWidth={n(Math.max(.8, s * 1.5))} />
        {ivy}
        <g>{midLeaves}</g>
        <g>{frontLeaves}</g>
        {ferns.map((f, i) => fern(f, L * 1.45, rng, inside, id, `fn${i}`))}
        {/* toadstools grow up from the top rail's overhang, clear of the picture */}
        {toadstool(A.x + A.width + b * .2, top - b * .32, b * .62, "red", id, rng, "t1")}
        {toadstool(A.x + A.width + b * .55, top - b * .3, b * .44, "red", id, rng, "t2")}
        {toadstool(A.x + A.width - b * .1, top - b * .3, b * .34, "red", id, rng, "t3")}
        {toadstool(A.x + b * .9, bottom + b * .48, b * .4, "tan", id, rng, "t4")}
        {[-.55, -.25, .05].map((f, i) => anemone(left + b * f, bottom - b * .32, L * .4, rng, `a${i}`))}
      </g>
      {fireflies}
    </g>
  </svg>;
}

/* ------------------------------------------------------------------ */
/* Theater: gilt proscenium arch, swagged velvet, plank stage apron     */
/* ------------------------------------------------------------------ */

/** Burnished gilding: each shape gets a rounded bevel, a warm specular edge and soft diffuse falloff. */
function GiltBevel({ id, s, depth = 1 }: { id: string; s: number; depth?: number }) {
  return <filter id={id} x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation={fmt(1.5 * s * depth)} result="bump" />
    <feSpecularLighting in="bump" surfaceScale={fmt(3.2 * s * depth)} specularConstant="1.15" specularExponent="20" lightingColor="#fff3cf" result="spec">
      <feDistantLight azimuth="225" elevation="36" />
    </feSpecularLighting>
    <feComposite in="spec" in2="SourceAlpha" operator="in" result="shine" />
    <feDiffuseLighting in="bump" surfaceScale={fmt(3.2 * s * depth)} lightingColor="#fff" result="diffuse"><feDistantLight azimuth="225" elevation="50" /></feDiffuseLighting>
    <feComposite in="diffuse" in2="SourceGraphic" operator="arithmetic" k1="1.2" k2="0" k3="0" k4="0" result="shaded" />
    <feComposite in="shine" in2="shaded" operator="arithmetic" k1="0" k2=".8" k3="1" k4="0" result="lit" />
    <feComposite in="lit" in2="SourceAlpha" operator="in" />
  </filter>;
}

/** Velvet pile: fine fibres catch light across the nap; the fabric keeps its own colour. */
function VelvetPile({ id, s }: { id: string; s: number }) {
  return <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency={fmt(.7 / s)} numOctaves="2" seed="13" result="pile" />
    <feDiffuseLighting in="pile" surfaceScale=".8" lightingColor="#fff" result="lit"><feDistantLight azimuth="235" elevation="64" /></feDiffuseLighting>
    <feComposite in="lit" in2="SourceGraphic" operator="arithmetic" k1="1.08" k2="0" k3="0" k4="0" result="pl" />
    <feComposite in="pl" in2="SourceAlpha" operator="in" />
  </filter>;
}

const quadAt = (p0: Pt, c: Pt, p2: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]];
};
const quadPoints = (p0: Pt, c: Pt, p2: Pt, count: number) => Array.from({ length: count + 1 }, (_, i) => quadAt(p0, c, p2, i / count));

/** Bullion fringe under a hem: fine gold threads with a braided gimp along the top. */
function fringe(points: Pt[], length: number, s: number, rng: Rng, key: string): ReactNode {
  const threads: ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i], [bx, by] = points[i + 1];
    const count = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / Math.max(1.6, s * 2.2)));
    for (let k = 0; k < count; k++) {
      const x = lerp(ax, bx, k / count), y = lerp(ay, by, k / count), l = length * between(rng, .82, 1.08);
      threads.push(<line key={`${i}-${k}`} x1={n(x)} y1={n(y)} x2={n(x + between(rng, -.5, .5) * s)} y2={n(y + l)} stroke={k % 3 ? "#d4a94c" : "#8f6a22"} />);
    }
  }
  const gimp = `M${points.map(xy).join("L")}`;
  return <g key={key}>
    <g strokeWidth={n(Math.max(.6, s * .95))} strokeLinecap="round">{threads}</g>
    <path d={gimp} fill="none" stroke="#e3bf63" strokeWidth={n(Math.max(1.4, s * 2.8))} strokeLinecap="round" />
    <path d={gimp} fill="none" stroke="#7d5a17" strokeOpacity=".7" strokeWidth={n(Math.max(1.4, s * 2.8))} strokeDasharray={`${fmt(s * 1.1)} ${fmt(s * 1.9)}`} />
  </g>;
}

/** A gold tassel hanging from (x, y): ball, waisted neck rings and a skirt of threads. */
function tassel(x: number, y: number, length: number, id: string, s: number, key: string): ReactNode {
  const L = length, sw = L * .2, skirt = y + L * .34;
  return <g key={key}>
    <line x1={n(x)} y1={n(y - L * .14)} x2={n(x)} y2={n(y)} stroke="#b8902f" strokeWidth={n(Math.max(1, s * 1.6))} />
    <g filter={`url(#${id}-bevel)`}>
      <circle cx={n(x)} cy={n(y + L * .06)} r={n(L * .075)} fill={`url(#${id}-gilt)`} />
      <rect x={n(x - sw * .4)} y={n(y + L * .12)} width={n(sw * .8)} height={n(L * .12)} rx={n(sw * .3)} fill={`url(#${id}-gilt)`} />
      <ellipse cx={n(x)} cy={n(y + L * .28)} rx={n(sw * .62)} ry={n(L * .05)} fill={`url(#${id}-gilt)`} />
      <path d={`M${n(x - sw * .55)} ${n(skirt)}L${n(x + sw * .55)} ${n(skirt)}L${n(x + sw)} ${n(y + L * .96)}Q${n(x)} ${n(y + L * 1.03)} ${n(x - sw)} ${n(y + L * .96)}Z`} fill={`url(#${id}-gilt)`} />
    </g>
    <g stroke="#6b4a12" strokeOpacity=".5" strokeWidth={n(Math.max(.45, s * .6))}>
      {Array.from({ length: 9 }, (_, i) => { const u = i / 8 - .5; return <line key={i} x1={n(x + u * sw * 1.1)} y1={n(skirt + L * .05)} x2={n(x + u * sw * 1.9)} y2={n(y + L * .95)} />; })}
    </g>
  </g>;
}

/** A spiral curl ending a scroll, from `start` winding `turns` around `center`. */
function curl(start: Pt, center: Pt, turns: number, dir: number): Pt[] {
  const r0 = Math.hypot(start[0] - center[0], start[1] - center[1]), a0 = Math.atan2(start[1] - center[1], start[0] - center[0]);
  return Array.from({ length: 14 }, (_, i) => {
    const t = (i + 1) / 14, a = a0 + dir * t * turns * Math.PI * 2, r = r0 * (1 - t * .72);
    return [center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r] as Pt;
  });
}

function theaterProsceniumBack(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const rng = seeded(1893);
  const s = Math.max(.45, W / 1000);
  const hair = Math.max(.4, s * .7);
  const rodR = Math.max(2.2, s * 4.4), rodY = A.y * .1;
  const top = rodY + rodR * .4;
  // Pelmet band, then swags whose hem stops just above the picture.
  const pelH = A.y * .26, pelY = top, swagTop = pelY + pelH * .85, hemLow = A.y - A.y * .05;
  // Curtains part right at the picture: their leading edges run behind it.
  const tieY = A.y + A.height * .6, waistL = W * .003, waistR = A.x * .74;
  const stageTop = A.y + A.height - A.x * .05, ah = H - stageTop;
  const poolY = stageTop + ah * .34;
  const gilt = `url(#${id}-gilt)`, bevel = `url(#${id}-bevel)`;

  const hangs = [0, .2, .4, .6, .8, 1].map(f => lerp(W * .015, W * .985, f));
  const swags = hangs.slice(0, -1).map((a, i) => {
    const b = hangs[i + 1], m = (a + b) / 2, endY = swagTop + (hemLow - swagTop) * .35;
    const hem = quadPoints([b, endY], [m, 2 * hemLow - endY], [a, endY], 28);
    const folds = [.28, .48, .66, .82].map(f => {
      const y = lerp(swagTop, hemLow, f), e = lerp(swagTop, endY, f);
      return `M${n(a + (b - a) * .05)} ${n(e)}Q${n(m)} ${n(2 * y - e)} ${n(b - (b - a) * .05)} ${n(e)}`;
    });
    const trim = hem.map(([x, y]) => [x, y - s * 5] as Pt);
    return { d: `M${n(a)} ${n(swagTop - s * 2)}H${n(b)}L${hem.map(xy).join("L")}Z`, hem, folds, trim };
  });
  const jw = A.x * .5, tail = (tieY - swagTop) * .5;
  const jabots = [hangs[0] + jw * .3, hangs[5] - jw * .3].map(x => {
    const hem: Pt[] = [[x - jw / 2, swagTop + tail * .62], [x, swagTop + tail], [x + jw / 2, swagTop + tail * .62]];
    return { x, hem, d: `M${n(x - jw / 2)} ${n(swagTop - s * 2)}L${n(x + jw / 2)} ${n(swagTop - s * 2)}L${hem.slice().reverse().map(xy).join("L")}Z` };
  });

  const k = 11;
  const foldLine = (j: number): Pt[] => {
    const f = j / k, wave = Math.sin(j * 2.1) * s * 3;
    return [[lerp(W * .004, A.x * 1.35, f), top], [lerp(W * .003, A.x * 1.05, f), lerp(top, tieY, .5)], [lerp(waistL, waistR, f), tieY],
      [lerp(W * .002, A.x * .85, f) + wave * .5, lerp(tieY, poolY, .55)], [lerp(-W * .004, A.x * 1.1, f) + wave, poolY + Math.sin(j * 2.7) * s * 3]];
  };
  // Right-hand geometry is generated mirrored, not transformed: Chrome mis-lights filters under a negative scale.
  const flip = (side: number) => (p: Pt): Pt => side ? [W - p[0], p[1]] : p;
  const strip = (side: number, j: number) => {
    const l1 = smooth(foldLine(j), 10).map(flip(side)), l2 = smooth(foldLine(j + 1), 10).map(flip(side)).reverse();
    return `M${l1.map(xy).join("L")}L${l2.map(xy).join("L")}Z`;
  };
  const crest = (side: number, j: number) => {
    const a = smooth(foldLine(j), 10), b = smooth(foldLine(j + 1), 10);
    return `M${a.map((p, i) => xy(flip(side)([lerp(p[0], b[i][0], .58), lerp(p[1], b[i][1], .58)]))).join("L")}`;
  };
  const edge = (side: number) => `M${smooth(foldLine(k), 10).map(flip(side)).map(xy).join("L")}`;
  const backing = (side: number) => {
    const outer = smooth(foldLine(0), 10).map(flip(side)), inner = smooth(foldLine(k), 10).map(flip(side)).reverse();
    return `M${outer.map(xy).join("L")}L${inner.map(xy).join("L")}Z`;
  };
  const tieback = (side: number) => {
    const f = flip(side), a = f([waistL - s * 4, tieY - s * 3]), c = f([(waistL + waistR) / 2, tieY + s * 7]), b = f([waistR + s * 5, tieY - s * 5]);
    const rope = `M${xy(a)}Q${xy(c)} ${xy(b)}`, knot = f([lerp(waistL, waistR, .36), tieY + s * 4]);
    return <g key={`tie${side}`}>
      <path d={rope} fill="none" stroke="#d3a748" strokeWidth={n(s * 5.5)} strokeLinecap="round" />
      <path d={rope} fill="none" stroke="#6f4f12" strokeOpacity=".6" strokeWidth={n(s * 5.5)} strokeDasharray={`${fmt(s * 1.5)} ${fmt(s * 2.6)}`} />
      <path d={rope} fill="none" stroke="#fff0c2" strokeOpacity=".45" strokeWidth={n(s * 1.1)} transform={`translate(0 ${n(-s * 1.5)})`} />
      {tassel(knot[0], knot[1], Math.min(A.y * .42, A.height * .2), id, s, `tt${side}`)}
    </g>;
  };

  // Pelmet embroidery: a lozenge with four petals, repeated between twisted cords.
  const motifY = pelY + pelH * .48, step = pelH * 1.25;
  const motifs = Array.from({ length: Math.floor((W * .97) / step) }, (_, i) => W * .015 + step * (i + .5));
  const motif = (x: number, key: string) => {
    const r = pelH * .26;
    return <g key={key}>
      <path d={`M${n(x)} ${n(motifY - r)}L${n(x + r * .7)} ${n(motifY)}L${n(x)} ${n(motifY + r)}L${n(x - r * .7)} ${n(motifY)}Z`} fill="none" stroke={gilt} strokeWidth={n(Math.max(.7, s * 1.1))} />
      <path d={`M${n(x)} ${n(motifY - r * .55)}L${n(x + r * .38)} ${n(motifY)}L${n(x)} ${n(motifY + r * .55)}L${n(x - r * .38)} ${n(motifY)}Z`} fill={gilt} opacity=".55" />
      {[[0, -1], [.7, 0], [0, 1], [-.7, 0]].map(([dx, dy], i) => <circle key={i} cx={n(x + dx * r)} cy={n(motifY + dy * r)} r={n(r * .11)} fill={gilt} />)}
      <circle cx={n(x)} cy={n(motifY)} r={n(r * .16)} fill={gilt} />
      {[-1, 1].map(d => <circle key={d} cx={n(x + d * step * .5)} cy={n(motifY)} r={n(r * .12)} fill={gilt} />)}
    </g>;
  };
  const cord = (y: number, key: string) => <g key={key}>
    <line x1={n(W * .015)} y1={n(y)} x2={n(W * .985)} y2={n(y)} stroke="#c99a3f" strokeWidth={n(s * 3.4)} />
    <line x1={n(W * .015)} y1={n(y)} x2={n(W * .985)} y2={n(y)} stroke="#6f4f12" strokeOpacity=".7" strokeWidth={n(s * 3.4)} strokeDasharray={`${fmt(s * 1.2)} ${fmt(s * 2.2)}`} />
    <line x1={n(W * .015)} y1={n(y - s)} x2={n(W * .985)} y2={n(y - s)} stroke="#fff0c2" strokeOpacity=".5" strokeWidth={n(hair)} />
  </g>;

  // Stage: perspective floorboards with staggered butt joints and nails, a gilt lip with footlights, a fascia below.
  const lipY = stageTop + ah * .58, lipSag = ah * .12;
  const lipL: Pt = [W * .99, lipY], lipC: Pt = [W / 2, lipY + lipSag * 2], lipR: Pt = [W * .01, lipY];
  const floor = `M${n(W * .01)} ${n(stageTop)}H${n(W * .99)}V${n(lipY)}Q${xy(lipC)} ${xy(lipR)}Z`;
  const fascia = `M${xy(lipR)}Q${xy(lipC)} ${xy(lipL)}V${n(H)}H${n(W * .01)}Z`;
  const vp: Pt = [W / 2, stageTop - A.height * 1.6];
  const boards = 34, along = (x: number, y: number): number => x + (x - vp[0]) * (y - stageTop) / (stageTop - vp[1]);
  const seams = Array.from({ length: boards - 1 }, (_, i) => lerp(W * .01, W * .99, (i + 1) / boards));
  const joints = seams.flatMap((x, i) => {
    const next = seams[i + 1] ?? W * .99, y = lerp(stageTop, lipY + lipSag, (i * .37) % 1 * .7 + .15);
    return [<line key={`j${i}`} x1={n(along(x, y))} y1={n(y)} x2={n(along(next, y))} y2={n(y)} />];
  });
  const nails = seams.flatMap((x, i) => {
    const y = lerp(stageTop, lipY + lipSag, (i * .37) % 1 * .7 + .15);
    return [[along(x, y) + s * 2.5, y - s * 1.5], [along(seams[i + 1] ?? x, y) - s * 2.5, y + s * 1.5]].map(([nx, ny], k2) =>
      <circle key={`n${i}${k2}`} cx={n(nx)} cy={n(ny)} r={n(Math.max(.5, s * .8))} fill="#1a0c06" />);
  });
  const lights = Array.from({ length: 9 }, (_, i) => quadAt(lipL, lipC, lipR, .1 + i * .1));

  return <svg {...svgProps(g)}>
    <defs>
      <GiltBevel id={`${id}-bevel`} s={s} />
      <VelvetPile id={`${id}-pile`} s={s} />
      <linearGradient id={`${id}-gilt`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={n(W * .06)} y2={n(W * .06)} spreadMethod="reflect">
        <stop stopColor="#fdf0b8" /><stop offset=".3" stopColor="#e6bd5e" /><stop offset=".55" stopColor="#a97b25" /><stop offset=".8" stopColor="#f2cf74" /><stop offset="1" stopColor="#b38a35" />
      </linearGradient>
      <linearGradient id={`${id}-fold-a`} x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#31050d" /><stop offset=".28" stopColor="#741226" /><stop offset=".52" stopColor="#b8394d" /><stop offset=".72" stopColor="#86172b" /><stop offset="1" stopColor="#38060f" />
      </linearGradient>
      <linearGradient id={`${id}-fold-b`} x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#28040a" /><stop offset=".3" stopColor="#62101f" /><stop offset=".54" stopColor="#9e2a3d" /><stop offset=".74" stopColor="#6f1326" /><stop offset="1" stopColor="#2c040c" />
      </linearGradient>
      <linearGradient id={`${id}-swag`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#94203a" /><stop offset=".55" stopColor="#6f1124" /><stop offset="1" stopColor="#3b0712" /></linearGradient>
      <linearGradient id={`${id}-pelmet`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6e1022" /><stop offset=".4" stopColor="#8f1d33" /><stop offset="1" stopColor="#4d0917" /></linearGradient>
      <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3a1d10" /><stop offset=".5" stopColor="#6b3a1f" /><stop offset="1" stopColor="#8a5130" /></linearGradient>
      <linearGradient id={`${id}-fascia`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3a1209" /><stop offset="1" stopColor="#160603" /></linearGradient>
      <radialGradient id={`${id}-backstage`} cx=".5" cy=".85" r=".75"><stop stopColor="#2a1216" /><stop offset=".6" stopColor="#150709" /><stop offset="1" stopColor="#0a0304" /></radialGradient>
      <radialGradient id={`${id}-lamp`}><stop stopColor="#fff2c4" stopOpacity=".95" /><stop offset=".3" stopColor="#ffd27a" stopOpacity=".45" /><stop offset="1" stopColor="#ffc35a" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-wash`} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#ffb85a" stopOpacity=".22" /><stop offset=".6" stopColor="#ffb85a" stopOpacity=".05" /><stop offset="1" stopColor="#ffb85a" stopOpacity="0" /></linearGradient>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={`${fmt(.5 / s)} ${fmt(.03 / s)}`} numOctaves="3" seed="15" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 .12  0 0 0 0 .05  0 0 0 0 .02  1.8 0 0 0 -.75" result="streak" />
        <feComposite in="streak" in2="SourceGraphic" operator="atop" />
      </filter>
      <filter id={`${id}-shadow`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={fmt(s * 5)} /></filter>
      <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={fmt(s * 1.2)} /></filter>
      <clipPath id={`${id}-floor`}><path d={floor} /></clipPath>
    </defs>

    {/* backstage, floor and fascia */}
    <rect x={n(W * .02)} y={n(top)} width={n(W * .96)} height={n(stageTop - top)} fill={`url(#${id}-backstage)`} />
    <path d={floor} fill={`url(#${id}-floor)`} filter={`url(#${id}-grain)`} />
    <g clipPath={`url(#${id}-floor)`} stroke="#140804" strokeWidth={n(hair)}>
      {seams.map((x, i) => <line key={i} x1={n(x)} y1={n(stageTop)} x2={n(along(x, lipY + lipSag * 2))} y2={n(lipY + lipSag * 2)} strokeOpacity=".6" />)}
      <g strokeOpacity=".45">{joints}</g>
      {seams.map((x, i) => <line key={`h${i}`} x1={n(x + s)} y1={n(stageTop)} x2={n(along(x, lipY + lipSag * 2) + s)} y2={n(lipY + lipSag * 2)} stroke="#d09a64" strokeOpacity=".16" />)}
      {nails}
      <ellipse cx={n(W / 2)} cy={n(lipY)} rx={n(W * .4)} ry={n(ah * .5)} fill="#ffcf86" opacity=".12" stroke="none" />
    </g>
    <path d={fascia} fill={`url(#${id}-fascia)`} />
    {Array.from({ length: 8 }, (_, i) => {
      const x0 = lerp(W * .04, W * .96, i / 8) + W * .012, x1 = lerp(W * .04, W * .96, (i + 1) / 8) - W * .012;
      const y0 = lipY + lipSag * 1.6 + ah * .14, y1 = H - ah * .04;
      return y1 - y0 > s * 4 ? <rect key={i} x={n(x0)} y={n(y0)} width={n(x1 - x0)} height={n(y1 - y0)} rx={n(s * 1.5)} fill="none" stroke="#c99a3f" strokeOpacity=".55" strokeWidth={n(hair)} /> : null;
    })}

    {/* side curtains with gold galloon on the leading edge, fold crests catching the footlights */}
    {[0, 1].map(side => <g key={side}>
      <ellipse cx={n(flip(side)([A.x * .5, 0])[0])} cy={n(poolY + s * 4)} rx={n(A.x * .8)} ry={n(ah * .16)} fill="#000" opacity=".55" filter={`url(#${id}-shadow)`} />
      <g filter={`url(#${id}-pile)`}>
        <path d={backing(side)} fill="#3d0711" />
        {Array.from({ length: k }, (_, j) => <path key={j} d={strip(side, j)} fill={`url(#${id}-fold-${(j + side) % 2 ? "b" : "a"})`} />)}
      </g>
      <g fill="none" stroke="#ff9cab" strokeOpacity=".14" strokeWidth={n(s * 2.4)} strokeLinecap="round">
        {Array.from({ length: k }, (_, j) => j % 2 === side % 2 ? <path key={j} d={crest(side, j)} /> : null)}
      </g>
      <path d={edge(side)} fill="none" stroke="#c99a3f" strokeWidth={n(s * 4.2)} />
      <path d={edge(side)} fill="none" stroke="#6f4f12" strokeOpacity=".65" strokeWidth={n(s * 4.2)} strokeDasharray={`${fmt(s * 1.6)} ${fmt(s * 1.6)}`} />
      <path d={edge(side)} fill="none" stroke="#fff0c2" strokeOpacity=".5" strokeWidth={n(hair)} />
      {tieback(side)}
    </g>)}
    {/* the footlights warm the bottom of the velvet */}
    <rect x="0" y={n(A.y + A.height * .7)} width={n(W)} height={n(poolY - A.y - A.height * .7)} fill={`url(#${id}-wash)`} style={{ mixBlendMode: "screen" }} />

    {/* swags under the pelmet, with an embroidered border, fringe and tassels */}
    <g filter={`url(#${id}-pile)`}>{swags.map((w, i) => <path key={i} d={w.d} fill={`url(#${id}-swag)`} />)}</g>
    {swags.map((w, i) => <g key={i}>
      {w.folds.map((d, f) => <g key={f}>
        <path d={d} fill="none" stroke="#24040b" strokeOpacity=".5" strokeWidth={n(s * 2.6)} />
        <path d={d} fill="none" stroke="#e07c8a" strokeOpacity=".2" strokeWidth={n(s * 1.3)} transform={`translate(0 ${n(s * 2.4)})`} />
      </g>)}
      <path d={`M${w.trim.map(xy).join("L")}`} fill="none" stroke="#c99a3f" strokeWidth={n(s * 1.6)} />
      <path d={`M${w.trim.map(([x, y]) => xy([x, y - s * 3])).join("L")}`} fill="none" stroke="#c99a3f" strokeOpacity=".6" strokeWidth={n(hair)} strokeDasharray={`${fmt(s * 2)} ${fmt(s * 2)}`} />
      {fringe(w.hem, A.y * .1, s, rng, `sf${i}`)}
    </g>)}
    {jabots.map((j, i) => <g key={i}>
      <path d={j.d} fill={`url(#${id}-fold-${i % 2 ? "a" : "b"})`} filter={`url(#${id}-pile)`} />
      {[-.2, .2].map(o => <path key={o} d={`M${n(j.x + o * jw)} ${n(swagTop)}L${n(j.x + o * jw * 1.15)} ${n(swagTop + tail * .72)}`} stroke="#24040b" strokeOpacity=".45" strokeWidth={n(s * 2)} />)}
      {fringe(j.hem, A.y * .08, s, rng, `jf${i}`)}
    </g>)}

    {/* pelmet */}
    <rect x={n(W * .015)} y={n(pelY)} width={n(W * .97)} height={n(pelH)} fill={`url(#${id}-pelmet)`} filter={`url(#${id}-pile)`} />
    <rect x={n(W * .015)} y={n(pelY + pelH - s * 2)} width={n(W * .97)} height={n(s * 4)} fill="#000" opacity=".35" filter={`url(#${id}-glow)`} />
    {cord(pelY + s * 2.5, "c1")}
    {cord(pelY + pelH - s * 2, "c2")}
    <g filter={bevel}>{motifs.map((x, i) => motif(x, `m${i}`))}</g>
    {hangs.slice(1, -1).map((x, i) => tassel(x, pelY + pelH, Math.min(A.y * .44, (hemLow - pelY - pelH) * 1.1), id, s, `ht${i}`))}

    {/* rod with rings and acorn finials */}
    <g filter={bevel}>
      <rect x={n(W * .03)} y={n(rodY - rodR)} width={n(W * .94)} height={n(rodR * 2)} rx={n(rodR)} fill={gilt} />
      {hangs.map(x => <ellipse key={x} cx={n(x)} cy={n(rodY)} rx={n(rodR * .55)} ry={n(rodR * 1.45)} fill={gilt} />)}
      {[W * .022, W * .978].map((x, i) => {
        const d = i ? 1 : -1;
        return <g key={i}>
          <circle cx={n(x)} cy={n(rodY)} r={n(rodR * 1.5)} fill={gilt} />
          <ellipse cx={n(x + d * rodR * 2.4)} cy={n(rodY)} rx={n(rodR * 1.3)} ry={n(rodR * 1.05)} fill={gilt} />
          <path d={`M${n(x + d * rodR * 3.4)} ${n(rodY - rodR * .8)}Q${n(x + d * rodR * 5.4)} ${n(rodY)} ${n(x + d * rodR * 3.4)} ${n(rodY + rodR * .8)}Z`} fill={gilt} />
        </g>;
      })}
    </g>

    {/* footlights: shell hoods on the gilt lip */}
    <path d={`M${xy(lipL)}Q${xy(lipC)} ${xy(lipR)}`} fill="none" stroke={gilt} strokeWidth={n(Math.max(1.6, s * 3.6))} filter={bevel} />
    {lights.map(([lx, ly], i) => <g key={i}>
      <ellipse cx={n(lx)} cy={n(ly - ah * .2)} rx={n(W * .04)} ry={n(ah * .42)} fill={`url(#${id}-lamp)`} />
      <g filter={bevel}>
        <path d={`M${n(lx - W * .015)} ${n(ly - ah * .02)}Q${n(lx)} ${n(ly + ah * .26)} ${n(lx + W * .015)} ${n(ly - ah * .02)}Z`} fill={gilt} />
      </g>
      {[-.6, -.2, .2, .6].map(f => <line key={f} x1={n(lx + f * W * .01)} y1={n(ly)} x2={n(lx + f * W * .004)} y2={n(ly + ah * .16)} stroke="#6f4f12" strokeOpacity=".55" strokeWidth={n(hair)} />)}
      <circle cx={n(lx)} cy={n(ly - ah * .08)} r={n(Math.max(1.2, s * 2.4))} fill="#fffbe8" />
    </g>)}
  </svg>;
}

function theaterProsceniumFront(g: BranchingFrameGeometry): ReactNode {
  return <svg {...svgProps(g)}>
    <WindowRecess window={g.window} id={`${g.id}-recess`} depth={g.window.x * .3} strength={.95} />
  </svg>;
}

/* ------------------------------------------------------------------ */
/* Adventure map: an aged airmail map board with travel keepsakes      */
/* ------------------------------------------------------------------ */

/** A small aircraft silhouette pointing along +x, `size` across the wings. */
function airplane(size: number): string {
  const p: Array<[number, number]> = [[.5, 0], [.36, -.05], [.06, -.06], [-.06, -.48], [-.17, -.48], [-.09, -.06], [-.34, -.05], [-.43, -.21], [-.5, -.21], [-.46, 0],
    [-.5, .21], [-.43, .21], [-.34, .05], [-.09, .06], [-.17, .48], [-.06, .48], [.06, .06], [.36, .05]];
  return `M${p.map(([x, y]) => `${n(x * size)} ${n(y * size)}`).join("L")}Z`;
}

/** Engraved capital letters as strokes on a unit box, so no font or text layout is involved. */
const GLYPHS: Record<"N" | "E" | "S" | "W", string> = {
  N: "M-.55 .8V-.8L.55 .8V-.8",
  E: "M.5 -.8H-.5V.8H.5M-.5 0H.3",
  S: "M.55 -.55C.45 -.85 -.55 -.95 -.55 -.4C-.55 .1 .55 -.1 .55 .4C.55 .95 -.45 .9 -.6 .5",
  W: "M-.75 -.8L-.4 .8L0 -.3L.4 .8L.75 -.8",
};

/** A fleur-de-lis pointing up, `h` tall, for the north point of a compass rose. */
function fleur(cx: number, cy: number, h: number): string {
  const u = h / 2;
  return `M${n(cx)} ${n(cy - u)}C${n(cx + u * .32)} ${n(cy - u * .5)} ${n(cx + u * .28)} ${n(cy - u * .05)} ${n(cx + u * .06)} ${n(cy + u * .2)}`
    + `C${n(cx + u * .5)} ${n(cy - u * .3)} ${n(cx + u * .95)} ${n(cy - u * .1)} ${n(cx + u * .62)} ${n(cy + u * .32)}C${n(cx + u * .45)} ${n(cy + u * .12)} ${n(cx + u * .22)} ${n(cy + u * .3)} ${n(cx + u * .12)} ${n(cy + u * .42)}`
    + `L${n(cx + u * .3)} ${n(cy + u * .42)}L${n(cx + u * .3)} ${n(cy + u * .56)}L${n(cx + u * .1)} ${n(cy + u * .56)}L${n(cx)} ${n(cy + u)}`
    + `L${n(cx - u * .1)} ${n(cy + u * .56)}L${n(cx - u * .3)} ${n(cy + u * .56)}L${n(cx - u * .3)} ${n(cy + u * .42)}L${n(cx - u * .12)} ${n(cy + u * .42)}`
    + `C${n(cx - u * .22)} ${n(cy + u * .3)} ${n(cx - u * .45)} ${n(cy + u * .12)} ${n(cx - u * .62)} ${n(cy + u * .32)}C${n(cx - u * .95)} ${n(cy - u * .1)} ${n(cx - u * .5)} ${n(cy - u * .3)} ${n(cx - u * .06)} ${n(cy + u * .2)}`
    + `C${n(cx - u * .28)} ${n(cy - u * .05)} ${n(cx - u * .32)} ${n(cy - u * .5)} ${n(cx)} ${n(cy - u)}Z`;
}

/** A pocket compass: knurled brass case with bow and hinge, engraved dial, 32-point rose, floating needle and domed glass. */
function compass(cx: number, cy: number, r: number, id: string): ReactNode {
  const hair = Math.max(.35, r * .008);
  const at = (deg: number, rad: number): Pt => [cx + Math.cos(deg * Math.PI / 180) * rad, cy + Math.sin(deg * Math.PI / 180) * rad];
  const point = (deg: number, len: number, width: number, dark: string, light: string, key: string) => {
    const tip = at(deg, len), l = at(deg - 90, width), rr = at(deg + 90, width);
    return <g key={key}>
      <path d={`M${n(cx)} ${n(cy)}L${xy(l)}L${xy(tip)}Z`} fill={dark} />
      <path d={`M${n(cx)} ${n(cy)}L${xy(rr)}L${xy(tip)}Z`} fill={light} />
    </g>;
  };
  const bow = at(-135, r * 1.04), hinge = at(45, r * 1.0);
  const needleAngle = -8;
  const needle = (dx: number, dy: number, shadow: boolean) => {
    const a = (needleAngle - 90) * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const L = r * .66, w = r * .05, X = cx + dx, Y = cy + dy;
    const north = `M${n(X + ux * L)} ${n(Y + uy * L)}L${n(X + px * w)} ${n(Y + py * w)}L${n(X - px * w)} ${n(Y - py * w)}Z`;
    const south = `M${n(X - ux * L)} ${n(Y - uy * L)}L${n(X + px * w)} ${n(Y + py * w)}L${n(X - px * w)} ${n(Y - py * w)}Z`;
    return shadow
      ? <g opacity=".35" filter={`url(#${id}-soft)`}><path d={north} fill="#1a1006" /><path d={south} fill="#1a1006" /></g>
      : <g>
        <path d={north} fill={`url(#${id}-blued)`} />
        <path d={`M${n(X + ux * L)} ${n(Y + uy * L)}L${n(X + px * w)} ${n(Y + py * w)}L${n(X)} ${n(Y)}Z`} fill="#fff" opacity=".22" />
        <path d={south} fill={`url(#${id}-steel)`} />
        <path d={`M${n(X - ux * L)} ${n(Y - uy * L)}L${n(X - px * w)} ${n(Y - py * w)}L${n(X)} ${n(Y)}Z`} fill="#000" opacity=".18" />
        {/* counterweight wire on the south arm */}
        <line x1={n(X - ux * L * .42 + px * w * .9)} y1={n(Y - uy * L * .42 + py * w * .9)} x2={n(X - ux * L * .42 - px * w * .9)} y2={n(Y - uy * L * .42 - py * w * .9)} stroke="#b8902f" strokeWidth={n(Math.max(.6, r * .022))} />
      </g>;
  };
  return <g>
    <ellipse cx={n(cx + r * .1)} cy={n(cy + r * .16)} rx={n(r * 1.04)} ry={n(r)} fill="#2a1a0c" opacity=".5" filter={`url(#${id}-soft)`} />
    <g filter={`url(#${id}-bevel)`}>
      <circle cx={n(bow[0])} cy={n(bow[1])} r={n(r * .17)} fill="none" stroke={`url(#${id}-brass)`} strokeWidth={n(r * .06)} />
      <circle cx={n(at(-135, r * .9)[0])} cy={n(at(-135, r * .9)[1])} r={n(r * .1)} fill={`url(#${id}-brass)`} />
      <rect x={n(hinge[0] - r * .16)} y={n(hinge[1] - r * .06)} width={n(r * .32)} height={n(r * .12)} rx={n(r * .05)} fill={`url(#${id}-brass)`} transform={`rotate(-45 ${xy(hinge)})`} />
      <circle cx={n(cx)} cy={n(cy)} r={n(r)} fill={`url(#${id}-brass)`} />
    </g>
    {[-1, 1].map(k => <line key={k} x1={n(hinge[0] + k * r * .06)} y1={n(hinge[1] - k * r * .06)} x2={n(hinge[0] + k * r * .06 - r * .07)} y2={n(hinge[1] - k * r * .06 - r * .07)} stroke="#4a3010" strokeOpacity=".6" strokeWidth={n(hair)} />)}
    {/* knurled rim, a turned groove and a few spots of verdigris */}
    <g stroke="#5a3c14" strokeOpacity=".55" strokeWidth={n(hair)}>
      {Array.from({ length: 144 }, (_, i) => { const a = i / 144 * 360; return <line key={i} x1={n(at(a, r * .95)[0])} y1={n(at(a, r * .95)[1])} x2={n(at(a, r)[0])} y2={n(at(a, r)[1])} />; })}
    </g>
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .91)} fill="none" stroke="#5a3c14" strokeOpacity=".55" strokeWidth={n(Math.max(.6, r * .018))} />
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .895)} fill="none" stroke="#fff0c4" strokeOpacity=".5" strokeWidth={n(hair)} />
    {[[200, .93, .05], [250, .9, .035], [110, .94, .03]].map(([a, d, k], i) => <ellipse key={i} cx={n(at(a, r * d)[0])} cy={n(at(a, r * d)[1])} rx={n(r * k)} ry={n(r * k * .7)} fill="#6f8f6a" opacity=".38" />)}
    {/* dial */}
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .84)} fill={`url(#${id}-face)`} stroke="#4a3010" strokeWidth={n(Math.max(.8, r * .02))} />
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .84)} fill={`url(#${id}-dialshade)`} />
    <g stroke="#4a3221" strokeWidth={n(hair)}>
      {Array.from({ length: 180 }, (_, i) => {
        const a = i * 2, major = a % 30 === 0, mid = a % 10 === 0;
        const p0 = at(a, r * .81), p1 = at(a, r * (major ? .7 : mid ? .74 : .77));
        return <line key={i} x1={n(p0[0])} y1={n(p0[1])} x2={n(p1[0])} y2={n(p1[1])} strokeWidth={n(major ? hair * 1.8 : hair)} />;
      })}
    </g>
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .69)} fill="none" stroke="#5c4127" strokeOpacity=".7" strokeWidth={n(hair)} />
    <g fill="none" stroke="#3a2614" strokeWidth={n(Math.max(.6, r * .022))} strokeLinecap="round" strokeLinejoin="round">
      {(["E", "S", "W"] as const).map((k, i) => { const p = at(i * 90, r * .6); return <path key={k} d={GLYPHS[k]} transform={`translate(${xy(p)}) scale(${n(r * .055)})`} strokeWidth={n(Math.max(.6, r * .022) / (r * .055))} />; })}
    </g>
    <path d={fleur(at(-90, r * .6)[0], at(-90, r * .6)[1], r * .15)} fill="#8a2a1c" stroke="#4a1208" strokeWidth={n(hair)} />
    {/* rose: 16 fine points, 8 half-winds, 4 cardinals, a rope ring and a centre boss */}
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .33)} fill="none" stroke="#5c4127" strokeOpacity=".55" strokeWidth={n(hair)} />
    {Array.from({ length: 36 }, (_, i) => { const p = at(i * 10, r * .36); return <circle key={i} cx={n(p[0])} cy={n(p[1])} r={n(r * .012)} fill="#5c4127" opacity=".7" />; })}
    {Array.from({ length: 16 }, (_, i) => point(-90 + i * 22.5 + 11.25, r * .3, r * .022, "#6d5232", "#b49a6c", `m${i}`))}
    {Array.from({ length: 4 }, (_, i) => point(-45 + i * 90, r * .46, r * .055, "#3a2a1a", "#a88c5c", `d${i}`))}
    {Array.from({ length: 4 }, (_, i) => point(-90 + i * 90, r * .52, r * .075, "#22180f", "#9b8156", `c${i}`))}
    {needle(r * .03, r * .05, true)}
    {needle(0, 0, false)}
    {/* jewelled pivot cap */}
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .075)} fill={`url(#${id}-brass)`} stroke="#4a3010" strokeWidth={n(hair)} />
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .035)} fill="#a3172a" />
    <circle cx={n(cx - r * .012)} cy={n(cy - r * .012)} r={n(r * .012)} fill="#ffd3d3" />
    {/* lubber line, then the domed glass with its rim refraction and reflections */}
    <line x1={n(cx)} y1={n(cy - r * .835)} x2={n(cx)} y2={n(cy - r * .75)} stroke="#a3172a" strokeWidth={n(Math.max(.8, r * .02))} />
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .84)} fill={`url(#${id}-glass)`} />
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .83)} fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth={n(Math.max(.6, r * .015))} />
    <path d={`M${n(cx - r * .64)} ${n(cy - r * .28)}A${n(r * .72)} ${n(r * .72)} 0 0 1 ${n(cx + r * .08)} ${n(cy - r * .72)}`} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth={n(r * .05)} strokeLinecap="round" />
    <path d={`M${n(cx + r * .5)} ${n(cy + r * .5)}A${n(r * .72)} ${n(r * .72)} 0 0 1 ${n(cx + r * .18)} ${n(cy + r * .68)}`} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth={n(r * .03)} strokeLinecap="round" />
    <circle cx={n(cx - r * .32)} cy={n(cy - r * .46)} r={n(r * .035)} fill="#fff" opacity=".8" />
  </g>;
}

/** Brass field glasses with leather-wrapped barrels, seen from above at a slight angle. */
function binoculars(cx: number, cy: number, len: number, angle: number, id: string): ReactNode {
  const h = len * .3, sep = h * 1.12, hair = Math.max(.35, h * .02);
  const band = (x: number, y0: number, w: number, hh: number, key: string) => <g key={key}>
    <rect x={n(x)} y={n(y0 - hh / 2)} width={n(w)} height={n(hh)} rx={n(hh * .12)} fill={`url(#${id}-cyl)`} />
    <line x1={n(x + w * .3)} y1={n(y0 - hh / 2)} x2={n(x + w * .3)} y2={n(y0 + hh / 2)} stroke="#3a2810" strokeOpacity=".55" strokeWidth={n(hair)} />
    <line x1={n(x + w * .7)} y1={n(y0 - hh / 2)} x2={n(x + w * .7)} y2={n(y0 + hh / 2)} stroke="#fff3c8" strokeOpacity=".45" strokeWidth={n(hair)} />
  </g>;
  const barrel = (y0: number, dim: number, key: string) => <g key={key}>
    {/* rubber eyecup with ribs and the eyepiece glass */}
    <rect x={n(-len * .03)} y={n(y0 - h * .33)} width={n(len * .1)} height={n(h * .66)} rx={n(h * .14)} fill={`url(#${id}-rubber)`} />
    {[.0, .025, .05].map(f => <line key={f} x1={n(len * f)} y1={n(y0 - h * .32)} x2={n(len * f)} y2={n(y0 + h * .32)} stroke="#000" strokeOpacity=".45" strokeWidth={n(hair)} />)}
    <ellipse cx={n(-len * .03)} cy={n(y0)} rx={n(h * .09)} ry={n(h * .32)} fill="#141010" />
    <ellipse cx={n(-len * .03)} cy={n(y0)} rx={n(h * .05)} ry={n(h * .17)} fill={`url(#${id}-lens)`} />
    {/* eyepiece tube with a knurled dioptre ring */}
    <rect x={n(len * .07)} y={n(y0 - h * .3)} width={n(len * .12)} height={n(h * .6)} rx={n(h * .06)} fill={`url(#${id}-cyl)`} />
    {Array.from({ length: 9 }, (_, i) => <line key={i} x1={n(len * (.1 + i * .008))} y1={n(y0 - h * .3)} x2={n(len * (.1 + i * .008))} y2={n(y0 + h * .3)} stroke="#3a2810" strokeOpacity=".6" strokeWidth={n(hair)} />)}
    {/* leather-wrapped body with turned brass bands and stitched seam */}
    <rect x={n(len * .18)} y={n(y0 - h * .5)} width={n(len * .46)} height={n(h)} rx={n(h * .16)} fill="#3a2416" filter={`url(#${id}-leather)`} />
    <rect x={n(len * .18)} y={n(y0 - h * .5)} width={n(len * .46)} height={n(h)} rx={n(h * .16)} fill={`url(#${id}-cyl-shade)`} />
    <line x1={n(len * .2)} y1={n(y0 + h * .28)} x2={n(len * .62)} y2={n(y0 + h * .28)} stroke="#c8a676" strokeOpacity=".55" strokeWidth={n(hair)} strokeDasharray={`${fmt(h * .06)} ${fmt(h * .04)}`} />
    {band(len * .165, y0, len * .045, h * 1.06, "b1")}
    {band(len * .615, y0, len * .045, h * 1.06, "b2")}
    {/* objective tube flaring to the front lens */}
    <path d={`M${n(len * .655)} ${n(y0 - h * .48)}L${n(len * .97)} ${n(y0 - h * .56)}V${n(y0 + h * .56)}L${n(len * .655)} ${n(y0 + h * .48)}Z`} fill={`url(#${id}-cyl)`} />
    <line x1={n(len * .8)} y1={n(y0 - h * .52)} x2={n(len * .8)} y2={n(y0 + h * .52)} stroke="#3a2810" strokeOpacity=".4" strokeWidth={n(hair)} />
    <ellipse cx={n(len * .97)} cy={n(y0)} rx={n(h * .17)} ry={n(h * .56)} fill={`url(#${id}-brass)`} stroke="#3a2810" strokeWidth={n(hair)} />
    <ellipse cx={n(len * .975)} cy={n(y0)} rx={n(h * .12)} ry={n(h * .44)} fill={`url(#${id}-lens)`} />
    {/* coating reflections in the objective */}
    <path d={`M${n(len * .975 - h * .06)} ${n(y0 - h * .3)}Q${n(len * .975 + h * .08)} ${n(y0 - h * .1)} ${n(len * .975 + h * .04)} ${n(y0 + h * .2)}`} fill="none" stroke="#e6a95a" strokeOpacity=".6" strokeWidth={n(hair * 2)} />
    <path d={`M${n(len * .975 - h * .02)} ${n(y0 + h * .3)}Q${n(len * .975 + h * .07)} ${n(y0 + h * .15)} ${n(len * .975 + h * .07)} ${n(y0 - h * .05)}`} fill="none" stroke="#9a7ad8" strokeOpacity=".55" strokeWidth={n(hair * 1.6)} />
    <ellipse cx={n(len * .975 + h * .02)} cy={n(y0 - h * .2)} rx={n(h * .025)} ry={n(h * .07)} fill="#fff" opacity=".85" />
    {/* strap lug */}
    <circle cx={n(len * .7)} cy={n(y0 + (y0 > 0 ? 1 : -1) * h * .58)} r={n(h * .08)} fill="none" stroke={`url(#${id}-brass)`} strokeWidth={n(h * .04)} />
    {dim < 1 && <rect x={n(-len * .04)} y={n(y0 - h * .58)} width={n(len * 1.06)} height={n(h * 1.16)} rx={n(h * .2)} fill="#1a1006" opacity={1 - dim} />}
  </g>;
  return <g transform={`translate(${n(cx)} ${n(cy)}) rotate(${n(angle)})`}>
    <ellipse cx={n(len * .5)} cy={n(h * .4)} rx={n(len * .6)} ry={n(sep + h * .45)} fill="#2a1a0c" opacity=".45" filter={`url(#${id}-soft)`} />
    {barrel(-sep / 2, .84, "back")}
    {/* hinge bridge and focus wheel between the barrels */}
    <g filter={`url(#${id}-bevel)`}>
      <rect x={n(len * .24)} y={n(-sep * .22)} width={n(len * .3)} height={n(sep * .44)} rx={n(sep * .1)} fill={`url(#${id}-brass)`} />
      <rect x={n(len * .05)} y={n(-sep * .38)} width={n(len * .1)} height={n(sep * .76)} rx={n(len * .025)} fill={`url(#${id}-cyl)`} />
      <circle cx={n(len * .39)} cy="0" r={n(sep * .12)} fill={`url(#${id}-brass)`} />
    </g>
    {Array.from({ length: 10 }, (_, i) => <line key={i} x1={n(len * (.058 + i * .009))} y1={n(-sep * .36)} x2={n(len * (.058 + i * .009))} y2={n(sep * .36)} stroke="#3a2810" strokeOpacity=".6" strokeWidth={n(hair)} />)}
    <line x1={n(len * .39 - sep * .07)} y1={n(-sep * .03)} x2={n(len * .39 + sep * .07)} y2={n(sep * .03)} stroke="#3a2810" strokeWidth={n(hair * 1.5)} />
    {[.28, .5].map(f => <circle key={f} cx={n(len * f)} cy={n(sep * .14)} r={n(sep * .03)} fill="#5a4018" />)}
    {barrel(sep / 2, 1, "front")}
  </g>;
}

/** A leather strap with stitched edges, a brass buckle and punched holes. */
function strap(x: number, y0: number, y1: number, w: number, buckleY: number, id: string, s: number, key: string): ReactNode {
  return <g key={key}>
    <rect x={n(x - w / 2 + s * 2)} y={n(y0 + s * 3)} width={n(w)} height={n(y1 - y0)} fill="#1a0e06" opacity=".4" filter={`url(#${id}-soft)`} />
    <rect x={n(x - w / 2)} y={n(y0)} width={n(w)} height={n(y1 - y0)} rx={n(w * .08)} fill={`url(#${id}-leather-h)`} />
    <rect x={n(x - w / 2)} y={n(y0)} width={n(w)} height={n(w * .55)} fill="#000" opacity=".25" />
    {[-1, 1].map(side => <line key={side} x1={n(x + side * w * .36)} y1={n(y0 + w * .1)} x2={n(x + side * w * .36)} y2={n(y1)} stroke="#e2c79a" strokeOpacity=".75" strokeWidth={n(Math.max(.5, w * .035))} strokeDasharray={`${fmt(w * .12)} ${fmt(w * .08)}`} />)}
    {[1.5, 2.1, 2.7].map(k => <ellipse key={k} cx={n(x)} cy={n(buckleY + w * k)} rx={n(w * .1)} ry={n(w * .12)} fill="#1a0d06" />)}
    <rect x={n(x - w * .58)} y={n(buckleY + w * .5)} width={n(w * 1.16)} height={n(w * .32)} rx={n(w * .06)} fill="#4a2512" stroke="#2a1408" strokeWidth={n(Math.max(.4, s * .5))} />
    <g filter={`url(#${id}-bevel)`}>
      <path fillRule="evenodd" d={`M${n(x - w * .7)} ${n(buckleY - w * .42)}h${n(w * 1.4)}v${n(w * .84)}h${n(-w * 1.4)}Z M${n(x - w * .54)} ${n(buckleY - w * .28)}v${n(w * .56)}h${n(w * 1.08)}v${n(-w * .56)}Z`} fill={`url(#${id}-brass)`} />
      <rect x={n(x - w * .06)} y={n(buckleY - w * .36)} width={n(w * .12)} height={n(w * .72)} rx={n(w * .05)} fill={`url(#${id}-brass)`} />
    </g>
  </g>;
}

/** A circular postmark with an aircraft at its heart and wavy cancellation lines. */
function postmark(cx: number, cy: number, r: number, rotate: number, ink: string, id: string, key: string, waves: boolean): ReactNode {
  return <g key={key} transform={`rotate(${n(rotate)} ${n(cx)} ${n(cy)})`} filter={`url(#${id}-ink)`} opacity=".78">
    <circle cx={n(cx)} cy={n(cy)} r={n(r)} fill="none" stroke={ink} strokeWidth={n(Math.max(1, r * .07))} />
    <circle cx={n(cx)} cy={n(cy)} r={n(r * .7)} fill="none" stroke={ink} strokeWidth={n(Math.max(.7, r * .04))} />
    {Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2; return <circle key={i} cx={n(cx + Math.cos(a) * r * .85)} cy={n(cy + Math.sin(a) * r * .85)} r={n(r * .045)} fill={ink} />; })}
    <path d={airplane(r * .9)} transform={`translate(${n(cx)} ${n(cy)}) rotate(-20)`} fill={ink} />
    {waves && Array.from({ length: 5 }, (_, i) => {
      const y = cy - r * .5 + i * r * .25;
      const pts = Array.from({ length: 17 }, (_, k) => [cx + r * .95 + k * r * .16, y + Math.sin(k * .9) * r * .08] as Pt);
      return <path key={i} d={`M${pts.map(xy).join("L")}`} fill="none" stroke={ink} strokeWidth={n(Math.max(.7, r * .045))} />;
    })}
  </g>;
}

/** A perforated postage stamp with an aircraft over a tinted sky. */
function stamp(x: number, y: number, w: number, h: number, rotate: number, sky: [string, string], id: string, key: string): ReactNode {
  const r = w * .045, holes: Pt[] = [];
  for (let px = x; px <= x + w + .1; px += r * 2.8) holes.push([px, y], [px, y + h]);
  for (let py = y + r * 2.8; py < y + h; py += r * 2.8) holes.push([x, py], [x + w, py]);
  const ix = x + w * .12, iy = y + h * .1, iw = w * .76, ih = h * .62;
  return <g key={key} transform={`rotate(${n(rotate)} ${n(x + w / 2)} ${n(y + h / 2)})`}>
    <mask id={`${id}-${key}-perf`} maskUnits="userSpaceOnUse" x={n(x - r * 2)} y={n(y - r * 2)} width={n(w + r * 4)} height={n(h + r * 4)}>
      <rect x={n(x - r * 2)} y={n(y - r * 2)} width={n(w + r * 4)} height={n(h + r * 4)} fill="#fff" />
      {holes.map(([hx, hy], i) => <circle key={i} cx={n(hx)} cy={n(hy)} r={n(r)} fill="#000" />)}
    </mask>
    <g mask={`url(#${id}-${key}-perf)`}>
      <rect x={n(x)} y={n(y)} width={n(w)} height={n(h)} fill="#f2e8cf" filter={`url(#${id}-lift)`} />
      <rect x={n(ix)} y={n(iy)} width={n(iw)} height={n(ih)} fill={`url(#${id}-${key}-sky)`} />
      <circle cx={n(ix + iw * .76)} cy={n(iy + ih * .3)} r={n(ih * .14)} fill="#f6e6b8" opacity=".75" />
      <path d={`M${n(ix)} ${n(iy + ih * .82)}q${n(iw * .25)} ${n(-ih * .2)} ${n(iw * .5)} 0t${n(iw * .5)} 0V${n(iy + ih)}H${n(ix)}Z`} fill={sky[1]} opacity=".6" />
      <path d={airplane(iw * .5)} transform={`translate(${n(ix + iw * .45)} ${n(iy + ih * .5)}) rotate(-12)`} fill="#f7efdc" opacity=".92" />
      <rect x={n(ix)} y={n(iy)} width={n(iw)} height={n(ih)} fill="none" stroke={sky[1]} strokeWidth={n(Math.max(.6, w * .02))} />
      {[0, 1, 2].map(i => <rect key={i} x={n(ix + i * iw * .14)} y={n(y + h * .8)} width={n(iw * .1)} height={n(h * .06)} fill={sky[1]} opacity=".75" />)}
      <rect x={n(ix + iw * .62)} y={n(y + h * .78)} width={n(iw * .38)} height={n(h * .1)} fill={sky[1]} opacity=".8" />
    </g>
    <defs>
      <linearGradient id={`${id}-${key}-sky`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>
    </defs>
  </g>;
}

function adventureMapBack(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const rng = seeded(9031);
  const s = Math.max(.45, W / 1000);
  const m = W * .008, band = W * .017, inset = W * .014;
  const bz = Math.min(A.x, A.y) * .17;
  const below = H - A.y - A.height;
  // A real world map, cropped like a travel chart (105°W–165°E, 78°N–52°S): North America
  // fills the left margin, Greenland and Europe the top, Japan and Australia the right.
  const proj = ([lon, lat]: [number, number]): Pt => [(lon + 105) / 270 * W, (78 - lat) / 130 * H];
  const landPath = worldLand().map(ring => `M${ring.map(p => xy(proj(p))).join("L")}Z`).join("");
  const parallel = (lat: number) => `M0 ${n(proj([0, lat])[1])}H${n(W)}`;
  const chains: Array<Array<[number, number]>> = [
    [[-104, 52], [-103, 46], [-104, 40], [-105, 35]],
    [[-78, 2], [-76, -10], [-70, -20], [-70, -30], [-71, -40], [-73, -48]],
    [[72, 36], [80, 32], [88, 28], [96, 28]],
    [[58, 66], [59, 60], [59, 54]],
    [[143, -38], [147, -32], [150, -26]],
  ];
  const mountains = chains.flatMap((chain, ci) => smooth(chain.map(proj), 2).map(([x, y], i) => {
    const w = W * .0055 * (i % 2 ? .8 : 1);
    return <g key={`${ci}-${i}`}>
      <path d={`M${n(x - w)} ${n(y)}L${n(x)} ${n(y - w * 1.4)}L${n(x + w)} ${n(y)}`} fill="#e6d0a0" stroke="#5e4023" strokeWidth={n(Math.max(.5, s * .8))} strokeLinejoin="round" />
      <path d={`M${n(x)} ${n(y - w * 1.4)}L${n(x + w * .2)} ${n(y)}L${n(x + w)} ${n(y)}Z`} fill="#5e4023" opacity=".35" />
    </g>;
  }));
  const city: Record<string, [number, number]> = {
    chicago: [-87.6, 41.9], mexico: [-99.1, 19.4], lima: [-77, -12], rio: [-43.2, -22.9], capeTown: [18.4, -33.9], perth: [115.9, -31.9],
    sydney: [151.2, -33.9], tokyo: [139.7, 35.7], moscow: [37.6, 55.8], oslo: [10.7, 59.9], reykjavik: [-21.9, 64.1],
  };
  // Each route bows away from the map's centre, like a great circle on a flat chart.
  const route = (from: string, to: string, bow: number): [Pt, Pt, Pt] => {
    const a = proj(city[from]), b = proj(city[to]), m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d;
    if ((m[0] - W / 2) * nx + (m[1] - H / 2) * ny < 0) { nx = -nx; ny = -ny; }
    return [a, [m[0] + nx * d * bow, m[1] + ny * d * bow], b];
  };
  // One voyage loops around the window: across the Atlantic, over Europe and Siberia, down to Australia and home.
  const routes = [route("chicago", "reykjavik", .2), route("reykjavik", "oslo", .3), route("oslo", "moscow", .3), route("moscow", "tokyo", .16),
    route("tokyo", "sydney", .14), route("sydney", "perth", .3), route("perth", "capeTown", .14), route("capeTown", "rio", .2),
    route("rio", "lima", .3), route("lima", "mexico", .3), route("mexico", "chicago", .3)];
  const ports = Object.values(city).map(proj);
  // A small engraved sailing ship in the Pacific margin.
  const ship = proj([-28, -40]), hull = W * .026;
  const stains = Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={n(between(rng, 0, W))} cy={n(between(rng, 0, H))} rx={n(W * between(rng, .04, .12))} ry={n(W * between(rng, .03, .08))} fill={`url(#${id}-stain)`} />);
  const paper = `M${n(m)} ${n(m)}H${n(W - m)}V${n(H - m)}H${n(m)}Z`;
  const bandRect = (x: number, y: number, w: number, h: number) => <rect x={n(x)} y={n(y)} width={n(w)} height={n(h)} fill={`url(#${id}-air)`} />;
  const corner = (x: number, y: number, dx: number, dy: number, key: string) => {
    const c = Math.min(A.x, H - A.y - A.height) * .8;
    return <g key={key} filter={`url(#${id}-bevel)`}>
      <path d={`M${n(x)} ${n(y)}H${n(x + dx * c)}Q${n(x + dx * c * .42)} ${n(y + dy * c * .42)} ${n(x)} ${n(y + dy * c)}Z`} fill={`url(#${id}-brass)`} />
      {[[.18, .18], [.55, .14], [.14, .55]].map(([fx, fy], i) => <circle key={i} cx={n(x + dx * c * fx)} cy={n(y + dy * c * fy)} r={n(c * .045)} fill={`url(#${id}-brass)`} />)}
    </g>;
  };
  const screws: Pt[] = [[A.x - bz * .5, A.y - bz * .5], [A.x + A.width + bz * .5, A.y - bz * .5], [A.x - bz * .5, A.y + A.height + bz * .5], [A.x + A.width + bz * .5, A.y + A.height + bz * .5]];
  const sw = Math.min(W * .05, A.y * .58), sh = sw * 1.2;

  return <svg {...svgProps(g)}>
    <defs>
      <GiltBevel id={`${id}-bevel`} s={s} depth={.8} />
      <clipPath id={`${id}-paper`}><path d={paper} /></clipPath>
      <filter id={`${id}-deckle`} x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={fmt(.05 / s)} numOctaves="4" seed="6" result="edge" />
        <feDisplacementMap in="SourceGraphic" in2="edge" scale={fmt(9 * s)} xChannelSelector="R" yChannelSelector="G" result="torn" />
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="2" result="fibre" />
        <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .55 -.18" result="grain" />
        <feComposite in="grain" in2="torn" operator="atop" />
      </filter>
      <filter id={`${id}-burn`} x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation={fmt(W * .012)} /></filter>
      <pattern id={`${id}-hatch`} width={n(s * 4)} height={n(s * 4)} patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
        <line x1="0" y1="0" x2="0" y2={n(s * 4)} stroke="#6b4a26" strokeOpacity=".22" strokeWidth={n(Math.max(.4, s * .6))} />
      </pattern>
      <filter id={`${id}-ink`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency={fmt(.35 / s)} numOctaves="2" seed="5" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.4 -.7" result="mask" />
        <feComposite in="SourceGraphic" in2="mask" operator="in" />
      </filter>
      <filter id={`${id}-lift`} x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx={fmt(s * 1.2)} dy={fmt(s * 2)} stdDeviation={fmt(s * 1.6)} floodColor="#3a2410" floodOpacity=".4" /></filter>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={fmt(s * 4)} /></filter>
      <linearGradient id={`${id}-parchment`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={n(W)} y2={n(H)}><stop stopColor="#efdfb6" /><stop offset=".5" stopColor="#e2c995" /><stop offset="1" stopColor="#d1b27a" /></linearGradient>
      <radialGradient id={`${id}-stain`}><stop stopColor="#8a5a2a" stopOpacity=".2" /><stop offset=".7" stopColor="#8a5a2a" stopOpacity=".06" /><stop offset="1" stopColor="#8a5a2a" stopOpacity="0" /></radialGradient>
      <pattern id={`${id}-air`} width={n(band * 2.6)} height={n(band * 2.6)} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width={n(band * .65)} height={n(band * 2.6)} fill="#b8433a" />
        <rect x={n(band * 1.3)} width={n(band * .65)} height={n(band * 2.6)} fill="#355d9a" />
      </pattern>
      <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0d38c" /><stop offset=".35" stopColor="#b9904a" /><stop offset=".6" stopColor="#d8b46a" /><stop offset="1" stopColor="#6e4f22" /></linearGradient>
      <linearGradient id={`${id}-bronze`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#6a5638" /><stop offset=".5" stopColor="#3a2e20" /><stop offset="1" stopColor="#241b12" /></linearGradient>
      <linearGradient id={`${id}-label`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3d63a8" /><stop offset="1" stopColor="#253f74" /></linearGradient>
    </defs>

    {/* paper: deckled, grained, stained and burnt at the edges */}
    <path d={paper} fill={`url(#${id}-parchment)`} filter={`url(#${id}-deckle)`} />
    <g clipPath={`url(#${id}-paper)`}>
      {stains}
      <path d={paper} fill="none" stroke="#6b4220" strokeOpacity=".55" strokeWidth={n(W * .03)} filter={`url(#${id}-burn)`} />
      <path d={`M${n(W / 2)} 0V${n(H)}M0 ${n(H / 2)}H${n(W)}`} stroke="#fff6dc" strokeOpacity=".35" strokeWidth={n(s * 2)} />
      <path d={`M${n(W / 2 + s * 1.5)} 0V${n(H)}M0 ${n(H / 2 + s * 1.5)}H${n(W)}`} stroke="#7a5530" strokeOpacity=".18" strokeWidth={n(s * 1.5)} />
      {/* graticule */}
      <g stroke="#7b5a34" strokeOpacity=".2" strokeWidth={n(Math.max(.5, s * .8))}>
        {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} x1={n(W * i / 12)} y1="0" x2={n(W * i / 12)} y2={n(H)} />)}
        {[60, 30, -30].map(l => <path key={l} d={parallel(l)} />)}
      </g>
      {/* engraved coast: two ripple lines offshore, a hatched land fill and an inked shore */}
      <g strokeLinejoin="round" fill="none">
        <path d={landPath} stroke="#6b4a26" strokeOpacity=".22" strokeWidth={n(s * 12)} />
        <path d={landPath} stroke={`url(#${id}-parchment)`} strokeWidth={n(s * 10.4)} />
        <path d={landPath} stroke="#6b4a26" strokeOpacity=".3" strokeWidth={n(s * 6.4)} />
        <path d={landPath} stroke={`url(#${id}-parchment)`} strokeWidth={n(s * 4.8)} />
      </g>
      <path d={landPath} fill="#d9bd85" />
      <path d={landPath} fill={`url(#${id}-hatch)`} />
      <path d={landPath} fill="none" stroke="#5e4023" strokeWidth={n(Math.max(.6, s * 1.1))} strokeLinejoin="round" />
      {mountains}
      {/* equator, tropics and polar circle */}
      <g fill="none" stroke="#7b5a34" strokeWidth={n(Math.max(.5, s * .8))}>
        <path d={parallel(0)} strokeOpacity=".45" strokeDasharray={`${fmt(s * 10)} ${fmt(s * 3)} ${fmt(s * 2)} ${fmt(s * 3)}`} />
        {[23.44, -23.44, 66.56].map(l => <path key={l} d={parallel(l)} strokeOpacity=".3" strokeDasharray={`${fmt(s * 3)} ${fmt(s * 4)}`} />)}
      </g>
      <g transform={`translate(${xy(ship)})`} fill="none" stroke="#3a2614" strokeWidth={n(Math.max(.6, s))} strokeLinejoin="round" opacity=".8">
        <path d={`M${n(-hull * .5)} 0L${n(hull * .5)} 0L${n(hull * .38)} ${n(hull * .16)}L${n(-hull * .4)} ${n(hull * .16)}Z`} fill="#c9aa72" />
        {[-.22, .05, .3].map((x, i) => <g key={i}>
          <line x1={n(hull * x)} y1="0" x2={n(hull * x)} y2={n(-hull * (i === 1 ? .62 : .5))} />
          <path d={`M${n(hull * x)} ${n(-hull * (i === 1 ? .56 : .44))}Q${n(hull * (x + .16))} ${n(-hull * (i === 1 ? .38 : .3))} ${n(hull * x)} ${n(-hull * .06)}Z`} fill="#efe0bc" />
        </g>)}
        <path d={`M${n(-hull * .7)} ${n(hull * .26)}q${n(hull * .12)} ${n(-hull * .08)} ${n(hull * .24)} 0t${n(hull * .24)} 0t${n(hull * .24)} 0t${n(hull * .24)} 0t${n(hull * .24)} 0`} />
      </g>
      {/* routes: dashed great-circle arcs with aircraft and port marks */}
      <g fill="none" stroke="#4a2f18" strokeOpacity=".7" strokeWidth={n(Math.max(.8, s * 1.3))} strokeDasharray={`${fmt(s * 5)} ${fmt(s * 4)}`}>
        {routes.map(([a, c, b], i) => <path key={i} d={`M${xy(a)}Q${xy(c)} ${xy(b)}`} />)}
      </g>
      {routes.filter((_, i) => i % 2 === 0).map(([a, c, b], i) => {
        const p = quadAt(a, c, b, .5), q = quadAt(a, c, b, .52), angle = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
        return <path key={i} d={airplane(W * .02)} transform={`translate(${xy(p)}) rotate(${n(angle)})`} fill="#3a2614" opacity=".82" />;
      })}
      {ports.map(([x, y], i) => <g key={i}>
        <circle cx={n(x)} cy={n(y)} r={n(s * 2.6)} fill="#8b2b23" />
        <circle cx={n(x)} cy={n(y)} r={n(s * 5.5)} fill="none" stroke="#4a2f18" strokeOpacity=".6" strokeWidth={n(Math.max(.5, s * .8))} />
      </g>)}
      {/* coffee ring */}
      <circle cx={n(W * .32)} cy={n(A.y + A.height + below * .5)} r={n(below * .34)} fill="none" stroke="#7a4a1e" strokeOpacity=".16" strokeWidth={n(s * 3)} filter={`url(#${id}-ink)`} />
      {/* airmail border */}
      <g opacity=".85">
        {bandRect(inset, inset, W - inset * 2, band)}
        {bandRect(inset, H - inset - band, W - inset * 2, band)}
        {bandRect(inset, inset, band, H - inset * 2)}
        {bandRect(W - inset - band, inset, band, H - inset * 2)}
      </g>
    </g>

    {/* keepsakes on the paper */}
    {stamp(W - A.x * .2 - sw * 2.1, A.y * .16, sw, sh, -5, ["#9fb4a8", "#4c6b60"], id, "s1")}
    {stamp(W - A.x * .2 - sw * .95, A.y * .1, sw, sh, 4, ["#c9906e", "#7a2f2a"], id, "s2")}
    {postmark(W - A.x * .2 - sw * 1.2, A.y * .2 + sh * .7, sw * .5, -12, "#2e2018", id, "pm1", true)}
    <g transform={`rotate(-5 ${n(W - A.x * .2 - sw * 3.6)} ${n(A.y * .36)})`} filter={`url(#${id}-lift)`}>
      <rect x={n(W - A.x * .2 - sw * 4.6)} y={n(A.y * .22)} width={n(sw * 1.9)} height={n(sw * .56)} rx={n(sw * .05)} fill={`url(#${id}-label)`} />
      <rect x={n(W - A.x * .2 - sw * 4.52)} y={n(A.y * .22 + sw * .07)} width={n(sw * 1.74)} height={n(sw * .42)} rx={n(sw * .03)} fill="none" stroke="#f3ead2" strokeWidth={n(Math.max(.6, s))} />
      <path d={airplane(sw * .34)} transform={`translate(${n(W - A.x * .2 - sw * 4.25)} ${n(A.y * .22 + sw * .28)})`} fill="#f3ead2" />
      {[0, 1].map(i => <rect key={i} x={n(W - A.x * .2 - sw * 4.0)} y={n(A.y * .22 + sw * (.18 + i * .14))} width={n(sw * (i ? .9 : 1.2))} height={n(sw * .07)} fill="#f3ead2" />)}
    </g>
    {postmark(A.x * .55, A.y + A.height * .72, Math.min(A.x * .36, W * .045), 8, "#2e2018", id, "pm2", false)}
    <g transform={`rotate(-8 ${n(A.x + A.width * .82)} ${n(A.y + A.height + below * .55)})`} filter={`url(#${id}-ink)`} opacity=".75">
      <rect x={n(A.x + A.width * .7)} y={n(A.y + A.height + below * .36)} width={n(W * .15)} height={n(below * .42)} rx={n(s * 3)} fill="none" stroke="#8b2b23" strokeWidth={n(Math.max(1, s * 2.2))} />
      <rect x={n(A.x + A.width * .7 + s * 4)} y={n(A.y + A.height + below * .36 + s * 4)} width={n(W * .15 - s * 8)} height={n(below * .42 - s * 8)} rx={n(s * 2)} fill="none" stroke="#8b2b23" strokeWidth={n(Math.max(.6, s))} />
      <circle cx={n(A.x + A.width * .7 + W * .03)} cy={n(A.y + A.height + below * .57)} r={n(below * .13)} fill="none" stroke="#8b2b23" strokeWidth={n(Math.max(.7, s * 1.2))} />
      <ellipse cx={n(A.x + A.width * .7 + W * .03)} cy={n(A.y + A.height + below * .57)} rx={n(below * .06)} ry={n(below * .13)} fill="none" stroke="#8b2b23" strokeWidth={n(Math.max(.6, s))} />
      <line x1={n(A.x + A.width * .7 + W * .03 - below * .13)} y1={n(A.y + A.height + below * .57)} x2={n(A.x + A.width * .7 + W * .03 + below * .13)} y2={n(A.y + A.height + below * .57)} stroke="#8b2b23" strokeWidth={n(Math.max(.6, s))} />
      <path d={airplane(below * .26)} transform={`translate(${n(A.x + A.width * .7 + W * .1)} ${n(A.y + A.height + below * .57)}) rotate(-15)`} fill="#8b2b23" />
    </g>
    {corner(m, H - m, 1, -1, "cl")}
    {corner(W - m, H - m, -1, -1, "cr")}

    {/* bronze bezel around the window */}
    <rect x={n(A.x - bz)} y={n(A.y - bz)} width={n(A.width + bz * 2)} height={n(A.height + bz * 2)} rx={n(bz * .4)} fill="#1c120a" opacity=".55" filter={`url(#${id}-soft)`} transform={`translate(${n(s * 3)} ${n(s * 5)})`} />
    <g filter={`url(#${id}-bevel)`}>
      <path fillRule="evenodd" d={`M${n(A.x - bz)} ${n(A.y - bz)}H${n(A.x + A.width + bz)}V${n(A.y + A.height + bz)}H${n(A.x - bz)}Z M${n(A.x)} ${n(A.y)}V${n(A.y + A.height)}H${n(A.x + A.width)}V${n(A.y)}Z`} fill={`url(#${id}-bronze)`} />
      {screws.map(([x, y], i) => <circle key={i} cx={n(x)} cy={n(y)} r={n(bz * .28)} fill={`url(#${id}-brass)`} />)}
    </g>
    {screws.map(([x, y], i) => <line key={i} x1={n(x - bz * .2)} y1={n(y - bz * .08)} x2={n(x + bz * .2)} y2={n(y + bz * .08)} stroke="#3a2810" strokeWidth={n(Math.max(.6, bz * .06))} />)}
    <rect x={n(A.x - bz * .25)} y={n(A.y - bz * .25)} width={n(A.width + bz * .5)} height={n(A.height + bz * .5)} fill="none" stroke="#0e0905" strokeOpacity=".7" strokeWidth={n(bz * .5)} />
  </svg>;
}

function adventureMapFront(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const s = Math.max(.45, W / 1000);
  const reach = W * ADVENTURE_MAP.intrusion!;
  const below = H - A.y - A.height;
  const rc = Math.min(A.x, A.y) * .46;
  const sw = W * .022;
  return <svg {...svgProps(g)}>
    <defs>
      <GiltBevel id={`${id}-bevel`} s={s} depth={.8} />
      <clipPath id={`${id}-edge`}><path clipRule="evenodd" d={edgeBandClip(g, reach)} /></clipPath>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={fmt(s * 4)} /></filter>
      <filter id={`${id}-leather`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={fmt(.9 / s)} numOctaves="2" seed="7" result="pebble" />
        <feDiffuseLighting in="pebble" surfaceScale={fmt(1.4 * s)} lightingColor="#fff" result="lit"><feDistantLight azimuth="225" elevation="55" /></feDiffuseLighting>
        <feComposite in="lit" in2="SourceGraphic" operator="arithmetic" k1="1.2" k2="0" k3="0" k4="0" result="t" />
        <feComposite in="t" in2="SourceAlpha" operator="in" />
      </filter>
      <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0d38c" /><stop offset=".35" stopColor="#b9904a" /><stop offset=".6" stopColor="#d8b46a" /><stop offset="1" stopColor="#6e4f22" /></linearGradient>
      <linearGradient id={`${id}-cyl`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#5e4520" /><stop offset=".28" stopColor="#d8b46a" /><stop offset=".4" stopColor="#f6dc98" /><stop offset=".72" stopColor="#9b7434" /><stop offset="1" stopColor="#3e2c12" /></linearGradient>
      <linearGradient id={`${id}-cyl-shade`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#000" stopOpacity=".55" /><stop offset=".3" stopColor="#fff" stopOpacity=".12" /><stop offset=".5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".6" /></linearGradient>
      <radialGradient id={`${id}-lens`} cx=".4" cy=".35" r=".8"><stop stopColor="#5a7aa0" /><stop offset=".4" stopColor="#1e2a3e" /><stop offset=".85" stopColor="#0a0d14" /><stop offset="1" stopColor="#6b4f8a" /></radialGradient>
      <radialGradient id={`${id}-face`} cx=".45" cy=".4" r=".7"><stop stopColor="#f3e6c4" /><stop offset=".8" stopColor="#dcc597" /><stop offset="1" stopColor="#b8995e" /></radialGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".38" /><stop offset=".35" stopColor="#fff" stopOpacity=".05" /><stop offset=".7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".18" /></linearGradient>
      <linearGradient id={`${id}-blued`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#5d7aa6" /><stop offset=".5" stopColor="#24324d" /><stop offset="1" stopColor="#101826" /></linearGradient>
      <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f2f2ee" /><stop offset=".5" stopColor="#a9aaa6" /><stop offset="1" stopColor="#6c6d69" /></linearGradient>
      <radialGradient id={`${id}-dialshade`} cx=".5" cy=".5" r=".5"><stop offset=".75" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#3a2410" stopOpacity=".35" /></radialGradient>
      <linearGradient id={`${id}-rubber`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#141210" /><stop offset=".35" stopColor="#3a3632" /><stop offset=".6" stopColor="#1c1a18" /><stop offset="1" stopColor="#0a0908" /></linearGradient>
      <linearGradient id={`${id}-leather-h`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#4a2412" /><stop offset=".3" stopColor="#8a4a26" /><stop offset=".55" stopColor="#7a3f1f" /><stop offset="1" stopColor="#3e1d0e" /></linearGradient>
    </defs>
    <WindowRecess window={A} id={`${id}-recess`} depth={Math.min(A.x, A.y) * .22} strength={.9} />
    <g clipPath={`url(#${id}-edge)`}>
      {compass(A.x * .66, A.y * .68, rc, id)}
      {strap(A.x + A.width * .82, A.y + A.height - reach * .7, H + s * 4, sw, A.y + A.height + below * .45, id, s, "st1")}
      <path d={taper([[A.x * .9, A.y + A.height + below * .5], [A.x * .7, A.y + A.height + below * .8], [A.x * .75, H + s * 6]], sw * .7, sw * .7)} fill={`url(#${id}-leather-h)`} />
      {binoculars(A.x * .5, A.y + A.height + below * .46, Math.min(W * .1, below * 1.25), -14, id)}
    </g>
  </svg>;
}

/* ------------------------------------------------------------------ */
/* Koi pond: flowing water ribbons, water plants, bubbles and koi       */
/* ------------------------------------------------------------------ */

interface KoiStyle { body: [string, string, string]; fin: [string, string]; blotches?: string; spots?: string; veil?: boolean }
const KOI: Record<"gold" | "kohaku" | "ogon" | "hi", KoiStyle> = {
  gold: { body: ["#c4521a", "#f39a2b", "#ffd690"], fin: ["#f08a2e", "#fff0d2"] },
  kohaku: { body: ["#cfc5b8", "#f5efe6", "#ffffff"], fin: ["#efe2d6", "#ffffff"], blotches: "#e2472a" },
  ogon: { body: ["#b8861a", "#f1c94a", "#fff2b2"], fin: ["#f3d273", "#fffbe8"], spots: "#231c16" },
  hi: { body: ["#931b10", "#df3d26", "#ff9a6e"], fin: ["#e4502e", "#ffd8c2"], veil: true },
};

/** A koi seen from the side, its body bent along a gentle arc. Local +x is the head. */
/** `mirror` reflects the fish across its spine, so one rotated past 90° still swims belly-down. */
function koi(cx: number, cy: number, angle: number, L: number, curve: number, style: KoiStyle, rng: Rng, id: string, key: string, mirror = false): ReactNode {
  const k = curve / L, fy = mirror ? -1 : 1;
  // Geometry is mirrored in local coordinates, not with a negative scale, so shading stays correct.
  const bend = ([x, y0]: Pt): Pt => {
    const y = y0 * fy;
    if (Math.abs(k) < 1e-6) return [x, y];
    const th = x * k;
    return [Math.sin(th) / k - y * Math.sin(th), (1 - Math.cos(th)) / k + y * Math.cos(th)];
  };
  const path = (pts: Pt[], close = true) => `M${pts.map(bend).map(xy).join("L")}${close ? "Z" : ""}`;
  const xAt = (u: number) => lerp(-.34, .46, u) * L;
  const half = (u: number) => L * (.042 + .128 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 1.25))), .8));
  const upper: Pt[] = [], lower: Pt[] = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; upper.push([xAt(u), -half(u)]); lower.push([xAt(u), half(u) * .92]); }
  const nose: Pt[] = [[xAt(1) + L * .025, -L * .028], [xAt(1) + L * .045, -L * .006], [xAt(1) + L * .04, L * .016], [xAt(1) + L * .02, L * .034]];
  const body = path([...upper, ...nose, ...lower.slice().reverse()]);
  const x0 = xAt(0), tl = L * (style.veil ? .82 : .5);
  // A veil tail trails in two long lobes; its free edge ripples like fine silk.
  const veilEdge = (): Pt[] => {
    const outline = smooth([[x0, -L * .035], [x0 - tl * .28, -tl * .26], [x0 - tl * .62, -tl * .36], [x0 - tl * .96, -tl * .24], [x0 - tl * 1.06, -tl * .06],
      [x0 - tl * .62, tl * .04], [x0 - tl * 1.0, tl * .28], [x0 - tl * .72, tl * .44], [x0 - tl * .34, tl * .34], [x0, L * .035]], 8);
    return outline.map(([x, y], i) => {
      const free = x < x0 - tl * .5 ? Math.sin(i * 1.3) * tl * .025 : 0;
      return [x, y + free] as Pt;
    });
  };
  const tailEdge: Pt[] = style.veil
    ? veilEdge()
    : smooth([[x0, -L * .035], [x0 - tl * .45, -tl * .4], [x0 - tl, -tl * .6], [x0 - tl * .62, -tl * .08], [x0 - tl * .55, 0], [x0 - tl * .62, tl * .08], [x0 - tl * .98, tl * .58], [x0 - tl * .45, tl * .4], [x0, L * .035]], 6);
  const rays = tailEdge.filter((_, i) => i % 4 === 2).map(p => path([[x0 + L * .02, 0], p], false));
  const fin = (u0: number, u1: number, reach: number, sweep: number, below: boolean): Pt[] => {
    const sign = below ? 1 : -1, edge = (u: number) => sign * half(u) * (below ? .9 : 1);
    return smooth([[xAt(u1), edge(u1) * .92], [xAt(lerp(u0, u1, .65)) - L * sweep * .3, edge(lerp(u0, u1, .6)) + sign * reach * .7], [xAt(u0) - L * sweep, edge(u0) + sign * reach], [xAt(lerp(u0, u1, .2)), edge(lerp(u0, u1, .15)) + sign * reach * .25], [xAt(u0), edge(u0) * .92]], 6);
  };
  const finScale = style.veil ? 1.55 : 1;
  const dorsal = fin(.3, .68, L * .13 * (style.veil ? 1.15 : 1), style.veil ? .2 : .12, false);
  const pectoral = fin(.66, .8, L * .15 * finScale, .1, true);
  const pectoralBack = pectoral.map(([x, y]) => [x - L * .03, y - L * .02] as Pt);
  const pelvic = fin(.42, .52, L * .09 * finScale, .06, true);
  const finRays = (pts: Pt[], base: Pt) => pts.filter((_, i) => i % 3 === 1).map(p => path([base, p], false));
  const scales: string[] = [];
  for (let u = .14; u < .8; u += .042) {
    for (let v = -.78; v <= .8; v += .3) {
      const x = xAt(u), y = v * half(u) + (Math.round(u / .042) % 2 ? .15 * half(u) : 0), r = L * .022;
      if (Math.abs(y) > half(u) * .86) continue;
      const a = bend([x, y - r]), b = bend([x, y + r]);
      scales.push(`M${xy(a)}A${n(r)} ${n(r)} 0 0 0 ${xy(b)}`);
    }
  }
  const marks = style.blotches
    ? Array.from({ length: 4 }, (_, i) => { const u = [.82, .58, .36, .2][i], v = between(rng, -.5, .1); return { p: bend([xAt(u), v * half(u)]), rx: L * between(rng, .07, .12), ry: half(u) * between(rng, .55, .9), color: style.blotches! }; })
    : style.spots ? Array.from({ length: 12 }, () => { const u = between(rng, .15, .8), v = between(rng, -.8, .8); return { p: bend([xAt(u), v * half(u)]), rx: L * between(rng, .01, .025), ry: L * between(rng, .008, .02), color: style.spots! }; }) : [];
  const eye = bend([xAt(.9), -half(.9) * .28]), gill = path([[xAt(.8), -half(.8) * .82], [xAt(.77), 0], [xAt(.8), half(.8) * .78]], false);
  const back = path(upper.filter((_, i) => i > 8 && i < 26).map(([x, y]) => [x, y * .62] as Pt), false);
  const prefix = `${id}-${key}`;
  return <g key={key} transform={`translate(${n(cx)} ${n(cy)}) rotate(${n(angle)})`} filter={`url(#${id}-fishshadow)`}>
    <defs>
      <linearGradient id={`${prefix}-body`} x1="0" y1={mirror ? 1 : 0} x2="0" y2={mirror ? 0 : 1}><stop stopColor={style.body[0]} /><stop offset=".45" stopColor={style.body[1]} /><stop offset="1" stopColor={style.body[2]} /></linearGradient>
      <linearGradient id={`${prefix}-finx`} x1="1" y1="0" x2="0" y2="0"><stop stopColor={style.fin[0]} /><stop offset=".55" stopColor={style.fin[0]} stopOpacity={style.veil ? .7 : .85} /><stop offset="1" stopColor={style.fin[1]} stopOpacity={style.veil ? .3 : .55} /></linearGradient>
      <linearGradient id={`${prefix}-finy`} x1="0" y1={mirror ? 1 : 0} x2="0" y2={mirror ? 0 : 1}><stop stopColor={style.fin[0]} /><stop offset="1" stopColor={style.fin[1]} stopOpacity=".6" /></linearGradient>
      <clipPath id={`${prefix}-clip`}><path d={body} /></clipPath>
    </defs>
    <path d={path(tailEdge)} fill={`url(#${prefix}-finx)`} opacity=".9" />
    <g stroke={style.fin[0]} strokeOpacity=".55" strokeWidth={n(Math.max(.4, L * .006))} fill="none">{rays.map((d, i) => <path key={i} d={d} />)}</g>
    <path d={path(pectoralBack)} fill={`url(#${prefix}-finy)`} opacity=".55" />
    <path d={path(dorsal)} fill={`url(#${prefix}-finy)`} opacity=".88" />
    <g stroke={style.fin[0]} strokeOpacity=".5" strokeWidth={n(Math.max(.35, L * .005))} fill="none">{finRays(dorsal, [xAt(.5), -half(.5) * .9]).map((d, i) => <path key={i} d={d} />)}</g>
    <path d={body} fill={`url(#${prefix}-body)`} />
    <g clipPath={`url(#${prefix}-clip)`}>
      {marks.map((mk, i) => <ellipse key={i} cx={n(mk.p[0])} cy={n(mk.p[1])} rx={n(mk.rx)} ry={n(mk.ry)} fill={mk.color} opacity=".92" />)}
      <g fill="none" stroke={style.body[0]} strokeOpacity=".28" strokeWidth={n(Math.max(.4, L * .005))}>{scales.map((d, i) => <path key={i} d={d} />)}</g>
      <path d={back} fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth={n(L * .02)} strokeLinecap="round" />
    </g>
    <path d={gill} fill="none" stroke={style.body[0]} strokeOpacity=".45" strokeWidth={n(Math.max(.5, L * .007))} />
    <path d={path(pelvic)} fill={`url(#${prefix}-finy)`} opacity=".85" />
    <path d={path(pectoral)} fill={`url(#${prefix}-finy)`} opacity=".9" />
    <g stroke={style.fin[0]} strokeOpacity=".5" strokeWidth={n(Math.max(.35, L * .005))} fill="none">{finRays(pectoral, [xAt(.76), half(.76) * .8]).map((d, i) => <path key={i} d={d} />)}</g>
    <circle cx={n(eye[0])} cy={n(eye[1])} r={n(L * .03)} fill="#2a1a12" stroke="#d9b07a" strokeWidth={n(Math.max(.4, L * .006))} />
    <circle cx={n(eye[0] + L * .008)} cy={n(eye[1] - L * .008)} r={n(L * .009)} fill="#fff" />
  </g>;
}

/** Samples around a rounded rectangle `offset` outside the window, with outward normals. */
function roundedRing(A: Rect, offset: number, radius: number) {
  const r = Math.max(2, radius + offset), x0 = A.x - offset, y0 = A.y - offset, x1 = A.x + A.width + offset, y1 = A.y + A.height + offset;
  const pts: Pt[] = [];
  const arc = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= 8; i++) { const a = a0 + i / 8 * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  pts.push([x0 + r, y0], [x1 - r, y0]); arc(x1 - r, y0 + r, -Math.PI / 2);
  pts.push([x1, y1 - r]); arc(x1 - r, y1 - r, 0);
  pts.push([x0 + r, y1]); arc(x0 + r, y1 - r, Math.PI / 2);
  pts.push([x0, y0 + r]); arc(x0 + r, y0 + r, Math.PI);
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lengths[lengths.length - 1];
  return (u: number) => {
    const d = (((u % 1) + 1) % 1) * total;
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < d) i++;
    const t = (d - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1]), a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { p: [lerp(a[0], b[0], t), lerp(a[1], b[1], t)] as Pt, n: [(b[1] - a[1]) / len, -(b[0] - a[0]) / len] as Pt };
  };
}

/** A water-plant sprig: curved stem with paired leaves that shorten toward the tip. */
function sprig(points: Pt[], size: number, rng: Rng, allowed: ReturnType<typeof clearOfText>, id: string, key: string): ReactNode {
  const steps = Math.max(5, Math.round(curveLength(points) / (size * .42)));
  const leaves: ReactNode[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, { p, angle } = along(points, t), len = size * (1.05 - t * .55) * between(rng, .85, 1.1);
    for (const side of i === steps ? [0] : [-1, 1]) {
      const heading = angle + side * between(rng, 38, 55), rad = heading * Math.PI / 180;
      if (!allowed(p[0] + Math.cos(rad) * len, p[1] + Math.sin(rad) * len, len * .2)) continue;
      leaves.push(<g key={`${i}${side}`} transform={`translate(${xy(p)}) rotate(${n(heading)})`}>
        <path d={leafPath(len, len * .34)} fill={`url(#${id}-leaf)`} />
        <path d={leafHalf(len, len * .34)} fill="#d8f2a0" opacity=".18" />
        <path d={`M${n(len * .06)} 0L${n(len * .82)} 0`} stroke="#1f4a24" strokeOpacity=".45" strokeWidth={n(Math.max(.35, len * .03))} />
      </g>);
    }
  }
  return <g key={key}>
    <path d={taper(points, size * .09, size * .02)} fill="#3e7a3a" />
    {leaves}
  </g>;
}

/** Deep water under the koi: an organic pool whose edges dissolve into the page. */
function koiPondBack(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const s = Math.max(.45, W / 1000), m = Math.min(A.x, A.y) * .18;
  return <svg {...svgProps(g)}>
    <defs>
      <radialGradient id={`${id}-water`} cx=".5" cy=".42" r=".72">
        <stop stopColor="#123a46" /><stop offset=".55" stopColor="#0b2530" /><stop offset="1" stopColor="#061319" />
      </radialGradient>
      <filter id={`${id}-shore`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency={fmt(.012 / s)} numOctaves="3" seed="21" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={fmt(m * 1.6)} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation={fmt(m * .35)} />
      </filter>
      <filter id={`${id}-caustic`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="turbulence" baseFrequency={fmt(.018 / s)} numOctaves="2" seed="4" result="t" />
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 .55  0 0 0 0 .9  0 0 0 0 .85  0 0 0 -2.2 1.05" result="lines" />
        <feComposite in="lines" in2="SourceAlpha" operator="in" />
      </filter>
    </defs>
    <rect x={n(m)} y={n(m)} width={n(W - m * 2)} height={n(H - m * 2)} rx={n(Math.min(A.x, A.y) * .9)} fill={`url(#${id}-water)`} filter={`url(#${id}-shore)`} />
    <rect x={n(m * 2)} y={n(m * 2)} width={n(W - m * 4)} height={n(H - m * 4)} rx={n(Math.min(A.x, A.y) * .8)} fill="#000" opacity=".1" filter={`url(#${id}-caustic)`} />
  </svg>;
}

function koiPondFront(g: BranchingFrameGeometry): ReactNode {
  const { width: W, height: H, window: A, id } = g;
  const rng = seeded(7713);
  const s = Math.max(.45, W / 1000);
  const reach = W * KOI_POND.intrusion!;
  const inside = clearOfText(g, reach);
  const band = Math.min(A.x, A.y), radius = KOI_POND.windowRadius ?? 0;
  const colors = ["#1d6670", "#2a8a86", "#3aa894", "#58c3a0", "#2b6e9c", "#7dd0be", "#1a5361", "#4fb2b6"];

  // Water ribbons: wavy strands that run part-way round the window and end in curls.
  const strands = Array.from({ length: 18 }, (_, i) => {
    const amp = band * between(rng, .04, .13), offset = between(rng, Math.max(amp - reach * .6, band * .06), band * .78 - amp);
    const ring = roundedRing(A, offset, radius), waves = Math.round(between(rng, 4, 10)), phase = rng() * 6.283;
    const u0 = rng(), span = between(rng, .16, .48), count = Math.round(span * 64) + 3;
    const pts: Pt[] = Array.from({ length: count }, (_, j) => {
      const u = u0 + span * j / (count - 1), { p, n: nn } = ring(u), w = amp * Math.sin(waves * Math.PI * 2 * u + phase);
      return [p[0] + nn[0] * w, p[1] + nn[1] * w];
    });
    if (rng() < .55) {
      const end = pts[pts.length - 1], { n: nn } = ring(u0 + span), cr = band * between(rng, .06, .14), out = rng() < .5 ? 1 : -1;
      pts.push(...curl(end, [end[0] + nn[0] * cr * out, end[1] + nn[1] * cr * out], .95, rng() < .5 ? 1 : -1));
    }
    const w = Math.max(.9, s * between(rng, 1.3, 3.4));
    return { d: taper(pts, 0, 0, t => w * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.08))), .55) + s * .25), color: colors[i % colors.length], opacity: between(rng, .55, .95) };
  });
  // Small whorls at the corners and along the edges.
  const whorls = Array.from({ length: 9 }, (_, i) => {
    const ring = roundedRing(A, band * between(rng, .3, .7), radius), { p } = ring(i / 9 + between(rng, -.03, .03)), r = band * between(rng, .08, .16);
    const start: Pt = [p[0] + r, p[1]];
    return { d: taper([start, ...curl(start, p, 1.15, i % 2 ? 1 : -1)], s * 2.2, s * .4), color: colors[(i * 3) % colors.length] };
  });
  const bubbles = Array.from({ length: 46 }, (_, i) => {
    const ring = roundedRing(A, band * between(rng, .05, .9), radius), { p } = ring(rng()), r = Math.max(1.2, band * between(rng, .02, .065));
    return inside(p[0], p[1], r) ? <g key={i}>
      <circle cx={n(p[0])} cy={n(p[1])} r={n(r)} fill={`url(#${id}-bubble)`} stroke="#9fe3d8" strokeOpacity=".75" strokeWidth={n(Math.max(.4, s * .7))} />
      <path d={`M${n(p[0] - r * .55)} ${n(p[1] - r * .1)}A${n(r * .6)} ${n(r * .6)} 0 0 1 ${n(p[0] - r * .05)} ${n(p[1] - r * .58)}`} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth={n(Math.max(.4, r * .18))} strokeLinecap="round" />
    </g> : null;
  });
  const drops = Array.from({ length: 12 }, (_, i) => {
    const ring = roundedRing(A, band * between(rng, .1, .8), radius), { p } = ring(rng()), r = band * between(rng, .025, .045);
    return inside(p[0], p[1], r * 1.6) ? <path key={i} d={`M0 ${n(-r * 1.7)}C${n(r * .9)} ${n(-r * .4)} ${n(r)} ${n(r * .4)} 0 ${n(r)}C${n(-r)} ${n(r * .4)} ${n(-r * .9)} ${n(-r * .4)} 0 ${n(-r * 1.7)}Z`}
      transform={`translate(${xy(p)}) rotate(${n(between(rng, -60, 60))})`} fill={`url(#${id}-drop)`} /> : null;
  });
  const sprigs: Pt[][] = [
    [[A.x * .3, H - band * .2], [A.x * .55, A.y + A.height * .78], [A.x * .25, A.y + A.height * .55], [A.x * .5, A.y + A.height * .38]],
    [[A.x * .7, H - band * .12], [A.x + A.width * .06, A.y + A.height + band * .5], [A.x + A.width * .12, A.y + A.height + band * .28]],
    [[W - A.x * .35, H - band * .15], [W - A.x * .6, A.y + A.height * .72], [W - A.x * .3, A.y + A.height * .5], [W - A.x * .55, A.y + A.height * .3]],
    [[W - A.x * .3, band * .2], [A.x + A.width * .95, A.y * .35], [A.x + A.width * .84, A.y * .55], [A.x + A.width * .74, A.y * .42]],
    [[A.x + A.width * .42, H - band * .1], [A.x + A.width * .47, A.y + A.height + band * .45], [A.x + A.width * .44, A.y + A.height + band * .25]],
  ];
  const kelp = Array.from({ length: 6 }, (_, i) => {
    const base: Pt = i < 3 ? [A.x * between(rng, .2, .8), H] : [W - A.x * between(rng, .2, .8), H];
    const h = A.height * between(rng, .5, .9);
    const pts: Pt[] = [0, 1, 2, 3, 4].map(k => [base[0] + Math.sin(k * 1.4 + i) * band * .2, base[1] - h * k / 4]);
    return <path key={i} d={taper(pts, band * .12, band * .02)} fill="#1c4a3a" opacity=".55" />;
  });
  const fishL = W * .15;

  return <svg {...svgProps(g)}>
    <defs>
      <clipPath id={`${id}-edge`}><path clipRule="evenodd" d={edgeBandClip(g, reach)} /></clipPath>
      <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#2a6a35" /><stop offset=".6" stopColor="#5fa74a" /><stop offset="1" stopColor="#a6d873" /></linearGradient>
      <radialGradient id={`${id}-bubble`} cx=".4" cy=".35" r=".7"><stop stopColor="#bff3ea" stopOpacity="0" /><stop offset=".75" stopColor="#7fd6c8" stopOpacity=".08" /><stop offset="1" stopColor="#7fd6c8" stopOpacity=".35" /></radialGradient>
      <linearGradient id={`${id}-drop`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b8f0e6" stopOpacity=".9" /><stop offset="1" stopColor="#2a8a86" stopOpacity=".7" /></linearGradient>
      <filter id={`${id}-fishshadow`} x="-20%" y="-30%" width="140%" height="160%"><feDropShadow dx={fmt(s * 3)} dy={fmt(s * 6)} stdDeviation={fmt(s * 5)} floodColor="#000" floodOpacity=".45" /></filter>
      <filter id={`${id}-glow`} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation={fmt(s * 1.2)} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <WindowRecess window={A} id={`${id}-recess`} depth={band * .2} strength={.7} />
    <g clipPath={`url(#${id}-edge)`}>
      <g>{kelp}</g>
      <g filter={`url(#${id}-glow)`}>
        {strands.map((st, i) => <path key={i} d={st.d} fill={st.color} opacity={st.opacity} />)}
        {whorls.map((w, i) => <path key={i} d={w.d} fill={w.color} opacity=".85" />)}
      </g>
      {sprigs.map((pts, i) => sprig(pts, band * (i % 2 ? .28 : .34), rng, inside, id, `sp${i}`))}
      {drops}
      {koi(A.x + A.width * .2, A.y * .5, -4, fishL, -.22, KOI.gold, rng, id, "k1")}
      {koi(A.x + A.width + A.x * .5, A.y + A.height * .22, 100, fishL * .8, .3, KOI.ogon, rng, id, "k2")}
      {koi(A.x * .5, A.y + A.height * .6, 72, fishL * .82, -.3, KOI.kohaku, rng, id, "k3")}
      {koi(A.x + A.width * .72, A.y + A.height + (H - A.y - A.height) * .5, 186, fishL * .86, -.22, KOI.hi, rng, id, "k4", true)}
      {bubbles}
    </g>
  </svg>;
}

/* ---------------------------------------- */
/* Public frames and complete player themes */
/* ---------------------------------------- */

export const MOSS_STONE: BranchingFrame = {
  id: "moss-stone", insets: { top: .095, right: .085, bottom: .1, left: .085 }, intrusion: .028, windowRadius: 2,
  renderBack: mossStoneBack, renderFront: mossStoneFront,
};
export const MARBLE_COLONNADE: BranchingFrame = {
  id: "marble-colonnade", insets: { top: .13, right: .1, bottom: .06, left: .1 }, windowRadius: 1,
  renderBack: marbleColonnadeBack, renderFront: shadowFront(.18),
};
export const BLOSSOM_BRANCH: BranchingFrame = {
  id: "blossom-branch", insets: { top: .07, right: .07, bottom: .07, left: .07 }, intrusion: .035, windowRadius: 0,
  renderBack: blossomBranchBack, renderFront: blossomBranchFront,
};
export const STONE_PORTICO: BranchingFrame = {
  id: "stone-portico", insets: { top: .21, right: .11, bottom: .075, left: .11 }, windowRadius: 1,
  renderBack: stonePorticoBack, renderFront: shadowFront(.16, 1.1),
};
export const LEAF_CANOPY: BranchingFrame = {
  id: "leaf-canopy", insets: { top: .085, right: .085, bottom: .085, left: .085 }, intrusion: .04, windowRadius: 14,
  renderBack: leafCanopyBack, renderFront: leafCanopyFront,
};
export const WALNUT_LINTEL: BranchingFrame = {
  id: "walnut-lintel", insets: { top: .15, right: .085, bottom: .065, left: .085 }, windowRadius: 0,
  renderBack: walnutLintelBack, renderFront: shadowFront(.12, .9),
};
export const FOREST_GROVE: BranchingFrame = {
  id: "forest-grove", insets: { top: .11, right: .11, bottom: .11, left: .11 }, intrusion: .03, windowRadius: 3,
  renderBack: forestGroveBack, renderFront: forestGroveFront,
};
export const THEATER_PROSCENIUM: BranchingFrame = {
  id: "theater-proscenium", insets: { top: .115, right: .085, bottom: .085, left: .085 }, windowRadius: 1,
  renderBack: theaterProsceniumBack, renderFront: theaterProsceniumFront,
};
export const ADVENTURE_MAP: BranchingFrame = {
  id: "adventure-map", insets: { top: .095, right: .1, bottom: .115, left: .1 }, intrusion: .022, windowRadius: 2,
  renderBack: adventureMapBack, renderFront: adventureMapFront,
};
export const KOI_POND: BranchingFrame = {
  id: "koi-pond", insets: { top: .13, right: .14, bottom: .13, left: .14 }, intrusion: .028, windowRadius: 18,
  renderBack: koiPondBack, renderFront: koiPondFront,
};

export type BranchingFrameThemeId = "moss-stone" | "marble-colonnade" | "blossom-branch" | "stone-portico" | "leaf-canopy" | "walnut-lintel" | "forest-grove" | "theater-proscenium" | "adventure-map" | "koi-pond";

/** Player themes pairing each frame with a matching wall, ink and accent. */
export const BRANCHING_FRAME_THEMES: Record<BranchingFrameThemeId, BranchingTheme> = {
  "moss-stone": { id: "moss-stone", frame: MOSS_STONE,
    colors: { accent: "#bfd77e", background: "#17211b", foreground: "#eef3e2", border: "#5b6f4c", glow: "#9fc46a" } },
  "marble-colonnade": { id: "marble-colonnade", frame: MARBLE_COLONNADE,
    colors: { accent: "#e6cb92", background: "#222733", foreground: "#f4f1ea", border: "#8f8b83", glow: "#f2dfb4" } },
  "blossom-branch": { id: "blossom-branch", frame: BLOSSOM_BRANCH,
    colors: { accent: "#a8325f", background: "#f6e4ec", foreground: "#3b1d2b", border: "#e1b1c5", glow: "#f2a8c6" } },
  "stone-portico": { id: "stone-portico", frame: STONE_PORTICO,
    colors: { accent: "#cfd8a8", background: "#1b2321", foreground: "#e9ece3", border: "#6f7a70", glow: "#b7c48d" } },
  "leaf-canopy": { id: "leaf-canopy", frame: LEAF_CANOPY,
    colors: { accent: "#3f7a17", background: "#e9f1d6", foreground: "#20331a", border: "#a9c27f", glow: "#9bcc3c" } },
  "walnut-lintel": { id: "walnut-lintel", frame: WALNUT_LINTEL,
    colors: { accent: "#87461d", background: "#eee6d8", foreground: "#2d1d13", border: "#c9b39a", glow: "#d39a62" } },
  "forest-grove": { id: "forest-grove", frame: FOREST_GROVE,
    colors: { accent: "#c3dd8c", background: "#142016", foreground: "#eef5e3", border: "#4e6a3a", glow: "#d4ef8e" } },
  "theater-proscenium": { id: "theater-proscenium", frame: THEATER_PROSCENIUM,
    colors: { accent: "#f2d184", background: "#240b10", foreground: "#fff3e0", border: "#8a2a36", glow: "#ffdc8e" } },
  "adventure-map": { id: "adventure-map", frame: ADVENTURE_MAP,
    colors: { accent: "#e2c18a", background: "#2a1f16", foreground: "#f6ead2", border: "#8a6a44", glow: "#f3d394" } },
  "koi-pond": { id: "koi-pond", frame: KOI_POND,
    colors: { accent: "#7fd3c0", background: "#0b1a22", foreground: "#e8f6f2", border: "#2f6f74", glow: "#9fe8d6" } },
};
