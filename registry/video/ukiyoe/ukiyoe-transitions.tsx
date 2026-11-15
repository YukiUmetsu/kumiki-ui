/**
 * UKIYO1 native transitions.
 *
 * `UkiyoeKasumi` — the picture-scroll convention for passing time: bands of gold (or white) mist sweep across the
 * frame from right to left (the reading direction of a handscroll), cover the outgoing scene, and leave the incoming
 * one behind their trailing edges. Each band is a stepped suyari-gasumi shape with wood-grain and soft ends.
 */
import type { SVGProps } from "react";
import { useId } from "react";
import { clamp01, ease, hash01, lerp } from "./ukiyoe-core";
import { resolvePaint } from "./ukiyoe-pigments";
import { UkiyoeScene } from "./ukiyoe-react";
import type { UkiyoeSceneSpec } from "./ukiyoe-scene";
import { scenePalette } from "./ukiyoe-scene";
import { grainTexture } from "./ukiyoe-texture";

export interface UkiyoeKasumiProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  outgoing: UkiyoeSceneSpec;
  incoming: UkiyoeSceneSpec;
  outgoingFrame: number;
  incomingFrame: number;
  /** 0 → 1 across the transition. */
  progress: number;
  /** Palette role or #hex for the mist (default gold `kin`). */
  color?: string;
  bands?: number;
  seed?: number;
  reducedMotion?: boolean;
}

/** Leading and trailing x of band `i` at transition progress `p` (frame width `w`). */
export function kasumiBand(i: number, bands: number, p: number, w: number, seed: number): { lead: number; trail: number } {
  const stagger = (hash01(seed, i) - .5) * .16 + (i % 2 ? .05 : -.03);
  const t = ease("inOut", clamp01((p - .5) * 1.12 + .5 + stagger));
  const len = w * (1.25 + .25 * hash01(seed, i, 2));
  const lead = lerp(w + 40, -len - 40, t) + 0 * bands;
  return { lead, trail: lead + len };
}

