/**
 * Structure visualizers: process flow, timeline, hierarchy and general diagram.
 *
 * These are the P0 "B" items from docs/12 §B. They share one idea: a visualizer
 * owns the *geometry* of a relationship graph, and the art direction owns how
 * that geometry is painted. Nothing here decides colors or type sizes directly —
 * it asks {@link ResolvedStyle} — which is why the same process flow reads as a
 * print diagram under `editorial` and as a dark stage under `cinematic`.
 *
 * Accessibility contract for every visualizer in this file: **structure must be
 * recoverable from text alone.** A dashed connector means nothing to a screen
 * reader, so each semantic distinction (optional step, parallel branch, repeated
 * loop, interval milestone, tree depth, edge direction) is also stated in an
 * emitted text primitive. A diagram that only *looks* like a diagram is not done.
 */

import {
  clamp,
  connectorPrimitives,
  insetRect,
  layoutText,
  labelCase,
  linePrimitive,
  rectBottom,
  rectCenter,
  rectPrimitive,
  rectRight,
  round,
  rows,
  splitColumns,
  typeStyle,
  lineHeightForRole,
} from "./primitives";
import { numberedStepBlock, sectionChrome } from "./blocks";
import { formatMilestoneLabel, hasTemporalScale, measureText, milestoneSortKey } from "./measure";
import type {
  DiagramEdge,
  DiagramNode,
  DiagramSection,
  HierarchyNode,
  HierarchySection,
  InfographicPrimitive,
  ProcessSection,
  ProcessStep,
  ProcessStepMode,
  RectInfo,
  RenderResult,
  SectionKind,
  SectionRenderContext,
  SectionRenderer,
  TimelineMilestone,
  TimelineScale,
  TimelineSection,
} from "./types";

function reportOverflow(
  context: SectionRenderContext,
  sectionId: string,
  overflow: number,
  message: string
): void {
  context.report({
    code: "section-overflow",
    severity: "error",
    message,
    sectionId,
    overflow: round(overflow),
  });
}

/** Points at the middle of a rect's four edges; the connector-port vocabulary. */
export function edgePorts(box: RectInfo): {
  top: { x: number; y: number };
  right: { x: number; y: number };
  bottom: { x: number; y: number };
  left: { x: number; y: number };
} {
  const center = rectCenter(box);
  return {
    top: { x: round(center.x), y: round(box.y) },
    right: { x: round(rectRight(box)), y: round(center.y) },
    bottom: { x: round(center.x), y: round(rectBottom(box)) },
    left: { x: round(box.x), y: round(center.y) },
  };
}

