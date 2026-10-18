import { createContext, forwardRef, useContext, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { evaluateMotionDirector } from "./motion-director";
import type { CompiledMotionDirector, DirectorCuePayload, DirectorFrame, ResolvedDirectorCue } from "./director-types";
import { usePrefersReducedMotion } from "./react";

const DirectorContext = createContext<DirectorFrame | null>(null);
export interface MotionDirectorProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  director: CompiledMotionDirector;
  frame: number;
  reducedMotion?: boolean;
  /** One render boundary for all objects; no child owns a frame loop. */
  children: (state: DirectorFrame) => ReactNode;
}

/** A clock-free evaluation boundary over the already-compiled MG1 timeline. */
export const MotionDirector = forwardRef<HTMLDivElement, MotionDirectorProps>(function MotionDirector({ director, frame, reducedMotion, children, ...props }, ref) {
  const systemReducedMotion = usePrefersReducedMotion();
  const resolvedFrame = (reducedMotion ?? systemReducedMotion) ? director.timeline.durationFrames - 1 : frame;
  const state = useMemo(() => evaluateMotionDirector(director, resolvedFrame), [director, resolvedFrame]);
  return <DirectorContext.Provider value={state}><div {...props} ref={ref} data-km-motion-director="" data-director-frame={state.evaluation.frame}>{children(state)}</div></DirectorContext.Provider>;
});

/** Subscribe once at a scene boundary, then pass samples to renderer adapters. */
export function useMotionDirector(): DirectorFrame {
  const state = useContext(DirectorContext);
  if (!state) throw new Error("useMotionDirector needs a MotionDirector ancestor. Place the scene inside its render boundary.");
  return state;
}
export type DirectorCueOfKind<K extends DirectorCuePayload["kind"]> = Omit<ResolvedDirectorCue, "payload"> & { payload: Extract<DirectorCuePayload, { kind: K }> };
/** Active narration/markers/SFX/beats as typed data. Never dispatches playback. */
export function useDirectorCues<K extends DirectorCuePayload["kind"]>(kind: K): DirectorCueOfKind<K>[] {
  const { director, evaluation } = useMotionDirector();
  return useMemo(() => director.cues.filter((cue): cue is DirectorCueOfKind<K> => cue.payload.kind === kind && evaluation.frame >= cue.frame && evaluation.frame < cue.frame + Math.max(1, cue.durationFrames)), [director, evaluation.frame, kind]);
}
