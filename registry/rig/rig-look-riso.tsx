/**
 * RIG1 `riso` look: every frame of a rigged figure printed as a real two- or three-drum Risograph pass, using the
 * style's own print engine (RISO1 `print-plates`, `riso-screening`, `riso-drum-contact`, `print-plates-react`).
 *
 * - Inks: a drum set from `RISO_DRUM_SETS` (stock drum colours in `RISO_INKS`), or your own 2–3 drums.
 * - Separation: each part colour is split into per-drum coverages with `separateRisoColor` (the inverse of the
 *   multiply overprint model), then quantised to five screen tints or a solid, like a riso artist's tonal plates.
 * - Screens: AM or FM dots from `createRisoScreenGeometry`, laid out in PAPER space. The art moves under a screen
 *   that stays on the sheet, so dots never swim, rotate with a limb or scale with the camera.
 * - Occlusion: a part covers what is behind it on every drum (per-tint masks painted in z order), and the figure
 *   first knocks the background ink back to paper, so figures are opaque and never see-through.
 * - Press: each drum keeps one fixed registration error (`plateRegistration`) that moves its art and its dots
 *   together; paper pores (tooth) and RISO75 roller streaks are locked to the paper; inks overprint by multiply.
 *
 * Wrap a scene in `<RisoLookProvider value={{ drums: "blue-pink-yellow", screen: "fm" }}>` to choose the press.
 */
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { AffineMatrix } from "../motion/types";
import type { RigPartFrame } from "./rig-evaluate";
import { matrixAttr, shapePath } from "./rig-evaluate";
import type { RigShape, RigSpec } from "./rig-spec";
import type { RigLookContext } from "./rig-react";
import { flattenPath } from "../video/collage/collage-geometry";
import {
  RISO_DRUM_SETS, RISO_PALETTE, inspectRisoPrint, plateRegistration, risoDrumPlates, risoInkMottle, risoPaperFibres, risoPaperPores, separateRisoColor,
} from "../video/print-plates";
import type { RisoDrum, RisoDrumSetId, RisoPrintSpec } from "../video/print-plates";
import { createRisoScreenGeometry } from "../video/riso-screening";
import type { RisoScreenMode } from "../video/riso-screening";
import { createRisoDrumContactGeometry } from "../video/riso-drum-contact";
import { RisoScreenPattern } from "../video/print-plates-react";

export interface RisoLookSettings {
  /** A drum set id or two to three drums in print order. Default `medium-blue-orange`. */
  drums?: RisoDrumSetId | readonly RisoDrum[];
  /** Paper colour (six-digit hex). Default the RISO1 cream stock. */
  paper?: string;
  /** AM (periodic dots that grow with tone) or FM (dispersed fixed-size droplets). Default AM. */
  screen?: RisoScreenMode;
  /** Dot pitch in paper px, 2..36. Default: paper width / 300 (5.5 px on a 1600 px sheet, about 20 dots across a face). */
  cell?: number;
  /** Extra seeded register error per drum, 0..1, on top of each drum's fixed offset. Default .5. */
  misregistration?: number;
  /** Paper tooth and fibres, 0..1. Default .55. */
  grain?: number;
  /** Uneven ink film in solids and dots, 0..1. Default .8. */
  mottle?: number;
  /** Dry roller contact (streaks and pinpricks along the feed), 0..1. Default .3. */
  dryness?: number;
}
const RisoLookCtx = createContext<RisoLookSettings>({});
/** Choose the press (drums, paper, screen, register, grain) for every riso-look rig below it. */
export const RisoLookProvider = RisoLookCtx.Provider;

/** Screen tints each drum can print, as nominal dot coverage; anything denser prints solid. */
export const RISO_RIG_TINTS = [.1, .2, .33, .5, .7] as const;
const SOLID = RISO_RIG_TINTS.length;
/** Default tile for paper texture when the sheet size is unknown (a `RigLayer` inside another renderer). */
const TILE_W = 1920, TILE_H = 1080;
/** Mask regions for paper-locked tooth and roller marks: large enough for any camera framing. */
const REACH = 1e5;

