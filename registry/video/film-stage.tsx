import { forwardRef, Fragment, useMemo } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { usePrefersReducedMotion } from "../motion/react";
import { CaptionPerformer } from "../visual/caption-performer";
import { evaluateFilm } from "./film-document";
import type { CompiledFilm } from "./film-document";
import { ObjectStory } from "./object-story-react";
import type { ObjectStoryProps } from "./object-story-react";
import type { ShaderFxLayerKind, ShaderFxSpec } from "./shader-fx";
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
  /** Draws a shader effect. Pass `ShaderFxLayer`. A film with effects needs it, and a film without them does not, so the renderer stays optional. */
  renderFx?: (spec: ShaderFxSpec, context: { frame: number; hostDurationFrames: number; fps: CompiledFilm["fps"]; reducedMotion: boolean }) => ReactNode;
  /** `auto` follows prefers-reduced-motion. */
  reducedMotion?: boolean | "auto";
}
/** Move a scene so that its subject box sits on a box that travels from `from`, through `via` at the midpoint, to `to`.
 * Both scenes get the same travelling box, so the subject stays in one place while one scene dissolves into the other. */
function matchMatrix(match: CompiledFilm["matches"][string], incoming: boolean, progress: number) {
  const t = progress * progress * (3 - 2 * progress), own = incoming ? match.to : match.from;
  // A curve through three values: the control value puts `via` at t = 0.5.
  const through = (a: number, m: number, b: number) => (1 - t) ** 2 * a + 2 * t * (1 - t) * (2 * m - (a + b) / 2) + t ** 2 * b;
  const centre = (box: typeof own) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }), from = centre(match.from), via = centre(match.via), to = centre(match.to), mine = centre(own);
  const scale = Math.exp(through(Math.log(match.from.height), Math.log(match.via.height), Math.log(match.to.height))) / own.height;
  return { a: scale, b: 0, c: 0, d: scale, e: through(from.x, via.x, to.x) - scale * mine.x, f: through(from.y, via.y, to.y) - scale * mine.y };
}
const LAYER: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };

/** One compiled film at one frame. Only the scenes that the cut plan shows at this frame are mounted. */
export const FilmStage = forwardRef<HTMLDivElement, FilmStageProps>(function FilmStage({ film, frame, renderObject, renderAsset, renderFx, reducedMotion = "auto", style, ...props }, ref) {
  const prefersReduced = usePrefersReducedMotion();
  const reduce = reducedMotion === "auto" ? prefersReduced : reducedMotion;
  const state = useMemo(() => evaluateFilm(film, frame, { reducedMotion: reduce }), [film, frame, reduce]);
  const effects = (scene: CompiledFilm["scenes"][number], kind: ShaderFxLayerKind, localFrame: number) => {
    const list = scene.fx.filter(item => item.layer === kind);
    if (list.length && !renderFx) throw new Error(`Film scene "${scene.id}" has shader effects, but FilmStage has no renderFx.`);
    return list.map(item => <Fragment key={item.id}>{renderFx!(item, { frame: localFrame, hostDurationFrames: scene.endFrame - scene.startFrame, fps: film.fps, reducedMotion: reduce })}</Fragment>);
  };
  // Reduced motion keeps the dissolve and drops the travel.
  const match = state.transition && !reduce ? film.matches[state.transition.toShotId] : undefined;
  return <div {...props} ref={ref} data-km-appearance={film.appearance} data-km-film={film.id} data-km-film-scene={state.shotId} data-km-film-transition={state.transition?.kind ?? ""}
    style={{ position: "relative", width: film.width, height: film.height, overflow: "hidden", background: "var(--km-surface-canvas, #102133)", ...style }}>
    {state.layers.map(layer => {
      const scene = film.scenes.find(item => item.id === layer.sceneId)!;
      const { a, b, c, d, e, f } = (match && matchMatrix(match, layer.sceneId === state.transition!.toShotId, state.transition!.progress)) || layer.matrix;
      const clip = layer.mask?.rect;
      return <div key={layer.sceneId} data-km-film-layer={layer.sceneId} style={{ ...LAYER, opacity: layer.opacity,
        transform: `matrix(${a},${b},${c},${d},${e},${f})`, transformOrigin: "0 0",
        clipPath: clip ? `inset(${clip.y}px ${film.width - clip.x - clip.width}px ${film.height - clip.y - clip.height}px ${clip.x}px)` : undefined,
        // CSS blur has no direction. A whip lasts a few frames, so the larger axis is enough.
        filter: layer.blur ? `blur(${Math.max(layer.blur.x, layer.blur.y)}px)` : undefined }}>
        <div style={{ ...LAYER, transform: film.drift && !reduce ? `scale(${1 + film.drift * layer.localFrame / (scene.endFrame - scene.startFrame)})` : undefined }}>
          {effects(scene, "background", layer.localFrame)}
          {scene.kind === "object-story"
            ? <ObjectStory plan={scene.plan} frame={layer.localFrame} renderObject={renderObject} settled={reduce} backdrop={!scene.fx.some(item => item.layer === "background")} />
            : <SceneTemplateView spec={scene.spec} frame={layer.localFrame} renderAsset={renderAsset} reducedMotion={reduce} style={{ height: "100%" }} />}
          {effects(scene, "overlay", layer.localFrame)}
        </div>
      </div>;
    })}
    {film.captions && <CaptionPerformer track={film.captions} frame={state.frame} reducedMotion={reduce} style={LAYER} />}
  </div>;
});
