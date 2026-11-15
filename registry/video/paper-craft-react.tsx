import { useId, useMemo } from "react";
import type { SVGProps } from "react";
import { evaluatePaperCraft, paperHash } from "./paper-craft";
import type { PaperCraftSpec, PaperCutLayer } from "./paper-craft";

/** Mix opaque RGB paper pigments without CSS filters or translucent fill layers. */
export function paperShade(hex: string, amount: number): string {
  const t = Math.max(-1, Math.min(1, Number.isFinite(amount) ? amount : 0));
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
  return "#" + rgb.map(c => Math.round(t >= 0 ? c + (255-c)*t : c*(1+t))
    .toString(16).padStart(2,"0")).join("").toUpperCase();
}

export interface PaperCraftStageProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "width" | "height"> {
  spec: PaperCraftSpec;
  /** Absolute parent FilmStage/Storybook frame, never a local timer. */
  frame: number;
  reducedMotion?: boolean;
  /** 0–1 visible fixed paper tooth. */
  tooth?: number;
  /** 0–1 intensity of physical separation from the backing. */
  shadowStrength?: number;
  /** 0–1 subtle highlight along physically cut cardstock edges. */
  edgeStrength?: number;
  /** 0–1 intensity of opaque cardstock curvature shading (not transparency). */
  curlStrength?: number;
  /** 0–1 physical fold articulation, projected from the authored paper hinge. */
  liftStrength?: number;
  label?: string;
}
/** Five distinct native assemblages, using the same real cut-outs and physical pivot information.
 * All SVG masks, patterns, fibres and shadows are sheet-anchored and stable across seeks.
 */
