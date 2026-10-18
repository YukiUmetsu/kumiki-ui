import { CameraPath, CameraSequence, CameraShotRecipe } from "../../registry/motion/camera-shot-recipes";
import { cameraSequenceGroup, compileCinematicCamera } from "../../registry/motion/cinematic-camera-director";
import { CinematicShot, AnimationGroup } from "../../registry/motion/director-authoring";
import { compileMotionDirector } from "../../registry/motion/motion-director";
import type { CameraFraming, CameraSequenceSpec, CameraShotKind } from "../../registry/motion/cinematic-camera-types";
import { createJourneyMotion } from "./journey-motion";
import { createJourneyWorld } from "./journey-world";
import { createJourneyGraphics } from "./journey-graphics";
import { JOURNEY_CHAPTERS, JOURNEY_FPS, JOURNEY_FRAMES } from "./journey-content";
import type { JourneyAspect, JourneySettings } from "./journey-content";

export interface JourneyCameraStudy { type: CameraShotKind; target: string; framing: CameraFraming; path: "arc" | "linear" }
export function journeyCameraSpec(aspect: JourneyAspect): CameraSequenceSpec {
  const composition = { safeRegion: { x: .08, y: .25, width: .84, height: .53 }, subjectPosition: [.5, .51] as const };
  const continuous = { kind: "continuous" as const, durationFrames: 30, allowPartialFraming: true };
  const shot = (type: CameraShotKind, parameters: Parameters<typeof CameraShotRecipe>[1]) => CameraShotRecipe(type, { composition, ...parameters });
  return CameraSequence({ id: `message-journey-${aspect}`, title: "A Message's Journey", fps: JOURNEY_FPS, durationFrames: JOURNEY_FRAMES,
    output: aspect === "portrait" ? { width: 900, height: 1600 } : { width: 1600, height: 900 }, profile: "cinematic", maxCandidates: 4,
    shots: [
      shot("dolly", { id: "press-send", title: "Press Send", target: "sender", durationFrames: 240, framing: "close", elevation: 5, azimuth: 2, movement: "dolly-in", holdFrames: 25 }),
      shot("multi-object", { id: "find-service", title: "Finding the destination", target: ["sender", "resolver"], durationFrames: 300, framing: "close", elevation: 25, azimuth: 12, transition: continuous }),
      shot("crane", { id: "secure-path", title: "Secure connection", target: ["sender", "gateway"], durationFrames: 300, framing: "close", elevation: 15, endElevation: 28, azimuth: 20, transition: continuous }),
      shot("follow", { id: "follow-pieces", title: "Signals enter the network", target: "hero-packet", durationFrames: 420, elevation: 18, azimuth: 15, framing: "close", transition: continuous,
        path: CameraPath({ kind: "catmull-rom", points: [[0, 1.5, 5.5], [1.5, 1.8, 5.8], [0, 1.3, 5.5]], relativeToTarget: true }), overrides: { fov: 48 } }),
      shot("fly-through", { id: "network-flight", title: "Follow the link signal", target: "hero-packet", durationFrames: 80, framing: "close", transition: continuous, orientAlongPath: false,
        path: CameraPath({ kind: "bezier", points: [[0, 1.3, 5.5], [-1.5, 2, 5], [-2, 1.4, 4.8], [0, 1.2, 5]], relativeToTarget: true }), overrides: { fov: 52 } }),
      shot("orbit", { id: "forwarding-decision", title: "Choose the next hop", target: "router-b", durationFrames: 40, framing: "close", orbitDegrees: 45, azimuth: 5, elevation: 22, transition: { ...continuous, durationFrames: 25 } }),
      shot("follow", { id: "approach-service", title: "Track the signal from B to C", target: "hero-packet", durationFrames: 330, framing: "close", elevation: 20, azimuth: 15, transition: { ...continuous, durationFrames: 12 },
        path: CameraPath({ kind: "linear", points: [[0, 1.5, 5], [1, 2, 6]], relativeToTarget: true }), overrides: { fov: 48 } }),
      shot("exploded", { id: "server-inspection", title: "The messaging server", target: "server", durationFrames: 390, framing: "close", elevation: 18, azimuth: 12, orbitDegrees: 25, endElevation: 28, transition: continuous }),
      shot("follow", { id: "recipient-connection", title: "Delivery", target: "hero-packet", durationFrames: 360, framing: "close", transition: { kind: "cut" }, elevation: 14, azimuth: 5,
        path: CameraPath({ kind: "catmull-rom", points: [[0, 1.2, 5], [1, 1.5, 5], [0, .7, 5.8]], relativeToTarget: true }), overrides: { fov: 48 } }),
      shot("inspect", { id: "recipient-close", title: "Message delivered", target: "recipient", durationFrames: 240, framing: "medium", elevation: 7, azimuth: 8, movement: "hold", holdFrames: 100, transition: { kind: "cut" } }),
    ] });
}

