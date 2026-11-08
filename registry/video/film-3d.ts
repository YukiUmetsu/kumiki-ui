/** 3D shots in a film document: the content of a `"recipeId": "shot-3d"` scene, its checks and its named moments.
 *
 * A 3D shot names one of the React Three Fiber recipes (`ProductHeroTurn`, `ManyIntoOne`, `StepInside`, `LightThroughIt`, ...), a
 * subject or a set from the tables below, and the recipe's own spec without `durationFrames`, which comes from the scene. This module
 * holds no renderer: a film is checked here, in Node, before anything loads three.js. `film-3d-react.tsx` draws the shots.
 * Types here feed `film-document.schema.json`. After a change, run `npm run film:schema`.
 */
import { inspectStudioShot } from "../visual/studio-shots";
import type { CompareSpec, ExplodeSpec, HeroTurnSpec, ManyIntoOneSpec, PartSpotlightSpec, ScreenAliveSpec, StepInsideSpec, TextBeat } from "../visual/studio-shots";
import { inspectLightShot } from "../visual/light-shots";
import type { LightThroughSpec } from "../visual/light-shots";
import { inspectPhysicsShot } from "../visual/physics-shots";
import type { PhysicsPointSpec } from "../visual/physics-shots";
import { inspectCapturedPlace, inspectFlythrough } from "../visual/place-shots";
import type { CapturedPlaceSpec, FlythroughSpec } from "../visual/place-shots";
import { chainReadFrames, chainSettleFrame, dioramaSchedule, insideOutLabelFrame, inspectChainReaction, inspectDioramaJourney, inspectInsideOut, inspectPhysicalData, inspectScaleJourney,
  inspectShadowReveal, inspectTabletopStory, physicalDataEnd, scaleStopFrames, SCALE_MOVE, TABLETOP_MOVE } from "../visual/story-3d-shots";
import type { ChainReactionSpec, DioramaJourneySpec, InsideOutSpec, PhysicalDataSpec, ScaleJourneySpec, ShadowRevealSpec, TabletopStorySpec } from "../visual/story-3d-shots";

/** A recipe spec as a film writes it: the scene's `durationFrames` fills in the rest. */
type Shot<T> = Omit<T, "durationFrames">;

/** The hero assets a film can name, with their parts, so a shot that points at a part is checked without building the asset. */
export const SHOT_3D_SUBJECTS = {
  phone: {
    parts: ["phone-body", "phone-machined-frame", "phone-front-glass", "phone-display", "phone-camera-island", "phone-notification", "phone-back-glass", "phone-camera-plateau", "phone-lens-stack", "phone-flash", "phone-depth-sensor", "phone-microphone", "phone-antenna-band", "phone-side-button", "phone-volume-button", "phone-action-button", "phone-port",
      "phone-internal-frame", "phone-midplate", "phone-battery", "phone-logic-board", "phone-camera-modules", "phone-charging-coil", "phone-speaker", "phone-haptic", "phone-flex"],
    screen: "phone-display", actions: ["notify", "turn"],
    /** Parts a cutaway shows (`inside-out`). */
    inside: ["phone-battery", "phone-logic-board", "phone-charging-coil", "phone-camera-modules", "phone-speaker", "phone-haptic"],
  },
  laptop: {
    parts: ["laptop-unibody-base", "laptop-keyboard-deck", "laptop-key-legends", "laptop-speaker-grille", "laptop-port", "laptop-keycaps", "laptop-glass-trackpad", "laptop-rubber-foot", "laptop-hinge-barrel", "laptop-lid-hinge", "laptop-lid-shell", "laptop-glass-bezel", "laptop-display", "laptop-camera"],
    screen: "laptop-display", actions: ["open", "wake", "open-and-process"],
    inside: [],
  },
} as const;
export type Shot3dSubjectId = keyof typeof SHOT_3D_SUBJECTS;
/** Interfaces that perform on a device's screen, from `screen-paints.ts`. */
export const SHOT_3D_SCREENS = ["weekly-energy"] as const;
export type Shot3dScreenId = typeof SHOT_3D_SCREENS[number];
/** Worlds behind a device's screen, from `portal-worlds.ts`. */
export const SHOT_3D_WORLDS = ["meadow"] as const;
export type Shot3dWorldId = typeof SHOT_3D_WORLDS[number];
/** Sets lit by baked, path-traced light (`scripts/light-bake.py`). The renderer is given their files. */
export const SHOT_3D_BAKED_SETS = ["slot-canyon"] as const;
export type Shot3dBakedSetId = typeof SHOT_3D_BAKED_SETS[number];
/** Captured places, with the camera path that stays where the photographs were taken, and the credit their licence requires. */
export const SHOT_3D_CAPTURES = {
  "clock-tower": {
    from: { position: [-0.598, 0.108, -1.873], target: [1.045, -0.255, -1.2] }, to: { position: [-0.338, 0.078, -1.44], target: [0.987, -0.155, -1.196] },
    rotation: [167.24, 29.82, 3.41], fov: 42, background: "#d7dde3",
    credit: "Capture trained by Kumiki from Heritage3DMtl drone photographs by R. Shende, S. Mudur, T. Popa and K. Mendhurwar, Concordia University (CC BY 4.0)",
  },
} as const satisfies Record<string, Omit<CapturedPlaceSpec, "durationFrames">>;
export type Shot3dCaptureId = keyof typeof SHOT_3D_CAPTURES;
/** Physics scenes baked by `npm run physics:bake`: the frame of the last contact, and the body groups that labels can name. */
export const SHOT_3D_PHYSICS = {
  "domino-chain": { lastContactFrame: 98, groups: ["chain", "last"] },
  "stack-compare": { lastContactFrame: 93, groups: ["left", "right"] },
} as const;
export type Shot3dPhysicsId = keyof typeof SHOT_3D_PHYSICS;
/** Growing-domino bakes (`domino-amplifier-<links>`): the physics frame each comes to rest, by number of links. */
export const SHOT_3D_CHAIN_SETTLE: Readonly<Record<number, number>> = { 3: 45, 4: 57, 5: 71, 6: 87, 7: 106, 8: 130 };