/** Human-readable phrase for a step's relationship to its neighbours. */
function modeNote(mode: ProcessStepMode, branchCount: number): string | null {
  const parts: string[] = [];
  if (mode === "optional") parts.push("optional");
  if (mode === "parallel") parts.push("runs in parallel");
  if (mode === "repeated") parts.push("repeats");
  if (branchCount > 1) parts.push(`branches to ${branchCount} paths`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// ---------------------------------------------------------------------------
// process-flow
// ---------------------------------------------------------------------------

export interface ProcessFlowSpec {
  id: string;
  direction: "horizontal" | "vertical";
  steps: readonly ProcessStep[];
}

interface PlacedStep {
  step: ProcessStep;
  index: number;
  box: RectInfo;
  /** Flow direction at this position, for direction-aware connector ports. */
  forward: boolean;
}

/**
 * Lay out an ordered process. Horizontal processes wrap into extra rows and
 * continue in **boustrophedon** order (left-to-right, then right-to-left), so the
 * reading order never jumps back across the canvas — the connectors simply
 * reverse direction at the row boundary.
 */
export function processFlowBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  spec: ProcessFlowSpec
): RenderResult {
  const style = context.style;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  const steps = spec.steps;

  if (steps.length === 0) {
    context.report({
      code: "process-empty",
      severity: "error",
      message: `Process "${spec.id}" has no steps to render.`,
      sectionId: spec.id,
    });
    return { primitives, anchors };
  }

  const gap = style.spacing[2];
  const vertical = spec.direction === "vertical";
  const minStepWidth = round(Math.max(style.spacing[6], style.type.h3 * 8));
  const minStepHeight = round(Math.max(style.spacing[5], style.type.h3 * 3.2));

  let columnsPerRow: number;
  let rowCount: number;
  if (vertical) {
    columnsPerRow = 1;
    rowCount = steps.length;
  } else {
    const byWidth = Math.max(1, Math.floor((frame.width + gap) / (minStepWidth + gap)));
    columnsPerRow = clamp(Math.min(byWidth, steps.length), 1, steps.length);
    rowCount = Math.ceil(steps.length / columnsPerRow);
  }

  const rowBoxes = rows(frame, rowCount, gap);
  const rowHeight = vertical ? Math.min(minStepHeight, (frame.height - gap * (rowCount - 1)) / rowCount) : rowBoxes[0]?.height ?? frame.height;
  const stepWidth = vertical ? frame.width : round((frame.width - gap * (columnsPerRow - 1)) / columnsPerRow);

  const placed: PlacedStep[] = [];
  steps.forEach((step, index) => {
    const rowIndex = vertical ? index : Math.floor(index / columnsPerRow);
    const indexInRow = vertical ? 0 : index % columnsPerRow;
    const forward = !vertical || true;
    const serpentine = !vertical && rowIndex % 2 === 1;
    const columnIndex = serpentine ? columnsPerRow - 1 - indexInRow : indexInRow;
    void forward;
    const rowBox = rowBoxes[rowIndex] ?? frame;
    const box: RectInfo = {
      x: round(frame.x + columnIndex * (stepWidth + gap)),
      y: round(rowBox.y),
      width: round(stepWidth),
      height: round(vertical ? rowHeight : Math.min(rowBox.height, Math.max(minStepHeight, rowBox.height))),
    };
    placed.push({ step, index, box, forward: !serpentine });
  });

  const totalHeight = rowCount * rowHeight + gap * (rowCount - 1);
  if (totalHeight > frame.height + 0.5) {
    reportOverflow(
      context,
      spec.id,
      totalHeight - frame.height,
      `Process "${spec.id}" needs ${round(totalHeight)}px for ${rowCount} row(s) but has ${round(frame.height)}px.`
    );
  }

  // Draw each step through the shared numbered-step block so numbering, state
  // words and the badge treatment match every other use of steps in the system.
  placed.forEach((entry) => {
    const branchCount = (entry.step.nextIds ?? []).length;
    const note = modeNote(entry.step.mode ?? "sequential", branchCount);
    const title = note && (entry.step.mode === "optional" || entry.step.mode === "parallel" || entry.step.mode === "repeated")
      ? `${entry.step.title} (${entry.step.mode})`
      : entry.step.title;
    const result = numberedStepBlock(context, entry.box, {
      id: entry.step.id,
      index: entry.index + 1,
      total: steps.length,
      title,
      description: entry.step.description,
      state: entry.step.mode === "optional" ? "optional" : "default",
      surface: true,
      semanticId: entry.step.id,
    });
    primitives.push(...result.primitives);
    Object.assign(anchors, result.anchors);
    anchors[entry.step.id] = entry.box;

    if (note) {
      const caption = layoutText(
        {
          text: note,
          box: {
            x: entry.box.x + style.spacing[2],
            y: round(rectBottom(entry.box) - style.type.caption * style.lineHeight.annotation - style.spacing[0]),
            width: Math.max(0, entry.box.width - style.spacing[2] * 2),
            height: 0,
          },
          style: typeStyle(style, "caption", { family: style.font.mono }),
          color: style.color.inkSubtle,
          role: "step-connector-note",
          semanticId: `${entry.step.id}:note`,
          lineHeight: style.lineHeight.annotation,
          maxLines: 1,
        },
        context
      );
      primitives.push(caption.primitive);
    }
  });

  // Connectors: consecutive steps plus every explicit branch edge.
  const byId = new Map(placed.map((entry) => [entry.step.id, entry]));
  const edges: Array<{ from: PlacedStep; to: PlacedStep; mode: ProcessStepMode }> = [];
  placed.forEach((entry, index) => {
    const nextIds = entry.step.nextIds ?? [];
    if (nextIds.length > 0) {
      for (const nextId of nextIds) {
        const target = byId.get(nextId);
        if (target) edges.push({ from: entry, to: target, mode: entry.step.mode ?? "sequential" });
      }
    } else if (index + 1 < placed.length) {
      edges.push({ from: entry, to: placed[index + 1], mode: entry.step.mode ?? "sequential" });
    }
  });

  for (const edge of edges) {
    const fromPorts = edgePorts(edge.from.box);
    const toPorts = edgePorts(edge.to.box);
    const start = vertical
      ? fromPorts.bottom
      : edge.from.forward
        ? fromPorts.right
        : fromPorts.left;
    const end = vertical ? toPorts.top : edge.to.forward ? toPorts.left : toPorts.right;

    const dashed = edge.mode === "optional" || edge.mode === "repeated";
    const route = edge.mode === "repeated" ? "curve" : vertical ? "straight" : "orthogonal";
    const clearance = style.spacing[0];

    const baseOptions = {
      style,
      route: route as "straight" | "orthogonal" | "curve",
      color: dashed ? style.color.connectorMuted : style.color.connector,
      dash: dashed ? ("dashed" as const) : undefined,
      clearance,
      role: "process-connector",
      semanticId: `${edge.from.step.id}->${edge.to.step.id}`,
    };

    if (edge.mode === "parallel") {
      // Two offset lines: a visual cue that the two steps run concurrently.
      const offset = style.stroke.hairline * 4;
      const normal = vertical ? { x: offset, y: 0 } : { x: 0, y: offset };
      primitives.push(
        ...connectorPrimitives(
          { x: start.x - normal.x / 2, y: start.y - normal.y / 2 },
          { x: end.x - normal.x / 2, y: end.y - normal.y / 2 },
          { ...baseOptions, arrow: "none", semanticId: `${edge.from.step.id}->${edge.to.step.id}:a` },
          context
        )
      );
      primitives.push(
        ...connectorPrimitives(
          { x: start.x + normal.x / 2, y: start.y + normal.y / 2 },
          { x: end.x + normal.x / 2, y: end.y + normal.y / 2 },
          { ...baseOptions, arrow: "none", semanticId: `${edge.from.step.id}->${edge.to.step.id}:b` },
          context
        )
      );
      continue;
    }

    primitives.push(...connectorPrimitives(start, end, baseOptions, context));
  }

  if (!steps.some((step) => (step.nextIds ?? []).length === 0)) {
    context.report({
      code: "process-cycle",
      severity: "warning",
      message: `Process "${spec.id}" declares a successor for every step, so it has no terminal step.`,
      sectionId: spec.id,
    });
  }

  return { primitives, anchors };
}

/** Section-level process renderer: heading, evidence footnote, wrapped flow. */
export function renderProcessSection(
  section: ProcessSection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const { primitives, content } = sectionChrome(section, frame, context, { accent: true });
  const direction = section.layout === "vertical" ? "vertical" : "horizontal";
  const result = processFlowBlock(context, content, {
    id: section.id,
    direction,
    steps: section.steps,
  });
  return { primitives: [...primitives, ...result.primitives], anchors: result.anchors };
}

// ---------------------------------------------------------------------------
// timeline-layout
// ---------------------------------------------------------------------------

export type TimelineOrientation = "horizontal" | "vertical";

export interface TimelineSpec {
  id: string;
  milestones: readonly TimelineMilestone[];
  scale?: TimelineScale;
  orientation: TimelineOrientation;
}

/**
 * Resolve the positioning policy for a timeline.
 *
 * The policy is a *disclosure*, not just an implementation detail: a timeline
 * whose points are evenly spaced is making a weaker claim than one positioned
 * proportionally to time, and docs/12 §8 requires the difference to be visible.
 * `policyFor` is therefore pure, exported and rendered as a caption.
 */
export function timelinePolicy(
  milestones: readonly TimelineMilestone[],
  scale?: TimelineScale
): { policy: "proportional" | "even" | "logarithmic"; caption: string } {
  const dated = hasTemporalScale(milestones.map((milestone) => milestone.at));
  if (scale === "ordinal" || !dated) {
    return { policy: "even", caption: "Positions evenly spaced · not to scale" };
  }
  if (scale === "log") {
    return { policy: "logarithmic", caption: "Positions scaled logarithmically" };
  }
  return { policy: "proportional", caption: "Positions proportional to time" };
}

function timelinePositions(
  milestones: readonly TimelineMilestone[],
  policy: "proportional" | "even" | "logarithmic"
): number[] {
  const count = milestones.length;
  if (count === 0) return [];
  if (count === 1) return [0.5];
  if (policy === "even") {
    return milestones.map((_, index) => index / (count - 1));
  }
  const keys = milestones.map((milestone, index) => {
    const value = milestoneSortKey(milestone.at, index);
    return policy === "logarithmic" ? Math.log(Math.max(value, 1)) : value;
  });
  const min = Math.min(...keys);
  const max = Math.max(...keys);
  const span = max - min;
  if (span <= 0) return milestones.map((_, index) => index / (count - 1));
  return keys.map((key) => (key - min) / span);
}

/**
 * Render a timeline along a rule, with alternating labels to avoid collisions.
 *
 * Sorting is deterministic: dated milestones sort by time, everything else keeps
 * source order (an ordinal scale must not silently reorder the author's list).
 * Labels alternate sides of the axis; when a label still cannot sit beside its
 * neighbour it moves to a second tier and raises `timeline-label-collision`
 * rather than being dropped.
 */
export function timelineBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  spec: TimelineSpec
): RenderResult {
  const style = context.style;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  void spec.id;

  if (spec.milestones.length === 0) {
    context.report({
      code: "timeline-empty",
      severity: "error",
      message: `Timeline "${spec.id}" has no milestones to render.`,
      sectionId: spec.id,
    });
    return { primitives, anchors };
  }

  const datedFlags = spec.milestones.map((milestone) => !Number.isNaN(new Date(milestone.at).getTime()));
  if (datedFlags.some(Boolean) && !datedFlags.every(Boolean)) {
    context.report({
      code: "timeline-mixed-scale",
      severity: "warning",
      message: `Timeline "${spec.id}" mixes dated and undated milestones; positions were computed on the ${
        timelinePolicy(spec.milestones, spec.scale).policy
      } policy.`,
      sectionId: spec.id,
    });
  }

  const sorted = spec.milestones
    .map((milestone, index) => ({ milestone, index }))
    .sort((a, b) => {
      if (spec.scale === "ordinal") return a.index - b.index;
      const keyA = milestoneSortKey(a.milestone.at, a.index);
      const keyB = milestoneSortKey(b.milestone.at, b.index);
      return keyA === keyB ? a.index - b.index : keyA - keyB;
    })
    .map((entry) => entry.milestone);

  const { policy, caption: policyLabelText } = timelinePolicy(sorted, spec.scale);
  const ratios = timelinePositions(sorted, policy);

  const captionHeight = style.type.caption * style.lineHeight.annotation;
  const axisBand = Math.round(frame.height * (spec.orientation === "vertical" ? 1 : 0.5));
  const reserveCaption = captionHeight + style.spacing[1];
  const labelStyle = typeStyle(style, "label", { family: style.font.heading });
  const labelLineHeight = style.lineHeight.annotation;

  if (spec.orientation === "vertical") {
    const axisX = round(frame.x + frame.width * 0.28);
    const span = Math.max(0, frame.height - reserveCaption - style.spacing[3]);
    const top = frame.y + style.spacing[1];
    primitives.push(
      linePrimitive(
        { x: axisX, y: top },
        { x: axisX, y: round(top + span) },
        { stroke: style.color.rule, strokeWidth: style.stroke.rule, role: "timeline-axis" },
        context
      )
    );
    const lastEnd: Record<string, number> = { left: -Infinity, right: -Infinity };
    const tier: Record<string, number> = { left: 0, right: 0 };

    sorted.forEach((milestone, index) => {
      const y = round(top + ratios[index] * span);
      const side: "left" | "right" = index % 2 === 0 ? "right" : "left";
      const isInterval = milestone.kind === "interval" && milestone.endAt !== undefined;
      const intervalRatio = isInterval
        ? timelinePositions([...sorted, { ...milestone, at: milestone.endAt as string }], policy)[sorted.length]
        : undefined;
      const y2 = isInterval && intervalRatio !== undefined ? round(top + intervalRatio * span) : y;

      const markerSize = Math.max(style.stroke.strong * 2.5, style.spacing[0]);
      if (isInterval) {
        primitives.push(
          rectPrimitive(
            { x: round(axisX - markerSize / 2), y: round(Math.min(y, y2)), width: markerSize, height: round(Math.abs(y2 - y) || markerSize) },
            { fill: style.color.accent, radius: style.radius.pill, role: "timeline-interval-bar" },
            context
          )
        );
      } else {
        primitives.push(
          rectPrimitive(
            { x: round(axisX - markerSize / 2), y: round(y - markerSize / 2), width: markerSize, height: markerSize },
            { fill: style.color.accent, radius: style.radius.pill, role: "timeline-marker" },
            context
          )
        );
      }
      primitives.push(
        linePrimitive(
          { x: side === "right" ? axisX : round(axisX - style.spacing[1]) , y },
          { x: side === "right" ? round(axisX + style.spacing[1]) : axisX, y },
          { stroke: style.color.connectorMuted, strokeWidth: style.stroke.hairline, role: "timeline-tick" },
          context
        )
      );

      const labelText = formatMilestoneLabel(milestone.at, context.language);
      const intervalText = isInterval ? `${labelText} – ${formatMilestoneLabel(milestone.endAt as string, context.language)}` : labelText;
      const labelWidth = Math.min(
        Math.max(style.spacing[6], measureText(intervalText, labelStyle)),
        spec.orientation === "vertical" ? frame.width * 0.66 : frame.width
      );
      const x = side === "right" ? round(axisX + style.spacing[2]) : round(axisX - style.spacing[2] - labelWidth);
      const labelHeight = style.type.label * labelLineHeight;
      let offsetTier = tier[side];
      if (y < lastEnd[side] + style.spacing[1]) {
        offsetTier += 1;
        context.report({
          code: "timeline-label-collision",
          severity: "warning",
          message: `Timeline "${spec.id}" label for "${milestone.id}" overlapped the previous label on the ${side} side; moved to tier ${offsetTier + 1}.`,
          sectionId: spec.id,
          targetId: milestone.id,
        });
      }
      tier[side] = offsetTier;
      lastEnd[side] = Math.max(lastEnd[side], y + labelHeight);
      const labelY = round(y + offsetTier * (labelHeight + style.spacing[0]));

      const label = layoutText(
        {
          text: intervalText,
          box: { x, y: labelY, width: labelWidth, height: 0 },
          style: labelStyle,
          color: style.color.ink,
          role: "timeline-label",
          semanticId: milestone.id,
          lineHeight: labelLineHeight,
        },
        context
      );
      primitives.push(label.primitive);
      anchors[milestone.id] = {
        x: round(axisX - markerSize / 2),
        y: round(isInterval ? Math.min(y, y2) : y - markerSize / 2),
        width: markerSize,
        height: round(isInterval ? Math.abs(y2 - y) || markerSize : markerSize),
      };
    });
  } else {
    const axisY = round(axisBand);
    const marginX = style.spacing[3];
    const span = Math.max(0, frame.width - marginX * 2);
    const left = frame.x + marginX;
    primitives.push(
      linePrimitive(
        { x: left, y: axisY },
        { x: round(left + span), y: axisY },
        { stroke: style.color.rule, strokeWidth: style.stroke.rule, role: "timeline-axis" },
        context
      )
    );

    const lastRight: Record<"above" | "below", number> = { above: -Infinity, below: -Infinity };
    const tier: Record<"above" | "below", number> = { above: 0, below: 0 };
    const labelBand = style.type.label * labelLineHeight;
    const aboveBase = round(axisY - style.spacing[2] - labelBand);
    const belowBase = round(axisY + style.spacing[2]);

    sorted.forEach((milestone, index) => {
      const x = round(left + ratios[index] * span);
      const side: "above" | "below" = index % 2 === 0 ? "above" : "below";
      const isInterval = milestone.kind === "interval" && milestone.endAt !== undefined;
      const intervalRatio = isInterval
        ? timelinePositions([...sorted, { ...milestone, at: milestone.endAt as string }], policy)[sorted.length]
        : undefined;
      const x2 = isInterval && intervalRatio !== undefined ? round(left + intervalRatio * span) : x;

      const markerSize = Math.max(style.stroke.strong * 2.5, style.spacing[0]);
      if (isInterval) {
        primitives.push(
          rectPrimitive(
            {
              x: round(Math.min(x, x2)),
              y: round(axisY - markerSize / 2),
              width: round(Math.abs(x2 - x) || markerSize),
              height: markerSize,
            },
            { fill: style.color.accent, radius: style.radius.pill, role: "timeline-interval-bar" },
            context
          )
        );
      } else {
        primitives.push(
          rectPrimitive(
            { x: round(x - markerSize / 2), y: round(axisY - markerSize / 2), width: markerSize, height: markerSize },
            { fill: style.color.accent, radius: style.radius.pill, role: "timeline-marker" },
            context
          )
        );
      }
      primitives.push(
        linePrimitive(
          { x, y: side === "above" ? round(axisY - style.spacing[1]) : axisY },
          { x, y: side === "above" ? axisY : round(axisY + style.spacing[1]) },
          { stroke: style.color.connectorMuted, strokeWidth: style.stroke.hairline, role: "timeline-tick" },
          context
        )
      );

      const labelText = formatMilestoneLabel(milestone.at, context.language);
      const intervalText = isInterval ? `${labelText} – ${formatMilestoneLabel(milestone.endAt as string, context.language)}` : labelText;
      const labelWidth = Math.min(
        Math.max(style.spacing[6], measureText(intervalText, labelStyle)),
        Math.max(style.spacing[6], frame.width / Math.max(2, sorted.length))
      );
      let labelX = round(clamp(x - labelWidth / 2, frame.x, rectRight(frame) - labelWidth));
      let offsetTier = tier[side];
      if (labelX < lastRight[side] + style.spacing[1]) {
        offsetTier += 1;
        context.report({
          code: "timeline-label-collision",
          severity: "warning",
          message: `Timeline "${spec.id}" label for "${milestone.id}" overlapped the previous label on the ${side} side; moved to tier ${offsetTier + 1}.`,
          sectionId: spec.id,
          targetId: milestone.id,
        });
        labelX = round(clamp(lastRight[side] + style.spacing[1], frame.x, rectRight(frame) - labelWidth));
      }
      tier[side] = offsetTier;
      lastRight[side] = labelX + labelWidth;
      const labelY = side === "above" ? round(aboveBase - offsetTier * (labelBand + style.spacing[0])) : round(belowBase + offsetTier * (labelBand + style.spacing[0]));

      const label = layoutText(
        {
          text: intervalText,
          box: { x: labelX, y: labelY, width: labelWidth, height: 0 },
          style: labelStyle,
          color: style.color.ink,
          role: "timeline-label",
          semanticId: milestone.id,
          lineHeight: labelLineHeight,
        },
        context
      );
      primitives.push(label.primitive);
      if (milestone.description) {
        const description = layoutText(
          {
            text: milestone.description,
            box: {
              x: labelX,
              y: side === "above" ? round(labelY - style.type.caption * style.lineHeight.annotation * 2 - style.spacing[0]) : round(labelY + label.height + style.spacing[0]),
              width: labelWidth,
              height: 0,
            },
            style: typeStyle(style, "caption"),
            color: style.color.inkMuted,
            role: "timeline-description",
            semanticId: `${milestone.id}:description`,
            lineHeight: style.lineHeight.annotation,
            maxLines: 2,
          },
          context
        );
        primitives.push(description.primitive);
      }
      anchors[milestone.id] = {
        x: round(isInterval ? Math.min(x, x2) : x - markerSize / 2),
        y: round(axisY - markerSize / 2),
        width: round(isInterval ? Math.abs(x2 - x) || markerSize : markerSize),
        height: markerSize,
      };
    });
  }

  const policyCaption = layoutText(
    {
      text: policyLabelText,
      box: {
        x: frame.x,
        y: round(rectBottom(frame) - captionHeight),
        width: frame.width,
        height: 0,
      },
      style: typeStyle(style, "caption", { family: style.font.mono }),
      color: style.color.inkSubtle,
      role: "timeline-policy-caption",
      semanticId: `${spec.id}:policy`,
      lineHeight: style.lineHeight.annotation,
      maxLines: 1,
    },
    context
  );
  primitives.push(policyCaption.primitive);

  return { primitives, anchors };
}