export function createJourneyProduction(aspect: JourneyAspect, settings: JourneySettings, options: { directorView?: boolean; study?: JourneyCameraStudy } = {}) {
  const start = performance.now(), motion = createJourneyMotion(settings.latencyMs, settings.recipientOnline), world = createJourneyWorld(motion.timeline, settings);
  try {
    const source = journeyCameraSpec(aspect);
    const original = options.directorView ? compileCinematicCamera(source, world.targets) : undefined;
    if (original && !original.ok) throw new Error(original.diagnostics.map(d => d.message).join("\n"));
    if (options.directorView) source.shots = [CameraShotRecipe("establish", { id: "director-overview", target: "network", durationFrames: JOURNEY_FRAMES, framing: "close", projection: "orthographic", elevation: 55, azimuth: 5, movement: "hold", composition: { safeMargin: .08 } })];
    else if (options.study) {
      const { type, target, framing, path } = options.study;
      source.shots = [CameraShotRecipe(type, { id: "camera-study", target, durationFrames: JOURNEY_FRAMES, framing,
        ...(type === "fly-through" ? { orientAlongPath: false, path: CameraPath({ kind: path === "linear" ? "linear" : "catmull-rom", points: path === "linear" ? [[0, 2, 10], [2, 3, 8]] : [[0, 2, 10], [3, 3, 9], [-2, 2, 8]], relativeToTarget: true }) } : {}) })];
    }
    const camera = compileCinematicCamera(source, world.targets);
    if (!camera.ok) throw new Error(camera.diagnostics.map(d => `${d.shotId ?? "camera"} at ${d.frame ?? "?"}: ${d.message}`).join("\n"));
    const graphics = createJourneyGraphics(aspect, camera.plan, world.targets, settings);
    const chapterScene = graphics.scenes[0].id;
    const chapters = JOURNEY_CHAPTERS.map(chapter => CinematicShot({ id: `chapter-${chapter.id}`, at: chapter.start, durationFrames: chapter.end - chapter.start, sceneRef: chapterScene,
      focusTarget: chapter.target, cameraRef: "camera3d", claim: chapter.title, visualObjective: chapter.caption, onScreenLabels: [chapter.title], staticFallback: chapter.explanation,
      narrationCue: `narration-${chapter.id}`, children: [{ kind: "cue", id: `narration-${chapter.id}`, durationFrames: chapter.end - chapter.start, payload: { kind: "narration", language: "en", text: chapter.explanation } }] }));
    const compilation = compileMotionDirector({ schemaVersion: 1, id: `network-journey-${aspect}`, title: "A Message's Journey", fps: JOURNEY_FPS, durationFrames: JOURNEY_FRAMES,
      targets: [...new Set([...motion.targets, ...world.targets.ids, "camera3d"])], scenes: graphics.scenes,
      children: [cameraSequenceGroup(camera.plan), AnimationGroup({ id: "subject-choreography", mode: "parallel", children: motion.children }), ...chapters, ...graphics.transformations,
        ...(settings.recipientOnline ? [{ kind: "cue" as const, id: "message-delivered", at: motion.deliveryFrame, targetId: "recipient", payload: { kind: "event" as const, name: "recipient-delivery" } }] : [])] });
    if (!compilation.ok) throw new Error(compilation.diagnostics.map(d => `${d.code}: ${d.message}`).join("\n"));
    return { camera: camera.plan, authoredCamera: original?.ok ? original.plan : camera.plan, director: compilation.director, motion, graphics, compilationMs: performance.now() - start, settings, aspect,
      diagnostics: [...camera.diagnostics, ...compilation.diagnostics] };
  } finally { world.dispose(); }
}
export type JourneyProduction = ReturnType<typeof createJourneyProduction>;