export function PaperCraftStage({
  spec, frame, reducedMotion = false, tooth = .55, shadowStrength = .7, edgeStrength = .55, curlStrength = .85, liftStrength = 1,
  label = "Layered cut-paper illustration", style, ...props
}: PaperCraftStageProps) {
  const state = evaluatePaperCraft(spec, frame, reducedMotion);
  const rawId = useId(), uid = "paper" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const grain = Math.max(0, Math.min(1, Number.isFinite(tooth) ? tooth : 0));
  const strength = Math.max(0, Math.min(1, Number.isFinite(shadowStrength) ? shadowStrength : 0));
  const edge = Math.max(0, Math.min(1, Number.isFinite(edgeStrength) ? edgeStrength : 0));
  const bend = Math.max(0, Math.min(1, Number.isFinite(curlStrength) ? curlStrength : 0));
  const foldPower = Math.max(0, Math.min(1, Number.isFinite(liftStrength) ? liftStrength : 0));
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
  const hidden = props["aria-hidden"] === true || props["aria-hidden"] === "true";
  return <svg {...props} xmlns="http://www.w3.org/2000/svg"
    role={hidden ? undefined : "img"}
    aria-label={hidden ? undefined : (props["aria-label"] ?? label)}
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
      {bend > 0 && prepared.filter(({layer}) => (layer.curl ?? 0) > 0).map(({layer}) => {
        const k = (layer.curl ?? 0) * bend;
        return <linearGradient key={layer.id} id={uid + "-curl-" + layer.id}
          x1="0%" y1="0%" x2="100%" y2="45%" data-km-paper-curl={layer.id}>
          <stop offset="0%" stopColor={paperShade(layer.color, .14*k)} />
          <stop offset="22%" stopColor={paperShade(layer.color, .32*k)} />
          <stop offset="51%" stopColor={layer.color} />
          <stop offset="84%" stopColor={paperShade(layer.color, -.2*k)} />
          <stop offset="100%" stopColor={paperShade(layer.color, -.08*k)} />
        </linearGradient>;
      })}
    </defs>
    <rect width={spec.width} height={spec.height} fill={isLamp ? `url(#${uid}-lamp)` : spec.backing}/>
    {/* The substrate retains visible deckled tooth independently of all moving parts. */}
    {grain > 0 && <rect width={spec.width} height={spec.height} fill={`url(#${uid}-fibre)`} opacity={grain * .48} />}
    {/* Folded cardstock opens into a shallow standing stage; a creased floor remains visible. */}
    {spec.style === "pop-up" && <g aria-hidden="true">
      <path d={`M0 ${(spec.height * .80).toFixed(2)} L${spec.width / 2} ${(spec.height * .72).toFixed(2)} L${spec.width} ${(spec.height * .80).toFixed(2)} V${spec.height} H0 Z`}
        fill={spec.light} opacity=".18"/>
      <path d={`M0 ${(spec.height * .80).toFixed(2)} L${spec.width / 2} ${(spec.height * .72).toFixed(2)} L${spec.width} ${(spec.height * .80).toFixed(2)}`}
        fill="none" stroke="#473e3b" strokeWidth="2" strokeOpacity=".24"/>
      <path d={`M${spec.width / 2} ${(spec.height * .72).toFixed(2)} V${spec.height}`}
        stroke="#fff0db" strokeWidth="2" strokeOpacity=".33"/>
    </g>}
    <g data-km-paper-camera=""
      transform={`translate(${(spec.width/2+state.camera.x).toFixed(3)} ${(spec.height/2+state.camera.y).toFixed(3)}) scale(${state.camera.zoom.toFixed(4)}) translate(${(-spec.width/2).toFixed(3)} ${(-spec.height/2).toFixed(3)})`}>
    {prepared.map(({ layer, i }) => {
      const q = state.layers[i];
      const pivot = layer.pivot ?? [spec.width / 2, spec.height / 2];
      const transform = `translate(${q.translateX.toFixed(3)} ${q.translateY.toFixed(3)}) translate(${pivot[0]} ${pivot[1]}) rotate(${q.rotation.toFixed(3)}) scale(${q.scaleX.toFixed(4)} ${q.scaleY.toFixed(4)}) translate(${-pivot[0]} ${-pivot[1]})`;
      // Flatten parent matrices, preserving the native global depth painter order.
      const inherited = layer.parentId && q.worldMatrix
        ? `matrix(${q.worldMatrix.map(v=>v.toFixed(5)).join(" ")})`
        : transform;
      const shadow = `drop-shadow(${q.shadowX.toFixed(2)}px ${q.shadowY.toFixed(2)}px ${q.shadowBlur.toFixed(2)}px rgba(33,24,22,${(strength * (puppet ? .44 : .23)).toFixed(3)}))`;
      const clip = `url(#${uid}-cut-${layer.id})`;
      const cut = [layer.path, ...(layer.holes ?? [])].join(" ");
      const curved = bend > 0 && (layer.curl ?? 0) > 0;
      return <g key={layer.id} data-km-paper-layer={layer.id} data-km-paper-progress={q.progress.toFixed(4)}
        data-km-paper-stock={layer.color} data-km-paper-rig={layer.rigGroup}
        data-km-paper-parent={layer.parentId}
        transform={inherited} opacity={q.opacity} style={{ filter: layer.id === "die-cut-border" ? "none" : shadow }}>
        <g clipPath={clip}>
          <path d={cut} fill={curved ? `url(#${uid}-curl-${layer.id})` : layer.color} fillRule="evenodd"
            stroke={puppet ? "#422c28" : "#695447"} strokeWidth={puppet ? 1.55 : .7}
            strokeLinejoin="round" strokeOpacity={puppet ? .6 : .22}
            opacity={1} />
          {/* Opaque cardstock; preserve punched holes while catching light on the cut rim. */}
          {edge > 0 && <path d={cut} fill="none" stroke={puppet ? "#ffe2b6" : "#fff5e1"}
            strokeWidth={.6 + edge * 2} strokeOpacity={edge * (puppet ? .28 : .49)}
            strokeLinejoin="round" pointerEvents="none" />}
          {grain > 0 && <rect width={spec.width} height={spec.height}
            fill={`url(#${uid}-fibre)`} opacity={grain * (puppet ? .48 : .8)}/>}
          {/* A scored hinge remains legible after folding, unlike an animated scale alone. */}
          {spec.style === "kirigami" && layer.motion === "unfold" && <path
            d={`M${pivot[0]} ${pivot[1] - 48} v96`}
            stroke="#5a3441" strokeWidth="1.35" strokeDasharray="4 4" opacity=".22" fill="none"/>}
        </g>
        {/* The separate tip is a real shape, outside the base clipping mask;
            its hinge remains attached through every rig transform and frame seek.
            Both underside and lifted shadow are opaque solid-stock geometry. */}
        {layer.liftedTip && (() => {
          const tip = layer.liftedTip;
          const amount = foldPower * Math.max(0, Math.min(1, q.progress));
          const [hx,hy] = tip.hinge;
          const folded = `translate(${hx} ${hy}) rotate(${(tip.rotateDegrees*amount).toFixed(3)}) scale(1 ${(1-amount*.12).toFixed(4)}) translate(${-hx} ${-hy})`;
          const liftedShadow = `drop-shadow(0px ${(tip.lift*amount).toFixed(2)}px ${(1.1+tip.lift*.25*amount).toFixed(2)}px rgba(28,21,23,${(.28*strength).toFixed(3)}))`;
          return <g data-km-paper-lift-tip={layer.id}
            data-km-paper-fold-angle={(tip.rotateDegrees*amount).toFixed(3)}
            transform={folded} style={{filter:liftedShadow}}>
            <path d={tip.path} fill={amount>0?paperShade(layer.color,.23*amount):layer.color}
              fillRule="evenodd" stroke={paperShade(layer.color,-.25)}
              strokeWidth=".7" strokeLinejoin="round"/>
            <path d={tip.path} fill="none" stroke={paperShade(layer.color,.4)}
              strokeWidth=".45" strokeOpacity=".9" pointerEvents="none"/>
          </g>;
        })()}
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
    </g>
    {/* A slight edge vignette belongs to the screen/cut-card stack, not a generic film grade. */}
    {isLamp && <rect width={spec.width} height={spec.height} fill="none"
      stroke="#2f241c" strokeWidth={spec.style === "lightbox" ? 12 : 19} opacity=".12"/>}
  </svg>;
}
/** Convenient JSX type for custom paper pieces passed to the material renderer. */
export type PaperArtworkLayer = PaperCutLayer;
