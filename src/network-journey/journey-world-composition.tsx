import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ExplainerStage, ExplainerText, ExplainerVisual } from "../../registry/visual/explainer-stage";
import type { ExplainerLayoutResult, ProtectedSubjectRegion } from "../../registry/visual/explainer-layout";
import { intersectsRect } from "../../registry/visual/protected-text";
import { journeyExplanation, journeySubjectComposition } from "./journey-composition";
import { journeyChapterAt, JOURNEY_THEME } from "./journey-content";
import type { JourneyAspect, JourneySettings } from "./journey-content";

const CAPTION_REGION_ID = "world-camera-footprint";
const CAPTION_PROTECT = [CAPTION_REGION_ID];
const STAGE_STYLE: CSSProperties = {
  height: "100%", containerType: "inline-size", color: JOURNEY_THEME.pale,
};
const CAPTION_STYLE: CSSProperties = {
  fontSize: "clamp(16px, 2cqi, 24px)", lineHeight: 1.4,
  color: JOURNEY_THEME.pale,
  fontFamily: "'Geist Variable', sans-serif",
  textShadow: "0 2px 12px #122a30",
  visibility: "var(--journey-caption-visibility, visible)",
};

/** The camera owns the left/upper subject region for the WHOLE shot.
 * Protecting an individual moving target's changing rectangle forced captions
 * to jump around, despite no editorial copy change.
 * A constant CC1-authored region fixes the landscape column / portrait row.
 */
export function JourneyWorldComposition({ frame, aspect, settings, subjects, children, onDiagnostic, active = true }: {
  frame: number; aspect: JourneyAspect; settings: JourneySettings;
  subjects: readonly ProtectedSubjectRegion[]; children: ReactNode;
  active?: boolean;
  onDiagnostic?: (frame: number, message: string | null) => void;
}) {
  const chapter = journeyChapterAt(frame);
  const text = journeyExplanation(chapter.id, frame, settings);
  const [layout, setLayout] = useState<ExplainerLayoutResult | null>(null);
  const reserved = useMemo<readonly ProtectedSubjectRegion[]>(() => {
    const region = journeySubjectComposition(aspect).safeRegion;
    if (!region) throw new Error("Journey world needs a fixed camera safe region for captions.");
    return [{ id: CAPTION_REGION_ID, region }];
  }, [aspect]);
  // Memoize the element, not just its string. ExplainerStage keys measurement
  // on this identity: moving cameras do not schedule a fresh DOM layout.
  const caption = useMemo(() => <ExplainerText lang="en" data-journey-measured-caption=""
    style={CAPTION_STYLE}>{text}</ExplainerText>, [text]);
  // Keep current subject projections in the *collision* contract without
  // allowing them to move the fixed editorial text placement. During an
  // intentional partial camera handoff, a subject may cross the text column.
  // Suppress the overlap and report it for an authored camera correction.
  const intruding = layout?.ok ? subjects.filter(subject =>
    intersectsRect(subject.region, layout.text.rect, 1e-5)) : [];
  const blocked = intruding.length > 0;
  const intrudingIds = intruding.map(subject => subject.id).join(", ");
  useEffect(() => {
    if (!active) return;
    const problem = blocked
      ? "Moving subject enters the caption area (" + intrudingIds +
        "). Widen the camera or use a purposeful cut. " + text
      : layout && !layout.ok
      ? layout.diagnostics.map(d => d.message).join(" ") + " " + text : null;
    onDiagnostic?.(frame, problem);
  }, [layout, onDiagnostic, frame, text, blocked, active, intrudingIds]);
  return <div data-journey-caption-collision={blocked ? "true" : "false"}
    style={{ height: "100%", "--journey-caption-visibility": blocked ? "hidden" : "visible" } as CSSProperties}>
    <ExplainerStage subjects={reserved} protect={CAPTION_PROTECT}
    aspect={aspect === "portrait" ? "9:16" : "16:9"} gapPx={16} onLayout={setLayout}
    data-network-annotation={active ? chapter.id : undefined} data-journey-caption-frame={frame}
    style={STAGE_STYLE}>
    <ExplainerVisual>
      {children}
      {/* Projected targets stay observable to the inspector but cannot
          push the editorial caption around on every camera movement. */}
      {subjects.map(subject => <span key={subject.id} aria-hidden="true" data-journey-protected={subject.id}
        style={{ position: "absolute", pointerEvents: "none", left: String(subject.region.x * 100) + "%",
          top: String(subject.region.y * 100) + "%", width: String(subject.region.width * 100) + "%",
          height: String(subject.region.height * 100) + "%" }} />)}
    </ExplainerVisual>
    {caption}
    </ExplainerStage>
  </div>;
}
