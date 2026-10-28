/** Semantic template: follow-subject-through-sections. Reuses the shared deterministic scene stage
 * and adds a runtime-only rig slot for a frame-addressable subject (SVG rig, sprite, canvas or 3D). */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";
import { FollowSubjectRigContext } from "../stages/follow-subject-through-sections-stage";
import type { FollowSubjectRigRenderer } from "../stages/follow-subject-through-sections-stage";

export type { FollowSubjectRigProps, FollowSubjectRigRenderer } from "../stages/follow-subject-through-sections-stage";
export { followSubjectAt, followSubjectFraming, followSubjectTimeline, followSubjectCopyRegion } from "../follow-subject-sections";
export type { FollowSubjectContent, FollowSubjectSection, FollowSubjectState, FollowSubjectTransition } from "../follow-subject-sections";

export type FollowSubjectThroughSectionsSceneProps = SceneTemplateViewProps<"follow-subject-through-sections"> & {
  /** Draws the subject each frame from its evaluated state. Never saved in the spec;
   * `content.subject.media` remains the static fallback and provenance record. */
  renderSubject?: FollowSubjectRigRenderer;
};
export const FollowSubjectThroughSectionsScene = forwardRef<HTMLDivElement, FollowSubjectThroughSectionsSceneProps>(
  function FollowSubjectThroughSectionsScene({ spec, renderSubject, ...props }, ref) {
    return <FollowSubjectRigContext.Provider value={renderSubject}>
      <SceneTemplateView {...props} spec={spec} ref={ref}/>
    </FollowSubjectRigContext.Provider>;
  }
);
