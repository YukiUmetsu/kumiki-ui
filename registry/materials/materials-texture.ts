/**
 * MATL1 texture: what the surface of each material is made of, as a procedural texture in millimetres. Every recipe
 * builds the material's structure, at its real size, before any colour noise:
 *
 * - wood: a log. Growth rings around a wandering pith, a different width each year, pale earlywood ending in a dense
 *   latewood band; a board cut from it shows cathedral arches (flat-sawn) or straight lines (quarter-sawn), and a ball
 *   turned from it shows end grain on two sides. Knots are branches running out from the pith, the rings bending round
 *   them. Weathered wood greys and loses its soft earlywood faster than its latewood (measured erosion rates), so the
 *   latewood stands up as ridges; checks open along the grain;
 * - bamboo: a waxy culm skin over vascular bundles, the node's ridge and sheath scar, a white bloom under the node,
 *   smoke-stained culms with the lighter marks of the ropes that bound them;
 * - tatami: igusa rushes about 1.4 mm wide, bound by warp threads in grooves about 1.5 cm apart, alternately over and
 *   under; worn mats fray;
 * - thatch: the cut ends of 3–7 mm stalks, stepping out of the roof, their stalks sinking up-slope into the mass;
 * - paper: a cloudy formation, kozo fibres 6–20 mm long in washi, short flecks in kraft, the flutes under cardboard;
 * - leather: pebbled grain cells, finer creases, follicle pores; grass: blades in depth over soil;
 * - stone, ceramic and earth: crystals of the minerals in their measured shares (granite), veins (marble), cleavage
 *   (slate), sand, aggregate and air voids (concrete, asphalt), drying cracks (clay), units and mortar (brick);
 * - metals: polished, brushed, cast, galvanised spangle, mill scale; rust, patina and lacquer.
 *
 * Contrast, grain direction and palette are calibrated to statistics measured from CC0 ambientCG colour maps
 * (`TEXTURE_CALIBRATION`); physical sizes come from the sources in `TEXTURE_FACTS`, each graded.
 */
import { fbm, fbm3, gaussianStream, gradNoise, hash2, ridged, warpedFbm, worley, worley3 } from "../anatomy/foundation-raster";
import type { Grade } from "../anatomy/foundation-shapes";
import type { MaterialRecord } from "./materials-data";
import { MATERIALS } from "./materials-data";
import { agedCheeseSolid, bananaSolid, batterSolid, beefSolid, citrusSolid, crumbSolid, crustSolid, fishScaleSolid, flatbreadSolid, gratinSolid, injeraSolid, mushroomCapSolid, pepperSolid, potatoSolid, poultrySolid, riceSolid, salmonSolid, searSolid, tomatoSolid, tunaSolid } from "./food-textures";

export type C3 = [number, number, number];
export interface TexSample {
  /** Linear albedo (for a metal, its F0). */
  a: C3;
  /** Height in mm. */
  h: number;
  /** Roughness 0–1. */
  r: number;
  /** Metalness here (patina over bronze, metal showing through rust); defaults to the record's. */
  m?: number;
  /** A crystal facet's tilt (slope in x and y): grains that glint. */
  t?: readonly [number, number];
  /** Nacre film thickness here, µm (iridescence). */
  f?: number;
  /** Scattering inside a clear material here, 0–1 (bubbles, cracks). */
  s?: number;
}
export interface TextureOptics {
  /** Subsurface scattering radius, mm (marble, snow, washi, pearl). */
  sss?: number;
  /** Clear: the renderer refracts through it (glass, ice, water, quartz). */
  transmit?: boolean;
  /** Nacre: thin-film interference, film thickness in µm. */
  thinFilm?: number;
  /** Brushed metal: highlights stretch across the brushing direction (0–1). */
  anisotropy?: number;
  /** Light scatters in a layer this deep (cloudy ice), mm. */
  scatterDepth?: number;
}
export interface MaterialTexture {
  id: string;
  recipe: string;
  note: string;
  /** Width of a tile that shows the structure well, mm. */
  extentMm: number;
  /** Diameter of a material ball, mm. */
  ballMm: number;
  /** The surface of a flat piece, x right and y up, in mm; `fw` is a pixel's footprint (mm), so detail finer than a pixel can fade to its average. */
  sample: (x: number, y: number, fw?: number) => TexSample;
  /** The material at a point inside a block (x, y, z mm): what a ball turned from it shows. Absent for skins and weaves. */
  solid?: (x: number, y: number, z: number) => TexSample;
  optics: TextureOptics;
  /** The physical facts the recipe uses (`TEXTURE_FACTS` keys). */
  facts: readonly string[];
}

export interface TextureFact { label: string; value: string; grade: Grade; source: string; url?: string }
/** Physical sizes and rates the recipes are built from. */
export const TEXTURE_FACTS: Record<string, TextureFact> = {
  "wood-erosion": { label: "Weathering erosion of softwood", value: "earlywood 58–101 µm a year, latewood 33–34 µm a year; about 6 mm a century on average", grade: "reported", source: "Williams, Knaebe & Feist, Erosion rates of wood during natural weathering, parts I–II (USDA Forest Products Laboratory); Browne 1960", url: "https://research.fs.usda.gov/treesearch/5984" },
  "wood-rings": { label: "Ring width and latewood", value: "1.5–3 mm (slow-grown hinoki), 3–6 mm (plantation sugi); sugi's latewood share is small and falls as rings widen; hinoki's rings are more uniform", grade: "estimated", source: "Widths estimated; latewood and uniformity reported in Journal of Wood Science and Hokkaido University studies", url: "https://link.springer.com/doi/10.1007/s10086-014-1426-y" },
  "tatami-weave": { label: "Tatami weave", value: "a wale (目) about 1.5 cm; 134 warp threads across a 95 cm face (JAS type 1), two to a groove; rushes about 1.4 mm, ten to a wale", grade: "reported", source: "JAANUS (tatami-me); JAS 1017:2024 table 1; rush width measured from a public-domain photograph (ten per wale) and a Fukuoka variety table", url: "https://www.aisf.or.jp/~jaanus/deta/tOri/tataminome.htm" },
  "thatch-culm": { label: "Thatch stalks", value: "Miscanthus culms 3–7 mm across, 60–200 cm long", grade: "reported", source: "GrassBase, Royal Botanic Gardens, Kew (Miscanthus sinensis)", url: "https://www.kew.org/data/grasses-db/www/imp06378.htm" },
  "bamboo-bundles": { label: "Bamboo vascular bundles", value: "about 8 per mm² in the outer culm (about 0.35 mm apart)", grade: "reported", source: "Efficiently dissecting bamboo: vascular bundles in Phyllostachys (bioRxiv preprint, 2021); 5.8–7.9 per mm² in small bamboos", url: "https://www.biorxiv.org/content/10.1101/2021.12.01.470805.full.pdf" },
  "kozo-fibre": { label: "Washi fibres", value: "kozo 6–20 mm long (average 10), 25–35 µm wide; mitsumata about 3 mm", grade: "reported", source: "University of Melbourne cultural conservation fibre database", url: "https://cultural-conservation.unimelb.edu.au/papermulberry.html" },
  "corrugated-flute": { label: "Corrugated flutes", value: "C flute 128 ± 10 per metre (about 7.8 mm pitch), 4 mm high", grade: "reported", source: "Corrugated fiberboard flute table (US standard)", url: "https://en.wikipedia.org/wiki/Corrugated_fiberboard" },
  "brick-jis": { label: "Common brick", value: "210 × 100 × 60 mm (JIS R 1250), joints about 10 mm", grade: "reported", source: "JIS R 1250 as summarised in Japanese building references; joint estimated", url: "https://www.ne.jp/asahi/yosidarenga/sapporo/pages/a1kikaku.html" },
  "sand-grain": { label: "Sand grains", value: "medium sand 0.25–0.5 mm", grade: "reported", source: "Wentworth (1922) grade scale", url: "https://en.wikipedia.org/wiki/Grain_size" },
  "granite-grain": { label: "Granite crystals", value: "medium-grained, 1–5 mm; minerals in the measured shares 25 / 35 / 27 / 13% (dark to light)", grade: "measured", source: "Shares measured from the ambientCG Granite001A colour map (CC0); grain size the textbook medium-grained range", url: "https://ambientcg.com/view?id=Granite001A" },
  "leather-grain": { label: "Leather grain", value: "pebble cells about 2 mm, finer creases about 1 mm, pores about 0.35 mm apart", grade: "estimated", source: "Estimated from the ambientCG Leather037 height map (CC0) and leather references (pores in rows for sheep, scattered for cattle)", url: "https://www.leather-dictionary.com/index.php/Leather_hair_pores_-_Hair_follicles" },
  "ambientcg": { label: "Tone, palette, grain direction", value: "luminance p10/p50/p90, structure-tensor coherence and 4-colour palettes of 16 CC0 maps", grade: "measured", source: "ambientCG (CC0) colour maps, measured in this repository", url: "https://ambientcg.com" },
};

