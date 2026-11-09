import { forwardRef, Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
/** An emphasized easing, cubic-bezier(.4, 0, .05, 1): the tile lifts gently, the middle is quick and the surface settles slowly into the
 * frame, so the eye can follow the tile it left. */
function emphasized(t: number) {
  const x = (u: number) => 1.2 * (1 - u) ** 2 * u + .15 * (1 - u) * u * u + u ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (x(mid) < t) lo = mid; else hi = mid; }
  const u = (lo + hi) / 2;
  return 3 * (1 - u) * u * u + u ** 3;
}
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
type Box = { x: number; y: number; width: number; height: number };
/** A container transform at one point of its transition: the surface's box and corners, and the transform and clip that seat the incoming
 * scene in that box, cropped to it like a cover image. The incoming scene fades through once the surface hides the tile's own content. */
function containerFrame(from: Box, progress: number, width: number, height: number, radius: number) {
  const e = emphasized(progress), lerp = (a: number, b: number) => a + (b - a) * e;
  const box = { x: lerp(from.x, 0), y: lerp(from.y, 0), width: lerp(from.width, width), height: lerp(from.height, height) }, r = radius * Math.min(width, height) * (1 - e);
  const s = Math.max(box.width / width, box.height / height), tx = box.x + box.width / 2 - s * width / 2, ty = box.y + box.height / 2 - s * height / 2;
  const left = (box.x - tx) / s, top = (box.y - ty) / s;
  return { e, box, r, surface: smooth(0, .14, progress), incoming: smooth(.18, .55, progress),
    matrix: { a: s, b: 0, c: 0, d: s, e: tx, f: ty }, clip: `inset(${top}px ${width - left - box.width / s}px ${height - top - box.height / s}px ${left}px round ${r / s}px)` };
}
/** A pass-by at one point of its transition. The foreground crosses at a steady speed, from just off one side to just off the other,
 * and the incoming scene is revealed along its centre, so the seam is always behind it. Both scenes drift the same way at a sixth of
 * its speed, as a camera dollying past something close to the lens would see them. */
function passByFrame(spec: CompiledFilm["passBys"][string], progress: number, width: number, durationFrames: number) {
  const w = spec.width * width, toRight = spec.direction === "right", sign = toRight ? 1 : -1, travel = width + w;
  const centre = toRight ? -w / 2 + progress * travel : width + w / 2 - progress * travel, drift = .07 * width;
  const outgoing = sign * drift * progress, incoming = sign * drift * (progress - 1);
  // The incoming scene shows on the side the foreground has passed; the clip is in the layer's own coordinates.
  const clip = toRight ? `inset(0 ${Math.max(0, width - (centre - incoming))}px 0 0)` : `inset(0 0 0 ${Math.max(0, centre - incoming)}px)`;
  return { centre, w, outgoing, incoming, clip, speed: travel / Math.max(1, durationFrames) };
}
/** Something close to the lens, far out of focus: a dark column shaded round, with a little of the scene's light along its leading edge.
 * Its edges are soft ramps of opacity as wide as its defocus plus its motion over half a frame (a 180° shutter). Drawn with gradients
 * rather than a blur filter, which bands at this size in software rendering and would leave the core translucent over the seam. */
