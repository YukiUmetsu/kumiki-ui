/** Draw a shader effect at an absolute frame. This is the only module that touches WebGL and Paper Shaders.
 * The mount runs at speed 0, so nothing advances on its own: each frame is set explicitly and drawn at once.
 * Status is written to the DOM with no React state, so `VideoExportStage` can wait for the exact frame.
 */
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import {
  defaultObjectSizing, getShaderColorFromString, getShaderNoiseTexture, godRaysFragmentShader, grainGradientFragmentShader, GrainGradientShapes,
  halftoneDotsFragmentShader, HalftoneDotsGrids, HalftoneDotsTypes, liquidMetalFragmentShader, LiquidMetalShapes, meshGradientFragmentShader,
  ShaderFitOptions, ShaderMount, toProcessedLiquidMetal, waterFragmentShader,
} from "@paper-design/shaders";
import type { ShaderMountUniforms } from "@paper-design/shaders";
import type { RationalFps } from "../motion/types";
import { resolveShaderFxParams, shaderFxEnvelope, shaderFxTimeMs } from "./shader-fx";
import type { ShaderFxEffect, ShaderFxSpec } from "./shader-fx";

export interface ShaderFxLayerProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: ShaderFxSpec;
  /** Frame in the host's time. The layer owns no clock. */
  frame: number;
  fps: RationalFps;
  /** Frames in the host, for `durationFrames` and fades. */
  hostDurationFrames: number;
  /** Holds the first frame, with no fade. */
  reducedMotion?: boolean;
  /** Shown only if the caller supplies it and WebGL fails. Without it, the failure is visible and an export stops. */
  fallback?: ReactNode;
}

type Params = ReturnType<typeof resolveShaderFxParams>;
const SIZING = (fit: keyof typeof ShaderFitOptions, overrides: Partial<typeof defaultObjectSizing> = {}) => {
  const s = { ...defaultObjectSizing, ...overrides };
  return { u_fit: ShaderFitOptions[fit], u_rotation: s.rotation, u_scale: s.scale, u_offsetX: s.offsetX, u_offsetY: s.offsetY, u_originX: s.originX, u_originY: s.originY, u_worldWidth: s.worldWidth, u_worldHeight: s.worldHeight };
};
const SOURCES: Readonly<Record<ShaderFxEffect, string>> = { "mesh-gradient": meshGradientFragmentShader, "liquid-metal": liquidMetalFragmentShader, "god-rays": godRaysFragmentShader,
  "grain-gradient": grainGradientFragmentShader, water: waterFragmentShader, "halftone-dots": halftoneDotsFragmentShader };