/** Statistics measured from CC0 ambientCG colour maps (luminance p10/p50/p90 over the mean, structure-tensor coherence, palette dark → light, roughness map p10/p50/p90). */
export const TEXTURE_CALIBRATION: Record<string, { map: string; pct: readonly [number, number, number]; coherence: number; palette: readonly string[]; shares?: readonly number[]; roughness?: readonly [number, number, number] }> = {
  "wood-light": { map: "Wood022", pct: [0.835, 1.018, 1.139], coherence: 0.76, palette: ["#c09457", "#c9a46c", "#d0af7b", "#d8b684"], shares: [0.109, 0.283, 0.362, 0.247], roughness: [0.427, 0.475, 0.529] },
  "wood-mid": { map: "Wood017", pct: [0.936, 0.989, 1.091], coherence: 0.916, palette: ["#ae9673", "#b09a78", "#b39e7e", "#b7a588"], roughness: [0.624, 0.678, 0.737] },
  "wood-weathered": { map: "WoodSiding011", pct: [0.684, 0.96, 1.372], coherence: 0.346, palette: ["#554c3e", "#62574b", "#6e6257", "#7c7067"] },
  "bamboo-green": { map: "Bamboo001A", pct: [0.846, 1.006, 1.153], coherence: 0.275, palette: ["#7d7b44", "#959736", "#9fa13c", "#a8aa44"], shares: [0.026, 0.29, 0.441, 0.242], roughness: [0.424, 0.463, 0.518] },
  "bamboo-dry": { map: "Bamboo001B", pct: [0.852, 1.012, 1.142], coherence: 0.252, palette: ["#887b4b", "#a08c46", "#ab9449", "#b49c4f"], roughness: [0.475, 0.518, 0.576] },
  "bamboo-old": { map: "Bamboo001C", pct: [0.803, 0.994, 1.205], coherence: 0.413, palette: ["#73623d", "#7d6b44", "#86724a", "#907a51"], roughness: [0.478, 0.522, 0.592] },
  "tatami": { map: "Tatami001", pct: [0.848, 0.997, 1.155], coherence: 0.278, palette: ["#cbb16b", "#d5bc76", "#dec67f", "#e7d08a"], roughness: [0.627, 0.694, 0.761] },
  "tatami-new": { map: "Tatami002", pct: [0.878, 0.994, 1.129], coherence: 0.205, palette: ["#b6c868", "#bdd271", "#c4da7a", "#cbe485"], roughness: [0.624, 0.682, 0.749] },
  "thatch": { map: "ThatchedRoof001A", pct: [0.739, 0.992, 1.268], coherence: 0.774, palette: ["#5e5345", "#6a5e50", "#736759", "#7e7163"], roughness: [0.651, 0.694, 0.741] },
  "paper-washi": { map: "Paper001", pct: [0.971, 0.998, 1.031], coherence: 0.057, palette: ["#f1f0ee", "#f3f2f1", "#f6f4f3", "#f8f7f5"], roughness: [0.565, 0.631, 0.698] },
  "paper-kraft": { map: "Paper006", pct: [0.936, 0.999, 1.064], coherence: 0.07, palette: ["#9f8264", "#a38667", "#a78969", "#aa8c6d"], roughness: [0.408, 0.435, 0.471] },
  "leather": { map: "Leather037", pct: [0.983, 1.001, 1.012], coherence: 0.115, palette: ["#643728", "#633828", "#643828", "#64382a"], roughness: [0.325, 0.388, 0.486] },
  "granite": { map: "Granite001A", pct: [0.496, 0.945, 1.584], coherence: 0.022, palette: ["#7e7165", "#a68f7d", "#c0aa97", "#d9c9b9"], shares: [0.251, 0.351, 0.273, 0.125], roughness: [0.012, 0.039, 0.098] },
  "plaster-white": { map: "Plaster002", pct: [0.916, 1.001, 1.082], coherence: 0.186, palette: ["#d0ccc8", "#d7d3d0", "#ddd9d6", "#e3e0dc"], roughness: [0.443, 0.549, 0.651] },
  "roof-tile-grey": { map: "RoofingTiles015A", pct: [0.855, 1.003, 1.14], coherence: 0.142, palette: ["#5f545a", "#64595f", "#685d63", "#6e6369"], roughness: [0.412, 0.494, 0.588] },
  "rust": { map: "Metal013", pct: [0.678, 0.945, 1.369], coherence: 0.094, palette: ["#655a53", "#77695d", "#897768", "#a09283"], roughness: [0.333, 0.431, 0.549] },
};

// ---- Helpers --------------------------------------------------------------------------------------------------------------------

const dec = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lin = (hex: string): C3 => [1, 3, 5].map(i => dec(parseInt(hex.slice(i, i + 2), 16) / 255)) as C3;
const mix = (a: readonly number[], b: readonly number[], t: number): C3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a: readonly number[], k: number): C3 => [a[0] * k, a[1] * k, a[2] * k];
const sst = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const frac = (x: number) => x - Math.floor(x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const gauss = (x: number, s: number) => Math.exp(-(x * x) / (s * s));
const lumOf = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** A palette (dark → light) scaled so its mean equals the record's albedo: measured hue structure, the record's level. */
function paletteFor(m: MaterialRecord, hexes: readonly string[]): C3[] {
  const p = hexes.map(lin), n = p.length, mean = [0, 1, 2].map(c => p.reduce((s, x) => s + x[c], 0) / n);
  return p.map(c => [0, 1, 2].map(k => c[k] * m.albedo[k] / Math.max(1e-4, mean[k])) as C3);
}
/** A colour along a palette, t in 0–1, extrapolating gently beyond the ends. */
function pick(pal: C3[], t: number): C3 {
  const x = t * (pal.length - 1);
  if (x <= 0) return mul(pal[0], Math.max(0.4, 1 + x * 0.25));
  if (x >= pal.length - 1) return mul(pal[pal.length - 1], Math.min(1.4, 1 + (x - pal.length + 1) * 0.25));
  const i = Math.floor(x);
  return mix(pal[i], pal[i + 1], x - i);
}
/** Four independent 0–1 values from one cell (two 32-bit hashes split into 16-bit halves): cheaper than four hash2 calls. */
function hash4(seed: number, x: number, y: number): [number, number, number, number] {
  const a = Math.floor(hash2(seed, x, y) * 4294967296), b = Math.floor(hash2(seed + 977, x, y) * 4294967296);
  return [(a & 0xffff) / 65536, (a >>> 16) / 65536, (b & 0xffff) / 65536, (b >>> 16) / 65536];
}
/** Distance to the nearest edge of a Voronoi cell network (cracks, creases), in the noise's units. */
const edge = (w: { f1: number; f2: number }) => (w.f2 - w.f1) * 0.5;

// ---- Wood: a log, cut ------------------------------------------------------------------------------------------------------------

interface WoodSpec {
  palette: readonly string[];
  /** Mean ring width, mm; year-to-year variation (lognormal σ); extra width near the pith. */
  ringMm: number; ringCv: number; juvenile: number;
  /** Latewood share of a ring and the width of the earlywood→latewood transition (share of the ring; small = abrupt). */
  latewood: number; transition: number;
  /** How much darker latewood is (0–1). */
  contrast: number;
  /** Cut: 0 flat-sawn (plain, itame), 90 quarter-sawn (masame); the face's distance from the pith, mm. */
  cutDeg: number; pithMm: number;
  /** Grain slope (the board against the stem's taper), radius change per mm along the board. */
  slope: number;
  /** Ring wobble, mm. */
  wobble: number;
  /** Knots on a 160 mm face, their radius range (mm), and the share that are dead (encased, with a bark ring). */
  knots: number; knotMm: readonly [number, number]; deadShare: number;
  /** Fibre streak strength. */
  figure: number;
  /** Heartwood inside this radius (mm), tinted. */
  heart?: { radiusMm: number; tint: C3 };
  /** Years outdoors (grey, eroded, checked). */
  weatheredYears?: number;
}
interface Knot { cx: number; cy: number; cz: number; bx: number; by: number; bz: number; reach: number; r: number; dead: boolean; deadAt: number }

function woodSolid(m: MaterialRecord, seed: number, s: WoodSpec): (x: number, y: number, z: number) => TexSample {
  const pal = paletteFor(m, s.palette), early = mix(pal[2], pal[3], 0.6), lateBase = mix(pal[0], mul(pal[0], 0.55), s.contrast);
  const rough = m.roughness.typical;
  // Ring radii: lognormal widths with year-to-year memory (AR(1), φ 0.55) and wider juvenile rings near the pith.
  const g = gaussianStream(seed * 7919 + 13), radii: number[] = [0];
  let e = 0;
  for (let n = 0; n < 900 && radii[radii.length - 1] < 1200; n++) {
    e = 0.55 * e + Math.sqrt(1 - 0.55 * 0.55) * g();
    radii.push(radii[radii.length - 1] + s.ringMm * (1 + s.juvenile * Math.exp(-n / 9)) * Math.exp(s.ringCv * e - s.ringCv * s.ringCv / 2));
  }
  const ringAt = (rho: number) => {
    let lo = 0, hi = radii.length - 2;
    if (rho <= 0) return { n: 0, p: 0 };
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (radii[mid] <= rho) lo = mid; else hi = mid - 1; }
    return { n: lo, p: Math.min(1, (rho - radii[lo]) / (radii[lo + 1] - radii[lo])) };
  };
  const cut = (s.cutDeg * Math.PI) / 180, py0 = -s.pithMm * Math.sin(cut), pz0 = -s.pithMm * Math.cos(cut);
  const pith = (x: number): [number, number] => [py0 + 3.5 * Math.sin(x / 410 + seed) + 1.2 * Math.sin(x / 137 + 2 * seed), pz0 + 2.5 * Math.sin(x / 530 + 3 * seed)];
  // Knots: branches from the pith through points on the face, angled up the stem (62–80° from its axis).
  const knots: Knot[] = [];
  for (let k = 0; k < s.knots; k++) {
    const fx = (hash2(seed, k, 1) - 0.5) * 150, fy = (hash2(seed, k, 2) - 0.5) * 120, [py, pz] = pith(fx);
    const reach = Math.hypot(fy - py, -pz), ang = ((62 + hash2(seed, k, 3) * 18) * Math.PI) / 180, back = reach / Math.tan(ang);
    const cx = fx - back, dx = fx - cx, dy = fy - py, dz = -pz, l = Math.hypot(dx, dy, dz);
    knots.push({ cx, cy: py, cz: pz, bx: dx / l, by: dy / l, bz: dz / l, reach: l, r: s.knotMm[0] + hash2(seed, k, 4) * (s.knotMm[1] - s.knotMm[0]), dead: hash2(seed, k, 5) < s.deadShare, deadAt: 0.55 + hash2(seed, k, 6) * 0.3 });
  }
  const lateRate = 0.034, earlyRate = 0.07; // mm a year (TEXTURE_FACTS wood-erosion; a sugi-like softwood)
  const wpal = paletteFor({ ...m }, TEXTURE_CALIBRATION["wood-weathered"].palette);
  return (x, y, z) => {
    const [py, pz] = pith(x), dy = y - py, dz = z - pz, rho = Math.hypot(dy, dz), th = Math.atan2(dz, dy);
    const cr = Math.cos(th) * 2.2, sr = Math.sin(th) * 2.2;
    let rhoE = rho + s.slope * x + s.wobble * (fbm3(seed + 1, cr, sr, x / 260, 3) * (0.5 + rho / (rho + 60)) + 0.35 * fbm3(seed + 2, cr * 4, sr * 4, x / 70, 2) + 0.12 * fbm3(seed + 3, cr * 12, sr * 12, x / 18, 2));
    let knotBody = 0, knotRing = 0, bark = 0;
    for (const k of knots) {
      const qx = x - k.cx, qy = y - k.cy, qz = z - k.cz, sAlong = qx * k.bx + qy * k.by + qz * k.bz;
      if (sAlong < 0) continue;
      const ox = qx - sAlong * k.bx, oy = qy - sAlong * k.by, oz = qz - sAlong * k.bz, q = Math.hypot(ox, oy, oz);
      const grow = Math.sqrt(Math.min(1, sAlong / k.reach)), rNow = k.r * (k.dead ? Math.min(grow, Math.sqrt(k.deadAt)) : grow);
      // the stem's rings bulge round the branch base: contours close round the knot ("eyes")
      rhoE -= s.ringMm * 3.4 * gauss(q, rNow * 2.8 + 2) * sst(0, k.reach * 0.3, sAlong);
      if (q < rNow * 1.04) { knotBody = Math.max(knotBody, sst(rNow * 1.04, rNow * 0.9, q)); knotRing = frac(q / Math.max(0.55, rNow / 5)); }
      if (k.dead && sAlong > k.reach * k.deadAt) bark = Math.max(bark, gauss(q - rNow, 0.45));
    }
    const { n, p } = ringAt(rhoE);
    const tr = s.transition, lw = s.latewood * (0.65 + 0.7 * hash2(seed, n, 13));
    let dens = sst(1 - lw - tr, 1 - lw, p) * (1 - sst(0.985, 1, p)) + 0.18 * p * (1 - lw);
    const yearDark = 0.75 + 0.5 * hash2(seed, n, 9), yearTone = 1 + 0.05 * (hash2(seed, n, 11) - 0.5);
    let a = mix(mul(early, yearTone), lateBase, Math.min(1, dens * yearDark));
    if (s.heart && rho < s.heart.radiusMm) a = mix(a, [a[0] * s.heart.tint[0], a[1] * s.heart.tint[1], a[2] * s.heart.tint[2]], sst(s.heart.radiusMm, s.heart.radiusMm - 4, rho));
    // fibres: fine streaks along the grain, coarser figure
    const fib = fbm3(seed + 7, x / 14, dy / 0.22, dz / 0.22, 2) * 0.05 + fbm3(seed + 8, x / 90, dy / 3.5, dz / 3.5, 2) * s.figure + fbm3(seed + 9, x / 4, dy / 0.08, dz / 0.08, 1) * 0.025;
    a = mul(a, 1 + fib);
    let h = dens * 0.004 + fib * 0.01, r = rough + 0.06 - dens * 0.12;
    if (knotBody > 0) {
      const kd = mix(mul(lateBase, 0.72), [lateBase[0] * 0.55, lateBase[1] * 0.42, lateBase[2] * 0.32], 0.5);
      a = mix(a, mul(kd, 1.15 - 0.4 * sst(0.55, 0.92, knotRing)), knotBody); r -= 0.1 * knotBody; dens = Math.max(dens, knotBody * 0.8);
    }
    if (bark > 0) { a = mix(a, mul(lateBase, 0.25), bark * 0.9); h -= bark * 0.08; }
    if (s.weatheredYears) {
      const yrs = s.weatheredYears;
      // greying: UV breaks down lignin and rain leaches it; latewood ridges stay lighter, earlywood troughs hold grime
      a = mix(pick(wpal, 0.35 + 0.55 * dens + fib * 3), mul(wpal[0], 0.5), 0.6 * sst(0.05, 0.7, fbm3(seed + 21, x / 140, dy / 9, dz / 9, 3) + 0.25));
      h = -yrs * (earlyRate * (1 - dens) + lateRate * dens) + fbm3(seed + 23, x / 6, dy / 0.4, dz / 0.4, 2) * 0.05;
      // checks: cracks along the grain, opening on the ray planes
      const arc = th * Math.max(rho, 1), ck = Math.abs(gradNoise(seed + 25, x / 210, arc / 2.6 + 0.6 * fbm(seed + 26, x / 90, arc / 14, 2)));
      const open = sst(0.12, 0.3, fbm(seed + 27, x / 80 + 3, arc / 30, 2)), check = sst(0.05, 0.012, ck) * open;
      a = mul(a, 1 - 0.65 * check); h -= check * 0.9; r = 0.86 - 0.08 * dens;
    }
    return { a, h, r: Math.min(1, Math.max(0.05, r)) };
  };
}

