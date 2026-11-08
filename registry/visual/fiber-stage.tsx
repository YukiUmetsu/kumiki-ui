/** `FiberStage` — a React Three Fiber canvas driven by a frame number, for video.
 *
 * The canvas never runs its own animation loop (`frameloop="never"`). Each change of `frame` renders exactly one picture, after
 * every child has applied that frame, so any frame in any seek order looks the same. The R3F clock is set to the frame's time in
 * seconds, so `useFrame` code also follows the host. Children read the frame with `useStageFrame`.
 *
 * Export contract: the root carries `data-km-fiber-frame` and, once the picture for that frame is drawn, `data-km-fiber-drawn`
 * with the same value. `VideoExportStage` waits for them to match. A failure sets `data-km-fiber-status="error"` and shows an
 * alert, so an export stops instead of capturing a blank canvas.
 */
import { Component, createContext, forwardRef, useContext, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, RefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { RationalFps } from "../motion/types";

export interface StageFrame { frame: number; fps: RationalFps; seconds: number }
const StageFrameContext = createContext<StageFrame>({ frame: 0, fps: { num: 30, den: 1 }, seconds: 0 });
/** The host frame, its rate and its time in seconds. Use this, not wall time, so a frame always looks the same. */
export const useStageFrame = () => useContext(StageFrameContext);

export interface FiberStageProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  frame: number;
  fps: RationalFps;
  children: ReactNode;
  /** Camera position, field of view in degrees, and the point it looks at. */
  camera?: { position?: readonly [number, number, number]; fov?: number; lookAt?: readonly [number, number, number]; near?: number; far?: number };
  /** A CSS colour behind the scene. Omit it for a transparent canvas that composites over the page. */
  background?: string;
  /** Pixel ratio. 1 keeps capture size equal to the output size. @default 1 */
  dpr?: number;
  /** Accessible description of the scene. */
  label?: string;
  /** Shown only if WebGL fails and the caller supplies it. Without it, the failure is visible and an export stops. */
  fallback?: ReactNode;
  /** Turn on shadow maps (filtered PCF), for scenes with shadow-casting lights such as `FiberHeroStudio`. @default false */
  shadows?: boolean;
}

/** Renders one picture whenever the frame changes. It sits after the children, so their layout effects have already applied the frame. */
function Driver({ frame, seconds, host, lookAt }: { frame: number; seconds: number; host: RefObject<HTMLDivElement | null>; lookAt?: readonly [number, number, number] }) {
  const advance = useThree(state => state.advance), camera = useThree(state => state.camera), gl = useThree(state => state.gl);
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => {
    const canvas = gl.domElement, root = host.current;
    const lost = (event: Event) => { event.preventDefault(); if (root) root.dataset.kmFiberStatus = "pending"; };
    const restored = () => setGeneration(value => value + 1);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => { canvas.removeEventListener("webglcontextlost", lost); canvas.removeEventListener("webglcontextrestored", restored); };
  }, [gl, host]);
  // Resizing a canvas clears it, and with no loop nothing would draw again until the frame changed. So the picture is drawn again
  // whenever the canvas size changes, and once more on the next animation frame, after the browser has settled the layout and any
  // child has rebuilt its objects. Only then is the frame marked drawn, so an export never captures a cleared canvas.
  const width = useThree(state => state.size.width), height = useThree(state => state.size.height);
  useLayoutEffect(() => {
    const draw = () => { if (lookAt) camera.lookAt(...lookAt); advance(seconds); };
    draw();
    const root = host.current;
    if (root) root.dataset.kmFiberStatus = "pending";
    const id = requestAnimationFrame(() => {
      draw();
      if (root) { root.dataset.kmFiberDrawn = String(frame); root.dataset.kmFiberStatus = "ready"; }
    });
    return () => cancelAnimationFrame(id);
  }, [frame, seconds, advance, camera, host, lookAt, generation, width, height]);
  return null;
}

/** A slow camera move between two positions over host frames, eased. Near particles shift more than far ones, which is what reads as depth.
 * Place it inside a `FiberStage`; it applies the frame before the stage draws. */
export function CameraMove({ from, to, startFrame = 0, endFrame, lookAt = [0, 0, 0] }: { from: readonly [number, number, number]; to: readonly [number, number, number]; startFrame?: number; endFrame: number; lookAt?: readonly [number, number, number] }) {
  const { frame } = useStageFrame(), camera = useThree(state => state.camera);
  useLayoutEffect(() => {
    const t = Math.min(1, Math.max(0, (frame - startFrame) / Math.max(1, endFrame - startFrame))), e = t * t * (3 - 2 * t);
    camera.position.set(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e);
    camera.lookAt(...lookAt);
  }, [frame, camera, from, to, startFrame, endFrame, lookAt]);
  return null;
}

class Boundary extends Component<{ onError: (message: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { this.props.onError(error instanceof Error ? error.message : String(error)); }
  render() { return this.state.failed ? null : this.props.children; }
}

export const FiberStage = forwardRef<HTMLDivElement, FiberStageProps>(function FiberStage({ frame, fps, children, camera, background, dpr = 1, label, fallback, shadows = false, style, ...props }, ref) {
  const host = useRef<HTMLDivElement | null>(null), [failed, setFailed] = useState<string>();
  const seconds = frame * fps.den / fps.num, value = { frame, fps, seconds };
  return <div {...props} ref={node => { host.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
    role="img" aria-label={label} data-km-fiber-frame={frame} data-km-fiber-status={failed ? "error" : "pending"}
    style={{ position: "relative", width: "100%", height: "100%", background, ...style }}>
    {failed ? (fallback ?? <span role="alert" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", background: "#7a1f1f", padding: 16, textAlign: "center" }}>3D scene failed: {failed}</span>)
      : <Boundary onError={setFailed}>
        <Canvas frameloop="never" dpr={dpr} shadows={shadows ? "percentage" : false} gl={{ preserveDrawingBuffer: true, antialias: true, alpha: !background, stencil: true }} style={{ position: "absolute", inset: 0 }}
          camera={{ position: camera?.position ? [...camera.position] : [0, 0, 5], fov: camera?.fov ?? 40, near: camera?.near ?? 0.05, far: camera?.far ?? 200 }}
>
          {/* Part of the scene, so it is there for the very first frame drawn. */}
          {background && <color attach="background" args={[background]} />}
          <StageFrameContext.Provider value={value}>
            {children}
            <Driver frame={frame} seconds={seconds} host={host} lookAt={camera?.lookAt} />
          </StageFrameContext.Provider>
        </Canvas>
      </Boundary>}
  </div>;
});
