import { useMemo } from "react";
import type { PaperCraftStageProps } from "./paper-craft-react";
import { PaperCraftStage } from "./paper-craft-react";
import { compilePaperDirector, resolvePaperDirector } from "./paper-director";
import type { PaperDirectorAspect, PaperDirectorFilm } from "./paper-director";

export interface PaperDirectorStageProps extends Omit<PaperCraftStageProps, "spec" | "frame"> {
  film: PaperDirectorFilm;
  aspect: PaperDirectorAspect;
  frame: number;
}
/** Source-native SVG film; existing PAPER1 rendering owns all stock optics and hinges. */
export function PaperDirectorStage({film,aspect,frame,reducedMotion=false,...props}:PaperDirectorStageProps) {
  const plan=useMemo(()=>compilePaperDirector(film),[film]);
  const shot=resolvePaperDirector(plan,frame,aspect);
  return <PaperCraftStage key={shot.shotId} {...props}
    spec={shot.spec} frame={shot.localFrame} reducedMotion={reducedMotion}
    data-km-paper-director={film.id} data-km-paper-shot={shot.shotId}
    data-km-paper-shot-index={shot.shotIndex}/>;
}
