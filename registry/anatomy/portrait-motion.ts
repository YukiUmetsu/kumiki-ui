/**
 * A portrait in motion: blinks, glances and hair in moving air, as one `PortraitOptions` per frame
 * (`portraitFrame`), looping over a period.
 *
 * - **Blinks** follow measured spontaneous blinks: the lid closes in about 100 ms, stays shut a few tens of ms and
 *   reopens more slowly, in about 200 ms (high-speed video: Kwon et al. 2013, J R Soc Interface 10:20120808). People
 *   at rest blink about 17 times a minute (Bentivoglio et al. 1997, Mov Disord 12:1028), so a few-second loop holds
 *   one blink.
 * - **Glances** are saccades: about 20–30 ms plus 2–3 ms per degree (the "main sequence"; Bahill et al. 1975), so a
 *   10° glance is over within a frame at 12 fps. The eyes then hold still (a fixation) until the next one.
 * - **Hair** moves with `moveHair` in a breeze whose rates are rounded to the loop, so the last frame meets the first.
 */
import type { AuWeights } from "./expression-face";
import type { PortraitOptions } from "./face-portrait";

export interface PortraitMotion {
  /** Loop length, s. Default 3.2. */
  period?: number;
  /** Blink once a loop (default true), starting this far into it (0–1, default 0.3). */
  blink?: boolean; blinkAt?: number;
  /** Glance aside and back (default true): where to (-1 the face's right … 1 its left; up positive), when (shares of the loop). */
  glance?: boolean; glanceTo?: { x: number; y: number }; glanceAt?: number; glanceBack?: number;
  /** Wind speed at the head, m/s (0: still air; default 2.2), toward `windDirection` degrees (0 the back, 90 the figure's left). */
  wind?: number; windDirection?: number; gust?: number;
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** The upper lid's closure (0 open … 1 shut) `dt` seconds after a blink starts. */
export function blinkClosure(dt: number): number {
  if (dt < 0 || dt > 0.34) return 0;
  if (dt < 0.1) return smooth(0, 0.1, dt);   // closing, about 100 ms
  if (dt < 0.13) return 1;                    // shut
  return 1 - smooth(0.13, 0.34, dt);          // reopening, about 200 ms
}

/** One frame of a portrait in motion: the base options with this moment's lids, gaze and hair. */
export function portraitFrame(base: PortraitOptions, t: number, m: PortraitMotion = {}): PortraitOptions {
  const T = m.period ?? 3.2, tt = ((t % T) + T) % T;
  const w: Record<number, number> = { ...(base.weights as Record<number, number> | undefined) };
  if (m.blink ?? true) { const c = blinkClosure(tt - (m.blinkAt ?? 0.3) * T); if (c > 0) w[43] = Math.max(w[43] ?? 0, c); }
  if (m.glance ?? true) {
    const to = m.glanceTo ?? { x: 0.35, y: 0.05 }, a = (m.glanceAt ?? 0.55) * T, b = (m.glanceBack ?? 0.85) * T;
    // a saccade lasts about 40 ms: within a frame at 12 fps
    const k = smooth(a, a + 0.04, tt) * (1 - smooth(b, b + 0.04, tt));
    if (k > 0) {
      if (to.x > 0) w[61] = (w[61] ?? 0) + to.x * k; else w[62] = (w[62] ?? 0) - to.x * k;
      if (to.y > 0) w[63] = (w[63] ?? 0) + to.y * k; else w[64] = (w[64] ?? 0) - to.y * k;
    }
  }
  const wind = m.wind ?? 2.2;
  return { ...base, weights: w as AuWeights, hairMotion: wind > 0 ? { t: tt, wind, direction: m.windDirection ?? 15, gust: m.gust ?? 0.4, period: T } : undefined };
}
