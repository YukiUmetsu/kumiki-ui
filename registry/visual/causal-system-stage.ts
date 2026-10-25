/** CausalSystemStage core: variables and signed links with explicit evidence, deterministic feedback loops, structural
 * do(X = state) interventions with qualitative propagation, and counterfactual panels labelled under the stated model.
 *
 * Layout is automatic and deterministic: layers (portrait top to bottom, landscape left to right), dummy vertices for
 * links that skip layers, barycenter ordering, and feedback links drawn as return arcs outside the layer stack. Text is
 * measured with the injected measurer and wrapped or reported; nothing is truncated. Rendered boxes and link segments
 * are checked: boxes that intersect are `causal-overlap`, a link through a node is `causal-edge-through-node`.
 *
 * Semantics enforced here, not left to the author:
 * - Only mechanism and experiment links may carry a causal claim (`causal-claim-unsupported`).
 * - Observational links are dashed, never drawn with an arrowhead, and their arrow request is refused.
 * - do(X = state) cuts every link into X, fixes X and propagates direction only: the product of signs along simple
 *   paths. Paths through observational links are not traversed, so their effects are "not-identified".
 * - A feedback loop is reinforcing (R) with an even number of reducing links and balancing (B) with an odd number; an unsigned loop is refused.
 *
 * Fictional and simplified models. The library checks that the semantics shown match the declared evidence; it never
 * checks that a model is true.
 */
import type { MeasureText } from "../media/text-layout";
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, RationalFps, Rect, Vec2 } from "../motion/types";

export type EvidenceKind = "mechanism" | "experiment" | "observational" | "assumed";
export type CausalSign = "+" | "-";
export type ChangeDirection = "increase" | "decrease";
export type EffectKind = "increase" | "decrease" | "ambiguous" | "unknown" | "not-identified" | "none" | "fixed";
export type Orientation = "portrait" | "landscape";

export const CAUSAL_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
export const CAUSAL_EFFECT_WORDS: Record<EffectKind, string> = {
  increase: "rises", decrease: "falls", ambiguous: "ambiguous", unknown: "sign unknown",
  "not-identified": "not identified", none: "no path", fixed: "fixed",
};
const PATH_CAP = 5000;
const LOOP_CAP = 64;

export interface CausalNode { id: string; label: string }

export interface CausalLink {
  id: string;
  /** Cause. */
  from: string;
  /** Effect. */
  to: string;
  /** Omit when the sign is not established. Unsigned links cannot close a feedback loop. */
  sign?: CausalSign;
  evidence: EvidenceKind;
  /** Named public source for mechanism, experiment and observational links; fictional samples name the sample. */
  source?: string;
  /** `arrow` asks for a causal arrow. Observational links refuse it. @default "auto" */
  presentation?: "auto" | "arrow";
}

interface CausalBeatBase {
  id: string;
  /** Explanation shown under the readout statement. */
  caption: string;
  /** Short key statement for the readout card. Falls back to the caption when absent. */
  headline?: string;
  durationFrames: number;
}
export type CausalBeat =
  | (CausalBeatBase & { kind: "establish" })
  | (CausalBeatBase & { kind: "reveal"; linkIds: readonly string[] })
  /** Asserts causation over these links. Only mechanism or experiment evidence may be asserted. */
  | (CausalBeatBase & { kind: "causal"; linkIds: readonly string[] })
  /** Feedback loops are highlighted one after another. */
  | (CausalBeatBase & { kind: "loops" })
  /** do(node = state): structural cut and qualitative propagation, under the stated model. */
  | (CausalBeatBase & { kind: "intervene"; nodeId: string; change: ChangeDirection; state: string })
  /** A second branch with its own intervention, shown beside the base run and labelled as counterfactual. */
  | (CausalBeatBase & { kind: "counterfactual"; nodeId: string; change: ChangeDirection; state: string });

export interface CausalSystemSpec {
  id: string;
  title: string;
  /** The one honesty badge, e.g. "Simplified, fictional model". Shown in the header. */
  modelNote: string;
  /** Small line above the title: what is shown. */
  eyebrow: string;
  /** Evidence and source notes shown in the footer. */
  notes?: string;
  fps: RationalFps;
  nodes: readonly CausalNode[];
  links: readonly CausalLink[];
  beats: readonly CausalBeat[];
  /** Frames for emphasis and intervention fades. @default 18 */
  moveFrames?: number;
}

export interface CausalDiagnostic extends Diagnostic {
  nodeId?: string;
  linkId?: string;
  beatId?: string;
  orientation?: Orientation;
  panel?: "base" | "branch";
}

export interface FeedbackLoop {
  id: string;
  kind: "R" | "B" | "U";
  nodeIds: string[];
  linkIds: string[];
  negatives: number;
}

export interface Propagation {
  effects: Record<string, EffectKind>;
  cutLinkIds: string[];
  capped: boolean;
}

const sign = (s: CausalSign | undefined) => (s === "+" ? 1 : s === "-" ? -1 : null);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function outgoingLinks(spec: CausalSystemSpec): Map<string, CausalLink[]> {
  const known = new Set(spec.nodes.map(n => n.id));
  const out = new Map<string, CausalLink[]>();
  for (const link of spec.links) {
    if (!known.has(link.from) || !known.has(link.to) || link.from === link.to) continue;
    out.set(link.from, [...(out.get(link.from) ?? []), link]);
  }
  return out;
}

/** Every simple cycle, found once each from its earliest node in `spec.nodes`. Deterministic for a given spec. */
export function findFeedbackLoops(spec: CausalSystemSpec): { loops: FeedbackLoop[]; diagnostics: CausalDiagnostic[] } {
  const rank = new Map(spec.nodes.map((n, i) => [n.id, i] as const));
  const outgoing = outgoingLinks(spec);
  const found: CausalLink[][] = [];
  let capped = false;
  spec.nodes.forEach((start, startRank) => {
    const onPath = new Set<string>([start.id]);
    const stack: CausalLink[] = [];
    const walk = (node: string) => {
      for (const link of outgoing.get(node) ?? []) {
        if (capped) return;
        if (link.to === start.id) {
          if (found.length === LOOP_CAP) { capped = true; return; }
          found.push([...stack, link]);
          continue;
        }
        const next = rank.get(link.to);
        if (next === undefined || next <= startRank || onPath.has(link.to)) continue;
        onPath.add(link.to);
        stack.push(link);
        walk(link.to);
        stack.pop();
        onPath.delete(link.to);
      }
    };
    walk(start.id);
  });
  const counts = { R: 0, B: 0, U: 0 };
  const diagnostics: CausalDiagnostic[] = [];
  const loops = found.map((links): FeedbackLoop => {
    const signed = links.every(link => link.sign !== undefined);
    const negatives = links.filter(link => link.sign === "-").length;
    const kind = !signed ? "U" : negatives % 2 === 0 ? "R" : "B";
    counts[kind] += 1;
    if (!signed) diagnostics.push({ code: "loop-unsigned-link", severity: "error", linkId: links.find(l => !l.sign)?.id,
      message: `A feedback loop (${links.map(l => l.id).join(", ")}) has an unsigned link, so its type is undefined. Give every link in a cycle a direction: raises or reduces.` });
    return { id: `${kind}${counts[kind]}`, kind, nodeIds: links.map(l => l.from), linkIds: links.map(l => l.id), negatives };
  });
  if (capped) diagnostics.push({ code: "loop-enumeration-capped", severity: "error",
    message: `More than ${LOOP_CAP} feedback loops; the cycle list would be incomplete. Remove links or split the model.` });
  return { loops, diagnostics };
}

const classify = (set: Set<number | null>): EffectKind => {
  if (set.size > 1) return "ambiguous";
  const [value] = [...set];
  if (value === null || value === undefined) return "unknown";
  return value > 0 ? "increase" : "decrease";
};

