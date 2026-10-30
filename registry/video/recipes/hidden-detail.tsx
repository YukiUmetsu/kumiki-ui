/** Semantic template: hidden-detail. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type HiddenDetailSceneProps = SceneTemplateViewProps<"hidden-detail">;
export const HiddenDetailScene = forwardRef<HTMLDivElement,HiddenDetailSceneProps>(
  function HiddenDetailScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
