import type { CSSProperties } from "react";
import { CharacterPresenter } from "../character/character-presenter-react";
import type { CharacterCue, CharacterDefinition, CharacterInstance } from "../character/definition";
import type { InkActorTrack } from "./ink-wash-character";
import { inkActorAt } from "./ink-wash-character";

export interface InkCharacterProps {
  definition: CharacterDefinition;
  instance: CharacterInstance;
  cues: readonly CharacterCue[];
  /** All character channels, acting and movement, sample the *same* absolute frame. */
  frame: number;
  track: InkActorTrack;
  label: string;
  reducedMotion?: boolean;
  /** Paper-specific per-part grain and capillary spread; neutral if omitted. */
  absorption?: number;
  grain?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * An ink-native version of the established CharacterPresenter:
 * - uses original approved rig + artwork; no retargeting or regenerated identity
 * - poses, blinks, speech, gaze, secondary motion via the existing character evaluator
 * - layered pigment is evaluated on each moving part, not postprocessed across a video
 * - feet are fixed in scene-space along a separately authored spatial acting track
 */
export function InkCharacter({
  definition, instance, cues, frame, track, label,
  reducedMotion = false, absorption = .68, grain = .65, className, style,
}: InkCharacterProps) {
  if (instance.instanceId !== track.instanceId)
    throw new RangeError("Ink actor track must target the supplied approved character instance.");
  if (absorption < 0 || absorption > 1 || !Number.isFinite(absorption) ||
      grain < 0 || grain > 1 || !Number.isFinite(grain))
    throw new RangeError("Ink actor paper properties must be finite numbers in 0..1.");
  const placement = inkActorAt(track, frame, reducedMotion);
  const width = definition.design.width * placement.scale;
  const height = definition.design.height * placement.scale;
  return <div className={className} data-km-ink-character={track.id}
    data-km-ink-character-frame={frame}
    style={{ position:"absolute", left:placement.x - width/2, top:placement.y - height,
      width, height, pointerEvents:"none",
      transform:`rotate(${placement.rotation}deg) scaleX(${placement.facing === "left" ? -1 : 1})`,
      transformOrigin:"50% 100%", ...style }}>
    <CharacterPresenter definition={definition} instance={instance} cues={cues} frame={frame}
      label={label} reducedMotion={reducedMotion}
      inkMaterial={{absorption,grain,seed:instance.seed}} />
  </div>;
}
