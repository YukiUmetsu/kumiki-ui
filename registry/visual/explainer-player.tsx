/** ES1 React preview. Exactly one playhead; camera, cues and screen text share it.
 * All 3D, SVG and other scene rendering remains behind renderVisual.
 */
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { SemanticCompositionStage } from "./semantic-composition-stage";
import type { ExplainerLayoutResult } from "./explainer-layout";
import { evaluateExplainerFrame } from "./explainer-sequence";
import type { CompiledExplainerSequence, ExplainerFrame } from "./explainer-sequence";

export interface ExplainerPlayerProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  sequence: CompiledExplainerSequence;
  /** Controlled playhead; omit for internal player controls. */
  frame?: number;
  initialFrame?: number;
  onFrameChange?: (frame: number) => void;
  playing?: boolean;
  initialPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  loop?: boolean;
  showControls?: boolean;
  strict?: boolean;
  /** The caller owns the renderer and absolute-frame scene updates. */
  renderVisual: (state: ExplainerFrame) => ReactNode;
  onLayout?: (layout: ExplainerLayoutResult) => void;
}

const boundedFrame = (value: number, last: number) =>
  Math.max(0, Math.min(last, Math.trunc(Number.isFinite(value) ? value : 0)));

/** Playback and manual seeking evaluate the same readExplainerFrame-compatible
 * state. requestAnimationFrame drives only the preview playhead, never a
 * second camera/3D/MD1 animation clock.
 */
export const ExplainerPlayer = forwardRef<HTMLDivElement, ExplainerPlayerProps>(
  function ExplainerPlayer({
    sequence, frame, initialFrame = 0, playing, initialPlaying = false,
    onFrameChange, onPlayingChange, loop = false, showControls = true,
    strict = false, renderVisual, onLayout, style, ...props
  }, ref) {
    const last = sequence.durationFrames - 1;
    const [internalFrame, setInternalFrame] = useState(() => boundedFrame(initialFrame, last));
    const [internalPlaying, setInternalPlaying] = useState(initialPlaying);
    const currentFrame = boundedFrame(frame ?? internalFrame, last);
    const isPlaying = playing ?? internalPlaying;
    const frameRef = useRef(currentFrame);
    const callbacks = useRef({ onFrameChange, onPlayingChange });
    callbacks.current = { onFrameChange, onPlayingChange };
    frameRef.current = currentFrame;

    const changeFrame = useCallback((next: number) => {
      const clamped = boundedFrame(next, last);
      if (clamped === frameRef.current) return;
      frameRef.current = clamped;
      if (frame === undefined) setInternalFrame(clamped);
      callbacks.current.onFrameChange?.(clamped);
    }, [frame, last]);

    const changePlaying = useCallback((next: boolean) => {
      if (playing === undefined) setInternalPlaying(next);
      callbacks.current.onPlayingChange?.(next);
    }, [playing]);

    useEffect(() => {
      if (!isPlaying) return;
      let request = 0;
      let prior = performance.now(), remainder = 0;
      const tick = (now: number) => {
        // Preserve fractional frames across paints; never increment by one
        // per requestAnimationFrame (60Hz displays cannot time a 30fps film).
        const elapsed = Math.max(0, Math.min(1000, now - prior));
        prior = now;
        remainder += elapsed * sequence.fps.num / (1000 * sequence.fps.den);
        const advance = Math.floor(remainder);
        remainder -= advance;
        if (advance) {
          const next = frameRef.current + advance;
          if (next > last) {
            if (!loop) {
              changeFrame(last);
              changePlaying(false);
              return;
            }
            changeFrame(next % sequence.durationFrames);
          } else changeFrame(next);
        }
        request = requestAnimationFrame(tick);
      };
      request = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(request);
    }, [isPlaying, last, loop, sequence.durationFrames, sequence.fps.num, sequence.fps.den, changeFrame, changePlaying]);

    const state = useMemo(() => evaluateExplainerFrame(sequence, currentFrame), [sequence, currentFrame]);
    return <div {...props} ref={ref} data-km-explainer-player=""
      data-frame={currentFrame} data-playing={isPlaying ? "true" : "false"}
      data-shot={state.shot.id} data-role={state.shot.role}
      style={{ width: "100%", ...style }}>
      <SemanticCompositionStage composition={sequence.composition} frame={currentFrame}
        explanation={state.explanation} maxLines={state.shot.maxLines}
        strict={strict} onLayout={onLayout}>
        {renderVisual(state)}
      </SemanticCompositionStage>
      {showControls && <div data-km-explainer-controls=""
        style={{ display: "flex", alignItems: "center", gap: 12, paddingBlock: 12 }}>
        <button type="button" onClick={() => changePlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause explainer" : "Play explainer"}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ whiteSpace: "nowrap" }}>Frame</span>
          <input type="range" min={0} max={last} step={1} value={currentFrame}
            onChange={event => changeFrame(Number(event.target.value))}
            aria-label="Seek explainer frame" style={{ flex: 1 }} />
        </label>
        <output aria-live="off" style={{ fontVariantNumeric: "tabular-nums" }}>
          {currentFrame + 1} / {sequence.durationFrames}
        </output>
      </div>}
    </div>;
  },
);
