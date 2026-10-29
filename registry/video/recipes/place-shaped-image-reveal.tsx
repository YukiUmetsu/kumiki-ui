/** Semantic template: place-shaped-image-reveal. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type PlaceShapedImageRevealSceneProps = SceneTemplateViewProps<"place-shaped-image-reveal">;
export const PlaceShapedImageRevealScene = forwardRef<HTMLDivElement,PlaceShapedImageRevealSceneProps>(
  function PlaceShapedImageRevealScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
