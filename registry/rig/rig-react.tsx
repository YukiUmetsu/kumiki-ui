/**
 * RIG1 painters: one evaluated rig, drawn in any film look.
 *
 * The rig decides what moves; a painter decides the medium. `RigScene` draws a board for the look and any number
 * of rigged figures on it; `RigFigure` draws one figure inside an existing SVG (pass the scene's `RigLookContext`).
 *   flat      clean vector fills, far side shaded, soft contact shadows
 *   collage   scissor-cut paper parts with fibre, lift shadows and halftone on the far side
 *   crayon    wax fills and dry wax outlines on toothy paper, redrawn on held poses
 *   riso      a real Risograph pass per frame on the RISO1 press (rig-look-riso.tsx): drum inks, paper-locked screens
 *   ink       Chinese ink on xuan paper from the INK1 brush and wet-paper engines (rig-look-ink.tsx)
 *   blueprint white technical line work on a blue grid, bones and joints shown
 *   pencil    coloured pencil on toothy paper: layered hatching fixed to each part, value turning with the light
 *   watercolour transparent washes on cold-press paper, dried edges, granulation, pencil underdrawing (rig-look-watercolour.tsx)
 */
import { Fragment, createContext, useContext, useId, useMemo } from "react";
import type { CSSProperties, ReactNode, SVGProps } from "react";
import type { RigFrame, RigPartFrame } from "./rig-evaluate";
import { evaluateRig, matrixAttr, rootState, shapePath } from "./rig-evaluate";
import { JointFade, boxOfParts, formsOf, reachOf } from "./rig-form";
import type { RigForm } from "./rig-form";
import type { RigRole, RigShape, RigSpec } from "./rig-spec";
import { flattenPath, paperEdge, toPathD } from "../video/collage/collage-geometry";
import { boardTexture, fiberTexture } from "../video/collage/collage-texture";
import { PencilFormEdge, PencilGroundTile, PencilLookDefs, PencilPaper, PencilPart } from "./rig-look-pencil";
import { InkFigure, InkGroundTile, InkPaper } from "./rig-look-ink";
import { RigCrayonFormEdge, RigCrayonGroundTile, RigCrayonPaper, RigCrayonPart } from "./rig-look-crayon";
import { WatercolourGroundTile, WatercolourRigBackdrop, WatercolourRigBody, WatercolourRigDefs } from "./rig-look-watercolour";
import { RisoBackdrop, RisoFigure, RisoGroundTile, RisoLookDefs } from "./rig-look-riso";
import type { RisoPaperFrame } from "./rig-look-riso";

export type RigLook = "flat" | "collage" | "crayon" | "riso" | "ink" | "blueprint" | "pencil" | "watercolour";
/**
 * Looks animate on ones by default (smooth); pass `cadence={2}` for a stop-motion feel. `boil` is how often a
 * hand-drawn medium redraws its texture, independent of the motion: wax boils every few frames even on ones.
 */
export const RIG_LOOKS: readonly { id: RigLook; label: string; cadence: number; boil: number }[] = [
  { id: "flat", label: "Flat vector", cadence: 1, boil: 1 },
  { id: "collage", label: "Paper collage", cadence: 1, boil: 1 },
  { id: "crayon", label: "Crayon", cadence: 1, boil: 4 },
  { id: "riso", label: "Riso print", cadence: 1, boil: 1 },
  { id: "ink", label: "Ink wash", cadence: 1, boil: 1 },
  { id: "blueprint", label: "Blueprint", cadence: 1, boil: 1 },
  { id: "pencil", label: "Coloured pencil", cadence: 1, boil: 6 },
  { id: "watercolour", label: "Watercolour", cadence: 1, boil: 1 },
];
const lookOf = (look: RigLook) => RIG_LOOKS.find(l => l.id === look)!;
/** Texture redraw step for a frame: on the motion cadence or the medium's boil, whichever is slower. */
const boilStep = (look: RigLook, frame: number, cadence?: number) => Math.floor(frame / Math.max(1, cadence ?? 1, lookOf(look).boil));

export interface RigLookContext { look: RigLook; uid: string; seed: number; step: number; showBones: boolean; reduced: boolean; paper?: RisoPaperFrame }
const LookCtx = createContext<RigLookContext | null>(null);

// ---- Colour --------------------------------------------------------------------------------------------------------------------

const hexRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
/** Mix toward white (k > 0) or ink (k < 0). */
export function shade(hex: string, k: number): string {
  const [r, g, b] = hexRgb(hex), t = k >= 0 ? 255 : 24, a = Math.min(1, Math.abs(k));
  return rgbHex(r + (t - r) * a, g + (t - g) * a, b + (t - b) * a);
}
const FALLBACK: Partial<Record<RigRole, string>> = { smoke: "#e9e4d8", light: "#f2d98a", detail: "#1d1b19", eye: "#1d1b19", mouth: "#3b1714" };
function partColor(spec: RigSpec, p: RigPartFrame): string {
  return p.color ?? spec.palette[p.role] ?? FALLBACK[p.role] ?? "#888888";
}
const r2 = (v: number) => Math.round(v * 100) / 100;

// ---- Geometry caches -------------------------------------------------------------------------------------------------------------

const pathCache = new WeakMap<object, string>();
const pathOf = (shape: RigShape) => { let d = pathCache.get(shape); if (!d) { d = shapePath(shape); pathCache.set(shape, d); } return d; };
const boundsCache = new WeakMap<object, { x: number; y: number; width: number; height: number }>();
function boundsOf(shape: RigShape) {
  let b = boundsCache.get(shape);
  if (!b) {
    const pts = flattenPath(pathOf(shape), 4).flatMap(s => s.points);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    b = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(1, Math.max(...xs) - Math.min(...xs)), height: Math.max(1, Math.max(...ys) - Math.min(...ys)) };
    boundsCache.set(shape, b);
  }
  return b;
}
const cutCache = new WeakMap<object, string>();
/** Scissor-cut paper edge for a shape (cached per shape object). */
function cutPath(shape: RigShape, seed: number, torn = false): string {
  let d = cutCache.get(shape);
  if (!d) {
    const loops = flattenPath(pathOf(shape), 3).map(s => s.points).filter(l => l.length > 2);
    d = loops.map((l, i) => toPathD(paperEdge(l, { style: torn ? "torn" : "cut", seed: seed + i * 7, roughness: torn ? 1.8 : .7 }), true)).join("");
    cutCache.set(shape, d);
  }
  return d;
}

// ---- Painters --------------------------------------------------------------------------------------------------------------------

const flatFill = (spec: RigSpec, p: RigPartFrame) => { const c = partColor(spec, p); return p.far ? shade(c, -.2) : c; };
function FlatPart({ spec, p, formed }: { spec: RigSpec; p: RigPartFrame; formed: boolean }) {
  const fill = flatFill(spec, p), d = pathOf(p.shape);
  if (p.line) return <path d={d} fill="none" stroke={fill} strokeWidth={p.lineWidth ?? 1} />;
  if (p.role === "smoke") return <path d={d} fill={fill} opacity={.75} />;
  return <>
    <path d={d} fill={fill} />
    {!formed && <path d={d} fill="none" stroke={shade(fill, -.28)} strokeWidth={.9} vectorEffect="non-scaling-stroke" opacity={.55} />}
  </>;
}

const paperCut = (spec: RigSpec, p: RigPartFrame) => cutPath(p.shape, hashStr(spec.id + p.id), p.role === "smoke" || p.role === "membrane" || p.role === "sail");
function CollagePart({ spec, p, ctx, formed }: { spec: RigSpec; p: RigPartFrame; ctx: RigLookContext; formed: boolean }) {
  const c = partColor(spec, p), fill = p.far ? shade(c, -.16) : c;
  if (p.line) return <path d={pathOf(p.shape)} fill="none" stroke={shade(fill, -.2)} strokeWidth={(p.lineWidth ?? 1) * 1.4} />;
  const d = paperCut(spec, p);
  return <>
    {!formed && <path d={d} fill="#1c1208" opacity={.28} transform="translate(1.6 2.4)" filter={`url(#${ctx.uid}-soft)`} />}
    <path d={d} fill={fill} />
    {p.far && <path d={d} fill={`url(#${ctx.uid}-dots)`} opacity={.35} />}
    <path d={d} fill={`url(#${ctx.uid}-fibre)`} opacity={.55} style={{ mixBlendMode: "soft-light" }} />
  </>;
}

