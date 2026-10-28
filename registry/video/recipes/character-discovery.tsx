/** Semantic template: character-discovery. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type CharacterDiscoverySceneProps = SceneTemplateViewProps<"character-discovery">;
export const CharacterDiscoveryScene = forwardRef<HTMLDivElement,CharacterDiscoverySceneProps>(
  function CharacterDiscoveryScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