export type Shot3dLook = "softbox" | "strip" | "rim" | "high-key";
export type Shot3dPalette = "graphite" | "midnight" | "ivory" | "sand" | "slate";

interface Shot3dBase {
  /** What the viewer sees, for a reader who cannot see it. */
  label: string;
  /** How the studio is lit, and the colour of its sweep. Studio shots only. */
  studio?: { look?: Shot3dLook; palette?: Shot3dPalette };
  /** Text colour against the backdrop. Pale palettes and the high-key look need `dark-on-light`. @default "light-on-dark" */
  tone?: "light-on-dark" | "dark-on-light";
  /** Named frames in the scene, so `audio.cues` can land a sound on an event. Each shot also names its own (see the spec). */
  moments?: readonly { id: string; frame: number }[];
}
interface SubjectShot extends Shot3dBase { subject: Shot3dSubjectId }
/** A slow turn that lands on the hero angle, holds, and earns one claim. */
export interface Shot3dHeroTurn extends SubjectShot { shot: "hero-turn"; spec: Shot<HeroTurnSpec>; action?: { id: string; startFrame?: number } }
/** The camera pushes in on one named part while the rest dims. */
export interface Shot3dPartSpotlight extends SubjectShot { shot: "part-spotlight"; spec: Shot<PartSpotlightSpec> }
/** Parts slide apart along their assembly axes, hold to be read, and slide back. */
export interface Shot3dExplodedView extends SubjectShot { shot: "exploded-view"; spec: Shot<ExplodeSpec> }
/** One subject in several finishes, side by side, under the same light and camera. One finish per pane. */
export interface Shot3dFinishCompare extends SubjectShot { shot: "finish-compare"; spec: Shot<CompareSpec>; finishes: readonly { body?: string; trim?: string }[] }
/** One moment seen from two or more angles at once. */
export interface Shot3dTwoAngle extends SubjectShot { shot: "two-angle"; spec: Shot<CompareSpec>; action?: { id: string; startFrame?: number } }
/** The camera lands square on the screen, and the interface performs. */
export interface Shot3dScreenAlive extends SubjectShot { shot: "screen-alive"; spec: Shot<ScreenAliveSpec>; screen: Shot3dScreenId }
/** The screen is a window into a world; the camera goes through it and arrives there. */
export interface Shot3dStepInside extends SubjectShot { shot: "step-inside"; spec: Shot<StepInsideSpec>; world: Shot3dWorldId }
/** Particles gather onto the subject's surface, and it builds in under them. */
export interface Shot3dManyIntoOne extends SubjectShot { shot: "many-into-one"; spec: Shot<ManyIntoOneSpec> }
/** A drop lands on a sunlit pool, and its rings focus the sun into moving lines on the floor. */
export interface Shot3dLightThroughWater extends Shot3dBase { shot: "light-through-water"; spec: Shot<LightThroughSpec> }
/** Forward through a set lit by baked, path-traced light. */
export interface Shot3dBakedFlythrough extends Shot3dBase { shot: "baked-flythrough"; set: Shot3dBakedSetId; spec: Shot<FlythroughSpec> }
/** A slow move toward a real place, rebuilt from photographs. The camera path and credit default to the capture's own. */
export interface Shot3dCapturedPlace extends Shot3dBase { shot: "captured-place"; capture: Shot3dCaptureId; spec: Partial<Shot<CapturedPlaceSpec>> }
/** Motion solved offline and played back: a chain of falls, or two stacks to weigh. Text waits for the last contact. */
export interface Shot3dPhysicsPoint extends Shot3dBase { shot: "physics-point"; bake: Shot3dPhysicsId; spec: Shot<PhysicsPointSpec> }
/** A question asked with a shadow: pieces hanging in the dark cast one clear shape, and line up into it as the camera nears the light. */
export interface Shot3dShadowReveal extends Shot3dBase { shot: "shadow-reveal"; spec: Shot<ShadowRevealSpec> }
/** A cause-and-effect chain on growing dominoes, one link on each face: read from cause to effect, then tipped. */
export interface Shot3dChainReaction extends Shot3dBase { shot: "chain-reaction"; spec: Shot<ChainReactionSpec> }
/** Values as stacks of coins or wooden blocks, landing one piece at a time. */
export interface Shot3dPhysicalData extends Shot3dBase { shot: "physical-data"; spec: Shot<PhysicalDataSpec> }
/** Object-story with real objects on a table: each beat arranges them in a row, a pair, a stack or around one in focus. */
export interface Shot3dTabletopStory extends Shot3dBase { shot: "tabletop-story"; spec: Shot<TabletopStorySpec> }
/** Real objects from smallest to largest; the camera steps back from each to the next, and each shows its real size. */
export interface Shot3dScaleJourney extends Shot3dBase { shot: "scale-journey"; spec: Shot<ScaleJourneySpec> }
/** A cut across the back takes the cover away and shows the parts inside, which are then named. The subject needs a cutaway. */
export interface Shot3dInsideOut extends SubjectShot { shot: "inside-out"; spec: Shot<InsideOutSpec> }
/** A traveller crosses a miniature world from station to station, resting at each while its caption reads. */
export interface Shot3dDioramaJourney extends Shot3dBase { shot: "diorama-journey"; spec: Shot<DioramaJourneySpec> }
export type FilmShot3dContent = Shot3dTabletopStory | Shot3dScaleJourney | Shot3dInsideOut | Shot3dDioramaJourney | Shot3dShadowReveal | Shot3dChainReaction | Shot3dPhysicalData | Shot3dHeroTurn | Shot3dPartSpotlight | Shot3dExplodedView | Shot3dFinishCompare | Shot3dTwoAngle | Shot3dScreenAlive
  | Shot3dStepInside | Shot3dManyIntoOne | Shot3dLightThroughWater | Shot3dBakedFlythrough | Shot3dCapturedPlace | Shot3dPhysicsPoint;
