/**
 * UKIYO1 renderer: `UkiyoeScene` draws one frame of a scene as SVG.
 *
 * Print model: every colour fill is assigned to an impression by its lightness (printers went light → dark), each
 * impression lands with a fixed misregistration offset, broad blocks show wood grain, and each parallax layer gets a
 * baren-mottle filter clipped to its own ink. The key block (sumi line) is impression 0. A washi skin lies over the
 * finished print so ink sits *in* the paper. `printIn` reveals impressions in order with a baren sweep.
 */
import type { CSSProperties, ReactNode, SVGProps } from "react";
import { useId, useMemo } from "react";
import type { UkiyoePose } from "./ukiyoe-core";
import { cameraAt, cameraTransform, channelAt, clamp, clamp01, fbm1, hash01, hashSigned, lightness, loopOffsets, moveEffect, REST, seedOf, span, stepped, UKIYOE_CHANNELS, windAt } from "./ukiyoe-core";
import { carvedLine, smoothD } from "./ukiyoe-core";
import { drawCreature } from "./ukiyoe-creatures";
import { drawFigure } from "./ukiyoe-figure";
import { ANIMATED_MOTIFS, drawMotif, waveSurface } from "./ukiyoe-motifs";
import { drawParticles } from "./ukiyoe-particles";
import type { UkiyoeFill, UkiyoeGradient } from "./ukiyoe-pigments";
import { resolvePaint } from "./ukiyoe-pigments";
import type { Prim, UkiyoePattern } from "./ukiyoe-prims";
import { ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoeNode, UkiyoeSceneSpec, UkiyoeTextNode } from "./ukiyoe-scene";
import { assertUkiyoeScene, scenePalette } from "./ukiyoe-scene";
import { grainTexture, mottleTexture, washiTexture } from "./ukiyoe-texture";

export const UKIYOE_FONTS = {
  latin: '"Newsreader Variable", "Newsreader", "Iowan Old Style", Georgia, serif',
  cjk: '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Noto Serif CJK JP", serif',
};
const IMPRESSIONS = 8;

// ---- Node state ------------------------------------------------------------------------------------------------------------------

export interface NodeState { pose: UkiyoePose; visible: boolean; sweep?: number }

/** Placement of a node at a frame: rest + keys + loops + enter/exit, held on the node's cadence. */
export function nodeState(node: UkiyoeNode, frame: number, sceneCadence: number): NodeState {
  if ((node.from !== undefined && frame < node.from) || (node.to !== undefined && frame >= node.to)) return { pose: REST, visible: false };
  const cad = node.cadence ?? (node.kind === "figure" || node.kind === "creature" ? sceneCadence : 1);
  const f = stepped(frame, cad), seed = seedOf(node.id);
  const pose: UkiyoePose = { ...REST, x: node.x ?? 0, y: node.y ?? 0, rotate: node.rotate ?? 0, scale: node.scale ?? 1, opacity: node.opacity ?? 1 };
  for (const c of UKIYOE_CHANNELS) pose[c] = channelAt(node.keys, c, f, pose[c]);
  for (const l of node.loops ?? []) {
    const o = loopOffsets(l, f, seed);
    for (const [k, v] of Object.entries(o) as [keyof UkiyoePose, number][]) pose[k] = k === "scale" || k === "scaleX" || k === "scaleY" ? pose[k] * v : pose[k] + v;
  }
  let sweep: number | undefined;
  for (const [move, isExit] of [[node.enter, false], [node.exit, true]] as const) {
    if (!move) continue;
    const raw = (f - move.frame) / Math.max(1, move.duration), p = isExit ? 1 - clamp01(raw) : clamp01(raw);
    if (!isExit && raw < 0 && move.preset !== "none") return { pose, visible: false };
    if (isExit && raw > 1 && move.preset !== "none") return { pose, visible: false };
    const e = moveEffect(move, p);
    for (const [k, v] of Object.entries(e.pose) as [keyof UkiyoePose, number][]) pose[k] = k === "opacity" || k === "scale" || k === "scaleX" || k === "scaleY" ? pose[k] * v : pose[k] + v;
    if (e.sweep !== undefined && e.sweep < 1) sweep = Math.min(sweep ?? 1, e.sweep);
  }
  return { pose, visible: pose.opacity > .001, sweep };
}

// ---- Patterns ----------------------------------------------------------------------------------------------------------------------

