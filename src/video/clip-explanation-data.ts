/** K2 reference data: the prepared clip, the subject identity shared by footage and chart, the sourced payoff and
 * the timeline. Data only (type imports), so Node can load it. Numbers are illustrative fixtures, not measurements.
 */
import type { CostWaterfallSpec } from "../../registry/infographic/cost-waterfall";

export const EXPLANATION_FPS = { num: 30, den: 1 };
export const EXPLANATION_SIZE = { width: 1080, height: 1920 };

/** Stable IDs: the same subject is referenced by the footage annotation, the callout and the chart title. */
export const EXPLANATION_IDS = {
  clip: "explanation-conveyor-clip",
  subject: "parcel-7-3-label",
  scanner: "parcel-7-3-scanner",
  chart: "parcel-7-3-miss-cost",
  scanShot: "shot-scan-freeze",
  payoffShot: "shot-payoff-chart",
} as const;

/** Output frames per shot and the cut between them. The dissolve lies inside the payoff shot's first frames. */
export const EXPLANATION_TIMING = {
  scanFrames: 150,
  payoffFrames: 210,
  freezeAt: 45,
  freezeFrames: 60,
  calloutsAt: 63,
  dissolveFrames: 14,
} as const;
export const EXPLANATION_FRAMES = EXPLANATION_TIMING.scanFrames + EXPLANATION_TIMING.payoffFrames;

/** A sourced cost explanation for one parcel. Values are invented for layout and are marked illustrative. */
export const EXPLANATION_CHART: CostWaterfallSpec = {
  id: EXPLANATION_IDS.chart,
  title: "One missed scan, what it adds",
  subtitle: "Parcel 7-3 · illustrative per-parcel cost",
  unit: { currency: "USD", basis: "nominal" },
  steps: [
    { id: "delivery", label: "Standard delivery", amount: 6 },
    { id: "resort", label: "Re-sort at depot", amount: 1 },
    { id: "reroute", label: "Extra stop on the route", amount: 2 },
    { id: "notice", label: "Customer notice", amount: 1 },
    { id: "miss", label: "Cost of the miss", kind: "subtotal" },
    { id: "credit", label: "Late-delivery credit", amount: -2 },
    { id: "net", label: "Net cost after credit", kind: "total" },
  ],
  displayStep: 1,
  provenance: { illustrative: true, source: "Kumiki K2 fixture: invented example values" },
  reveal: { stepFrames: 16, gapFrames: 6 },
};
