import { printHash } from "./print-plates";

/** AM: variable-size periodic dots. FM: pseudo-randomly dispersed fixed-size ink droplets.
 * All sites are registered in paper coordinates and derived from the print seed, not the film frame.
 * This models a digital screening plate; it does not claim an empirical RISO drum/stock profile.
 */
export type RisoScreenMode = "am" | "fm";
export interface RisoScreenOptions {
  cell: number;
  mode: RisoScreenMode;
  /** Fraction of nominal screen area to cover, in the inclusive range 0..1. */
  density: number;
  /** Positive ink-spread factor, 0..1, not an output opacity filter. */
  dotGain: number;
  seed: number;
  plateIndex: number;
}
export interface RisoScreenDot { readonly x: number; readonly y: number; readonly r: number }
export interface RisoScreenGeometry {
  /** Tile is 1 AM cell or 8 × 8 FM cells; pattern is rotated by the plate screen angle. */
  readonly tileSize: number;
  readonly dots: readonly RisoScreenDot[];
}

const validUnit = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

/** Site order is stable across density edits: increasing tone adds ink, never relocates old dots. */
export function createRisoScreenGeometry(options: RisoScreenOptions): RisoScreenGeometry {
  const { cell, mode, density, dotGain, seed, plateIndex } = options;
  if (!Number.isFinite(cell) || cell < 3 || cell > 36 ||
      (mode !== "am" && mode !== "fm") || !validUnit(density) || !validUnit(dotGain) ||
      !Number.isSafeInteger(seed) || seed < 0 || seed > 2147483647 ||
      !Number.isSafeInteger(plateIndex) || plateIndex < 0 || plateIndex > 24)
    throw new RangeError("Riso screen requires cell 3..36, AM/FM, density and dotGain 0..1, a nonnegative 31-bit seed and a valid plate index.");
  if (density === 0) return { tileSize: mode === "am" ? cell : 8 * cell, dots: [] };
  if (mode === "am") {
    // For zero dot gain, area(circle)/area(cell) equals the requested nominal tone.
    // Clamp at high density to prevent radius spilling into the neighboring screen tile.
    const r = cell * Math.min(.60, Math.sqrt(density / Math.PI) + .08 * dotGain);
    return { tileSize: cell, dots: [{ x: cell / 2, y: cell / 2, r }] };
  }

  // Large, non-repeating-within-tile stochastic screen: 64 separately inked candidate sites.
  // The same pseudo-random rank wins at every density; one plate never steals another's seed.
  const sites = Array.from({ length: 64 }, (_, index) => {
    const x = index % 8, y = Math.floor(index / 8), s = seed + plateIndex * 103;
    return {
      index,
      rank: printHash(s, x + 13, y + 19),
      x: (x + .5 + (printHash(s, x + 41, y + 59) - .5) * .14) * cell,
      y: (y + .5 + (printHash(s, x + 71, y + 89) - .5) * .14) * cell,
    };
  });
  sites.sort((a, b) => a.rank - b.rank || a.index - b.index);
  const count = Math.min(64, Math.round(64 * density));
  const radius = cell * (.49 + dotGain * .09);
  return {
    tileSize: 8 * cell,
    dots: sites.slice(0, count).map(site => ({ x: site.x, y: site.y, r: radius })),
  };
}