/** Section-level timeline renderer. */
export function renderTimelineSection(
  section: TimelineSection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const { primitives, content } = sectionChrome(section, frame, context, { accent: true });
  const direction: TimelineOrientation = content.width >= content.height ? "horizontal" : "vertical";
  const result = timelineBlock(context, content, {
    id: section.id,
    milestones: section.milestones,
    scale: section.scale,
    orientation: direction,
  });
  return { primitives: [...primitives, ...result.primitives], anchors: result.anchors };
}

// ---------------------------------------------------------------------------
// hierarchy-layout
// ---------------------------------------------------------------------------

export interface HierarchyLayoutOptions {
  nodeHeight: number;
  nodeGap: number;
  rowGap: number;
  /** Total width the tree should span; leaf slots subdivide it. */
  width: number;
  origin?: { x: number; y: number };
}

export interface HierarchyLayoutResult {
  nodes: Array<{ id: string; node: HierarchyNode; box: RectInfo; depth: number }>;
  edges: Array<{ from: string; to: string }>;
  width: number;
  height: number;
  depth: number;
  leafCount: number;
}

/**
 * Pure tree geometry: allocate horizontal extent by **leaf count**, then centre
 * each parent over the span of its children.
 *
 * Leaf-count allocation is what guarantees no two nodes overlap regardless of
 * tree shape — a uniform grid cannot promise that, because a subtree with eight
 * leaves needs eight times the room of a leaf. The function is exported
 * separately from rendering so the invariant can be tested without a context.
 */
