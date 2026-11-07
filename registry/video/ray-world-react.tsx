import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { RationalFps } from "../motion/types";
import type { ImageAsset } from "./scene-templates";
import { createRayRenderer, rayWorldTime } from "./ray-world";
import type { RayRenderer, RayWorld } from "./ray-world";

export interface RayWorldStageProps extends ComponentPropsWithoutRef<"div"> {
  world: RayWorld;
  frame: number;
  fps: RationalFps;
  /** The pictures the world asks for in `imageSlots`, in order, each with a rights reference. */
  images?: readonly ImageAsset[];
  /** Pixel size of the render. Worlds are composed for 16:9. */
  width?: number;
  height?: number;
  /** Fewer samples draw faster, with noisier blur. Use the world's default for a finished frame. */
  samples?: number;
  reducedMotion?: boolean;
  /** What a viewer sees if the world cannot draw. Omit it, and an export stops. */
  fallback?: ReactNode;
  /** A text alternative for the picture. */
  label?: string;
}
const NONE: readonly ImageAsset[] = [];
/** One frame of a ray-traced world. It shares the shader-effect status attributes, so `VideoExportStage` waits for each drawn frame. */
export const RayWorldStage = forwardRef<HTMLDivElement, RayWorldStageProps>(function RayWorldStage({ world, frame, fps, images = NONE, width = 960, height = 540, samples, reducedMotion = false, fallback, label, style, ...props }, ref) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), renderer = useRef<RayRenderer | undefined>(undefined), loaded = useRef(false);
  useImperativeHandle(ref, () => host.current!, []);
  const [generation, setGeneration] = useState(0), [failed, setFailed] = useState<string>();
  const time = rayWorldTime(world, frame, fps, reducedMotion), now = useRef({ time, frame });
  now.current = { time, frame };
  const draw = useRef(() => {});
  draw.current = () => {
    const target = host.current;
    if (!target || !renderer.current || !loaded.current) return;
    renderer.current.draw(now.current.time, now.current.frame);
    target.dataset.kmShaderFxStatus = "ready";
    target.dataset.kmShaderFxDrawn = String(now.current.frame);
  };
  const signature = images.map(image => image.src).join("|") + `|${width}x${height}|${samples ?? ""}`;
  useEffect(() => {
    const target = host.current!, surface = canvas.current!;
    let cancelled = false, made: RayRenderer | undefined;
    const lost = (event: Event) => { event.preventDefault(); target.dataset.kmShaderFxStatus = "pending"; };
    const restored = () => setGeneration(value => value + 1);
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restored);
    target.dataset.kmShaderFxStatus = "pending";
    setFailed(undefined);
    const stop = (error: unknown) => {
      if (cancelled) return;
      target.dataset.kmShaderFxStatus = "error";
      setFailed(error instanceof Error ? error.message : String(error));
    };
    try {
      made = createRayRenderer(surface, world, images, { fps, samples });
      renderer.current = made;
      made.ready.then(() => { if (!cancelled) { loaded.current = true; draw.current(); } }).catch(stop);
    } catch (error) { stop(error); }
    return () => {
      cancelled = true;
      loaded.current = false;
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restored);
      renderer.current = undefined;
      made?.dispose();
    };
  // Each generation has a new canvas, so a lost context never comes back half-built.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, signature, generation]);
  useLayoutEffect(() => draw.current(), [time, frame]);
  return <div {...props} ref={host} data-km-ray-world={world.id} data-km-shader-fx={world.id} data-km-shader-fx-id={world.id} data-km-shader-fx-frame={frame} data-km-shader-fx-status="pending"
    style={{ position: "relative", aspectRatio: `${width} / ${height}`, overflow: "hidden", background: "#0a0d12", ...style }}>
    <canvas key={generation + signature + world.id} ref={canvas} width={width} height={height} role="img" aria-label={label ?? world.title} style={{ display: "block", width: "100%", height: "100%" }} />
    {failed && (fallback ?? <span role="alert" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "#fff", background: "#7a1f1f" }}>This world could not draw: {failed}</span>)}
  </div>;
});
