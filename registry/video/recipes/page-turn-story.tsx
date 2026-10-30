/**
 * Semantic template: page-turn-story. Reuses the shared deterministic scene
 * stage and supplies the optional Three.js bending-page book; the stage falls
 * back to its 2.5D book without WebGL or with `renderer: "flat"`.
 */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";
import { PageTurnBookCanvas } from "../stages/page-turn-book-canvas";
import { PageTurnRendererContext } from "../stages/page-turn-story-stage";

export type PageTurnStorySceneProps = SceneTemplateViewProps<"page-turn-story">;
export const PageTurnStoryScene = forwardRef<HTMLDivElement, PageTurnStorySceneProps>(
  function PageTurnStoryScene({ spec, ...props }, ref) {
    return <PageTurnRendererContext.Provider value={PageTurnBookCanvas}>
      <SceneTemplateView {...props} spec={spec} ref={ref}/>
    </PageTurnRendererContext.Provider>;
  }
);
