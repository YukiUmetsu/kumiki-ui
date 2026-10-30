/// <reference types="vite/client" />
/** Storybook adapter: drives the repo's Pip and Doctor Quill rigs from InteractiveBranchingPlayer actor actions. */
import { useEffect, useMemo, useRef, useState } from "react";
import { CharacterPresenter } from "../../registry/character/character-presenter-react";
import type { CharacterCue, CharacterDefinition, CharacterInstance } from "../../registry/character/definition";
import type { BranchingActor, BranchingActorAction } from "../../registry/video/interactive-branching-player";
import { actionFrames, DEMO_FPS, forwardWalkCues, repeatAction } from "../character/character-presenter-demo";
import { doctorQuillAssetFiles, doctorQuillCharacter } from "../character/fixtures/doctor-quill";
import { pipAssetFiles, pipCharacter } from "../character/fixtures/pip";

// Resolve logical asset URIs through each fixture's own manifest (Pip v1.6 lives in pip-assets-v1-6).
const ASSET_FILES = import.meta.glob("../character/fixtures/{doctor-quill-assets,pip-assets-v1-6}/**/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const assetUrls: Record<string, string> = Object.fromEntries(
  Object.entries({ ...doctorQuillAssetFiles, ...pipAssetFiles }).flatMap(([uri, file]) => {
    const url = ASSET_FILES[`../character/fixtures/${file}`];
    return url ? [[uri, url]] : [];
  }),
);

interface Performer { definition: CharacterDefinition; instance: CharacterInstance; width: string }
const PERFORMERS: Record<"pip" | "quill", Performer> = {
  pip: { definition: pipCharacter, instance: { instanceId: "pip", characterId: "pip", revision: "r1", seed: 27 }, width: "clamp(110px, 23cqi, 250px)" },
  quill: { definition: doctorQuillCharacter, instance: { instanceId: "quill", characterId: "doctor-quill", revision: "r2", seed: 11 }, width: "clamp(64px, 11cqi, 132px)" },
};

/** How each player action is performed by each rig. Looping actions repeat on their own cycle. */
function planFor(kind: "pip" | "quill", action: BranchingActorAction): { loop?: string; once?: string[]; expression: string; speech?: boolean } {
  const pip = kind === "pip";
  switch (action) {
    case "walk": return { loop: "walk", expression: "neutral" };
    case "talk": return { speech: true, expression: pip ? "happy" : "curious" };
    case "point": return { once: ["point"], expression: "curious" };
    case "think": return { once: [pip ? "question" : "think"], expression: pip ? "curious" : "focused" };
    case "celebrate": return { once: pip ? ["cheer", "cheer"] : ["nod", "nod"], expression: pip ? "delighted" : "happy" };
    default: return { expression: "neutral" };
  }
}

function cuesFor(performer: Performer, kind: "pip" | "quill", action: BranchingActorAction, start: number, frame: number): CharacterCue[] {
  const { definition, instance } = performer;
  const id = instance.instanceId;
  const plan = planFor(kind, action);
  const cues: CharacterCue[] = [{ id: `${id}-face-${start}`, instanceId: id, kind: "expression", startFrame: start, name: plan.expression }];
  if (plan.speech) cues.push({ id: `${id}-speech-${start}`, instanceId: id, kind: "speech", startFrame: start, endFrame: start + DEMO_FPS * 600, precision: "approximate" });
  if (plan.loop) {
    // Only the current and next cycle are cued, so evaluation stays cheap for long scenes.
    const length = actionFrames(definition, plan.loop);
    const cycle = Math.max(0, Math.floor((frame - start) / length));
    cues.push(...forwardWalkCues(definition, id, start + cycle * length, 2));
  }
  let at = start;
  for (const name of plan.once ?? []) {
    cues.push(...repeatAction(definition, id, name, at, 1));
    at += actionFrames(definition, name);
  }
  return cues;
}

/** A host clock for the clock-free presenter, at the fixtures' authored 30 fps. */
function useFrameClock(): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    let raf = 0;
    const origin = performance.now();
    const tick = (now: number) => {
      setFrame(Math.floor((now - origin) / 1000 * DEMO_FPS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return frame;
}

export function BranchingCharacterActor({ actor, action }: { actor: BranchingActor; action: BranchingActorAction }) {
  const kind = actor.id === "quill" ? "quill" : "pip";
  const performer = PERFORMERS[kind];
  const frame = useFrameClock();
  const started = useRef({ action, frame });
  if (started.current.action !== action) started.current = { action, frame };
  const start = started.current.frame;
  const loopLength = planFor(kind, action).loop ? actionFrames(performer.definition, "walk") : 0;
  const cycle = loopLength ? Math.floor((frame - start) / loopLength) : 0;
  const cues = useMemo(() => cuesFor(performer, kind, action, start, frame),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate per action and per loop cycle, not per frame
    [performer, kind, action, start, cycle]);
  return <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
    <CharacterPresenter definition={performer.definition} instance={performer.instance} cues={cues} frame={frame}
      assetUrls={assetUrls} label={`${actor.name} is ${action === "idle" ? "listening" : action}`} style={{ width: performer.width }} />
    <span style={{ padding: "2px 9px", borderRadius: 30, border: "1px solid #fff6", background: "#0d2028bf", color: "#fffbe8", fontSize: 10, whiteSpace: "nowrap" }}>{actor.name}</span>
  </div>;
}
