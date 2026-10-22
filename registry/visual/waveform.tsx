/** Waveform of audio peaks as an SVG bar strip, with an optional selection (the kept range) and a
 * playhead. Peaks are supplied by the caller. `illustrativePeaks` makes deterministic example peaks
 * for demos; they are not read from any audio file and must not be presented as measured data.
 */
import type { SVGProps } from "react";

export interface WaveformColors {
  bar: string;
  played: string;
  selection: string;
  playhead: string;
}

export interface Waveform2DProps extends Omit<SVGProps<SVGSVGElement>, "children" | "ref"> {
  /** Peak amplitudes from 0 to 1, left to right. At least two. */
  peaks: readonly number[];
  width: number;
  height: number;
  /** Played fraction, 0 to 1. */
  progress?: number;
  /** Kept range as fractions of the clip, 0 to 1. Bars outside it are dimmed. */
  selection?: { start: number; end: number };
  /** Required: names the waveform for assistive tech (for example the clip's length and trim). */
  ariaLabel: string;
  colors?: Partial<WaveformColors>;
}

const DEFAULT_COLORS: WaveformColors = {
  bar: "var(--km-wave-bar, #8a9caf)", played: "var(--km-wave-played, #345eb5)",
  selection: "var(--km-wave-selection, rgba(52, 94, 181, 0.12))", playhead: "var(--km-wave-playhead, #202936)",
};

/** Horizontal inset matches ClipTimeline2D, so the two align when stacked at the same width. */
const PAD = 14;

function assertFraction(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be a number from 0 to 1; received ${value}.`);
}

/** Deterministic example peaks: a seeded sequence with bursts, for illustration only. */
export function illustrativePeaks(count: number, seed = 1): number[] {
  if (!Number.isInteger(count) || count < 2) throw new Error(`illustrativePeaks needs a whole count of at least 2; received ${count}.`);
  let state = (seed * 2654435761) >>> 0 || 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  return Array.from({ length: count }, (_, i) => {
    const phrase = .55 + .45 * Math.sin(i / 7.5) * Math.sin(i / 23 + seed);
    const burst = random() > .72 ? .35 : 0;
    return Math.min(1, Math.max(.06, phrase * (.35 + .65 * random()) + burst));
  });
}

export function Waveform2D({ peaks, width, height, progress, selection, ariaLabel, colors, ...props }: Waveform2DProps) {
  if (peaks.length < 2) throw new Error(`Waveform2D needs at least two peaks; received ${peaks.length}.`);
  peaks.forEach((peak, i) => assertFraction(peak, `peaks[${i}]`));
  if (!(width > 0) || !(height > 0)) throw new Error("Waveform2D needs a positive width and height.");
  if (progress !== undefined) assertFraction(progress, "progress");
  if (selection) {
    assertFraction(selection.start, "selection.start");
    assertFraction(selection.end, "selection.end");
    if (selection.end <= selection.start) throw new Error("selection.end must be after selection.start.");
  }
  const c = { ...DEFAULT_COLORS, ...colors };
  const innerW = width - PAD * 2, innerH = height - PAD * 2, slot = innerW / peaks.length, barW = Math.max(1, slot * .62);
  const selX = selection ? PAD + selection.start * innerW : 0, selW = selection ? (selection.end - selection.start) * innerW : 0;
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} style={{ display: "block", width: "100%", height: "auto" }} {...props}>
    {selection && <rect x={selX} y={0} width={selW} height={height} fill={c.selection} />}
    {peaks.map((peak, i) => {
      const x = PAD + i * slot + (slot - barW) / 2, h = Math.max(2, peak * innerH), y = height / 2 - h / 2;
      const center = (i + .5) / peaks.length;
      const inside = !selection || (center >= selection.start && center <= selection.end);
      const played = progress !== undefined && center <= progress;
      return <rect key={i} x={x} y={y} width={barW} height={h} rx={barW / 2} fill={played ? c.played : c.bar} opacity={inside ? 1 : .35} />;
    })}
    {progress !== undefined && <line x1={PAD + innerW * progress} x2={PAD + innerW * progress} y1={0} y2={height} stroke={c.playhead} strokeWidth={1.5} />}
  </svg>;
}