export function hierarchyLayout(
  root: HierarchyNode,
  options: HierarchyLayoutOptions
): HierarchyLayoutResult {
  const origin = options.origin ?? { x: 0, y: 0 };
  const nodeHeight = options.nodeHeight;
  const rowGap = options.rowGap;
  const nodeGap = options.nodeGap;

  let leafCursor = 0;
  let maxDepth = 0;
  const nodes: HierarchyLayoutResult["nodes"] = [];
  const edges: HierarchyLayoutResult["edges"] = [];

  const leafCountOf = (node: HierarchyNode): number => {
    const children = node.children ?? [];
    if (children.length === 0) return 1;
    return children.reduce((sum, child) => sum + leafCountOf(child), 0);
  };
  const totalLeaves = Math.max(1, leafCountOf(root));
  const slot = options.width / totalLeaves;

  const walk = (node: HierarchyNode, depth: number): { x: number; centerX: number } => {
    maxDepth = Math.max(maxDepth, depth);
    const children = node.children ?? [];
    const y = round(origin.y + depth * (nodeHeight + rowGap));
    if (children.length === 0) {
      const index = leafCursor;
      leafCursor += 1;
      const box: RectInfo = {
        x: round(origin.x + index * slot),
        y,
        width: round(Math.max(0, slot - nodeGap)),
        height: round(nodeHeight),
      };
      nodes.push({ id: node.id, node, box, depth });
      return { x: box.x, centerX: rectCenter(box).x };
    }
    const childSpans = children.map((child) => {
      edges.push({ from: node.id, to: child.id });
      return walk(child, depth + 1);
    });
    const minX = Math.min(...childSpans.map((span) => span.x));
    const maxX = Math.max(...childSpans.map((span) => span.centerX));
    const width = Math.max(slot - nodeGap, maxX - minX);
    const box: RectInfo = {
      x: round(minX),
      y,
      width: round(width),
      height: round(nodeHeight),
    };
    nodes.push({ id: node.id, node, box, depth });
    return { x: box.x, centerX: rectCenter(box).x };
  };

  walk(root, 0);
  return {
    nodes,
    edges,
    width: round(totalLeaves * slot),
    height: round((maxDepth + 1) * nodeHeight + maxDepth * rowGap),
    depth: maxDepth,
    leafCount: totalLeaves,
  };
}

