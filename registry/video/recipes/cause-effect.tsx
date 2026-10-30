/** Semantic template: cause-effect. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type CauseEffectSceneProps = SceneTemplateViewProps<"cause-effect">;
export const CauseEffectScene = forwardRef<HTMLDivElement,CauseEffectSceneProps>(
  function CauseEffectScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
