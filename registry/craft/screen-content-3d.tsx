import { forwardRef, useEffect, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PerspectiveCamera } from "three";
import type { HeroAsset } from "./hero-asset";
import type { HeroActionState } from "./hero-action";
import { HeroAssetViewer, fitHeroCamera } from "./hero-viewer";
import type { HeroAssetViewerProps, HeroView } from "./hero-viewer";
import { bindScreenSurface } from "./screen-surface";
import type { ScreenProjection, ScreenSurfaceDiagnostic, ScreenSurfaceHandle, ScreenSurfaceOptions } from "./screen-surface";

export interface ScreenOverlayState {
  /** Where the display's corners are in this viewport right now, in CSS px. */
  projection: ScreenProjection;
  /** The frame the screen was painted for. */
  frame: number;
  width: number;
  height: number;
}

export interface ScreenContent3DProps extends Omit<HeroAssetViewerProps, "onPose" | "onAsset" | "camera"> {
  /**
   * What the display shows (see `bindScreenSurface`). Memoize it like `createAsset`: a new identity rebinds
   * the screen. `onReady` is supplied by the recipe, so an image that loads later repaints automatically.
   */
  screen: Omit<ScreenSurfaceOptions, "onReady">;
  /** Screen-space annotations (callouts, labels) anchored to the display, re-projected on every draw. */
  overlay?: (state: ScreenOverlayState) => ReactNode;
  /** Binding, readability, facing and framing problems for the current view. Called only when they change. */
  onDiagnostics?: (diagnostics: ScreenSurfaceDiagnostic[]) => void;
}

/** The camera HeroAssetViewer builds for an orbit view, so overlays and readability use the drawn pose. */
function viewCamera(asset: HeroAsset, view: HeroView, width: number, height: number) {
  const pose = fitHeroCamera(asset, view, width / height);
  const camera = new PerspectiveCamera(pose.fov, width / height, pose.near, pose.far);
  camera.position.set(...pose.position);
  camera.lookAt(...pose.target);
  camera.updateMatrixWorld();
  return camera;
}

/**
 * A frame-addressable 3D device whose display shows real content. The screen repaints inside the viewer's
 * own draw (through `onPose`), so the pixels always match the pose and frame drawn beside them. The content
 * frame is the viewer's `actionFrame`.
 */
export const ScreenContent3D = forwardRef<HTMLDivElement, ScreenContent3DProps>(function ScreenContent3D({
  screen, overlay, onDiagnostics, width, height, azimuth, elevation, zoom, target, fov, style, ...viewer
}, ref) {
  const surfaces = useRef(new Map<HeroAsset, { surface: ScreenSurfaceHandle; screen: ScreenContent3DProps["screen"] }>());
  const [, repaint] = useReducer((n: number) => n + 1, 0);
  const [overlayState, setOverlayState] = useState<ScreenOverlayState | null>(null);
  const overlayKey = useRef(""), reported = useRef("");
  const view = { azimuth, elevation, zoom, target, fov };

  useEffect(() => () => {
    for (const entry of surfaces.current.values()) entry.surface.dispose();
    surfaces.current.clear();
  }, []);

  const onPose = (asset: HeroAsset, state: HeroActionState) => {
    asset.pose?.(state);
    // The viewer draws one asset at a time: release bindings for any asset it has replaced.
    for (const [built, previous] of surfaces.current) if (built !== asset) { previous.surface.dispose(); surfaces.current.delete(built); }
    let entry = surfaces.current.get(asset);
    if (!entry || entry.screen !== screen) {
      entry?.surface.dispose();
      entry = { surface: bindScreenSurface(asset, { ...screen, onReady: repaint }), screen };
      surfaces.current.set(asset, entry);
    }
    const { surface } = entry;
    surface.paintAt(state.frame);
    if (!overlay && !onDiagnostics) return;
    const camera = viewCamera(asset, view, width, height);
    if (overlay) {
      const projection = surface.project(camera, width, height);
      if (projection) {
        const key = JSON.stringify([projection, state.frame, width, height]);
        if (key !== overlayKey.current) {
          overlayKey.current = key;
          setOverlayState({ projection, frame: state.frame, width, height });
        }
      }
    }
    if (onDiagnostics) {
      const diagnostics = surface.diagnostics(camera, width, height);
      const signature = JSON.stringify(diagnostics);
      if (signature !== reported.current) {
        reported.current = signature;
        onDiagnostics(diagnostics);
      }
    }
  };

  return <div ref={ref} data-km-screen-content3d="" style={{ position: "relative", width, height, ...style }}>
    <HeroAssetViewer {...viewer} width={width} height={height} azimuth={azimuth} elevation={elevation} zoom={zoom} target={target} fov={fov} onPose={onPose} />
    {overlay && overlayState ? <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, width, height, pointerEvents: "none" }}>{overlay(overlayState)}</svg> : null}
  </div>;
});
