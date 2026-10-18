import { AnimationGroup, motionTimelineGroup } from "../../registry/motion/director-authoring";
import { sequentialDataFlowRecipe } from "../../registry/motion/director-recipes";
import { compileMotionDirector } from "../../registry/motion/motion-director";
import { createExplodedTimeline } from "../../registry/motion/exploded-view";
import type { AssemblyPart3D } from "../../registry/motion/exploded-view";
import type { DirectorNode } from "../../registry/motion/director-types";
import type { MotionTimeline } from "../../registry/motion/types";
import { JOURNEY_FPS, JOURNEY_FRAMES, JOURNEY_POINTS, JOURNEY_ROUTE, journeyDeliveryFrame } from "./journey-content";

export const JOURNEY_SERVER_PARTS: AssemblyPart3D[] = [
  { id: "server-receive", label: "Receive", labelSide: "left", position: [0, 0, 0], offset: [0, 0, 0] },
  { id: "server-process", label: "Process", labelSide: "right", position: [0, .8, 0], offset: [0, .8, 0] },
  { id: "server-deliver", label: "Deliver", labelSide: "left", position: [0, 1.6, 0], offset: [0, 1.6, 0] },
];
export const JOURNEY_EXPLOSION = createExplodedTimeline({ id: "journey-server-layers", fps: JOURNEY_FPS, durationFrames: JOURNEY_FRAMES, parts: JOURNEY_SERVER_PARTS,
  separate: { startFrame: 1730, endFrame: 1840 }, reassemble: { startFrame: 1990, endFrame: 2080 }, staggerFrames: 10 });
export const JOURNEY_PACKET_IDS = ["hero-packet", ...Array.from({ length: 36 }, (_, i) => `traffic-${i}`)];
const scalar = (id: string, targetId: string, property: string, values: Array<[number, number]>): DirectorNode => ({ kind: "animation", id, track: { id, targetId, property, valueType: "number", easing: "ease-in-out-cubic", keyframes: values.map(([frame, value]) => ({ frame, value })) } });

/** All trajectories are declarative parameters to the existing public flow recipe. */
export function createJourneyMotion(latencyMs: number) {
  if (!Number.isFinite(latencyMs) || latencyMs < 40 || latencyMs > 600) throw new Error("Journey latency must be 40–600 illustrative milliseconds.");
  const deliveryFrame = journeyDeliveryFrame(latencyMs), finalLocal = deliveryFrame - 840;
  const route = JOURNEY_ROUTE.map(id => JOURNEY_POINTS[id]);
  const heroPoints = [...route.slice(0, 6), JOURNEY_POINTS.server, JOURNEY_POINTS.server, ...route.slice(6)];
  const heroTimes = [0, 180, 360, 550, 690, 870, 1040, 1260, 1370, 1480, finalLocal];
  const hero = sequentialDataFlowRecipe.create({ id: "message-carrier", at: 840, durationFrames: finalLocal + 1, staggerFrames: 0,
    packets: [{ targetId: "hero-packet", waypoints: heroPoints.map(p => ({ x: p[0], y: p[1] })), depth: heroPoints.map(p => p[2]), waypointFrames: heroTimes }] });
  const traffic = AnimationGroup({ id: "independent-traffic", at: 840, mode: "stagger", intervalFrames: 3,
    children: Array.from({ length: 36 }, (_, i) => {
      const lane = (i % 6 - 2.5) * .18, reversed = i % 4 === 0;
      const points = reversed ? [...route].reverse() : route;
      // Two differently offset routes per carrier create independent spatial phases.
      const traversal = [...points, ...points.slice().reverse(), ...points];
      return sequentialDataFlowRecipe.create({ id: `traffic-path-${i}`, durationFrames: 1745, staggerFrames: 0,
        packets: [{ targetId: `traffic-${i}`, waypoints: traversal.map((p, n) => ({ x: p[0] + lane, y: p[1] + .3 + (i % 3) * .16 + Math.sin(n + i) * .2 })), depth: traversal.map(p => p[2] + lane * 1.5) }] });
    }) });
  const effects = AnimationGroup({ id: "environment-effects", mode: "parallel", children: [
    scalar("send-press", "send-button", "press", [[0, 0], [95, 0], [105, 1], [122, 0], [2699, 0]]),
    scalar("transport-tunnel", "tunnel", "reveal", [[0, 0], [552, 0], [650, 1], [790, 1], [870, .15], [2450, .15], [2699, .1]]),
    scalar("message-appearance", "screen-message", "reveal", [[0, 0], [38, 0], [82, 1], [180, 1], [238, 0], [2699, 0]]),
    scalar("recipient-appearance", "recipient-message", "reveal", [[0, 0], [deliveryFrame - 1, 0], [deliveryFrame + 30, 1], [2699, 1]]),
  ] });
  const children = [hero, traffic, effects, motionTimelineGroup(JOURNEY_EXPLOSION, { id: "server-assembly" })];
  const targets = [...JOURNEY_PACKET_IDS, "send-button", "tunnel", "screen-message", "recipient-message", ...JOURNEY_SERVER_PARTS.map(p => p.id)];
  const result = compileMotionDirector({ schemaVersion: 1, id: "journey-object-motion", title: "Independent carriers and coordinated scene effects", fps: JOURNEY_FPS, durationFrames: JOURNEY_FRAMES, targets, children });
  if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join("\n"));
  return { children, targets, timeline: result.director.timeline as MotionTimeline, deliveryFrame };
}
