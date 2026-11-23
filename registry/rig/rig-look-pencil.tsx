/**
 * RIG1 coloured-pencil look: any rigged figure drawn in coloured pencil on toothy paper.
 *
 * Built on the coloured-pencil engine, not a parallel one:
 *   - each rig role maps to a CP-F1 surface (`PENCIL_MATERIALS`), and `createPencilMaterialRegion` supplies that
 *     surface's three pigment passes (mark texture, angle, density);
 *   - the marks themselves come from `hatchPencilRegion`, the CP1 mark generator (broken hatch, fibres or stipple
 *     taps with seeded pressure);
 *   - paper tooth is `pencilGrainTile`, the craft grain that knocks small paper-white voids out of the pigment.
 *
 * Every pass is a mask in the part's own coordinates, so marks and tooth are fixed to the part and never swim as it
 * moves. Marks are drawn once into shared tiles (one set per boil variant); a figure only switches which variant it
 * uses on the look's boil step. Light comes from the upper left of the page: each part gets a value gradient
 * (paper reserved on the lit side, the shadow colour hatched on the far side) that turns with the part.
 */
import { useMemo } from "react";
import type { ReactNode } from "react";
import { hatchPencilRegion, pencilHash } from "../video/colored-pencil";
import type { PencilPigmentLayer } from "../video/colored-pencil";
import { pencilGrainTile } from "../video/colored-pencil-craft";
import { createPencilMaterialRegion } from "../video/colored-pencil-materials";
import type { PencilSurface } from "../video/colored-pencil-materials";
import type { RigPartFrame } from "./rig-evaluate";
import type { RigRole } from "./rig-spec";

/** Warm drawing paper. */
export const PENCIL_PAPER = "#f6f0e1";
type Texture = "hatch" | "fiber" | "stipple";
const TEXTURES: readonly Texture[] = ["hatch", "fiber", "stipple"];
/** Boil variants: a held drawing is redrawn with one of these mark sets. */
const VARIANTS = 3;
/** Tile edge in paper units, and how much larger than the engine's default the marks are drawn on a rig board. */
const TILE = 180, MARK_SCALE = 1.35;
/** Mask area in a part's local units: generous, since parts are placed and scaled anywhere. */
const BIG = 6000;
/** World direction toward the shadow side: light from the upper left of the page. */
const SHADOW: readonly [number, number] = [.42, .91];

// ---- Roles to pencil surfaces -----------------------------------------------------------------------------------------------------

type Kind = "solid" | "translucent" | "glow" | "dark";
/** Which CP-F1 surface draws a rig role, and how it sits on the paper. */
export const PENCIL_ROLE_SURFACE: Readonly<Record<RigRole, { surface: PencilSurface; kind: Kind }>> = {
  skin: { surface: "skin", kind: "solid" }, hair: { surface: "hair", kind: "solid" },
  cloth: { surface: "fabric", kind: "solid" }, "cloth-dark": { surface: "fabric", kind: "solid" },
  shoe: { surface: "keratin", kind: "solid" }, accent: { surface: "fabric", kind: "solid" },
  eye: { surface: "ocular", kind: "dark" }, mouth: { surface: "ocular", kind: "dark" }, detail: { surface: "ocular", kind: "dark" },
  fur: { surface: "fur", kind: "solid" }, "fur-dark": { surface: "fur", kind: "solid" }, belly: { surface: "fur", kind: "solid" },
  feather: { surface: "hair", kind: "solid" },
  scale: { surface: "keratin", kind: "solid" }, "scale-dark": { surface: "keratin", kind: "solid" },
  horn: { surface: "keratin", kind: "solid" }, beak: { surface: "keratin", kind: "solid" },
  membrane: { surface: "leaf", kind: "solid" }, fin: { surface: "leaf", kind: "solid" },
  metal: { surface: "metal", kind: "solid" }, "metal-dark": { surface: "metal", kind: "solid" }, brass: { surface: "metal", kind: "solid" },
  paint: { surface: "metal", kind: "solid" }, "paint-dark": { surface: "metal", kind: "solid" },
  wood: { surface: "wood", kind: "solid" }, rubber: { surface: "stone", kind: "solid" }, face: { surface: "stone", kind: "solid" },
  sail: { surface: "fabric", kind: "solid" }, rope: { surface: "fabric", kind: "solid" },
  glass: { surface: "glass", kind: "translucent" }, smoke: { surface: "cast-shadow", kind: "translucent" },
  light: { surface: "glaze", kind: "glow" },
};

