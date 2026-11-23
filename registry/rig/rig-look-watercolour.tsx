/**
 * RIG1 watercolour look: any rigged subject painted as transparent watercolour on cold-press paper.
 *
 * Built on the style's own engines, not a parallel one:
 *   - paper and every wash use the shared watercolour material from `watercolour-brush-react`
 *     (`WatercolourPaper`, `WatercolourWashFilter`: wandering dried contour, darker dried edge, shadow glaze,
 *     granulation, mottling);
 *   - the sky is a dried WM4 wet-in-wet graded wash (`WatercolourWetPaper`, laid as horizontal brush passes);
 *   - the ground is laid with WM1 pressure brush ribbons (`buildBrushRibbon`).
 *
 * How a figure is painted, as a watercolourist would:
 *   1. one wash per figure, parts in paint order so nearer parts cover farther ones (no x-ray overlaps); a darker
 *      dried edge where one colour region meets another and none inside a region, so a leg and a body of the same
 *      coat read as one wash; far-side parts sit in a cooler, darker wash;
 *   2. a cool shadow glaze on the side of the figure away from the light and a sliver of reserved paper on the lit
 *      edge, then granulation and mottling; the whole wash multiplies onto the paper, so the tooth shows through;
 *   3. a light, broken pencil underdrawing of the visible edges only;
 *   4. crisp dark brush details (eyes, mouths, lines) and soft wet-in-wet smoke.
 * Pigment texture is anchored to the figure's root, the paper and sky to the sheet, the ground to the world: nothing
 * swims and nothing boils. Light comes from the upper left of the scene, so shading stays put as parts rotate.
 */
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import type { AffineMatrix } from "../motion/types";
import type { RigFrame, RigPartFrame } from "./rig-evaluate";
import { matrixAttr, shapePath } from "./rig-evaluate";
import type { RigRole, RigShape, RigSpec } from "./rig-spec";
import { flattenPath } from "../video/collage/collage-geometry";
import { buildBrushRibbon } from "../video/watercolour-brush";
import type { PaintStroke } from "../video/watercolour-brush";
import { WatercolourPaper, WatercolourWashFilter } from "../video/watercolour-brush-react";
import { WatercolourWetPaper } from "../video/watercolour-wet-paper-react";
import type { WetPaperSpec } from "../video/watercolour-wet-paper";

/** Sheet colour of the watercolour look (warm cotton cold-press). */
export const WATERCOLOUR_PAPER = "#f6f1e6";
const GRAPHITE = "#57524c";
/** Ultramarine–violet: the shadow glaze and the cool cast of far-side parts. */
const SHADOW = "#56508a";
const DETAIL = "#2c2930";
/** Toward the light, in scene space (upper left, mostly above). */
const LIGHT: readonly [number, number] = [-.45, -.89];

// ---- Colour ----------------------------------------------------------------------------------------------------------

const rgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (c: readonly number[]) => "#" + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => { const p = rgb(a), q = rgb(b); return hex(p.map((v, i) => v + (q[i] - v) * t)); };
const lum = (c: string) => { const [r, g, b] = rgb(c); return (.299 * r + .587 * g + .114 * b) / 255; };
const FALLBACK: Partial<Record<RigRole, string>> = { smoke: "#e9e4d8", light: "#f2d98a", detail: "#1d1b19", eye: "#1d1b19", mouth: "#3b1714" };
const partColor = (spec: RigSpec, p: RigPartFrame) => p.color ?? spec.palette[p.role] ?? FALLBACK[p.role] ?? "#888888";

/**
 * A part's colour as transparent watercolour: lifted toward the paper (watercolour is laid thin; light colours less,
 * so whites stay whites), and the darker pooled pigment of its dried edge. Far-side parts take a cool shadow cast.
 */
export function watercolourWash(color: string, far = false): { base: string; rim: string } {
  let base = mix(color, "#ffffff", .1 + .16 * lum(color));
  if (far) base = mix(base, SHADOW, .32);
  return { base, rim: mix(base, "#000000", .3) };
}

// ---- Geometry --------------------------------------------------------------------------------------------------------

const r2 = (v: number) => Math.round(v * 100) / 100;
const pathCache = new WeakMap<object, string>();
const pathOf = (shape: RigShape) => { let d = pathCache.get(shape); if (!d) { d = shapePath(shape); pathCache.set(shape, d); } return d; };
type Box = { x: number; y: number; w: number; h: number };
const boxCache = new WeakMap<object, Box>();
function boxOf(shape: RigShape): Box {
  let b = boxCache.get(shape);
  if (!b) {
    const pts = flattenPath(pathOf(shape), 4).flatMap(s => s.points);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    b = pts.length ? { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } : { x: 0, y: 0, w: 0, h: 0 };
    boxCache.set(shape, b);
  }
  return b;
}
/** Scene-space bounding box of a part. */
function sceneBox(m: AffineMatrix, b: Box): Box {
  const xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}
