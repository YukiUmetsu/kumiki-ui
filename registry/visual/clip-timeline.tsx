/** A clip on a timeline with a time ruler, trim handles and an optional playhead. Dimmed regions
 * outside the trim are what a trim removes. Times are seconds and must be valid: the duration is
 * positive, the trim is ordered inside it, and the playhead falls within the clip.
 */
import type { SVGProps } from "react";

export interface ClipTimelineColors {
  track: string;
  kept: string;
  handle: string;
  dimmed: string;
  ruler: string;
  label: string;
  playhead: string;
}

export interface ClipTimeline2DProps extends Omit<SVGProps<SVGSVGElement>, "children" | "ref"> {
  /** Clip length in seconds. */
  duration: number;
  /** Trim in and out points in seconds. Default: the whole clip. */
  trimStart?: number;
  trimEnd?: number;
  /** Playhead position in seconds. */
  playhead?: number;
  width: number;
  height?: number;
  /** Names the timeline for assistive tech. Defaults to a description of the trim. */
  ariaLabel?: string;
  colors?: Partial<ClipTimelineColors>;
}

const DEFAULT_COLORS: ClipTimelineColors = {
  track: "var(--km-clip-track, #e9edf3)", kept: "var(--km-clip-kept, #345eb5)", handle: "var(--km-clip-handle, #202936)",
  dimmed: "var(--km-clip-dimmed, rgba(32, 41, 54, 0.45))", ruler: "var(--km-clip-ruler, #748399)",
  label: "var(--km-clip-label, #202936)", playhead: "var(--km-clip-playhead, #b45b27)",
};

const PAD = 14, TRACK_Y = 40, TRACK_H = 40, FONT = 12;
const STEPS = [0.5, 1, 2, 3, 4, 5, 6, 10, 15, 30, 60, 120, 300, 600];

/** `mm:ss.s`, one decimal. Minutes may exceed 59 for long clips; there is no hours field. */
export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error(`Time must be a non-negative number of seconds; received ${seconds}.`);
  const minutes = Math.floor(seconds / 60), rest = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${rest.toFixed(1).padStart(4, "0")}`;
}

/** Smallest ruler step whose ticks fit the span: about 60 units per label, at most eight labels. */
export function rulerStep(duration: number, span = 480): number {
  const maxTicks = Math.max(2, Math.min(8, Math.floor(span / 60)));
  return STEPS.find(step => Math.floor(duration / step + 1e-9) + 1 <= maxTicks) ?? STEPS[STEPS.length - 1];
}

/** Trim labels sit outside their handles. When there is no room on the outside, they move inside. */
export function trimLabelLayout(inX: number, outX: number, width: number, inText: string, outText: string) {
  const est = (text: string) => text.length * FONT * .56 + 8;
  const inLeft = inX - 6 - est(inText) >= 0;
  const outRight = outX + 6 + est(outText) <= width;
  return {
    inX: inLeft ? inX - 6 : inX + 6, inAnchor: inLeft ? "end" : "start",
    outX: outRight ? outX + 6 : outX - 6, outAnchor: outRight ? "start" : "end",
  } as const;
}

export function ClipTimeline2D({ duration, trimStart = 0, trimEnd = duration, playhead, width, height = 120, ariaLabel, colors, ...props }: ClipTimeline2DProps) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`duration must be a positive number of seconds; received ${duration}.`);
  if (!(trimStart >= 0 && trimEnd > trimStart && trimEnd <= duration)) {
    throw new Error(`The trim must satisfy 0 ≤ trimStart < trimEnd ≤ duration; received ${trimStart} to ${trimEnd} of ${duration}.`);
  }
  if (playhead !== undefined && !(playhead >= 0 && playhead <= duration)) throw new Error(`playhead must be within 0 to ${duration}; received ${playhead}.`);
  if (!(width > 0)) throw new Error("ClipTimeline2D needs a positive width.");
  const c = { ...DEFAULT_COLORS, ...colors };
  const innerW = width - PAD * 2, x = (t: number) => PAD + (t / duration) * innerW;
  const inX = x(trimStart), outX = x(trimEnd);
  const inText = `In ${formatTimecode(trimStart)}`, outText = `Out ${formatTimecode(trimEnd)}`;
  const labels = trimLabelLayout(inX, outX, width, inText, outText);
  const step = rulerStep(duration, innerW);
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000);
  const fullTrim = trimStart === 0 && trimEnd === duration;
  const label = ariaLabel ?? (fullTrim ? `Clip, ${formatTimecode(duration)} long, no trim.` : `Clip, ${formatTimecode(duration)} long; keeps ${formatTimecode(trimStart)} to ${formatTimecode(trimEnd)}.`);
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ display: "block", width: "100%", height: "auto" }} {...props}>
    {ticks.map(t => <g key={t}>
      <line x1={x(t)} x2={x(t)} y1={24} y2={30} stroke={c.ruler} strokeWidth={1} />
      <text x={x(t)} y={18} fontSize={FONT - 1} textAnchor={t === 0 ? "start" : t >= duration - 1e-9 ? "end" : "middle"} fill={c.ruler}>{formatTimecode(t)}</text>
    </g>)}
    <rect x={PAD} y={TRACK_Y} width={innerW} height={TRACK_H} rx={8} fill={c.track} />
    {!fullTrim && <>
      <rect x={PAD} y={TRACK_Y} width={inX - PAD} height={TRACK_H} rx={8} fill={c.dimmed} />
      <rect x={outX} y={TRACK_Y} width={PAD + innerW - outX} height={TRACK_H} rx={8} fill={c.dimmed} />
    </>}
    <rect x={inX} y={TRACK_Y} width={outX - inX} height={TRACK_H} fill={c.kept} opacity={.22} />
    <rect x={inX - 3} y={TRACK_Y - 6} width={6} height={TRACK_H + 12} rx={3} fill={c.handle} />
    <rect x={outX - 3} y={TRACK_Y - 6} width={6} height={TRACK_H + 12} rx={3} fill={c.handle} />
    {playhead !== undefined && <line x1={x(playhead)} x2={x(playhead)} y1={TRACK_Y - 10} y2={TRACK_Y + TRACK_H + 10} stroke={c.playhead} strokeWidth={2} />}
    <text x={labels.inX} y={height - 14} fontSize={FONT} textAnchor={labels.inAnchor} fill={c.label} fontWeight={600} data-km-trim-label="in">{inText}</text>
    <text x={labels.outX} y={height - 14} fontSize={FONT} textAnchor={labels.outAnchor} fill={c.label} fontWeight={600} data-km-trim-label="out">{outText}</text>
  </svg>;
}
