/**
 * Fireworks: a light climbs, opens into rays on all sides at once, and they fall and go out. A handful of paper or drops of water
 * is the same with other colours, a short life and no way up. Pure functions of time; whoever draws them takes the sparks as they are.
 */
type Pt = readonly [number, number];
export type SparkColor = readonly [number, number, number];
export interface Burst {
  /** Balls of sparks, one in another: how far they fly (centimetres), how many, and their colours from the first to the last (0–1). */
  rings: readonly { radius: number; count: number; colors: readonly SparkColor[] }[];
  /** Seconds from when it opens until the last spark is out. */ life: number;
  /** How fast the air takes their speed, per second. Default 2.6. */ drag?: number;
  /** How fast they fall in the end, centimetres a second. Default 0. */ fall?: number;
  /** Seconds of its own way that a spark draws behind it. Default 0.25. */ trail?: number;
  /** Width of a spark, centimetres. */ width: number;
  /** Before it opens it climbs: from where, seen from where it opens, and how long. */ rise?: { from: Pt; seconds: number };
  seed?: number;
}
export interface Spark { x: number; y: number; /** Degrees; it lies along its way. */ angle: number; length: number; width: number; opacity: number; color: SparkColor }

const clamp = (v: number) => Math.min(1, Math.max(0, v)), smooth = (v: number) => { const u = clamp(v); return u * u * (3 - 2 * u); };
const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
function mixed(colors: readonly SparkColor[], u: number): SparkColor {
  const at = clamp(u) * (colors.length - 1), i = Math.min(colors.length - 2, Math.floor(at)), k = smooth(at - i); if (colors.length === 1) return colors[0];
  return [0, 1, 2].map(c => colors[i][c] + (colors[i + 1][c] - colors[i][c]) * k) as unknown as SparkColor;
}

/** How bright it is, 0–1: the flash when it opens, then the light of its sparks. */
export function burstLight(b: Burst, t: number): number { return t < 0 || t > b.life ? 0 : smooth(t / 0.06) * Math.max(Math.exp(-t / 0.3), 0.55 * smooth((b.life - t) / (0.7 * b.life))); }

/** The sparks, in centimetres from where it opens. `t` is seconds since it opened: below 0 it climbs. */
export function sparksOf(b: Burst, t: number): Spark[] {
  const out: Spark[] = [], drag = b.drag ?? 2.6, trail = b.trail ?? 0.25, seed = b.seed ?? 1;
  if (t < 0) {
    if (!b.rise || t < -b.rise.seconds) return out;
    // it climbs, slower and slower, with a little swing
    const { from, seconds } = b.rise, at = (s: number): Pt => { const u = clamp(1 + s / seconds), up = 1 - (1 - u) * (1 - u); return [from[0] * (1 - up) + 0.012 * Math.abs(from[1]) * Math.sin(9 * s) * (1 - up), from[1] * (1 - up)]; };
    const [x, y] = at(t), [px, py] = at(t - 0.22);
    return [{ x: (x + px) / 2, y: (y + py) / 2, angle: (Math.atan2(y - py, x - px) * 180) / Math.PI, length: Math.hypot(x - px, y - py) + b.width, width: 0.9 * b.width, opacity: 0.8 * smooth((t + seconds) / 0.25) * smooth(-t / 0.15), color: mixed(b.rings[0].colors, 0) }];
  }
  if (t > b.life) return out;
  b.rings.forEach((ring, r) => {
    for (let i = 0; i < ring.count; i++) {
      // even on a ball, a little off
      const h = hash(i + 1, seed + 13 * r), g = hash(i + 7, seed + 29 * r), z = 1 - (2 * (i + 0.5 + 0.5 * (h - 0.5))) / ring.count, turn = i * 2.399963 + 0.3 * (g - 0.5), flat = Math.sqrt(Math.max(0, 1 - z * z)), dx = flat * Math.cos(turn), dy = flat * Math.sin(turn), radius = ring.radius * (0.94 + 0.1 * h);
      const at = (s: number): Pt => { const gone = 1 - Math.exp(-drag * Math.max(0, s)); return [radius * dx * gone, radius * dy * gone + (b.fall ?? 0) * (Math.max(0, s) - gone / drag)]; };
      const ends = b.life * (0.74 + 0.26 * g); if (t > ends) continue;
      const [x, y] = at(t), [px, py] = at(t - trail * (1 + 0.8 * clamp(t / b.life))), late = smooth((t - 0.6 * ends) / (0.4 * ends)), twinkle = 1 - 0.6 * late * (0.5 + 0.5 * Math.sin(2 * Math.PI * (6 * t + h)));
      out.push({ x: (x + px) / 2, y: (y + py) / 2, angle: (Math.atan2(y - py, x - px) * 180) / Math.PI, length: Math.hypot(x - px, y - py) + b.width, width: b.width * (0.85 + 0.25 * z) * (1 - 0.35 * late), opacity: smooth(t / 0.05) * smooth((ends - t) / (0.35 * ends)) * twinkle, color: mixed(ring.colors, t / b.life) });
    }
  });
  return out;
}
