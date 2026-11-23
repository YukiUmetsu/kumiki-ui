/**
 * RIG1 painters: one evaluated rig, drawn in any film look.
 *
 * The rig decides what moves; a painter decides the medium. `RigScene` draws a board for the look and any number
 * of rigged figures on it; `RigFigure` draws one figure inside an existing SVG (pass the scene's `RigLookContext`).
 *   flat      clean vector fills, far side shaded, soft contact shadows
 *   collage   scissor-cut paper parts with fibre, lift shadows and halftone on the far side
 *   crayon    wax fills and dry wax outlines on toothy paper, redrawn on held poses
 *   riso      two spot-ink plates in misregistration, screened tints, multiply overprint
 *   ink       wet ink washes with bleeding edges and a dry brush outline
 *   blueprint white technical line work on a blue grid, bones and joints shown
 *   watercolour transparent washes on cold-press paper, dried edges, granulation, pencil underdrawing (rig-look-watercolour.tsx)
 */
import { createContext, useContext, useId, useMemo } from "react";
import type { CSSProperties, ReactNode, SVGProps } from "react";
import type { RigFrame, RigPartFrame } from "./rig-evaluate";
import { evaluateRig, matrixAttr, rootState, shapePath } from "./rig-evaluate";
import type { RigRole, RigShape, RigSpec } from "./rig-spec";
import { flattenPath, paperEdge, toPathD } from "../video/collage/collage-geometry";
import { boardTexture, fiberTexture } from "../video/collage/collage-texture";
import { Paper, WaxLine, WaxRegion } from "../video/materials/crayon-react";
import { WatercolourGroundTile, WatercolourRigBackdrop, WatercolourRigBody, WatercolourRigDefs } from "./rig-look-watercolour";

export type RigLook = "flat" | "collage" | "crayon" | "riso" | "ink" | "blueprint" | "watercolour";
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
  { id: "watercolour", label: "Watercolour", cadence: 1, boil: 1 },
];
const lookOf = (look: RigLook) => RIG_LOOKS.find(l => l.id === look)!;
/** Texture redraw step for a frame: on the motion cadence or the medium's boil, whichever is slower. */
const boilStep = (look: RigLook, frame: number, cadence?: number) => Math.floor(frame / Math.max(1, cadence ?? 1, lookOf(look).boil));

export interface RigLookContext { look: RigLook; uid: string; seed: number; step: number; showBones: boolean; reduced: boolean; inkPass?: "wash" | "line" }
const LookCtx = createContext<RigLookContext | null>(null);

// ---- Colour --------------------------------------------------------------------------------------------------------------------

const hexRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
/** Mix toward white (k > 0) or ink (k < 0). */
export function shade(hex: string, k: number): string {
  const [r, g, b] = hexRgb(hex), t = k >= 0 ? 255 : 24, a = Math.min(1, Math.abs(k));
  return rgbHex(r + (t - r) * a, g + (t - g) * a, b + (t - b) * a);
}
const lum = (hex: string) => { const [r, g, b] = hexRgb(hex); return (.299 * r + .587 * g + .114 * b) / 255; };
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

function FlatPart({ spec, p }: { spec: RigSpec; p: RigPartFrame }) {
  const c = partColor(spec, p), fill = p.far ? shade(c, -.2) : c, d = pathOf(p.shape);
  if (p.line) return <path d={d} fill="none" stroke={fill} strokeWidth={p.lineWidth ?? 1} />;
  if (p.role === "smoke") return <path d={d} fill={fill} opacity={.75} />;
  return <>
    <path d={d} fill={fill} />
    <path d={d} fill="none" stroke={shade(fill, -.28)} strokeWidth={.9} vectorEffect="non-scaling-stroke" opacity={.55} />
  </>;
}

function CollagePart({ spec, p, ctx }: { spec: RigSpec; p: RigPartFrame; ctx: RigLookContext }) {
  const c = partColor(spec, p), fill = p.far ? shade(c, -.16) : c;
  if (p.line) return <path d={pathOf(p.shape)} fill="none" stroke={shade(fill, -.2)} strokeWidth={(p.lineWidth ?? 1) * 1.4} />;
  const d = cutPath(p.shape, hashStr(spec.id + p.id), p.role === "smoke" || p.role === "membrane" || p.role === "sail");
  return <>
    <path d={d} fill="#1c1208" opacity={.28} transform="translate(1.6 2.4)" filter={`url(#${ctx.uid}-soft)`} />
    <path d={d} fill={fill} />
    {p.far && <path d={d} fill={`url(#${ctx.uid}-dots)`} opacity={.35} />}
    <path d={d} fill={`url(#${ctx.uid}-fibre)`} opacity={.55} style={{ mixBlendMode: "soft-light" }} />
  </>;
}