function PassByForeground({ spec, centre, w, speed, height, width }: { spec: CompiledFilm["passBys"][string]; centre: number; w: number; speed: number; height: number; width: number }) {
  const ramp = Math.min(w * .3, width * .035 + speed * .5), ink = spec.color ?? "#07090c", toRight = spec.direction === "right";
  // Each edge is a smoothstep in five stops, so it has no visible start or end.
  const steps = [0, .16, .5, .84, 1], stops = [...steps.map((v, i) => `rgba(0,0,0,${v}) ${i / 4 * ramp}px`), ...steps.map((v, i) => `rgba(0,0,0,${v}) ${w - i / 4 * ramp}px`).reverse()];
  // Round: a soft sheen a third of the way across, darker toward both edges; light falls off toward the top and the bottom.
  const round = `linear-gradient(to right, transparent ${ramp}px, rgba(255,255,255,.06) ${w * .34}px, transparent ${w * .55}px)`;
  const fall = "linear-gradient(to bottom, rgba(0,0,0,.35), transparent 40%, transparent 60%, rgba(0,0,0,.4))";
  const rim = toRight ? `linear-gradient(to left, transparent ${ramp * .6}px, rgba(255,238,221,.13) ${ramp * 1.05}px, transparent ${ramp * 1.9}px)`
    : `linear-gradient(to right, transparent ${ramp * .6}px, rgba(255,238,221,.13) ${ramp * 1.05}px, transparent ${ramp * 1.9}px)`;
  const mask = `linear-gradient(to right, ${stops.join(", ")})`;
  return <div aria-hidden="true" data-km-film-pass-by="" style={{ position: "absolute", top: 0, left: centre - w / 2, width: w, height, pointerEvents: "none", background: ink,
    maskImage: mask, WebkitMaskImage: mask }}>
    <div style={{ position: "absolute", inset: 0, background: `${rim}, ${round}, ${fall}` }} />
  </div>;
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
  // A container transform starts on the tile where it is drawn: a tagged element is measured in the outgoing layer, so neither the author
  // nor the compiler has to know where the layout put it. A declared box is the fallback.
  const container = state.transition && !reduce ? film.containers[state.transition.toShotId] : undefined;
  const root = useRef<HTMLDivElement | null>(null), [measured, setMeasured] = useState<{ key: string; box: Box }>();
  const setRef = useCallback((node: HTMLDivElement | null) => { root.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }, [ref]);
  const containerKey = container ? `${state.transition!.fromShotId}>${state.transition!.toShotId}:${container.subject}` : "";
  // Every render, because the tile is wherever the outgoing scene drew it at this frame; it sets state only when the box moves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!container || !root.current) return;
    const tile = root.current.querySelector(`[data-km-film-layer="${CSS.escape(state.transition!.fromShotId)}"] [data-km-film-subject="${CSS.escape(container.subject)}"]`);
    if (!tile) return;
    const stage = root.current.getBoundingClientRect(), own = tile.getBoundingClientRect(), k = stage.width / film.width || 1;
    const box = { x: (own.left - stage.left) / k, y: (own.top - stage.top) / k, width: own.width / k, height: own.height / k };
    if (measured?.key !== containerKey || ["x", "y", "width", "height"].some(side => Math.abs(measured.box[side as keyof Box] - box[side as keyof Box]) > .5)) setMeasured({ key: containerKey, box });
  });
  const tileBox = container && (measured?.key === containerKey ? measured.box : container.from);
  const grow = container && tileBox ? containerFrame(tileBox, state.transition!.progress, film.width, film.height, container.radius) : undefined;
  const passBySpec = state.transition && !reduce ? film.passBys[state.transition.toShotId] : undefined;
  const pass = passBySpec && window ? passByFrame(passBySpec, state.transition!.progress, film.width, window.endFrame - window.startFrame) : undefined;
  return <div {...props} ref={setRef} data-km-appearance={film.appearance} data-km-film={film.id} data-km-film-scene={state.shotId} data-km-film-transition={state.transition?.kind ?? ""}
    style={{ position: "relative", width: film.width, height: film.height, overflow: "hidden", background: "var(--km-surface-canvas, #102133)", ...film.appearance === "light" ? LIGHT_SHOT : undefined, ...filmType, ...style }}>
    {state.layers.map(layer => {
      const index = film.scenes.findIndex(item => item.id === layer.sceneId), scene = film.scenes[index];
      const look = scene.look && (reduce ? stillLook(scene.look) : scene.look);
      // Under a held-frame cadence the scene shows its held frame; grain, weave and flicker still change every frame.
      const held = look ? cadenceFrame(look, layer.localFrame) : layer.localFrame;
      // A speed ramp maps the scene's frame to its content's; reduced motion plays the content at an even speed.
      const local = scene.speed ? speedSource(scene.speed, held, reduce) : held;
      const contentFrames = scene.contentFrames ?? (scene.speed ? Math.round(scene.speed.map[scene.speed.map.length - 1]) : scene.endFrame - scene.startFrame);
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
      const incoming = state.transition !== undefined && layer.sceneId === state.transition.toShotId;
      const { a, b, c, d, e, f } = (match && matchMatrix(match, incoming, state.transition!.progress)) || (container && incoming && grow?.matrix)
        || (pass && { ...layer.matrix, e: layer.matrix.e + (incoming ? pass.incoming : pass.outgoing) }) || layer.matrix;
      const clip = layer.mask?.rect;
      // In a container transform the outgoing scene stays whole under a deepening scrim; until the tile is measured, the incoming waits.
      // In a pass-by both scenes are whole, and the foreground's centre is the seam.
      const opacity = container ? (incoming ? grow?.incoming ?? 0 : 1) : pass ? 1 : layer.opacity;
      const node = <div key={layer.sceneId} data-km-film-layer={layer.sceneId} style={{ ...LAYER, opacity,
        transform: `matrix(${a},${b},${c},${d},${e},${f})`, transformOrigin: "0 0",
        clipPath: container && incoming && grow ? grow.clip : pass && incoming ? pass.clip : clip ? `inset(${clip.y}px ${film.width - clip.x - clip.width}px ${film.height - clip.y - clip.height}px ${clip.x}px)` : undefined,
        // CSS blur has no direction. A whip lasts a few frames, so the larger axis is enough.
        filter: layer.blur ? `blur(${Math.max(layer.blur.x, layer.blur.y)}px)` : undefined }}>
        <div style={{ ...LAYER, transform: drifts ? `scale(${1 + film.drift * layer.localFrame / (scene.endFrame - scene.startFrame)})` : undefined }}>
          {look ? <FilmLookLayer look={look} frame={layer.localFrame} fps={fpsValue} width={film.width} height={film.height} seed={index + 1}
            turnFrame={scene.turnFrame !== undefined ? scene.turnFrame - scene.startFrame : undefined}>{content}</FilmLookLayer> : content}
        </div>
      </div>;
      if (!(container && incoming && grow)) return node;
      const dark = film.appearance === "dark", unit = Math.min(film.width, film.height) / 100, lift = Math.sin(Math.PI * Math.min(1, grow.e * 1.2));
      return <Fragment key={layer.sceneId}>
        <div aria-hidden="true" data-km-film-scrim="" style={{ ...LAYER, background: dark ? "#05080d" : "#1a2230", opacity: (dark ? .55 : .3) * grow.e }} />
        {/* The surface: the tile lifts, then grows to the frame carrying the incoming scene; its corners square off as it fills. */}
        <div aria-hidden="true" data-km-film-container={container.subject} style={{ position: "absolute", left: grow.box.x, top: grow.box.y, width: grow.box.width, height: grow.box.height,
          borderRadius: grow.r, opacity: grow.surface, background: container.color ?? (dark ? "#1b2533" : "#ffffff"),
          boxShadow: `0 ${unit * (.4 + 1.4 * lift)}px ${unit * (1.2 + 5 * lift)}px rgba(0,0,0,${(dark ? .45 : .2) * grow.surface})` }} />
        {node}
      </Fragment>;
    })}
    {pass && <PassByForeground spec={passBySpec!} centre={pass.centre} w={pass.w} speed={pass.speed} width={film.width} height={film.height} />}
    {crossing && renderFx!(crossing.fx, { frame: state.frame - crossing.startFrame, hostDurationFrames: crossing.endFrame - crossing.startFrame, fps: film.fps, reducedMotion: reduce })}
    {showBug && <BrandBug brand={film.brand!} width={film.width} height={film.height} safeInset={film.safeInset} />}
    {film.captions && <CaptionPerformer track={film.captions} frame={state.frame} reducedMotion={reduce} style={LAYER} />}
  </div>;
});
