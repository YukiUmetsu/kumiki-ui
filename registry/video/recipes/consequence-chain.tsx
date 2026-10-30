/** Semantic template: consequence-chain. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type ConsequenceChainSceneProps = SceneTemplateViewProps<"consequence-chain">;
export const ConsequenceChainScene = forwardRef<HTMLDivElement,ConsequenceChainSceneProps>(
  function ConsequenceChainScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
