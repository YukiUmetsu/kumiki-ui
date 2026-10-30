/** Absolute-frame, single-change recipe. No timers, easing or internal state. */
export type OneChangeKind = "connect" | "show" | "move" | "compare" | "ring";
export interface OneChangeWindow {
  /** Inclusive start frame. */
  startFrame: number;
  /** Exclusive end frame. */
  endFrame: number;
  /** One instantaneous reveal frame inside the window. */
  changeFrame: number;
  change: OneChangeKind;
}
export interface OneChangeSample {
  active: boolean;
  changed: boolean;
  phase: "outside" | "before" | "hold";
  change: OneChangeKind;
  /** All reveal surfaces share this state so they can never drift apart. */
  showHighlight: boolean;
  showConnector: boolean;
  showCaption: boolean;
}
export function validateOneChangeWindow(window: OneChangeWindow): void {
  const {startFrame, endFrame, changeFrame, change} = window;
  if (![startFrame, endFrame, changeFrame].every(Number.isSafeInteger) ||
      startFrame < 0 || endFrame <= startFrame ||
      changeFrame < startFrame || changeFrame >= endFrame) {
    throw new Error("OneChangeWindow requires safe nonnegative integer frames, start < end, and start <= change < end.");
  }
  if (!["connect","show","move","compare","ring"].includes(change)) {
    throw new Error("Unknown one-change action: " + String(change));
  }
}
/** Pure sampling supports random access, reverse seeking and offline export. */
export function evaluateOneChangeHold(window: OneChangeWindow, frame: number): OneChangeSample {
  validateOneChangeWindow(window);
  if (!Number.isSafeInteger(frame) || frame < 0) throw new Error("frame must be a nonnegative safe integer.");
  const active = frame >= window.startFrame && frame < window.endFrame;
  const changed = active && frame >= window.changeFrame;
  return {
    active, changed,
    phase: !active ? "outside" : changed ? "hold" : "before",
    change: window.change,
    showHighlight: changed,
    showConnector: changed,
    showCaption: changed,
  };
}
