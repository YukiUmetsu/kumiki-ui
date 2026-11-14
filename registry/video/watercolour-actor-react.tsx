import type { CSSProperties } from "react";
import { CharacterPresenter } from "../character/character-presenter-react";
import type { CharacterWatercolourMaterial } from "../character/character-presenter-react";
import type { CharacterCue, CharacterDefinition, CharacterInstance } from "../character/definition";
import { watercolourActorAt } from "./watercolour-actor";
import type { WatercolourActorTrack } from "./watercolour-actor";

export interface WatercolourActorProps {
  track: WatercolourActorTrack;
  definition: CharacterDefinition;
  instance: CharacterInstance;
  /** Existing CharacterPresenter actions, expressions, gaze and speech cues. */
  cues: readonly CharacterCue[];
  /** FilmStage's ABSOLUTE scene frame; never a private running timer. */
  frame: number;
  watercolourMaterial: CharacterWatercolourMaterial;
  label: string;
  reducedMotion?: boolean;
  assetUrls?: Record<string, string>;
  showShadow?: boolean;
  style?: CSSProperties;
}

/** Spatial actor staging, independent of the WM1/WM2 renderer. The approved
 * character rig stays the source of anatomy and expressive performance.
 */
export function WatercolourActor({
  track, definition, instance, cues, frame, watercolourMaterial, label,
  reducedMotion = false, assetUrls, showShadow = true, style,
}: WatercolourActorProps) {
  if(track.id!==instance.instanceId)
    throw new RangeError("Watercolor actor track must match the provided character instance.");
  const pose=watercolourActorAt(track,frame,reducedMotion);
  const facing=pose.facing==="left"?-1:1;
  const {width,height}=track.stage;
  return <div data-km-watercolour-actor={track.id}
    data-km-watercolour-actor-frame={frame}
    data-km-watercolour-contact={pose.grounded ? "grounded" : "lifted"}
    style={{position:"absolute",inset:0,width,height,pointerEvents:"none",
      overflow:"visible",...style}}>
    {showShadow && <svg aria-hidden="true" width={width} height={height}
      viewBox={"0 0 "+width+" "+height}
      style={{position:"absolute",inset:0,overflow:"visible",pointerEvents:"none"}}>
      <defs>
        <radialGradient id={"km-water-shadow-"+track.id}>
          <stop offset="0" stopColor="#334446" stopOpacity=".21"/>
          <stop offset=".58" stopColor="#42535A" stopOpacity=".105"/>
          <stop offset="1" stopColor="#49565C" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx={pose.x} cy={pose.y+3}
        rx={Math.max(6,definition.design.width*pose.scale*.35*pose.shadowScale)}
        ry={Math.max(3,definition.design.width*pose.scale*.085*pose.shadowScale)}
        fill={"url(#km-water-shadow-"+track.id+")"}/>
    </svg>}
    <div style={{position:"absolute",left:pose.x,top:pose.y-pose.lift,
      width:definition.design.width,height:definition.design.height,
      transform:"translate(-50%, -100%) rotate("+pose.rotation+"deg) scale("+
        pose.scale+") scaleX("+facing+")",
      transformOrigin:"50% 100%",willChange:"transform"}}>
      <CharacterPresenter definition={definition} instance={instance}
        cues={cues} frame={pose.rigFrame} label={label}
        reducedMotion={reducedMotion} assetUrls={assetUrls}
        watercolourMaterial={watercolourMaterial}/>
    </div>
  </div>;
}
