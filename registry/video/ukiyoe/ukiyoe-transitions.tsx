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
  const reveal = rows.map(r => `M${Math.max(0, Math.min(W, r.trail - rowH * .45)).toFixed(1)} ${(r.y - 2).toFixed(1)}H${W}V${(r.y + rowH + 2).toFixed(1)}H${Math.max(0, Math.min(W, r.trail - rowH * .45)).toFixed(1)}Z`).join("");
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" {...rest}>
    <defs>
      <clipPath id={pre + "in"}><path d={reveal} /></clipPath>
      <pattern id={pre + "g"} patternUnits="userSpaceOnUse" width={512} height={256}><image href={grainTexture(resolvePaint("paper", pal), seed)} width={512} height={256} /></pattern>
      <linearGradient id={pre + "fade"} x1="0" x2="1"><stop offset="0" stopColor={mist} stopOpacity={0} /><stop offset=".08" stopColor={mist} /><stop offset=".92" stopColor={mist} /><stop offset="1" stopColor={mist} stopOpacity={0} /></linearGradient>
    </defs>
    <UkiyoeScene spec={outgoing} frame={outgoingFrame} reducedMotion={reducedMotion} />
    <g clipPath={`url(#${pre}in)`}><UkiyoeScene spec={incoming} frame={incomingFrame} reducedMotion={reducedMotion} /></g>
    {p > 0 && p < 1 ? rows.map(r => {
      const x = r.lead, len = r.trail - r.lead, top = r.y - rowH * .28, hh = rowH * 1.56, rr = hh / 2;
      const steps = [0, 1, 2].map(k => {
        const inset = len * (.04 + .1 * k * hash01(seed, r.i, k + 3)), sh = hh * (1 - k * .22), sy = top + (hh - sh) * (k % 2 ? .9 : .1);
        return `M${x + inset + rr} ${sy}H${x + len - inset - rr}A${sh / 2} ${sh / 2} 0 0 1 ${x + len - inset - rr} ${sy + sh}H${x + inset + rr}A${sh / 2} ${sh / 2} 0 0 1 ${x + inset + rr} ${sy}Z`;
      }).join("");
      return <g key={r.i}>
        <path d={steps} fill={`url(#${pre}fade)`} stroke={edge} strokeWidth={1.4} strokeOpacity={.5} />
        <path d={steps} fill={`url(#${pre}g)`} opacity={.35} />
      </g>;
    }) : null}
  </svg>;
}