interface RisoPress {
  spec: RisoPrintSpec;
  paper: string;
  inks: string[];
  screen: RisoScreenMode;
  cell: number;
  grain: number;
  mottle: number;
  dryness: number;
  misregistration: number;
  /** Paper-texture tile: the sheet itself, so fibres and pores never repeat within a frame. */
  tileW: number;
  tileH: number;
}
const r2 = (v: number) => Math.round(v * 100) / 100;
const unit = (v: number | undefined, fallback: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v! : fallback));
function resolvePress(settings: RisoLookSettings, width: number, height: number, seed: number): RisoPress {
  const drums = typeof settings.drums === "string" || settings.drums === undefined ? RISO_DRUM_SETS[settings.drums ?? "medium-blue-orange"] : settings.drums;
  if (!drums) throw new RangeError(`Unknown riso drum set: ${String(settings.drums)}`);
  const tileW = width >= 240 ? Math.min(8192, Math.round(width)) : TILE_W, tileH = height >= 240 ? Math.min(8192, Math.round(height)) : TILE_H;
  const cell = settings.cell ?? Math.max(4, Math.min(12, Math.round(tileW / 300 * 2) / 2));
  const spec: RisoPrintSpec = {
    version: 1, width: tileW, height: tileH, paper: settings.paper ?? RISO_PALETTE.paper, seed: Math.abs(Math.round(seed)) % 2147483647,
    plates: risoDrumPlates(drums, { dotCell: cell }), startFrame: 0, passFrames: 1, gapFrames: 0,
  };
  const issues = inspectRisoPrint(spec);
  if (issues.length) throw new RangeError(`Invalid riso look: ${issues.map(i => `${i.path}: ${i.message}`).join("; ")}`);
  return {
    spec, paper: spec.paper, inks: spec.plates.map(p => p.color), screen: settings.screen ?? "am", cell, tileW, tileH,
    grain: unit(settings.grain, .55), mottle: unit(settings.mottle, .8), dryness: unit(settings.dryness, .3), misregistration: unit(settings.misregistration, .5),
  };
}
function usePress(width: number, height: number, seed: number): RisoPress {
  const settings = useContext(RisoLookCtx);
  return useMemo(() => resolvePress(settings, width, height, seed), [settings, width, height, seed]);
}

/** The tint index (or SOLID) a coverage prints at on one drum, or -1 for no ink. */
export function risoRigTint(coverage: number): number {
  if (!(coverage >= .05)) return -1;
  if (coverage >= .85) return SOLID;
  let best = 0;
  RISO_RIG_TINTS.forEach((t, i) => { if (Math.abs(t - coverage) < Math.abs(RISO_RIG_TINTS[best] - coverage)) best = i; });
  return best;
}

const ids = (uid: string) => ({
  paper: `${uid}-rpaper`,
  screen: (plate: number, tint: number) => `${uid}-rs${plate}-${tint}`,
  ink: (plate: number) => `${uid}-rink${plate}`,
});