// ---- Bamboo culm ------------------------------------------------------------------------------------------------------------------

function bambooSurface(m: MaterialRecord, seed: number, kind: "green" | "dry" | "smoked"): (x: number, y: number) => TexSample {
  const pal = paletteFor(m, TEXTURE_CALIBRATION[m.id]?.palette ?? TEXTURE_CALIBRATION["bamboo-dry"].palette), rough = m.roughness.typical;
  const nodeAt = (y: number) => 8 + Math.round((y - 8) / 300) * 300; // internodes about 30 cm (madake)
  return (x, y) => {
    const yn = y - nodeAt(y), side = Math.round((y - 8) / 300) & 1;
    const ridge = gauss(yn - 1.4, 1.5), scar = gauss(yn + 1.8, 0.42), above = yn > 2;
    // the sulcus: a shallow groove above the branch, on alternate sides of the culm at each node
    const sx = side ? 22 : -22, sul = above ? gauss(x - sx, 7) * sst(2, 14, yn) : 0;
    const bundles = fbm(seed, x / 0.36, y / 55, 2), streak = fbm(seed + 1, x / 4.5, y / 160, 3), tone = fbm(seed + 2, x / 30, y / 260, 3);
    let a = pick(pal, 0.62 + streak * 0.8 + tone * 0.85 + bundles * 0.15);
    let r = rough + ridge * 0.04;
    const h = ridge * 1.0 - scar * 0.3 - sul * 0.45 + bundles * 0.004;
    a = mix(a, mul(pal[0], kind === "green" ? 0.62 : 0.55), scar * 0.85);
    if (kind === "green") {
      // white wax bloom in a band under the node, rubbed patchy
      const bloom = sst(-2.5, -4, yn) * sst(-16, -6, yn) * (0.55 + 0.45 * sst(-0.4, 0.3, fbm(seed + 4, x / 25, y / 12, 3)));
      a = mix(a, [0.4, 0.43, 0.39], bloom * 0.25); r += bloom * 0.2;
    }
    if (kind === "dry") {
      const fleck = worley(seed + 5, x / 0.9, y / 2.2, 1);
      if (fleck.id < 0.035 && fleck.f1 < 0.3) a = mul(a, 0.7);
    }
    if (kind === "smoked") {
      // susudake: smoke-browned unevenly, darkest by the nodes; ropes that bound the culm left lighter twisted bands
      const smoke = sst(-0.3, 0.45, warpedFbm(seed + 6, x / 30, y / 160, 1.1, 4) + 0.35 * gauss(yn, 30) + 0.12 * fbm(seed + 7, x / 3, y / 90, 2));
      a = mix(a, mul(pal[0], 0.55), smoke * 0.5);
      const band = Math.floor((y + 1000) / 85), bc = band * 85 - 1000 + 30 + hash2(seed, band, 1) * 25, wR = 7 + hash2(seed, band, 2) * 5;
      if (hash2(seed, band, 3) < 0.55) {
        const inBand = sst(wR, wR - 1.5, Math.abs(y - bc)), twist = 0.5 + 0.5 * Math.sin(((x * 0.85 + (y - bc)) / 2.1) * Math.PI * 2);
        a = mix(a, mul(pal[3], 1.05), inBand * (0.45 + 0.25 * twist));
      }
    }
    return { a, h, r: Math.min(1, Math.max(0.05, r)) };
  };
}

// ---- Tatami: igusa woven on warp threads ---------------------------------------------------------------------------------------

function tatamiSurface(m: MaterialRecord, seed: number, wear: number): (x: number, y: number, fw?: number) => TexSample {
  const pal = paletteFor(m, (TEXTURE_CALIBRATION[m.id] ?? TEXTURE_CALIBRATION.tatami).palette), rough = m.roughness.typical;
  const pitch = 1.42, wale = 14.2; // TEXTURE_FACTS tatami-weave
  const warp = lin("#d8cfb6");
  return (x, y, fw = 0) => {
    // the rushes run up the tile (across the mat); each is a slightly meandering stem; below a pixel they fade to their average
    const see = sst(pitch / 4.5, pitch / 7, fw), keep = 0.45 + 0.55 * see;
    const xm = x + 0.28 * fbm(seed, x / 50, y / 22, 2), j = Math.floor(xm / pitch), u = frac(xm / pitch);
    const round = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 3)), 0.5), soft = 0.5 - 0.5 * Math.cos(2 * Math.PI * u), prof = 0.7 + keep * ((soft + see * (round - soft)) - 0.7);
    const b = Math.floor(y / wale), v = frac(y / wale);
    const pillow = Math.pow(Math.sin(Math.PI * v), 0.45);
    // in the groove the two warp threads cross: one passes over this rush, the other under; it alternates rush by rush
    const over = ((j + b) & 1) === 0, gd = Math.min(v, 1 - v) * wale, groove = gauss(gd, 0.75);
    const pinch = groove * (0.72 + see * ((over ? 1 : 0.45) - 0.72)), thread = over ? see * gauss(gd, 0.22) * sst(0.15, 0.4, prof) : 0;
    const t = 0.45 + see * (hash2(seed, j, 3) * 0.6 + hash2(seed, j, 5) * 0.3 + fbm(seed + 3, j * 0.37, y / 38, 2) * 0.45 - 0.45) + fbm(seed + 4, x / 30, y / 60, 2) * 0.2;
    let a = mul(pick(pal, 0.12 + t), 0.92 + 0.08 * prof);
    let h = 0.12 * prof + 0.45 * pillow - 0.45 * pinch, r = rough + 0.06 - 0.16 * prof ** 6;
    // a rush's darker spots
    const spot = worley(seed + 7, xm / 1.4, y / 6, 1);
    if (spot.id < 0.03) a = mul(a, 0.8);
    a = mul(a, 1 - 0.32 * pinch);
    if (thread > 0.05) { a = mix(a, mul(warp, 0.5), thread * 0.22); h = Math.max(h, -0.32 + thread * 0.06); }
    if (wear > 0) {
      // worn rushes: browned, rubbed pale and frayed where feet pass
      const wm = sst(0.15, 0.55, fbm(seed + 9, x / 70, y / 55, 3) + 0.25 * wear);
      a = mix(a, mul(pal[0], 0.82), wm * wear * 0.8);
      const fray = sst(0.6, 0.75, fbm(seed + 11, x / 9, y / 4, 3) + wm * 0.3) * wear;
      if (fray > 0) { const fib = 0.5 + 0.5 * fbm(seed + 13, x / 0.25, y / 3, 2); a = mix(a, mul(pal[3], 1.08 + 0.2 * fib), fray * 0.7); h *= 1 - 0.6 * fray; r += fray * 0.15; }
    }
    return { a, h, r: Math.min(1, Math.max(0.05, r)) };
  };
}

// ---- Thatch: cut stalk ends ---------------------------------------------------------------------------------------------------

function thatchSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  // Each stalk lies at a shallow angle to the roof: its cut end stands out at the bottom and its body sinks up-slope
  // under the stalks above. Diameters 3–7 mm (TEXTURE_FACTS thatch-culm); visible lengths several times that.
  const pal = paletteFor(m, TEXTURE_CALIBRATION.thatch.palette), cx = 4.2, cy = 9, per = 3, Lmax = 56;
  const deep = mul(pal[0], 0.16), rows = Math.ceil(Lmax / cy);
  return (x, y) => {
    let best = -1e9, a: C3 = deep, r = 0.95;
    const ix0 = Math.floor(x / cx), iy0 = Math.floor(y / cy);
    for (let jy = iy0 - rows; jy <= iy0 + 1; jy++) for (let jx = ix0 - 2; jx <= ix0 + 2; jx++) for (let k = 0; k < per; k++) {
      const [s1, s2, s3, s4] = hash4(seed + k * 31, jx, jy);
      const x0 = (jx + s1) * cx, d = 3 + s3 * 4, half = d / 2;
      if (Math.abs(x - x0) > half + 4) continue;
      const y0 = (jy + s2) * cy, dyEnd = y - y0;
      if (dyEnd > Lmax || dyEnd < -half * 1.2) continue;
      const [s5, s6, s7, s8] = hash4(seed + k * 31 + 5, jx, jy);
      const L = 22 + s5 * (Lmax - 22), dx = x - (x0 + (s6 - 0.5) * 0.12 * dyEnd);
      if (Math.abs(dx) >= half || dyEnd > L) continue;
      const across = Math.sqrt(1 - (dx / half) ** 2), endLen = half * 1.15, dip = 0.12 + s7 * 0.1, z0 = s4 * 7;
      let hh: number, isEnd = false;
      if (dyEnd >= 0) hh = z0 - dyEnd * dip + across * half * 0.8;
      else { if (-dyEnd > endLen * across) continue; hh = z0 + across * half * 0.8 + dyEnd * 0.9; isEnd = true; }
      if (hh <= best) continue;
      best = hh;
      if (isEnd) {
        // the cut face: paler, a darker rim, and a hollow in reed-like stalks
        const rr = Math.hypot(dx / half, (dyEnd + endLen * 0.5) / (endLen * 0.55)), hollow = s8 > 0.6 && rr < 0.4;
        a = hollow ? mul(pal[0], 0.28) : mul(pick(pal, 1.2 + s8 * 0.6), 1.25 - 0.35 * sst(0.6, 1, rr));
        r = 0.9;
      } else {
        const streak = fbm(seed + 8, dx * 1.4 + jx * 7.3, y / 14, 2), age = clamp01(dyEnd / L);
        a = mul(pick(pal, 0.55 + s8 * 0.75 + streak * 0.3), (1.05 - 0.3 * age) * (0.86 + 0.14 * across));
        r = 0.72 - 0.08 * across;
      }
    }
    if (best === -1e9) return { a: deep, h: -6 + fbm(seed + 9, x / 3, y / 3, 2), r: 0.98 };
    return { a, h: best, r };
  };
}