function patternTile(p: UkiyoePattern, color: string): { w: number; h: number; body: ReactNode } {
  const s = 18 * (p.scale ?? 1), st = { fill: "none", stroke: color, strokeWidth: Math.max(.6, s * .07) } as const;
  switch (p.type) {
    case "seigaiha": {
      const arcs = (cx: number, cy: number) => [1, .75, .5, .25].map((k, i) => <circle key={`${cx}-${cy}-${i}`} cx={cx} cy={cy} r={s * k} {...st} />);
      return { w: s * 2, h: s, body: <>{arcs(0, s)}{arcs(s * 2, s)}{arcs(s, s * .5)}{arcs(0, 0)}{arcs(s * 2, 0)}</> };
    }
    case "asanoha": {
      const w = s * 1.732, h = s * 3, c = [w / 2, h / 2];
      const pts = [[0, 0], [w, 0], [0, h], [w, h], [w / 2, -h / 6], [w / 2, h + h / 6], [0, h / 2], [w, h / 2]];
      return { w, h, body: <path d={pts.map(q => `M${c[0]} ${c[1]}L${q[0]} ${q[1]}`).join("") + `M0 ${h / 2}L${w / 2} 0L${w} ${h / 2}L${w / 2} ${h}Z`} {...st} /> };
    }
    case "ichimatsu": return { w: s * 2, h: s * 2, body: <path d={`M0 0h${s}v${s}h-${s}ZM${s} ${s}h${s}v${s}h-${s}Z`} fill={color} /> };
    case "shima": return { w: s, h: s, body: <rect x={0} y={0} width={s * .32} height={s} fill={color} /> };
    case "kanoko": return { w: s, h: s, body: <><circle cx={s / 2} cy={s / 2} r={s * .26} fill="none" stroke={color} strokeWidth={s * .14} /><circle cx={0} cy={0} r={s * .26} fill="none" stroke={color} strokeWidth={s * .14} /><circle cx={s} cy={s} r={s * .26} fill="none" stroke={color} strokeWidth={s * .14} /></> };
    case "kikko": { const w = s * 1.732, h = s * 3; return { w, h, body: <path d={`M0 ${s * .5}L${w / 2} 0L${w} ${s * .5}V${s * 1.5}L${w / 2} ${s * 2}L0 ${s * 1.5}ZM${w / 2} ${s * 2}V${h}`} {...st} /> }; }
    case "yagasuri": return { w: s, h: s * 1.6, body: <path d={`M0 0L${s / 2} ${s * .5}L${s} 0V${s * .8}L${s / 2} ${s * 1.3}L0 ${s * .8}Z`} fill={color} /> };
    case "uroko": return { w: s, h: s * .866, body: <path d={`M0 ${s * .866}L${s / 2} 0L${s} ${s * .866}Z`} fill={color} /> };
    case "nami": return { w: s * 2, h: s * .8, body: <path d={`M0 ${s * .4}Q${s / 2} 0 ${s} ${s * .4}T${s * 2} ${s * .4}`} {...st} /> };
    case "tora": return { w: s * 2.2, h: s * 1.4, body: <path d={`M${s * .2} 0Q${s * .55} ${s * .5} ${s * .3} ${s * 1.4}L${s * .62} ${s * 1.4}Q${s * .85} ${s * .6} ${s * .5} 0ZM${s * 1.3} 0Q${s * 1.5} ${s * .3} ${s * 1.35} ${s * .8}L${s * 1.6} ${s * .8}Q${s * 1.75} ${s * .35} ${s * 1.55} 0Z`} fill={color} /> };
    case "sakura": {
      const petals = [0, 72, 144, 216, 288].map(a => <ellipse key={a} cx={s / 2} cy={s / 2 - s * .16} rx={s * .1} ry={s * .16} fill={color} transform={`rotate(${a} ${s / 2} ${s / 2})`} />);
      return { w: s * 1.6, h: s * 1.6, body: <>{petals}</> };
    }
  }
}

// ---- Render context ---------------------------------------------------------------------------------------------------------------

interface Ctx {
  pre: string; pal: Record<string, string>; spec: UkiyoeSceneSpec; frame: number; defs: Map<string, ReactNode>;
  reg: number; grain: number; lineScale: number; imp?: (number | undefined)[]; proof?: number; seed: number; clip: number; wind: number;
}
const paintOf = (ctx: Ctx, p: string) => resolvePaint(p, ctx.pal);

function gradientId(ctx: Ctx, g: UkiyoeGradient): string {
  const key = JSON.stringify(g), id = `${ctx.pre}g${seedOf(key).toString(36)}`;
  if (!ctx.defs.has(id)) {
    const stops = g.stops.map((s, i) => <stop key={i} offset={s[0]} stopColor={paintOf(ctx, s[1])} stopOpacity={s[2] ?? 1} />);
    if (g.type === "radial") ctx.defs.set(id, <radialGradient key={id} id={id} cx={g.center?.[0] ?? .5} cy={g.center?.[1] ?? .5} r={g.radius ?? .5}>{stops}</radialGradient>);
    else {
      const a = (g.angle ?? 90) * Math.PI / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
      ctx.defs.set(id, <linearGradient key={id} id={id} x1={.5 - dx} y1={.5 - dy} x2={.5 + dx} y2={.5 + dy}>{stops}</linearGradient>);
    }
  }
  return `url(#${id})`;
}
function fillValue(ctx: Ctx, f: UkiyoeFill): string { return typeof f === "string" ? paintOf(ctx, f) : gradientId(ctx, f); }
function fillLight(ctx: Ctx, f: UkiyoeFill): number {
  if (typeof f === "string") return lightness(paintOf(ctx, f));
  let s = 0, w = 0;
  for (const st of f.stops) { const o = st[2] ?? 1; s += lightness(paintOf(ctx, st[1])) * o; w += o; }
  return w ? s / w : 1;
}
/** Colour impressions 1..8, lightest first. */
const impressionOf = (light: number) => 1 + clamp(Math.floor((1 - light) * IMPRESSIONS), 0, IMPRESSIONS - 1);

