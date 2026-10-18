import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ExplainerStage, ExplainerText, ExplainerVisual } from "../../registry/visual/explainer-stage";
import type { ExplainerLayoutResult, ProtectedSubjectRegion } from "../../registry/visual/explainer-layout";
import { journeyExplanation } from "./journey-composition";
import { journeyChapterAt, JOURNEY_THEME } from "./journey-content";
import type { JourneyAspect, JourneySettings } from "./journey-content";

export function JourneyWorldComposition({ frame, aspect, settings, subjects, children, onDiagnostic, active = true }: {
  frame: number; aspect: JourneyAspect; settings: JourneySettings;
  subjects: readonly ProtectedSubjectRegion[]; children: ReactNode;
  active?: boolean;
  onDiagnostic?: (frame: number, message: string | null) => void;
}) {
  const chapter = journeyChapterAt(frame);
  const text = journeyExplanation(chapter.id, frame, settings);
  const [layout, setLayout] = useState<ExplainerLayoutResult | null>(null);
  // Stage deduplicates equal diagnostics. Carry an unresolved failure into each
  // new frame, with current essential copy, until a successful layout replaces it.
  useEffect(() => {
    onDiagnostic?.(frame, layout && !layout.ok ? `${layout.diagnostics.map(d => d.message).join(" ")} ${text}` : null);
  }, [layout, onDiagnostic, frame, text]);
  return <ExplainerStage subjects={subjects} protect={subjects.map(subject => subject.id)}
    aspect={aspect === "portrait" ? "9:16" : "16:9"} gapPx={16} onLayout={setLayout}
    data-network-annotation={active ? chapter.id : undefined} data-journey-caption-frame={frame}
    style={{ height: "100%", containerType: "inline-size", color: JOURNEY_THEME.pale }}>
    <ExplainerVisual>
      {children}
      {subjects.map(subject => <span key={subject.id} aria-hidden="true" data-journey-protected={subject.id}
        style={{ position: "absolute", pointerEvents: "none", left: `${subject.region.x * 100}%`, top: `${subject.region.y * 100}%`,
          width: `${subject.region.width * 100}%`, height: `${subject.region.height * 100}%` }} />)}
    </ExplainerVisual>
    <ExplainerText lang="en" data-journey-measured-caption=""
      style={{ fontSize: "clamp(16px, 2cqi, 24px)", lineHeight: 1.4, color: JOURNEY_THEME.pale,
        fontFamily: "'Geist Variable', sans-serif", textShadow: "0 2px 12px #122a30" }}>{text}</ExplainerText>
  </ExplainerStage>;
}