/** Qualitative propagation of do(node = state): direction only, from signs along simple paths. */
export function propagateIntervention(spec: CausalSystemSpec, nodeId: string, change: ChangeDirection): Propagation {
  const outgoing = outgoingLinks(spec);
  const cut = new Set(spec.links.filter(l => l.to === nodeId).map(l => l.id));
  const start = change === "increase" ? 1 : -1;
  const trace = (allowAssociation: boolean) => {
    const reached = new Map<string, Set<number | null>>();
    let steps = 0, capped = false;
    const walk = (node: string, value: number | null, onPath: Set<string>) => {
      for (const link of outgoing.get(node) ?? []) {
        if (capped) return;
        if (cut.has(link.id) || (!allowAssociation && link.evidence === "observational") || onPath.has(link.to)) continue;
        if (++steps > PATH_CAP) { capped = true; return; }
        const s = sign(link.sign);
        const next = value === null || s === null ? null : value * s;
        reached.set(link.to, (reached.get(link.to) ?? new Set()).add(next));
        onPath.add(link.to);
        walk(link.to, next, onPath);
        onPath.delete(link.to);
      }
    };
    walk(nodeId, start, new Set([nodeId]));
    return { reached, capped };
  };
  const identified = trace(false), associated = trace(true);
  const effects: Record<string, EffectKind> = {};
  for (const node of spec.nodes) {
    if (node.id === nodeId) effects[node.id] = "fixed";
    else if (identified.reached.has(node.id)) effects[node.id] = classify(identified.reached.get(node.id)!);
    else effects[node.id] = associated.reached.has(node.id) ? "not-identified" : "none";
  }
  return { effects, cutLinkIds: [...cut], capped: identified.capped || associated.capped };
}

export function causalSystemDuration(spec: CausalSystemSpec): number {
  return spec.beats.reduce((n, beat) => n + beat.durationFrames, 0);
}

/** Model and beat checks that do not need a measured layout. */
export function validateCausalSystem(spec: CausalSystemSpec): CausalDiagnostic[] {
  const out: CausalDiagnostic[] = [];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<CausalDiagnostic> = {}) =>
    out.push({ code, severity, message, ...extra });
  const nodeIds = new Set<string>();
  for (const node of spec.nodes) {
    if (nodeIds.has(node.id)) report("error", "node-duplicate", `Node "${node.id}" appears twice.`, { nodeId: node.id });
    nodeIds.add(node.id);
    if (!node.label.trim()) report("error", "node-label-missing", `Node "${node.id}" needs a label.`, { nodeId: node.id });
  }
  const linkById = new Map<string, CausalLink>();
  for (const link of spec.links) {
    const where = { linkId: link.id };
    if (linkById.has(link.id)) report("error", "link-duplicate", `Link "${link.id}" appears twice.`, where);
    linkById.set(link.id, link);
    if (!nodeIds.has(link.from) || !nodeIds.has(link.to))
      report("error", "link-node-unknown", `Link "${link.id}" must connect two existing nodes.`, where);
    else if (link.from === link.to)
      report("error", "link-self-loop", `Link "${link.id}" points at its own node. A self-loop needs its own route and is not supported here.`, where);
    if (link.evidence !== "assumed" && !link.source?.trim())
      report("error", "link-source-missing", `Link "${link.id}" is ${link.evidence} evidence and needs a named source.`, where);
    if (link.evidence === "observational" && link.presentation === "arrow")
      report("error", "link-observational-arrow", `Link "${link.id}" is observational. It may be drawn only as a dashed association, never as a causal arrow.`, where);
  }

  const beatIds = new Set<string>();
  const revealedAt = new Map<string, number>();
  let cursor = 0;
  for (const beat of spec.beats) {
    const start = cursor;
    cursor += beat.durationFrames;
    const where = { beatId: beat.id };
    if (beatIds.has(beat.id)) report("error", "beat-duplicate", `Beat "${beat.id}" appears twice.`, where);
    beatIds.add(beat.id);
    if (!Number.isSafeInteger(beat.durationFrames) || beat.durationFrames < 1)
      report("error", "beat-invalid", `Beat "${beat.id}" needs a positive integer duration.`, where);
    if (!beat.caption.trim()) report("error", "beat-caption-missing", `Beat "${beat.id}" needs a caption; the claim must be on screen.`, where);
    if (beat.kind === "reveal" || beat.kind === "causal") {
      for (const id of beat.linkIds) if (!linkById.has(id))
        report("error", "beat-link-unknown", `Beat "${beat.id}" refers to unknown link "${id}".`, { ...where, linkId: id });
    }
    if (beat.kind === "reveal") for (const id of beat.linkIds) if (!revealedAt.has(id)) revealedAt.set(id, cursor);
    const needShown = (ids: readonly string[]) => {
      for (const id of ids) {
        const shown = revealedAt.get(id);
        if (linkById.has(id) && (shown === undefined || shown > start))
          report("warning", "beat-link-unrevealed", `Beat "${beat.id}" uses link "${id}" before a reveal beat has drawn it.`, { ...where, linkId: id });
      }
    };
    if (beat.kind === "causal") {
      if (beat.linkIds.length === 0) report("error", "causal-claim-empty", `Beat "${beat.id}" asserts causation over no links.`, where);
      for (const id of beat.linkIds) {
        const link = linkById.get(id);
        if (link && link.evidence !== "mechanism" && link.evidence !== "experiment")
          report("error", "causal-claim-unsupported",
            `Beat "${beat.id}" asserts causation over "${id}", which is ${link.evidence} evidence. Only mechanism or experiment links may carry a causal claim; show it as association or assumption instead.`,
            { ...where, linkId: id });
      }
      needShown(beat.linkIds);
    }
    if (beat.kind === "loops") {
      const { loops } = findFeedbackLoops(spec);
      if (loops.length === 0) report("warning", "loops-none", `Beat "${beat.id}" shows loops, but the model has none.`, where);
      needShown(loops.flatMap(loop => loop.linkIds));
    }
    if (beat.kind === "intervene" || beat.kind === "counterfactual") {
      if (!nodeIds.has(beat.nodeId)) {
        report("error", "intervention-node-unknown", `Beat "${beat.id}" intervenes on unknown node "${beat.nodeId}". A do() needs an existing variable.`, where);
        continue;
      }
      if (!beat.state.trim()) report("error", "intervention-state-missing", `Beat "${beat.id}" needs the state it sets, e.g. "fixed high".`, where);
      if (beat.change !== "increase" && beat.change !== "decrease")
        report("error", "intervention-change-invalid", `Beat "${beat.id}" must set the node to "increase" or "decrease" relative to the base run.`, where);
      if (!spec.links.some(l => l.to === beat.nodeId))
        report("warning", "intervention-no-incoming", `Beat "${beat.id}" sets "${beat.nodeId}", but no link points into it, so nothing is cut. The intervention is a no-op on its inputs.`, where);
      if (beat.change === "increase" || beat.change === "decrease") {
        const propagation = propagateIntervention(spec, beat.nodeId, beat.change);
        if (propagation.capped) report("error", "propagation-capped", `Beat "${beat.id}" has too many paths to propagate exactly.`, where);
        for (const [id, effect] of Object.entries(propagation.effects)) {
          if (effect === "ambiguous") report("warning", "propagation-ambiguous",
            `Beat "${beat.id}": conflicting paths reach "${id}" in opposite directions; its direction is ambiguous.`, { ...where, nodeId: id });
          if (effect === "unknown") report("warning", "propagation-unsigned",
            `Beat "${beat.id}": "${id}" is reached only through unsigned links; its direction is unknown.`, { ...where, nodeId: id });
        }
      }
    }
  }
  out.push(...findFeedbackLoops(spec).diagnostics);
  return out;
}

/* ------------------------------------------------------------------ *
 * Geometry primitives and the collision guard
 * ------------------------------------------------------------------ */

export function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return a.x < b.x + b.width + pad && b.x < a.x + a.width + pad && a.y < b.y + b.height + pad && b.y < a.y + a.height + pad;
}