function patternId(ctx: Ctx, p: UkiyoePattern): string {
  const color = paintOf(ctx, p.color), id = `${ctx.pre}p${seedOf(JSON.stringify(p) + color).toString(36)}`;
  if (!ctx.defs.has(id)) {
    const t = patternTile(p, color);
    ctx.defs.set(id, <pattern key={id} id={id} patternUnits="userSpaceOnUse" width={t.w} height={t.h} patternTransform={p.angle ? `rotate(${p.angle})` : undefined}>{t.body}</pattern>);
  }
  return `url(#${id})`;
}
function grainId(ctx: Ctx): string {
  const id = `${ctx.pre}grain`;
  if (!ctx.defs.has(id)) ctx.defs.set(id, <pattern key={id} id={id} patternUnits="userSpaceOnUse" width={512} height={256}><image href={grainTexture(paintOf(ctx, ctx.spec.paper?.tone ?? "paper"), ctx.seed)} width={512} height={256} /></pattern>);
  return `url(#${id})`;
}
/** Sweep mask in the element's own bounds (a baren rubbed across the block). */
function sweepMask(ctx: Ctx, v: number, key: string): string {
  const q = Math.round(clamp01(v) * 40) / 40, id = `${ctx.pre}sw${key}-${Math.round(q * 40)}`;
  if (!ctx.defs.has(id)) {
    const edge = .18;
    ctx.defs.set(id, <mask key={id} id={id} maskContentUnits="objectBoundingBox">
      <linearGradient id={id + "g"} x1={0} y1={.15} x2={1} y2={0}><stop offset={Math.max(0, q * (1 + edge) - edge)} stopColor="#fff" /><stop offset={Math.min(1, q * (1 + edge))} stopColor="#000" /></linearGradient>
      <rect x={-.02} y={-.02} width={1.04} height={1.04} fill={`url(#${id}g)`} />
    </mask>);
  }
  return `url(#${id})`;
}