export interface HierarchySpec {
  id: string;
  root: HierarchyNode;
}

/** Render a rooted tree with depth-labelled nodes and orthogonal edges. */
export function hierarchyBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  spec: HierarchySpec
): RenderResult {
  const style = context.style;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};

  const nodeHeight = round(Math.max(style.type.h3 * 2.6, style.spacing[4]));
  const rowGap = style.spacing[2];
  const nodeGap = style.spacing[1];

  const layout = hierarchyLayout(spec.root, {
    nodeHeight,
    nodeGap,
    rowGap,
    width: frame.width,
    origin: { x: frame.x, y: frame.y },
  });

  if (layout.height > frame.height + 0.5) {
    context.report({
      code: "hierarchy-depth-overflow",
      severity: "error",
      message: `Hierarchy "${spec.id}" is ${layout.depth + 1} levels deep and needs ${round(layout.height)}px but has ${round(frame.height)}px.`,
      sectionId: spec.id,
      overflow: round(layout.height - frame.height),
    });
  }

  const byId = new Map(layout.nodes.map((entry) => [entry.id, entry]));

  // Edges first so nodes paint over the line ends.
  for (const edge of layout.edges) {
    const parent = byId.get(edge.from);
    const child = byId.get(edge.to);
    if (!parent || !child) continue;
    const from = edgePorts(parent.box).bottom;
    const to = edgePorts(child.box).top;
    primitives.push(
      ...connectorPrimitives(
        from,
        to,
        {
          style,
          route: "orthogonal",
          arrow: "none",
          color: style.color.connectorMuted,
          clearance: 0,
          role: "hierarchy-edge",
          semanticId: `${edge.from}->${edge.to}`,
        },
        context
      )
    );
  }

  for (const entry of layout.nodes) {
    const emphasized = (entry.node.importance ?? "supporting") === "hero";
    primitives.push(
      rectPrimitive(
        entry.box,
        {
          fill: emphasized ? style.color.surfaceAlt : style.color.surface,
          stroke: emphasized ? style.color.accent : style.color.rule,
          strokeWidth: emphasized ? style.stroke.strong : style.stroke.hairline,
          radius: style.radius.md,
          role: "hierarchy-node",
          semanticId: entry.id,
        },
        context
      )
    );

    const padX = style.spacing[1];
    const labelBox: RectInfo = insetRect(entry.box, { top: style.spacing[0], bottom: style.spacing[0], left: padX, right: padX });
    const label = layoutText(
      {
        text: entry.node.label,
        box: { x: labelBox.x, y: labelBox.y, width: labelBox.width, height: labelBox.height },
        style: typeStyle(style, "h3", { fontSize: style.type.label * 1.05 }),
        color: style.color.ink,
        role: "hierarchy-label",
        semanticId: entry.id,
        align: "center",
        maxLines: 2,
        lineHeight: style.lineHeight.annotation,
      },
      context
    );
    primitives.push(label.primitive);
    if (label.wrap.truncated) {
      context.report({
        code: "hierarchy-label-truncated",
        severity: "warning",
        message: `Hierarchy node "${entry.id}" label did not fit in 2 lines; it was ellipsised. Shorten the label or widen the frame.`,
        sectionId: spec.id,
        targetId: entry.id,
      });
    }

    // Depth stated in words so the tree's structure survives without the visual.
    const depthCaption = layoutText(
      {
        text: `Level ${entry.depth + 1}`,
        box: {
          x: labelBox.x,
          y: round(rectBottom(entry.box) - style.type.caption * style.lineHeight.annotation - style.spacing[0] / 2),
          width: labelBox.width,
          height: 0,
        },
        style: typeStyle(style, "caption", { family: style.font.mono }),
        color: style.color.inkSubtle,
        role: "hierarchy-depth",
        semanticId: `${entry.id}:depth`,
        align: "center",
        lineHeight: style.lineHeight.annotation,
        maxLines: 1,
      },
      context
    );
    primitives.push(depthCaption.primitive);

    if (entry.node.description) {
      const description = layoutText(
        {
          text: entry.node.description,
          box: { x: labelBox.x, y: round(rectBottom(entry.box) + style.spacing[0]), width: labelBox.width, height: 0 },
          style: typeStyle(style, "caption"),
          color: style.color.inkMuted,
          role: "hierarchy-description",
          semanticId: `${entry.id}:description`,
          align: "center",
          lineHeight: style.lineHeight.annotation,
          maxLines: 2,
        },
        context
      );
      primitives.push(description.primitive);
    }

    anchors[entry.id] = entry.box;
  }

  return { primitives, anchors };
}