/** Liang–Barsky: does the segment p→q enter the rectangle (shrunk by `inset`)? */
export function segmentHitsRect(p: Vec2, q: Vec2, r: Rect, inset = 0): boolean {
  const x0 = r.x + inset, x1 = r.x + r.width - inset, y0 = r.y + inset, y1 = r.y + r.height - inset;
  if (x1 <= x0 || y1 <= y0) return false;
  let t0 = 0, t1 = 1;
  const dx = q.x - p.x, dy = q.y - p.y;
  const clip = (pp: number, qq: number) => {
    if (pp === 0) return qq >= 0;
    const t = qq / pp;
    if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  return clip(-dx, p.x - x0) && clip(dx, x1 - p.x) && clip(-dy, p.y - y0) && clip(dy, y1 - p.y) && t0 <= t1;
}

export interface CausalGeometryItem {
  id: string;
  kind: "verb" | "loop" | "tag" | "chip";
  rect: Rect;
  /** A chip sits on its own node by design, so it skips the overlap test against that node. */
  owner?: string;
  /** Labels must stay clear of links. Sign badges sit on links by design, so they are exempt. */
  avoidEdges?: boolean;
}
export interface CausalGeometry {
  bounds: Rect;
  nodes: ReadonlyArray<{ id: string; rect: Rect }>;
  edges: ReadonlyArray<{ id: string; from: string; to: string; points: readonly Vec2[] }>;
  items: readonly CausalGeometryItem[];
}

/** The rendered-geometry guard: intersecting boxes and links that pass through a node are errors. */
export function checkCausalGeometry(g: CausalGeometry, orientation?: Orientation): CausalDiagnostic[] {
  const out: CausalDiagnostic[] = [];
  const err = (code: string, message: string, extra: Partial<CausalDiagnostic> = {}) =>
    out.push({ code, severity: "error", message, orientation, ...extra });
  const inside = (r: Rect) => r.x >= g.bounds.x - 0.5 && r.y >= g.bounds.y - 0.5 &&
    r.x + r.width <= g.bounds.x + g.bounds.width + 0.5 && r.y + r.height <= g.bounds.y + g.bounds.height + 0.5;
  for (const node of g.nodes) if (!inside(node.rect)) err("causal-outside", `Node "${node.id}" leaves the diagram area.`, { nodeId: node.id });
  for (const item of g.items) if (!inside(item.rect))
    err("causal-outside", `${item.kind} "${item.id}" leaves the diagram area.`, { linkId: item.kind === "verb" ? item.id : undefined });
  for (let i = 0; i < g.nodes.length; i += 1) for (let j = i + 1; j < g.nodes.length; j += 1)
    if (rectsOverlap(g.nodes[i].rect, g.nodes[j].rect, 4))
      err("causal-overlap", `Nodes "${g.nodes[i].id}" and "${g.nodes[j].id}" overlap or touch.`, { nodeId: g.nodes[i].id });
  g.items.forEach((item, i) => {
    for (const node of g.nodes) {
      if (node.id === item.owner) continue;
      if (rectsOverlap(item.rect, node.rect, 2))
        err("causal-overlap", `${item.kind} "${item.id}" overlaps node "${node.id}".`, { nodeId: node.id, linkId: item.kind === "verb" ? item.id : undefined });
    }
    g.items.forEach((other, j) => {
      if (j <= i) return;
      if (rectsOverlap(item.rect, other.rect, 2)) err("causal-overlap", `${item.kind} "${item.id}" overlaps ${other.kind} "${other.id}".`);
    });
    if (item.avoidEdges) for (const edge of g.edges) {
      for (let k = 1; k < edge.points.length; k += 1)
        if (segmentHitsRect(edge.points[k - 1], edge.points[k], item.rect, 1)) {
          err("causal-overlap", `${item.kind} "${item.id}" sits on the link "${edge.id}".`);
          break;
        }
    }
  });
  for (const edge of g.edges) for (const node of g.nodes) {
    if (node.id === edge.from || node.id === edge.to) continue;
    for (let k = 1; k < edge.points.length; k += 1)
      if (segmentHitsRect(edge.points[k - 1], edge.points[k], node.rect, 2)) {
        err("causal-edge-through-node", `Link "${edge.id}" passes through node "${node.id}".`, { linkId: edge.id, nodeId: node.id });
        break;
      }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export interface CausalTextLine { text: string; x: number; y: number }
export interface CausalMetrics {
  short: number;
  px: { eyebrow: number; title: number; badge: number; label: number; statement: number; caption: number; status: number; legend: number; notes: number; tag: number; loop: number; panel: number };
  lh: { eyebrow: number; title: number; badge: number; label: number; statement: number; caption: number; status: number; legend: number; notes: number; tag: number; loop: number; panel: number };
  font: { eyebrow: string; title: string; badge: string; label: string; statement: string; caption: string; status: string; legend: string; notes: string; tag: string; loop: string; panel: string; sign: string; chip: string; verb: string };
  pad: number; gap: number; minGap: number; maxGap: number; crossGap: number;
  edge: number; edgeEmphasis: number; arrowLength: number; arrowHalf: number; arrowGap: number;
  signR: number; chipR: number; pillPad: number; arcGap: number; arcStep: number; sampleLen: number; legendGap: number;
  rule: number; radius: number;
}

/** Sizes are fractions of the short side, so 9:16 and 16:9 outputs of one size share the same type scale. */
export function causalMetrics(width: number, height: number, family: string): CausalMetrics {
  const S = Math.min(width, height);
  // Type scale: title 4.5%, statement 4%, labels 3%, secondary text 2.3–2.6%, all fractions of the short side.
  const px = {
    eyebrow: Math.round(S * .024), title: Math.round(S * .045), badge: Math.round(S * .024), label: Math.round(S * .03),
    statement: Math.round(S * .04), caption: Math.round(S * .026), status: Math.round(S * .024), legend: Math.round(S * .024),
    notes: Math.round(S * .024), tag: Math.round(S * .024), loop: Math.round(S * .026), panel: Math.round(S * .03),
  };
  const lh = {
    eyebrow: Math.round(px.eyebrow * 1.3), title: Math.round(px.title * 1.2), badge: Math.round(px.badge * 1.3),
    label: Math.round(px.label * 1.2), statement: Math.round(px.statement * 1.22), caption: Math.round(px.caption * 1.32),
    status: Math.round(px.status * 1.3), legend: Math.round(px.legend * 1.3), notes: Math.round(px.notes * 1.3),
    tag: Math.round(px.tag * 1.3), loop: Math.round(px.loop * 1.3), panel: Math.round(px.panel * 1.3),
  };
  const f = (weight: number, size: number) => `${weight} ${size}px ${family}`;
  return {
    short: S, px, lh,
    font: {
      eyebrow: f(600, px.eyebrow), title: f(700, px.title), badge: f(600, px.badge), label: f(600, px.label),
      statement: f(700, px.statement), caption: f(500, px.caption), status: f(600, px.status), legend: f(500, px.legend),
      notes: f(500, px.notes), tag: f(600, px.tag), loop: f(700, px.loop), panel: f(600, px.panel),
      sign: f(700, Math.round(S * .026)), chip: f(700, Math.round(S * .026)), verb: f(600, Math.round(S * .024)),
    },
    pad: Math.round(S * .02), gap: S * .03, minGap: S * .12, maxGap: S * .18, crossGap: S * .035,
    edge: S * .0038, edgeEmphasis: S * .0065, arrowLength: S * .022, arrowHalf: S * .011, arrowGap: S * .012,
    signR: S * .022, chipR: S * .02, pillPad: S * .016, arcGap: S * .035, arcStep: S * .05, sampleLen: S * .085,
    legendGap: S * .045, rule: S * .0025, radius: S * .014,
  };
}

export interface CausalNodeLayout {
  id: string;
  label: string;
  layer: number;
  rect: Rect;
  center: Vec2;
  lines: CausalTextLine[];
  /** Effect chip sits on the node's top-right corner. */
  chip: { center: Vec2; r: number };
}
export interface CausalEdgeLayout {
  id: string;
  from: string;
  to: string;
  back: boolean;
  style: "causal" | "association" | "assumed";
  points: Vec2[];
  d: string;
  arrow?: { tip: Vec2; left: Vec2; right: Vec2 };
  /** Verb chip on the link, near its target: raises, reduces, moves with, moves against, or unsigned. */
  verb: { center: Vec2; rect: Rect; text: string; tone: "raises" | "reduces" | "association" | "unsigned" };
  /** Midpoint along the link, where the cut mark sits. */
  mid: Vec2;
}
export interface CausalLoopLayout { loopId: string; rect: Rect; text: string; textX: number; textY: number }
export interface CausalDiagram {
  rect: Rect;
  nodes: CausalNodeLayout[];
  byNode: ReadonlyMap<string, CausalNodeLayout>;
  edges: CausalEdgeLayout[];
  byEdge: ReadonlyMap<string, CausalEdgeLayout>;
  loops: ReadonlyMap<string, CausalLoopLayout>;
}
export interface CausalTag { nodeId: string; rect: Rect; text: string; textX: number; textY: number }
export type CausalLegendKey = "causal" | "association" | "assumed" | "raises" | "reduces" | "chip" | "cut";
export interface CausalLegendItem { key: CausalLegendKey; text: string; textX: number; y: number; sample: { x0: number; x1: number; y: number } }

export interface CausalReadoutBeat { label: CausalTextLine[]; statement: CausalTextLine[]; detail: CausalTextLine[] }
export interface CausalStageLayout {
  orientation: Orientation;
  metrics: CausalMetrics;
  eyebrow: CausalTextLine[];
  title: CausalTextLine[];
  badge: { rect: Rect; text: string; textX: number; textY: number };
  /** Readout card: the key statement for the beat, with its explanation. Right column in landscape, band above the footer in portrait. */
  readout: { rect: Rect; beats: ReadonlyMap<string, CausalReadoutBeat>; radius: number };
  notes: CausalTextLine[];
  diagram: CausalDiagram;
  panels: {
    base: { rect: Rect; title: CausalTextLine[]; diagram: CausalDiagram };
    branch: { rect: Rect; diagram: CausalDiagram };
  };
  /** Title of each counterfactual panel, keyed by beat id. */
  counterfactualTitles: ReadonlyMap<string, CausalTextLine[]>;
  /** The do() tag of each intervention or counterfactual beat, keyed by beat id. */
  tags: ReadonlyMap<string, CausalTag>;
  legend: CausalLegendItem[];
  diagnostics: CausalDiagnostic[];
}

export interface CausalLayoutOptions {
  measure: MeasureText;
  /** CSS family for measuring and rendering. Pass the same value to the view. */
  family?: string;
}

/** Wrap by words, with a character fallback for long tokens and CJK. `fits` is false when a line still overflows. */
/** Narrowest wrap width at which the text fits in `maxLines` lines. Falls back to the limit when it cannot. */
function narrowestWrap(text: string, limit: number, font: string, measure: MeasureText, maxLines: number): number {
  const base = wrapCausalText(text, limit, font, measure);
  if (!base.fits) return limit;
  let lo = 1, hi = limit;
  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2;
    const trial = wrapCausalText(text, mid, font, measure);
    if (trial.fits && trial.lines.length <= maxLines) hi = mid; else lo = mid;
  }
  return hi;
}

export function wrapCausalText(text: string, maxWidth: number, font: string, measure: MeasureText): { lines: string[]; fits: boolean } {
  const lines: string[] = [];
  let line = "";
  const push = (piece: string, separator: string) => {
    const candidate = line ? line + separator + piece : piece;
    if (!line || measure(font, candidate) <= maxWidth) { line = candidate; return; }
    lines.push(line);
    line = piece;
  };
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (measure(font, word) <= maxWidth) { push(word, " "); continue; }
    for (const ch of Array.from(word)) push(ch, "");
  }
  if (line) lines.push(line);
  const fits = lines.every(item => measure(font, item) <= maxWidth + 0.5);
  return { lines: lines.length ? lines : [""], fits };
}

/** Where a ray from a node centre leaves its box, pushed `gap` further along the ray. */
function exitPoint(rect: Rect, from: Vec2, toward: Vec2, gap: number): Vec2 {
  const dx = toward.x - from.x, dy = toward.y - from.y, len = Math.hypot(dx, dy);
  if (len < 1e-9) return { ...from };
  const sx = Math.abs(dx) > 1e-9 ? rect.width / 2 / Math.abs(dx) : Infinity;
  const sy = Math.abs(dy) > 1e-9 ? rect.height / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: from.x + dx * s + dx / len * gap, y: from.y + dy * s + dy / len * gap };
}