export type Shot3dKind = FilmShot3dContent["shot"];
export const SHOT_3D_KINDS: readonly Shot3dKind[] = ["hero-turn", "part-spotlight", "exploded-view", "finish-compare", "two-angle", "screen-alive", "step-inside", "many-into-one", "light-through-water", "baked-flythrough", "captured-place", "physics-point",
  "shadow-reveal", "chain-reaction", "physical-data", "tabletop-story", "scale-journey", "inside-out", "diorama-journey"];
/** Shots drawn in Kumiki's product studio, where `studio` sets the look. */
const STUDIO_SHOTS: ReadonlySet<Shot3dKind> = new Set(["hero-turn", "part-spotlight", "exploded-view", "finish-compare", "two-angle", "screen-alive", "step-inside", "many-into-one", "physics-point", "chain-reaction", "physical-data", "tabletop-story", "scale-journey", "inside-out", "diorama-journey"]);

/** The recipe's full spec: the shot's spec with the scene's length, and a captured place's own path and credit under the author's. */
export function shot3dSpec<C extends FilmShot3dContent>(content: C, durationFrames: number): C["spec"] & { durationFrames: number } {
  if (content.shot === "captured-place") return { ...SHOT_3D_CAPTURES[content.capture], ...content.spec, durationFrames } as C["spec"] & { durationFrames: number };
  return { ...content.spec, durationFrames } as C["spec"] & { durationFrames: number };
}