function renderPrims(prims: readonly Prim[], ctx: Ctx, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  prims.forEach((p, i) => {
    const k = `${key}.${i}`;
    switch (p.t) {
      case "fill": {
        const imp = p.noPrint ? undefined : impressionOf(fillLight(ctx, p.fill));
        const vis = !ctx.imp ? 1 : ctx.imp[imp ?? IMPRESSIONS] ?? 1;
        if (ctx.proof !== undefined && imp !== undefined && imp > ctx.proof) break;
        if (vis <= 0) break;
        const off = imp === undefined || !ctx.reg ? undefined : `translate(${(hashSigned(ctx.seed, imp, 1) * ctx.reg).toFixed(2)} ${(hashSigned(ctx.seed, imp, 2) * ctx.reg * .7).toFixed(2)})`;
        const mask = vis < 1 ? sweepMask(ctx, vis, "i" + imp) : undefined;
        const g = (p.grain ?? 0) * ctx.grain;
        if (p.union && p.outline) {
          // One path: the stroke is painted first and the fill covers its inner half, so only the outer contour of
          // the overlapping shapes keeps a line.
          out.push(<path key={k} d={p.d} transform={off} mask={mask} opacity={p.opacity} fill={fillValue(ctx, p.fill)} stroke={paintOf(ctx, p.outlineColor ?? "sumi")}
            strokeWidth={p.outline * 2 * ctx.lineScale} strokeLinejoin="round" style={{ paintOrder: "stroke" }} />);
          break;
        }
        out.push(<g key={k} transform={off} mask={mask} opacity={p.opacity}>
          <path d={p.d} fill={fillValue(ctx, p.fill)} />
          {p.pattern ? <path d={p.d} fill={patternId(ctx, p.pattern)} opacity={p.pattern.opacity ?? .85} /> : null}
          {g > .01 ? <path d={p.d} fill={grainId(ctx)} opacity={clamp01(g * .32)} /> : null}
          {p.emboss ? <path d={p.d} fill="#fff" filter={`url(#${ctx.pre}emboss)`} opacity={.55} /> : null}
        </g>);
        if (p.outline && (ctx.proof === undefined || ctx.proof >= 0) && (ctx.imp?.[0] ?? 1) > 0) {
          const lv = ctx.imp?.[0] ?? 1;
          out.push(<path key={k + "o"} d={p.d} fill="none" stroke={paintOf(ctx, p.outlineColor ?? "sumi")} strokeWidth={p.outline * ctx.lineScale} strokeLinejoin="round" strokeLinecap="round"
            opacity={p.opacity} mask={lv < 1 ? sweepMask(ctx, lv, "k") : undefined} />);
        }
        break;
      }
      case "line": {
        const lv = ctx.imp?.[0] ?? 1;
        if (lv <= 0) break;
        const color = paintOf(ctx, p.color ?? "sumi");
        out.push(<path key={k} d={p.d} fill={color} opacity={(p.opacity ?? 1) * Math.min(1, ctx.lineScale)} stroke={ctx.lineScale > 1.05 ? color : undefined}
          strokeWidth={ctx.lineScale > 1.05 ? (ctx.lineScale - 1) * 1.4 : undefined} strokeLinejoin="round" mask={lv < 1 ? sweepMask(ctx, lv, "k") : undefined} />);
        break;
      }
      case "stroke": {
        const lv = ctx.imp?.[0] ?? 1;
        if (lv <= 0) break;
        out.push(<path key={k} d={p.d} fill="none" stroke={paintOf(ctx, p.color)} strokeWidth={p.width} opacity={p.opacity} strokeLinecap={p.cap ?? "round"} strokeLinejoin="round" strokeDasharray={p.dash} />);
        break;
      }
      case "dots": {
        if ((ctx.imp?.[IMPRESSIONS] ?? 1) <= 0) break;
        out.push(<path key={k} d={p.d} fill={paintOf(ctx, p.color)} opacity={p.opacity} />);
        break;
      }
      case "glow": {
        if ((ctx.imp?.[IMPRESSIONS] ?? 1) <= 0) break;
        const id = `${ctx.pre}glow${seedOf(p.color + (p.opacity ?? 1)).toString(36)}`;
        if (!ctx.defs.has(id)) ctx.defs.set(id, <radialGradient key={id} id={id}><stop offset={0} stopColor={paintOf(ctx, p.color)} stopOpacity={p.opacity ?? .6} />
          <stop offset={.35} stopColor={paintOf(ctx, p.color)} stopOpacity={(p.opacity ?? .6) * .45} /><stop offset={1} stopColor={paintOf(ctx, p.color)} stopOpacity={0} /></radialGradient>);
        out.push(<circle key={k} cx={p.cx} cy={p.cy} r={p.r} fill={`url(#${id})`} />);
        break;
      }
      case "group": out.push(<g key={k} transform={p.transform} opacity={p.opacity}>{renderPrims(p.prims, ctx, k)}</g>); break;
      case "sandwich": {
        const id = `${ctx.pre}s${ctx.clip++}`;
        ctx.defs.set(id, <path key={id} id={id} d={p.d} />);
        const lv = ctx.imp?.[0] ?? 1;
        if (lv > 0) out.push(<use key={k + "l"} href={`#${id}`} fill="none" stroke={paintOf(ctx, p.line)} strokeWidth={p.lineWidth * ctx.lineScale} strokeLinejoin="round"
          mask={lv < 1 ? sweepMask(ctx, lv, "k") : undefined} />);
        out.push(...renderPrims(p.between, ctx, k));
        out.push(<use key={k + "f"} href={`#${id}`} fill={paintOf(ctx, p.fill)} />);
        break;
      }
      case "clip": {
        const id = `${ctx.pre}c${ctx.clip++}`;
        ctx.defs.set(id, <clipPath key={id} id={id}><path d={p.d} /></clipPath>);
        out.push(<g key={k} clipPath={`url(#${id})`}>{renderPrims(p.prims, ctx, k)}</g>);
        break;
      }
    }
  });
  return out;
}

// ---- Static motif cache ----------------------------------------------------------------------------------------------------------

const staticCache = new WeakMap<object, Prim[]>();
/** The last held drawing of each animated motif: reused (same arrays, same path strings) until its inputs change. */
const heldCache = new WeakMap<object, { key: string; prims: Prim[] }>();
function motifPrims(node: Extract<UkiyoeNode, { kind: "motif" }>, frame: number, wind: number, seed: number, progress: number): Prim[] {
  if (!ANIMATED_MOTIFS.has(node.motif) && progress >= 1) {
    const hit = staticCache.get(node);
    if (hit) return hit;
    const prims = drawMotif(node.motif, node.params ?? {}, { frame: 0, wind: 0, seed, progress: 1 });
    staticCache.set(node, prims);
    return prims;
  }
  const key = `${frame}|${wind.toFixed(4)}|${seed}|${progress.toFixed(5)}`, held = heldCache.get(node);
  if (held?.key === key) return held.prims;
  const prims = drawMotif(node.motif, node.params ?? {}, { frame, wind, seed, progress });
  heldCache.set(node, { key, prims });
  return prims;
}

// ---- Text --------------------------------------------------------------------------------------------------------------------------

