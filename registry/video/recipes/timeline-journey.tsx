/** Semantic template: timeline-journey. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type TimelineJourneySceneProps = SceneTemplateViewProps<"timeline-journey">;
export const TimelineJourneyScene = forwardRef<HTMLDivElement,TimelineJourneySceneProps>(
  function TimelineJourneyScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
