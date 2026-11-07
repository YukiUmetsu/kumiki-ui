/** Checks and settings for a finished mix. Pure functions over measured numbers and samples, so a bad export can be
 * refused with a reason. Nothing here changes tone: the master step is one gain, which keeps every transient on its frame.
 */
export const MIX_PROFILES = {
  /** Most video platforms normalize near -14 LUFS. */
  youtube: { lufs: -14, truePeakDbtp: -1, toleranceLu: 1.5 },
  social: { lufs: -14, truePeakDbtp: -1, toleranceLu: 1.5 },
  podcast: { lufs: -16, truePeakDbtp: -1, toleranceLu: 1 },
  /** EBU R128. */
  broadcast: { lufs: -23, truePeakDbtp: -1, toleranceLu: .5 },
} as const;
export type MixProfileId = keyof typeof MIX_PROFILES;

export interface MixMeasure { integratedLufs: number; truePeakDbtp: number }
export interface MixSignalReport {
  /** Largest offset from zero in any channel. */
  dcOffset: number;
  /** Samples at full scale, in runs of at least three. */
  clippedSamples: number;
  /** Seconds where one sample jumps far outside its surroundings. */
  clicks: readonly number[];
}
export interface MixProblem { severity: "error" | "warning"; code: "mix-true-peak" | "mix-limiting" | "mix-loudness" | "mix-dc" | "mix-clipped" | "mix-click" | "mix-silent"; message: string }

/** The one gain that meets the profile. Without a limiter it stops at the true peak ceiling. */
export function masterGainDb(measure: MixMeasure, profileId: MixProfileId, options: { limit?: boolean } = {}): number {
  if (!Number.isFinite(measure.integratedLufs)) return 0;
  const profile = MIX_PROFILES[profileId], wanted = profile.lufs - measure.integratedLufs;
  return Number((options.limit ? wanted : Math.min(wanted, profile.truePeakDbtp - measure.truePeakDbtp)).toFixed(2));
}
/** Real recordings have large natural peaks, so a mix of them needs a limiter to reach a platform's loudness. More reduction than this crushes the sound. */
export const MAX_LIMITING_DB = 9;
/** How much a limiter would take off the loudest peak after `gainDb`. */
export const limitingDb = (measure: MixMeasure, gainDb: number, profileId: MixProfileId) => Math.max(0, Number((measure.truePeakDbtp + gainDb - MIX_PROFILES[profileId].truePeakDbtp).toFixed(2)));
/** The FFmpeg filter for a master. The limiter's latency is compensated, so no transient leaves its frame. */
export function masterFilter(gainDb: number, profileId: MixProfileId, options: { limit?: boolean } = {}) {
  const ceiling = 10 ** ((MIX_PROFILES[profileId].truePeakDbtp - 1) / 20);
  // Limiting at 4x catches the peaks that fall between samples, which true peak measures.
  return `volume=${gainDb}dB${options.limit ? `,aresample=192000,alimiter=limit=${ceiling.toFixed(4)}:attack=2:release=80:level=disabled:latency=1,aresample=48000` : ""}`;
}
const CLIP_LEVEL = .9995, CLICK_RATIO = 28, CLICK_FLOOR = .08, WINDOW_SECONDS = .01;
/** Scan one channel for DC, clipping and clicks. A click is a jump in slope that towers over the 10 ms around it. */
export function inspectMixChannel(samples: Float32Array, sampleRate: number): MixSignalReport {
  let sum = 0, clipped = 0, run = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i];
    if (Math.abs(samples[i]) >= CLIP_LEVEL) { run += 1; if (run === 3) clipped += 3; else if (run > 3) clipped += 1; } else run = 0;
  }
  const window = Math.max(16, Math.round(sampleRate * WINDOW_SECONDS)), clicks: number[] = [];
  let energy = 0;
  const bend = (i: number) => samples[i] - 2 * samples[i - 1] + samples[i - 2];
  for (let i = 2; i < samples.length; i += 1) {
    const value = Math.abs(bend(i));
    if (i >= window + 2) {
      const average = energy / window;
      if (value > CLICK_FLOOR && value > CLICK_RATIO * Math.max(average, 1e-4)) {
        const at = i / sampleRate;
        if (!clicks.length || at - clicks[clicks.length - 1] > .05) clicks.push(Number(at.toFixed(3)));
      }
      energy -= Math.abs(bend(i - window));
    }
    energy += value;
  }
  return { dcOffset: Math.abs(sum / Math.max(1, samples.length)), clippedSamples: clipped, clicks };
}
/** Check each channel as it is. A downmix can sum hotter than either channel, so it would report clipping that is not there. */
export function inspectMixChannels(channels: readonly Float32Array[], sampleRate: number): MixSignalReport {
  const reports = channels.map(channel => inspectMixChannel(channel, sampleRate));
  return { dcOffset: Math.max(0, ...reports.map(item => item.dcOffset)), clippedSamples: reports.reduce((sum, item) => sum + item.clippedSamples, 0), clicks: [...new Set(reports.flatMap(item => item.clicks))].sort((a, b) => a - b) };
}
/** How far a loop jumps at its seam, in dB against the loop's own level. Below about -20 dB the seam cannot be heard as a step. */
export function loopSeamDb(samples: Float32Array): number {
  if (samples.length < 4) return 0;
  let power = 0;
  for (const value of samples) power += value * value;
  const rms = Math.sqrt(power / samples.length) || 1e-9, jump = Math.abs(samples[0] - samples[samples.length - 1]);
  return Number((20 * Math.log10(Math.max(jump, 1e-9) / rms)).toFixed(2));
}
/** What is wrong with a mix. `sparse` marks a film of separate effects with no bed, whose loudness target cannot apply. */
export function inspectMix(measure: MixMeasure, signal: MixSignalReport, profileId: MixProfileId, options: { sparse?: boolean } = {}): MixProblem[] {
  const profile = MIX_PROFILES[profileId], problems: MixProblem[] = [];
  const add = (severity: MixProblem["severity"], code: MixProblem["code"], message: string) => problems.push({ severity, code, message });
  if (!Number.isFinite(measure.integratedLufs)) { add("error", "mix-silent", "The mix is silent. Check that each audio file exists and has sound."); return problems; }
  if (measure.truePeakDbtp > profile.truePeakDbtp + .05) add("error", "mix-true-peak", `True peak is ${measure.truePeakDbtp} dBTP, above the ${profile.truePeakDbtp} dBTP ceiling. Lower the loudest cue.`);
  const off = measure.integratedLufs - profile.lufs;
  if (Math.abs(off) > profile.toleranceLu) add(options.sparse ? "warning" : "error", "mix-loudness", `Loudness is ${measure.integratedLufs} LUFS. The ${profileId} target is ${profile.lufs} LUFS.${options.sparse ? " The film has no bed, so this does not stop the export." : " Raise the bed, or lower the loudest cue so the master gain can reach the target."}`);
  if (signal.dcOffset > .005) add("error", "mix-dc", `DC offset is ${signal.dcOffset.toFixed(4)}. Find the file that carries it, and high-pass it.`);
  if (signal.clippedSamples) add("error", "mix-clipped", `${signal.clippedSamples} samples are clipped. Lower the gain before the mix.`);
  if (signal.clicks.length) add("warning", "mix-click", `Possible clicks at ${signal.clicks.slice(0, 6).join(", ")} s. Check that no file starts or stops abruptly.`);
  return problems;
}