function BlueprintPart({ p }: { p: RigPartFrame }) {
  const d = pathOf(p.shape);
  return <path d={d} fill={p.role === "smoke" ? "none" : "rgba(255,255,255,.07)"} stroke="#eaf3ff" strokeWidth={p.role === "smoke" ? .8 : 1.2}
    strokeDasharray={p.role === "smoke" || p.far ? "4 3" : undefined} vectorEffect="non-scaling-stroke" opacity={p.far ? .6 : .95} />;
}

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const flatCache = new WeakMap<object, [number, number][][]>();
const flatLoops = (shape: RigShape) => { let l = flatCache.get(shape); if (!l) { l = flattenPath(pathOf(shape), 2.5).map(s => s.points as [number, number][]).filter(p => p.length > 2); flatCache.set(shape, l); } return l; };
const at = (m: { a: number; b: number; c: number; d: number; e: number; f: number }, p: readonly [number, number]): [number, number] => [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f];
/**
 * Solid figures turning in depth. For each extruded part, the faces between its near outline and its far copy that turn
 * toward the camera (those facing the way the far side has shifted) are added as strips, one per run of similarly
 * facing edges, shaded by orientation (tops lighter, ends darker); far-side parts are slotted under or over them.
 */
function withSolidFaces(spec: RigSpec, parts: RigPartFrame[]): RigPartFrame[] {
  const solids = parts.filter(p => p.extrude && p.farMatrix);
  if (!solids.length && !parts.some(p => p.far3d)) return parts;
  const lowest = Math.min(...solids.map(p => p.z), Infinity);
  const out: RigPartFrame[] = parts.map(p => p.far3d === "under" ? { ...p, z: p.z - 1000 } : p.far3d === "over" ? { ...p, z: (Number.isFinite(lowest) ? lowest : p.z) - .0005 + p.z * 1e-6 } : p);
  for (const p of solids) {
    const [nx0, ny0] = at(p.matrix, [0, 0]), [fx0, fy0] = at(p.farMatrix!, [0, 0]), dx = fx0 - nx0, dy = fy0 - ny0;
    if (Math.hypot(dx, dy) < .6) continue;
    const faceRole = p.faceRole ?? p.role, base = p.faceRole ? spec.palette[p.faceRole] ?? partColor(spec, p) : partColor(spec, p);
    flatLoops(p.shape).forEach((loop, li) => {
      const near = loop.map(q => at(p.matrix, q)), far = loop.map(q => at(p.farMatrix!, q)), n = near.length;
      let area = 0;
      for (let i = 0; i < n; i++) { const a = near[i], b = near[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
      const sign = area > 0 ? 1 : -1;
      const normal = (i: number) => { const a = near[i], b = near[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey) || 1; return [sign * ey / L, -sign * ex / L] as const; };
      const visible = (i: number) => { const [ux, uy] = normal(i); return ux * dx + uy * dy > 0; };
      // Start from an edge that is hidden so runs do not wrap around the start.
      let first = 0; while (first < n && visible(first)) first++;
      if (first === n) first = 0;
      let run: number[] = [], strip = 0;
      const flush = () => {
        if (!run.length) return;
        const [ux, uy] = run.reduce(([sx, sy], i) => { const [a, b] = normal(i); return [sx + a, sy + b]; }, [0, 0]);
        const L = Math.hypot(ux, uy) || 1, up = -uy / L;
        const pts = [...run.map(i => near[i]), near[(run[run.length - 1] + 1) % n], far[(run[run.length - 1] + 1) % n], ...[...run].reverse().map(i => far[i])];
        out.push({ id: `${p.id}-face-${li}-${strip++}`, bone: p.bone, role: faceRole, shape: { type: "polygon", points: pts.map(([x, y]) => [r2(x), r2(y)] as const) },
          matrix: IDENTITY, z: p.z - .001, color: shade(base, up > .35 ? .1 * up : -.16 + .06 * up), opacity: p.opacity });
        run = [];
      };
      for (let k = 0; k < n; k++) {
        const i = (first + k) % n;
        if (!visible(i)) { flush(); continue; }
        if (run.length) { const [a, b] = normal(run[0]), [c, d] = normal(i); if (a * c + b * d < Math.cos(40 * Math.PI / 180)) flush(); }
        run.push(i);
      }
      flush();
    });
  }
  return out.sort((a, b) => a.z - b.z);
}

/** What goes down under a body form: the outlines of all its parts (their lift shadow in cut paper). */
function FormEdge({ spec, parts: form, ctx }: { spec: RigSpec; parts: readonly RigPartFrame[]; ctx: RigLookContext }) {
  if (ctx.look === "collage") return <g opacity={.28} filter={`url(#${ctx.uid}-soft)`}>
    {form.map(p => <g key={p.id} transform={matrixAttr(p.matrix)}><path d={paperCut(spec, p)} fill="#1c1208" transform="translate(1.6 2.4)" /></g>)}
  </g>;
  return <g opacity={ctx.look === "flat" ? .55 : undefined} data-km-rig-form={form[0].mass}>
    {form.map(p => {
      const d = pathOf(p.shape), seed = hashStr(spec.id + p.id), color = partColor(spec, p);
      const fade = p.grows ? { id: `${ctx.uid}-grow-${seed.toString(36)}`, reach: reachOf(boundsOf(p.shape)) } : undefined;
      return <g key={p.id} transform={matrixAttr(p.matrix)}>
        {ctx.look === "crayon" ? <RigCrayonFormEdge p={p} ctx={ctx} d={d} color={color} seed={seed} fade={fade} />
          : ctx.look === "pencil" ? <PencilFormEdge p={p} ctx={ctx} d={d} color={color} seed={seed} fade={fade} />
            : <>
              {fade && <JointFade {...fade} color={shade(flatFill(spec, p), -.28)} />}
              <path d={d} fill="none" stroke={fade ? `url(#${fade.id})` : shade(flatFill(spec, p), -.28)} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </>}
      </g>;
    })}
  </g>;
}

/** Bones as tapered lines from joint to child joint, joints as rings: the rig itself, for explainers and debugging. */
function BoneOverlay({ frame, color }: { frame: RigFrame; color: string }) {
  const items: ReactNode[] = [];
  for (const b of frame.bones.values()) {
    const m = b.world, x = m.e, y = m.f;
    if (b.length > 0) {
      const ex = m.c * b.length + m.e, ey = m.d * b.length + m.f;
      items.push(<line key={b.id + "l"} x1={r2(x)} y1={r2(y)} x2={r2(ex)} y2={r2(ey)} stroke={color} strokeWidth={1.4} strokeDasharray="5 3" opacity={.85} />);
    }
    items.push(<circle key={b.id + "c"} cx={r2(x)} cy={r2(y)} r={3.2} fill="none" stroke={color} strokeWidth={1.3} />);
  }
  return <g pointerEvents="none" data-km-rig-bones="">{items}</g>;
}

export interface RigFigureProps { spec: RigSpec; frame: number; cadence?: number; reducedMotion?: boolean; showBones?: boolean }
/** One rigged figure in the enclosing scene's look. */
export function RigFigure({ spec, frame, cadence, reducedMotion, showBones }: RigFigureProps) {
  const ctx = useContext(LookCtx);
  if (!ctx) throw new Error("RigFigure must be inside a RigScene (or a RigLookProvider)");
  const look = RIG_LOOKS.find(l => l.id === ctx.look)!;
  const f = evaluateRig(spec, frame, { cadence: cadence ?? look.cadence, reducedMotion: reducedMotion ?? ctx.reduced });
  const parts = withSolidFaces(spec, f.parts);
  const shadowFill = ctx.look === "blueprint" ? "none" : ctx.look === "watercolour" ? "#3c4776" : "#1c1208";
  // The riso look prints its own screened contact shadows on the darkest drum.
  const contacts = ctx.look === "riso" ? null : <g data-km-rig-contacts="">{f.contacts.map(([x, y], i) => <ellipse key={i} cx={r2(x)} cy={r2(y + 1)} rx={r2(14 * f.root.scale)} ry={r2(3.2 * f.root.scale)} fill={shadowFill}
    opacity={.16} filter={`url(#${ctx.uid}-soft)`} />)}</g>;
  // A blueprint shows its construction, so there every part keeps its own line.
  const forms = formsOf(ctx.look === "blueprint" ? [] : parts), boxes = new Map<RigForm["lit"], ReturnType<typeof boxOfParts>>();
  const lightBox = (form: RigForm) => { let b = boxes.get(form.lit); if (!b) { b = boxOfParts(form.lit, boundsOf); boxes.set(form.lit, b); } return b; };
  const draw = (p: RigPartFrame) => {
    const form = forms.get(p.id), formed = !!form;
    switch (ctx.look) {
      case "collage": return <CollagePart spec={spec} p={p} ctx={ctx} formed={formed} />;
      case "crayon": return <RigCrayonPart p={p} ctx={ctx} d={pathOf(p.shape)} bounds={boundsOf(p.shape)} color={partColor(spec, p)} seed={hashStr(spec.id + p.id)} lightBox={form && lightBox(form)} />;
      case "blueprint": return <BlueprintPart p={p} />;
      case "pencil": return <PencilPart p={p} d={pathOf(p.shape)} color={partColor(spec, p)} seed={hashStr(spec.id + p.id)} ctx={ctx} lightBox={form && lightBox(form)} />;
      default: return <FlatPart spec={spec} p={p} formed={formed} />;
    }
  };
  const body = ctx.look === "watercolour" ? <WatercolourRigBody spec={spec} frame={f} parts={parts} uid={ctx.uid} seed={ctx.seed} />
    : ctx.look === "ink"
    ? <InkFigure spec={spec} parts={parts} colorOf={p => partColor(spec, p)} />
    : ctx.look === "riso"
    ? <RisoFigure spec={spec} parts={parts} contacts={f.contacts} scale={f.root.scale} ctx={ctx} paper={ctx.paper}
        colorOf={p => p.far ? shade(partColor(spec, p), -.15) : partColor(spec, p)} />
    : parts.map(p => {
      const form = forms.get(p.id);
      return <Fragment key={p.id}>
        {form?.parts[0] === p && <FormEdge spec={spec} parts={form.parts} ctx={ctx} />}
        <g data-km-rig-part={p.id} transform={matrixAttr(p.matrix)} opacity={p.opacity < 1 ? r2(p.opacity) : undefined}>{draw(p)}</g>
      </Fragment>;
    });
  return <g data-km-rig={spec.id} data-km-rig-frame={f.frame}>
    {contacts}
    {body}
    {(showBones ?? ctx.showBones) && <BoneOverlay frame={f} color={ctx.look === "blueprint" ? "#ffd166" : "#e0225a"} />}
  </g>;
}

// ---- Scene -----------------------------------------------------------------------------------------------------------------------

function LookDefs({ look, uid, width, height, seed }: { look: RigLook; uid: string; width: number; height: number; seed: number }) {
  const fibre = useMemo(() => look === "collage" ? fiberTexture(seed + 3) : "", [look, seed]);
  return <defs>
    <filter id={`${uid}-soft`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={2.2} /></filter>
    {look === "collage" && <>
      <pattern id={`${uid}-fibre`} patternUnits="userSpaceOnUse" width={256} height={256}><image href={fibre} width={256} height={256} /></pattern>
      <pattern id={`${uid}-dots`} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)"><circle cx={3} cy={3} r={1.25} fill="#1d1b19" /></pattern>
    </>}
    {look === "riso" && <RisoLookDefs uid={uid} width={width} height={height} seed={seed} />}
    {look === "pencil" && <PencilLookDefs uid={uid} seed={seed} />}
    {look === "watercolour" && <WatercolourRigDefs uid={uid} seed={seed} />}
    <rect width={0} height={0} data-w={width} data-h={height} />
  </defs>;
}

function Backdrop({ look, uid, width, height, seed }: { look: RigLook; uid: string; width: number; height: number; seed: number }) {
  const kraft = useMemo(() => look === "collage" ? boardTexture("kraft", "#b48b5e", seed) : "", [look, seed]);
  switch (look) {
    case "collage": return <>
      <defs><pattern id={`${uid}-board`} patternUnits="userSpaceOnUse" width={384} height={384}><image href={kraft} width={384} height={384} /></pattern></defs>
      <rect width={width} height={height} fill={`url(#${uid}-board)`} />
    </>;
    case "crayon": return <RigCrayonPaper width={width} height={height} seed={seed} uid={uid} />;
    case "riso": return <RisoBackdrop uid={uid} width={width} height={height} />;
    case "ink": return <InkPaper width={width} height={height} seed={seed} />;
    case "pencil": return <PencilPaper uid={uid} width={width} height={height} seed={seed} />;
    case "watercolour": return <WatercolourRigBackdrop uid={uid} width={width} height={height} seed={seed} />;
    case "blueprint": {
      const lines: string[] = [];
      for (let x = 0; x <= width; x += 40) lines.push(`M${x} 0V${height}`);
      for (let y = 0; y <= height; y += 40) lines.push(`M0 ${y}H${width}`);
      return <>
        <rect width={width} height={height} fill="#1f4f8f" />
        <path d={lines.join("")} stroke="#9cc3ff" strokeWidth={.6} opacity={.35} />
      </>;
    }
    default: return <rect width={width} height={height} fill="#e9eef0" />;
  }
}

const TILE = 640;
const tileRand = (seed: number, k: number, i: number) => { let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 7919, 0xc2b2ae35) ^ Math.imul(i + 31, 0x27d4eb2d); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
/** One world-anchored tile of ground: its edge, its band and a few marks (tufts, pebbles), seeded by tile index so the
 * ground is the same wherever the camera looks from. */
function GroundTile({ look, uid, k, ground, depth, seed, paper }: { look: RigLook; uid: string; k: number; ground: number; depth: number; seed: number; paper?: RisoPaperFrame }) {
  const x0 = k * TILE, x1 = x0 + TILE, bottom = ground + depth;
  const edge = useMemo(() => look === "collage" ? toPathD(paperEdge([[x0 - 6, ground], [x1 + 6, ground], [x1 + 6, bottom], [x0 - 6, bottom]], { style: "torn", seed: seed + k * 31 + 5000, roughness: 4 }), true) : "", [look, x0, x1, ground, bottom, seed, k]);
  if (look === "watercolour") return <WatercolourGroundTile uid={uid} k={k} ground={ground} tile={TILE} seed={seed} />;
  const marks: ReactNode[] = [], shapes: { d: string; kind: "tuft" | "pebble" }[] = [];
  for (let i = 0; i < 5; i++) {
    const x = x0 + (i + tileRand(seed, k, i)) * TILE / 5, y = ground + 6 + tileRand(seed, k, i + 9) * Math.min(60, depth * .4), kind = tileRand(seed, k, i + 17) > .45 ? "tuft" : "pebble", s = .8 + tileRand(seed, k, i + 23) * .6;
    const d = kind === "tuft" ? `M${r2(x - 7 * s)} ${r2(y)}Q${r2(x - 5 * s)} ${r2(y - 9 * s)} ${r2(x - 3 * s)} ${r2(y - 13 * s)}M${r2(x)} ${r2(y)}Q${r2(x)} ${r2(y - 10 * s)} ${r2(x + 2 * s)} ${r2(y - 16 * s)}M${r2(x + 6 * s)} ${r2(y)}Q${r2(x + 6 * s)} ${r2(y - 7 * s)} ${r2(x + 10 * s)} ${r2(y - 11 * s)}`
      : `M${r2(x - 6 * s)} ${r2(y)}Q${r2(x)} ${r2(y - 6 * s)} ${r2(x + 6 * s)} ${r2(y)}Z`;
    const stroke = look === "blueprint" ? "#eaf3ff" : look === "riso" ? "currentColor" : look === "collage" ? "#6f5a3c" : "#9fb08f";
    shapes.push({ d, kind });
    marks.push(<path key={i} d={d} fill={kind === "pebble" && look !== "blueprint" ? stroke : "none"} stroke={stroke} strokeWidth={2} strokeLinecap="round" opacity={.8} />);
  }
  switch (look) {
    case "collage": return <g><path d={edge} fill="#ece2c8" />{marks}</g>;
    case "crayon": return <RigCrayonGroundTile uid={uid} k={k} x0={x0} x1={x1} ground={ground} depth={depth} seed={seed} marks={shapes} />;
    case "riso": return <RisoGroundTile uid={uid} k={k} ground={ground} depth={depth} seed={seed} paper={paper} tileWidth={TILE} marks={marks} />;
    case "ink": return <InkGroundTile k={k} tile={TILE} ground={ground} seed={seed} />;
    case "blueprint": return <g><path d={`M${x0} ${ground}H${x1}`} stroke="#eaf3ff" strokeWidth={1.4} />{marks}</g>;
    case "pencil": return <PencilGroundTile uid={uid} x0={x0} x1={x1} ground={ground} depth={depth} seed={seed + k * 31} />;
    default: return <g><rect x={x0} y={ground} width={TILE + .5} height={depth} fill="#cfd9c4" />{marks}</g>;
  }
}

export interface RigCamera {
  /** World point shown at the centre of the frame. */
  x: number;
  y?: number;
  zoom?: number;
}
/** A camera that tracks a rig: its root, led a little ahead in the direction it faces. */
export function followCamera(spec: RigSpec, frame: number, options: { y: number; lead?: number; zoom?: number }): RigCamera {
  const s = rootState(spec, frame);
  return { x: s.x + (options.lead ?? 0) * s.facing, y: options.y, zoom: options.zoom };
}

export interface RigSceneProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "children"> {
  look: RigLook;
  width: number;
  height: number;
  /** Ground line (y) for the board. */
  ground: number;
  frame: number;
  rigs: readonly RigSpec[];
  /** Override the look's default stop-motion cadence. */
  cadence?: number;
  showBones?: boolean;
  reducedMotion?: boolean;
  seed?: number;
  style?: CSSProperties;
  /** Extra content drawn under the figures (scenery), in world coordinates. */
  children?: ReactNode;
  /** World point at the centre of the frame (tracking shots). Without it the world and the frame coincide. */
  camera?: RigCamera;
  /** Draw the look's ground band and marks (default true). */
  showGround?: boolean;
}
/** A board in a film look with rigged figures on it. */
export function RigScene({ look, width, height, ground, frame, rigs, cadence, showBones = false, reducedMotion = false, seed = 11, style, children, camera, showGround = true, ...svg }: RigSceneProps) {
  const raw = useId(), uid = "rg" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const zoom = camera?.zoom ?? 1, cx = camera?.x ?? width / 2, cy = camera?.y ?? height / 2;
  const paper: RisoPaperFrame = { zoom, x: width / 2 - cx * zoom, y: height / 2 - cy * zoom, width, height };
  const ctx: RigLookContext = { look, uid, seed, step: boilStep(look, frame, cadence), showBones, reduced: reducedMotion, paper };
  const view = camera ? `translate(${r2(width / 2 - cx * zoom)} ${r2(height / 2 - cy * zoom)}) scale(${zoom})` : undefined;
  const left = cx - width / 2 / zoom, right = cx + width / 2 / zoom, tiles: number[] = [];
  for (let k = Math.floor(left / TILE); k * TILE < right; k++) tiles.push(k);
  const depth = Math.max(40, cy + height / 2 / zoom - ground + 40);
  return <svg {...svg} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" role={svg["aria-hidden"] ? undefined : "img"}
    aria-label={svg["aria-hidden"] ? undefined : svg["aria-label"] ?? "Rigged figures"} data-km-rig-look={look}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", ...style }}>
    <LookDefs look={look} uid={uid} width={width} height={height} seed={seed} />
    <Backdrop look={look} uid={uid} width={width} height={height} seed={seed} />
    <g transform={view} data-km-rig-world="">
      {showGround && <g data-km-rig-ground="">{tiles.map(k => <GroundTile key={k} look={look} uid={uid} k={k} ground={ground} depth={depth} seed={seed} paper={paper} />)}</g>}
      {children}
      <LookCtx.Provider value={ctx}>
        {rigs.map(r => <RigFigure key={r.id} spec={r} frame={frame} cadence={cadence} />)}
      </LookCtx.Provider>
    </g>
  </svg>;
}

function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) % 100000; }

export interface RigLayerProps { look: RigLook; spec: RigSpec; frame: number; cadence?: number; reducedMotion?: boolean; showBones?: boolean; seed?: number }
/**
 * One rigged figure as a self-contained SVG layer (its own look definitions), for embedding in another renderer
 * such as a COLLAGE1 scene or a FilmStage slot. Root keys are in the layer's coordinates.
 */
export function RigLayer({ look, spec, frame, cadence, reducedMotion = false, showBones = false, seed = 11 }: RigLayerProps) {
  const raw = useId(), uid = "rl" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const step = boilStep(look, frame, cadence);
  return <g data-km-rig-layer={look}>
    <LookDefs look={look} uid={uid} width={0} height={0} seed={seed} />
    {look === "crayon" && <defs><RigCrayonPaper width={1} height={1} seed={seed} uid={uid} /></defs>}
    <LookCtx.Provider value={{ look, uid, seed, step, showBones, reduced: reducedMotion }}>
      <RigFigure spec={spec} frame={frame} cadence={cadence} />
    </LookCtx.Provider>
  </g>;
}