/** Look definitions: paper texture, per-drum screens for every tint, and each drum's paper-locked ink mask. */
export function RisoLookDefs({ uid, width, height, seed }: { uid: string; width: number; height: number; seed: number }) {
  const press = usePress(width, height, seed), id = ids(uid), { spec, tileW, tileH } = press;
  const fibres = useMemo(() => risoPaperFibres(spec.seed, tileW, tileH, Math.round(tileW * tileH / 2400)), [spec.seed, tileW, tileH]);
  const pores = useMemo(() => risoPaperPores(spec.seed, tileW, tileH, Math.round(tileW * tileH / 1900)), [spec.seed, tileW, tileH]);
  const contacts = useMemo(() => spec.plates.map((_, plateIndex) => press.dryness > 0
    ? createRisoDrumContactGeometry({ width: tileW, height: tileH, seed: spec.seed, plateIndex, dryness: press.dryness, feed: "top-to-bottom" }) : null),
  [spec, tileW, tileH, press.dryness]);
  const mottles = useMemo(() => spec.plates.map((_, plateIndex) => press.mottle > 0
    ? risoInkMottle(spec.seed, plateIndex, tileW, tileH, Math.round(tileW * tileH / 1100)) : null), [spec, tileW, tileH, press.mottle]);
  const screens = useMemo(() => spec.plates.map((_, plateIndex) => RISO_RIG_TINTS.map(density =>
    createRisoScreenGeometry({ cell: press.cell, mode: press.screen, density, dotGain: 0, seed: spec.seed, plateIndex }))), [spec, press.cell, press.screen]);
  // Paper texture and each drum's tooth, roller marks and mottle are thousands of marks that never change: they are
  // drawn once into SVG images (cached as bitmaps by the browser) instead of being re-rasterised in every mask.
  const paperImage = useMemo(() => svgImage(tileW, tileH, `<rect width="${tileW}" height="${tileH}" fill="${press.paper}"/>` +
    (press.grain > 0 ? `<g stroke="#694B38" stroke-width=".7">${fibres.map(f => `<path opacity="${r2(f.opacity * press.grain)}" d="M${f.x.toFixed(1)} ${f.y.toFixed(1)} l${f.vertical ? "0.8" : f.length.toFixed(1)} ${f.vertical ? f.length.toFixed(1) : "0.8"}"/>`).join("")}</g>` : "")),
  [tileW, tileH, press.paper, press.grain, fibres]);
  const inkImages = useMemo(() => spec.plates.map((_, i) => svgImage(tileW, tileH,
    (press.grain > 0 ? pores.map(p => `<circle cx="${r2(p.x)}" cy="${r2(p.y)}" r="${r2(p.r * (.4 + press.grain))}"/>`).join("") : "") +
    (contacts[i] ? `<g stroke="#000" stroke-linecap="round" fill="none">${contacts[i]!.streaks.map(l => `<path d="${l.d}" stroke-width="${l.strokeWidth}" opacity="${l.opacity}"/>`).join("")}</g>` +
      contacts[i]!.pinpricks.map(q => `<ellipse cx="${q.cx}" cy="${q.cy}" rx="${q.rx}" ry="${q.ry}" opacity="${q.opacity}"/>`).join("") : "") +
    (mottles[i] ? mottles[i]!.map(m => `<ellipse cx="${r2(m.x)}" cy="${r2(m.y)}" rx="${r2(m.rx)}" ry="${r2(m.ry)}" transform="rotate(${r2(m.angle)} ${r2(m.x)} ${r2(m.y)})" opacity="${r2(m.opacity * press.mottle)}"/>`).join("") : ""))),
  [spec, tileW, tileH, press.grain, press.mottle, pores, contacts, mottles]);
  return <>
    <pattern id={id.paper} patternUnits="userSpaceOnUse" x={0} y={0} width={tileW} height={tileH}>
      <image href={paperImage} width={tileW} height={tileH} preserveAspectRatio="none" />
    </pattern>
    {spec.plates.map((plate, i) => <g key={plate.id}>
      {screens[i].map((geometry, t) => <RisoScreenPattern key={t} id={id.screen(i, t)} geometry={geometry} angle={plate.dotAngle} color={plate.color} />)}
      <mask id={id.ink(i)} maskUnits="userSpaceOnUse" x={-REACH} y={-REACH} width={2 * REACH} height={2 * REACH}>
        <rect x={-REACH} y={-REACH} width={2 * REACH} height={2 * REACH} fill="#fff" />
        <image href={inkImages[i]} width={tileW} height={tileH} preserveAspectRatio="none" data-km-rig-riso-drum-marks={plate.id} />
      </mask>
    </g>)}
  </>;
}
/** A fixed sheet-sized SVG drawn once as an image (black marks by default). */
const svgImage = (width: number, height: number, body: string) =>
  "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`);

/** The unprinted sheet: paper colour with its fibres. */
export function RisoBackdrop({ uid, width, height }: { uid: string; width: number; height: number }) {
  return <rect width={width} height={height} fill={`url(#${ids(uid).paper})`} data-km-rig-riso-paper="" />;
}

