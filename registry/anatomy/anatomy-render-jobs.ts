/**
 * ANAT1's render jobs, run by `anatomy-render-worker.ts` (or on the page's thread when workers are unavailable):
 * `portrait` (`renderPortrait`), `hand` (a posed or grasping hand), `hand-frame` (one frame of a hand animation) and
 * `skin` (a skin swatch). Arguments are plain data; portraits return the face, its landmarks and hair counts in `meta`.
 */
import type { RenderOutput, RenderRunners } from "./foundation-render";
import { renderPortrait } from "./face-portrait";
import type { PortraitOptions } from "./face-portrait";
import { animateHand, buildHand, findAnimation, graspHand, HAND_GESTURES, poseHand } from "./hand-model";
import type { HandPose } from "./hand-model";
import { renderHand } from "./hand-render";
import type { HandRenderOptions } from "./hand-render";
import { renderSkinSwatch } from "./skin-texture";
import type { SkinSwatchOptions } from "./skin-texture";

/** A hand to render: its type and side, and a gesture, a pose or a grasp (closed by `close`, 0–1). */
export interface HandSpec { type: string; side?: "right" | "left"; gesture?: string; pose?: HandPose; grasp?: string; close?: number }
export function posedHand(h: HandSpec) {
  const hand = buildHand(h.type, h.side ?? "right");
  if (h.grasp) return graspHand(hand, h.grasp, h.close ?? 1);
  return poseHand(hand, h.pose ?? HAND_GESTURES.find(g => g.id === (h.gesture ?? "relaxed"))?.pose ?? HAND_GESTURES[0].pose);
}

export const ANATOMY_RUNNERS: RenderRunners = {
  portrait: ((o: PortraitOptions): RenderOutput => {
    const p = renderPortrait(o);
    return { width: p.width, height: p.height, rgba: p.rgba, ms: p.ms,
      meta: { face: p.face, landmarks: p.landmarks, strands: p.hair?.groom.starts.length ?? 0, groomMs: p.hair?.groom.ms ?? 0 } };
  }) as never,
  hand: (({ hand, options }: { hand: HandSpec; options?: HandRenderOptions }): RenderOutput => renderHand(posedHand(hand), options ?? {})) as never,
  "hand-frame": (({ type, side, animation, t, options }: { type: string; side?: "right" | "left"; animation: string; t: number; options?: HandRenderOptions }): RenderOutput =>
    renderHand(animateHand(buildHand(type, side ?? "right"), findAnimation(animation), t), options ?? {})) as never,
  skin: ((o: SkinSwatchOptions): RenderOutput => renderSkinSwatch(o)) as never,
};
