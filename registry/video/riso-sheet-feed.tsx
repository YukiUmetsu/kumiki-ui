import type { CSSProperties } from "react";
import type { RisoArtwork } from "./print-plates-react";
import { RisoPrint } from "./print-plates-react";
import type { RisoPrintSpec } from "./print-plates";
import { clamp01 } from "./print-plates";

/** Authored drawing for each source-ink plate, with an independently configured paper sheet. */
export interface RisoSheet {
  spec: RisoPrintSpec;
  artworks: Readonly<Record<string, RisoArtwork>>;
}
export interface SheetFeedFrame {
  reveal: number;
  printFrame: number;
  holdFrame: number;
}
export interface RisoSheetFeedProps {
  outgoing: RisoSheet;
  incoming: RisoSheet;
  /** Absolute existing FilmStage frame, with no additional clock. */
  frame: number;
  startFrame: number;
  durationFrames: number;
  misregistration?: number;
  paperGrain?: number;
  reducedMotion?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}
export function completedRisoFrame(spec: RisoPrintSpec): number {
  return spec.startFrame + (spec.plates.length - 1) * (spec.passFrames + spec.gapFrames) + spec.passFrames;
}
/** Stateless print-native handoff, suitable for nonsequential seek and render parity. */
export function evaluateRisoSheetFeed(
  outgoing: RisoPrintSpec, incoming: RisoPrintSpec,
  frame: number, startFrame: number, durationFrames: number, reducedMotion = false,
): SheetFeedFrame {
  if (!Number.isSafeInteger(frame) || frame < 0 || !Number.isSafeInteger(startFrame) || startFrame < 0 ||
      !Number.isSafeInteger(durationFrames) || durationFrames < 1)
    throw new RangeError("Sheet feed requires nonnegative integer frame/startFrame and positive integer durationFrames.");
  if (incoming.width !== outgoing.width || incoming.height !== outgoing.height)
    throw new RangeError("Sheet feed requires matching output sizes. Author separate landscape and portrait shots.");
  if (incoming.paper.toLowerCase() !== outgoing.paper.toLowerCase())
    throw new RangeError("Sheet feed requires the same paper stock for a continuous physical sheet change.");
  const t = reducedMotion ? 1 : clamp01((frame - startFrame) / durationFrames);
  return { reveal: t, printFrame: Math.round(completedRisoFrame(incoming) * t), holdFrame: completedRisoFrame(outgoing) };
}
/**
 * New sheet travels past the press feed edge while its spot inks arrive sequentially.
 * Hosts render it as an existing FilmStage slot scene, not a second timeline or a new cut kind.
 */
export function RisoSheetFeed({
  outgoing, incoming, frame, startFrame, durationFrames,
  misregistration = 0, paperGrain = .5, reducedMotion = false,
  label = "A new two-color print arrives through the press", className, style,
}: RisoSheetFeedProps) {
  const state = evaluateRisoSheetFeed(outgoing.spec, incoming.spec, frame, startFrame, durationFrames, reducedMotion);
  const sweep = 100 * state.reveal;
  const full: CSSProperties = { position: "absolute", inset: 0 };
  return <div className={className} data-km-riso-sheet-feed="" role="img" aria-label={label}
    style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden",
      background: outgoing.spec.paper, isolation: "isolate", ...style }}>
    <div aria-hidden="true" style={full}>
      <RisoPrint spec={outgoing.spec} artworks={outgoing.artworks} frame={state.holdFrame}
        reducedMotion paperGrain={paperGrain} misregistration={misregistration} aria-hidden="true"/>
    </div>
    {state.reveal > 0 && <div aria-hidden="true" data-km-riso-sheet-incoming=""
      style={{ ...full, clipPath: "inset(0 " + (100 - sweep) + "% 0 0)" }}>
      <RisoPrint spec={incoming.spec} artworks={incoming.artworks} frame={state.printFrame}
        reducedMotion={reducedMotion} paperGrain={paperGrain} misregistration={misregistration} aria-hidden="true"/>
    </div>}
    {state.reveal > 0 && state.reveal < 1 && <div aria-hidden="true" data-km-riso-feed-edge=""
      style={{ position: "absolute", top: 0, bottom: 0, left: sweep + "%",
        width: "min(1.1%, 10px)", transform: "translateX(-50%)",
        background: "linear-gradient(90deg,rgba(53,44,38,.35),rgba(242,233,214,.85),rgba(53,44,38,.2))",
        boxShadow: "2px 0 10px rgba(55,40,26,.18)", pointerEvents: "none" }}/>}
  </div>;
}