const isCjk = (s: string) => /[\u3000-\u9fff\uff00-\uffef]/.test(s);
function textNode(node: UkiyoeTextNode, ctx: Ctx): ReactNode {
  const color = paintOf(ctx, node.color ?? (node.style === "seal" ? "gofun" : "sumi"));
  const fill = paintOf(ctx, node.fill ?? (node.style === "seal" ? "shu" : node.style === "cartouche" ? "gofun" : "paper"));
  const cjk = isCjk(node.text), vertical = node.vertical ?? (node.style === "cartouche" && cjk) ?? false;
  const size = node.size ?? (node.style === "caption" ? 30 : node.style === "seal" ? 22 : 34);
  const font = cjk ? UKIYOE_FONTS.cjk : UKIYOE_FONTS.latin;
  const box = 2400, max = node.max ?? (node.style === "caption" ? 1200 : 900);
  const lv = ctx.imp?.[0] ?? 1;
  if (lv <= 0) return null;
  const common: CSSProperties = { fontFamily: font, color, fontSize: size, lineHeight: 1.25, letterSpacing: cjk ? ".08em" : ".01em" };
  let inner: ReactNode, justify = "flex-start", alignItems = "flex-start", x = 0, y = 0;
  if (node.style === "seal") {
    if (node.align === "end") { justify = "flex-end"; x = -box; }
    inner = <div style={{ ...common, background: fill, padding: size * .22, borderRadius: size * .16, writingMode: "vertical-rl", fontWeight: 700, lineHeight: 1.05, boxShadow: `inset 0 0 0 ${size * .09}px ${fill}, inset 0 0 0 ${size * .14}px ${color}` }}>{node.text}</div>;
  } else if (node.style === "cartouche") {
    if (node.align === "end") { justify = "flex-end"; x = -box; }
    inner = <div style={{ display: "flex", flexDirection: vertical ? "row-reverse" : "column", gap: size * .3, background: fill, padding: `${size * .5}px ${size * .4}px`, border: `${Math.max(1.5, size * .06)}px solid ${paintOf(ctx, "sumi")}`,
      boxShadow: `inset 0 0 0 ${size * .12}px ${fill}, inset 0 0 0 ${size * .15}px ${paintOf(ctx, "sumi")}`, maxWidth: vertical ? undefined : max, maxHeight: vertical ? max : undefined }}>
      <div style={{ ...common, writingMode: vertical ? "vertical-rl" : undefined, fontWeight: 600 }}>{node.text}</div>
      {node.sub ? <div style={{ ...common, fontFamily: isCjk(node.sub) ? UKIYOE_FONTS.cjk : UKIYOE_FONTS.latin, fontSize: size * .42, opacity: .85, writingMode: vertical ? "vertical-rl" : undefined, letterSpacing: ".16em", textTransform: isCjk(node.sub) ? undefined : "uppercase" }}>{node.sub}</div> : null}
    </div>;
  } else if (node.style === "caption") {
    justify = "center"; alignItems = "flex-end"; x = -box / 2; y = -box;
    inner = <div style={{ ...common, maxWidth: max, background: fill, padding: `${size * .32}px ${size * .7}px ${size * .38}px`, textAlign: "center", boxShadow: `0 0 0 1px ${paintOf(ctx, "usuzumi")}55`, display: "flex", gap: size * .5, alignItems: "center" }}>
      <span aria-hidden style={{ flex: "none", width: size * .55, height: size * .55, background: paintOf(ctx, "shu"), borderRadius: 2 }} />
      <span>{node.text}{node.sub ? <span style={{ display: "block", fontSize: size * .6, opacity: .8 }}>{node.sub}</span> : null}</span>
    </div>;
  } else {
    const a = node.align ?? "start";
    justify = a === "middle" ? "center" : a === "end" ? "flex-end" : "flex-start"; x = a === "middle" ? -box / 2 : a === "end" ? -box : 0;
    inner = <div style={{ ...common, maxWidth: max, writingMode: vertical ? "vertical-rl" : undefined, textAlign: a === "middle" ? "center" : a === "end" ? "right" : "left" }}>{node.text}</div>;
  }
  return <foreignObject x={x} y={y} width={box} height={box} style={{ overflow: "visible", pointerEvents: "none" }} mask={lv < 1 ? sweepMask(ctx, lv, "k") : undefined}>
    <div style={{ width: box, height: box, display: "flex", justifyContent: justify, alignItems }}>{inner}</div>
  </foreignObject>;
}

// ---- Scene -----------------------------------------------------------------------------------------------------------------------

export interface UkiyoeSceneProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  spec: UkiyoeSceneSpec;
  frame: number;
  reducedMotion?: boolean;
  /** Printer's proof: show the key block plus colour impressions 1..proof only (0 = key block alone). */
  proof?: number;
  /** Override the scene's print-pass progress 0..1 (e.g. a scrubber in a lab). */
  printProgress?: number;
}