/** Point `dist` back from the last point of a polyline. */
function pointBack(points: readonly Vec2[], dist: number): Vec2 {
  let remaining = dist;
  for (let i = points.length - 1; i > 0; i -= 1) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > 0 && len >= remaining) {
      const t = remaining / len;
      return { x: b.x + (a.x - b.x) * t, y: b.y + (a.y - b.y) * t };
    }
    remaining -= len;
  }
  return { ...points[0] };
}

function midpointOf(points: readonly Vec2[]): Vec2 {
  const total = points.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
  return pointBack(points, total / 2);
}

const LOOP_NAME: Record<FeedbackLoop["kind"], string> = { R: "reinforcing", B: "balancing", U: "polarity unknown" };

/** Lays one diagram out inside `rect`: layers, ordering, node sizes, edges, chips and loop badges, then checks geometry. */
function layoutDiagram(spec: CausalSystemSpec, rect: Rect, orientation: Orientation, m: CausalMetrics,
  measure: MeasureText, diagnostics: CausalDiagnostic[], panel?: "base" | "branch"): CausalDiagram {
  const report = (code: string, message: string, extra: Partial<CausalDiagnostic> = {}) =>
    diagnostics.push({ code, severity: "error", message, orientation, ...(panel ? { panel } : {}), ...extra });
  const nodesIn = [...new Map(spec.nodes.map(n => [n.id, n] as const)).values()];
  const index = new Map(nodesIn.map((n, i) => [n.id, i] as const));
  const links = spec.links.filter(l => index.has(l.from) && index.has(l.to) && l.from !== l.to);
  const out = new Map<string, CausalLink[]>();
  for (const link of links) out.set(link.from, [...(out.get(link.from) ?? []), link]);

  // Feedback: an edge into a node still on the DFS stack closes a cycle; it is drawn as a return arc.
  const state = new Map<string, number>(), back = new Set<string>();
  const visit = (u: string) => {
    state.set(u, 1);
    for (const link of out.get(u) ?? []) {
      const s = state.get(link.to) ?? 0;
      if (s === 1) back.add(link.id);
      else if (s === 0) visit(link.to);
    }
    state.set(u, 2);
  };
  for (const n of nodesIn) if (!state.get(n.id)) visit(n.id);

  // Longest-path layers over the acyclic remainder (Kahn order, ties by spec order).
  const dag = links.filter(l => !back.has(l.id));
  const dagOut = new Map<string, CausalLink[]>();
  const indeg = new Map<string, number>(nodesIn.map(n => [n.id, 0]));
  for (const link of dag) {
    dagOut.set(link.from, [...(dagOut.get(link.from) ?? []), link]);
    indeg.set(link.to, (indeg.get(link.to) ?? 0) + 1);
  }
  const layerOf = new Map<string, number>(nodesIn.map(n => [n.id, 0]));
  const queue = nodesIn.filter(n => indeg.get(n.id) === 0).map(n => n.id);
  while (queue.length) {
    queue.sort((a, b) => index.get(a)! - index.get(b)!);
    const u = queue.shift()!;
    for (const link of dagOut.get(u) ?? []) {
      layerOf.set(link.to, Math.max(layerOf.get(link.to)!, layerOf.get(u)! + 1));
      indeg.set(link.to, indeg.get(link.to)! - 1);
      if (indeg.get(link.to) === 0) queue.push(link.to);
    }
  }
  const L = Math.max(1, ...nodesIn.map(n => layerOf.get(n.id)! + 1));

  // Links that skip layers pass through dummy vertices, one per skipped layer.
  const chains = new Map<string, string[]>();
  const layers: string[][] = Array.from({ length: L }, () => []);
  for (const n of nodesIn) layers[layerOf.get(n.id)!].push(n.id);
  const upNeighbours = new Map<string, string[]>(), downNeighbours = new Map<string, string[]>();
  const pushTo = (map: Map<string, string[]>, key: string, value: string) => map.set(key, [...(map.get(key) ?? []), value]);
  for (const link of dag) {
    const a = layerOf.get(link.from)!, b = layerOf.get(link.to)!;
    const chain = [link.from];
    for (let k = a + 1; k < b; k += 1) {
      const id = `${link.id}~${k}`;
      layers[k].push(id);
      chain.push(id);
    }
    chain.push(link.to);
    chains.set(link.id, chain);
    for (let k = 0; k + 1 < chain.length; k += 1) {
      pushTo(downNeighbours, chain[k], chain[k + 1]);
      pushTo(upNeighbours, chain[k + 1], chain[k]);
    }
  }

  // Barycenter sweeps, alternating down and up; ties keep the previous order.
  const position = new Map<string, number>();
  const sync = () => layers.forEach(layer => layer.forEach((id, i) => position.set(id, i)));
  sync();
  for (let pass = 0; pass < 8; pass += 1) {
    const down = pass % 2 === 0;
    const sequence = Array.from({ length: Math.max(0, L - 1) }, (_, i) => (down ? i + 1 : L - 2 - i));
    for (const l of sequence) {
      const keyed = layers[l].map((id, i) => {
        const ns = (down ? upNeighbours : downNeighbours).get(id) ?? [];
        const bary = ns.length ? ns.reduce((n, other) => n + position.get(other)!, 0) / ns.length : i;
        return { id, bary, i };
      });
      keyed.sort((a, b) => a.bary - b.bary || a.i - b.i);
      layers[l] = keyed.map(k => k.id);
      sync();
    }
  }

  // Sizes. The cross axis holds slots; the main axis holds layers.
  const backLinks = links.filter(l => back.has(l.id));
  const maxSlots = Math.max(1, ...layers.map(layer => layer.length));
  const portrait = orientation === "portrait";
  const arcReserve = backLinks.length ? m.arcGap + backLinks.length * m.arcStep : 0;
  const crossExtent = (portrait ? rect.width : rect.height) - arcReserve;
  const slot = crossExtent / maxSlots;
  const mainExtent = portrait ? rect.height : rect.width;
  // Portrait layers stack tightly: the verb chip (about 44 px) fits the band between rows with margin to spare.
  const gapFloor = portrait ? m.short * .045 : m.short * .07;
  const mainBudget = (mainExtent - (L - 1) * gapFloor) / L;
  const nodeWLimit = portrait ? slot - m.crossGap : mainBudget;
  const labelLines = new Map<string, string[]>();
  let widest = 0, maxLines = 1;
  // Models with interventions reserve a bottom row in every node: effect chips and the do() tag share it.
  const reserveTag = spec.beats.some(b => b.kind === "intervene" || b.kind === "counterfactual");
  const tagRow = reserveTag ? m.lh.tag + m.pillPad * .3 + m.pad * .4 : 0;
  for (const beat of spec.beats) {
    if (beat.kind === "intervene" || beat.kind === "counterfactual") widest = Math.max(widest, measure(m.font.tag, `do(${beat.state})`) + 2 * m.pillPad - 2 * m.pad);
  }
  // Labels wrap to the tallest line count any label needs, each at the narrowest width that keeps it there. Nodes hug
  // their text, the gaps between layers stay open for verb chips, and the node height is unchanged.
  const innerLimit = Math.max(1, nodeWLimit - 2 * m.pad);
  const tallest = Math.max(1, ...nodesIn.map(n => wrapCausalText(n.label, innerLimit, m.font.label, measure).lines.length));
  const innerW = Math.max(1, ...nodesIn.map(n => narrowestWrap(n.label, innerLimit, m.font.label, measure, tallest)));
  for (const n of nodesIn) {
    const wrap = wrapCausalText(n.label, innerW, m.font.label, measure);
    if (!wrap.fits || wrap.lines.length > 2)
      report("causal-label-overflow", `Label "${n.label}" does not fit in two lines at ${m.px.label} px; shorten it or use a larger output.`, { nodeId: n.id });
    labelLines.set(n.id, wrap.lines);
    maxLines = Math.max(maxLines, wrap.lines.length);
    widest = Math.max(widest, ...wrap.lines.map(line => measure(m.font.label, line)));
  }
  const nodeW = Math.max(1, Math.min(nodeWLimit, widest + 2 * m.pad));
  const nodeH = 2 * m.pad + maxLines * m.lh.label + tagRow;
  const mainSize = portrait ? nodeH : nodeW;
  const gapMain = L > 1 ? (mainExtent - L * mainSize) / (L - 1) : 0;
  if (L > 1 && gapMain < gapFloor)
    report("causal-crowded", `${L} layers need ${Math.ceil(gapFloor - gapMain)} px more ${portrait ? "height" : "width"} than this diagram has; use fewer nodes or a larger output.`);
  const usedGap = Math.min(Math.max(gapMain, 0), m.maxGap);
  const stack = L * mainSize + (L - 1) * usedGap;
  const mainStart = (portrait ? rect.y : rect.x) + (mainExtent - stack) / 2;
  const crossStart = portrait ? rect.x : rect.y;

  const place = new Map<string, Vec2>();
  layers.forEach((layer, l) => {
    const offset = (maxSlots - layer.length) * slot / 2;
    const main = mainStart + l * (mainSize + usedGap) + mainSize / 2;
    layer.forEach((id, k) => {
      const cross = crossStart + offset + (k + .5) * slot;
      place.set(id, portrait ? { x: cross, y: main } : { x: main, y: cross });
    });
  });

  const nodes: CausalNodeLayout[] = nodesIn.map(n => {
    const c = place.get(n.id)!;
    const box: Rect = { x: c.x - nodeW / 2, y: c.y - nodeH / 2, width: nodeW, height: nodeH };
    const lines = labelLines.get(n.id)!;
    const top = box.y + m.pad;
    void tagRow;
    return {
      id: n.id, label: n.label, layer: layerOf.get(n.id)!, rect: box, center: c,
      lines: lines.map((text, i) => ({ text, x: c.x, y: top + i * m.lh.label + m.px.label * .8 })),
      chip: { center: { x: c.x, y: box.y + box.height - m.pad * .5 - tagRow / 2 }, r: m.chipR },
    };
  });
  const byNode = new Map(nodes.map(n => [n.id, n] as const));
  const maxRight = Math.max(...nodes.map(n => n.rect.x + n.rect.width));
  const maxBottom = Math.max(...nodes.map(n => n.rect.y + n.rect.height));

  // Return arcs leave on the outer side (right in portrait, bottom in landscape); shorter spans sit inside.
  const span = (l: CausalLink) => Math.abs(layerOf.get(l.from)! - layerOf.get(l.to)!);
  const backOrder = [...backLinks].sort((a, b) => span(a) - span(b) || index.get(a.from)! - index.get(b.from)!);
  const laneOf = new Map(backOrder.map((l, k) => [l.id, k] as const));
  const verbH = m.lh.tag + m.pillPad * .6;
  const verbBoxes: Rect[] = [];
  const edges: CausalEdgeLayout[] = links.map(link => {
    const from = byNode.get(link.from)!, to = byNode.get(link.to)!;
    const isBack = back.has(link.id);
    let points: Vec2[];
    if (isBack) {
      const k = laneOf.get(link.id)!;
      // Orthogonal return route: out of the node's outer side, along a lane clear of every node, and back in.
      if (portrait) {
        const lane = maxRight + m.arcGap + k * m.arcStep;
        const y0 = from.center.y, y1 = to.center.y;
        points = [{ x: from.rect.x + from.rect.width + m.arrowGap, y: y0 }, { x: lane, y: y0 }, { x: lane, y: y1 },
          { x: to.rect.x + to.rect.width + m.arrowGap, y: y1 }];
      } else {
        const lane = maxBottom + m.arcGap + k * m.arcStep;
        const x0 = from.center.x, x1 = to.center.x;
        points = [{ x: x0, y: from.rect.y + from.rect.height + m.arrowGap }, { x: x0, y: lane }, { x: x1, y: lane },
          { x: x1, y: to.rect.y + to.rect.height + m.arrowGap }];
      }
    } else {
      const pts = chains.get(link.id)!.map(id => place.get(id)!);
      const start = exitPoint(from.rect, pts[0], pts[1], m.arrowGap);
      const end = exitPoint(to.rect, pts[pts.length - 1], pts[pts.length - 2], m.arrowGap);
      points = [start, ...pts.slice(1, -1), end];
    }
    const tip = points[points.length - 1], prev = points[points.length - 2];
    const dir = { x: tip.x - prev.x, y: tip.y - prev.y }, len = Math.hypot(dir.x, dir.y) || 1;
    const u = { x: dir.x / len, y: dir.y / len }, normal = { x: -u.y, y: u.x };
    const style = link.evidence === "observational" ? "association" : link.evidence === "assumed" ? "assumed" : "causal";
    const base = { x: tip.x - u.x * m.arrowLength, y: tip.y - u.y * m.arrowLength };
    const arrow = style === "association" ? undefined : {
      tip, left: { x: base.x + normal.x * m.arrowHalf, y: base.y + normal.y * m.arrowHalf },
      right: { x: base.x - normal.x * m.arrowHalf, y: base.y - normal.y * m.arrowHalf },
    };
    // Verb chip: the nearest clear spot along the link, counted back from its target.
    const verbText = style === "association"
      ? (link.sign === "-" ? "moves against" : link.sign === "+" ? "moves with" : "unsigned")
      : (link.sign === "-" ? "reduces" : link.sign === "+" ? "raises" : "unsigned");
    const verbWidth = measure(m.font.verb, verbText) + 2 * m.pillPad;
    const verbFits = (r: Rect) => r.x >= rect.x && r.y >= rect.y && r.x + r.width <= rect.x + rect.width && r.y + r.height <= rect.y + rect.height
      && nodes.every(n => !rectsOverlap(r, n.rect, 4)) && verbBoxes.every(o => !rectsOverlap(r, o, 4));
    // Candidates: points along every segment of the link, on it and just beside it on either side, nearest the target first.
    // The whole route is searched, not just the target end, so a crowded final segment cannot force an overlap.
    const step = verbH * .4;
    const sides = [0, 1, -1, 2, -2, 3, -3, 4, -4].map(k => k * verbH * .6);
    const candidates: Array<{ rect: Rect; dist: number }> = [];
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1], b = points[i];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / segLen, ny = (b.x - a.x) / segLen;
      const n = Math.max(1, Math.ceil(segLen / step));
      for (let k = 0; k <= n; k += 1) for (const side of sides) {
        const gx = a.x + (b.x - a.x) * (k / n) + nx * side, gy = a.y + (b.y - a.y) * (k / n) + ny * side;
        candidates.push({ rect: { x: gx - verbWidth / 2, y: gy - verbH / 2, width: verbWidth, height: verbH }, dist: Math.hypot(gx - tip.x, gy - tip.y) });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist || a.rect.x - b.rect.x || a.rect.y - b.rect.y);
    const verbRect = candidates.find(c => verbFits(c.rect))?.rect ?? { x: tip.x - verbWidth / 2, y: tip.y - verbH * 1.6 - verbH / 2, width: verbWidth, height: verbH };
    verbBoxes.push(verbRect);
    const d = points.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
    return {
      id: link.id, from: link.from, to: link.to, back: isBack, style, points, d, arrow,
      verb: { center: { x: verbRect.x + verbRect.width / 2, y: verbRect.y + verbH / 2 }, rect: verbRect, text: verbText,
        tone: style === "association" ? "association" : link.sign === "-" ? "reduces" : link.sign === "+" ? "raises" : "unsigned" },
      mid: midpointOf(points),
    };
  });
  const byEdge = new Map(edges.map(e => [e.id, e] as const));
  const rectAt = (c: Vec2, w: number, h: number): Rect => ({ x: c.x - w / 2, y: c.y - h / 2, width: w, height: h });

  // Loop badges: the nearest clear spot to the centroid of the loop's nodes.
  const { loops } = findFeedbackLoops(spec);
  const loopLayouts = new Map<string, CausalLoopLayout>();
  const placedBadges: Rect[] = [];
  const verbRects = edges.map(e => e.verb.rect);
  const chipRects = nodes.map(n => rectAt(n.chip.center, n.chip.r * 2, n.chip.r * 2));
  const pillH = m.lh.loop + m.pillPad * 1.2;
  const step = m.short * .03;
  const grid: Vec2[] = [];
  for (let y = rect.y; y <= rect.y + rect.height; y += step) for (let x = rect.x; x <= rect.x + rect.width; x += step) grid.push({ x: x - (rect.x + rect.width / 2) + step, y: y - (rect.y + rect.height / 2) + step });
  grid.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y) || a.y - b.y || a.x - b.x);
  for (const loop of loops) {
    const text = `${loop.id} ${LOOP_NAME[loop.kind]}`;
    const w = measure(m.font.loop, text) + 2 * m.pillPad;
    const members = loop.nodeIds.map(id => byNode.get(id)!.center);
    const c = members.length
      ? { x: members.reduce((n, p) => n + p.x, 0) / members.length, y: members.reduce((n, p) => n + p.y, 0) / members.length }
      : { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const clear = (r: Rect) => r.x >= rect.x && r.y >= rect.y && r.x + r.width <= rect.x + rect.width && r.y + r.height <= rect.y + rect.height
      && nodes.every(n => !rectsOverlap(r, n.rect, 6))
      && verbRects.every(s => !rectsOverlap(r, s, 6))
      && chipRects.every(s => !rectsOverlap(r, s, 6))
      && placedBadges.every(b => !rectsOverlap(r, b, 6))
      && edges.every(e => e.points.slice(1).every((p, i) => !segmentHitsRect(e.points[i], p, r, 1)));
    const chosen = grid.map(o => rectAt({ x: c.x + o.x, y: c.y + o.y }, w, pillH)).find(clear);
    if (!chosen) report("causal-overlap", `Loop ${loop.id} has no clear place for its badge inside the diagram.`);
    const box = chosen ?? rectAt(c, w, pillH);
    placedBadges.push(box);
    loopLayouts.set(loop.id, { loopId: loop.id, rect: box, text, textX: box.x + box.width / 2, textY: box.y + pillH / 2 + m.px.loop * .36 });
  }

  const items: CausalGeometryItem[] = [
    ...edges.map(e => ({ id: e.id, kind: "verb" as const, rect: e.verb.rect })),
    ...(reserveTag ? nodes.map((n, i) => ({ id: n.id, kind: "chip" as const, rect: chipRects[i], owner: n.id, avoidEdges: true })) : []),
    ...[...loopLayouts.values()].map(l => ({ id: l.loopId, kind: "loop" as const, rect: l.rect, avoidEdges: true })),
  ];
  diagnostics.push(...checkCausalGeometry({
    bounds: rect, nodes: nodes.map(n => ({ id: n.id, rect: n.rect })),
    edges: edges.map(e => ({ id: e.id, from: e.from, to: e.to, points: e.points })), items,
  }, orientation).map(d => ({ ...d, ...(panel ? { panel } : {}) })));
  return { rect, nodes, byNode, edges, byEdge, loops: loopLayouts };
}

