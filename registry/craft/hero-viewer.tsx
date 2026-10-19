/** Frame-addressable studio viewer for crafted hero assets.
 *
 * Renders a {@link HeroAsset} inside {@link createHeroStudio} with an orbit
 * camera auto-fitted to the asset's authored bounds. Every view parameter is a
 * plain prop, so a turntable or push-in is just `azimuth={f(frame)}` driven by
 * the caller's absolute frame clock. Renders only when props change.
 */
import { forwardRef, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { ACESFilmicToneMapping, PCFShadowMap, PerspectiveCamera, SRGBColorSpace, Scene, WebGLRenderer } from "three";
import type { HeroAsset } from "./hero-asset";
import { createHeroStudio } from "./hero-studio";
import type { HeroStudio, HeroStudioOptions } from "./hero-studio";

export interface HeroView {
  /** Degrees around the subject; 0 = front (+Z), 90 = from +X. */
  azimuth?: number;
  /** Degrees above the horizon. */
  elevation?: number;
  /** 1 = whole asset fills the frame; 2 = twice as close. */
  zoom?: number;
  /** World-space look-at point; defaults to the bounds center. */
  target?: readonly [number, number, number];
  /** Vertical field of view in degrees (lower = more telephoto, product look). */
  fov?: number;
}

export interface HeroAssetViewerProps extends Omit<ComponentPropsWithoutRef<"div">, "children">, HeroView {
  /** Memoize: a new identity rebuilds and disposes the asset. */
  createAsset: () => HeroAsset;
  width: number;
  height: number;
  studio?: Partial<Omit<HeroStudioOptions, "bounds">>;
  /** Overrides the asset's recommended exposure. */
  exposure?: number;
  /** Action id from `asset.actions` (null/undefined = rest pose). */
  action?: string | null;
  /** Frames since the action started, on the caller's absolute clock. */
  actionFrame?: number;
  fps?: number;
  pixelRatio?: number;
  ariaLabel?: string;
}

/** Camera pose that keeps the asset's bounding sphere inside the frustum. */
export function fitHeroCamera(asset: Pick<HeroAsset, "bounds">, view: HeroView, aspect: number) {
  const { min, max } = asset.bounds;
  const center = view.target ?? [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
  const fov = view.fov ?? 28;
  const vertical = Math.tan(fov * Math.PI / 360), horizontal = vertical * aspect;
  const distance = radius / Math.min(vertical, horizontal) * 1.06 / (view.zoom ?? 1);
  const az = (view.azimuth ?? 28) * Math.PI / 180, el = (view.elevation ?? 14) * Math.PI / 180;
  return {
    fov, target: center,
    position: [center[0] + Math.sin(az) * Math.cos(el) * distance, center[1] + Math.sin(el) * distance,
      center[2] + Math.cos(az) * Math.cos(el) * distance] as const,
    near: Math.max(.01, distance - radius * 3), far: distance + radius * 400,
  };
}

export const HeroAssetViewer = forwardRef<HTMLDivElement, HeroAssetViewerProps>(function HeroAssetViewer({
  createAsset, width, height, studio, exposure, action, actionFrame = 0, fps = 30, pixelRatio = 1.5, ariaLabel,
  azimuth, elevation, zoom, target, fov, style, ...props
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<{ renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera; asset: HeroAsset; studio: HeroStudio } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState(ariaLabel ?? "3D asset");
  const studioKey = JSON.stringify(studio ?? {});

  const draw = () => {
    const current = runtime.current;
    if (!current) return;
    const { renderer, scene, camera, asset } = current;
    asset.pose?.({ id: action ?? null, frame: actionFrame, fps });
    const ratio = Math.min(2, pixelRatio);
    if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    renderer.toneMappingExposure = exposure ?? asset.exposure ?? 1;
    const pose = fitHeroCamera(asset, { azimuth, elevation, zoom, target, fov }, width / height);
    camera.fov = pose.fov; camera.aspect = width / height; camera.near = pose.near; camera.far = pose.far;
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer | undefined, asset: HeroAsset | undefined, heroStudio: HeroStudio | undefined;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFShadowMap;
      asset = createAsset();
      heroStudio = createHeroStudio({ bounds: asset.bounds, ...asset.studio, ...studio });
      const scene = new Scene();
      heroStudio.apply(scene);
      scene.add(asset.group);
      runtime.current = { renderer, scene, camera: new PerspectiveCamera(), asset, studio: heroStudio };
      setLabel(ariaLabel ?? asset.id);
      setError(null);
      draw();
      canvas.dataset.kmHeroReady = "true";
    } catch (cause) {
      setError(`3D asset could not render: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    return () => {
      delete canvas.dataset.kmHeroReady;
      runtime.current = null;
      try { asset?.dispose(); heroStudio?.dispose(); } finally { renderer?.dispose(); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- studioKey captures studio content.
  }, [createAsset, studioKey]);

  // Redraw after every render: view props are plain numbers and drawing is cheap
  // (no state change on success), so a dependency list would only add staleness risk.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    try { draw(); } catch (cause) { setError(`3D frame failed: ${cause instanceof Error ? cause.message : String(cause)}`); }
  });

  return (
    <div ref={ref} data-km-hero-viewer="" style={{ position: "relative", width: "100%", aspectRatio: `${width}/${height}`, ...style }} {...props}>
      <canvas ref={canvasRef} role="img" aria-label={label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      {error ? <p role="alert" style={{ position: "absolute", inset: 0, margin: 0, display: "grid", placeContent: "center", padding: 24, background: "#111", color: "#eee" }}>{error}</p> : null}
    </div>
  );
});
