/** Semantic template: nature-world-identity-reveal. Provides the Three.js jungle renderer; the
 * foundation stage falls back to its depth-plane rendering without WebGL or under reduced motion. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";
import { NatureWorldCanvas } from "../stages/nature-world-canvas";
import { NatureWorldRendererContext } from "../stages/nature-world-identity-reveal-stage";

export type NatureWorldIdentityRevealSceneProps = SceneTemplateViewProps<"nature-world-identity-reveal">;
export const NatureWorldIdentityRevealScene = forwardRef<HTMLDivElement,NatureWorldIdentityRevealSceneProps>(
  function NatureWorldIdentityRevealScene({spec,...props},ref) {
    return <NatureWorldRendererContext.Provider value={NatureWorldCanvas}>
      <SceneTemplateView {...props} spec={spec} ref={ref}/>
    </NatureWorldRendererContext.Provider>;
  }
);