function CrayonPart({ spec, p, ctx }: { spec: RigSpec; p: RigPartFrame; ctx: RigLookContext }) {
  const c = partColor(spec, p), base = p.far ? shade(c, -.14) : c, d = pathOf(p.shape);
  // Each held pose is a fresh drawing: the wax seed advances with the step, so the fill boils like hand-redrawn frames.
  const seed = hashStr(spec.id + p.id) + (ctx.reduced ? 0 : ctx.step % 3) * 101;
  if (p.line) return <WaxLine d={d} color={shade(base, -.25)} width={(p.lineWidth ?? 1) * 1.6} frame={2} first={0} last={1} reduced seed={seed} />;
  const b = boundsOf(p.shape);
  if (b.width < 3 || b.height < 3) return <path d={d} fill={base} />;
  return <WaxRegion d={d} bounds={b} colors={[base, shade(base, -.3), shade(base, .22)]} seed={seed} pressure={.86} tooth={ctx.uid + "-tooth"}
    frame={2} first={0} last={1} reduced spacing={Math.max(4, Math.min(9, Math.min(b.width, b.height) / 3))} angle={-22} />;
}

/** Split a colour into two spot inks: warm into the pink plate, cool into the blue, darkness into both. */
function risoSplit(hex: string): [number, number] {
  // Warm hues go to the fluorescent pink plate, cool hues to blue; darkness adds both, and only near-black is solid blue.
  const [r, g, b] = hexRgb(hex), dark = 1 - lum(hex), warm = Math.max(0, Math.min(1, .5 + (r - b) / 300 + (r - g) / 600));
  const pink = Math.min(1, dark * .25 + warm * (.25 + dark * .9)), blue = Math.min(1, dark * (.2 + (1 - warm) * .8) + (dark > .78 ? .4 : 0));
  return [pink, blue];
}
const RISO_LEVELS = [.15, .3, .5, .72, 1];
function RisoPart({ spec, p, ctx, plate }: { spec: RigSpec; p: RigPartFrame; ctx: RigLookContext; plate: 0 | 1 }) {
  const c = partColor(spec, p), cov = risoSplit(p.far ? shade(c, -.15) : c)[plate];
  if (cov < .08) return null;
  const level = RISO_LEVELS.reduce((best, l) => Math.abs(l - cov) < Math.abs(best - cov) ? l : best, RISO_LEVELS[0]);
  const fill = level >= 1 ? (plate ? "#0078bf" : "#ff48b0") : `url(#${ctx.uid}-riso${plate}-${Math.round(level * 100)})`;
  const d = pathOf(p.shape);
  return p.line ? <path d={d} fill="none" stroke={plate ? "#0078bf" : "#ff48b0"} strokeWidth={p.lineWidth ?? 1} /> : <path d={d} fill={fill} />;
}

