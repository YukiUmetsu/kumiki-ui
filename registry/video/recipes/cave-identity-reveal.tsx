/** Cave variant of the shared environment identity contract. Uses the shared DOM renderer. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

/** Uses the same environment/depth-layer schema as NatureWorldIdentityRevealScene.
 * Supply cave photography and rock alpha layers; this adapter selects the cinematic renderer. */
export type CaveIdentityRevealSceneProps = SceneTemplateViewProps<"nature-world-identity-reveal">;
export const CaveIdentityRevealScene = forwardRef<HTMLDivElement, CaveIdentityRevealSceneProps>(
  function CaveIdentityRevealScene({ spec, ...props }, ref) {
    return <SceneTemplateView {...props} ref={ref} spec={{ ...spec, content: { ...spec.content, treatment: "cinematic" } }}/>;
  },
);
