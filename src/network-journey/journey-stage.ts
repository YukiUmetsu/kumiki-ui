/** A compact, frame-addressed edit decision list for the Network Journey.
 * This is presentation composition, not a new motion clock or animation engine.
 * MG1 owns all time; transitions are computed purely from its absolute frame.
 */
import { JOURNEY_FRAMES } from "./journey-content";

export type JourneyStageKind = "phone" | "world" | "dns" | "protocol"
  | "vt-phone" | "vt-packets" | "vt-overview";

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
  { id: "phone-macro", kind: "phone", start: 0, end: 190 },
  { id: "phone-reveal", kind: "world", start: 190, end: 210 },
  { id: "name-handoff", kind: "vt-phone", start: 210, end: 250 },
  { id: "dns-lesson", kind: "dns", start: 250, end: 540 },
  { id: "secure-path", kind: "world", start: 540, end: 840 },
  { id: "data-handoff", kind: "vt-packets", start: 840, end: 880 },
  { id: "protocol-layers", kind: "protocol", start: 880, end: 1170 },
  { id: "network-journey", kind: "world", start: 1170, end: 2540 },
  { id: "overview-handoff", kind: "vt-overview", start: 2540, end: 2580 },
  { id: "overview-world", kind: "world", start: 2580, end: JOURNEY_FRAMES },
] as const;

/** Twelve frames = 0.4 seconds at 30fps. Long dissolves are explicitly forbidden. */
export const JOURNEY_CROSSFADE_FRAMES = 12;

/** Representative quiet frames for accessible, motion-free chapter views. */
export const JOURNEY_STATIC_FRAMES = {
  send: 155,
  dns: 440,
  secure: 710,
  packets: 1030,
  network: 1500,
  server: 1915,
  delivery: 2340,
  overview: 2650,
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