const validated = new WeakSet<object>();

export function UkiyoeScene({ spec, frame, reducedMotion = false, proof, printProgress, style, ...rest }: UkiyoeSceneProps) {
  if (!validated.has(spec)) { assertUkiyoeScene(spec); validated.add(spec); }
  const pre = "uk" + useId().replace(/[^A-Za-z0-9]/g, "") + "-";
  const pal = useMemo(() => scenePalette(spec), [spec]);
  const f = reducedMotion ? spec.durationFrames - 1 : clamp(Math.floor(frame), 0, spec.durationFrames - 1);
  const W = spec.width, H = spec.height, seed = spec.seed;
  const print = spec.print ?? {};
  const wind = windAt(spec.wind, f, seed);
  const ctx: Ctx = { pre, pal, spec, frame: f, defs: new Map(), reg: print.registration ?? 1.6, grain: print.grain ?? .7, lineScale: print.line ?? 1, seed, clip: 0, wind, proof };
  // Print pass: key block over the first 28%, then colour impressions overlapping in light → dark order.
  const pIn = printProgress ?? (spec.printIn && !reducedMotion ? span(f, spec.printIn.frame, spec.printIn.frame + spec.printIn.duration) : 1);
  if (pIn < 1) {
    const imp: number[] = [span(pIn, 0, .26)];
    for (let k = 1; k <= IMPRESSIONS; k++) { const a = .22 + (k - 1) * .095; imp.push(span(pIn, a, a + .16)); }
    ctx.imp = imp;
  }
  const cam = cameraAt(spec.camera, f, W, H, seed);
  const cadence = spec.cadence ?? 2;
  const byId = new Map(spec.nodes.map(n => [n.id, n]));
  const children = new Map<string | undefined, UkiyoeNode[]>();
  for (const n of spec.nodes) { const list = children.get(n.parent) ?? []; list.push(n); children.set(n.parent, list); }

  const renderNode = (node: UkiyoeNode): ReactNode => {
    const st = nodeState(node, f, cadence);
    if (!st.visible) return null;
    const ws = node.windScale ?? 1, nseed = (seed ^ seedOf(node.id)) >>> 0;
    const nf = stepped(f, node.cadence ?? (node.kind === "motif" && ANIMATED_MOTIFS.has(node.motif) ? cadence : node.kind === "particles" ? 1 : 1));
    const p = st.pose;
    let content: ReactNode = null, extraX = 0, extraY = 0, dirScale = 1;
    switch (node.kind) {
      case "block": {
        const d = node.d ?? (node.shape?.type === "rect" ? rectD(-node.shape.width / 2, -node.shape.height / 2, node.shape.width, node.shape.height)
          : node.shape?.type === "ellipse" ? ellipseD(0, 0, node.shape.rx, node.shape.ry) : smoothD(node.shape?.type === "polygon" ? node.shape.points : [], true, 0));
        content = renderPrims([{ t: "fill", d, fill: node.fill, outline: node.line ?? 1.6, outlineColor: node.lineColor, pattern: node.pattern, grain: node.grain, emboss: node.emboss }], ctx, node.id);
        break;
      }
      case "line": {
        const pts = node.smooth === false ? node.points : node.points;
        const prog = p.progress < 1 ? pts.slice(0, Math.max(2, Math.ceil(pts.length * p.progress))) : pts;
        content = renderPrims([{ t: "line", d: carvedLine(prog, node.width, { taper: node.taper ?? "both", seed: nseed }), color: node.color }], ctx, node.id);
        break;
      }
      case "motif": {
        // A motif held on twos reads everything it is drawn from (wind, progress) at the held frame, so the drawing
        // really is identical between exposures; its placement (x, y, rotation) still moves on every frame.
        const heldWind = nf === f ? wind : windAt(spec.wind, nf, seed), heldProgress = nf === f ? p.progress : channelAt(node.keys, "progress", nf, p.progress);
        content = renderPrims(motifPrims(node, nf, heldWind * ws, nseed, heldProgress), ctx, node.id);
        break;
      }
      case "particles": content = renderPrims(drawParticles(node, stepped(f, node.cadence ?? 1), wind * ws, nseed), ctx, node.id); break;
      case "figure": {
        const fig = drawFigure({ look: node.look, actions: node.actions, facing: node.facing }, stepped(f, node.cadence ?? cadence), wind * ws, nseed);
        extraX = fig.x; extraY = fig.y; dirScale = fig.dir * fig.squeeze;
        content = renderPrims(fig.prims, ctx, node.id);
        break;
      }
      case "creature": {
        const cr = drawCreature({ species: node.species, look: node.look, actions: node.actions, facing: node.facing }, stepped(f, node.cadence ?? cadence), wind * ws, nseed);
        extraX = cr.x; extraY = cr.y; dirScale = cr.dir;
        content = renderPrims(cr.prims, ctx, node.id);
        break;
      }
      case "text": content = textNode(node, ctx); break;
      case "group": break;
    }
    let rideY = 0, rideRot = 0;
    if (node.ride && !node.parent) {
      const target = byId.get(node.ride.on);
      const ts = target && target.kind === "motif" && target.motif === "wave" ? nodeState(target, f, cadence) : undefined;
      if (target && target.kind === "motif" && ts?.visible) {
        // Sampled on every frame (not the wave's held drawings) at nine points along the waterline, so a hull crossing
        // a steep face rises and pitches smoothly. Height is the mean; pitch is the least-squares slope.
        const tctx = { frame: f, wind: 0, seed: (seed ^ seedOf(target.id)) >>> 0, progress: channelAt(target.keys, "progress", f, 1) };
        const sxT = ts.pose.scale * ts.pose.scaleX * (target.flip ? -1 : 1) || 1, syT = ts.pose.scale * ts.pose.scaleY;
        const hAt = (wx: number) => waveSurface(target.params ?? {}, tctx, (wx - ts.pose.x) / sxT) * syT;
        // The rider floats at its own water level until the wave's surface rises above it (soft blend, no pop).
        const sill = ts.pose.y - p.y - extraY, soft = (h: number) => { const d = (h - sill) / 14; return d > 30 ? h - sill : 14 * Math.log1p(Math.exp(d)); };
        const x0 = p.x + extraX, half = (node.ride.span ?? 240) / 2, N = 9;
        let sum = 0, sxy = 0, sxx = 0;
        for (let i = 0; i < N; i++) { const dx = (i / (N - 1) * 2 - 1) * half, h = soft(hAt(x0 + dx)); sum += h; sxy += dx * h; sxx += dx * dx; }
        rideY = -sum / N * (node.ride.amount ?? 1);
        rideRot = -Math.atan(sxy / sxx) * 180 / Math.PI * (node.ride.tilt ?? .7);
      }
    }
    const kids = (children.get(node.id) ?? []).map(c => <g key={c.id}>{renderNode(c)}</g>);
    const sx = p.scale * p.scaleX * (node.flip ? -1 : 1) * dirScale, sy = p.scale * p.scaleY;
    const pv = node.pivot ?? [0, 0];
    const rotate = p.rotate + rideRot;
    const t = `translate(${(p.x + extraX).toFixed(2)} ${(p.y + extraY + rideY).toFixed(2)})` + (rotate ? ` rotate(${rotate.toFixed(2)})` : "")
      + (sx !== 1 || sy !== 1 ? ` translate(${pv[0]} ${pv[1]}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-pv[0]} ${-pv[1]})` : "");
    return <g transform={t} opacity={p.opacity < 1 ? p.opacity : undefined} style={node.blend && node.blend !== "normal" ? { mixBlendMode: node.blend } : undefined} mask={st.sweep !== undefined ? sweepMask(ctx, st.sweep, "n" + seedOf(node.id).toString(36)) : undefined} data-node={node.id}>
      {content}{kids}
    </g>;
  };

  // Top-level nodes grouped into runs of equal parallax depth; each run is one layer with its own mottle.
  const top = children.get(undefined) ?? [];
  const layers: { depth: number; nodes: UkiyoeNode[] }[] = [];
  for (const n of top) {
    const d = n.depth ?? 1, last = layers[layers.length - 1];
    if (last && last.depth === d) last.nodes.push(n); else layers.push({ depth: d, nodes: [n] });
  }
  const mottle = print.mottle ?? .55, tone = paintOf(ctx, spec.paper?.tone ?? "paper");
  const mottleId = `${pre}mottle`;
  const body = layers.map((layer, li) => {
    const inner = layer.nodes.map(n => <g key={n.id}>{renderNode(n)}</g>);
    return layer.depth === 0 ? <g key={li}>{inner}</g> : <g key={li} transform={cameraTransform(cam, W, H, layer.depth)}>{inner}</g>;
  });
  // Baren mottle: paper-coloured blots and specks laid over the printed picture in the paper's own plane (it pans
  // with the washi). On bare paper they vanish; on ink they read as uneven pressure. One patterned sheet instead of
  // a filter per layer, which keeps dense scenes at full frame rate. Frame-pinned overlays that close the scene
  // (captions, titles, washes) stay above it, so text is never speckled.
  let overlaysFrom = layers.length;
  while (overlaysFrom > 0 && layers[overlaysFrom - 1].depth === 0) overlaysFrom--;

  const fibre = spec.paper?.fibre ?? .6, age = spec.paper?.age ?? .35;
  const mount = spec.mount?.kind ?? "none", margin = spec.mount?.margin ?? (mount === "scroll" ? Math.round(H * .07) : Math.round(Math.min(W, H) * .045));
  const inner = mount === "none" ? { x: 0, y: 0, w: W, h: H } : mount === "scroll" ? { x: 0, y: margin, w: W, h: H - margin * 2 } : { x: margin, y: margin, w: W - margin * 2, h: H - margin * 2 };
  const paperShift = cameraTransform(cam, W, H, 1);
  const tileSize = 384;
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" style={{ display: "block", background: tone, ...style }} {...rest}>
    <defs>
      <pattern id={mottleId} patternUnits="userSpaceOnUse" width={256} height={256}><image href={mottleTexture(tone, seed)} width={256} height={256} /></pattern>
      <filter id={`${pre}emboss`} x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur in="SourceAlpha" stdDeviation={1.6} result="b" />
        <feDiffuseLighting in="b" surfaceScale={2.2} diffuseConstant={1} lightingColor="#fff" result="l"><feDistantLight azimuth={235} elevation={42} /></feDiffuseLighting>
        {/* Keep only the light-facing relief: flat paper (N·L ≈ 0.67) maps to zero alpha, so large fills never grey. */}
        <feColorMatrix in="l" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -2.05" result="hi" />
        <feComposite in="hi" in2="SourceAlpha" operator="in" />
      </filter>
      <pattern id={`${pre}washi`} patternUnits="userSpaceOnUse" width={tileSize} height={tileSize}><image href={washiTexture(tone, seed, fibre)} width={tileSize} height={tileSize} /></pattern>
      <radialGradient id={`${pre}age`} cx=".5" cy=".5" r=".75"><stop offset=".55" stopColor={paintOf(ctx, "kincha")} stopOpacity={0} /><stop offset="1" stopColor={paintOf(ctx, "kincha")} stopOpacity={.32 * age} /></radialGradient>
      <clipPath id={`${pre}inner`}><rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} /></clipPath>
      {[...ctx.defs.values()]}
    </defs>
    <g clipPath={mount === "none" ? undefined : `url(#${pre}inner)`}>
      <rect width={W} height={H} fill={tone} />
      {body.slice(0, overlaysFrom)}
      {mottle > .01 ? <g transform={paperShift} opacity={clamp(mottle, 0, 1) * .62}><rect x={cam.x - W * 2} y={cam.y - H * 2} width={W * 4} height={H * 4} fill={`url(#${mottleId})`} /></g> : null}
      {body.slice(overlaysFrom)}
      <g transform={paperShift}><rect x={cam.x - W * 2} y={cam.y - H * 2} width={W * 4} height={H * 4} fill={`url(#${pre}washi)`} /></g>
    </g>
    {mount === "print" ? <g>
      <path d={`M0 0H${W}V${H}H0Z M${inner.x} ${inner.y}v${inner.h}h${inner.w}v${-inner.h}Z`} fill={tone} fillRule="evenodd" />
      <rect x={0} y={0} width={W} height={H} fill={`url(#${pre}washi)`} opacity={.9} />
      <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill="none" stroke={paintOf(ctx, "sumi")} strokeWidth={Math.max(1.5, W / 900)} />
    </g> : null}
    {mount === "scroll" ? scrollBands(ctx, W, H, margin, cam.x) : null}
    <rect width={W} height={H} fill={`url(#${pre}age)`} style={{ mixBlendMode: "multiply" }} pointerEvents="none" />
  </svg>;
}