interface SurfacePasses { textures: readonly [Texture, Texture, Texture]; angles: readonly [number, number, number]; weight: number }
const passCache = new Map<PencilSurface, SurfacePasses>();
/** The surface's three pigment passes, read from the canonical material recipe. */
function surfacePasses(surface: PencilSurface): SurfacePasses {
  let s = passCache.get(surface);
  if (!s) {
    const region = createPencilMaterialRegion({ surface, id: "rig-" + surface, path: "M0 0H40V40H0Z", bounds: [0, 0, 40, 40],
      palette: ["#808080", "#5a5a5a", "#b0b0b0"], seed: 1 });
    const [a, b, c] = region.layers;
    // Spacing tells the recipe's density: dense 3.2, layered 3.9, soft 4.9 between first-pass marks.
    const weight = a.spacing <= 3.3 ? 1.15 : a.spacing <= 4 ? 1 : .72;
    s = { textures: [a.texture ?? "hatch", b.texture ?? "hatch", c.texture ?? "hatch"], angles: [a.angle, b.angle, c.angle], weight };
    passCache.set(surface, s);
  }
  return s;
}

// ---- Shared mark tiles ----------------------------------------------------------------------------------------------------------

interface Tile { key: string; marks: { d: string; w: number; o: number }[] }
const tileCache = new Map<number, Tile[]>();
/**
 * One square tile of CP1 marks per (texture, pass, variant). The hatch generator lays rows across its region with a
 * 60% overscan for rotation; the region is sized so that span equals the tile, so rows cover it edge to edge.
 */
function markTiles(seed: number): Tile[] {
  let tiles = tileCache.get(seed);
  if (tiles) return tiles;
  // The layered recipe's three passes (spacing, pressure, tip) are the reference; the texture varies per tile.
  const base = createPencilMaterialRegion({ surface: "wood", id: "rig-tile", path: "M0 0H40V40H0Z", bounds: [0, 0, 40, 40],
    palette: ["#000000", "#000000", "#000000"], seed: 1 }).layers;
  const side = TILE / (Math.SQRT2 * 1.6), o = (TILE - side) / 2;
  tiles = [];
  for (const [t, texture] of TEXTURES.entries()) for (let pass = 0; pass < 3; pass++) for (let v = 0; v < VARIANTS; v++) {
    const layer: PencilPigmentLayer = { ...base[pass], angle: 0, flow: 0, tone: "even", texture,
      seed: (seed * 131 + t * 977 + pass * 389 + v * 7919) % 2147483647, startFrame: 0, durationFrames: 30 };
    // Rows keep their own pressure, but are merged into a few compound paths (by width and opacity band) so a tile
    // draws as six paths instead of hundreds: masks repaint their tile for every part on every frame.
    const bands = new Map<string, { d: string[]; w: number; o: number }>();
    for (const m of hatchPencilRegion({ bounds: [o, o, side, side] }, layer)) {
      const w = Math.round(m.width * 2.5) / 2.5, op = Math.min(1, Math.round(m.opacity * 1.55 * 3) / 3), k = w + "/" + op;
      const band = bands.get(k) ?? { d: [], w, o: op };
      band.d.push(m.path);
      bands.set(k, band);
    }
    tiles.push({ key: `${texture}${pass}-${v}`, marks: [...bands.values()].filter(b => b.o > 0).map(b => ({ d: b.d.join(""), w: b.w, o: b.o })) });
  }
  tileCache.set(seed, tiles);
  return tiles;
}

/** Patterns and masks for the look: paper tooth and every mark tile (texture × pass × boil variant). */
export function PencilLookDefs({ uid, seed }: { uid: string; seed: number }) {
  const tiles = useMemo(() => markTiles(seed % 9973), [seed]);
  const grain = useMemo(() => pencilGrainTile(seed % 2147483647, 750), [seed]);
  // Mask content may be huge (it is clipped), but the mask region must stay near the masked part: a region in user
  // units makes the browser composite a viewport-sized layer for every part and is several times slower.
  const area = { x: -BIG, y: -BIG, width: 2 * BIG, height: 2 * BIG };
  const region = { x: "-25%", y: "-25%", width: "150%", height: "150%" };
  return <>
    <pattern id={`${uid}-pc-grain`} patternUnits="userSpaceOnUse" width={64} height={64}>
      {grain.map((g, i) => <circle key={i} cx={r2(g.x)} cy={r2(g.y)} r={r2(g.r)} fill="#000" opacity={r2(g.value)} />)}
    </pattern>
    {/* Paper tooth: small voids where the pencil skips over the valleys of the paper. */}
    <mask id={`${uid}-pc-tooth`} {...region}>
      <rect {...area} fill="#fff" />
      <rect {...area} fill={`url(#${uid}-pc-grain)`} opacity={.62} />
    </mask>
    {tiles.map(t => <pattern key={t.key} id={`${uid}-pct-${t.key}`} patternUnits="userSpaceOnUse" width={TILE} height={TILE}
      patternTransform={`scale(${MARK_SCALE})`}>
      {t.marks.map((m, i) => <path key={i} d={m.d} fill="none" stroke="#fff" strokeWidth={r2(m.w)} strokeLinecap="round" opacity={r2(m.o)} />)}
    </pattern>)}
    {tiles.map(t => <mask key={t.key} id={`${uid}-pcm-${t.key}`} {...region}>
      <rect {...area} fill={`url(#${uid}-pct-${t.key})`} />
    </mask>)}
  </>;
}