// ---- Paper ----------------------------------------------------------------------------------------------------------------------

function paperSurface(m: MaterialRecord, seed: number, o: { fibreMm: number; fibres: number; fibreWidth: number; formation: number; flecks: number; tooth: number; chiri?: number }): (x: number, y: number) => TexSample {
  const base = m.albedo, cs = o.fibreMm;
  return (x, y) => {
    const floc = fbm(seed, x / 6, y / 6, 4) * o.formation + fbm(seed + 1, x / 1.6, y / 1.6, 2) * o.formation * 0.45;
    let fib = 0;
    const cx = Math.floor(x / cs), cy = Math.floor(y / cs);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) for (let k = 0; k < o.fibres; k++) {
      const gx = cx + i, gy = cy + j, sd = seed + k * 7, px = (gx + hash2(sd, gx, gy)) * cs, py = (gy + hash2(sd + 1, gx, gy)) * cs;
      const ang = hash2(sd + 2, gx, gy) * Math.PI, len = cs * (0.55 + hash2(sd + 3, gx, gy) * 0.9), bend = (hash2(sd + 4, gx, gy) - 0.5) * 0.25;
      const dx = Math.cos(ang), dy = Math.sin(ang), t = (x - px) * dx + (y - py) * dy;
      if (Math.abs(t) > len / 2) continue;
      const nrm = -(x - px) * dy + (y - py) * dx - bend * (t * t) / len, w = o.fibreWidth * (0.6 + hash2(sd + 5, gx, gy));
      fib = Math.max(fib, gauss(nrm, w) * (1 - (2 * t / len) ** 6));
    }
    let a = mul(base, 1 + floc + fib * o.formation * 2);
    if (o.flecks > 0) {
      const fl = worley(seed + 3, x / 0.8, y / 2.6, 1);
      if (fl.id < o.flecks && fl.f1 < 0.32) a = mul(a, fl.id < o.flecks / 2 ? 0.86 : 1.08);
    }
    if (o.chiri) { const c = worley(seed + 5, x / 9, y / 3.5, 1); if (c.id < o.chiri) { const fl = sst(0.09, 0.03, c.f1 + 0.04 * fbm(seed + 6, x * 3, y * 3, 2)); a = mix(a, [0.16, 0.11, 0.07], fl * 0.75); } }
    const tooth = worley(seed + 7, x / 0.75, y / 0.75, 1), felt = fbm(seed + 8, x / 0.35, y / 0.35, 2);
    return { a, h: (1 - tooth.f1) * o.tooth + felt * o.tooth * 0.4 + floc * 0.6 + fib * 0.035, r: m.roughness.typical + (1 - tooth.f1) * 0.05 };
  };
}

// ---- Leather ----------------------------------------------------------------------------------------------------------------------

function leatherSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  const rough = TEXTURE_CALIBRATION.leather.roughness ?? [0.33, 0.39, 0.49];
  return (x, y) => {
    const wx = x + 0.45 * fbm(seed + 1, x / 3, y / 3, 2), wy = y + 0.45 * fbm(seed + 2, x / 3 + 7, y / 3, 2);
    const w1 = worley(seed, wx / 2.1, wy / 2.1, 0.95), e1 = edge(w1) * 2.1, w2 = worley(seed + 5, wx / 0.85, wy / 0.85, 0.9), e2 = edge(w2) * 0.85;
    const crease = gauss(e1, 0.1), fine = gauss(e2, 0.05) * 0.6, dome = clamp01(1 - (w1.f1 * w1.f1) * 0.9);
    const pw = worley(seed + 9, x / 0.36, y / 0.36, 0.95), pore = pw.id < 0.55 ? sst(0.16, 0.1, pw.f1) : 0;
    const tone = 1 + fbm(seed + 11, x / 14, y / 14, 3) * 0.03 + (w1.id - 0.5) * 0.015;
    return { a: mul(m.albedo, tone * (1 - 0.035 * crease - 0.015 * fine - 0.06 * pore + 0.012 * dome)), h: 0.05 * dome - 0.09 * crease - 0.03 * fine - 0.035 * pore, r: rough[0] + 0.15 * crease + 0.05 * fine - 0.02 * dome };
  };
}

// ---- Grass from above ---------------------------------------------------------------------------------------------------------

function grassSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  const g = m.albedo, pal: C3[] = [mul(g, 0.5), mul(g, 0.95), mix(mul(g, 1.25), [0.2, 0.26, 0.05], 0.3), mix(g, [0.32, 0.3, 0.11], 0.55)];
  const soil: C3 = [0.045, 0.032, 0.02], cs = 3.2;
  return (x, y) => {
    let top = -1, a: C3 = soil, r = 0.95;
    const cx = Math.floor(x / cs), cy = Math.floor(y / cs);
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) for (let k = 0; k < 3; k++) {
      const gx = cx + i, gy = cy + j, sd = seed + k * 13, [h1, h2, h3, h4] = hash4(sd, gx, gy), px = (gx + h1) * cs, py = (gy + h2) * cs;
      if (Math.abs(x - px) > 10 || Math.abs(y - py) > 10) continue;
      const ang = h3 * Math.PI * 2, len = 4 + h4 * 6, curl = (hash2(sd + 4, gx, gy) - 0.5) * 0.18;
      const dx = Math.cos(ang), dy = Math.sin(ang), t = (x - px) * dx + (y - py) * dy;
      if (t < 0 || t > len) continue;
      const nrm = -(x - px) * dy + (y - py) * dx - curl * t * t / len, wdt = 1.1 * (1 - (t / len) ** 2) + 0.08;
      if (Math.abs(nrm) > wdt) continue;
      const hgt = 4 + hash2(sd + 5, gx, gy) * 26 + (t / len) * 6 * (1 - Math.abs(nrm) / wdt);
      if (hgt <= top) continue;
      top = hgt;
      const dead = hash2(sd + 6, gx, gy) < 0.06, tone = hash2(sd + 7, gx, gy) * 0.6 + (t / len) * 0.4;
      a = dead ? mul(pal[3], 0.9 + 0.3 * tone) : mul(pick(pal, 0.15 + tone * 0.7), 0.45 + 0.55 * (hgt / 36));
      r = 0.55 + 0.25 * Math.abs(nrm) / wdt;
    }
    return { a, h: top < 0 ? 0 : top * 0.25, r };
  };
}

// ---- Stone, ceramic, earth ---------------------------------------------------------------------------------------------------

function graniteSolid(m: MaterialRecord, seed: number): (x: number, y: number, z: number) => TexSample {
  const cal = TEXTURE_CALIBRATION.granite, pal = paletteFor(m, cal.palette), shares = cal.shares ?? [0.25, 0.25, 0.25, 0.25];
  const cum = shares.map((_, i) => shares.slice(0, i + 1).reduce((s, v) => s + v, 0));
  const mica: C3 = [0.018, 0.016, 0.015], rough = m.roughness.typical;
  return (x, y, z) => {
    // crystals grow into each other: irregular (warped) boundaries, large feldspars among smaller quartz and mica
    const wx = x + 0.9 * fbm3(seed + 11, x / 2.5, y / 2.5, z / 2.5, 2), wy = y + 0.9 * fbm3(seed + 12, x / 2.5 + 3, y / 2.5, z / 2.5, 2), wz = z + 0.9 * fbm3(seed + 13, x / 2.5, y / 2.5 + 5, z / 2.5, 2);
    const big = worley3(seed, wx / 4.6, wy / 4.6, wz / 4.6, 1), small = worley3(seed + 5, wx / 1.7, wy / 1.7, wz / 1.7, 1);
    const useBig = big.id > 0.62, w = useBig ? big : small, cid = Math.floor(w.id * 1e6);
    let k = useBig ? (big.id > 0.86 ? 3 : big.id > 0.74 ? 2 : 1) : Math.max(0, cum.findIndex(c => small.id <= c));
    if (k < 0) k = 3;
    const cleave = 0.5 + 0.5 * Math.sin((x * Math.cos(w.id * 40) + y * Math.sin(w.id * 40) + z * 0.3) / 0.3);
    let a = mul(pal[k], 0.9 + 0.12 * cleave * (k > 0 ? 1 : 0.25) + fbm3(seed + 9, x / 0.6, y / 0.6, z / 0.6, 2) * 0.08 + (hash2(seed, cid, 5) - 0.5) * 0.12);
    let r = rough * (k === 0 ? 0.7 : 1);
    const fine = worley3(seed + 7, wx / 0.9, wy / 0.9, wz / 0.9, 0.9), isMica = !useBig && fine.id < 0.09;
    if (isMica) { a = mul(mica, 1 + fine.id * 6); r = rough * 0.5; k = -1; }
    const tilt = isMica ? 0.25 : 0.04;
    return { a, h: -sst(0.08, 0, edge(w)) * 0.01, r, t: [(hash2(seed, cid, 1) - 0.5) * tilt, (hash2(seed, cid, 2) - 0.5) * tilt] };
  };
}

function marbleSolid(m: MaterialRecord, seed: number): (x: number, y: number, z: number) => TexSample {
  const vein: C3 = [0.28, 0.29, 0.31];
  return (x, y, z) => {
    const wx = x / 70 + 0.9 * fbm3(seed + 1, x / 90, y / 90, z / 90, 3), wy = y / 70 + 0.9 * fbm3(seed + 2, x / 90 + 5, y / 90, z / 90, 3), wz = z / 70;
    const f1 = fbm3(seed, wx, wy, wz, 5), v1 = gauss(f1, 0.022) + 0.35 * gauss(f1, 0.08);
    const f2 = fbm3(seed + 7, wx * 3.1, wy * 3.1, wz * 3.1, 4), v2 = gauss(f2, 0.012) * sst(-0.2, 0.4, fbm3(seed + 8, x / 60, y / 60, z / 60, 2));
    const cloud = fbm3(seed + 3, x / 35, y / 35, z / 35, 4) * 0.045;
    return { a: mix(mul(m.albedo, 1 + cloud), vein, Math.min(0.85, 0.7 * v1 + 0.45 * v2)), h: 0, r: m.roughness.typical };
  };
}