/** World → paper transform of the scene camera (paper = world · zoom + offset). */
export interface RisoPaperFrame { zoom: number; x: number; y: number; width: number; height: number }
const IDENTITY_PAPER: RisoPaperFrame = { zoom: 1, x: 0, y: 0, width: 0, height: 0 };
const toPaper = (p: RisoPaperFrame) => `matrix(${p.zoom} 0 0 ${p.zoom} ${p.x} ${p.y})`;
const fromPaper = (p: RisoPaperFrame) => `matrix(${1 / p.zoom} 0 0 ${1 / p.zoom} ${-p.x / p.zoom} ${-p.y / p.zoom})`;

/**
 * One drum's pass: paper-locked tooth and roller marks, multiply overprint, the drum's fixed register offset.
 * Children are in paper space (shifted with the drum, so a stencil's dots and art move together).
 */
function DrumPass({ uid, press, plate, children }: { uid: string; press: RisoPress; plate: number; children: ReactNode }) {
  const [dx, dy] = plateRegistration(press.spec, plate, press.misregistration * 2);
  return <g mask={`url(#${ids(uid).ink(plate)})`} style={{ mixBlendMode: "multiply" }} opacity={press.spec.plates[plate].opacity}
    data-km-rig-riso-plate={press.spec.plates[plate].id}>
    <g transform={`translate(${r2(dx)} ${r2(dy)})`}>{children}</g>
  </g>;
}

// ---- Figure ------------------------------------------------------------------------------------------------------

const pathCache = new WeakMap<object, string>();
const pathOf = (shape: RigShape) => { let d = pathCache.get(shape); if (!d) { d = shapePath(shape); pathCache.set(shape, d); } return d; };
const boxCache = new WeakMap<object, [number, number, number, number]>();
function boxOf(shape: RigShape): [number, number, number, number] {
  let b = boxCache.get(shape);
  if (!b) {
    const pts = flattenPath(pathOf(shape), 4).flatMap(s => s.points);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    b = pts.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : [0, 0, 0, 0];
    boxCache.set(shape, b);
  }
  return b;
}
interface PrintItem { key: string; d: string; matrix: AffineMatrix; stroke?: number; tints: number[]; occludes: boolean }
const IDENTITY: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const compose = (p: AffineMatrix, q: AffineMatrix): AffineMatrix => ({ a: p.a * q.a + p.c * q.b, b: p.b * q.a + p.d * q.b, c: p.a * q.c + p.c * q.d,
  d: p.b * q.c + p.d * q.d, e: p.a * q.e + p.c * q.f + p.e, f: p.b * q.e + p.d * q.f + p.f });


