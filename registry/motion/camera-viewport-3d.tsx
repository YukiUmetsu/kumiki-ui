import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ACESFilmicToneMapping, PerspectiveCamera, SRGBColorSpace, WebGLRenderer } from "three";
import type { Scene } from "three";
import type { MotionTimeline } from "./types";
import { evaluateCameraRig3D } from "./camera-rig-3d";
import { usePrefersReducedMotion } from "./react";

export interface CameraScene3D {
  scene: Scene;
  /** Set object poses from absolute frames, never delta time. */
  updateFrame?: (frame: number) => void;
  /** Called after transforms/camera matrices are current, including on resize. */
  afterRender?: (context: { camera: PerspectiveCamera; frame: number; width: number; height: number }) => void;
  /** Consumer owns geometries, materials and textures; release them here. */
  dispose: () => void;
}

export interface CameraViewport3DProps extends ComponentPropsWithoutRef<"div"> {
  timeline: MotionTimeline;
  frame: number;
  cameraId?: string;
  /** Memoize this factory; a new identity replaces and disposes the scene. */
  createScene: () => CameraScene3D;
  width: number;
  height: number;
  near?: number;
  far?: number;
  exposure?: number;
  pixelRatio?: number;
  ariaLabel?: string;
  reducedMotion?: boolean;
  overlay?: ReactNode;
  /** Redraw changed scene inputs while paused, without replacing its resources. */
  sceneRevision?: unknown;
}

/** Optional Three.js boundary. Rendering occurs only on frame/size changes. */
export const CameraViewport3D = forwardRef<HTMLDivElement, CameraViewport3DProps>(function CameraViewport3D({
  timeline, frame, cameraId = "camera3d", createScene, width, height, near = 0.05, far = 200,
  exposure = 1, pixelRatio = 1.5, ariaLabel = "3D camera scene", reducedMotion, overlay, sceneRevision, children, style, ...props
}, ref) {
  const prefersReduced = usePrefersReducedMotion();
  const resolvedFrame = (reducedMotion ?? prefersReduced) ? timeline.durationFrames - 1 : frame;
  const pose = useMemo(() => evaluateCameraRig3D(timeline, resolvedFrame, cameraId), [timeline, resolvedFrame, cameraId]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<{ renderer: WebGLRenderer; camera: PerspectiveCamera; content: CameraScene3D } | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (![width, height, near, far, exposure, pixelRatio].every(Number.isFinite) || width <= 0 || height <= 0 || near <= 0 || far <= near || exposure <= 0 || pixelRatio <= 0) {
    throw new Error("Invalid 3D viewport. Use positive finite dimensions, exposure and pixel ratio, with 0 < near < far.");
  }

  drawRef.current = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const { renderer, camera, content } = runtime;
    const canvas = renderer.domElement;
    const renderWidth = Math.max(1, canvas.clientWidth);
    const renderHeight = Math.max(1, canvas.clientHeight);
    const resolution = Math.min(2, pixelRatio);
    if (renderer.getPixelRatio() !== resolution) renderer.setPixelRatio(resolution);
    if (canvas.width !== Math.floor(renderWidth * resolution) || canvas.height !== Math.floor(renderHeight * resolution)) {
      renderer.setSize(renderWidth, renderHeight, false);
    }
    renderer.toneMappingExposure = exposure;
    camera.aspect = width / height;
    // Preserve horizontal subject coverage when switching to portrait output.
    camera.fov = 2 * Math.atan(Math.tan(pose.fov * Math.PI / 360) / Math.min(1, camera.aspect)) * 180 / Math.PI;
    camera.near = near;
    camera.far = far;
    camera.position.set(...pose.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(...pose.target);
    camera.rotateZ(pose.roll * Math.PI / 180);
    camera.updateProjectionMatrix();
    content.updateFrame?.(resolvedFrame);
    renderer.render(content.scene, camera);
    content.afterRender?.({ camera, frame: resolvedFrame, width, height });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer | undefined;
    let content: CameraScene3D | undefined;
    const draw = () => {
      try { drawRef.current(); }
      catch (cause) { setError(`3D preview could not render: ${cause instanceof Error ? cause.message : String(cause)}. Check the scene's frame updater and retry.`); }
    };
    const lost = (event: Event) => {
      event.preventDefault();
      setError("The graphics context was lost. Retry the preview or close other GPU-heavy tabs.");
    };
    const restored = () => { setError(null); draw(); };
    const observer = new ResizeObserver(draw);
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      content = createScene();
      runtimeRef.current = { renderer, camera: new PerspectiveCamera(), content };
      setError(null);
      canvas.addEventListener("webglcontextlost", lost);
      canvas.addEventListener("webglcontextrestored", restored);
      observer.observe(canvas);
      draw();
    } catch (cause) {
      setError(`3D preview unavailable: ${cause instanceof Error ? cause.message : String(cause)}. Enable WebGL2/hardware acceleration and retry.`);
    }
    return () => {
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      runtimeRef.current = null;
      try { content?.dispose(); } finally { renderer?.dispose(); }
    };
  }, [createScene, attempt]);

  useEffect(() => {
    try { drawRef.current(); }
    catch (cause) { setError(`3D frame failed: ${cause instanceof Error ? cause.message : String(cause)}. Check the camera and scene inputs.`); }
  }, [pose, resolvedFrame, width, height, near, far, exposure, pixelRatio, sceneRevision]);

  return (
    <div ref={ref} data-km-camera-viewport-3d="" data-camera-frame={resolvedFrame}
      style={{ position: "relative", width: "100%", aspectRatio: `${width}/${height}`, overflow: "hidden", ...style }} {...props}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%" }} />
      {overlay != null ? <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{overlay}</div> : null}
      {error ? <div role="alert" style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", gap: 12, padding: 24, background: "var(--km-surface-default, white)", color: "var(--km-text-primary, black)" }}>
        <p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry 3D preview</button>
      </div> : null}
      {children}
    </div>
  );
});