/** Section-level hierarchy renderer. */
export function renderHierarchySection(
  section: HierarchySection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const { primitives, content } = sectionChrome(section, frame, context, { accent: true });
  const result = hierarchyBlock(context, content, { id: section.id, root: section.root });
  return { primitives: [...primitives, ...result.primitives], anchors: result.anchors };
}

// ---------------------------------------------------------------------------
// diagram (generic layered graph)
// ---------------------------------------------------------------------------

export interface DiagramSpecInput {
  id: string;
  direction: "horizontal" | "vertical";
  nodes: readonly DiagramNode[];
  edges: readonly DiagramEdge[];
}

/**
 * Assign each node to a layer: sources at layer 0, every other node one past its
 * deepest predecessor. Nodes unreachable from a source (e.g. inside a cycle) fall
 * back to their declared index, which keeps the layout total instead of throwing.
 */
export function diagramLayers(
  nodes: readonly DiagramNode[],
  edges: readonly DiagramEdge[]
): { layerOf: Map<string, number>; maxLayer: number } {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  nodes.forEach((node) => {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  });
  edges.forEach((edge) => {
    if (!incoming.has(edge.to) || !outgoing.has(edge.from)) return;
    incoming.get(edge.to)?.push(edge.from);
    outgoing.get(edge.from)?.push(edge.to);
  });

  const layerOf = new Map<string, number>();
  const visiting = new Set<string>();
  const resolve = (id: string): number => {
    if (layerOf.has(id)) return layerOf.get(id) as number;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = incoming.get(id) ?? [];
    const layer = parents.length === 0 ? 0 : Math.max(...parents.map((parent) => resolve(parent) + 1));
    visiting.delete(id);
    layerOf.set(id, layer);
    return layer;
  };
  nodes.forEach((node) => resolve(node.id));
  const maxLayer = nodes.reduce((max, node) => Math.max(max, layerOf.get(node.id) ?? 0), 0);
  return { layerOf, maxLayer };
}