// ---- Paper -------------------------------------------------------------------------------------------------------------------------

/** The sheet: warm paper, a few long fibres and fine pores, fixed to the frame like the paper under a camera. */
export function PencilPaper({ uid, width, height, seed }: { uid: string; width: number; height: number; seed: number }) {
  const pores = useMemo(() => Array.from({ length: 900 }, (_, i) => ({
    // Consecutive indices, not nearby salts: nearby salts on one index are correlated and line the pores up.
    x: pencilHash(seed, 4 * i, 11) * 512, y: pencilHash(seed, 4 * i + 1, 11) * 512, r: .3 + pencilHash(seed, 4 * i + 2, 11) * 1.1, o: .05 + pencilHash(seed, 4 * i + 3, 11) * .1,
  })), [seed]);
  const fibres = useMemo(() => Array.from({ length: 140 }, (_, i) => {
    const x = pencilHash(seed, 4 * i, 21) * 512, y = pencilHash(seed, 4 * i + 1, 21) * 512, len = 4 + pencilHash(seed, 4 * i + 2, 21) * 22, a = (pencilHash(seed, 4 * i + 3, 21) - .5) * 1.2;
    return `M${r2(x)} ${r2(y)}l${r2(Math.cos(a) * len)} ${r2(Math.sin(a) * len)}`;
  }).join(""), [seed]);
  return <>
    <defs>
      <pattern id={`${uid}-pc-paper`} patternUnits="userSpaceOnUse" width={512} height={512}>
        {pores.map((p, i) => <circle key={i} cx={r2(p.x)} cy={r2(p.y)} r={r2(p.r)} fill="#8a7a64" opacity={r2(p.o)} />)}
        <path d={fibres} stroke="#9a8768" strokeWidth={.5} opacity={.22} fill="none" />
      </pattern>
    </defs>
    <rect width={width} height={height} fill={PENCIL_PAPER} />
    <rect width={width} height={height} fill={`url(#${uid}-pc-paper)`} />
  </>;
}

// ---- Parts ---------------------------------------------------------------------------------------------------------------------------

export interface PencilPartContext { uid: string; step: number; reduced: boolean }
export interface PencilPartProps {
  p: RigPartFrame;
  /** The part outline in its own coordinates. */
  d: string;
  color: string;
  /** Stable per figure and part. */
  seed: number;
  ctx: PencilPartContext;
}

