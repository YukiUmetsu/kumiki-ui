import { forwardRef, Fragment, useMemo } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { usePrefersReducedMotion } from "../motion/react";
import { CaptionPerformer } from "../visual/caption-performer";
import { evaluateFilm } from "./film-document";
import type { CompiledFilm, FilmRayWorldContent } from "./film-document";
import { shot3dHoldFrame } from "./film-3d";
import { cadenceFrame, stillLook } from "./film-look";
import { speedClock, speedSource } from "./film-speed";
import type { ResolvedLook } from "./film-look";
import { FilmLookLayer } from "./film-look-react";
import { BrandBug, FilmCard } from "./film-cards-react";
import { ScreenDemo } from "./screen-demo-react";
import { MotionChart } from "./motion-chart-react";
import { ChartMorph } from "./chart-morph-react";
import type { ScreenDemoProps } from "./screen-demo-react";
import type { FilmShot3dContent } from "./film-3d";
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
  /** Draws a `ray-world` scene. `film:render` passes `RayWorldStage`, so a film with no world never loads its shaders. */
  renderWorld?: (content: FilmRayWorldContent, context: { frame: number; fps: CompiledFilm["fps"]; width: number; height: number; reducedMotion: boolean }) => ReactNode;
  /** Draws a `shot-3d` scene. `film:render` passes the renderer from `film-3d-react.tsx`, so a film with no 3D shot never loads three.js.
   * `frame` runs from 0 across the scene; under reduced motion it is the scene's still hold frame. */
  renderShot3d?: (content: FilmShot3dContent, context: { frame: number; fps: CompiledFilm["fps"]; durationFrames: number; width: number; height: number; reducedMotion: boolean;
    /** The scene's look, for its 3D lighting mood and lens. */ look?: ResolvedLook;
    /** Content frames per film frame at this frame, through any speed ramp: 1 at natural speed. */ rate: number;
    /** The scene's speed ramp as a clock, for motion that stays in film time, such as a chasing camera. Absent without a ramp. */ clock?: ReturnType<typeof speedClock> }) => ReactNode;
  /** Draws a shader effect. Pass `ShaderFxLayer`. A film with effects needs it, and a film without them does not, so the renderer stays optional. */
  renderFx?: (spec: ShaderFxSpec, context: { frame: number; hostDurationFrames: number; fps: CompiledFilm["fps"]; reducedMotion: boolean }) => ReactNode;
  /** Draws live UI for a `screen-demo` scene by name. Screenshot demos need nothing. */
  renderScreen?: ScreenDemoProps["renderScreen"];
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
/** Object stories paint from their own shot tokens, so a light film sets them. */
const LIGHT_SHOT = { "--km-shot-ink": "#1c2b3a", "--km-shot-accent": "#0f6e66", "--km-shot-warm": "#a3590a", "--km-shot-surface": "#f4efe4", "--km-shot-subject-surface": "#fffaf0", "--km-shot-glow": "#e7dcc8", "--km-shot-positive": "#1b7a4e", "--km-shot-negative": "#c03a3a" } as CSSProperties;
const LAYER: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };

