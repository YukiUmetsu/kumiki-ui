/** Semantic template: illustrated-book-into-living-world. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type IllustratedBookIntoLivingWorldSceneProps = SceneTemplateViewProps<"illustrated-book-into-living-world">;
export const IllustratedBookIntoLivingWorldScene = forwardRef<HTMLDivElement,IllustratedBookIntoLivingWorldSceneProps>(
  function IllustratedBookIntoLivingWorldScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
