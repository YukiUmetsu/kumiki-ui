import { useId, useMemo } from "react";
import type { SVGProps } from "react";
import { evaluatePaperCraft, paperHash } from "./paper-craft";
import type { PaperCraftSpec, PaperCutLayer } from "./paper-craft";

export interface PaperCraftStageProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "width" | "height"> {
  spec: PaperCraftSpec;
  /** Absolute parent FilmStage/Storybook frame, never a local timer. */
  frame: number;
  reducedMotion?: boolean;
  /** 0–1 visible fixed paper tooth. */
  tooth?: number;
  /** 0–1 intensity of physical separation from the backing. */
  shadowStrength?: number;
  label?: string;
}
/** Five distinct native assemblages, using the same real cut-outs and physical pivot information.
 * All SVG masks, patterns, fibres and shadows are sheet-anchored and stable across seeks.
 */
export function PaperCraftStage({
  spec, frame, reducedMotion = false, tooth = .55, shadowStrength = .7,
  label = "Layered cut-paper illustration", style, ...props
}: PaperCraftStageProps) {
  const state = evaluatePaperCraft(spec, frame, reducedMotion);
  const rawId = useId(), uid = "paper" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const grain = Math.max(0, Math.min(1, Number.isFinite(tooth) ? tooth : 0));
  const strength = Math.max(0, Math.min(1, Number.isFinite(shadowStrength) ? shadowStrength : 0));
  const fibres = useMemo(() => Array.from({ length: 64 }, (_, i) => ({
    x: paperHash(spec.seed, i, 71) * 83,
    y: paperHash(spec.seed, i, 73) * 83,
    size: .35 + paperHash(spec.seed, i, 79) * 1.2,
    length: 1 + paperHash(spec.seed, i, 83) * 5.5,
  })), [spec.seed]);
  const prepared = useMemo(() => spec.layers.map((layer, i) => ({ layer, i }))
    .sort((a, b) => a.layer.depth - b.layer.depth || a.i - b.i), [spec.layers]);
  const isLamp = spec.style === "lightbox" || spec.style === "shadow-puppet";
  const puppet = spec.style === "shadow-puppet";
  return <svg {...props} xmlns="http://www.w3.org/2000/svg"
    role={props["aria-hidden"] ? undefined : "img"}
    aria-label={props["aria-hidden"] ? undefined : label}
    viewBox={`0 0 ${spec.width} ${spec.height}`}
    data-km-paper-craft="" data-km-paper-style={spec.style} data-km-paper-frame={frame}
    style={{ width: "100%", height: "100%", display: "block", isolation: "isolate", overflow: "hidden", ...style }}>
    <defs>
      <radialGradient id={uid + "-lamp"} cx="56%" cy="43%" r="75%">
        <stop offset="0" stopColor={spec.light} stopOpacity={1}/>
        <stop offset=".48" stopColor={spec.backing} stopOpacity={.95}/>
        <stop offset="1" stopColor={spec.backing}/>
      </radialGradient>
      <pattern id={uid + "-fibre"} width={83} height={83} patternUnits="userSpaceOnUse">
        {fibres.map((f, i) => <g key={i} fill="#382d25" opacity={.1 + (i % 4) * .065}>
          <ellipse cx={f.x} cy={f.y} rx={f.size} ry={f.size * .5}/>
          <path d={`M${f.x.toFixed(2)} ${f.y.toFixed(2)} l${f.length.toFixed(2)} 0`}
            stroke="#3b3028" strokeWidth=".32" />
        </g>)}
      </pattern>
      {prepared.map(({ layer }) => <clipPath key={layer.id} id={uid + "-cut-" + layer.id}
        clipPathUnits="userSpaceOnUse">
        <path d={[layer.path, ...(layer.holes ?? [])].join(" ")} clipRule="evenodd"/>
      </clipPath>)}
    </defs>
    <rect width={spec.width} height={spec.height} fill={isLamp ? `url(#${uid}-lamp)` : spec.backing}/>
    {/* The substrate retains visible deckled tooth independently of all moving parts. */}
    {grain > 0 && <rect width={spec.width} height={spec.height} fill={`url(#${uid}-fibre)`} opacity={grain * .48} />}
    {prepared.map(({ layer, i }) => {
      const q = state.layers[i];
      const pivot = layer.pivot ?? [spec.width / 2, spec.height / 2];
      const transform = `translate(${q.translateX.toFixed(3)} ${q.translateY.toFixed(3)}) translate(${pivot[0]} ${pivot[1]}) rotate(${q.rotation.toFixed(3)}) scale(${q.scaleX.toFixed(4)} ${q.scaleY.toFixed(4)}) translate(${-pivot[0]} ${-pivot[1]})`;
      const shadow = `drop-shadow(${q.shadowX.toFixed(2)}px ${q.shadowY.toFixed(2)}px ${q.shadowBlur.toFixed(2)}px rgba(33,24,22,${(strength * (puppet ? .44 : .23)).toFixed(3)}))`;
      const clip = `url(#${uid}-cut-${layer.id})`;
      const cut = [layer.path, ...(layer.holes ?? [])].join(" ");
      return <g key={layer.id} data-km-paper-layer={layer.id} data-km-paper-progress={q.progress.toFixed(4)}
        transform={transform} opacity={q.opacity} style={{ filter: shadow }}>
        <g clipPath={clip}>
          <path d={cut} fill={layer.color} fillRule="evenodd"
            stroke={puppet ? "#422c28" : "#695447"} strokeWidth={puppet ? 1.55 : .7}
            strokeLinejoin="round" strokeOpacity={puppet ? .6 : .22}
            opacity={puppet ? .83 : 1} />
          {grain > 0 && <rect width={spec.width} height={spec.height}
            fill={`url(#${uid}-fibre)`} opacity={grain * (puppet ? .48 : .8)}/>}
        </g>
        {spec.style === "kirigami" && q.progress > 0 && q.progress < 1 &&
          <line x1={pivot[0]} y1={0} x2={pivot[0]} y2={spec.height}
            stroke="#654d3a" strokeWidth=".7" opacity={.08 + (1 - q.progress) * .16}/>}
        {spec.style === "pop-up" && q.progress > 0 && q.progress < 1 &&
          <line x1={pivot[0] - 42} y1={pivot[1]} x2={pivot[0] + 42} y2={pivot[1]}
            stroke="#4b342c" strokeWidth="1" opacity={(1 - q.progress) * .34}/>}
        {puppet && layer.motion === "swing" && q.progress > 0 && <g stroke="#544037" fill="none" strokeLinecap="round">
          <path d={`M${pivot[0]} ${pivot[1]} L${Math.max(0, pivot[0] - 68)} 0`}
            strokeWidth="1.8" opacity=".58"/>
          <circle cx={pivot[0]} cy={pivot[1]} r="4" fill="#d2b283" strokeWidth="1.1" />
          <circle cx={pivot[0]} cy={pivot[1]} r="1.4" fill="#503c36" stroke="none"/>
        </g>}
      </g>;
    })}
    {/* A slight edge vignette belongs to the screen/cut-card stack, not a generic film grade. */}
    {isLamp && <rect width={spec.width} height={spec.height} fill="none"
      stroke="#2f241c" strokeWidth={spec.style === "lightbox" ? 12 : 19} opacity=".12"/>}
  </svg>;
}
/** Convenient JSX type for custom paper pieces passed to the material renderer. */
export type PaperArtworkLayer = PaperCutLayer;