/** Lays the whole stage out for one output: header (eyebrow, title, honesty badge), diagram, readout card, footer
 * with notes and legend, and counterfactual panels. Heights of the readout and footer are reserved from the largest
 * text across beats, so the frame never moves between beats. */
export function layoutCausalStage(spec: CausalSystemSpec, output: { width: number; height: number }, options: CausalLayoutOptions): CausalStageLayout {
  const { width: W, height: H } = output;
  const orientation: Orientation = H > W ? "portrait" : "landscape";
  const family = options.family ?? CAUSAL_FONT_FAMILY;
  const measure = options.measure;
  const m = causalMetrics(W, H, family);
  const diagnostics: CausalDiagnostic[] = [];
  const report = (code: string, message: string, extra: Partial<CausalDiagnostic> = {}) =>
    diagnostics.push({ code, severity: "error", message, orientation, ...extra });

  const mx = W * .055, innerW = W - 2 * mx, topPad = H * .035, bottomPad = H * .028;

  // Header: eyebrow, title (at most two lines), and one honesty badge.
  let y = topPad;
  const eyebrowWrap = wrapCausalText(spec.eyebrow, innerW, m.font.eyebrow, measure);
  if (!eyebrowWrap.fits || eyebrowWrap.lines.length > 1) report("causal-title-overflow", "The eyebrow must fit on one line; shorten it.");
  const eyebrow = [{ text: eyebrowWrap.lines[0], x: mx, y: y + m.px.eyebrow * .85 }];
  y += m.lh.eyebrow + m.gap * .25;
  const titleWrap = wrapCausalText(spec.title, innerW, m.font.title, measure);
  if (!titleWrap.fits || titleWrap.lines.length > 2) report("causal-title-overflow", "The title does not fit in two lines; shorten it.");
  const title = titleWrap.lines.slice(0, 2).map((text, i) => ({ text, x: mx, y: y + i * m.lh.title + m.px.title * .82 }));
  y += titleWrap.lines.length * m.lh.title + m.gap * .4;
  const badgeText = spec.modelNote;
  const badgeW = measure(m.font.badge, badgeText) + 2 * m.pillPad;
  if (!wrapCausalText(badgeText, innerW, m.font.badge, measure).fits || badgeW > innerW) report("causal-title-overflow", "The honesty badge must fit on one line.");
  const badgeH = m.lh.badge + m.pillPad * .9;
  const badge = { rect: { x: mx, y, width: badgeW, height: badgeH }, text: badgeText, textX: mx + m.pillPad, textY: y + badgeH / 2 + m.px.badge * .36 };
  const headerBottom = y + badgeH + m.gap;

  // Readout card text, wrapped per beat. Card width depends on the orientation.
  const cardPad = Math.round(m.pad * 1.4);
  const cardW = orientation === "landscape" ? innerW * .21 : innerW;
  const cardInner = cardW - 2 * cardPad;
  const beatsText = spec.beats.map(beat => {
    const label = wrapCausalText(beatLabel(beat), cardInner, m.font.status, measure);
    const statement = wrapCausalText(beat.headline ?? beat.caption, cardInner, m.font.statement, measure);
    const detail = beat.headline ? wrapCausalText(beat.caption, cardInner, m.font.caption, measure) : { lines: [] as string[], fits: true };
    if (!label.fits || label.lines.length > 2) report("causal-caption-overflow", `The label of beat "${beat.id}" needs more than two lines.`, { beatId: beat.id });
    if (!statement.fits || statement.lines.length > 3) report("causal-caption-overflow", `The statement of beat "${beat.id}" needs more than three lines; shorten it.`, { beatId: beat.id });
    if (!detail.fits || detail.lines.length > 4) report("causal-caption-overflow", `The explanation of beat "${beat.id}" needs more than four lines; shorten it.`, { beatId: beat.id });
    return { id: beat.id, label: label.lines.slice(0, 2), statement: statement.lines.slice(0, 3), detail: detail.lines.slice(0, 4) };
  });
  const labelMax = Math.max(1, ...beatsText.map(b => b.label.length));
  const statementMax = Math.max(1, ...beatsText.map(b => b.statement.length));
  const detailMax = Math.max(0, ...beatsText.map(b => b.detail.length));
  const gapA = m.gap * .5, gapB = detailMax ? m.gap * .45 : 0;
  const cardH = cardPad + labelMax * m.lh.status + gapA + statementMax * m.lh.statement + gapB + detailMax * m.lh.caption + cardPad;

  // Footer: notes (at most two lines), then legend rows. The footer height is fixed by the spec, not the beat.
  const notesWrap = spec.notes ? wrapCausalText(spec.notes, innerW, m.font.notes, measure) : { lines: [] as string[], fits: true };
  if (!notesWrap.fits || notesWrap.lines.length > 2) report("causal-caption-overflow", "The notes must fit on two lines; shorten them.");
  const notesLines = notesWrap.lines.slice(0, 2);
  const LEGEND: Array<{ key: CausalLegendKey; text: string }> = [
    { key: "causal", text: "Causal: mechanism or experiment" },
    { key: "association", text: "association (dashed): moves together, not shown to cause" },
    { key: "assumed", text: "assumed link (dotted)" },
    { key: "raises", text: "raises: more of A means more of B" },
    { key: "reduces", text: "reduces: more of A means less of B" },
    { key: "chip", text: "node change: ↑ rises, ↓ falls, ? unclear" },
    { key: "cut", text: "cut by do(): input severed" },
  ];
  const rows: Array<Array<{ key: CausalLegendKey; text: string; width: number }>> = [[]];
  let rowWidth = 0;
  for (const item of LEGEND) {
    const width = m.sampleLen + m.legendGap * .4 + measure(m.font.legend, item.text);
    if (rowWidth > 0 && rowWidth + m.legendGap + width > innerW) { rows.push([]); rowWidth = 0; }
    rows[rows.length - 1].push({ ...item, width });
    rowWidth += (rowWidth > 0 ? m.legendGap : 0) + width;
  }
  const notesH = notesLines.length * m.lh.notes;
  const footerH = notesH + (notesLines.length ? m.gap * .5 : 0) + rows.length * m.lh.legend;
  const footerTop = H - bottomPad - footerH;
  const notes = notesLines.map((text, i) => ({ text, x: mx, y: footerTop + i * m.lh.notes + m.px.notes * .8 }));
  const legendTop = footerTop + notesH + (notesLines.length ? m.gap * .5 : 0);
  const legend: CausalLegendItem[] = [];
  rows.forEach((row, r) => {
    let x = mx;
    const rowY = legendTop + r * m.lh.legend;
    for (const item of row) {
      legend.push({ key: item.key, text: item.text, textX: x + m.sampleLen + m.legendGap * .4, y: rowY + m.px.legend * .8,
        sample: { x0: x, x1: x + m.sampleLen, y: rowY + m.px.legend * .42 } });
      x += item.width + m.legendGap;
    }
  });

  // Main lane: the diagram beside (landscape) or above (portrait) the readout card.
  const mainTop = headerBottom, mainBottom = footerTop - m.gap * .8;
  const cardRect: Rect = orientation === "landscape"
    ? { x: mx + innerW - cardW, y: mainTop, width: cardW, height: cardH }
    : { x: mx, y: mainBottom - cardH, width: cardW, height: cardH };
  const diagramRect: Rect = orientation === "landscape"
    ? { x: mx, y: mainTop, width: innerW - cardW - m.gap * 1.2, height: mainBottom - mainTop }
    : { x: mx, y: mainTop, width: innerW, height: cardRect.y - m.gap * .8 - mainTop };
  if (diagramRect.height <= 0 || diagramRect.width <= 0) report("causal-crowded", "The header and readout leave no room for the diagram.");
  const diagram = layoutDiagram(spec, diagramRect, orientation, m, measure, diagnostics);

  // Readout text positions, shared by every beat so nothing shifts.
  const labelY = cardRect.y + cardPad + m.px.status * .85;
  const statementY = cardRect.y + cardPad + labelMax * m.lh.status + gapA + m.px.statement * .85;
  const detailY = cardRect.y + cardPad + labelMax * m.lh.status + gapA + statementMax * m.lh.statement + gapB + m.px.caption * .8;
  const readoutBeats = new Map<string, CausalReadoutBeat>();
  for (const b of beatsText) readoutBeats.set(b.id, {
    label: b.label.map((text, i) => ({ text, x: cardRect.x + cardPad, y: labelY + i * m.lh.status })),
    statement: b.statement.map((text, i) => ({ text, x: cardRect.x + cardPad, y: statementY + i * m.lh.statement })),
    detail: b.detail.map((text, i) => ({ text, x: cardRect.x + cardPad, y: detailY + i * m.lh.caption })),
  });

  // Counterfactual panels: side by side in landscape, stacked in portrait. Laid out only when the model has one.
  const gapP = m.gap * 1.6;
  const panelA: Rect = orientation === "landscape"
    ? { x: diagramRect.x, y: diagramRect.y, width: (diagramRect.width - gapP) / 2, height: diagramRect.height }
    : { x: diagramRect.x, y: diagramRect.y, width: diagramRect.width, height: (diagramRect.height - gapP) / 2 };
  const panelB: Rect = orientation === "landscape"
    ? { ...panelA, x: panelA.x + panelA.width + gapP }
    : { ...panelA, y: panelA.y + panelA.height + gapP };
  const stripH = m.lh.panel * 1.5;
  const bodyOf = (r: Rect): Rect => ({ x: r.x, y: r.y + stripH, width: r.width, height: r.height - stripH });
  const titleOrigin = (r: Rect) => ({ x: r.x + m.pad, y: r.y + m.px.panel * 1.05 });
  const hasCounterfactual = spec.beats.some(beat => beat.kind === "counterfactual");
  const panelBase = hasCounterfactual ? layoutDiagram(spec, bodyOf(panelA), orientation, m, measure, diagnostics, "base") : diagram;
  const panelBranch = hasCounterfactual ? layoutDiagram(spec, bodyOf(panelB), orientation, m, measure, diagnostics, "branch") : diagram;
  const baseTitle = wrapCausalText("As modelled", panelA.width - 2 * m.pad, m.font.panel, measure);
  if (!baseTitle.fits || baseTitle.lines.length > 1) report("causal-panel-title-overflow", "The panel title \"As modelled\" does not fit in its panel.");
  const baseTitleLines = [{ text: baseTitle.lines[0], x: titleOrigin(panelA).x, y: titleOrigin(panelA).y }];

  // do() tags sit in the bottom row of the fixed node; counterfactual titles name the intervention.
  const tags = new Map<string, CausalTag>();
  const counterfactualTitles = new Map<string, CausalTextLine[]>();
  for (const beat of spec.beats) {
    if (beat.kind !== "intervene" && beat.kind !== "counterfactual") continue;
    const label = spec.nodes.find(n => n.id === beat.nodeId)?.label ?? beat.nodeId;
    if (beat.kind === "counterfactual") {
      const t = wrapCausalText(`Counterfactual: do(${label} = ${beat.state})`, panelB.width - 2 * m.pad, m.font.panel, measure);
      if (!t.fits || t.lines.length > 1) report("causal-panel-title-overflow", `The title of counterfactual beat "${beat.id}" must fit on one line in its panel.`, { beatId: beat.id });
      counterfactualTitles.set(beat.id, [{ text: t.lines[0], x: titleOrigin(panelB).x, y: titleOrigin(panelB).y }]);
    }
    const target = beat.kind === "intervene" ? diagram : panelBranch;
    const node = target.byNode.get(beat.nodeId);
    if (!node) continue;
    const text = `do(${beat.state})`;
    const w = measure(m.font.tag, text) + 2 * m.pillPad, h = m.lh.tag + m.pillPad * .4;
    const box: Rect = { x: node.center.x - w / 2, y: node.rect.y + node.rect.height - m.pad * .35 - h, width: w, height: h };
    if (w > node.rect.width) report("causal-label-overflow", `The do() tag of beat "${beat.id}" is wider than its node; use a shorter state.`, { beatId: beat.id, nodeId: beat.nodeId });
    tags.set(beat.id, { nodeId: beat.nodeId, rect: box, text, textX: box.x + m.pillPad, textY: box.y + h / 2 + m.px.tag * .36 });
    diagnostics.push(...checkCausalGeometry({
      bounds: target.rect, nodes: target.nodes.map(n => ({ id: n.id, rect: n.rect })),
      edges: target.edges.map(e => ({ id: e.id, from: e.from, to: e.to, points: e.points })),
      items: [{ id: beat.id, kind: "tag", rect: box, owner: beat.nodeId, avoidEdges: true }],
    }, orientation).map(d => ({ ...d, beatId: beat.id, ...(beat.kind === "counterfactual" ? { panel: "branch" as const } : {}) })));
  }

  // Identical findings can come from a diagram and from a tag check; report each once.
  const seen = new Set<string>();
  const unique = diagnostics.filter(d => {
    const key = `${d.code}|${d.message}|${d.panel ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    orientation, metrics: m, eyebrow, title, badge,
    readout: { rect: cardRect, beats: readoutBeats, radius: m.radius * 1.4 },
    notes, diagram,
    panels: {
      base: { rect: panelA, title: baseTitleLines, diagram: panelBase },
      branch: { rect: panelB, diagram: panelBranch },
    },
    counterfactualTitles, tags, legend, diagnostics: unique,
  };
}


/** Label of the readout card for a beat: fixed text per beat kind. */
function beatLabel(beat: CausalBeat): string {
  switch (beat.kind) {
    case "establish": return "What is modelled";
    case "reveal": return "Links appear in order";
    case "causal": return `Causal claim, ${beat.linkIds.length} link${beat.linkIds.length === 1 ? "" : "s"}`;
    case "loops": return "Loops, one at a time";
    case "intervene": return "Intervention: inputs cut";
    case "counterfactual": return "Counterfactual under the stated model";
  }
}

export interface CausalFrame {
  beatIndex: number;
  beat: CausalBeat;
  /** Frames since the beat started. */
  local: number;
  /** Visibility per link id, 0–1, after emphasis and dimming. Links not yet revealed stay at 0. */
  linkVisible: Readonly<Record<string, number>>;
  /** Visibility from reveal beats only, before any dimming or cut. The counterfactual base panel uses this. */
  revealed: Readonly<Record<string, number>>;
  /** Strike amount per link id, 0–1, for links cut by the active intervention. */
  linkCut: Readonly<Record<string, number>>;
  /** Emphasis per link id, 0–1: asserted causal links or the active loop. */
  linkEmphasis: Readonly<Record<string, number>>;
  activeLoop?: { loop: FeedbackLoop; amount: number };
  intervention?: { nodeId: string; change: ChangeDirection; state: string; amount: number; effects: Readonly<Record<string, EffectKind>> };
  /** Counterfactual morph from the base run toward the branch, 0–1. */
  morph: number;
}

/** Pure: the frame's beat, link visibility and cut, emphasis, active loop and intervention effects. */
export function evaluateCausalSystem(spec: CausalSystemSpec, frame: number): CausalFrame {
  const moveFrames = spec.moveFrames ?? 18;
  const t = Math.max(0, Math.floor(frame));
  const last = spec.beats.length - 1;
  let cursor = 0, beatIndex = last, local = spec.beats[last]?.durationFrames ?? 0;
  const revealed: Record<string, number> = Object.fromEntries(spec.links.map(l => [l.id, 0]));
  spec.beats.forEach((beat, i) => {
    const start = cursor, end = start + beat.durationFrames;
    if (t >= start && t < end) { beatIndex = i; local = t - start; }
    if (beat.kind === "reveal" && t >= start) {
      const slot = beat.durationFrames / Math.max(1, beat.linkIds.length);
      beat.linkIds.forEach((id, k) => {
        const progress = t >= end ? 1 : clamp01((t - start - k * slot) / (slot * 0.6));
        revealed[id] = Math.max(revealed[id] ?? 0, evaluateEasing("ease-out", progress));
      });
    }
    cursor = end;
  });
  const beat = spec.beats[beatIndex];
  const dur = beat.durationFrames;
  const fadeIn = clamp01(local / moveFrames), fadeOut = clamp01((dur - local) / moveFrames);
  const linkVisible: Record<string, number> = { ...revealed };
  const linkCut: Record<string, number> = Object.fromEntries(spec.links.map(l => [l.id, 0]));
  const linkEmphasis: Record<string, number> = Object.fromEntries(spec.links.map(l => [l.id, 0]));
  let activeLoop: CausalFrame["activeLoop"];
  let intervention: CausalFrame["intervention"];
  let morph = 0;

  if (beat.kind === "causal") {
    const amount = evaluateEasing("ease-in-out", Math.min(fadeIn, fadeOut));
    for (const link of spec.links) {
      if (beat.linkIds.includes(link.id)) linkEmphasis[link.id] = amount;
      else linkVisible[link.id] *= 1 - 0.5 * amount;
    }
  }
  if (beat.kind === "loops") {
    const { loops } = findFeedbackLoops(spec);
    if (loops.length) {
      const segment = dur / loops.length;
      const index = Math.min(loops.length - 1, Math.floor(local / segment));
      const within = local - index * segment;
      const amount = evaluateEasing("ease-in-out", Math.min(clamp01(within / moveFrames), clamp01((segment - within) / moveFrames)));
      const loop = loops[index];
      activeLoop = { loop, amount };
      for (const link of spec.links) {
        if (loop.linkIds.includes(link.id)) linkEmphasis[link.id] = amount;
        else linkVisible[link.id] *= 1 - 0.6 * amount;
      }
    }
  }
  if (beat.kind === "intervene") {
    const amount = evaluateEasing("ease-in-out", Math.min(fadeIn, fadeOut));
    intervention = { nodeId: beat.nodeId, change: beat.change, state: beat.state, amount,
      effects: propagateIntervention(spec, beat.nodeId, beat.change).effects };
  }
  if (beat.kind === "counterfactual") {
    const rise = clamp01(local / Math.max(1, dur * 0.5));
    const amount = evaluateEasing("ease-in-out", Math.min(rise, fadeOut));
    morph = evaluateEasing("ease-in-out", rise);
    intervention = { nodeId: beat.nodeId, change: beat.change, state: beat.state, amount,
      effects: propagateIntervention(spec, beat.nodeId, beat.change).effects };
  }
  if (intervention) {
    for (const link of spec.links) {
      if (link.to === intervention.nodeId) linkCut[link.id] = intervention.amount;
      linkVisible[link.id] *= 1 - 0.55 * linkCut[link.id];
    }
  }
  return { beatIndex, beat, local, linkVisible, revealed, linkCut, linkEmphasis, activeLoop, intervention, morph };
}
