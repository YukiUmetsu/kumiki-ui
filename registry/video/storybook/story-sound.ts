/**
 * The sound of a story, mixed from its own data: voices, effects and beds, on one clock with the picture.
 *
 * The same mixer runs in a browser, where a player hears a shot without a build, and in Node, where `scripts/storybook-sound.mjs`
 * masters the result. It knows where every voice is, so a bed goes down before the first sound of a line and comes back after the
 * last one; no compressor has to guess. Pure: same cues and same recordings, same samples.
 */
import { storyCues } from "./storybook-film";
import type { StoryCue, StoryPlan } from "./storybook-film";

/** A decoded recording: one or two channels at `rate`. */
export interface StoryPcm { rate: number; channels: readonly Float32Array[] }
export interface StoryMixOptions {
  /** Samples a second. Default 48000. */ rate?: number;
  /** How far a bed goes down under a voice, dB. Default 7. */ duck?: number;
  /** Seconds that it takes to go down and to come back. */ attack?: number; release?: number;
}

const fromDb = (db: number) => 10 ** (db / 20);
const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
/** How long a cue sounds, seconds. A bed sounds as long as it says. */
export const cueSeconds = (cue: StoryCue, pcm: StoryPcm): number => cue.for ?? (cue.kind === "bed" ? 0 : pcm.channels[0].length / pcm.rate - (cue.from ?? 0));

/** Mix a story. `read` gives the decoded recording of an address; what it does not know stays silent and is named in `missing`. */
export function mixStory(plan: StoryPlan, read: (src: string) => StoryPcm | undefined, options: StoryMixOptions = {}): { rate: number; channels: [Float32Array, Float32Array]; missing: string[] } {
  const { rate = 48000, duck = 7, attack = 0.18, release = 0.45 } = options, size = Math.round(plan.seconds * rate), out: [Float32Array, Float32Array] = [new Float32Array(size), new Float32Array(size)], missing: string[] = [];
  const cues = storyCues(plan), spoken = cues.flatMap(c => { const p = c.kind === "voice" ? read(c.src) : undefined; return p ? [[c.at, c.at + cueSeconds(c, p)] as const] : []; }).sort((a, b) => a[0] - b[0]);
  // 0 while nobody speaks, 1 under a voice. Times come in order: voices that are over are not looked at again
  const ducker = () => { let over = 0; return (t: number) => { while (over < spoken.length && spoken[over][1] + release <= t) over++; let most = 0; for (let k = over; k < spoken.length && spoken[k][0] - attack < t; k++) { const [a, b] = spoken[k]; if (t < b + release) most = Math.max(most, Math.min(smooth((t - a + attack) / attack), smooth((b + release - t) / release))); } return most; }; };
  for (const cue of cues) {
    const pcm = read(cue.src); if (!pcm?.channels[0]?.length) { missing.push(cue.src); continue; }
    const seconds = cueSeconds(cue, pcm), start = cue.at - (cue.lead ?? 0), [fadeIn, fadeOut] = cue.fade ?? (cue.kind === "bed" ? [0.8, 0.8] : [0, cue.for === undefined ? 0 : 0.05]), length = pcm.channels[0].length, step = pcm.rate / rate, from = (cue.from ?? 0) * pcm.rate;
    const pan = cue.pan ?? 0, gain = fromDb(cue.gain), sides = pcm.channels.length > 1 ? [pcm.channels[0], pcm.channels[1]] : [pcm.channels[0], pcm.channels[0]], level = pcm.channels.length > 1 ? [1, 1] : [Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2];
    const under = ducker(), first = Math.max(0, Math.round(start * rate)), last = Math.min(size, Math.round((start + seconds) * rate));
    for (let i = first; i < last; i++) {
      const t = i / rate - start; let at = from + t * rate * step; if (cue.kind === "bed") at %= length; else if (at >= length - 1) break;
      const n = Math.floor(at), f = at - n, next = n + 1 < length ? n + 1 : cue.kind === "bed" ? 0 : n;
      let g = gain; if (fadeIn && t < fadeIn) g *= smooth(t / fadeIn); if (fadeOut && t > seconds - fadeOut) g *= smooth((seconds - t) / fadeOut);
      if (cue.kind === "bed" && spoken.length) g *= fromDb(-duck * under(i / rate));
      for (let c = 0; c < 2; c++) out[c][i] += (sides[c][n] * (1 - f) + sides[c][next] * f) * g * level[c];
    }
  }
  return { rate, channels: out, missing };
}

/** 16-bit WAV, for an `<audio>` element or a file. */
export function wavBytes(channels: readonly Float32Array[], rate: number): Uint8Array<ArrayBuffer> {
  const n = channels[0].length, k = channels.length, bytes = new Uint8Array(44 + n * k * 2), v = new DataView(bytes.buffer), text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  text(0, "RIFF"); v.setUint32(4, 36 + n * k * 2, true); text(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, k, true); v.setUint32(24, rate, true); v.setUint32(28, rate * k * 2, true); v.setUint16(32, k * 2, true); v.setUint16(34, 16, true); text(36, "data"); v.setUint32(40, n * k * 2, true);
  for (let i = 0, at = 44; i < n; i++) for (let c = 0; c < k; c++, at += 2) v.setInt16(at, Math.round(Math.max(-1, Math.min(1, channels[c][i])) * 32767), true);
  return bytes;
}

/** Mix a story in a browser, for a player: an address that an `<audio>` element plays. Revoke it when it is no longer needed. */
export async function storySoundUrl(plan: StoryPlan, options: StoryMixOptions = {}): Promise<string | undefined> {
  const rate = options.rate ?? 48000, cues = storyCues(plan); if (!cues.length || typeof OfflineAudioContext === "undefined") return undefined;
  const decoder = new OfflineAudioContext(1, 1, rate), heard = new Map<string, StoryPcm>();
  await Promise.all([...new Set(cues.map(c => c.src))].map(async src => {
    const buffer = await decoder.decodeAudioData(await (await fetch(src)).arrayBuffer());
    heard.set(src, { rate: buffer.sampleRate, channels: Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, i) => buffer.getChannelData(i)) });
  }));
  const mix = mixStory(plan, src => heard.get(src), { ...options, rate });
  return URL.createObjectURL(new Blob([wavBytes(mix.channels, mix.rate)], { type: "audio/wav" }));
}
