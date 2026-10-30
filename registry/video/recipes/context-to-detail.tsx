/** Semantic template: context-to-detail. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type ContextToDetailSceneProps = SceneTemplateViewProps<"context-to-detail">;
export const ContextToDetailScene = forwardRef<HTMLDivElement,ContextToDetailSceneProps>(
  function ContextToDetailScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
