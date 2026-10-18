/** Narrative acceptance for the reference production.
 * All actions are derived from the authored eight chapters; the contract
 * rejects a missing conclusion or undefined learning outcome at compile time.
 */
import { JOURNEY_CHAPTERS, JOURNEY_FRAMES } from "./journey-content";
import type { VisualProductionContract } from "../../registry/visual/production-contract";

export const NETWORK_JOURNEY_OUTCOMES = [
  { id: "dns", concept: "Service discovery", claim: "DNS finds the messaging service's address, not the recipient's phone." },
  { id: "tls", concept: "Transport security", claim: "TLS protects the client-service connection; it does not automatically add E2EE." },
  { id: "routing", concept: "IP routing", claim: "Routers use IP destination information to forward packets across links." },
  { id: "delivery", concept: "Application delivery", claim: "The messaging service coordinates delivery; delivered is not the same as read." },
] as const;

const stages: Record<(typeof JOURNEY_CHAPTERS)[number]["id"], {
  actions: readonly string[];
  outcomes: readonly string[];
}> = {
  send: { actions: ["type-message", "tap-send", "show-outgoing-bubble"], outcomes: [] },
  dns: { actions: ["query-service-name", "show-resolver-answer"], outcomes: ["dns"] },
  secure: { actions: ["explain-transport-encryption", "contrast-e2ee"], outcomes: ["tls"] },
  packets: { actions: ["encapsulate-data", "map-osi-model"], outcomes: ["routing"] },
  network: { actions: ["forward-to-router", "inspect-destination"], outcomes: ["routing"] },
  server: { actions: ["receive", "process", "route-delivery"], outcomes: ["delivery"] },
  delivery: { actions: ["deliver-to-recipient", "distinguish-delivered-from-read"], outcomes: ["delivery"] },
  overview: { actions: ["show-recipient", "reveal-concrete-takeaways"], outcomes: ["dns", "tls", "routing", "delivery"] },
};

export const NETWORK_JOURNEY_CONTRACT: VisualProductionContract = {
  id: "network-journey",
  totalFrames: JOURNEY_FRAMES,
  shots: JOURNEY_CHAPTERS.map(chapter => ({
    id: chapter.id,
    startFrame: chapter.start,
    endFrame: chapter.end,
    visualObjective: chapter.caption,
    criticalSubjects: [chapter.target],
    actions: stages[chapter.id].actions,
    outcomeIds: stages[chapter.id].outcomes,
  })),
  outcomes: NETWORK_JOURNEY_OUTCOMES,
  closingShotId: "overview",
  closingOutcomeIds: NETWORK_JOURNEY_OUTCOMES.map(outcome => outcome.id),
};
