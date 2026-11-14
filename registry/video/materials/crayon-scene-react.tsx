import { useId } from "react";
import type { CSSProperties, SVGProps } from "react";
import { crayonProgress } from "./crayon";
import { crayonCamera, crayonElementPlacement } from "./crayon-scene";
import type { CrayonElement, CrayonLetteringElement, CrayonSceneSpec } from "./crayon-scene";
import { Paper, WaxLine, WaxRegion } from "./crayon-react";

export interface CrayonSceneProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "children"> {
  spec: CrayonSceneSpec;
  frame: number;
  reducedMotion?: boolean;
  style?: CSSProperties;
}
const family = {
  serif: "Georgia, 'Noto Serif CJK JP', 'Yu Mincho', serif",
  sans: "Arial, 'Noto Sans CJK JP', 'Yu Gothic', sans-serif",
  mono: "'Courier New', monospace",
} as const;

/** Text is set in readable ink on the paper, separate from wax illustration marks. */
function CrayonLettering({ node, frame, reducedMotion }: {
  node: CrayonLetteringElement; frame: number; reducedMotion: boolean;
}) {
  const visibility = crayonProgress(frame, node.timing.start, node.timing.end, 0, 1, reducedMotion);
  if (!visibility) return null;
  const lineHeight = node.fontSize * (node.lineHeight ?? 1.22);
  const firstBaseline = node.y;
  return <g opacity={visibility} data-km-crayon-lettering={node.id}>
    {node.backing && <rect
      x={node.x - node.backing.padding - (node.anchor === "middle" ? node.backing.width / 2 : node.anchor === "end" ? node.backing.width : 0)}
      y={firstBaseline - node.fontSize - node.backing.padding} width={node.backing.width}
      height={node.backing.height} rx={node.backing.radius ?? 0} fill={node.backing.color} />}
    <text x={node.x} y={node.y} fontFamily={family[node.family ?? "serif"]}
      fontWeight={node.weight ?? 700} fill={node.color}
      fontSize={node.fontSize} textAnchor={node.anchor ?? "start"}>
      {node.lines.map((line,i)=><tspan key={i} x={node.x} dy={i===0?0:lineHeight}>{line}</tspan>)}
    </text>
  </g>;
}
function CrayonNode({ node, frame, seed, reducedMotion, tooth }: {
  node: CrayonElement; frame: number; seed: number; reducedMotion: boolean; tooth: string;
}) {
  const p = crayonElementPlacement(node, frame, reducedMotion);
  const transform = "translate(" + p.x + " " + p.y + ") rotate(" + p.rotate +
    ") scale(" + p.scale + ")";
  return <g data-km-crayon-element={node.id} data-km-crayon-kind={node.kind} transform={transform}>
    {node.kind === "wax" ? <WaxRegion d={node.d} bounds={node.bounds} colors={node.colors}
      seed={seed} pressure={node.pressure ?? .84} spacing={node.spacing ?? 9} angle={node.angle ?? 0}
      tooth={tooth} frame={frame} first={node.timing.start} last={node.timing.end}
      reduced={reducedMotion} /> :
      node.kind === "contour" ? <WaxLine d={node.d} color={node.color} width={node.width}
        opacity={node.opacity ?? 1} seed={seed}
        frame={frame} first={node.timing.start} last={node.timing.end}
        reduced={reducedMotion} /> :
        <CrayonLettering node={node} frame={frame} reducedMotion={reducedMotion} />}
  </g>;
}
/**
 * Scene-agnostic animation surface. Subjects are authored data; the renderer knows only
 * wax paths, graphite-like outlines, high-contrast type, paper, world layers, and camera.
 * No built-in fox, flower, video clock, or hardcoded story. Supplied JSON passes validation.
 */
export function CrayonScene({spec, frame, reducedMotion = false, style, ...svgProps}:CrayonSceneProps) {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("CrayonScene frame must be a nonnegative integer");
  const raw = useId(), tooth = "crayonscene" + raw.replace(/[^a-zA-Z0-9_-]/g,"");
  const camera = crayonCamera(spec, frame, reducedMotion);
  const at = reducedMotion ? spec.durationFrames - 1 : frame;
  const indexed = spec.elements.map((node,i)=>({node,seed:spec.seed+i*1193}));
  const rendered = (screenSpace:boolean) => indexed.filter(x=>(x.node.screenSpace ?? false)===screenSpace).map(x=>
    <CrayonNode key={x.node.id} node={x.node} seed={x.seed} tooth={tooth}
      frame={at} reducedMotion={reducedMotion} />);
  return <svg {...svgProps} role={svgProps["aria-hidden"] ? undefined : "img"}
    aria-label={svgProps["aria-hidden"] ? undefined : (svgProps["aria-label"] ?? "Wax-crayon illustrated scene")}
    data-km-crayon-scene={spec.id} data-km-crayon-frame={frame}
    viewBox={"0 0 " + spec.width + " " + spec.height}
    xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",display:"block",overflow:"hidden",...style}}>
    <rect width={spec.width} height={spec.height} fill={spec.paper} />
    <Paper width={spec.width} height={spec.height} tooth={tooth}
      seed={spec.seed} color={spec.paper} strength={spec.paperTooth ?? .6} />
    <g data-km-crayon-camera="" transform={"translate("+camera.x+" "+camera.y+") scale("+camera.scale+")"}>
      {rendered(false)}
    </g>
    {rendered(true)}
  </svg>;
}