export interface Shot3dCue { id: string; frame: number }
const beat = (id: string, text: TextBeat | undefined): Shot3dCue[] => text ? [{ id, frame: text.enter }] : [];
/** The moments a shot names, in scene frames: where the camera settles, a part arrives, a world is entered, a drop lands, a title
 * enters. `audio.cues` and `story.turnAt` refer to them as `<scene id>/<moment>`. Unknown frames are left out. */
export function shot3dCues(content: FilmShot3dContent, durationFrames: number, fps = 30): Shot3dCue[] {
  const cues: Shot3dCue[] = [];
  switch (content.shot) {
    case "hero-turn": cues.push({ id: "settle", frame: content.spec.settleFrame }, ...beat("claim", content.spec.claim), ...content.action ? [{ id: "action", frame: content.action.startFrame ?? 0 }] : []); break;
    case "part-spotlight": cues.push({ id: "push", frame: content.spec.pushStart }, { id: "close", frame: content.spec.pushEnd }, ...beat("label", content.spec.label)); break;
    case "exploded-view": cues.push({ id: "explode", frame: content.spec.explodeStart }, { id: "apart", frame: content.spec.explodeEnd }, ...beat("title", content.spec.title),
      ...content.spec.reassembleStart !== undefined ? [{ id: "reassemble", frame: content.spec.reassembleStart }] : [], ...content.spec.reassembleEnd !== undefined ? [{ id: "together", frame: content.spec.reassembleEnd }] : []); break;
    case "finish-compare": cues.push(...beat("title", content.spec.title)); break;
    case "two-angle": cues.push(...content.action ? [{ id: "action", frame: content.action.startFrame ?? 0 }] : [], ...beat("title", content.spec.title)); break;
    case "screen-alive": cues.push({ id: "push", frame: content.spec.pushStart }, { id: "close", frame: content.spec.pushEnd }, { id: "ui", frame: content.spec.uiStart }, ...beat("title", content.spec.title),
      ...content.spec.pullStart !== undefined ? [{ id: "pull", frame: content.spec.pullStart }] : []); break;
    case "step-inside": cues.push({ id: "push", frame: content.spec.pushStart }, { id: "close", frame: content.spec.closeFrame }, { id: "cross", frame: content.spec.crossFrame }, ...beat("title", content.spec.title)); break;
    case "many-into-one": cues.push({ id: "gather", frame: content.spec.startFrame }, { id: "form", frame: content.spec.formFrame }, ...beat("title", content.spec.title)); break;
    case "light-through-water": cues.push(...content.spec.drop ? [{ id: "drop", frame: content.spec.drop.frame }] : [], ...beat("title", content.spec.title)); break;
    case "baked-flythrough": cues.push(...beat("title", content.spec.title)); break;
    case "captured-place": cues.push(...beat("title", content.spec.title)); break;
    case "shadow-reveal": cues.push(...beat("question", content.spec.question), { id: "reveal", frame: content.spec.revealStart }, { id: "aligned", frame: content.spec.revealEnd }, ...beat("answer", content.spec.answer)); break;
    case "chain-reaction": {
      let at = 0;
      chainReadFrames(content.spec.links, fps).forEach((frames, i) => { cues.push({ id: `link-${i + 1}`, frame: at }); at += frames; });
      cues.push({ id: "push", frame: content.spec.pushFrame }, { id: "settled", frame: chainSettleFrame(shot3dSpec(content, durationFrames), SHOT_3D_CHAIN_SETTLE[content.spec.links.length] ?? 0) }, ...beat("title", content.spec.title));
      break;
    }
    case "physical-data": cues.push({ id: "drop", frame: content.spec.dropStart }, { id: "stacked", frame: physicalDataEnd(shot3dSpec(content, durationFrames)) }, ...beat("title", content.spec.title)); break;
    case "tabletop-story": content.spec.beats.forEach(beat => cues.push({ id: beat.id, frame: beat.startFrame }, { id: `${beat.id}-set`, frame: beat.startFrame + TABLETOP_MOVE })); break;
    case "scale-journey": {
      let at = 0;
      scaleStopFrames(shot3dSpec(content, durationFrames), fps).forEach((frames, i) => { cues.push({ id: content.spec.stops[i].id, frame: at + (i ? SCALE_MOVE : 0) }); at += frames; });
      cues.push(...beat("title", content.spec.title)); break;
    }
    case "inside-out": cues.push({ id: "cut", frame: content.spec.cutStart }, { id: "open", frame: content.spec.cutEnd },
      ...(content.spec.labels ?? []).map((_, i) => ({ id: `label-${i + 1}`, frame: insideOutLabelFrame(shot3dSpec(content, durationFrames), i) })), ...beat("title", content.spec.title)); break;
    case "diorama-journey": dioramaSchedule(shot3dSpec(content, durationFrames), fps).forEach((stop, i) => cues.push({ id: content.spec.stations[i].id, frame: stop.arrive }));
      cues.push(...beat("title", content.spec.title)); break;
    case "physics-point": cues.push({ id: "settled", frame: SHOT_3D_PHYSICS[content.bake].lastContactFrame }, ...content.spec.labels?.map(label => ({ id: "label-" + label.group, frame: label.enter })) ?? [], ...beat("title", content.spec.title)); break;
  }
  const own = new Set(cues.map(cue => cue.id));
  return [...cues, ...(content.moments ?? []).filter(moment => !own.has(moment.id))].filter(cue => cue.frame >= 0 && cue.frame < durationFrames).sort((a, b) => a.frame - b.frame);
}
/** Where a story's turn lands by default: the moment the shot exists for. */
export function shot3dTurnCue(content: FilmShot3dContent): string {
  const turns: Record<Shot3dKind, string> = { "hero-turn": "settle", "part-spotlight": "close", "exploded-view": "apart", "finish-compare": "title", "two-angle": "action", "screen-alive": "ui",
    "step-inside": "cross", "many-into-one": "form", "light-through-water": "drop", "baked-flythrough": "title", "captured-place": "title", "physics-point": "settled",
    "shadow-reveal": "aligned", "chain-reaction": "settled", "physical-data": "stacked", "tabletop-story": "title", "scale-journey": "title", "inside-out": "open", "diorama-journey": "title" };
  return turns[content.shot];
}

