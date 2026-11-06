import { forwardRef, useMemo } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { usePrefersReducedMotion } from "../motion/react";
import { CaptionPerformer } from "../visual/caption-performer";
import { evaluateFilm } from "./film-document";
import type { CompiledFilm } from "./film-document";
import { ObjectStory } from "./object-story-react";
import type { ObjectStoryProps } from "./object-story-react";
import { SceneTemplateView } from "./scene-templates-react";
import type { SceneAssetRenderer } from "./scene-templates-react";

export interface FilmStageProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  film: CompiledFilm;
  /** Absolute film frame. The stage owns no clock. */
  frame: number;
  /** Draws the objects of an object-story scene. */
  renderObject: ObjectStoryProps["renderObject"];
  /** Replaces the image of a scene asset, such as a character rig. */
  renderAsset?: SceneAssetRenderer;
  /** `auto` follows prefers-reduced-motion. */
  reducedMotion?: boolean | "auto";
}
const LAYER: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };

/** One compiled film at one frame. Only the scenes that the cut plan shows at this frame are mounted. */
export const FilmStage = forwardRef<HTMLDivElement, FilmStageProps>(function FilmStage({ film, frame, renderObject, renderAsset, reducedMotion = "auto", style, ...props }, ref) {
  const prefersReduced = usePrefersReducedMotion();
  const reduce = reducedMotion === "auto" ? prefersReduced : reducedMotion;
  const state = useMemo(() => evaluateFilm(film, frame, { reducedMotion: reduce }), [film, frame, reduce]);
  return <div {...props} ref={ref} data-km-appearance={film.appearance} data-km-film={film.id} data-km-film-scene={state.shotId} data-km-film-transition={state.transition?.kind ?? ""}
    style={{ position: "relative", width: film.width, height: film.height, overflow: "hidden", background: "var(--km-surface-canvas, #102133)", ...style }}>
    {state.layers.map(layer => {
      const scene = film.scenes.find(item => item.id === layer.sceneId)!, { a, b, c, d, e, f } = layer.matrix;
      const clip = layer.mask?.rect;
      return <div key={layer.sceneId} data-km-film-layer={layer.sceneId} style={{ ...LAYER, opacity: layer.opacity,
        transform: `matrix(${a},${b},${c},${d},${e},${f})`, transformOrigin: "0 0",
        clipPath: clip ? `inset(${clip.y}px ${film.width - clip.x - clip.width}px ${film.height - clip.y - clip.height}px ${clip.x}px)` : undefined,
        // CSS blur has no direction. A whip lasts a few frames, so the larger axis is enough.
        filter: layer.blur ? `blur(${Math.max(layer.blur.x, layer.blur.y)}px)` : undefined }}>
        {scene.kind === "object-story"
          ? <ObjectStory plan={scene.plan} frame={layer.localFrame} renderObject={renderObject} settled={reduce} />
          : <SceneTemplateView spec={scene.spec} frame={layer.localFrame} renderAsset={renderAsset} reducedMotion={reduce} style={{ height: "100%" }} />}
      </div>;
    })}
    {film.captions && <CaptionPerformer track={film.captions} frame={state.frame} reducedMotion={reduce} style={LAYER} />}
  </div>;
});