/** Render a directed graph as layers of node cards with labelled connectors. */
export function diagramBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  spec: DiagramSpecInput
): RenderResult {
  const style = context.style;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};

  if (spec.nodes.length === 0) {
    context.report({
      code: "diagram-empty",
      severity: "error",
      message: `Diagram "${spec.id}" has no nodes.`,
      sectionId: spec.id,
    });
    return { primitives, anchors };
  }

  const { layerOf, maxLayer } = diagramLayers(spec.nodes, spec.edges);
  const layers: DiagramNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
  spec.nodes.forEach((node) => layers[layerOf.get(node.id) ?? 0].push(node));

  const gap = style.spacing[2];
  // An edge label sits in the gap between layers. If the gap is narrower than
  // the widest label, a centred label would reach into a node column and collide
  // with a node label, so the gap grows to hold it (containment, docs/12 §5).
  const edgeLabelStyle = typeStyle(style, "caption", { family: style.font.mono });
  let widestEdgeLabel = 0;
  for (const edge of spec.edges) {
    if (edge.label) widestEdgeLabel = Math.max(widestEdgeLabel, measureText(edge.label, edgeLabelStyle));
  }
  const layerGap = Math.max(gap, round(widestEdgeLabel) + style.spacing[1]);
  const layerBoxes =
    spec.direction === "vertical"
      ? rows(insetRect(frame, 0), layers.length, layerGap)
      : splitColumns(frame, layers.map(() => 1), layerGap);

  const placed = new Map<string, RectInfo>();
  layers.forEach((layerNodes, layerIndex) => {
    const layerBox = layerBoxes[layerIndex] ?? frame;
    const nodeBoxes =
      spec.direction === "vertical"
        ? splitColumns(layerBox, layerNodes.map(() => 1), gap)
        : rows(layerBox, layerNodes.length, gap);
    layerNodes.forEach((node, nodeIndex) => {
      const box = nodeBoxes[nodeIndex] ?? layerBox;
      placed.set(node.id, box);
      anchors[node.id] = box;
      const emphasized = (node.importance ?? "supporting") === "hero";
      primitives.push(
        rectPrimitive(
          box,
          {
            fill: emphasized ? style.color.surfaceAlt : style.color.surface,
            stroke: emphasized ? style.color.accent : style.color.rule,
            strokeWidth: emphasized ? style.stroke.strong : style.stroke.hairline,
            radius: style.radius.md,
            role: "diagram-node",
            semanticId: node.id,
          },
          context
        )
      );
      const inner = insetRect(box, style.spacing[1]);
      const label = layoutText(
        {
          text: node.label,
          box: inner,
          style: typeStyle(style, "label", { family: style.font.heading }),
          color: style.color.ink,
          role: "diagram-node-label",
          semanticId: node.id,
          align: "center",
          valign: "middle",
          maxLines: 3,
          lineHeight: style.lineHeight.annotation,
        },
        context
      );
      primitives.push(label.primitive);
      if (node.description) {
        const description = layoutText(
          {
            text: node.description,
            box: { x: inner.x, y: round(rectBottom(box) + style.spacing[0]), width: inner.width, height: 0 },
            style: typeStyle(style, "caption"),
            color: style.color.inkMuted,
            role: "diagram-node-description",
            semanticId: `${node.id}:description`,
            align: "center",
            lineHeight: style.lineHeight.annotation,
            maxLines: 2,
          },
          context
        );
        primitives.push(description.primitive);
      }
    });
  });

  for (const edge of spec.edges) {
    const fromBox = placed.get(edge.from);
    const toBox = placed.get(edge.to);
    if (!fromBox || !toBox) continue;
    const directed = edge.directed ?? true;
    const fromLayer = layerOf.get(edge.from) ?? 0;
    const toLayer = layerOf.get(edge.to) ?? 0;
    const backwards = toLayer <= fromLayer;
    const from = spec.direction === "vertical" ? edgePorts(fromBox).bottom : edgePorts(fromBox).right;
    const to = spec.direction === "vertical" ? edgePorts(toBox).top : edgePorts(toBox).left;
    const connectorParts = connectorPrimitives(
      from,
      to,
      {
        style,
        route: backwards ? "curve" : spec.direction === "vertical" ? "orthogonal" : "orthogonal",
        arrow: directed ? style.connector.arrow : "none",
        color: backwards ? style.color.connectorMuted : style.color.connector,
        dash: backwards ? "dashed" : undefined,
        clearance: 0,
        role: "diagram-edge",
        semanticId: edge.id,
      },
      context
    );
    primitives.push(...connectorParts);

    if (edge.label) {
      const midpoint = { x: round((from.x + to.x) / 2), y: round((from.y + to.y) / 2) };
      // The label's box is measured, not a fixed fraction of the frame: a wide
      // box centred on the connector would reach into the node columns and its
      // bounding box would collide with a node label (containment, docs/12 §5).
      const edgeLabelWidth = round(Math.max(1, measureText(edge.label, edgeLabelStyle)));
      const label = layoutText(
        {
          text: edge.label,
          box: { x: round(midpoint.x - edgeLabelWidth / 2), y: midpoint.y, width: edgeLabelWidth, height: 0 },
          style: edgeLabelStyle,
          color: style.color.inkMuted,
          role: "diagram-edge-label",
          semanticId: `${edge.id}:label`,
          align: "center",
          lineHeight: style.lineHeight.annotation,
          maxLines: 1,
        },
        context
      );
      primitives.push(label.primitive);
    }
  }

  return { primitives, anchors };
}

/** Section-level diagram renderer. */
export function renderDiagramSection(
  section: DiagramSection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const { primitives, content } = sectionChrome(section, frame, context, { accent: true });
  const result = diagramBlock(context, content, {
    id: section.id,
    direction: section.diagram.direction ?? "vertical",
    nodes: section.diagram.nodes,
    edges: section.diagram.edges,
  });
  return { primitives: [...primitives, ...result.primitives], anchors: result.anchors };
}

/** Section renderers owned by this module. */
export const VISUALIZER_RENDERERS: Partial<Record<SectionKind, SectionRenderer>> = {
  process: renderProcessSection as SectionRenderer,
  timeline: renderTimelineSection as SectionRenderer,
  hierarchy: renderHierarchySection as SectionRenderer,
  diagram: renderDiagramSection as SectionRenderer,
};

/** The section kinds handled by {@link VISUALIZER_RENDERERS}. */
export const VISUALIZER_SECTION_KINDS: readonly SectionKind[] = [
  "process",
  "timeline",
  "hierarchy",
  "diagram",
];

export { labelCase, lineHeightForRole };
