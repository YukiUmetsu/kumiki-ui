import type { CharacterCue, CharacterInstance } from "../../registry/character/definition";
import type { InkEnsemblePlan } from "../../registry/video/ink-wash-ensemble";
import type { InkEnsembleCastMember } from "../../registry/video/ink-wash-ensemble-react";
import { INK_TRAVELLER } from "./ink-wash-performer";
import { INK_APPRENTICE } from "./ink-wash-apprentice";
import { bakeInkActorTrack } from "../../registry/video/ink-actor-director";
import { makeClassicalInkFigure } from "./ink-figure-classical-art";
import type { InkFigureCraftControls } from "../../registry/video/ink-figure-craft";
import { DEFAULT_INK_FIGURE_CRAFT } from "../../registry/video/ink-figure-craft";

/** Original two-actor study. Source-specific acting/costume assets stay in this demo,
 * not inside the registry. Separate instance seeds/skins keep both rigs independent. */
export type InkDuetAspect = "landscape" | "portrait";
export function inkDuet(
  aspect: InkDuetAspect,
  craft: InkFigureCraftControls = DEFAULT_INK_FIGURE_CRAFT,
): {
  plan: InkEnsemblePlan;
  cast: InkEnsembleCastMember[];
  width: number; height: number;
} {
  const portrait = aspect === "portrait";
  const width = portrait ? 540 : 960, height = portrait ? 960 : 540;
  const masterArt = makeClassicalInkFigure(INK_TRAVELLER, "master", craft);
  const learnerArt = makeClassicalInkFigure(INK_APPRENTICE, "apprentice", craft);
  const first: CharacterInstance = {
    instanceId: "ink-master", characterId: masterArt.characterId,
    revision: masterArt.revision, seed: 197,
    targets: { viewer: { x: 210, y: 110 }, "ink-partner": { x: 244, y: 102 } },
  };
  const second: CharacterInstance = {
    instanceId: "ink-learner", characterId: learnerArt.characterId,
    revision: learnerArt.revision, skin: "slate", seed: 293,
    targets: { viewer: { x: 56, y: 112 }, "ink-partner": { x: 25, y: 102 } },
  };
  const cuesA: CharacterCue[] = [
    ...[14, 42].map((startFrame, i): CharacterCue =>
      ({ id: "master-step-" + i, kind: "action", name: "step",
        startFrame, instanceId: first.instanceId })),
    { id: "master-observe", kind: "gaze", target: "ink-partner",
      startFrame: 91, endFrame: 245, instanceId: first.instanceId },
    { id: "master-greet", kind: "action", name: "greet",
      startFrame: 141, instanceId: first.instanceId },
    { id: "master-expression", kind: "expression", name: "attentive",
      startFrame: 129, endFrame: 246, instanceId: first.instanceId },
    { id: "master-speak", kind: "speech", startFrame: 165, endFrame: 222,
      precision: "approximate", instanceId: first.instanceId },
    { id: "master-bow", kind: "action", name: "bow",
      startFrame: 269, instanceId: first.instanceId },
  ];
  const cuesB: CharacterCue[] = [
    ...[25, 53, 79].map((startFrame, i): CharacterCue =>
      ({ id: "learner-step-" + i, kind: "action", name: "step",
        startFrame, instanceId: second.instanceId })),
    { id: "learner-look", kind: "gaze", target: "ink-partner",
      startFrame: 101, endFrame: 247, instanceId: second.instanceId },
    { id: "learner-attend", kind: "expression", name: "attentive",
      startFrame: 135, endFrame: 245, instanceId: second.instanceId },
    { id: "learner-nod", kind: "action", name: "nod",
      startFrame: 194, instanceId: second.instanceId },
    { id: "learner-reply", kind: "speech", startFrame: 223, endFrame: 252,
      precision: "approximate", instanceId: second.instanceId },
    { id: "learner-smile", kind: "expression", name: "delighted",
      startFrame: 257, instanceId: second.instanceId },
    { id: "learner-bow", kind: "action", name: "bow",
      startFrame: 276, instanceId: second.instanceId },
  ];
  // Keep the staged palm regions near each other without overlapping feet.
  // Old root positions passed coarse reach yet left 70–96px hand gaps.
  const left = portrait ? [150, 212] : [225, 410];
  const right = portrait ? [389, 308] : [772, 576];
  const ground = portrait ? 821 : 478;
  const plan: InkEnsemblePlan = {
    actors: [
      { depth: 2, radius: portrait ? 54 : 65,
        track: bakeInkActorTrack({ id: "master", instanceId: first.instanceId, stopAtEnds: true,
          waypoints: [
            { frame: 0, x: left[0], y: ground, scale: portrait ? .68 : .75, facing: "right" },
            { frame: 117, x: left[1], y: ground, scale: portrait ? .75 : .85, facing: "right" },
            { frame: 329, x: left[1], y: ground, scale: portrait ? .75 : .85, facing: "right" },
          ] }) },
      { depth: 3, radius: portrait ? 48 : 65,
        track: bakeInkActorTrack({ id: "learner", instanceId: second.instanceId, stopAtEnds: true,
          waypoints: [
            { frame: 0, x: right[0], y: ground, scale: portrait ? .58 : .66, facing: "left" },
            { frame: 117, x: right[1], y: ground, scale: portrait ? .64 : .73, facing: "left" },
            { frame: 329, x: right[1], y: ground, scale: portrait ? .64 : .73, facing: "left" },
          ] }) },
    ],
    beats: [
      { id: "first-glance", sourceId: "master", targetId: "learner",
        kind: "regard", startFrame: 94, endFrame: 160 },
      { id: "reply", sourceId: "learner", targetId: "master",
        kind: "regard", startFrame: 101, endFrame: 246 },
      { id: "exchange", sourceId: "master", targetId: "learner",
        kind: "exchange", startFrame: 161, endFrame: 254,
        contactDistance: portrait ? 65 : 125, minimumSeparation: portrait ? 70 : 91 },
      { id: "attend", sourceId: "master", targetId: "learner",
        kind: "follow", startFrame: 256, endFrame: 329 },
    ],
  };
  const cast: InkEnsembleCastMember[] = [
    { trackId: "master", definition: masterArt, instance: first, cues: cuesA,
      label: "An ink-painted teacher, gesturing and speaking",
      partFinish: {
        eyes: {bleed:0,dryContour:true}, "pupil-left": {bleed:0,dryContour:true},
        "pupil-right": {bleed:0,dryContour:true}, mouth: {bleed:0,dryContour:true},
        head: {bleed:.12,dryContour:true}, hair: {bleed:.18,dryContour:true},
        beard: {bleed:.22}, body: {bleed:.85},
        "near-sleeve": {bleed:.76}, "far-sleeve": {bleed:.68},
        "near-hand": {bleed:.12,dryContour:true}, "far-hand": {bleed:.12,dryContour:true},
      } },
    { trackId: "learner", definition: learnerArt, instance: second, cues: cuesB,
      label: "An ink-painted apprentice, listening and answering",
      partFinish: { eyes: { bleed: 0, dryContour: true },
        "pupil-left": {bleed:0,dryContour:true},
        "pupil-right": {bleed:0,dryContour:true},
        mouth: { bleed: 0, dryContour: true },
        head: { bleed: .12, dryContour: true },
        hair: {bleed:.16,dryContour:true},
        "near-hand": {bleed:.10,dryContour:true},
        "far-hand": {bleed:.10,dryContour:true},
        body: { bleed: .76 }, "near-sleeve": { bleed: .65 },
        "far-sleeve": { bleed: .65 } } },
  ];
  return { plan, cast, width, height };
}