function slateSolid(m: MaterialRecord, seed: number): (x: number, y: number, z: number) => TexSample {
  return (x, y, z) => {
    const layer = z + 0.6 * fbm3(seed, x / 50, y / 50, z / 20, 3), step = Math.floor(layer / 0.9), ripple = fbm3(seed + 1, x / 7, y / 32, z / 4, 3);
    const dust = sst(0.1, 0.6, fbm3(seed + 2, x / 25, y / 25, z / 25, 3)), rusty = worley3(seed + 3, x / 9, y / 9, z / 9, 1);
    let a = mul(m.albedo, 1 + ripple * 0.12 + (hash2(seed, step, 1) - 0.5) * 0.12 + dust * 0.35);
    if (rusty.id < 0.02 && rusty.f1 < 0.3) a = mix(a, [0.16, 0.07, 0.03], 0.7);
    return { a, h: ripple * 0.12 + step * 0.05, r: m.roughness.typical - 0.08 * (1 - dust) };
  };
}

/** Loose grains of a few minerals (sand, salt, snow): rounded caps with shadowed gaps between, facets that glint. */
function grainSurface(m: MaterialRecord, seed: number, o: { grainMm: number; minerals: readonly (readonly [C3, number])[]; gap: number; tilt: number; relief: number; under?: number }): (x: number, y: number) => TexSample {
  const cum = o.minerals.map((_, i) => o.minerals.slice(0, i + 1).reduce((s, v) => s + v[1], 0)), g = o.grainMm, under = mul(m.albedo, o.under ?? 0.25);
  return (x, y) => {
    // two layers of grains, the upper ones resting on the lower
    let best = -1e9, a: C3 = under, t: [number, number] = [0, 0];
    for (let layer = 0; layer < 2; layer++) {
      const sc = layer ? g * 0.8 : g, ox = layer ? 0.37 * g : 0, cx = Math.floor((x + ox) / sc), cy = Math.floor((y + ox) / sc);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const [r1, r2, r3, r4] = hash4(seed + layer * 101, cx + i, cy + j);
        const px = (cx + i + 0.2 + 0.6 * r1) * sc - ox, py = (cy + j + 0.2 + 0.6 * r2) * sc - ox, rad = sc * (0.32 + 0.2 * r3) * (1 - o.gap * 0.25);
        const ex = 1 + (r4 - 0.5) * 0.5, dx = (x - px) * ex, dy = (y - py) / ex, d2 = dx * dx + dy * dy;
        if (d2 >= rad * rad) continue;
        const cap = Math.sqrt(rad * rad - d2), hh = cap * o.relief * 2 + (layer ? 0 : rad * 0.6);
        if (hh <= best) continue;
        best = hh;
        const [q1, q2, q3] = hash4(seed + 7 + layer * 101, cx + i, cy + j), k = Math.max(0, cum.findIndex(c => q1 <= c)), col = o.minerals[k][0];
        a = mul([col[0] * m.albedo[0], col[1] * m.albedo[1], col[2] * m.albedo[2]], 0.82 + 0.36 * q2);
        t = [(q3 - 0.5) * o.tilt, (q2 - 0.5) * o.tilt];
      }
    }
    if (best === -1e9) return { a: under, h: -0.1 * g, r: 0.95 };
    return { a, h: best, r: m.roughness.typical, t };
  };
}

/** Table salt: cubes of 0.3–0.7 mm lying at random, their flat faces lit or shaded as they tilt. */
function saltSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  const under = mul(m.albedo, 0.5);
  return (x, y) => {
    let best = -1e9, a: C3 = under, t: [number, number] = [0, 0], r = 0.9;
    for (let layer = 0; layer < 2; layer++) {
      const sc = layer ? 0.55 : 0.7, ox = layer ? 0.31 : 0, cx = Math.floor((x + ox) / sc), cy = Math.floor((y + ox) / sc);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const [r1, r2, r3, r4] = hash4(seed + layer * 71, cx + i, cy + j);
        const px = (cx + i + 0.25 + 0.5 * r1) * sc - ox, py = (cy + j + 0.25 + 0.5 * r2) * sc - ox, half = sc * (0.24 + 0.14 * r3), ang = r4 * Math.PI / 2;
        const u = (x - px) * Math.cos(ang) + (y - py) * Math.sin(ang), v = -(x - px) * Math.sin(ang) + (y - py) * Math.cos(ang), cheb = Math.max(Math.abs(u), Math.abs(v));
        if (cheb >= half) continue;
        const bevel = sst(half, half * 0.82, cheb), h0 = half * (0.9 + (layer ? 0 : 0.5)) * (0.85 + 0.15 * bevel);
        if (h0 <= best) continue;
        best = h0;
        const [q1, q2, q3] = hash4(seed + 13 + layer * 71, cx + i, cy + j);
        a = mul(m.albedo, (0.75 + 0.25 * q3) * (0.8 + 0.2 * bevel));
        t = [(q1 - 0.5) * 0.7, (q2 - 0.5) * 0.7];
        r = 0.18 + 0.5 * (1 - bevel);
      }
    }
    if (best === -1e9) return { a: under, h: -0.1, r: 0.95 };
    return { a, h: best, r, t };
  };
}

function concreteSolid(m: MaterialRecord, seed: number): (x: number, y: number, z: number) => TexSample {
  return (x, y, z) => {
    const skin = fbm3(seed, x / 55, y / 55, z / 55, 4) * 0.12 + fbm3(seed + 1, x / 9, y / 9, z / 9, 3) * 0.04 + sst(0.3, 0.7, fbm3(seed + 4, x / 120, y / 30, z / 120, 3)) * 0.06;
    const sand = worley3(seed + 2, x / 0.7, y / 0.7, z / 0.7, 1), air = worley3(seed + 3, x / 7, y / 7, z / 7, 1);
    const rv = 0.06 + air.id * 0.2, pit = air.id < 0.22 ? sst(rv, rv * 0.7, air.f1) : 0;
    return { a: mul(m.albedo, (1 + skin + (sand.id - 0.5) * 0.06) * (1 - 0.6 * pit)), h: skin * 0.4 + (1 - sand.f1) * 0.03 - pit * 1.2, r: m.roughness.typical - 0.05 * (sand.id - 0.5) };
  };
}

function asphaltSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  // dense-graded mix: stones of 2–13 mm, their tops worn grey and smooth, black binder and fines between
  return (x, y) => {
    let best = -1e9, a: C3 = mul(m.albedo, 0.75), r = 0.42, hh = -0.6;
    for (let layer = 0; layer < 3; layer++) {
      const sc = [9, 5, 2.6][layer], cx = Math.floor(x / sc), cy = Math.floor(y / sc);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const [r1, r2, r3, r4] = hash4(seed + layer * 53, cx + i, cy + j);
        if (r4 < 0.15) continue;
        const px = (cx + i + 0.2 + 0.6 * r1) * sc, py = (cy + j + 0.2 + 0.6 * r2) * sc, rad = sc * (0.3 + 0.18 * r3);
        const ang = r4 * 6.28, dx = x - px, dy = y - py, u = dx * Math.cos(ang) + dy * Math.sin(ang), v = (-dx * Math.sin(ang) + dy * Math.cos(ang)) * (1.15 + 0.4 * r1);
        const wob = 1 + 0.18 * gradNoise(seed + layer, Math.atan2(v, u) * 2 + r2 * 9, r3 * 9), d = Math.hypot(u, v) / wob;
        if (d >= rad) continue;
        const top = Math.sqrt(1 - (d / rad) ** 2), h0 = rad * 0.35 * top + (2 - layer) * 0.2;
        if (h0 <= best) continue;
        best = h0; hh = h0;
        const [q1] = hash4(seed + 9 + layer * 53, cx + i, cy + j), polish = sst(0.3, 0.9, top);
        a = mul(m.albedo, (2.6 + q1 * 3.4) * (0.85 + 0.25 * polish));
        r = 0.78 - 0.18 * polish;
      }
    }
    if (best === -1e9) { const fines = worley(seed + 5, x / 0.6, y / 0.6, 1); a = mul(m.albedo, 0.7 + (fines.id > 0.8 ? 1.4 : 0.1)); }
    return { a, h: hh, r };
  };
}

function brickSolid(m: MaterialRecord, seed: number): (x: number, y: number, z: number) => TexSample {
  return (x, y, z) => {
    const body = fbm3(seed, x / 30, y / 30, z / 30, 3) * 0.1, sp = worley3(seed + 3, x / 1.6, y / 1.6, z / 1.6, 1);
    const iron = sp.id < 0.05 && sp.f1 < 0.35, lime = sp.id > 0.985 && sp.f1 < 0.4;
    const a = iron ? mul(m.albedo, 0.45) : lime ? mix(m.albedo, [0.55, 0.5, 0.42], 0.75) : mul(m.albedo, 1 + body + (sp.id - 0.5) * 0.08);
    return { a, h: (1 - sp.f1) * 0.05 + body * 0.2 - (lime ? 0.3 : 0), r: m.roughness.typical };
  };
}
/** A brick wall in stretcher bond (the tile view). */
function brickWall(seed: number, body: (x: number, y: number, z: number) => TexSample): (x: number, y: number) => TexSample {
  const L = 210, H = 60, J = 10, mortar: C3 = [0.36, 0.34, 0.31];
  return (x, y) => {
    const row = Math.floor(y / (H + J)), xo = x + (row & 1) * ((L + J) / 2), col = Math.floor(xo / (L + J)), u = xo - col * (L + J), v = y - row * (H + J);
    const chip = 1.2 * sst(0.4, 0.75, fbm(seed + 9, x / 6, y / 6, 2)), inBrick = u > chip && u < L - chip && v > chip && v < H - chip;
    if (!inBrick) { const sandy = worley(seed + 11, x / 0.8, y / 0.8, 1); return { a: mul(mortar, 0.9 + sandy.id * 0.2), h: -3 + (1 - sandy.f1) * 0.15, r: 0.95 }; }
    const fired = 0.8 + 0.4 * hash2(seed, col, row), flash = sst(0.4, 1, Math.abs(u / L - 0.5) * 2) * hash2(seed, col, row + 99) * 0.35;
    const s = body(x, y, (col * 37 + row * 11) % 500), edgeD = Math.min(u, L - u, v, H - v);
    return { a: mul(s.a, fired * (1 - flash)), h: s.h + Math.min(1, edgeD / 2.5) * 0.8, r: s.r };
  };
}

function claySurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  return (x, y) => {
    const wx = x + 4 * fbm(seed + 1, x / 30, y / 30, 3), wy = y + 4 * fbm(seed + 2, x / 30 + 3, y / 30, 3);
    const w1 = worley(seed, wx / 42, wy / 42, 0.9), e1 = edge(w1) * 42, w2 = worley(seed + 5, wx / 13, wy / 13, 0.9), e2 = edge(w2) * 13;
    const crack1 = sst(1.1, 0.35, e1), crack2 = sst(0.45, 0.12, e2) * sst(0.3, 3, e1), curl = sst(6, 0.8, e1) * 0.8 + sst(2.5, 0.4, e2) * 0.3;
    const grain = fbm(seed + 7, x / 1.2, y / 1.2, 2);
    return { a: mul(m.albedo, (1 + grain * 0.05 + curl * 0.12 + fbm(seed + 8, x / 25, y / 25, 3) * 0.08) * (1 - 0.75 * Math.max(crack1, crack2))), h: curl * 0.9 - crack1 * 3 - crack2 * 1.2 + grain * 0.05, r: m.roughness.typical };
  };
}

function plasterSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  return (x, y) => {
    // trowel sweeps: overlapping arcs of polished plaster; fine sand in the finish coat; hairline cracks here and there
    const ang = fbm(seed + 1, x / 120, y / 120, 2) * 1.2, u = x * Math.cos(ang) + y * Math.sin(ang), v = -x * Math.sin(ang) + y * Math.cos(ang);
    const sweep = fbm(seed, u / 90, v / 22, 3), glossy = sst(0.05, 0.4, sweep);
    const sand = worley(seed + 3, x / 0.45, y / 0.45, 1), hair = gauss(gradNoise(seed + 5, x / 70, y / 55) + 0.3 * fbm(seed + 6, x / 20, y / 20, 2), 0.008) * sst(0.3, 0.5, fbm(seed + 7, x / 90, y / 90, 2));
    const a = mul(m.albedo, (1 + sweep * 0.05 + (sand.id - 0.5) * 0.03 + fbm(seed + 9, x / 40, y / 40, 3) * 0.18) * (1 - 0.3 * hair));
    return { a, h: sweep * 0.18 + (1 - sand.f1) * 0.02 - hair * 0.1, r: m.roughness.typical - 0.3 * glossy };
  };
}

function terracottaSolid(m: MaterialRecord, seed: number): (x: number, y: number, z: number) => TexSample {
  return (x, y, z) => {
    const g = worley3(seed, x / 0.9, y / 0.9, z / 0.9, 1), mott = fbm3(seed + 1, x / 18, y / 18, z / 18, 3) * 0.08, lime = worley3(seed + 2, x / 7, y / 7, z / 7, 1);
    let a = mul(m.albedo, 1 + mott + (g.id - 0.5) * 0.1);
    if (lime.id < 0.03 && lime.f1 < 0.18) a = mix(a, [0.62, 0.56, 0.46], 0.8);
    return { a, h: (1 - g.f1) * 0.02 + mott * 0.2, r: m.roughness.typical };
  };
}

function roofTileSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  const pal = paletteFor(m, TEXTURE_CALIBRATION["roof-tile-grey"].palette), rough = TEXTURE_CALIBRATION["roof-tile-grey"].roughness ?? [0.41, 0.49, 0.59];
  return (x, y) => {
    // ibushi: a carbon film from smoking gives a silver sheen, patchy where it is thinner
    const film = warpedFbm(seed, x / 45, y / 45, 1.3, 5), sand = worley(seed + 3, x / 0.5, y / 0.5, 1);
    return { a: pick(pal, 0.5 + film * 1.9 + (sand.id - 0.5) * 0.2), h: (1 - sand.f1) * 0.02 + film * 0.08, r: rough[1] - film * 0.25 };
  };
}

function boneSolid(m: MaterialRecord, seed: number): (x: number, y: number, z: number) => TexSample {
  return (x, y, z) => {
    const lam = Math.sin((y + 2 * fbm3(seed, x / 20, y / 20, z / 20, 3)) / 0.9) * 0.02, pores = worley3(seed + 1, x / 0.6, y / 1.4, z / 0.6, 1);
    const pit = pores.id < 0.12 ? sst(0.18, 0.1, pores.f1) : 0, stain = sst(0, 0.6, fbm3(seed + 2, x / 22, y / 22, z / 22, 3));
    const a = mix(mul(m.albedo, 1 + lam - pit * 0.25), mul(m.albedo, 0.78), stain * 0.35);
    return { a: [a[0], a[1] * 0.99, a[2] * (1 - stain * 0.15)], h: lam * 0.5 - pit * 0.05, r: m.roughness.typical };
  };
}

function charcoalSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  return (x, y) => {
    // charred wood checks into cells longer along the grain ("alligatoring"); fine fissures follow the grain
    const wx = x + 2 * fbm(seed, x / 20, y / 20, 2), w = worley(seed + 1, wx / 16, y / 6, 0.9), e = Math.min(edge(w) * 6, 3);
    const crack = sst(0.45, 0.1, e), fiss = gauss(gradNoise(seed + 2, x / 80, y / 0.9), 0.06) * 0.6, top = sst(0.4, 2, e);
    const sheen = 0.5 + 0.5 * fbm(seed + 3, x / 6, y / 3, 2);
    return { a: mul(m.albedo, (1 + 0.6 * top * sheen) * (1 - 0.7 * crack - 0.3 * fiss)), h: top * 0.8 - crack * 2 - fiss * 0.2, r: Math.max(0.35, m.roughness.typical - 0.45 * top * sheen) };
  };
}

// ---- Metals, rust, patina, lacquer, others ---------------------------------------------------------------------------------------

function metalSurface(m: MaterialRecord, seed: number, finish: "polished" | "brushed" | "cast" | "spangle" | "scale" | "dull"): (x: number, y: number) => TexSample {
  const rough = m.roughness.typical;
  return (x, y) => {
    if (finish === "brushed") { const s = fbm(seed, x / 40, y / 0.06, 2), s2 = fbm(seed + 1, x / 300, y / 0.5, 2); return { a: mul(m.albedo, 1 + s2 * 0.03), h: s * 0.0015, r: rough + s * 0.05 + s2 * 0.08 }; }
    if (finish === "cast") { const gr = worley(seed, x / 0.55, y / 0.55, 1), pit = worley(seed + 2, x / 4, y / 4, 1), p = pit.id < 0.1 ? sst(0.25, 0.12, pit.f1) : 0; return { a: mul(m.albedo, 0.9 + gr.id * 0.2 - p * 0.3), h: (1 - gr.f1) * 0.06 - p * 0.2, r: rough + (gr.id - 0.5) * 0.12 + p * 0.2 }; }
    if (finish === "spangle") {
      const c = worley(seed, x / 14, y / 14, 1), dir = c.id * Math.PI * 2, u = x * Math.cos(dir) + y * Math.sin(dir), v = -x * Math.sin(dir) + y * Math.cos(dir);
      const dend = ridged(seed + 3, u / 1.6, v / 5, 3), cid = Math.floor(c.id * 1e6);
      return { a: mul(m.albedo, 0.94 + 0.08 * dend), h: dend * 0.003, r: 0.1 + 0.12 * dend + c.id * 0.1, t: [(hash2(seed, cid, 2) - 0.5) * 0.09, (hash2(seed, cid, 3) - 0.5) * 0.09] };
    }
    if (finish === "scale") { const s = warpedFbm(seed, x / 28, y / 28, 1.5, 5), flake = sst(-0.1, 0.35, s); return { a: mix(m.albedo, [m.albedo[0] * 0.62, m.albedo[1] * 0.64, m.albedo[2] * 0.7], flake * 0.8), h: flake * 0.02, r: rough + flake * 0.18 }; }
    if (finish === "dull") { const ox = sst(0.0, 0.6, warpedFbm(seed, x / 30, y / 30, 1.2, 4)); return { a: mix(m.albedo, [0.5, 0.51, 0.5], ox * 0.35), h: 0, r: rough + ox * 0.15, m: 1 - ox * 0.4 }; }
    // polished: swirl marks from polishing, faint and random
    const sw = Math.abs(gradNoise(seed, x / 18 + 0.8 * fbm(seed + 1, x / 30, y / 30, 2), y / 0.04)) < 0.02 ? 1 : 0;
    const smudge = sst(0.2, 0.7, fbm(seed + 2, x / 25, y / 25, 3));
    return { a: [m.albedo[0], m.albedo[1], m.albedo[2]], h: -sw * 0.0008, r: Math.max(0.02, rough + sw * 0.1 + smudge * 0.05) };
  };
}

function rustSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  const cal = TEXTURE_CALIBRATION.rust, pal = paletteFor(m, cal.palette), orange = mul(m.albedo, 1.25), black: C3 = mul(m.albedo, 0.28);
  const rough = cal.roughness ?? [0.33, 0.43, 0.55];
  return (x, y) => {
    const b = warpedFbm(seed, x / 16, y / 16, 1.8, 5), fl = worley(seed + 3, x / 4.5, y / 4.5, 0.9), lift = sst(0.18, 0, edge(fl) * 4.5);
    const pit = worley(seed + 7, x / 1.3, y / 1.3, 1), p = pit.id < 0.18 ? sst(0.22, 0.12, pit.f1) : 0;
    // grey-brown scale (as measured), orange lepidocrocite in the blooms, black magnetite in pits
    let a = pick(pal, 0.5 + b * 1.2 + (fl.id - 0.5) * 0.4);
    a = mix(a, orange, sst(0.15, 0.55, b) * 0.65);
    a = mix(a, black, p * 0.8);
    return { a: mul(a, 1 - lift * 0.3), h: fl.f1 * 0.3 + lift * 0.15 - p * 0.35, r: rough[1] + b * 0.2 + p * 0.2 };
  };
}

function patinaSurface(seed: number): (x: number, y: number) => TexSample {
  const cuprite: C3 = [0.11, 0.05, 0.03], malachite: C3 = [0.07, 0.22, 0.14], brochantite: C3 = [0.13, 0.27, 0.22], metal: C3 = [0.62, 0.43, 0.24];
  return (x, y) => {
    const crust = warpedFbm(seed, x / 18, y / 18, 1.7, 5), green = sst(-0.25, 0.35, crust), pale = sst(0.2, 0.6, fbm(seed + 3, x / 8, y / 8, 3));
    const bump = fbm(seed + 7, x / 1.4, y / 1.4, 3), worn = sst(0.55, 0.62, fbm(seed + 5, x / 22, y / 22, 4) + 0.22 * bump);
    if (worn > 0.5) return { a: mul(metal, 0.7 + 0.25 * bump), h: -0.05, r: 0.38, m: 1 };
    const a = mix(mix(cuprite, malachite, green), brochantite, green * pale * 0.6);
    return { a: mul(a, 0.85 + 0.3 * (bump * 0.5 + 0.5)), h: green * 0.18 + bump * 0.06, r: 0.82 - 0.1 * (1 - green), m: 0 };
  };
}

function lacquerSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  return (x, y) => { const peel = fbm(seed, x / 2.2, y / 2.2, 2), brush = fbm(seed + 1, x / 60, y / 3, 2); return { a: mul(m.albedo, 1 + brush * 0.02), h: peel * 0.003 + brush * 0.004, r: m.roughness.typical }; };
}

function blackboardSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  return (x, y) => {
    // chalk left by an eraser's sweeps: long arcs of grey dust
    let dust = 0;
    for (let k = 0; k < 4; k++) {
      const cx = (hash2(seed, k, 1) - 0.5) * 300, cy = -160 - hash2(seed, k, 2) * 140, rad = Math.hypot(x - cx, y - cy), r0 = 200 + hash2(seed, k, 3) * 160;
      dust += gauss(rad - r0, 22 + hash2(seed, k, 4) * 20) * (0.35 + 0.65 * sst(-0.3, 0.4, fbm(seed + k, (Math.atan2(y - cy, x - cx) * r0) / 9, rad / 1.2, 3)));
    }
    const grain = fbm(seed + 9, x / 0.5, y / 0.5, 2);
    return { a: mix(mul(m.albedo, 1 + grain * 0.06), [0.25, 0.25, 0.24], Math.min(0.55, dust * 0.4)), h: grain * 0.006, r: m.roughness.typical };
  };
}

function smoothSolid(m: MaterialRecord, seed: number, o: { grain: number; blotch: number; scale?: number }): (x: number, y: number, z: number) => TexSample {
  const s = o.scale ?? 25;
  return (x, y, z) => { const g = fbm3(seed, x / 0.6, y / 0.6, z / 0.6, 2), b = fbm3(seed + 3, x / s, y / s, z / s, 3); return { a: mul(m.albedo, 1 + g * o.grain + b * o.blotch), h: g * o.grain * 0.3, r: m.roughness.typical + g * o.grain }; };
}

function waterSurface(m: MaterialRecord, seed: number): (x: number, y: number) => TexSample {
  // capillary ripples from a light breeze: a few crossing trains of short waves
  return (x, y) => ({ a: [m.albedo[0], m.albedo[1], m.albedo[2]], h: (Math.sin(x / 5.2 + y / 11) * 0.5 + 0.35 * Math.sin(x / 2.7 - y / 3.9 + 1.7) + 0.2 * Math.sin((x + y) / 1.9 + 0.4) + 0.4 * fbm(seed, x / 9, y / 9, 3)) * 0.35, r: 0.02 });
}
function clearSolid(m: MaterialRecord, seed: number, kind: "glass" | "ice" | "quartz"): (x: number, y: number, z: number) => TexSample {
  return (x, y, z) => {
    if (kind === "ice") {
      const cr = worley3(seed, x / 28, y / 28, z / 28, 0.8), crack = gauss(edge(cr) * 28, 0.12), bubble = worley3(seed + 3, x / 2.2, y / 2.2, z / 2.2, 1);
      const b = bubble.id < 0.2 ? sst(0.22, 0.12, bubble.f1) : 0;
      const sc = Math.min(1, crack * 0.8 + b * 0.7 + 0.12 * sst(0.1, 0.6, fbm3(seed + 7, x / 18, y / 18, z / 18, 3)));
      return { a: mix(m.albedo, [1, 1, 1], sc), h: fbm3(seed + 5, x / 14, y / 14, z / 14, 3) * 0.08, r: 0.04 + crack * 0.3, s: sc };
    }
    // drawn window glass: waviness and small seeds (bubbles)
    const wave = fbm3(seed, x / 40, y / 12, z / 40, 3) * (kind === "glass" ? 0.12 : 0.02), sb = worley3(seed + 3, x / 6, y / 6, z / 6, 1);
    const sd = sb.id < 0.04 ? sst(0.12, 0.06, sb.f1) : 0;
    return { a: mix(m.albedo, [1, 1, 1], sd * 0.8), h: wave, r: m.roughness.typical + sd * 0.2, s: sd * 0.6 };
  };
}

// ---- The catalogue ----------------------------------------------------------------------------------------------------------------

const solidToSurface = (f: (x: number, y: number, z: number) => TexSample) => (x: number, y: number) => f(x, y, 0);