export function UkiyoeKasumi({ outgoing, incoming, outgoingFrame, incomingFrame, progress, color = "kin", bands = 6, seed = 7, reducedMotion = false, ...rest }: UkiyoeKasumiProps) {
  const pre = "ukk" + useId().replace(/[^A-Za-z0-9]/g, "");
  const W = incoming.width, H = incoming.height, pal = scenePalette(incoming);
  const p = reducedMotion ? (progress < .5 ? 0 : 1) : clamp01(progress);
  const mist = resolvePaint(color, pal), edge = resolvePaint("kincha", pal);
  const rowH = H / bands;
  const rows = Array.from({ length: bands }, (_, i) => ({ i, y: i * rowH, ...kasumiBand(i, bands, p, W, seed) }));
  // Incoming shows where a band has already passed: right of its trailing edge.
  const capR = rowH * .78;
  const edgeX = (r: { trail: number }) => Math.max(0, Math.min(W, r.trail - capR * .35)).toFixed(1);
  const reveal = rows.map(r => `M${edgeX(r)} ${(r.y - 2).toFixed(1)}H${W}V${(r.y + rowH + 2).toFixed(1)}H${edgeX(r)}Z`).join("");
  // Sunago and kirikane: gold dust and cut-foil flakes scattered on the mist bands.
  const dust: string[] = [];
  for (let i = 0; i < 70; i++) {
    const x = hash01(seed, i, 1) * 240, y = hash01(seed, i, 2) * 120, r = .8 + 2.2 * hash01(seed, i, 3) ** 3;
    dust.push(i % 9 === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}h${(r * 2.4).toFixed(1)}v${(r * 2.4).toFixed(1)}h${(-r * 2.4).toFixed(1)}Z` : `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`);
  }
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" {...rest}>
    <defs>
      <clipPath id={pre + "in"}><path d={reveal} /></clipPath>
      <pattern id={pre + "g"} patternUnits="userSpaceOnUse" width={512} height={256}><image href={grainTexture(resolvePaint("paper", pal), seed)} width={512} height={256} /></pattern>
      <linearGradient id={pre + "fade"} x1="0" x2="1"><stop offset="0" stopColor={mist} stopOpacity={0} /><stop offset=".07" stopColor={mist} /><stop offset="1" stopColor={mist} /></linearGradient>
      <linearGradient id={pre + "sheen"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={.28} /><stop offset=".5" stopColor="#fff" stopOpacity={0} /><stop offset="1" stopColor={edge} stopOpacity={.22} /></linearGradient>
      <pattern id={pre + "dust"} patternUnits="userSpaceOnUse" width={240} height={120}><path d={dust.join("")} fill={resolvePaint("kin", pal)} stroke={edge} strokeWidth={.4} opacity={.9} /></pattern>
    </defs>
    <UkiyoeScene spec={outgoing} frame={outgoingFrame} reducedMotion={reducedMotion} />
    <g clipPath={`url(#${pre}in)`}><UkiyoeScene spec={incoming} frame={incomingFrame} reducedMotion={reducedMotion} /></g>
    {p > 0 && p < 1 ? rows.map(r => {
      const x = r.lead, len = r.trail - r.lead, top = r.y - rowH * .28, hh = rowH * 1.56, rr = hh / 2;
      const steps = [0, 1, 2].map(k => {
        const inset = k === 0 ? 0 : len * (.04 + .1 * k * hash01(seed, r.i, k + 3)), sh = hh * (1 - k * .22), sy = top + (hh - sh) * (k % 2 ? .9 : .1);
        return `M${x + inset + rr} ${sy}H${x + len - inset - rr}A${sh / 2} ${sh / 2} 0 0 1 ${x + len - inset - rr} ${sy + sh}H${x + inset + rr}A${sh / 2} ${sh / 2} 0 0 1 ${x + inset + rr} ${sy}Z`;
      }).join("");
      return <g key={r.i}>
        <path d={steps} fill={`url(#${pre}fade)`} />
        <path d={steps} fill={`url(#${pre}sheen)`} />
        <path d={steps} fill={`url(#${pre}g)`} opacity={.3} />
        <path d={steps} fill={`url(#${pre}dust)`} />
        <path d={steps} fill="none" stroke={edge} strokeWidth={1.2} strokeOpacity={.45} />
      </g>;
    }) : null}
  </svg>;
}

export interface UkiyoeTransitionProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  outgoing: UkiyoeSceneSpec;
  incoming: UkiyoeSceneSpec;
  outgoingFrame: number;
  incomingFrame: number;
  /** 0 → 1 across the transition. */
  progress: number;
  seed?: number;
  reducedMotion?: boolean;
}

/**
 * `UkiyoeScrollRoll` — the handscroll unrolled: the next scene comes in from the left (a handscroll is read right to
 * left), pushing the last one off to the right, the two sheets joined by a paper seam that casts a soft shadow.
 */
export function UkiyoeScrollRoll({ outgoing, incoming, outgoingFrame, incomingFrame, progress, seed = 7, reducedMotion = false, ...rest }: UkiyoeTransitionProps) {
  const pre = "uks" + useId().replace(/[^A-Za-z0-9]/g, "");
  const W = incoming.width, H = incoming.height, pal = scenePalette(incoming);
  const p = reducedMotion ? (progress < .5 ? 0 : 1) : ease("inOut", clamp01(progress)), x = p * W;
  const paper = resolvePaint("paper", pal), shade = resolvePaint("sumi", pal), gold = resolvePaint("kincha", pal);
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" {...rest}>
    <defs>
      <linearGradient id={pre + "sh"} x1="0" x2="1"><stop offset="0" stopColor={shade} stopOpacity={.35} /><stop offset="1" stopColor={shade} stopOpacity={0} /></linearGradient>
      <pattern id={pre + "g"} patternUnits="userSpaceOnUse" width={512} height={256}><image href={grainTexture(paper, seed)} width={512} height={256} /></pattern>
    </defs>
    <g transform={`translate(${x.toFixed(1)} 0)`}><UkiyoeScene spec={outgoing} frame={outgoingFrame} reducedMotion={reducedMotion} /></g>
    <g transform={`translate(${(x - W).toFixed(1)} 0)`}><UkiyoeScene spec={incoming} frame={incomingFrame} reducedMotion={reducedMotion} /></g>
    {p > 0 && p < 1 ? <g>
      {/* The seam: the incoming sheet's edge overlaps the next, shading it; a thin gold-flecked join. */}
      <rect x={x} y={0} width={70} height={H} fill={`url(#${pre}sh)`} />
      <rect x={x - 5} y={0} width={10} height={H} fill={paper} />
      <rect x={x - 5} y={0} width={10} height={H} fill={`url(#${pre}g)`} opacity={.6} />
      <line x1={x - 5} x2={x - 5} y1={0} y2={H} stroke={gold} strokeWidth={1.2} strokeOpacity={.7} />
      <line x1={x + 5} x2={x + 5} y1={0} y2={H} stroke={shade} strokeWidth={1} strokeOpacity={.4} />
    </g> : null}
  </svg>;
}

/** Centres and growth of the ink blots of `UkiyoeInkBleed` (seeded), as shares of the frame. */
function blots(seed: number, n: number): { x: number; y: number; r: number; at: number }[] {
  return Array.from({ length: n }, (_, i) => ({ x: .1 + .8 * hash01(seed, i, 1), y: .12 + .76 * hash01(seed, i, 2), r: .28 + .25 * hash01(seed, i, 3), at: .45 * hash01(seed, i, 4) }));
}

/**
 * `UkiyoeInkBleed` — sumi spreading on wet paper: ink blots bloom over the outgoing scene with feathered, wandering
 * edges, the next scene shows through inside them as they spread, and the last of the ink fades away.
 */
export function UkiyoeInkBleed({ outgoing, incoming, outgoingFrame, incomingFrame, progress, seed = 7, reducedMotion = false, ...rest }: UkiyoeTransitionProps) {
  const pre = "uki" + useId().replace(/[^A-Za-z0-9]/g, "");
  const W = incoming.width, H = incoming.height, pal = scenePalette(incoming), D = Math.hypot(W, H);
  const p = reducedMotion ? (progress < .5 ? 0 : 1) : clamp01(progress), ink = resolvePaint("sumi", pal), wash = resolvePaint("usuzumi", pal);
  const bs = blots(seed, 7);
  // Each blot spreads on its own clock; the next scene follows it a little later, inside it.
  const radius = (b: { at: number; r: number }, start: number, span: number) => D * b.r * .9 * ease("out", clamp01((p - start - b.at * span) / span));
  const circles = (start: number, span: number, k = 1) => bs.map(b => { const r = radius(b, start, span) * k; return r > .5 ? `M${(b.x * W - r).toFixed(1)} ${(b.y * H).toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0` : ""; }).join("");
  const inkD = circles(0, .55), revealD = circles(.28, .62, .95);
  const inkOpacity = p < .5 ? .85 : .85 * (1 - ease("inOut", (p - .5) / .5));
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" {...rest}>
    <defs>
      <filter id={pre + "wet"} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves={3} seed={seed % 100} />
        <feDisplacementMap in="SourceGraphic" scale={70} />
        <feGaussianBlur stdDeviation={4} />
      </filter>
      <mask id={pre + "in"} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
        <rect width={W} height={H} fill="black" />
        {revealD ? <path d={revealD} fill="white" filter={`url(#${pre}wet)`} /> : null}
      </mask>
    </defs>
    <UkiyoeScene spec={outgoing} frame={outgoingFrame} reducedMotion={reducedMotion} />
    {inkD && p < 1 ? <g filter={`url(#${pre}wet)`} opacity={inkOpacity}>
      {/* The wash: grey ink pooling darker toward its wet rim, as sumi does on damp paper. */}
      <path d={inkD} fill={wash} opacity={.75} />
      <path d={inkD} fill="none" stroke={ink} strokeWidth={26} strokeOpacity={.55} />
      <path d={circles(0, .55, .6)} fill={ink} opacity={.35} />
    </g> : null}
    {revealD ? <g mask={`url(#${pre}in)`}><UkiyoeScene spec={incoming} frame={incomingFrame} reducedMotion={reducedMotion} /></g> : null}
    {p >= 1 ? <UkiyoeScene spec={incoming} frame={incomingFrame} reducedMotion={reducedMotion} /> : null}
  </svg>;
}

/**
 * `UkiyoePrintIn` — a fresh sheet: the outgoing scene fades to bare paper, and the next one is printed on it block by
 * block, key block first, then the colours light to dark, each rubbed on with the baren.
 */
export function UkiyoePrintIn({ outgoing, incoming, outgoingFrame, incomingFrame, progress, reducedMotion = false, ...rest }: UkiyoeTransitionProps) {
  const W = incoming.width, H = incoming.height, pal = scenePalette(incoming);
  const p = reducedMotion ? (progress < .5 ? 0 : 1) : clamp01(progress), fade = clamp01(p / .25), print = clamp01((p - .22) / .78);
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" {...rest}>
    {fade < 1 ? <UkiyoeScene spec={outgoing} frame={outgoingFrame} reducedMotion={reducedMotion} opacity={1 - fade} /> : null}
    <rect width={W} height={H} fill={resolvePaint("paper", pal)} opacity={fade} />
    {print > 0 ? <UkiyoeScene spec={incoming} frame={incomingFrame} reducedMotion={reducedMotion} printProgress={print} /> : null}
  </svg>;
}

export type UkiyoeTransitionKind = "kasumi" | "scroll" | "ink" | "print";
export const UKIYOE_TRANSITIONS: readonly UkiyoeTransitionKind[] = ["kasumi", "scroll", "ink", "print"];
