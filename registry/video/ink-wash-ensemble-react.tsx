import type { CSSProperties } from "react";
import type { CharacterCue, CharacterDefinition, CharacterInstance } from "../character/definition";
import type { CharacterInkPartFinish } from "../character/character-presenter-react";
import { InkCharacter } from "./ink-wash-character-react";
import { inkEnsembleAt, assertInkEnsemble } from "./ink-wash-ensemble";
import type { InkEnsemblePlan } from "./ink-wash-ensemble";

/** Input is approved independent character instances. No generated variants or actor replacement. */
export interface InkEnsembleCastMember {
  trackId: string;
  definition: CharacterDefinition;
  instance: CharacterInstance;
  cues: readonly CharacterCue[];
  label: string;
  assetUrls?: Record<string, string>;
  partFinish?: Readonly<Record<string, CharacterInkPartFinish>>;
}
export interface InkEnsembleProps {
  plan: InkEnsemblePlan;
  cast: readonly InkEnsembleCastMember[];
  frame: number;
  width: number;
  height: number;
  reducedMotion?: boolean;
  absorption?: number;
  grain?: number;
  /** Optional overlay shows staging audit. This is intentionally not a shipping prop by default. */
  showGrounding?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Real multi-character ink scene with author-approved rigs, independent part finishes,
 * z-ordered actor composites and a single absolute film frame. Multiple instances
 * may use the same definition but must keep their own identity and seed.
 */
export function InkEnsemble({ plan, cast, frame, width, height,
  reducedMotion = false, absorption = .68, grain = .65, showGrounding = false,
  label = "Ink-wash character ensemble", className, style }: InkEnsembleProps) {
  assertInkEnsemble(plan);
  if (!Number.isSafeInteger(width) || width < 100 || width > 4096 ||
      !Number.isSafeInteger(height) || height < 100 || height > 4096)
    throw new RangeError("INK4 stage dimensions must be integer paper units from 100 to 4096.");
  if (![absorption, grain].every(x => Number.isFinite(x) && x >= 0 && x <= 1))
    throw new RangeError("INK4 paper properties must lie in 0..1.");
  const castById = new Map(cast.map(item => [item.trackId, item]));
  if (castById.size !== cast.length || castById.size !== plan.actors.length ||
      plan.actors.some(a => !castById.has(a.track.id)))
    throw new RangeError("INK4 needs exactly one distinct approved cast member per staging track.");
  const at = inkEnsembleAt(plan, frame, reducedMotion);
  return <div className={className} role="group" aria-label={label}
    data-km-ink-ensemble="" data-km-ink-ensemble-frame={frame}
    style={{ width, height, position: "relative", overflow: "hidden",
      isolation: "isolate", pointerEvents: "none", ...style }}>
    {at.actors.map(({ id, pose, attentionTargetId, activity }) => {
      const castMember = castById.get(id)!;
      if (castMember.instance.instanceId !== pose.instanceId)
        throw new RangeError("INK4 actor instance IDs must match their canonical staging track.");
      const track = plan.actors.find(actor => actor.track.id === id)!.track;
      // Feed a sampled transform into the existing InkCharacter adapter using a
      // one-key snapshot. CharacterPresenter still owns actual skeletal animation.
      const snapshot = { ...track, keys: [{
        frame: 0, x: pose.x, y: pose.y, scale: pose.scale,
        rotation: pose.rotation, facing: pose.facing,
      }] };
      return <div key={id} data-km-ink-ensemble-actor={id}
        data-km-ink-attends={attentionTargetId} data-km-ink-activity={activity}
        style={{ position: "absolute", inset: 0 }}>
        <InkCharacter definition={castMember.definition} instance={castMember.instance}
          cues={castMember.cues} track={snapshot} frame={frame} reducedMotion={reducedMotion}
          label={castMember.label} assetUrls={castMember.assetUrls}
          absorption={absorption} grain={grain} partFinish={castMember.partFinish}/>
      </div>;
    })}
    {showGrounding && <svg width={width} height={height}
      viewBox={"0 0 "+width+" "+height} aria-hidden="true"
      style={{ position:"absolute",inset:0,pointerEvents:"none" }}>
      {at.contacts.map(audit => <g key={audit.beatId}
        data-km-ink-reach={audit.withinReach ? "pass" : "fail"}>
        <rect x={8} y={12 + at.contacts.indexOf(audit) * 25} width="12" height="12"
          fill={audit.withinReach && !audit.intersectingFeet ? "#426A51" : "#A14D38"}/>
      </g>)}
    </svg>}
  </div>;
}