/** Handscroll mounting: brocade bands top and bottom whose pattern travels with the scroll. */
function scrollBands(ctx: Ctx, W: number, H: number, m: number, camX: number): ReactNode {
  const silk = paintOf(ctx, ctx.spec.mount?.color ?? "kincha"), id = `${ctx.pre}brocade`;
  const pat = <pattern id={id} patternUnits="userSpaceOnUse" width={64} height={36} patternTransform={`translate(${(-camX % 64).toFixed(1)} 0)`}>
    <rect width={64} height={36} fill={silk} />
    <path d="M0 18Q16 4 32 18T64 18" fill="none" stroke={paintOf(ctx, "kin")} strokeWidth={2} opacity={.8} />
    <circle cx={32} cy={10} r={3} fill={paintOf(ctx, "gofun")} opacity={.5} /><circle cx={0} cy={28} r={3} fill={paintOf(ctx, "gofun")} opacity={.5} /><circle cx={64} cy={28} r={3} fill={paintOf(ctx, "gofun")} opacity={.5} />
  </pattern>;
  const edge = paintOf(ctx, "kogecha");
  return <g>
    <defs>{pat}</defs>
    <rect x={0} y={0} width={W} height={m} fill={`url(#${id})`} />
    <rect x={0} y={H - m} width={W} height={m} fill={`url(#${id})`} />
    <rect x={0} y={m - 3} width={W} height={3} fill={edge} /><rect x={0} y={H - m} width={W} height={3} fill={edge} />
    <rect x={0} y={m} width={W} height={10} fill={edge} opacity={.12} /><rect x={0} y={H - m - 10} width={W} height={10} fill={edge} opacity={.12} />
  </g>;
}

export { fbm1 as _fbm1, hash01 as _hash01 };