/** The texture of a material by id; `seed` gives another piece of the same material; `record` re-colours it (aged, wet). */
export function materialTexture(id: string, seed = 7, record?: MaterialRecord): MaterialTexture {
  const base = MATERIALS.find(x => x.id === id), m = record ?? base;
  if (!m) throw new Error(`Unknown material ${id}`);
  const surf = (recipe: string, extentMm: number, sample: MaterialTexture["sample"], note: string, facts: string[] = [], optics: TextureOptics = {}, ballMm = extentMm): MaterialTexture =>
    ({ id, recipe, note, extentMm, ballMm, sample, optics, facts });
  const solid = (recipe: string, extentMm: number, f: (x: number, y: number, z: number) => TexSample, note: string, facts: string[] = [], optics: TextureOptics = {}, ballMm = extentMm): MaterialTexture =>
    ({ id, recipe, note, extentMm, ballMm, sample: solidToSurface(f), solid: f, optics, facts });
  const cal = TEXTURE_CALIBRATION;
  // a metal aged into a mineral crust (copper's green, iron's rust) is drawn as that crust
  if (base?.metal === 1 && m.metal === 0) return id === "iron" || id === "cast-iron" ? surf("rust", 80, rustSurface(m, seed), "Rusted.", ["ambientcg"]) : surf("patina", 80, patinaSurface(seed), "Aged to a mineral crust.");
  switch (id) {
    case "wood-light": return solid("wood", 160, woodSolid(m, seed, { palette: cal["wood-light"].palette, ringMm: 2.4, ringCv: 0.4, juvenile: 0.6, latewood: 0.3, transition: 0.26, contrast: 0.18, cutDeg: 6, pithMm: 70, slope: 0.035, wobble: 2.4, knots: 0, knotMm: [4, 9], deadShare: 0, figure: 0.05 }),
      "Flat-sawn light softwood: cathedral arches where the board cuts the cone-shaped rings; a gradual earlywood→latewood transition.", ["wood-rings", "ambientcg"], {}, 120);
    case "wood-mid": return solid("wood", 160, woodSolid(m, seed, { palette: cal["wood-mid"].palette, ringMm: 3.2, ringCv: 0.25, juvenile: 0.5, latewood: 0.22, transition: 0.08, contrast: 0.1, cutDeg: 18, pithMm: 95, slope: 0.012, wobble: 1.1, knots: 2, knotMm: [6, 11], deadShare: 0.5, figure: 0.03 }),
      "A sugi-like board far from the pith: near-straight grain, an abrupt latewood edge, knots (some dead, ringed with bark) with the rings swept round them.", ["wood-rings", "ambientcg"], {}, 120);
    case "wood-weathered": return solid("wood", 200, woodSolid(m, seed, { palette: cal["wood-light"].palette, ringMm: 3.6, ringCv: 0.3, juvenile: 0.5, latewood: 0.25, transition: 0.1, contrast: 0.4, cutDeg: 10, pithMm: 60, slope: 0.03, wobble: 1.4, knots: 1, knotMm: [5, 9], deadShare: 1, figure: 0.04, weatheredYears: 25 }),
      "25 years outdoors: grey, the earlywood eroded about twice as fast as the latewood, checks along the grain.", ["wood-erosion", "wood-rings", "ambientcg"], {}, 120);
    case "bamboo-green": return surf("bamboo", 110, bambooSurface(m, seed, "green"), "Waxy green skin over vascular bundles; a node's ridge and sheath scar; white bloom under the node; the sulcus above.", ["bamboo-bundles", "ambientcg"]);
    case "bamboo-dry": return surf("bamboo", 110, bambooSurface(m, seed, "dry"), "Dried straw-yellow culm.", ["bamboo-bundles", "ambientcg"]);
    case "bamboo-old": return surf("bamboo", 110, bambooSurface(m, seed, "smoked"), "Smoke-stained (susudake): darkest by the nodes, lighter where ropes bound it.", ["bamboo-bundles", "ambientcg"]);
    case "tatami-new": return surf("tatami", 60, tatamiSurface(m, seed, 0), "Fresh green igusa: rushes in wales about 1.5 cm long between warp grooves.", ["tatami-weave", "ambientcg"]);
    case "tatami": return surf("tatami", 60, tatamiSurface(m, seed, 0.2), "Straw-gold after use.", ["tatami-weave", "ambientcg"]);
    case "tatami-old": return surf("tatami", 60, tatamiSurface(m, seed, 0.85), "Browned and frayed where feet pass.", ["tatami-weave"]);
    case "thatch": return surf("thatch", 220, thatchSurface(m, seed), "Cut ends of 3–7 mm stalks stepping out of the roof, their stalks sinking up-slope into the mass.", ["thatch-culm", "ambientcg"]);
    case "paper-washi": return surf("paper", 32, paperSurface(m, seed, { fibreMm: 9, fibres: 6, fibreWidth: 0.08, formation: 0.032, flecks: 0, tooth: 0.03, chiri: 0.05 }), "Long kozo fibres over a cloudy sheet, a rare bark speck.", ["kozo-fibre", "ambientcg"], { sss: 0.5 });
    case "paper-kraft": return surf("paper", 50, paperSurface(m, seed, { fibreMm: 2.6, fibres: 2, fibreWidth: 0.04, formation: 0.085, flecks: 0.18, tooth: 0.008 }), "Short unbleached fibres, mottled flocs, calendered.", ["ambientcg"]);
    case "paper-white": return surf("paper", 50, paperSurface(m, seed, { fibreMm: 2, fibres: 1, fibreWidth: 0.025, formation: 0.01, flecks: 0, tooth: 0.005 }), "Machine paper: even, the faintest formation.", [], { sss: 0.3 });
    case "cardboard": { const k = paperSurface(m, seed, { fibreMm: 2.6, fibres: 2, fibreWidth: 0.04, formation: 0.05, flecks: 0.18, tooth: 0.008 }); return surf("paper", 60, (x, y) => { const s = k(x, y), c = Math.cos((y / 7.8) * Math.PI * 2); return { ...s, a: mul(s.a, 1 + c * 0.01), h: s.h + c * 0.16 }; }, "Kraft liner over C flutes about 7.8 mm apart (seen in raking light).", ["corrugated-flute"]); }
    case "leather": return surf("leather", 40, leatherSurface(m, seed), "Pebbled grain cells, finer creases, pores.", ["leather-grain", "ambientcg"]);
    case "grass": return surf("grass", 140, grassSurface(m, seed), "A lawn from above: blades in depth, soil between.");
    case "granite": return solid("granite", 90, graniteSolid(m, seed), "Interlocking crystals in the measured mineral shares, black mica flakes that glint.", ["granite-grain", "ambientcg"]);
    case "marble": return solid("marble", 220, marbleSolid(m, seed), "Grey veins along fractures in a white body; light scatters below the surface.", [], { sss: 3 }, 150);
    case "slate": return solid("slate", 160, slateSolid(m, seed), "Cleavage ripples and steps, dusty patches, a rare pyrite stain.", [], {}, 120);
    case "sand": return surf("grains", 12, grainSurface(m, seed, { grainMm: 0.42, minerals: [[[1.05, 1.02, 1.0], 0.62], [[1.25, 0.95, 0.85], 0.16], [[0.25, 0.24, 0.24], 0.1], [[1.5, 1.45, 1.35], 0.12]], gap: 0.6, tilt: 0.25, relief: 0.35 }), "Medium sand: quartz, feldspar, dark minerals and shell.", ["sand-grain"]);
    case "salt": return surf("grains", 10, saltSurface(m, seed), "Cubic crystals, their faces catching the light.", [], { sss: 0.3 });
    case "snow": return surf("grains", 16, grainSurface(m, seed, { grainMm: 0.55, minerals: [[[1, 1, 1.01], 1]], gap: 0.05, tilt: 0.6, relief: 0.12, under: 0.78 }), "Rounded ice grains; light scatters through them and facets glint.", [], { sss: 1.6 });
    case "concrete": return solid("concrete", 160, concreteSolid(m, seed), "Cement skin mottled as it cured, sand, air voids (bug holes).", [], {}, 110);
    case "asphalt": return surf("asphalt", 120, asphaltSurface(m, seed), "Grey aggregate worn smooth on top, black binder between.");
    case "terracotta": return solid("terracotta", 70, terracottaSolid(m, seed), "Fine grog speckle, mottling, a rare lime spall.");
    case "clay": return surf("clay", 220, claySurface(m, seed), "Drying cracks in two generations; cell edges curl up.", [], {}, 150);
    case "brick": { const body = brickSolid(m, seed); return { id, recipe: "brick", note: "JIS units in stretcher bond, each fired a little differently; mortar joints recessed. The ball shows the fired body.", extentMm: 520, ballMm: 110, sample: brickWall(seed, body), solid: body, optics: {}, facts: ["brick-jis"] }; }
    case "plaster-white": return surf("plaster", 140, plasterSurface(m, seed), "Trowelled lime: polished sweeps, fine sand, a hairline crack.", ["ambientcg"], { sss: 0.4 });
    case "roof-tile-grey": return surf("roof-tile", 120, roofTileSurface(m, seed), "Smoked (ibushi) silver-grey, the carbon film patchy.", ["ambientcg"]);
    case "porcelain": return solid("smooth", 80, smoothSolid(m, seed, { grain: 0.004, blotch: 0.015 }), "Glaze over a white body.", [], { sss: 1 });
    case "bone": return solid("bone", 60, boneSolid(m, seed), "Lamellae, fine pores, stains.", [], { sss: 0.8 });
    case "pearl": { const body = smoothSolid(m, seed, { grain: 0.01, blotch: 0.04, scale: 3 }); return { id, recipe: "nacre", note: "Nacre: aragonite platelets about 0.5 µm thick; their interference gives a pearl's orient and mother-of-pearl's banded colours (the tile).", extentMm: 40, ballMm: 12, solid: (x, y, z) => ({ ...body(x, y, z), f: 0.42 + 0.03 * fbm3(seed + 5, x / 3, y / 3, z / 3, 2) }), sample: (x, y) => { const w = warpedFbm(seed + 9, x / 30, y / 9, 1.6, 4), band = 0.5 + 0.5 * Math.sin((y + 6 * w) / 1.3); return { ...body(x, y, 0), f: 0.32 + 0.22 * band + 0.05 * w, h: band * 0.004 }; }, optics: { thinFilm: 0.42, sss: 0.4 }, facts: [] }; }
    case "charcoal": return surf("charcoal", 90, charcoalSurface(m, seed), "Cells checked along the grain, fine fissures, a sheen on the tops.");
    case "rubber": return solid("smooth", 60, smoothSolid(m, seed, { grain: 0.05, blotch: 0.05 }), "Fine matte stipple.");
    case "blackboard": return surf("blackboard", 300, blackboardSurface(m, seed), "Chalk dust in an eraser's sweeps.", [], {}, 110);
    case "quartz": return solid("clear", 60, clearSolid(m, seed, "quartz"), "Rock crystal: clear.", [], { transmit: true });
    case "glass": return solid("clear", 90, clearSolid(m, seed, "glass"), "Drawn window glass: waviness and seeds.", [], { transmit: true });
    case "ice": return solid("clear", 90, clearSolid(m, seed, "ice"), "Ice: trapped bubbles, fracture planes.", [], { transmit: true, scatterDepth: 6 });
    case "water": return surf("water", 120, waterSurface(m, seed), "Capillary ripples.", [], { transmit: true });
    case "rust": return surf("rust", 80, rustSurface(m, seed), "Grey-brown scale with orange blooms, black pits, lifting flakes.", ["ambientcg"]);
    case "bronze-old": return surf("patina", 80, patinaSurface(seed), "Cuprite under green malachite and brochantite; worn high spots show the metal.");
    case "lacquer-red": case "lacquer-black": return surf("lacquer", 80, lacquerSurface(m, seed), "A hard glossy film; the faintest orange peel.");
    case "stainless-steel": case "aluminium": case "titanium": return surf("metal", 80, metalSurface(m, seed, "brushed"), "Brushed: highlights stretch across the strokes.", [], { anisotropy: 0.7 });
    case "cast-iron": return surf("metal", 60, metalSurface(m, seed, "cast"), "Sand-cast skin, a few pits.");
    case "zinc": return surf("metal", 120, metalSurface(m, seed, "spangle"), "Galvanised spangle: crystals with feathery dendrites, each tilted a little.");
    case "iron": return surf("metal", 80, metalSurface(m, seed, "scale"), "Mill scale mottling.");
    case "lead": return surf("metal", 80, metalSurface(m, seed, "dull"), "Dull, with pale oxide patches.");
    case "food-beef-raw": return solid("food", 40, beefSolid({ marbling: 0.35, axis: "z", seed }), "Fascicles end-on about 1.4 mm across, bound into bundles; marbling in the seams; knife drag on the cut.", [], { sss: 1.2 }, 60);
    case "food-beef-wagyu": return solid("food", 40, beefSolid({ marbling: 0.95, axis: "z", muscle: "#b8343a", seed }), "A fine lace of fat through every seam.", [], { sss: 1.2 }, 60);
    case "food-beef-seared": return solid("food", 30, searSolid({ bake: 0.72, seed }), "Fused protein beads, darkest on the peaks; fissures.", [], {}, 60);
    case "food-salmon-raw": return solid("food", 60, salmonSolid({ seed }), "W-shaped myomeres about 8 mm apart between white myosepta.", [], { sss: 2 }, 70);
    case "food-salmon-cooked": return solid("food", 60, salmonSolid({ cooked: 1, seed }), "Flakes parted along the septa, albumin beads.", [], { sss: 0.6 }, 70);
    case "food-tuna-raw": return solid("food", 50, tunaSolid(seed), "Garnet loin, faint septa arcs.", [], { sss: 1 }, 60);
    case "food-chicken-skin-raw": return solid("food", 30, poultrySolid({ seed }), "Follicles in tracts about 2.6 mm apart; fat and flesh showing through.", [], { sss: 1.5 }, 60);
    case "food-chicken-skin-roast": return solid("food", 30, poultrySolid({ roast: 0.62, seed }), "Micro-blisters about 1 mm, browned by exposure.", [], { sss: 0.6 }, 60);
    case "food-fish-skin": return solid("food", 30, fishScaleSolid({ seed }), "Cycloid scales about 2.2 mm in rows; silver belly to dark back.", [], {}, 50);
    case "food-bread-crust": return solid("food", 40, crustSolid({ bake: 0.68, blisters: 0.5, flour: 0.3, seed }), "Blistered, fissured, flour-dusted crust.", [], {}, 60);
    case "food-bread-crumb": return solid("food", 50, crumbSolid({ open: 0.8, seed }), "An open sourdough crumb.", [], { sss: 0.6 }, 60);
    case "food-rice-cooked": return solid("food", 30, riceSolid({ seed }), "Cooked grains about 5.5 × 3 mm.", [], { sss: 1 }, 50);
    case "food-cheese-aged": return solid("food", 30, agedCheeseSolid({ seed }), "Tyrosine crystals and fissures in a waxy paste.", [], { sss: 1 }, 50);
    case "food-cheese-gratin": return solid("food", 60, gratinSolid({ seed }), "Blisters about 5 mm, scorched on the tallest.", [], { sss: 0.8 }, 60);
    case "food-tomato-skin": return solid("food", 30, tomatoSolid({ seed }), "Glossy cuticle, micro-dimples, stretch lines.", [], { sss: 2 }, 60);
    case "food-pepper-skin": return solid("food", 40, pepperSolid({ seed }), "Glossy, dented, folded.", [], { sss: 1.5 }, 60);
    case "food-potato-skin": return solid("food", 40, potatoSolid({ seed }), "Russet net, lenticels, eyes, earth.", [], { sss: 0.5 }, 60);
    case "food-citrus-peel": return solid("food", 25, citrusSolid({ seed }), "Oil glands about 1 mm as shallow pits.", [], { sss: 1.5 }, 60);
    case "food-mushroom-cap": return solid("food", 50, mushroomCapSolid({ seed, cracks: 0.6 }), "Radial fibrils and scaly cracks.", [], {}, 60);
    case "food-banana-skin": return solid("food", 40, bananaSolid({ ripe: 0.75, seed }), "Striations along the fruit, sugar spots in clusters.", [], { sss: 1 }, 60);
    case "food-flatbread": return solid("food", 60, flatbreadSolid({ char: 0.6, toast: 0.35, seed }), "Leopard spots about 2–4 mm with brown halos.", [], {}, 60);
    case "food-injera": return solid("food", 40, injeraSolid(seed), "Eyes about 1–3 mm.", [], {}, 60);
    case "food-tempura-batter": return solid("food", 30, batterSolid({ bake: 0.35, seed }), "Craggy, bubbled, crisp.", [], {}, 50);
    default: return m.metal ? surf("metal", 80, metalSurface(m, seed, "polished"), "Polished, with faint swirl marks.") : solid("smooth", 80, smoothSolid(m, seed, { grain: 0.012, blotch: 0.02 }), "Smooth.");
  }
}

/** Luminance statistics of a texture's flat surface, each cell averaged over its area as a photograph's pixel is, for comparison with `TEXTURE_CALIBRATION`. */
export function textureStats(id: string, extentMm?: number, res = 160, seed = 7): { pct: [number, number, number]; coherence: number; mean: number } {
  const tex = materialTexture(id, seed), ext = extentMm ?? tex.extentMm, L = new Float64Array(res * res), cell = ext / res;
  for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
    let sum = 0;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) sum += lumOf(tex.sample(((x + (i + 0.5) / 3) / res - 0.5) * ext, (0.5 - (y + (j + 0.5) / 3) / res) * ext, cell / 3).a);
    L[y * res + x] = sum / 9;
  }
  const sorted = Array.from(L).sort((a, b) => a - b), mean = sorted.reduce((a, b) => a + b, 0) / sorted.length, q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))] / mean;
  let jxx = 0, jyy = 0, jxy = 0;
  for (let y = 1; y < res - 1; y++) for (let x = 1; x < res - 1; x++) { const gx = L[y * res + x + 1] - L[y * res + x - 1], gy = L[(y + 1) * res + x] - L[(y - 1) * res + x]; jxx += gx * gx; jyy += gy * gy; jxy += gx * gy; }
  return { pct: [q(0.1), q(0.5), q(0.9)], coherence: Math.sqrt((jxx - jyy) ** 2 + 4 * jxy * jxy) / (jxx + jyy + 1e-12), mean };
}
