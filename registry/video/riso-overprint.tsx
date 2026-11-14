import { useId } from "react";
import type { CSSProperties } from "react";
import { RisoPrint } from "./print-plates-react";
import type { RisoArtwork } from "./print-plates-react";
import { clamp01, inspectRisoPrint } from "./print-plates";
import type { RisoPrintSpec } from "./print-plates";
import type { RisoSheet } from "./riso-sheet-feed";
import { completedRisoFrame } from "./riso-sheet-feed";

/** Bridge an outgoing print to a second original print by stamping an incoming spot ink over it.
 * Unlike a circular wipe, the incoming plate *actually multiplies* against the outgoing ink.
 * The newly printed sheet resolves after the motif has stamped. No independent clock or renderer.
 */
export interface RisoOverprintProps {
  outgoing: RisoSheet;
  incoming: RisoSheet;
  /** An original SVG path, authored in local coordinates around imprintOrigin. */
  imprintPath: string;
  imprintOrigin: readonly [number, number];
  /** Existing FilmStage local frame. */
  frame: number;
  startFrame: number;
  durationFrames: number;
  /** An incoming plate ID to print across the outgoing artwork. */
  imprintPlateId: string;
  /** Ink-only SVG for the impression, without labels or print-stock marks. */
  imprintArtwork: RisoArtwork;
  /** Maximum enlargement of the authored ink shape, between 1 and 12. */
  imprintScale?: number;
  misregistration?: number;
  paperGrain?: number;
  reducedMotion?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}
export interface RisoOverprintFrame {
  progress: number;
  /** The physical ink impression is completed before the full new sheet resolves. */
  stamp: number;
  /** Exactly zero at the start, exactly one at the end. */
  /** Progress of the new paper knockout. Its authored contour clips, never cross-fades text. */
  paperReveal: number;
  /** Additional spot ink optically multiplies with ink on the outgoing sheet. */
  inkOpacity: number;
}
const smooth = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const VALID_PATH = /^[Mm][\d+\-.\s,]+[A-Za-z\d+\-.\s,]*$/;

/** All transitions are pure samples of absolute film frames; no historical frame is consulted. */
export function evaluateRisoOverprint(
  outgoing: RisoPrintSpec, incoming: RisoPrintSpec, imprintPlateId: string,
  frame: number, startFrame: number, durationFrames: number,
  reducedMotion = false,
): RisoOverprintFrame {
  if (!Number.isSafeInteger(frame) || frame < 0 || !Number.isSafeInteger(startFrame) || startFrame < 0 ||
      !Number.isSafeInteger(durationFrames) || durationFrames < 1)
    throw new RangeError("Riso overprint requires a nonnegative integer frame/startFrame and positive integer durationFrames.");
  const errors = [
    ...inspectRisoPrint(outgoing).map(issue => "outgoing" + issue.path + ": " + issue.message),
    ...inspectRisoPrint(incoming).map(issue => "incoming" + issue.path + ": " + issue.message),
  ];
  if (errors.length) throw new RangeError(errors.join("; "));
  if (outgoing.width !== incoming.width || outgoing.height !== incoming.height)
    throw new RangeError("Riso overprint requires matching sheet sizes; author each aspect separately.");
  if (outgoing.paper.toLowerCase() !== incoming.paper.toLowerCase())
    throw new RangeError("Riso overprint requires the same paper stock; use a paper-feed transition otherwise.");
  if (!incoming.plates.some(plate => plate.id === imprintPlateId))
    throw new RangeError("imprintPlateId must reference a declared incoming spot-ink plate.");
  const progress = reducedMotion ? 1 : clamp01((frame - startFrame) / durationFrames);
  const stamp = smooth(progress / .60);
  // The new paper begins resolving only after the incoming spot-ink impression is established.
  const paperReveal = smooth((progress - .55) / .45);
  const inkOpacity = stamp * (1 - paperReveal);
  return { progress, stamp, paperReveal, inkOpacity };
}

