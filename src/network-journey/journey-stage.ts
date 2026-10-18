/** A compact, frame-addressed edit decision list for the Network Journey.
 * This is presentation composition, not a new motion clock or animation engine.
 * MG1 owns all time; transitions are computed purely from its absolute frame.
 */
import { JOURNEY_FRAMES } from "./journey-content";

export type JourneyStageKind = "phone" | "world" | "dns" | "protocol"
  | "recipient" | "recap" | "vt-phone" | "vt-packets" | "vt-overview";

export interface JourneyStageSegment {
  id: string;
  kind: JourneyStageKind;
  start: number;
  end: number; // Exclusive MG1 frame boundary.
}

export interface JourneyStageLayer {
  id: string;
  kind: JourneyStageKind;
  frame: number;
  opacity: number;
  outgoing: boolean;
}

export const JOURNEY_STAGE_SEGMENTS: readonly JourneyStageSegment[] = [
  { id: "sender-composer", kind: "phone", start: 0, end: 190 },
  { id: "device-context", kind: "world", start: 190, end: 240 },
  // Avoid an anonymous three-box VT scene. A clear question/answer replaces it.
  { id: "dns-resolution", kind: "dns", start: 240, end: 540 },
  { id: "protected-transport", kind: "world", start: 540, end: 840 },
  { id: "message-data-handoff", kind: "vt-packets", start: 840, end: 870 },
  // Show actual signal leaving the sender before explaining OSI.
  { id: "signal-departs-phone", kind: "world", start: 870, end: 975 },
  { id: "osi-layers", kind: "protocol", start: 975, end: 1140 },
  { id: "tracked-network", kind: "world", start: 1140, end: 2460 },
  // End on the recipient's device, not a distant empty overhead network grid.
  { id: "message-arrives", kind: "recipient", start: 2460, end: 2505 },
  { id: "closing-recap", kind: "recap", start: 2505, end: JOURNEY_FRAMES },
] as const;

/** Twelve frames = 0.4 seconds at 30fps. Long dissolves are explicitly forbidden. */
export const JOURNEY_CROSSFADE_FRAMES = 12;

/** Representative quiet frames for accessible, motion-free chapter views. */
export const JOURNEY_STATIC_FRAMES = {
  send: 155,
  dns: 440,
  secure: 710,
  packets: 1080,
  network: 1500,
  server: 1915,
  delivery: 2340,
  overview: 2670,
} as const;

function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function journeyStageLayers(frame: number): JourneyStageLayer[] {
  const sample = Math.max(0, Math.min(JOURNEY_FRAMES - 1, Math.floor(frame)));
  const index = JOURNEY_STAGE_SEGMENTS.findIndex(segment => sample >= segment.start && sample < segment.end);
  if (index < 0) throw new Error(`Journey stage has no segment at frame ${sample}.`);
  const current = JOURNEY_STAGE_SEGMENTS[index];
  const prior = JOURNEY_STAGE_SEGMENTS[index - 1];
  const elapsed = sample - current.start;
  if (!prior || elapsed >= JOURNEY_CROSSFADE_FRAMES) {
    return [{ id: current.id, kind: current.kind, frame: sample, opacity: 1, outgoing: false }];
  }
  const opacity = smoothstep(elapsed / (JOURNEY_CROSSFADE_FRAMES - 1));
  return [
    { id: prior.id, kind: prior.kind, frame: prior.end - 1, opacity: 1 - opacity, outgoing: true },
    { id: current.id, kind: current.kind, frame: sample, opacity, outgoing: false },
  ];
}

/** These IDs correspond to the existing VT1 fragments, never to new renderers. */
export function journeyTransformationId(kind: JourneyStageKind) {
  switch (kind) {
    case "vt-phone": return "phone-to-network";
    case "vt-packets": return "message-to-packets";
    case "vt-overview": return "network-to-infographic";
    default: return null;
  }
}