/** One rig part in coloured pencil: paper support, value underlayer, three surface passes, a broken pencil contour. */
export function PencilPart({ p, d, color, seed, ctx }: PencilPartProps) {
  const { surface, kind } = PENCIL_ROLE_SURFACE[p.role] ?? PENCIL_ROLE_SURFACE.accent;
  const v = ctx.reduced ? 0 : ((ctx.step % VARIANTS) + seed) % VARIANTS;
  const c = p.far ? mix(c0(color), -.2) : c0(color);
  const dark = mix(c, -.45), light = mix(c, .5);
  const tooth = `url(#${ctx.uid}-pc-tooth)`;
  if (p.line) return <g mask={tooth}>
    <path d={d} fill="none" stroke={mix(c, -.22)} strokeWidth={r2((p.lineWidth ?? 1) * 1.15)} strokeLinecap="round" strokeLinejoin="round" opacity={.92} />
  </g>;
  if (kind === "dark") return <g mask={tooth}><path d={d} fill={c} opacity={.94} /></g>;
  const passes = surfacePasses(surface);
  const id = `${ctx.uid}-pcg-${seed}-${p.id.replace(/[^A-Za-z0-9_-]/g, "")}`;
  // Light direction in the part's own coordinates, so the value turns with the part instead of being painted on it.
  const [sx, sy] = localDirection(p.matrix);
  const grad = (suffix: string, stops: readonly (readonly [number, string, number])[]) =>
    <linearGradient id={id + suffix} x1={r3(.5 - sx * .5)} y1={r3(.5 - sy * .5)} x2={r3(.5 + sx * .5)} y2={r3(.5 + sy * .5)}>
      {stops.map(([o, col, a], i) => <stop key={i} offset={o} stopColor={col} stopOpacity={a} />)}
    </linearGradient>;
  // Per-part offset so neighbouring parts never share hatch rows.
  const ox = r2(pencilHash(seed, 1, 91) * TILE), oy = r2(pencilHash(seed, 2, 91) * TILE);
  const hatch = (pass: 0 | 1 | 2, fill: string, opacity: number) => <Hatch key={pass} uid={ctx.uid} d={d} texture={passes.textures[pass]} pass={pass}
    variant={v} angle={passes.angles[pass]} ox={ox} oy={oy} fill={fill} opacity={r3(opacity * passes.weight * (p.far ? .85 : 1))} />;
  if (kind === "translucent") return <>
    {/* Glass keeps most of its paper, so the paint of the body behind it does not show through. */}
    {p.role === "glass" && <path d={d} fill={PENCIL_PAPER} opacity={.82} />}
    <g mask={tooth}>
    <defs>{grad("u", [[0, light, .12], [1, c, .32]])}</defs>
    <path d={d} fill={`url(#${id}u)`} />
    {hatch(0, c, .55)}
    {/* Smoke is soft: no drawn edge. Glass keeps a light one. */}
    {p.role !== "smoke" && <Contour d={d} color={dark} seed={seed} variant={v} strength={.45} />}
    </g>
  </>;
  if (kind === "glow") return <>
    <path d={d} fill={PENCIL_PAPER} />
    <g mask={tooth}><path d={d} fill={c} opacity={.82} />{hatch(0, mix(c, -.12), .6)}<Contour d={d} color={mix(c, -.35)} seed={seed} variant={v} strength={.5} /></g>
  </>;
  return <>
    {/* Opaque paper support: a nearer part hides what is behind it, as on a real drawing. */}
    <path d={d} fill={PENCIL_PAPER} />
    <g mask={tooth}>
      <defs>
        {grad("u", [[0, light, .45], [.5, c, .55], [1, mix(c, -.2), .8]])}
        {grad("s", [[0, dark, 0], [.35, dark, .2], [1, dark, 1]])}
        {grad("h", [[0, light, .7], [.45, light, .18], [1, light, 0]])}
      </defs>
      {/* Light first pass: the value map, paper kept on the lit side. */}
      <path d={d} fill={`url(#${id}u)`} />
      {hatch(0, c, .9)}
      {hatch(1, `url(#${id}s)`, 1)}
      {hatch(2, `url(#${id}h)`, .75)}
      {/* Kept light: a rig is many overlapping parts, and a firm line round each one reads as a patchwork. */}
      <Contour d={d} color={dark} seed={seed} variant={v} strength={.7} />
    </g>
  </>;
}

/** One pass of marks: the part filled in its colour, seen through a rotated tile of pencil marks. */
function Hatch({ uid, d, texture, pass, variant, angle, ox, oy, fill, opacity }: {
  uid: string; d: string; texture: Texture; pass: number; variant: number; angle: number; ox: number; oy: number; fill: string; opacity: number;
}) {
  const a = r2(angle);
  // The mask lives in this group's space (rotated, offset); the path undoes the rotation so it stays in part space.
  return <g transform={`rotate(${a}) translate(${ox} ${oy})`} mask={`url(#${uid}-pcm-${texture}${pass}-${variant})`}>
    <path d={d} transform={`translate(${-ox} ${-oy}) rotate(${-a})`} fill={fill} opacity={opacity} />
  </g>;
}

/** A pencil outline: a firm pass broken where the point lifts, and a lighter searching pass beside it. */
function Contour({ d, color, seed, variant, strength }: { d: string; color: string; seed: number; variant: number; strength: number }) {
  const h = (i: number) => pencilHash(seed + variant * 7717, i, 47);
  const dash = [24 + h(1) * 46, .8 + h(2) * 2.2, 14 + h(3) * 30, .6 + h(4) * 1.6].map(r2).join(" ");
  const jx = r2((h(5) - .5) * .9), jy = r2((h(6) - .5) * .9);
  return <>
    <path d={d} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash}
      strokeDashoffset={r2(h(7) * 60)} opacity={r2(.72 * strength)} />
    <path d={d} fill="none" stroke={color} strokeWidth={.7} strokeLinejoin="round" opacity={r2(.3 * strength)} transform={`translate(${jx} ${jy})`} />
  </>;
}

