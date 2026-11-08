/** Captured places: Gaussian-splat captures of real locations inside a `FiberStage`, rendered by Spark (MIT), exact frame by frame.
 *
 * A splat capture is a real place reconstructed from photographs, so it looks like the place, not a model of it. Spark sorts the
 * splats by depth in workers, asynchronously, so a frame drawn straight after a camera move may use the previous camera's order. Each
 * frame therefore holds the stage (`useStageHold`) until the capture has loaded and Spark has gone quiet: no `onDirty` for three
 * animation frames in a row. Only then does the stage draw once more and mark the frame drawn, so an export captures the sorted
 * picture for that camera, whatever order frames are visited in. Any later `onDirty` (a sort that lands after the frame was drawn)
 * starts the same cycle again, so the stage never rests on a stale picture; settling never starts before the capture has loaded,
 * because Spark is silent until there are splats to sort.
 */
import { useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { Color, Vector3 } from "three";
import type { PerspectiveCamera } from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import type { RationalFps } from "../motion/types";
import { FiberStage, useStageHold } from "./fiber-stage";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioTone } from "./studio-recipes-react";
import { easeInOut, mix3, span01 } from "./studio-shots";
import type { CapturedPlaceSpec } from "./place-shots";

export { inspectCapturedPlace } from "./place-shots";
export type { CapturedPlaceProblem, CapturedPlaceSpec } from "./place-shots";

function SplatScene({ src, spec, frame }: { src: string; spec: CapturedPlaceSpec; frame: number }) {
  const gl = useThree(state => state.gl), scene = useThree(state => state.scene), camera = useThree(state => state.camera) as PerspectiveCamera, size = useThree(state => state.size);
  const hold = useStageHold(), dirty = useRef(false), settling = useRef(false), loaded = useRef<Promise<unknown> | null>(null);
  // One settle cycle: hold the frame, wait for the load, then for three quiet animation frames, then release (which redraws).
  const settle = useRef(() => {});
  settle.current = () => {
    if (settling.current) return;
    settling.current = true;
    const release = hold("sorting splats");
    let quiet = 0;
    const watch = () => {
      if (!settling.current) return;
      if (dirty.current) { dirty.current = false; quiet = 0; } else quiet++;
      if (quiet >= 3) { settling.current = false; release(); return; }
      requestAnimationFrame(watch);
    };
    (loaded.current ?? Promise.resolve()).then(() => requestAnimationFrame(watch), () => requestAnimationFrame(watch));
  };
  const built = useMemo(() => {
    const spark = new SparkRenderer({ renderer: gl, onDirty: () => { dirty.current = true; settle.current(); } });
    const mesh = new SplatMesh({ url: src });
    const [rx, ry, rz] = spec.rotation ?? [0, 0, 0];
    mesh.rotation.set(rx * Math.PI / 180, ry * Math.PI / 180, rz * Math.PI / 180);
    mesh.scale.setScalar(spec.scale ?? 1);
    return { spark, mesh };
  }, [gl, src, spec.rotation, spec.scale]);
  useLayoutEffect(() => {
    const prior = scene.background;
    scene.add(built.spark); scene.add(built.mesh); scene.background = new Color(spec.background ?? "#c9d6e2");
    // The first frames wait for the capture itself.
    const release = hold("loading splat capture");
    let alive = true;
    loaded.current = built.mesh.initialized;
    built.mesh.initialized.then(() => { if (alive) { release(); settle.current(); } }, (error: unknown) => { console.error("splat capture failed to load", error); if (alive) release(); });
    return () => { alive = false; settling.current = false; release(); scene.remove(built.spark); scene.remove(built.mesh); scene.background = prior; built.mesh.dispose(); built.spark.dispose(); };
  }, [built, scene, hold, spec.background]);
  // Camera for this frame, then a hold until Spark has stopped re-sorting for it.
  useLayoutEffect(() => {
    const t = easeInOut(span01(frame, 0, spec.durationFrames));
    const position = mix3(spec.from.position, spec.to.position, t), target = mix3(spec.from.target, spec.to.target, t);
    camera.position.set(...position); camera.lookAt(new Vector3(...target));
    camera.fov = spec.fov ?? 40; camera.aspect = size.width / Math.max(1, size.height); camera.near = .05; camera.far = 2000; camera.updateProjectionMatrix();
    dirty.current = true;
    settle.current();
  }, [frame, spec, camera, size]);
  return null;
}

export interface CapturedPlaceProps {
  frame: number;
  fps: RationalFps;
  /** A splat capture: PLY, SPZ, SPLAT or KSPLAT. */
  src: string;
  spec: CapturedPlaceSpec;
  tone?: StudioTone;
  label?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
/** A slow forward move through a real place, captured as Gaussian splats, with the licence credit on screen. */
export function CapturedPlace({ frame, fps, src, spec, tone, label, style, children }: CapturedPlaceProps) {
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...style }}>
    <FiberStage frame={frame} fps={fps} label={label ?? "A real place, captured from photographs as Gaussian splats"} style={{ position: "absolute", inset: 0 }}>
      <SplatScene src={src} spec={spec} frame={frame} />
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {children}
      <StudioCaption beat={spec.title} frame={frame} tone={tone} />
      {spec.credit && <div style={{ position: "absolute", right: "2.5%", bottom: "3%", maxWidth: "40%", textAlign: "right", font: "500 1.6cqh/1.3 var(--km-font-body, system-ui, sans-serif)", color: "rgba(255,255,255,.82)", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>{spec.credit}</div>}
    </div>
  </div>;
}
