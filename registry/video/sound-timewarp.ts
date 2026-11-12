/** Time warps on a finished mix: a tape stop and a rewind (doc 34, S6).
 *
 * - **Tape stop.** Everything slows and drops in pitch until it stops, like a tape machine switched off, then holds silent while the
 *   picture holds, and spins back up when it moves again. It plays the film's own sound, so it follows whatever was playing.
 * - **Rewind.** The sound of a stretch runs backwards at speed, a rising chatter, while the picture runs back.
 *
 * Practice: a tape stop is a pitch-down as the tape slows to a halt; a slow sag suits a tired ending, a fast brake an abrupt cut. A rewind
 * runs backwards at speed (SoundBridge; tape and reverse effects in trailer editing). Pure: it reads and writes sample arrays, so the same
 * mix and spans give the same result.
 */

export interface TapeStop { startSeconds: number; stopSeconds: number; endSeconds: number }
export interface Rewind { sourceStartSeconds: number; startSeconds: number; endSeconds: number }

/** Linear interpolation of a channel at a fractional sample position, silent outside it. */
const at = (channel: Float32Array, position: number) => {
  const i = Math.floor(position), f = position - i;
  if (i < 0 || i + 1 >= channel.length) return 0;
  return channel[i] * (1 - f) + channel[i + 1] * f;
};
/** Spin-up after a stop, in seconds. */
const SPIN = .18;

/** Apply a tape stop in place: from `startSeconds` the playback rate falls from 1 to 0 by `stopSeconds`, the sound holds silent until
 * `endSeconds`, then spins up from rest to normal speed over 0.18 s, landing back in step with the film. */
export function applyTapeStop(channels: Float32Array[], sampleRate: number, stop: TapeStop): void {
  const s = Math.round(stop.startSeconds * sampleRate), d = Math.max(1, Math.round((stop.stopSeconds - stop.startSeconds) * sampleRate)), e = Math.round(stop.endSeconds * sampleRate), spin = Math.round(SPIN * sampleRate);
  for (const channel of channels) {
    const source = channel.slice();
    for (let u = 0; u < d && s + u < channel.length; u++) {
      // Rate (1 - x)^1.5 slows the tape smoothly to rest; its integral is where the tape has got to.
      const x = u / d, travelled = d / 2.5 * (1 - (1 - x) ** 2.5), fade = 1 - x ** 6;
      channel[s + u] = at(source, s + travelled) * fade;
    }
    for (let k = s + d; k < Math.min(e, channel.length); k++) channel[k] = 0;
    for (let u = 0; u < spin && e + u < channel.length; u++) {
      // Rate rising from 0 to 1, positioned so it reaches the film's own time exactly as the spin-up ends.
      const position = e + spin - (spin * spin - u * u) / (2 * spin);
      channel[e + u] = at(source, position) * Math.min(1, u / (spin * .3));
    }
  }
}
/** Apply a rewind in place: over `[startSeconds, endSeconds)` the sound of `[sourceStartSeconds, startSeconds)` plays backwards, sped up
 * to fit, crossfading with the original over 10 ms at each edge so neither join clicks. */
export function applyRewind(channels: Float32Array[], sampleRate: number, rewind: Rewind): void {
  const a = Math.round(rewind.startSeconds * sampleRate), b = Math.round(rewind.endSeconds * sampleRate), c = Math.round(rewind.sourceStartSeconds * sampleRate);
  const length = Math.max(1, b - a), span = Math.max(1, a - c), edge = Math.round(.01 * sampleRate);
  for (const channel of channels) {
    const source = channel.slice();
    for (let u = 0; u < length && a + u < channel.length; u++) {
      // It starts slow and speeds up, as a tape thrown into rewind does: position eased over the span, from its end back to its start.
      const x = u / length, eased = x * x * (3 - 2 * x);
      const w = Math.min(1, u / edge, (length - u) / edge);
      channel[a + u] = at(source, a - eased * span) * w + source[a + u] * (1 - w);
    }
  }
}