// ---- Ground ----------------------------------------------------------------------------------------------------------------------

/** One world-anchored tile of ground in pencil: a drawn horizon line, hatched earth that fades down, tufts and pebbles. */
export function PencilGroundTile({ uid, x0, x1, ground, depth, seed }: { uid: string; x0: number; x1: number; ground: number; depth: number; seed: number }) {
  const w = x1 - x0, h = (i: number, salt: number) => pencilHash(seed, i, salt);
  const line = `M${x0} ${r2(ground + 1)}C${r2(x0 + w * .3)} ${r2(ground - 2 + h(1, 3) * 3)} ${r2(x0 + w * .62)} ${r2(ground + 3 - h(2, 3) * 3)} ${x1} ${r2(ground + 1)}`;
  const band = Math.min(depth, 150), gid = `${uid}-pcgr-${seed}`;
  const marks: ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const x = x0 + (i + h(i, 5)) * w / 6, y = ground + 8 + h(i, 6) * Math.min(70, band * .5), s = .8 + h(i, 7) * .7;
    if (h(i, 8) > .4) marks.push(<path key={i} d={`M${r2(x - 7 * s)} ${r2(y)}q${r2(1 * s)} ${r2(-8 * s)} ${r2(4 * s)} ${r2(-13 * s)}M${r2(x)} ${r2(y)}q${r2(.5 * s)} ${r2(-9 * s)} ${r2(2 * s)} ${r2(-16 * s)}M${r2(x + 6 * s)} ${r2(y)}q${r2(1 * s)} ${r2(-6 * s)} ${r2(4 * s)} ${r2(-11 * s)}`}
      fill="none" stroke="#5f7449" strokeWidth={1.3} strokeLinecap="round" opacity={.8} />);
    else marks.push(<g key={i}>
      <path d={`M${r2(x - 6 * s)} ${r2(y)}q${r2(6 * s)} ${r2(-7 * s)} ${r2(12 * s)} 0z`} fill="#b9ab90" opacity={.7} />
      <path d={`M${r2(x - 6 * s)} ${r2(y)}q${r2(6 * s)} ${r2(-7 * s)} ${r2(12 * s)} 0`} fill="none" stroke="#6c5e48" strokeWidth={1} opacity={.8} />
    </g>);
  }
  return <g data-km-pencil-ground="" mask={`url(#${uid}-pc-tooth)`}>
    <defs><linearGradient id={gid} x1={0} y1={0} x2={0} y2={1}>
      <stop offset={0} stopColor="#8d8a5c" stopOpacity={.75} /><stop offset={.5} stopColor="#a49c72" stopOpacity={.35} /><stop offset={1} stopColor="#a49c72" stopOpacity={0} />
    </linearGradient></defs>
    {/* Hatched earth in world space: it scrolls with the ground under a tracking camera. */}
    <g transform="rotate(-6)" mask={`url(#${uid}-pcm-hatch0-0)`}>
      <rect x={x0 - 1} y={ground} width={w + 2} height={band} fill={`url(#${gid})`} transform="rotate(6)" />
    </g>
    <path d={line} fill="none" stroke="#5d5444" strokeWidth={1.6} strokeLinecap="round" opacity={.85} />
    <path d={line} fill="none" stroke="#5d5444" strokeWidth={.8} opacity={.35} transform="translate(0 1.6)" />
    {marks}
  </g>;
}

// ---- Helpers ---------------------------------------------------------------------------------------------------------------------

function localDirection(m: { a: number; b: number; c: number; d: number }): [number, number] {
  const det = m.a * m.d - m.b * m.c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return [SHADOW[0], SHADOW[1]];
  const x = (m.d * SHADOW[0] - m.c * SHADOW[1]) / det, y = (-m.b * SHADOW[0] + m.a * SHADOW[1]) / det, l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}
const c0 = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#888888";
/** Mix toward paper white (k > 0) or graphite (k < 0). */
function mix(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const target = k >= 0 ? [250, 246, 236] : [38, 34, 32], a = Math.min(1, Math.abs(k));
  return "#" + rgb.map((v, i) => Math.round(v + (target[i] - v) * a).toString(16).padStart(2, "0")).join("");
}
const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
