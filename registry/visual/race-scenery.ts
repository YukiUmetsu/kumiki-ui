/** Distant scenery for race shots: a ring of mountains kilometres from the track, so every camera has a far horizon to measure speed
 * against. A trackside or alongside pan sweeps across the ranges on the far side; a chase sees peaks far ahead that hold still while
 * the track streams past beneath them.
 *
 * The mountains are a terrain tile, either a caller's glTF or one generated here, placed around the track at set angles, distances and
 * sizes, so they are the same in every frame and every render.
 */

/** Where a mountain stands: its bearing from the track's centre (degrees; 0 is straight down the track, 90 the far side, -90 the near
 * side), its distance and footprint in metres, its peak height, and the tile's turn and mirror for variety. */
export interface MountainPlacement { bearing: number; distance: number; width: number; height: number; turn: number; mirror?: boolean }

/** The ring. The far side, where trackside and alongside cameras look, has the most and nearest ranges; ahead and behind, where the
 * long chase lens looks, they stand farther and lower, so they sit under the sky rather than fill the frame. */
export const MOUNTAIN_RING: readonly MountainPlacement[] = [
  { bearing: 50, distance: 5600, width: 4600, height: 560, turn: 10 },
  { bearing: 72, distance: 4400, width: 3600, height: 420, turn: 140, mirror: true },
  { bearing: 91, distance: 5200, width: 4800, height: 620, turn: 260 },
  { bearing: 110, distance: 4200, width: 3400, height: 400, turn: 75, mirror: true },
  { bearing: 131, distance: 5400, width: 4400, height: 560, turn: 200 },
  { bearing: 3, distance: 9000, width: 5600, height: 300, turn: 300 },
  { bearing: -16, distance: 8200, width: 4600, height: 240, turn: 30, mirror: true },
  { bearing: 21, distance: 8000, width: 4400, height: 230, turn: 165 },
  { bearing: 180, distance: 8600, width: 5600, height: 300, turn: 95 },
  { bearing: 161, distance: 7800, width: 4600, height: 260, turn: 230, mirror: true },
  { bearing: -70, distance: 6000, width: 4800, height: 470, turn: 320 },
  { bearing: -110, distance: 6400, width: 5000, height: 520, turn: 50, mirror: true },
];

/** A placement's centre on the ground, in the track's frame: x down the track, z towards the near side. */
export const mountainCentre = (place: MountainPlacement): [number, number] => [Math.cos(place.bearing * Math.PI / 180) * place.distance, -Math.sin(place.bearing * Math.PI / 180) * place.distance];

/** How thick the air is between the camera and the mountains (exponential-squared): about 70% of a mountain's colour survives at
 * 4.5 km and a quarter at 9 km, so nearer ranges read darker and sharper than farther ones. */
export const SCENERY_HAZE = 1.3e-4;

// A small seeded value noise, so the generated range is the same everywhere.
const hash = (x: number, y: number, seed: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
const fade = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = fade(x - xi), yf = fade(y - yi);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
/** Ridged noise: sharp crests and soft valleys, as erosion leaves them. */
function ridged(x: number, y: number, seed: number) {
  let sum = 0, amp = .5, freq = 1, weight = 1;
  for (let o = 0; o < 6; o += 1) {
    const n = 1 - Math.abs(noise(x * freq, y * freq, seed + o) * 2 - 1), r = n * n * weight;
    sum += r * amp; weight = Math.min(1, r * 2); amp *= .5; freq *= 2.05;
  }
  return sum;
}

export interface MountainTile {
  /** Vertex positions on a unit footprint (x and z from -.5 to .5), heights from just below 0 to 1 at the highest peak. */
  positions: Float32Array;
  /** Linear vertex colours: forest low down, bare rock on steep and high ground, and a little snow on the highest crests. */
  colors: Float32Array;
  indices: Uint32Array;
}

/** A generated mountain tile: a massif of ridged crests, highest near its middle, falling to a skirt just below the ground at its edges
 * so it meets the plain without a seam. */
export function generatedMountain(segments = 256, seed = 7): MountainTile {
  const n = segments + 1, heights = new Float32Array(n * n);
  for (let j = 0; j < n; j += 1) for (let i = 0; i < n; i += 1) {
    const u = i / segments - .5, v = j / segments - .5, r = Math.hypot(u, v * 1.25) * 2;
    const mass = Math.max(0, 1 - r * r) ** 1.4, crest = ridged(u * 3.2 + 11, v * 3.2 + 5, seed);
    heights[j * n + i] = mass * (.35 + crest * 1.1) - .03;
  }
  let top = 0; for (const h of heights) top = Math.max(top, h);
  const positions = new Float32Array(n * n * 3), colors = new Float32Array(n * n * 3), step = 1 / segments;
  // Muted, as distance and daylight leave them: dark conifer, dry scrub, grey-brown rock and old snow.
  const forest = [.022, .032, .022], scrub = [.06, .055, .04], rock = [.1, .095, .09], snow = [.6, .62, .66];
  const mix = (a: number[], b: number[], t: number) => a.map((x, k) => x + (b[k] - x) * Math.min(1, Math.max(0, t)));
  for (let j = 0; j < n; j += 1) for (let i = 0; i < n; i += 1) {
    const k = j * n + i, h = heights[k] / top;
    positions.set([i * step - .5, h, j * step - .5], k * 3);
    const dx = (heights[j * n + Math.min(n - 1, i + 1)] - heights[j * n + Math.max(0, i - 1)]) / top, dz = (heights[Math.min(n - 1, j + 1) * n + i] - heights[Math.max(0, j - 1) * n + i]) / top;
    // Slope in tile units scaled to a mountain about seven times wider than high.
    const slope = Math.hypot(dx, dz) / (2 * step) / 7;
    let c = mix(forest, scrub, (h - .25) / .3);
    c = mix(c, rock, Math.max((h - .45) / .25, (slope - .55) / .3));
    c = mix(c, snow, (h - .9) / .08 - Math.max(0, slope - .9) * 3);
    colors.set(c, k * 3);
  }
  const indices = new Uint32Array(segments * segments * 6);
  for (let j = 0, q = 0; j < segments; j += 1) for (let i = 0; i < segments; i += 1, q += 6) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    indices.set([a, c, b, b, c, d], q);
  }
  return { positions, colors, indices };
}
