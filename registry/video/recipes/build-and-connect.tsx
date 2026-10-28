/** Semantic template: build-and-connect. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type BuildAndConnectSceneProps = SceneTemplateViewProps<"build-and-connect">;
export const BuildAndConnectScene = forwardRef<HTMLDivElement,BuildAndConnectSceneProps>(
  function BuildAndConnectScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
