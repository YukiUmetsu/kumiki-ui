/** Semantic template: page-turn-story. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type PageTurnStorySceneProps = SceneTemplateViewProps<"page-turn-story">;
export const PageTurnStoryScene = forwardRef<HTMLDivElement,PageTurnStorySceneProps>(
  function PageTurnStoryScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