export interface Shot3dProblem { severity: "error" | "warning"; code: string; /** JSON Pointer under the scene's `content`. */ path: string; message: string; hint?: string }
/** Everything that can be checked without a renderer: names against the tables, frames inside the scene, and the recipe's own craft rules. */
export function inspectShot3d(content: FilmShot3dContent, durationFrames: number, fps: number): Shot3dProblem[] {
  const problems: Shot3dProblem[] = [];
  const error = (code: string, path: string, message: string, hint?: string) => problems.push({ severity: "error", code, path, message, hint });
  const list = (items: readonly string[]) => items.join(", ");
  if (!SHOT_3D_KINDS.includes(content.shot)) { error("shot-3d-unknown", "/shot", `"${content.shot}" is not a 3D shot.`, `Shots: ${list(SHOT_3D_KINDS)}.`); return problems; }
  if (!content.label?.trim()) error("shot-3d-label", "/label", "A 3D shot needs a text alternative.", "Say what the viewer sees.");
  const subjectId = "subject" in content ? content.subject : undefined, subject = subjectId ? SHOT_3D_SUBJECTS[subjectId] : undefined;
  if (subjectId && !subject) { error("shot-3d-subject", "/subject", `"${subjectId}" is not a subject.`, `Subjects: ${list(Object.keys(SHOT_3D_SUBJECTS))}.`); return problems; }
  const part = (name: string, path: string) => { if (subject && !(subject.parts as readonly string[]).includes(name)) error("shot-3d-part", path, `"${name}" is not a part of the ${subjectId}.`, `Parts: ${list(subject.parts)}.`); };
  const action = (value: { id: string; startFrame?: number } | undefined) => {
    if (value && subject && !(subject.actions as readonly string[]).includes(value.id)) error("shot-3d-action", "/action/id", `The ${subjectId} has no action "${value.id}".`, `Actions: ${list(subject.actions)}.`);
  };
  const screen = (name: string, path: string) => { part(name, path); if (subject && name !== subject.screen) error("shot-3d-screen-part", path, `"${name}" is not the ${subjectId}'s screen.`, `Use "${subject.screen}".`); };
  if (content.studio && !STUDIO_SHOTS.has(content.shot))
    problems.push({ severity: "warning", code: "shot-3d-studio-unused", path: "/studio", message: `A ${content.shot} shot has no studio, so "studio" does nothing.` });
  const pale = content.studio?.look === "high-key" || content.studio?.palette === "ivory" || content.studio?.palette === "sand";
  if (pale && content.tone !== "dark-on-light")
    problems.push({ severity: "warning", code: "shot-3d-tone", path: "/tone", message: "Pale light lets light text vanish into the sweep.", hint: 'Set "tone": "dark-on-light".' });
  const spec = shot3dSpec(content, durationFrames);
  const craft: { code: string; severity: "error" | "warning"; message: string }[] = [];
  switch (content.shot) {
    case "hero-turn": action(content.action); craft.push(...inspectStudioShot("hero-turn", spec as HeroTurnSpec, fps)); break;
    case "part-spotlight": part(content.spec.part, "/spec/part"); craft.push(...inspectStudioShot("part-spotlight", spec as PartSpotlightSpec, fps)); break;
    case "exploded-view":
      (content.spec.parts ?? []).forEach((piece, index) => (typeof piece === "string" ? [piece] : piece).forEach(name => part(name, `/spec/parts/${index}`)));
      (content.spec.labels ?? []).forEach((label, index) => part(label.piece, `/spec/labels/${index}/piece`));
      craft.push(...inspectStudioShot("exploded-view", spec as ExplodeSpec, fps)); break;
    case "finish-compare":
      if (content.finishes.length !== content.spec.panes.length) error("shot-3d-finishes", "/finishes", `${content.finishes.length} finish(es) for ${content.spec.panes.length} pane(s).`, "Give each pane one finish, in the same order.");
      craft.push(...inspectStudioShot("compare", spec as CompareSpec, fps)); break;
    case "two-angle": action(content.action); craft.push(...inspectStudioShot("compare", spec as CompareSpec, fps)); break;
    case "screen-alive":
      screen(content.spec.part, "/spec/part"); (content.spec.hide ?? []).forEach((name, index) => part(name, `/spec/hide/${index}`));
      if (!(SHOT_3D_SCREENS as readonly string[]).includes(content.screen)) error("shot-3d-screen", "/screen", `"${content.screen}" is not a screen.`, `Screens: ${list(SHOT_3D_SCREENS)}.`);
      craft.push(...inspectStudioShot("screen-alive", spec as ScreenAliveSpec, fps)); break;
    case "step-inside":
      screen(content.spec.part, "/spec/part"); (content.spec.hide ?? []).forEach((name, index) => part(name, `/spec/hide/${index}`));
      if (!(SHOT_3D_WORLDS as readonly string[]).includes(content.world)) error("shot-3d-world", "/world", `"${content.world}" is not a world.`, `Worlds: ${list(SHOT_3D_WORLDS)}.`);
      craft.push(...inspectStudioShot("step-inside", spec as StepInsideSpec, fps)); break;
    case "many-into-one": craft.push(...inspectStudioShot("many-into-one", spec as ManyIntoOneSpec, fps)); break;
    case "light-through-water": craft.push(...inspectLightShot(spec as LightThroughSpec, fps)); break;
    case "baked-flythrough":
      if (!(SHOT_3D_BAKED_SETS as readonly string[]).includes(content.set)) error("shot-3d-set", "/set", `"${content.set}" is not a baked set.`, `Sets: ${list(SHOT_3D_BAKED_SETS)}.`);
      craft.push(...inspectFlythrough(spec as FlythroughSpec, fps)); break;
    case "captured-place":
      if (!SHOT_3D_CAPTURES[content.capture]) { error("shot-3d-capture", "/capture", `"${content.capture}" is not a capture.`, `Captures: ${list(Object.keys(SHOT_3D_CAPTURES))}.`); break; }
      craft.push(...inspectCapturedPlace(spec as CapturedPlaceSpec, fps)); break;
    case "shadow-reveal": craft.push(...inspectShadowReveal(spec as ShadowRevealSpec, fps)); break;
    case "chain-reaction": {
      const settle = SHOT_3D_CHAIN_SETTLE[content.spec.links.length];
      craft.push(...inspectChainReaction(spec as ChainReactionSpec, settle ?? 0, fps)); break;
    }
    case "physical-data": craft.push(...inspectPhysicalData(spec as PhysicalDataSpec, fps)); break;
    case "tabletop-story": craft.push(...inspectTabletopStory(spec as TabletopStorySpec, fps)); break;
    case "scale-journey": craft.push(...inspectScaleJourney(spec as ScaleJourneySpec, fps)); break;
    case "inside-out": {
      const inside = subject?.inside as readonly string[] | undefined;
      if (!inside?.length) error("shot-3d-no-cutaway", "/subject", `The ${subjectId} has no cutaway, so there is nothing inside to show.`, `Subjects with a cutaway: ${list(Object.entries(SHOT_3D_SUBJECTS).filter(([, v]) => v.inside.length).map(([k]) => k))}.`);
      else (content.spec.labels ?? []).forEach((label, i) => { if (!inside.includes(label.part)) error("shot-3d-inside-part", `/spec/labels/${i}/part`, `"${label.part}" is not inside the ${subjectId}.`, `Inside: ${list(inside)}.`); });
      craft.push(...inspectInsideOut(spec as InsideOutSpec, fps)); break;
    }
    case "diorama-journey": craft.push(...inspectDioramaJourney(spec as DioramaJourneySpec, fps)); break;
    case "physics-point": {
      const bake = SHOT_3D_PHYSICS[content.bake];
      if (!bake) { error("shot-3d-bake", "/bake", `"${content.bake}" is not a physics bake.`, `Bakes: ${list(Object.keys(SHOT_3D_PHYSICS))}.`); break; }
      (content.spec.labels ?? []).forEach((label, index) => { if (!(bake.groups as readonly string[]).includes(label.group)) error("shot-3d-group", `/spec/labels/${index}/group`, `"${label.group}" is not a group in "${content.bake}".`, `Groups: ${list(bake.groups)}.`); });
      if (bake.lastContactFrame >= durationFrames) error("shot-3d-length", "", `The motion settles at frame ${bake.lastContactFrame}, after the scene ends.`, "Lengthen the scene.");
      craft.push(...inspectPhysicsShot(spec as PhysicsPointSpec, bake.lastContactFrame, fps)); break;
    }
  }
  for (const item of craft) problems.push({ ...item, path: "/spec" });
  const named = content.moments ?? [];
  named.forEach((moment, index) => {
    if (named.findIndex(other => other.id === moment.id) !== index) error("shot-3d-moment", `/moments/${index}/id`, `"${moment.id}" is used twice.`);
    if (!(moment.frame >= 0 && moment.frame < durationFrames)) error("shot-3d-moment", `/moments/${index}/frame`, `"${moment.id}" must sit inside the scene.`);
  });
  const texts = [["title", (content.spec as { title?: TextBeat }).title], ["claim", (content.spec as { claim?: TextBeat }).claim], ["label", (content.spec as { label?: TextBeat }).label]] as const;
  for (const [key, text] of texts) if (text && !(text.enter >= 0 && text.enter < durationFrames - 1))
    error("shot-3d-text-outside", `/spec/${key}/enter`, `The ${key} enters at frame ${text.enter}, outside a ${durationFrames}-frame scene.`, "Enter it earlier, or lengthen the scene.");
  return problems;
}

/** A frame after the last moment, for reduced motion: the recipes are built so the end of a shot is a still, readable picture. */
export function shot3dHoldFrame(durationFrames: number): number { return Math.max(0, durationFrames - 1); }
