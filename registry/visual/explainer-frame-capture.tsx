/** Explicit-frame export surface. Capture pixels with the host's browser tool.
 * This module does not own FFmpeg, a GPU readback path or an animation clock.
 */
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { ExplainerPlayer } from "./explainer-player";
import type { CompiledExplainerSequence, ExplainerFrame } from "./explainer-sequence";

export interface ExplainerFrameCaptureProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  sequence: CompiledExplainerSequence;
  /** Renderer-agnostic scene supplied by the host, evaluated at an absolute frame. */
  renderVisual: (state: ExplainerFrame) => ReactNode;
  initialFrame?: number;
  /** Optional host promise for external assets or GPU work not visible to the DOM. */
  prepareFrame?: (frame: number) => void | Promise<void>;
  timeoutMs?: number;
  textStyle?: CSSProperties;
}
export interface ExplainerFrameCaptureHandle {
  /** Random seek and await font, text placement and rendered-frame readiness. */
  seek(frame: number): Promise<HTMLDivElement>;
  /** Return the fixed-output DOM container for a browser screenshot. */
  element(): HTMLDivElement | null;
}

const nextPaint = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Wait for a specific painted frame, not just the first mounted root.
 * - Font and image assets must be ready.
 * - The protected-text layout must correspond to the requested frame.
 * - Any 3D viewport must have a nonzero drawing buffer for that frame.
 * Browser screenshot and encoding remain explicit host responsibilities.
 */
export async function waitForExplainerFrame(
  root: HTMLElement, frame: number, timeoutMs = 15_000,
): Promise<void> {
  if (!Number.isSafeInteger(frame) || frame < 0 || !Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error("Frame capture needs a valid integer frame and positive timeout.");
  const end = performance.now() + timeoutMs;
  const remaining = () => {
    const left = end - performance.now();
    if (left <= 0) throw new Error("Frame " + frame + " was not capture-ready within " + timeoutMs + "ms.");
    return left;
  };
  const within = async <T,>(promise: Promise<T>): Promise<T> =>
    Promise.race([promise, delay(remaining()).then(() => { throw new Error("Capture asset/layout readiness timed out."); })]);
  if (document.fonts) await within(document.fonts.ready);
  // The caller may seek to a different frame while an earlier request is pending.
  // Wait until the render subtree actually reflects the requested integer.
  while (true) {
    remaining();
    const player = root.querySelector<HTMLElement>("[data-km-explainer-player]");
    const stage = root.querySelector<HTMLElement>("[data-km-explainer-stage]");
    const composition = root.querySelector<HTMLElement>("[data-km-semantic-composition]");
    if (player?.dataset.frame === String(frame) &&
        composition?.dataset.frame === String(frame) &&
        stage?.dataset.layoutStatus === "ready") {
      if (composition.dataset.compositionValid !== "true")
        throw new Error("Frame " + frame + " has semantic visibility diagnostics; do not export it.");
      const canvas = root.querySelector<HTMLCanvasElement>("[data-km-camera-viewport-3d] canvas");
      const camera = root.querySelector<HTMLElement>("[data-km-camera-viewport-3d]");
      if (!camera || (camera.dataset.cameraFrame === String(frame) && canvas && canvas.width > 0 && canvas.height > 0))
        break;
    }
    if (stage?.dataset.layoutStatus === "error" || root.querySelector("[data-km-explainer-fallback]"))
      throw new Error("Frame " + frame + " has an impossible or unmeasurable text layout.");
    if (root.querySelector("[data-km-camera-viewport-3d] [role=alert]"))
      throw new Error("Frame " + frame + " has a 3D rendering error.");
    await within(nextPaint());
  }
  const images = [...root.querySelectorAll("img")];
  await within(Promise.all(images.map(async image => {
    if (!image.complete) await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error("Capture image could not load.")), { once: true });
    });
    if (image.naturalWidth === 0) throw new Error("Capture image is missing or broken.");
    if (image.decode) await image.decode();
  })));
  // Let WebGL afterRender/effects and DOM layout commit their painted frame.
  await within(nextPaint());
  await within(nextPaint());
  // Reconfirm the frame after async font/image work; stale requests must fail.
  const player = root.querySelector<HTMLElement>("[data-km-explainer-player]");
  const stage = root.querySelector<HTMLElement>("[data-km-explainer-stage]");
  if (player?.dataset.frame !== String(frame) || stage?.dataset.layoutStatus !== "ready")
    throw new Error("Frame changed or layout became invalid during capture preparation; seek again.");
}

export const ExplainerFrameCapture = forwardRef<ExplainerFrameCaptureHandle, ExplainerFrameCaptureProps>(
  function ExplainerFrameCapture({
    sequence, renderVisual, initialFrame = 0, prepareFrame, timeoutMs = 15_000, textStyle,
    style, ...props
  }, ref) {
    const [frame, setFrame] = useState(initialFrame);
    const root = useRef<HTMLDivElement | null>(null);
    const requested = useRef(0);
    const seek = useCallback(async (nextFrame: number) => {
      if (!Number.isSafeInteger(nextFrame) || nextFrame < 0 || nextFrame >= sequence.durationFrames)
        throw new Error("Capture frame must be inside the sequence duration.");
      const ticket = ++requested.current;
      setFrame(nextFrame);
      const element = root.current;
      if (!element) throw new Error("Mount ExplainerFrameCapture before calling seek().");
      await prepareFrame?.(nextFrame);
      if (ticket !== requested.current) throw new Error("Capture request superseded by a newer seek.");
      await waitForExplainerFrame(element, nextFrame, timeoutMs);
      if (ticket !== requested.current) throw new Error("Capture request superseded by a newer seek.");
      return element;
    }, [prepareFrame, sequence.durationFrames, timeoutMs]);
    useImperativeHandle(ref, () => ({ seek, element: () => root.current }), [seek]);
    return <div {...props} ref={root} data-km-explainer-frame-capture=""
      data-output-width={sequence.spec.output.width}
      data-output-height={sequence.spec.output.height}
      style={{ width: sequence.spec.output.width, ...style }}>
      <ExplainerPlayer sequence={sequence} frame={frame} playing={false}
        showControls={false} strict renderVisual={renderVisual} textStyle={textStyle} />
    </div>;
  },
);
