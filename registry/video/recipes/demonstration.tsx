/** Semantic template: demonstration. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type DemonstrationSceneProps = SceneTemplateViewProps<"demonstration">;
export const DemonstrationScene = forwardRef<HTMLDivElement,DemonstrationSceneProps>(
  function DemonstrationScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
