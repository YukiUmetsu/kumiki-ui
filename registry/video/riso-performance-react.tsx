import { useMemo } from "react";
import type { SVGProps, ReactNode } from "react";
import { RisoPrint } from "./print-plates-react";
import type { RisoArtwork, RisoPaint } from "./print-plates-react";
import { assertRisoCharacterScene, evaluateRisoCharacterScene, sampleRisoMotion } from "./riso-performance";
import type { RisoCharacterSceneSpec, RisoEvaluatedActor, RisoEvaluatedJoint, RisoSceneLayer, RisoMark } from "./riso-performance";

export interface RisoCharacterStageProps extends Omit<SVGProps<SVGSVGElement>, "children" | "width" | "height" | "viewBox"> {
  spec: RisoCharacterSceneSpec;
  frame: number;
  reducedMotion?: boolean;
  misregistration?: number;
  paperGrain?: number;
}
const font = {
  serif: "Georgia,'Times New Roman',serif",
  sans: "Arial,Helvetica,sans-serif",
  mono: "'Courier New',monospace",
} as const;
const number = (v: number) => Number(v.toFixed(4));
const transform = (x: number, y: number, rotate: number, scale: number) =>
  "translate(" + number(x) + " " + number(y) + ") rotate(" + number(rotate) + ") scale(" + number(scale) + ")";
function InkMark({mark, paint, part}: {mark?: RisoMark; paint: RisoPaint; part: string}) {
  if (!mark) return null;
  return <path data-km-riso-mark={part} d={mark.d}
    fill={mark.ink === "dots" ? paint.dots : paint.solid}
    opacity={mark.opacity ?? 1}/>;
}
/** Hierarchical, plate-specific art. Parent transforms animate joint attachments. */
function ActorPlate({ actor, plate, paint }: {
  actor: RisoEvaluatedActor; plate: string; paint: RisoPaint;
}) {
  const children = new Map<string, RisoEvaluatedJoint[]>();
  for (const j of actor.joints) {
    const key = j.parent ?? "";
    const list = children.get(key) ?? [];
    list.push(j);
    children.set(key, list);
  }
  for (const list of children.values()) list.sort((a,b) => a.z - b.z || a.id.localeCompare(b.id));
  const renderJoint = (joint: RisoEvaluatedJoint, depth: number): ReactNode => {
    if (depth > 16) return null; // validator forbids cycles/deeper rigs.
    const p = joint.pose;
    const mark = joint.marks[plate];
    return <g key={joint.id} data-km-riso-joint={joint.id}
      transform={transform(joint.pivot[0] + p.x, joint.pivot[1] + p.y, p.rotate, p.scale)}>
      <InkMark mark={mark} paint={paint} part={joint.id}/>
      {(children.get(joint.id) ?? []).map(next => renderJoint(next, depth + 1))}
    </g>;
  };
  return <g data-km-riso-actor={actor.id} data-km-riso-pose-frame={actor.poseFrame}
    transform={transform(actor.origin[0] + actor.pose.x, actor.origin[1] + actor.pose.y,
      actor.pose.rotate, actor.pose.scale)}>
    {(children.get("") ?? []).map(joint => renderJoint(joint, 0))}
  </g>;
}
function SceneLayer({layer, plate, paint, frame, reducedMotion, camera, size}: {
  layer: RisoSceneLayer; plate: string; paint: RisoPaint; frame: number; reducedMotion: boolean;
  camera:{x:number;y:number;zoom:number}; size:{width:number;height:number};
}) {
  if (layer.plate !== plate) return null;
  const pose = sampleRisoMotion(layer.motion, frame);
  const sceneMove = layer.screenSpace ? "" :
    "translate(" + number(size.width/2 - camera.x * camera.zoom * (layer.kind==="path" ? layer.parallax ?? 1 : 1)) +
    " " + number(size.height/2 - camera.y * camera.zoom * (layer.kind==="path" ? layer.parallax ?? 1 : 1)) +
    ") scale(" + number(camera.zoom) + ") ";
  return <g data-km-riso-scene-layer={layer.id}
    transform={sceneMove + transform(pose.x,pose.y,pose.rotate,pose.scale)}>
    {layer.kind === "path" ?
      <path d={layer.d} fill={layer.ink === "dots" ? paint.dots : paint.solid} opacity={layer.opacity ?? 1}/> :
      <text x={layer.x} y={layer.y}
        fontFamily={font[layer.fontFamily ?? "serif"]} fontWeight={layer.weight ?? 600}
        fontSize={layer.fontSize} fill={paint.solid} textAnchor={layer.anchor ?? "start"}>
        {layer.lines.map((line,i) => <tspan key={i} x={layer.x}
          dy={i===0 ? 0 : layer.fontSize*(layer.lineHeight??1.2)}>{line}</tspan>)}
      </text>}
  </g>;
}
/** Authored actor and scenic plates ride the existing RISO1 film material; no new rendering engine. */
export function RisoCharacterStage({
  spec, frame, reducedMotion = false, misregistration = .25, paperGrain = .55,
  ...svgProps
}: RisoCharacterStageProps) {
  assertRisoCharacterScene(spec);
  const state = evaluateRisoCharacterScene(spec, frame, reducedMotion);
  const printFrame = spec.print.startFrame +
    (spec.print.plates.length-1)*(spec.print.passFrames+spec.print.gapFrames) + spec.print.passFrames;
  const artworks = useMemo(() => {
    const out: Record<string,RisoArtwork> = {};
    for (const plate of spec.print.plates) {
      out[plate.id] = (paint: RisoPaint) => {
        const camera = state.camera;
        const size = {width: spec.print.width, height: spec.print.height};
        const scenery = spec.layers.filter(l => l.plate===plate.id);
        const below = scenery.filter(l => (l.z??0)<0).sort((a,b) => (a.z??0)-(b.z??0));
        const above = scenery.filter(l => (l.z??0)>=0).sort((a,b) => (a.z??0)-(b.z??0));
        const renderLayer = (layer:RisoSceneLayer) => <SceneLayer key={layer.id}
          layer={layer} plate={plate.id} paint={paint} frame={state.frame}
          reducedMotion={reducedMotion} camera={camera} size={size}/>;
        return <>
          {below.map(renderLayer)}
          <g data-km-riso-actor-camera=""
            transform={"translate("+number(size.width/2-camera.x*camera.zoom)+" "+
              number(size.height/2-camera.y*camera.zoom)+") scale("+number(camera.zoom)+")"}>
            {state.actors.map(actor => <ActorPlate key={actor.id} actor={actor}
              plate={plate.id} paint={paint}/>)}
          </g>
          {above.map(renderLayer)}
        </>;
      };
    }
    return out;
  }, [spec, state, reducedMotion]);
  return <RisoPrint {...svgProps} spec={spec.print}
    frame={printFrame} artworks={artworks}
    reducedMotion={reducedMotion} misregistration={misregistration}
    paperGrain={paperGrain}
    data-km-riso-scene={spec.id} data-km-riso-scene-frame={frame}
    label={svgProps["aria-label"] ?? "Animated spot-ink character scene"}/>;
}
