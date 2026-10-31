/** Authoring contract for cinematic, frame-addressable visual templates.
 * An export, a paused seek and a live preview all evaluate the same frame.
 * These are intentionally short proof scenes, not claims of full 3D simulation.
 */
export type CinematicTemplateId =
  | "nature-logo" | "liquid-glass" | "history-timeline" | "epic-book"
  | "fly-around-earth" | "walk-on-earth";

export interface CinematicTemplateDefinition {
  id: CinematicTemplateId;
  label: string;
  durationFrames: number;
  description: string;
  artDirection: string;
}

export const CINEMATIC_FPS = { num: 30, den: 1 } as const;
export const CINEMATIC_TEMPLATES: readonly CinematicTemplateDefinition[] = [
  { id: "nature-logo", label: "Nature logo", durationFrames: 300, description: "Dolly through rainforest foliage; light and foliage part to reveal a mark.", artDirection: "Atmospheric, organic, natural light" },
  { id: "liquid-glass", label: "Liquid glass", durationFrames: 300, description: "A translucent analytics widget rises through flowing iridescent material.", artDirection: "Refracted, translucent, editorial" },
  { id: "history-timeline", label: "History timeline", durationFrames: 420, description: "Archival scenes, documentary typography, chronology and film texture.", artDirection: "Monochrome documentary, vivid editorial red" },
  { id: "epic-book", label: "Epic book", durationFrames: 360, description: "A story materializes in an aged open folio, then the page turns.", artDirection: "Candlelit, tactile, antique" },
  { id: "fly-around-earth", label: "Fly around Earth", durationFrames: 330, description: "A biplane crosses a miniature landmark world and pulls a final banner.", artDirection: "Bright, playful miniature world" },
  { id: "walk-on-earth", label: "Walk on Earth", durationFrames: 360, description: "A small traveler traverses a fantastical globe-world at golden hour.", artDirection: "Cinematic travel collage, warm backlight" },
] as const;

export const CINEMATIC_REEL_FRAMES = CINEMATIC_TEMPLATES.reduce((total, scene) => total + scene.durationFrames, 0);

export function templateDefinition(id: CinematicTemplateId): CinematicTemplateDefinition {
  const definition = CINEMATIC_TEMPLATES.find(entry => entry.id === id);
  if (!definition) throw new Error(`Unknown cinematic template ${id}`);
  return definition;
}

export function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
export function smooth(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}
export function span(frame: number, from: number, to: number): number {
  return smooth((frame - from) / Math.max(1, to - from));
}
export function easeOut(value: number): number { return 1 - Math.pow(1 - clamp01(value), 3); }
export function templateFrame(id: CinematicTemplateId, frame: number): number {
  const last = templateDefinition(id).durationFrames - 1;
  return Number.isFinite(frame) ? Math.max(0, Math.min(last, Math.round(frame))) : 0;
}

/** A single absolute-frame clock drives the six-scene QA reel. */
export function reelAt(frame: number): { id: CinematicTemplateId; sceneIndex: number; localFrame: number; reelFrame: number } {
  const reelFrame = Number.isFinite(frame) ? Math.max(0, Math.min(CINEMATIC_REEL_FRAMES - 1, Math.round(frame))) : 0;
  let offset = 0;
  for (let sceneIndex = 0; sceneIndex < CINEMATIC_TEMPLATES.length; sceneIndex++) {
    const scene = CINEMATIC_TEMPLATES[sceneIndex];
    if (reelFrame < offset + scene.durationFrames) {
      return { id: scene.id, sceneIndex, localFrame: reelFrame - offset, reelFrame };
    }
    offset += scene.durationFrames;
  }
  throw new Error("Reel calculation exceeded declared duration.");
}