/** One compiled film at one frame. Only the scenes that the cut plan shows at this frame are mounted. */
/** A title lands in a few frames, holds dead still and leaves, so the eye stays on the world. */
function WorldTitles({ film, titles, frame }: { film: CompiledFilm; titles?: FilmRayWorldContent["titles"]; frame: number }) {
  const short = Math.min(film.width, film.height), inset = film.safeInset ?? { left: 0, right: 0, top: 0, bottom: 0 };
  return <>{(titles ?? []).filter(title => frame >= title.startFrame && frame < title.endFrame).map(title => {
    const opacity = Math.min(1, (frame - title.startFrame + 1) / 8, (title.endFrame - frame) / 6);
    return <Fragment key={title.id}><div aria-hidden="true" style={{ ...LAYER, top: "auto", height: "42%", opacity, background: "linear-gradient(to top, rgba(8,12,18,.5), rgba(8,12,18,0))" }} /><p data-km-world-title={title.id} style={{ position: "absolute", margin: 0, left: film.width * Math.max(inset.left, .06), right: film.width * Math.max(inset.right, .06), bottom: film.height * Math.max(inset.bottom, .09),
      textAlign: title.align === "end" ? "right" : "left", color: "#f8f6f1", font: `600 ${Math.round(short * .074)}px/1.1 var(--km-font-display, var(--km-font-body, system-ui, sans-serif))`, letterSpacing: "var(--km-title-tracking, -.02em)", textTransform: "var(--km-title-case, none)" as CSSProperties["textTransform"], opacity,
      filter: opacity < 1 ? `blur(${(1 - opacity) * short * .012}px)` : undefined, textShadow: `0 1px ${short * .04}px rgba(8,12,18,.6)` }}>{title.text}</p></Fragment>;
  })}</>;
}
export const FilmStage = forwardRef<HTMLDivElement, FilmStageProps>(function FilmStage({ film, frame, renderObject, renderAsset, renderWorld, renderShot3d, renderFx, renderScreen, reducedMotion = "auto", style, ...props }, ref) {
  const prefersReduced = usePrefersReducedMotion();
  const reduce = reducedMotion === "auto" ? prefersReduced : reducedMotion;
  const state = useMemo(() => evaluateFilm(film, frame, { reducedMotion: reduce }), [film, frame, reduce]);
  const effects = (scene: CompiledFilm["scenes"][number], kind: ShaderFxLayerKind, localFrame: number) => {
    const list = scene.fx.filter(item => item.layer === kind);
    if (list.length && !renderFx) throw new Error(`Film scene "${scene.id}" has shader effects, but FilmStage has no renderFx.`);
    return list.map(item => <Fragment key={item.id}>{renderFx!(item, { frame: localFrame, hostDurationFrames: scene.endFrame - scene.startFrame, fps: film.fps, reducedMotion: reduce })}</Fragment>);
  };
  const world = (content: FilmRayWorldContent, localFrame: number) => {
    if (!renderWorld) throw new Error(`Film "${film.id}" has a ray world, but FilmStage has no renderWorld.`);
    return renderWorld(content, { frame: localFrame + Math.round((content.fromSeconds ?? 0) * film.fps.num / film.fps.den), fps: film.fps, width: film.width, height: film.height, reducedMotion: reduce });
  };
  const shot3d = (content: FilmShot3dContent, localFrame: number, durationFrames: number, look?: ResolvedLook, rate = 1, clock?: ReturnType<typeof speedClock>) => {
    if (!renderShot3d) throw new Error(`Film "${film.id}" has a 3D shot, but FilmStage has no renderShot3d.`);
    return renderShot3d(content, { frame: reduce ? shot3dHoldFrame(durationFrames) : localFrame, fps: film.fps, durationFrames, width: film.width, height: film.height, reducedMotion: reduce, look, rate, clock: reduce ? undefined : clock });
  };
  const fpsValue = film.fps.num / film.fps.den;
  // The brand's corner bug sits over every scene but the end card, which shows the brand itself, and a screen demo, whose window
  // fills that corner and shows the product.
  const current = film.scenes.find(item => item.id === state.shotId);
  const showBug = Boolean(film.brand?.bug) && !(current?.kind === "card" && current.content.card === "end") && current?.kind !== "screen-demo";
  // The film's type reaches everything, captions included; each scene's look grades and moves only that scene.
  const filmType = film.look ? { ...film.look.type.display ? { "--km-font-display": film.look.type.display } : {}, ...film.look.type.body ? { "--km-font-body": film.look.type.body } : {},
    "--km-title-case": film.look.type.titleCase, "--km-title-tracking": film.look.type.tracking } as CSSProperties : undefined;
  const window = state.transition && film.cut.transitions[state.transition.index], crossFx = state.transition && film.transitionFx[state.transition.toShotId];
  if (crossFx && !renderFx) throw new Error(`A transition into "${state.transition!.toShotId}" has a shader effect, but FilmStage has no renderFx.`);
  const crossing = crossFx && window && !reduce ? { fx: crossFx, startFrame: window.startFrame, endFrame: window.endFrame } : undefined;
  // Reduced motion keeps the dissolve and drops the travel.
  const match = state.transition && !reduce ? film.matches[state.transition.toShotId] : undefined;
  return <div {...props} ref={ref} data-km-appearance={film.appearance} data-km-film={film.id} data-km-film-scene={state.shotId} data-km-film-transition={state.transition?.kind ?? ""}
    style={{ position: "relative", width: film.width, height: film.height, overflow: "hidden", background: "var(--km-surface-canvas, #102133)", ...film.appearance === "light" ? LIGHT_SHOT : undefined, ...filmType, ...style }}>
    {state.layers.map(layer => {
      const index = film.scenes.findIndex(item => item.id === layer.sceneId), scene = film.scenes[index];
      const look = scene.look && (reduce ? stillLook(scene.look) : scene.look);
      // Under a held-frame cadence the scene shows its held frame; grain, weave and flicker still change every frame.
      const held = look ? cadenceFrame(look, layer.localFrame) : layer.localFrame;
      // A speed ramp maps the scene's frame to its content's; reduced motion plays the content at an even speed.
      const local = scene.speed ? speedSource(scene.speed, held, reduce) : held;
      const contentFrames = scene.speed ? Math.round(scene.speed.map[scene.speed.map.length - 1]) : scene.endFrame - scene.startFrame;
      const drifts = film.drift && !reduce && scene.kind !== "ray-world" && scene.kind !== "shot-3d" && scene.kind !== "screen-demo" && scene.kind !== "motion-chart" && scene.kind !== "chart-morph" && (!look || look.motion.camera === "drift");
      const content = <>
          {effects(scene, "background", held)}
          {scene.kind === "ray-world" ? <>
            {world(scene.content, local)}
            <WorldTitles film={film} titles={scene.content.titles} frame={local} />
          </> : scene.kind === "shot-3d" ? shot3d(scene.content, local, contentFrames, look, scene.speed ? speedSource(scene.speed, held + 1, reduce) - speedSource(scene.speed, held, reduce) : 1, scene.speed && speedClock(scene.speed))
          : scene.kind === "screen-demo" ? <ScreenDemo plan={scene.plan} frame={local} width={film.width} height={film.height} safeInset={film.safeInset} accent={film.brand?.color}
              renderScreen={renderScreen} reducedMotion={reduce} />
          : scene.kind === "motion-chart" ? <MotionChart plan={scene.plan} frame={local} width={film.width} height={film.height} safeInset={film.safeInset} appearance={film.appearance} reducedMotion={reduce} />
          : scene.kind === "chart-morph" ? <ChartMorph plan={scene.plan} frame={local} width={film.width} height={film.height} safeInset={film.safeInset} appearance={film.appearance} accent={film.brand?.color} reducedMotion={reduce} />
          : scene.kind === "card" ? <FilmCard content={scene.content} brand={film.brand} frame={local} fps={fpsValue} width={film.width} height={film.height} safeInset={film.safeInset} />
          : scene.kind === "object-story"
            ? <ObjectStory plan={scene.plan} frame={local} renderObject={renderObject} settled={reduce} backdrop={!scene.fx.some(item => item.layer === "background")} />
            : <SceneTemplateView spec={scene.spec} frame={local} renderAsset={renderAsset} reducedMotion={reduce} style={{ height: "100%" }} />}
          {effects(scene, "overlay", held)}
        </>;
      const { a, b, c, d, e, f } = (match && matchMatrix(match, layer.sceneId === state.transition!.toShotId, state.transition!.progress)) || layer.matrix;
      const clip = layer.mask?.rect;
      return <div key={layer.sceneId} data-km-film-layer={layer.sceneId} style={{ ...LAYER, opacity: layer.opacity,
        transform: `matrix(${a},${b},${c},${d},${e},${f})`, transformOrigin: "0 0",
        clipPath: clip ? `inset(${clip.y}px ${film.width - clip.x - clip.width}px ${film.height - clip.y - clip.height}px ${clip.x}px)` : undefined,
        // CSS blur has no direction. A whip lasts a few frames, so the larger axis is enough.
        filter: layer.blur ? `blur(${Math.max(layer.blur.x, layer.blur.y)}px)` : undefined }}>
        <div style={{ ...LAYER, transform: drifts ? `scale(${1 + film.drift * layer.localFrame / (scene.endFrame - scene.startFrame)})` : undefined }}>
          {look ? <FilmLookLayer look={look} frame={layer.localFrame} fps={fpsValue} width={film.width} height={film.height} seed={index + 1}
            turnFrame={scene.turnFrame !== undefined ? scene.turnFrame - scene.startFrame : undefined}>{content}</FilmLookLayer> : content}
        </div>
      </div>;
    })}
    {crossing && renderFx!(crossing.fx, { frame: state.frame - crossing.startFrame, hostDurationFrames: crossing.endFrame - crossing.startFrame, fps: film.fps, reducedMotion: reduce })}
    {showBug && <BrandBug brand={film.brand!} width={film.width} height={film.height} safeInset={film.safeInset} />}
    {film.captions && <CaptionPerformer track={film.captions} frame={state.frame} reducedMotion={reduce} style={LAYER} />}
  </div>;
});