export interface RisoFigureProps {
  spec: RigSpec;
  /** Evaluated parts in paint order (solid faces included). */
  parts: readonly RigPartFrame[];
  /** Ground contact points for soft shadows, in world space. */
  contacts: readonly (readonly [number, number])[];
  /** Root depth scale (shadow size). */
  scale: number;
  ctx: RigLookContext;
  /** The part's colour as the other looks see it (palette, overrides, far-side shading). */
  colorOf: (p: RigPartFrame) => string;
  /** World → paper transform; identity when the figure is embedded without a camera. */
  paper?: RisoPaperFrame;
}
/** One rigged figure printed on the riso press: paper knockout, then each drum's tint masks in z order. */
export function RisoFigure({ spec, parts, contacts, scale, ctx, colorOf, paper = IDENTITY_PAPER }: RisoFigureProps) {
  const press = usePress(paper.width, paper.height, ctx.seed), id = ids(ctx.uid);
  const fid = `${ctx.uid}-${spec.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const tintsOf = (hex: string, amount = 1) => separateRisoColor(hex, press.paper, press.inks).map(c => risoRigTint(c * amount));
  // Soft contact shadows: two concentric screened ellipses on the darkest drum, under everything, never occluding.
  const shadowPlate = press.inks.reduce((best, ink, i) => lumOf(ink) < lumOf(press.inks[best]) ? i : best, 0);
  const shadows: PrintItem[] = contacts.flatMap(([x, y], i) => [[1.3, 1.5, 0], [.8, .8, 1]].map(([kx, ky, tint], j) => {
    const rx = 14 * scale * kx, ry = 3.2 * scale * ky, cy = y + 1;
    return { key: `shadow-${i}-${j}`, d: `M${r2(x - rx)} ${r2(cy)}A${r2(rx)} ${r2(ry)} 0 1 0 ${r2(x + rx)} ${r2(cy)}A${r2(rx)} ${r2(ry)} 0 1 0 ${r2(x - rx)} ${r2(cy)}Z`,
      matrix: IDENTITY, tints: press.inks.map((_, p) => p === shadowPlate ? tint : -1), occludes: false };
  }));
  const items: PrintItem[] = [...shadows, ...parts.flatMap((p, i): PrintItem[] => {
    const translucent = p.role === "smoke" || p.opacity < .999;
    let tints = tintsOf(colorOf(p), translucent ? Math.min(1, p.opacity) * (p.role === "smoke" ? .6 : 1) : 1);
    // Fine linear work (legs, rims, straps, outlines) under about two dots across would break up into loose dots:
    // like a riso artist, print it solid on the drums that carry a real share of its colour. Small compact shapes
    // (an ear, a knuckle) keep their tint so they sit in the same tone as their neighbours.
    const [bx0, by0, bx1, by1] = boxOf(p.shape), m = p.matrix;
    const w = (bx1 - bx0) * Math.hypot(m.a, m.b), h = (by1 - by0) * Math.hypot(m.c, m.d);
    const across = p.line ? (p.lineWidth ?? 1) : Math.min(w, h), along = p.line ? Infinity : Math.max(w, h);
    if (!translucent && across * paper.zoom < 2.2 * press.cell && along > 2.2 * across) {
      const firm = tints.map(t => t >= 2 ? SOLID : -1);
      if (firm.some(t => t >= 0)) tints = firm;
    }
    const item: PrintItem = { key: `${p.id}-${i}`, d: pathOf(p.shape), matrix: p.matrix, stroke: p.line ? (p.lineWidth ?? 1) : undefined, tints, occludes: !translucent };
    // A near-white shape prints no ink and would vanish into the paper (a koi, sails): give it a keyline on the darkest
    // drum. It goes under the shape, so only the outer half shows and shapes in front cover it.
    if (p.line || translucent || tints.some(t => t >= 0)) return [item];
    return [{ ...item, key: item.key + "-key", stroke: 3 / (Math.hypot(m.a, m.b) || 1), tints: press.inks.map((_, plate) => plate === shadowPlate ? SOLID : -1), occludes: false }, item];
  })];
  // Paper-space bounds of the figure (masks and tint rectangles only cover this box).
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const p of parts) {
    const [bx0, by0, bx1, by1] = boxOf(p.shape), m = p.matrix, pad = p.line ? (p.lineWidth ?? 1) : 0;
    for (const [x, y] of [[bx0 - pad, by0 - pad], [bx1 + pad, by0 - pad], [bx0 - pad, by1 + pad], [bx1 + pad, by1 + pad]]) grow(m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f);
  }
  for (const [x, y] of contacts) { grow(x - 20 * scale, y - 6 * scale); grow(x + 20 * scale, y + 8 * scale); }
  if (!Number.isFinite(x0)) return null;
  const pad = 8, box = { x: r2(x0 * paper.zoom + paper.x - pad), y: r2(y0 * paper.zoom + paper.y - pad), width: r2((x1 - x0) * paper.zoom + 2 * pad), height: r2((y1 - y0) * paper.zoom + 2 * pad) };
  const toPaperM: AffineMatrix = { a: paper.zoom, b: 0, c: 0, d: paper.zoom, e: paper.x, f: paper.y };
  const placed = items.map(it => ({ ...it, attr: matrixAttr(compose(toPaperM, it.matrix)) }));
  const shape = (it: (typeof placed)[number], fill: string) => it.stroke !== undefined
    ? <path key={it.key} d={it.d} transform={it.attr} fill="none" stroke={fill} strokeWidth={it.stroke} strokeLinecap="round" strokeLinejoin="round" />
    : <path key={it.key} d={it.d} transform={it.attr} fill={fill} />;
  const region = { maskUnits: "userSpaceOnUse" as const, ...box };
  const used = press.inks.map((_, plate) => [...new Set(placed.map(it => it.tints[plate]).filter(t => t >= 0))].sort((a, b) => a - b));
  return <g data-km-rig-riso={spec.id}>
    <defs>
      <mask id={`${fid}-knockout`} {...region}>{placed.filter(it => it.occludes).map(it => shape(it, "#fff"))}</mask>
      {used.map((tints, plate) => tints.map(t => <mask key={`${plate}-${t}`} id={`${fid}-m${plate}-${t}`} {...region}>
        {/* Painted in z order: a nearer part blanks the tints of what it covers, so every drum is opaque per part. */}
        {placed.map(it => it.tints[plate] === t ? shape(it, "#fff") : it.occludes ? shape(it, "#000") : null)}
      </mask>))}
    </defs>
    <g transform={fromPaper(paper)}>
      <rect {...box} fill={`url(#${id.paper})`} mask={`url(#${fid}-knockout)`} data-km-rig-riso-knockout="" />
      {used.map((tints, plate) => tints.length > 0 && <DrumPass key={plate} uid={ctx.uid} press={press} plate={plate}>
        {tints.map(t => <rect key={t} {...box} fill={t === SOLID ? press.inks[plate] : `url(#${id.screen(plate, t)})`} mask={`url(#${fid}-m${plate}-${t})`}
          data-km-rig-riso-tint={t === SOLID ? "solid" : RISO_RIG_TINTS[t]} />)}
      </DrumPass>)}
    </g>
  </g>;
}

function lumOf(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return .299 * ((n >> 16) & 255) + .587 * ((n >> 8) & 255) + .114 * (n & 255);
}

// ---- Ground ------------------------------------------------------------------------------------------------------

/** The ground band's colour and its marks' colour before separation (a dry sage field with darker tufts). */
const GROUND_TINT = "#d6dcc4", GROUND_MARK = "#3c4a3a";
/**
 * One world-anchored ground tile. The band is a screened tint printed once per frame (by the tile at the left edge
 * of the frame) across the whole sheet, in paper space, so its dots stay on the paper while the camera pans; the
 * marks (tufts, pebbles, drawn with `currentColor`) print solid in the darkest ink and travel with the ground.
 */
export function RisoGroundTile({ uid, k, ground, depth, seed, paper = IDENTITY_PAPER, tileWidth, marks }: {
  uid: string; k: number; ground: number; depth: number; seed: number; paper?: RisoPaperFrame; tileWidth: number; marks: ReactNode;
}) {
  const press = usePress(paper.width, paper.height, seed), id = ids(uid);
  const left = -paper.x / paper.zoom, first = k === Math.floor((left + 1e-6) / tileWidth);
  const band = separateRisoColor(GROUND_TINT, press.paper, press.inks).map(c => risoRigTint(c));
  const mark = separateRisoColor(GROUND_MARK, press.paper, press.inks);
  const markPlate = mark.reduce((best, c, i) => c > mark[best] ? i : best, 0);
  const top = r2(ground * paper.zoom + paper.y), bottom = r2((ground + depth) * paper.zoom + paper.y), width = paper.width || TILE_W;
  return <g data-km-rig-riso-ground={k}>
    {press.inks.map((ink, plate) => {
      const tint = band[plate], hasBand = first && tint >= 0;
      if (!hasBand && plate !== markPlate) return null;
      return <g key={plate} transform={fromPaper(paper)}>
        <DrumPass uid={uid} press={press} plate={plate}>
          {hasBand && <rect x={-40} y={top} width={width + 80} height={Math.max(0, bottom - top)} fill={tint === SOLID ? ink : `url(#${id.screen(plate, tint)})`} />}
          {plate === markPlate && <g transform={toPaper(paper)} color={ink}>{marks}</g>}
        </DrumPass>
      </g>;
    })}
  </g>;
}
