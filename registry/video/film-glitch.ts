/** Glitch cut (VE1.9): `{ "kind": "glitch" }` breaks the frame into horizontal bands that jump sideways, some with their red and blue
 * channels torn apart, while the incoming scene takes over band by band; the bands change every two frames, and the tear peaks at the
 * middle of the cut. For a real datamosh between two video files, see `npm run video:datamosh`.
 *
 * Practice: the glitch transition, band displacement with RGB split, is a stock short-form transition, often paired with a digital
 * sound ([Epidemic Sound](https://epidemicsound.com/blog/how-to-datamosh), [Adobe Express](https://adobe.com/uk/express/learn/blog/what-is-datamosh)).
 * Reduced motion plays a dissolve.
 */

export const GLITCH_FRAMES = 8;
export interface FilmGlitchCut { seed: number; intensity: number }
/** One band of a glitch frame, in pixels: where it is, how far it jumps, whether the incoming scene shows in it, and its RGB split. */
export interface GlitchBand { y: number; height: number; dx: number; incoming: boolean; split: number }
export interface GlitchProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

const hash = (a: number, b: number, c: number) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x27d4eb2f, 0xc2b2ae35) ^ Math.imul(c + 0x165667b1, 0x27d4eb2d); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };
const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

/**
 * The bands of a glitch at `progress` (0 to 1) of a `frames`-long cut. The band layout holds for two frames, then changes. The incoming
 * scene takes each band with a chance that rises smoothly through the cut, so at its end every band is the incoming scene; the jumps and
 * the splits peak at the middle and are gone at both ends.
 */
export function glitchBands(cut: FilmGlitchCut, progress: number, frames: number, width: number, height: number): GlitchBand[] {
  const t = Math.min(1, Math.max(0, progress)), step = Math.floor(t * Math.max(1, frames - 1) / 2), envelope = Math.sin(Math.PI * t) ** .7 * cut.intensity;
  const take = smooth((t - .15) / .7), bands: GlitchBand[] = [];
  for (let y = 0, k = 0; y < height; k++) {
    // Bands from 2 % to 16 % of the frame: thin tears and thick slabs.
    const h = Math.min(height - y, Math.round(height * (.02 + .14 * hash(cut.seed, step, 3 * k) ** 1.6)));
    const r = hash(cut.seed, step, 3 * k + 1), jump = (hash(cut.seed, step, 3 * k + 2) - .5) * 2;
    bands.push({ y, height: h, incoming: t >= 1 || (t > 0 && r < take), dx: Math.round(jump * .09 * width * envelope),
      split: r > .62 ? Math.round(.016 * width * envelope * (r - .62) / .38 + .004 * width * envelope) : 0 });
    y += h;
  }
  return bands;
}

/** Checks a glitch transition and resolves it. */
export function inspectGlitch(transition: { intensity?: number }, seed: number, path: string): { cut?: FilmGlitchCut; problems: GlitchProblem[] } {
  const intensity = transition.intensity ?? .7;
  if (!(intensity >= .1 && intensity <= 1)) return { problems: [{ severity: "error", code: "glitch-intensity", path: path + "/intensity", message: "A glitch's intensity runs from 0.1 to 1." }] };
  return { cut: { seed, intensity }, problems: [] };
}