const loaded = (image: HTMLImageElement) => image.decode().then(() => image);
/** Longest side of a rasterized vector source. */
const SVG_TEXTURE_PX = 2048;
async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await loaded(image);
  if (!/(\.svg([?#]|$)|^data:image\/svg)/i.test(src)) return image;
  // WebGL refuses an SVG image as a texture source (INVALID_VALUE), and the shader would stay blank with no error.
  const scale = SVG_TEXTURE_PX / Math.max(image.naturalWidth, image.naturalHeight), canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return loadImage(canvas.toDataURL("image/png"));
}
/** Solving a silhouette takes real time and its result depends only on the source, so each one runs once. */
const silhouettes = new Map<string, Promise<HTMLImageElement>>();
function liquidMetalImage(src: string): Promise<HTMLImageElement> {
  let found = silhouettes.get(src);
  if (!found) {
    found = toProcessedLiquidMetal(src).then(({ pngBlob }) => loadImage(URL.createObjectURL(pngBlob)));
    silhouettes.set(src, found);
  }
  return found;
}
/** A design token resolves against the host element, so a theme change restyles the effect. */
function colorOf(value: unknown, host: Element) {
  const text = String(value), token = text.startsWith("--") ? getComputedStyle(host).getPropertyValue(text).trim() : text;
  return getShaderColorFromString(token || "#000000");
}
/** Uniforms for one spec, with every image decoded: Paper Shaders refuses an image that is still loading. */
async function buildUniforms(spec: ShaderFxSpec, p: Params, host: Element): Promise<ShaderMountUniforms> {
  const color = (value: unknown) => colorOf(value, host), colors = (p.colors as readonly string[] | undefined)?.map(color) ?? [];
  const noise = async () => loaded(getShaderNoiseTexture()!);
  switch (spec.effect) {
    case "mesh-gradient": return { u_colors: colors, u_colorsCount: colors.length, u_distortion: p.distortion as number, u_swirl: p.swirl as number, u_grainMixer: 0, u_grainOverlay: p.grain as number, ...SIZING("contain") };
    case "liquid-metal": return { u_colorBack: color(p.back), u_colorTint: color(p.tint), u_image: spec.image ? await liquidMetalImage(spec.image.src) : undefined, u_contour: p.contour as number, u_distortion: p.distortion as number,
      u_softness: p.softness as number, u_repetition: p.repetition as number, u_shiftRed: .3, u_shiftBlue: .3, u_angle: p.angle as number, u_isImage: Boolean(spec.image),
      u_shape: LiquidMetalShapes[p.shape as keyof typeof LiquidMetalShapes], ...SIZING("contain", { scale: p.scale as number }) };
    case "god-rays": return { u_colorBloom: color(p.bloomColor), u_colorBack: color(p.back), u_colors: colors, u_colorsCount: colors.length, u_density: p.density as number, u_spotty: p.spotty as number,
      u_midIntensity: p.midIntensity as number, u_midSize: p.midSize as number, u_intensity: p.intensity as number, u_bloom: p.bloom as number, u_noiseTexture: await noise(), ...SIZING("contain", { offsetY: p.originY as number }) };
    case "grain-gradient": return { u_colorBack: color(p.back), u_colors: colors, u_colorsCount: colors.length, u_softness: p.softness as number, u_intensity: p.intensity as number, u_noise: p.noise as number,
      u_shape: GrainGradientShapes[p.shape as keyof typeof GrainGradientShapes], u_noiseTexture: await noise(), ...SIZING("contain") };
    case "water": return { u_image: await loadImage(spec.image.src), u_colorBack: color("#90909000"), u_colorHighlight: color("#ffffff"), u_highlights: p.highlights as number, u_layering: p.layering as number, u_waves: p.waves as number,
      u_edges: p.edges as number, u_caustic: p.caustic as number, u_size: p.size as number, ...SIZING("cover", { scale: 1 }) };
    case "halftone-dots": return { u_image: await loadImage(spec.image.src), u_colorFront: color(p.front), u_colorBack: color(p.back), u_size: p.size as number, u_radius: p.radius as number, u_contrast: p.contrast as number,
      u_originalColors: p.originalColors as boolean, u_inverted: false, u_grainMixer: 0, u_grainOverlay: 0, u_grainSize: .5, u_grid: HalftoneDotsGrids[p.grid as keyof typeof HalftoneDotsGrids],
      u_type: HalftoneDotsTypes[p.type as keyof typeof HalftoneDotsTypes], ...SIZING("cover") };
  }
}

const HOST: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };
/** One effect at one frame. A context exists only while the effect is active, and it is released on unmount. */
export const ShaderFxLayer = forwardRef<HTMLDivElement, ShaderFxLayerProps>(function ShaderFxLayer({ spec, frame, fps, hostDurationFrames, reducedMotion = false, fallback, style, ...props }, ref) {
  const host = useRef<HTMLDivElement>(null), mount = useRef<ShaderMount | undefined>(undefined);
  useImperativeHandle(ref, () => host.current!, []);
  const [generation, setGeneration] = useState(0), [failed, setFailed] = useState<string>();
  const { active, opacity } = shaderFxEnvelope(spec, frame, hostDurationFrames, reducedMotion);
  const timeMs = shaderFxTimeMs(spec, frame, fps, reducedMotion), signature = JSON.stringify(spec);
  /** Set the clock, and record the frame only once a sized canvas has drawn it. */
  const draw = useRef(() => {});
  draw.current = () => {
    const target = host.current, current = mount.current;
    if (!target || !current) return;
    const canvas = current.canvasElement as HTMLCanvasElement;
    if (canvas.width < 2 || !canvas.clientWidth) { requestAnimationFrame(() => draw.current()); return; }
    current.setFrame(timeMs);
    target.dataset.kmShaderFxStatus = "ready";
    target.dataset.kmShaderFxDrawn = String(frame);
  };
  useEffect(() => {
    if (!active) return;
    const target = host.current!;
    let cancelled = false, canvas: HTMLCanvasElement | undefined;
    const lost = (event: Event) => { event.preventDefault(); target.dataset.kmShaderFxStatus = "pending"; };
    const restored = () => setGeneration(value => value + 1);
    target.dataset.kmShaderFxStatus = "pending";
    buildUniforms(spec, resolveShaderFxParams(spec), target).then(uniforms => {
      if (cancelled) return;
      // preserveDrawingBuffer lets a capture read the frame after the browser presents it.
      mount.current = new ShaderMount(target, SOURCES[spec.effect], uniforms, { preserveDrawingBuffer: true }, 0, timeMs, 1);
      canvas = mount.current.canvasElement as HTMLCanvasElement;
      canvas.addEventListener("webglcontextlost", lost);
      canvas.addEventListener("webglcontextrestored", restored);
      draw.current();
    }).catch((error: unknown) => {
      if (cancelled) return;
      target.dataset.kmShaderFxStatus = "error";
      setFailed(error instanceof Error ? error.message : String(error));
    });
    return () => {
      cancelled = true;
      canvas?.removeEventListener("webglcontextlost", lost);
      canvas?.removeEventListener("webglcontextrestored", restored);
      mount.current?.dispose();
      canvas?.remove();
      mount.current = undefined;
    };
  // The spec is compared by value: a new object with equal content keeps its context.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, active, generation]);
  useLayoutEffect(() => { if (active) draw.current(); }, [active, frame, timeMs]);
  const box = spec.layer === "overlay" ? spec.region : undefined;
  return <div {...props} ref={host} data-km-shader-fx={spec.effect} data-km-shader-fx-id={spec.id} data-km-shader-fx-frame={active ? frame : undefined} data-km-shader-fx-status={active ? "pending" : "idle"}
    style={{ ...HOST, ...(box ? { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, inset: undefined } : {}), opacity, ...style }}>
    {failed && (fallback ?? <span role="alert" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", background: "#7a1f1f" }}>Shader effect "{spec.id}" failed: {failed}</span>)}
  </div>;
});