export function RisoOverprintTransition({
  outgoing, incoming, imprintPath, imprintOrigin, frame, startFrame, durationFrames,
  imprintPlateId, imprintArtwork, imprintScale = 1.85, misregistration = 0, paperGrain = .5,
  reducedMotion = false, label = "An incoming spot ink overprints a poster, then resolves into a second print",
  className, style,
}: RisoOverprintProps) {
  const state = evaluateRisoOverprint(outgoing.spec, incoming.spec, imprintPlateId,
    frame, startFrame, durationFrames, reducedMotion);
  if (typeof imprintPath !== "string" || imprintPath.length === 0 || imprintPath.length > 4096 ||
      !VALID_PATH.test(imprintPath))
    throw new RangeError("imprintPath must be a nonempty SVG path, beginning with M, with at most 4096 characters.");
  if (imprintOrigin.length !== 2 || !imprintOrigin.every(Number.isFinite) ||
      imprintOrigin[0] < 0 || imprintOrigin[0] > outgoing.spec.width ||
      imprintOrigin[1] < 0 || imprintOrigin[1] > outgoing.spec.height)
    throw new RangeError("imprintOrigin must be a finite [x, y] inside the sheet.");
  if (!Number.isFinite(imprintScale) || imprintScale < 1 || imprintScale > 12)
    throw new RangeError("imprintScale must be between 1 and 12.");
  if (!Number.isFinite(misregistration) || misregistration < 0 || misregistration > 1 ||
      !Number.isFinite(paperGrain) || paperGrain < 0 || paperGrain > 1)
    throw new RangeError("misregistration and paperGrain must be within 0..1.");
  const ids = new Set(incoming.spec.plates.map(plate => plate.id));
  if (!ids.has(imprintPlateId)) throw new RangeError("Unknown imprintPlateId.");
  // Keep all output geometry, paper and UV coordinates identical through the handoff.
  const uid = "riso-overprint-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  // Keep the first ink impression bounded to the graphic subject, away from labels/stamps.
  const scale = .015 + state.stamp * imprintScale;
  // A second, expanding knockout is cut from the same authored ink contour. Unlike a dissolve,
  // only one sheet owns each pixel: no ghosted typography or muddy paper crossfade.
  const paperScale = .015 + state.paperReveal * 12;
  const [ox, oy] = imprintOrigin;
  const common = { paperGrain, misregistration, reducedMotion: true, "aria-hidden": true as const };
  const inkArtwork = { ...incoming.artworks, [imprintPlateId]: imprintArtwork };
  return <svg className={className} xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={label} viewBox={`0 0 ${outgoing.spec.width} ${outgoing.spec.height}`}
    data-km-riso-overprint="" data-km-riso-overprint-frame={frame}
    style={{ width: "100%", height: "100%", display: "block", isolation: "isolate", overflow: "hidden", ...style }}>
    <defs>
      <clipPath id={uid} clipPathUnits="userSpaceOnUse">
        <path d={imprintPath} transform={`translate(${ox} ${oy}) scale(${scale})`}/>
      </clipPath>
      <clipPath id={uid + "-paper"} clipPathUnits="userSpaceOnUse">
        <path d={imprintPath} transform={`translate(${ox} ${oy}) scale(${paperScale})`}/>
      </clipPath>
    </defs>
    {state.paperReveal < 1 && <g data-km-riso-outgoing="">
      <RisoPrint spec={outgoing.spec} artworks={outgoing.artworks}
        frame={completedRisoFrame(outgoing.spec)} {...common}/>
    </g>}
    {state.inkOpacity > 0 && <g clipPath={`url(#${uid})`} data-km-riso-imprint-ink=""
      opacity={state.inkOpacity} style={{ mixBlendMode: "multiply" }}>
      <RisoPrint spec={incoming.spec} artworks={inkArtwork}
        frame={completedRisoFrame(incoming.spec)} {...common}
        transparentPaper visiblePlateIds={[imprintPlateId]}/>
    </g>}
    {state.paperReveal > 0 && <g data-km-riso-incoming=""
      clipPath={state.paperReveal < 1 ? `url(#${uid}-paper)` : undefined}>
      <RisoPrint spec={incoming.spec} artworks={incoming.artworks}
        frame={completedRisoFrame(incoming.spec)} {...common}/>
    </g>}
  </svg>;
}