const touches = (a: Box, b: Box) => a.x <= b.x + b.w + 1 && b.x <= a.x + a.w + 1 && a.y <= b.y + b.h + 1 && b.y <= a.y + a.h + 1;
const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");

// ---- Definitions -----------------------------------------------------------------------------------------------------

/** Scene-wide filters of the watercolour look; `uid` is the scene's id prefix. Each figure adds its own wash filter. */
export function WatercolourRigDefs({ uid, seed }: { uid: string; seed: number }) {
  return <>
    <WatercolourWashFilter id={`${uid}-wc-ground`} seed={seed + 7} tooth={.85} granulation={.8} driedEdge={.7} rim={1.6} mottle={.4} />
    {/* Pencil: a fine wobble, then gaps where the pencil skipped over the tooth. */}
    <filter id={`${uid}-wc-pencil`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={1} seed={(seed % 97) + 3} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" result="wobble" />
      <feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves={1} seed={(seed % 97) + 13} result="lift" />
      <feColorMatrix in="lift" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 3.2 0 0 0 -1.05" result="contact" />
      <feComposite in="wobble" in2="contact" operator="in" />
    </filter>
    {/* Dark brush details: a slight wobble only, so eyes stay eyes. */}
    <filter id={`${uid}-wc-detail`} x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves={1} seed={(seed % 97) + 21} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={1.1} xChannelSelector="R" yChannelSelector="G" />
    </filter>
    {/* Smoke and steam: wet-in-wet, no hard edge. */}
    <filter id={`${uid}-wc-soft`} x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves={2} seed={(seed % 97) + 31} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={9} xChannelSelector="R" yChannelSelector="G" result="d" />
      <feGaussianBlur in="d" stdDeviation={3.2} />
    </filter>
  </>;
}

// ---- Backdrop: paper and a dried graded sky -------------------------------------------------------------------------

/**
 * A graded sky as a painter lays it: horizontal passes from the top, each carrying less pigment, the last ones warm,
 * all into the same wet field (WM4), then dried. Pigment mass is conserved by WM4, so the passes are what make it dark.
 */
export function watercolourSkySpec(width: number, height: number, seed: number): WetPaperSpec {
  const cellSize = Math.max(16, Math.min(64, Math.ceil(Math.sqrt(width * height / 1400))));
  const passes = [
    ["#5f86b6", 1], ["#6c91bd", .95], ["#7d9ec6", .85], ["#91aed0", .7], ["#a9bfd6", .5], ["#d9c6a8", .38], ["#e8cfa6", .3],
  ] as const;
  return {
    version: 1, width, height, seed, paper: { color: WATERCOLOUR_PAPER, tooth: .7 }, cellSize, flow: .9, granulation: .55, edgePooling: .5, dryFrames: 120,
    drops: passes.map(([pigment, load], i) => {
      const y = height * (.025 + i * .07), wave = (j: number) => Math.sin(j * 1.9 + i * 2.3 + seed) * height * .012;
      return { id: `sky-${i}`, x: width / 2, y, radius: Math.max(4, Math.min(600, height * .065)), pigment, load, water: .95, startFrame: i * 3,
        path: [0, 1, 2, 3, 4].map(j => ({ x: Math.min(width, Math.max(0, width * (j / 4))), y: Math.min(height, Math.max(0, y + wave(j))), pressure: .55 + .4 * ((i + j) % 3) / 2 })) };
    }),
  };
}
/** The watercolour sheet: cold-press paper with a dried graded sky. Static: it never changes with the frame. */
export function WatercolourRigBackdrop({ uid, width, height, seed }: { uid: string; width: number; height: number; seed: number }) {
  return useMemo(() => <g data-km-rig-watercolour-sheet="">
    <WatercolourPaper id={`${uid}-wc-paper`} width={width} height={height} color={WATERCOLOUR_PAPER} tooth={.75} seed={seed} />
    <WatercolourWetPaper spec={watercolourSkySpec(width, height, seed)} frame={0} reducedMotion transparentPaper aria-hidden="true" />
  </g>, [uid, width, height, seed]);
}

// ---- Ground: WM1 brush ribbons laid along the ground line, anchored to the world -------------------------------------

const tileRand = (seed: number, k: number, i: number) => { let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 7919, 0xc2b2ae35) ^ Math.imul(i + 31, 0x27d4eb2d); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
function stroke(id: string, color: string, width: number, points: { x: number; y: number; pressure: number }[]): PaintStroke {
  return { id, color, tone: 3, width, water: .6, load: .8, dryBrush: .2, startFrame: 0, drawFrames: 1, spreadFrames: 0, dryFrames: 0, points };
}
/** Ground bands, darkest at the contact line and fading back, as loose horizontal strokes (drawn per tile, world-fixed). */
const GROUND_BANDS: readonly [color: string, dy: number, width: number, opacity: number][] = [
  ["#646d48", 2, 8, .45], ["#8f9a63", 10, 30, .45], ["#b49c6b", 28, 34, .32], ["#869672", 52, 38, .24], ["#a49f7e", 84, 40, .16],
];
/** One world tile of ground: loose earth strokes and a few brushed tufts. */
export function WatercolourGroundTile({ uid, k, ground, tile, seed }: { uid: string; k: number; ground: number; tile: number; seed: number }) {
  const marks = useMemo(() => {
    const x0 = k * tile, out: { d: string; color: string; opacity: number }[] = [], R = (i: number) => tileRand(seed, k, i);
    GROUND_BANDS.forEach(([color, dy, width, opacity], b) => {
      const from = x0 - 40 - 90 * R(b + 400), to = x0 + tile + 40 + 90 * R(b + 410);
      const pts = Array.from({ length: 6 }, (_, i) => ({ x: from + (to - from) * i / 5, y: ground + dy + (R(b * 10 + i + 50) - .5) * Math.min(8, 2 + dy * .15), pressure: .4 + .55 * R(b * 10 + i + 90) }));
      pts[0].pressure = .1; pts[5].pressure = .08;
      out.push({ d: buildBrushRibbon(stroke(`g${b}`, color, width * (.8 + .4 * R(b + 200)), pts), 1, 0, seed + k * 13 + b).path, color, opacity });
    });
    for (let i = 0; i < 3; i++) {
      const x = x0 + (i + R(i + 300)) * tile / 3, s = .7 + .6 * R(i + 310), lean = (R(i + 320) - .5) * 10;
      for (let j = 0; j < 3; j++) {
        const bx = x + (j - 1) * 5 * s, tip = { x: bx + lean + (j - 1) * 4 * s, y: ground - (9 + 8 * R(i * 3 + j + 330)) * s, pressure: .05 };
        out.push({ d: buildBrushRibbon(stroke(`t${i}${j}`, "#56653f", 6 * s, [{ x: bx, y: ground + 3, pressure: .8 }, { x: (bx + tip.x) / 2, y: (ground + tip.y) / 2, pressure: .45 }, tip]), 1, 0, seed + i * 7 + j).path, color: "#5e6d45", opacity: .55 });
      }
    }
    return out;
  }, [k, ground, tile, seed]);
  return <g data-km-rig-watercolour-ground="" filter={`url(#${uid}-wc-ground)`} style={{ mixBlendMode: "multiply" }}>
    {marks.map((m, i) => <path key={i} d={m.d} fill={m.color} opacity={m.opacity} />)}
  </g>;
}

// ---- Figure ----------------------------------------------------------------------------------------------------------

const anchorCache = new WeakMap<RigSpec, string>();
/** The bone the pigment texture rides on: the main body (pelvis, barrel, hull, envelope) rather than the bare root, so
 * the texture follows the body's bob instead of sliding over it. */
function anchorBone(spec: RigSpec): string {
  let id = anchorCache.get(spec);
  if (!id) { const root = spec.bones.find(b => !b.parent); id = spec.bones.find(b => b.parent === root?.id)?.id ?? root?.id ?? ""; anchorCache.set(spec, id); }
  return id;
}

/** One rigged figure painted in watercolour (wash, pencil, details, smoke). `frame` is the evaluated rig frame. */
export function WatercolourRigBody({ spec, frame, parts, uid, seed }: { spec: RigSpec; frame: RigFrame; parts: readonly RigPartFrame[]; uid: string; seed: number }) {
  const fig = `${uid}-${safeId(spec.id)}`;
  const anchor = frame.bones.get(anchorBone(spec))?.world;
  const rx = r2(anchor?.e ?? frame.root.x), ry = r2(anchor?.f ?? frame.root.y);
  /** Texture anchor: filters see the body's own position, so pigment grain travels with the figure (light stays fixed). */
  const anchored = (filter: string, node: ReactNode, style?: CSSProperties, opacity?: number) =>
    <g transform={`translate(${rx} ${ry})`} filter={filter} style={style} opacity={opacity}><g transform={`translate(${-rx} ${-ry})`}>{node}</g></g>;
  const wrap = (p: RigPartFrame, node: ReactNode) =>
    <g key={p.id} data-km-rig-part={p.id} transform={matrixAttr(p.matrix)} opacity={p.opacity < 1 ? r2(p.opacity) : undefined}>{node}</g>;
  // The shadow glaze reaches in by a share of the figure's size on screen.
  const size = Math.max(spec.bounds.width, spec.bounds.height) * Math.abs(frame.root.scale || 1);
  const depth = r2(Math.min(12, Math.max(3, size * .022)));

  // Marks go on after the washes. A large dark part (a cabin behind its windows) is a wash in its own place instead.
  const isMark = (p: RigPartFrame) => {
    if (p.line || p.role === "eye" || p.role === "mouth") return true;
    const b = sceneBox(p.matrix, boxOf(p.shape));
    return p.role === "detail" && Math.min(b.w, b.h) < size * .05;
  };
  // White paper is kept under the figure, as masking fluid keeps it, so the sky does not tint its washes.
  const kept = parts.filter(p => !p.line && p.role !== "smoke" && p.role !== "light").map(p => wrap(p, <path d={pathOf(p.shape)} fill={WATERCOLOUR_PAPER} />));
  const regions: { color: string; box: Box }[] = [], seams = new Set<string>();
  const wash = parts.filter(p => !isMark(p) && p.role !== "smoke").map(p => {
    const d = pathOf(p.shape), w = watercolourWash(partColor(spec, p), p.far), sb = sceneBox(p.matrix, boxOf(p.shape));
    // A dried edge only where this wash meets another colour: touching parts of one colour are one wash.
    const joined = regions.some(q => q.color === w.base && touches(q.box, sb));
    regions.push({ color: w.base, box: sb });
    if (joined) seams.add(p.id);
    if (joined || Math.min(sb.w, sb.h) < 3) return wrap(p, <path d={d} fill={w.base} />);
    const clip = `${fig}-${safeId(p.id)}`;
    return wrap(p, <>
      <defs><clipPath id={clip}><path d={d} /></clipPath></defs>
      <path d={d} fill={w.base} />
      <path d={d} fill="none" stroke={w.rim} strokeWidth={2.4} vectorEffect="non-scaling-stroke" clipPath={`url(#${clip})`} opacity={.7} />
    </>);
  });
  // Pencil: every part as white paper with a graphite edge, in paint order, so later parts hide earlier lines.
  // Construction seams inside one wash are drawn faintly, as an artist's lighter under-drawing.
  const pencil = parts.filter(p => !p.line && p.role !== "smoke" && p.role !== "light").map(p => wrap(p,
    <path d={pathOf(p.shape)} fill="#ffffff" stroke={GRAPHITE} strokeOpacity={seams.has(p.id) ? .4 : 1} strokeWidth={.9} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />));
  // A nearer part is white here: white multiplied onto the page changes nothing, but it covers the marks behind it, so a
  // mouth does not show through a raised hand. A glint is white too, and is kept out of the dark of the eye.
  const marked: Box[] = [], details: ReactNode[] = [];
  for (const p of parts) {
    const d = pathOf(p.shape), sb = sceneBox(p.matrix, boxOf(p.shape));
    if (!isMark(p)) {
      if (p.role !== "smoke" && p.opacity > .9 && marked.some(m => touches(m, sb))) details.push(wrap(p, <path d={d} fill="#ffffff" />));
      continue;
    }
    marked.push(sb);
    const c = mix(partColor(spec, p), DETAIL, p.line ? .45 : .6);
    details.push(wrap(p, p.line ? <path d={d} fill="none" stroke={c} strokeWidth={Math.max(.7, (p.lineWidth ?? 1) * .9)} strokeLinecap="round" opacity={.85} />
      : <path d={d} fill={c} opacity={.9} />));
  }
  const smoke = parts.filter(p => p.role === "smoke").map(p => wrap(p, <path d={pathOf(p.shape)} fill={mix(partColor(spec, p), "#7d8aa3", .45)} opacity={.55} />));

  return <g data-km-rig-watercolour="">
    <defs><WatercolourWashFilter id={`${fig}-wash`} seed={seed} tooth={.55} granulation={.42} driedEdge={.75} rim={2} mottle={.35}
      shade={{ color: SHADOW, amount: .5, depth, light: LIGHT, reserve: .32 }} /></defs>
    <g data-km-rig-watercolour-kept="">{kept}</g>
    {anchored(`url(#${fig}-wash)`, wash, { mixBlendMode: "multiply" }, .95)}
    {anchored(`url(#${uid}-wc-pencil)`, pencil, { mixBlendMode: "multiply" }, .45)}
    {smoke.length > 0 && anchored(`url(#${uid}-wc-soft)`, smoke, { mixBlendMode: "multiply" })}
    {details.length > 0 && anchored(`url(#${uid}-wc-detail)`, details, { mixBlendMode: "multiply" })}
  </g>;
}
