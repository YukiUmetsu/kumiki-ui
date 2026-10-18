import { evaluateCameraPose3D } from "../../registry/motion/camera-pose-3d";
import { projectCameraBounds } from "../../registry/motion/camera-spatial";
import { inspectCameraComposition } from "../../registry/visual/camera-composition";
import { deriveSemanticTrackingWindow } from "../../registry/visual/camera-constraints";
import type { CameraCompositionContract } from "../../registry/visual/camera-composition";
import type { CameraComposition, CameraTargetRegistry, CompiledCinematicCamera } from "../../registry/motion/cinematic-camera-types";
import type { ProtectedSubjectRegion } from "../../registry/visual/explainer-layout";
import { JOURNEY_CHAPTERS, JOURNEY_POINTS, JOURNEY_ROUTE } from "./journey-content";
import { JOURNEY_STAGE_SEGMENTS } from "./journey-stage";
import type { JourneyAspect, JourneySettings } from "./journey-content";

type ChapterId = (typeof JOURNEY_CHAPTERS)[number]["id"];

export function journeySubjectComposition(aspect: JourneyAspect): CameraComposition {
  return aspect === "portrait"
    ? { safeRegion: { x: .1, y: .07, width: .8, height: .48 }, subjectPosition: [.5, .31] }
    : { safeRegion: { x: .07, y: .1, width: .53, height: .78 }, subjectPosition: [.335, .49] };
}

export const JOURNEY_SIGNAL_TRACKING = {
  shotId: "approach-service", movingId: "hero-packet", fromId: "router-b", toId: "router-c",
  searchStart: 1260, searchEnd: 1710, proximity: .5, leadFrames: 12, tailFrames: 12,
} as const;

export function journeyTrackingWindow(targets: CameraTargetRegistry) {
  const window = deriveSemanticTrackingWindow(targets, JOURNEY_SIGNAL_TRACKING);
  if (!window.ok) throw new Error(`Cannot schedule the router B-to-C follow shot: ${window.reason}`);
  return window;
}

/** Capture lightweight output rectangles before the build world's GPU resources
 * are disposed. Every rectangle comes from the same absolute-frame CC1 registry. */
export function createJourneyComposition(camera: CompiledCinematicCamera, targets: CameraTargetRegistry) {
  const criticalSubjects: NonNullable<CameraCompositionContract["criticalSubjects"]>[number][] = [];
  const worlds = JOURNEY_STAGE_SEGMENTS.filter(segment => segment.kind === "world");
  for (const shot of camera.shots) {
    const targets = typeof shot.spec.target === "string" ? [shot.spec.target] : shot.spec.target;
    // CC1 explicitly permits partial framing only during these authored handoffs.
    const settled = shot.startFrame + (shot.spec.transition?.kind === "continuous" ? shot.spec.transition.durationFrames ?? 45 : 0);
    for (const segment of worlds) {
      const startFrame = Math.max(settled, segment.start), endFrame = Math.min(shot.endFrame, segment.end);
      if (startFrame < endFrame) criticalSubjects.push({ id: `${shot.id}/${segment.id}`, targetIds: targets,
        startFrame, endFrame, safeRegion: shot.spec.composition?.safeRegion, strideFrames: 1 });
    }
  }
  const contract: CameraCompositionContract = { criticalSubjects, tracking: [JOURNEY_SIGNAL_TRACKING] };
  const guardDiagnostics = inspectCameraComposition(camera, targets, contract);
  if (guardDiagnostics.length) throw new Error(`Journey camera composition rejected: ${guardDiagnostics.map(d => d.message).join("\n")}`);
  const aspect = camera.spec.output.width / camera.spec.output.height;
  const subjectsByFrame: ProtectedSubjectRegion[][] = Array.from({ length: camera.spec.durationFrames }, () => []);
  for (const segment of worlds) for (let frame = segment.start; frame < segment.end; frame++) {
    const shot = camera.shots.find(shot => frame >= shot.startFrame && frame < shot.endFrame)!;
    const ids = typeof shot.spec.target === "string" ? [shot.spec.target] : shot.spec.target;
    const pose = evaluateCameraPose3D(camera.timeline, frame);
    for (const id of ids) {
      const projected = projectCameraBounds(pose, targets.sample(id, frame).bounds, aspect);
      // During explicit partial handoffs, only the portion inside the output can
      // obscure text. Full critical visibility above is never certified by clipping.
      const r = projected.rect, x = Math.max(0, r.x), y = Math.max(0, r.y);
      const right = Math.min(1, r.x + r.width), bottom = Math.min(1, r.y + r.height);
      if ([x, y, right, bottom].every(Number.isFinite) && right > x && bottom > y)
        subjectsByFrame[frame].push({ id, region: { x, y, width: right - x, height: bottom - y } });
    }
  }
  return { contract, guardDiagnostics, subjectsByFrame, tracking: journeyTrackingWindow(targets) };
}

interface Fact { eyebrow: string; headline: string; detail: string; objectId: keyof typeof JOURNEY_POINTS }

function conceptAt(chapter: ChapterId, settings: JourneySettings): Fact | null {
  const chapterInfo = JOURNEY_CHAPTERS.find(item => item.id === chapter);
  if (!chapterInfo) return null;
  // A caption expresses a chapter's educational point. It must not become
  // a jittery ticker when the camera simply changes position inside that shot.
  if (chapter === "network") {
    const current = settings.selectedRouter as keyof typeof JOURNEY_POINTS;
    const index = JOURNEY_ROUTE.findIndex(id => id === current);
    const nextHop = index >= 0 && index + 1 < JOURNEY_ROUTE.length
      ? JOURNEY_ROUTE[index + 1] : "messaging service";
    return {
      eyebrow: "ROUTER FORWARDING",
      headline: "Choose the next hop",
      detail: `The router matches the destination IP to its most specific forwarding entry, then sends the data toward ${nextHop.replace(/-/g, " ")}.`,
      objectId: current,
    };
  }
  if (chapter === "secure") return {
    eyebrow: "TRANSPORT BOUNDARY", headline: settings.protection === "end-to-end" ? "TLS + protected content" : "Encrypted in transit",
    detail: settings.protection === "end-to-end"
      ? "E2EE can protect content even from the service. TLS still covers each connection."
      : "TLS protects the device–service connection, not necessarily the message inside the service.",
    objectId: "gateway",
  };
  if (chapter === "server") return {
    eyebrow: "APPLICATION SERVICE", headline: "Receive · Process · Deliver",
    detail: "These components illustrate software responsibilities, not a physical server layout.",
    objectId: "server",
  };
  if (chapter === "delivery") return {
    eyebrow: "APPLICATION DELIVERY", headline: settings.recipientOnline ? "Recipient connected" : "Recipient offline",
    detail: settings.recipientOnline ? "A delivery indicator is not a read receipt." : "The service can retain the message until the recipient reconnects.",
    objectId: "recipient",
  };
  return null;
}

export function journeyExplanation(chapter: ChapterId, _frame: number, settings: JourneySettings): string {
  const fact = conceptAt(chapter, settings);
  if (!fact) return JOURNEY_CHAPTERS.find(item => item.id === chapter)!.caption;
  const heading = chapter === "network" ? `${settings.selectedRouter.replace(/-/g, " ")}: ${fact.headline}` : fact.headline;
  return `${heading}\n${fact.detail}${chapter === "network" ? "\nIllustrative route, not a live trace." : ""}`;
}