function InkPart({ spec, p, ctx }: { spec: RigSpec; p: RigPartFrame; ctx: RigLookContext }) {
  const c = partColor(spec, p), tone = Math.min(.92, (1 - lum(c)) * .95 + .08) * (p.far ? .7 : 1), d = pathOf(p.shape);
  const tint = shade(rgbHex(...hexRgb(c).map(v => v * .35 + 40 * .65) as [number, number, number]), -.1);
  if (p.line) return <path d={d} fill="none" stroke="#1b1a1f" strokeWidth={(p.lineWidth ?? 1) * 1.2} opacity={.8} />;
  // Wash: opaque inside its own layer group (the group carries the transparency), so overlapping parts of one
  // figure read as one continuous wash instead of darkening at every joint. Outlines go in a second pass.
  return ctx.inkPass === "wash" ? <path d={d} fill={tint} fillOpacity={Math.min(1, tone * 1.15)} />
    : p.role === "smoke" ? null : <path d={d} fill="none" stroke="#1b1a1f" strokeWidth={1.5} strokeLinejoin="round" opacity={.72} vectorEffect="non-scaling-stroke" />;
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
  const shadowFill = ctx.look === "blueprint" ? "none" : ctx.look === "riso" ? "#0078bf" : ctx.look === "watercolour" ? "#3c4776" : "#1c1208";
  const contacts = <g data-km-rig-contacts="">{f.contacts.map(([x, y], i) => <ellipse key={i} cx={r2(x)} cy={r2(y + 1)} rx={r2(14 * f.root.scale)} ry={r2(3.2 * f.root.scale)} fill={shadowFill}
    opacity={ctx.look === "riso" ? .25 : .16} filter={`url(#${ctx.uid}-soft)`} />)}</g>;
  const draw = (p: RigPartFrame, plate?: 0 | 1) => {
    switch (ctx.look) {
      case "collage": return <CollagePart spec={spec} p={p} ctx={ctx} />;
      case "crayon": return <CrayonPart spec={spec} p={p} ctx={ctx} />;
      case "riso": return <RisoPart spec={spec} p={p} ctx={ctx} plate={plate!} />;
      case "ink": return <InkPart spec={spec} p={p} ctx={ctx} />;
      case "blueprint": return <BlueprintPart p={p} />;
      default: return <FlatPart spec={spec} p={p} />;
    }
  };
  const wrap = (p: RigPartFrame, node: ReactNode) => <g key={p.id} data-km-rig-part={p.id} transform={matrixAttr(p.matrix)} opacity={p.opacity < 1 ? r2(p.opacity) : undefined}>{node}</g>;
  const body = ctx.look === "watercolour" ? <WatercolourRigBody spec={spec} frame={f} parts={parts} uid={ctx.uid} seed={ctx.seed} />
    : ctx.look === "ink"
    // Wash pass flattened in one group, bled once and laid down translucent; then the dry outline pass on top.
    ? <>
        <g filter={`url(#${ctx.uid}-bleed)`} opacity={.66} style={{ mixBlendMode: "multiply" }}>
          {parts.map(p => wrap(p, <InkPart spec={spec} p={p} ctx={{ ...ctx, inkPass: "wash" }} />))}
        </g>
        {/* One brush contour around the whole silhouette (traced from the union of the parts), not a line per part,
            plus brush lines only where a part reads as its own shape: eyes, mouths, details, far limbs. */}
        <g filter={`url(#${ctx.uid}-contour)`}>{parts.filter(p => p.role !== "smoke").map(p => wrap(p, <path d={pathOf(p.shape)} fill="#000" />))}</g>
        <g filter={`url(#${ctx.uid}-dry)`}>{parts.filter(p => p.role === "eye" || p.role === "mouth" || p.role === "detail" || p.line).map(p => wrap(p, <InkPart spec={spec} p={p} ctx={{ ...ctx, inkPass: "line" }} />))}</g>
      </>
    : ctx.look === "riso"
    // Two plates printed separately, each a touch out of register, overprinting by multiply.
    ? <>{([0, 1] as const).map(plate => <g key={plate} transform={plate ? "translate(1.6 -1.1)" : "translate(-.8 .6)"} style={{ mixBlendMode: "multiply" }} opacity={.92}>
        {parts.map(p => <g key={p.id} transform={matrixAttr(p.matrix)} opacity={p.opacity < 1 ? r2(p.opacity) : undefined}>{draw(p, plate)}</g>)}
      </g>)}</>
    : parts.map(p => <g key={p.id} data-km-rig-part={p.id} transform={matrixAttr(p.matrix)} opacity={p.opacity < 1 ? r2(p.opacity) : undefined}>{draw(p)}</g>);
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
    {look === "riso" && ([0, 1] as const).flatMap(plate => RISO_LEVELS.filter(l => l < 1).map(l => {
      const cell = 5, r = Math.sqrt(l / Math.PI) * cell * 1.05;
      return <pattern key={`${plate}-${l}`} id={`${uid}-riso${plate}-${Math.round(l * 100)}`} patternUnits="userSpaceOnUse" width={cell} height={cell} patternTransform={`rotate(${plate ? 75 : 15})`}>
        <circle cx={cell / 2} cy={cell / 2} r={r} fill={plate ? "#0078bf" : "#ff48b0"} />
      </pattern>;
    }))}
    {look === "ink" && <>
      <filter id={`${uid}-bleed`} x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves={3} seed={seed % 97} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={7} /><feGaussianBlur stdDeviation={.7} /></filter>
      <filter id={`${uid}-dry`} x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={1} seed={(seed + 5) % 97} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={2.4} /></filter>
      {/* Silhouette contour: grow the union's alpha, subtract the original, roughen like a dry brush, ink it. */}
      <filter id={`${uid}-contour`} x="-10%" y="-10%" width="120%" height="120%">
        <feMorphology in="SourceAlpha" operator="dilate" radius={1.5} result="grown" />
        <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
        <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves={2} seed={(seed + 9) % 97} result="n" />
        <feDisplacementMap in="ring" in2="n" scale={2.6} result="rough" />
        <feFlood floodColor="#1b1a1f" floodOpacity={.82} />
        <feComposite in2="rough" operator="in" />
      </filter>
    </>}
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
    case "crayon": return <Paper width={width} height={height} seed={seed} tooth={uid + "-tooth"} strength={.6} color="#f6ecd6" />;
    case "riso": return <rect width={width} height={height} fill="#f4efe1" />;
    case "ink": return <rect width={width} height={height} fill="#f3eee2" />;
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
function GroundTile({ look, uid, k, ground, depth, seed }: { look: RigLook; uid: string; k: number; ground: number; depth: number; seed: number }) {
  const x0 = k * TILE, x1 = x0 + TILE, bottom = ground + depth;
  const edge = useMemo(() => look === "collage" ? toPathD(paperEdge([[x0 - 6, ground], [x1 + 6, ground], [x1 + 6, bottom], [x0 - 6, bottom]], { style: "torn", seed: seed + k * 31 + 5000, roughness: 4 }), true) : "", [look, x0, x1, ground, bottom, seed, k]);
  if (look === "watercolour") return <WatercolourGroundTile uid={uid} k={k} ground={ground} tile={TILE} seed={seed} />;
  const marks: ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    const x = x0 + (i + tileRand(seed, k, i)) * TILE / 5, y = ground + 6 + tileRand(seed, k, i + 9) * Math.min(60, depth * .4), kind = tileRand(seed, k, i + 17) > .45 ? "tuft" : "pebble", s = .8 + tileRand(seed, k, i + 23) * .6;
    const d = kind === "tuft" ? `M${r2(x - 7 * s)} ${r2(y)}Q${r2(x - 5 * s)} ${r2(y - 9 * s)} ${r2(x - 3 * s)} ${r2(y - 13 * s)}M${r2(x)} ${r2(y)}Q${r2(x)} ${r2(y - 10 * s)} ${r2(x + 2 * s)} ${r2(y - 16 * s)}M${r2(x + 6 * s)} ${r2(y)}Q${r2(x + 6 * s)} ${r2(y - 7 * s)} ${r2(x + 10 * s)} ${r2(y - 11 * s)}`
      : `M${r2(x - 6 * s)} ${r2(y)}Q${r2(x)} ${r2(y - 6 * s)} ${r2(x + 6 * s)} ${r2(y)}Z`;
    const stroke = look === "blueprint" ? "#eaf3ff" : look === "riso" ? "#0078bf" : look === "crayon" ? "#7d6a45" : look === "ink" ? "#2a2a30" : look === "collage" ? "#6f5a3c" : "#9fb08f";
    marks.push(look === "crayon"
      ? <WaxLine key={i} d={d} color={stroke} width={2.4} frame={2} first={0} last={1} reduced seed={seed + k * 13 + i} />
      : <path key={i} d={d} fill={kind === "pebble" && look !== "blueprint" && look !== "ink" ? stroke : "none"} stroke={stroke} strokeWidth={look === "ink" ? 1.6 : 2} strokeLinecap="round" opacity={look === "ink" ? .55 : .8}
        filter={look === "ink" ? `url(#${uid}-dry)` : undefined} />);
  }
  switch (look) {
    case "collage": return <g><path d={edge} fill="#ece2c8" />{marks}</g>;
    case "crayon": return <g><WaxLine d={`M${x0} ${ground + 2} C${x0 + TILE * .3} ${ground - 3} ${x0 + TILE * .6} ${ground + 5} ${x1} ${ground + 2}`} color="#8a6b4a" width={4} frame={2} first={0} last={1} reduced seed={seed + k} />{marks}</g>;
    case "riso": return <g><rect x={x0} y={ground} width={TILE + .5} height={depth} fill={`url(#${uid}-riso1-15)`} opacity={.9} />{marks}</g>;
    case "ink": return <g><path d={`M${x0} ${ground + 3} C${x0 + TILE * .25} ${ground - 4} ${x0 + TILE * .55} ${ground + 6} ${x1} ${ground + 3}`} fill="none" stroke="#2a2a30" strokeWidth={2.2} opacity={.5} filter={`url(#${uid}-dry)`} />{marks}</g>;
    case "blueprint": return <g><path d={`M${x0} ${ground}H${x1}`} stroke="#eaf3ff" strokeWidth={1.4} />{marks}</g>;
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
  const ctx: RigLookContext = { look, uid, seed, step: boilStep(look, frame, cadence), showBones, reduced: reducedMotion };
  const zoom = camera?.zoom ?? 1, cx = camera?.x ?? width / 2, cy = camera?.y ?? height / 2;
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
      {showGround && <g data-km-rig-ground="">{tiles.map(k => <GroundTile key={k} look={look} uid={uid} k={k} ground={ground} depth={depth} seed={seed} />)}</g>}
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
    {look === "crayon" && <defs><Paper width={1} height={1} seed={seed} tooth={uid + "-tooth"} strength={.6} /></defs>}
    <LookCtx.Provider value={{ look, uid, seed, step, showBones, reduced: reducedMotion }}>
      <RigFigure spec={spec} frame={frame} cadence={cadence} />
    </LookCtx.Provider>
  </g>;
}
