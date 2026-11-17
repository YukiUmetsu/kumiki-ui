/**
 * GEO1 data: the ground in any art style. Landforms by how they formed (fold mountains, glacial horns and U-valleys,
 * river V-valleys, strato-, shield and cinder volcanoes, mesas and buttes, dunes, scree, sea cliffs, rolling hills),
 * with their slopes and profiles; the angle of repose of loose material; the snowline and the treeline by latitude;
 * the albedo of ground covers; and how distance fades a range.
 *
 * Each value is graded like the other foundations: `reported` (quoted from a cited source), `measured` (sampled off a
 * CC0 or public-domain reference), `estimated` (no direct source). `geo-terrain.ts` builds heightfields from these
 * landforms (with hydraulic and thermal erosion); `geo-render.ts` renders them under SKY1's atmosphere.
 */
import type { Range } from "../anatomy/foundation-shapes";
import { range as r } from "../anatomy/foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string): Range => r(min, typical, max, "reported", source);
const est = (min: number, typical: number, max: number, source?: string): Range => r(min, typical, max, "estimated", source);

export type LandformId = "fold-range" | "glacial-horn" | "u-valley" | "v-valley" | "stratovolcano" | "shield-volcano" | "cinder-cone" | "mesa" | "barchan-dune" | "scree" | "sea-cliff" | "rolling-hills";

export interface Landform {
  id: LandformId;
  label: string;
  /** How it formed, in a sentence. */
  origin: string;
  /** The slopes that give it away, degrees. */
  slope: Range;
  /** Its relief (height from foot to top), m. */
  relief: Range;
  /** Its profile across, as heights 0–1 at evenly spaced points 0–1 (left to right): a drawing's silhouette. */
  profile: readonly number[];
  /** What to draw so it reads (and the common mistakes). */
  draw: readonly string[];
  /** The heightfield builder that makes it (`terrainHeightfield`). */
  terrain: TerrainKind;
  sources: readonly string[];
}

export type TerrainKind = "alpine" | "volcano" | "shield" | "cinder" | "mesa" | "dunes" | "hills" | "u-valley" | "v-valley" | "coast";

/** A concave volcano profile: steep near the top (about 30–35°), flattening to about 10° at the foot. */
const strato = Array.from({ length: 21 }, (_, i) => { const x = Math.abs(i / 20 - 0.5) * 2; return Math.max(0, 1 - Math.pow(x, 0.62)); });
/** A shield: broad and gentle, a few degrees. */
const shield = Array.from({ length: 21 }, (_, i) => { const x = Math.abs(i / 20 - 0.5) * 2; return Math.max(0, 1 - x * x); });
/** A cinder cone: straight sides at the angle of repose and a crater. */
const cinder = Array.from({ length: 21 }, (_, i) => { const x = Math.abs(i / 20 - 0.5) * 2; return x < 0.18 ? 0.86 + 0.14 * (x / 0.18) : Math.max(0, 1 - (x - 0.18) / 0.82); });

export const LANDFORMS: readonly Landform[] = [
  { id: "fold-range", label: "Fold mountains (a young range)", origin: "Rock crumpled where plates converge, then cut by rivers and glaciers into ridges and peaks.",
    slope: rep(25, 35, 60, "Wikipedia: Fold mountains; Mountain"), relief: rep(1000, 2500, 5000, "Wikipedia: Mountain (local relief of major ranges)"),
    profile: [0, .12, .2, .38, .33, .52, .7, .62, .86, 1, .8, .72, .9, .66, .5, .58, .4, .3, .22, .1, 0],
    draw: ["Ridges branch like a tree seen from above; peaks sit where ridges meet.", "Faces in shade show gullies (couloirs) running straight down the fall line.", "A range is several planes: each farther one lighter and bluer (aerial perspective), not smaller copies."],
    terrain: "alpine", sources: ["Wikipedia: Fold mountains", "Wikipedia: Arête", "Wikipedia: Couloir"] },
  { id: "glacial-horn", label: "Glacial horn (pyramidal peak)", origin: "Three or more glaciers cut cirques back into one summit, leaving steep faces and sharp arêtes.",
    slope: rep(35, 45, 70, "Wikipedia: Pyramidal peak (the Matterhorn's faces about 40–50°)"), relief: rep(500, 1200, 2000, "Wikipedia: Matterhorn"),
    profile: [0, .05, .12, .2, .3, .42, .56, .7, .84, .95, 1, .93, .8, .66, .52, .4, .28, .18, .1, .04, 0],
    draw: ["Straight, steep faces meeting at sharp edges; snow clings only where the slope eases (under about 45–50°).", "Cirques (armchair hollows) at the foot of each face, often with a lake or glacier."],
    terrain: "alpine", sources: ["Wikipedia: Pyramidal peak", "Wikipedia: Cirque"] },
  { id: "u-valley", label: "Glacial U-valley", origin: "A glacier widens and deepens a river valley into a trough with steep walls and a flat floor.",
    slope: rep(30, 45, 80, "Wikipedia: U-shaped valley"), relief: rep(300, 1000, 2000, "Wikipedia: U-shaped valley (Yosemite, Lauterbrunnen)"),
    profile: [1, .98, .9, .62, .3, .1, .03, 0, 0, 0, 0, 0, 0, .03, .1, .3, .62, .9, .98, 1, 1],
    draw: ["A flat floor and near-vertical walls; side valleys hang above the floor with waterfalls.", "Do not draw a V: the U is the tell."],
    terrain: "u-valley", sources: ["Wikipedia: U-shaped valley", "Wikipedia: Hanging valley"] },
  { id: "v-valley", label: "River V-valley", origin: "A river cuts down faster than the slopes widen: a narrow floor, straight sides at the slope the rock holds.",
    slope: rep(15, 25, 40, "Wikipedia: V-shaped valley"), relief: rep(100, 500, 2000, "Wikipedia: V-shaped valley"),
    profile: [1, .92, .84, .75, .66, .57, .48, .38, .28, .16, 0, .16, .28, .38, .48, .57, .66, .75, .84, .92, 1],
    draw: ["Interlocking spurs: the river winds and the slopes overlap from either side.", "The floor is only as wide as the river."],
    terrain: "v-valley", sources: ["Wikipedia: V-shaped valley", "Wikipedia: Interlocking spur"] },
  { id: "stratovolcano", label: "Stratovolcano (Fuji, Rainier)", origin: "Layers of lava and ash from one vent build a cone that steepens toward the top.",
    slope: rep(10, 30, 35, "Wikipedia: Stratovolcano (upper slopes about 30–35°)"), relief: rep(1000, 2500, 3800, "Wikipedia: Mount Fuji (3,776 m)"),
    profile: strato,
    draw: ["A concave profile: steep near the summit, flaring at the foot. A straight-sided triangle reads as a cinder cone.", "Radial gullies (barrancos) groove the flanks; snow lies in them in streaks."],
    terrain: "volcano", sources: ["Wikipedia: Stratovolcano", "Wikipedia: Mount Fuji"] },
  { id: "shield-volcano", label: "Shield volcano (Mauna Loa)", origin: "Runny basalt flows spread far before setting, building a broad low dome.",
    slope: rep(2, 6, 10, "Wikipedia: Shield volcano (slopes rarely over 10°)"), relief: rep(500, 4000, 9000, "Wikipedia: Mauna Loa (about 9 km from the sea floor)"),
    profile: shield,
    draw: ["So gentle it reads as a long low line on the horizon, not a peak.", "Lava flows streak the flanks dark (fresh) and rust (old)."],
    terrain: "shield", sources: ["Wikipedia: Shield volcano", "Wikipedia: Mauna Loa"] },
  { id: "cinder-cone", label: "Cinder cone", origin: "Loose cinders thrown from a vent pile up at their angle of repose, with a bowl crater on top.",
    slope: rep(30, 33, 40, "Wikipedia: Cinder cone (about the angle of repose)"), relief: rep(30, 150, 400, "Wikipedia: Cinder cone"),
    profile: cinder,
    draw: ["Straight sides and a flat or notched top: a cut-off cone.", "Small and often in groups on a volcano's flanks."],
    terrain: "cinder", sources: ["Wikipedia: Cinder cone"] },
  { id: "mesa", label: "Mesa and butte", origin: "A hard cap rock protects softer layers beneath; the edges retreat as cliffs above talus slopes.",
    slope: rep(25, 34, 90, "Wikipedia: Mesa (cliff over a talus slope)"), relief: rep(50, 300, 600, "Wikipedia: Mesa"),
    profile: [0, .04, .1, .2, .34, .52, .92, 1, 1, 1, 1, 1, 1, 1, .92, .52, .34, .2, .1, .04, 0],
    draw: ["A flat top, a vertical cliff band (the cap rock), then a talus apron at about 30–35° below it.", "Horizontal strata stripe the cliffs; a butte is a mesa narrower than it is tall."],
    terrain: "mesa", sources: ["Wikipedia: Mesa", "Wikipedia: Butte"] },
  { id: "barchan-dune", label: "Barchan dune", origin: "Wind drives sand up a gentle windward slope; it avalanches down a steep slip face; the horns point downwind.",
    slope: rep(5, 12, 34, "Wikipedia: Barchan (windward 5–15°, slip face near the angle of repose, about 32–34°)"), relief: rep(1, 10, 30, "Wikipedia: Barchan"),
    profile: [0, .06, .14, .24, .36, .5, .64, .78, .9, 1, .62, .25, .05, 0, 0, 0, 0, 0, 0, 0, 0],
    draw: ["A long gentle back and a short steep front; the crest is sharp, the slip face is smooth.", "Ripples run across the wind on the back, about 5–20 cm apart."],
    terrain: "dunes", sources: ["Wikipedia: Barchan", "Wikipedia: Ripple marks"] },
  { id: "scree", label: "Scree (talus) slope", origin: "Rock broken from cliffs piles at the foot at its angle of repose.",
    slope: rep(30, 35, 40, "Wikipedia: Scree"), relief: rep(20, 150, 500, "Wikipedia: Scree"),
    profile: [1, 1, 1, .98, .95, .88, .78, .7, .62, .54, .46, .38, .3, .22, .15, .09, .04, .01, 0, 0, 0],
    draw: ["A straight slope below a cliff, fanning out into cones under each gully; larger stones roll to the foot.", "Paler and finer-grained than the cliff above."],
    terrain: "alpine", sources: ["Wikipedia: Scree"] },
  { id: "sea-cliff", label: "Sea cliff", origin: "Waves undercut rock at the shoreline; the face collapses and retreats, leaving a wave-cut platform.",
    slope: rep(60, 80, 90, "Wikipedia: Cliffed coast"), relief: rep(10, 80, 600, "Wikipedia: Cliff"),
    profile: [0, 0, 0, 0, .02, .04, .9, .94, .96, .97, .98, .98, .99, .99, 1, 1, 1, 1, 1, 1, 1],
    draw: ["A near-vertical face with a notch at its foot, rubble and a flat rock platform at low tide.", "Grass grows to the edge; the top is not a smooth curve."],
    terrain: "coast", sources: ["Wikipedia: Cliffed coast", "Wikipedia: Wave-cut platform"] },
  { id: "rolling-hills", label: "Rolling hills", origin: "Old land worn down by soil creep and rain: rounded tops, gentle concave-convex slopes.",
    slope: est(3, 8, 20, "Wikipedia: Hill"), relief: rep(30, 150, 600, "Wikipedia: Hill"),
    profile: [.2, .3, .42, .5, .52, .46, .36, .28, .3, .42, .58, .7, .74, .68, .54, .4, .32, .3, .34, .38, .36],
    draw: ["Convex tops and concave feet (creep rounds the top, wash spreads the foot).", "Fields and hedges follow the ground; their lines curve over the hills and show the form."],
    terrain: "hills", sources: ["Wikipedia: Hill", "Wikipedia: Soil creep"] },
];

/** The steepest slope loose material holds (reported: Wikipedia, Angle of repose; typical ranges). */
export const ANGLE_OF_REPOSE: readonly { material: string; degrees: Range }[] = [
  { material: "Dry sand", degrees: rep(30, 34, 35, "Wikipedia: Angle of repose") },
  { material: "Wet sand", degrees: rep(15, 30, 45, "Wikipedia: Angle of repose") },
  { material: "Gravel (loose)", degrees: rep(30, 35, 40, "Wikipedia: Angle of repose") },
  { material: "Scree / talus", degrees: rep(30, 35, 40, "Wikipedia: Scree") },
  { material: "Volcanic cinders", degrees: rep(30, 33, 38, "Wikipedia: Cinder cone") },
  { material: "Snow (dry, settled)", degrees: rep(25, 38, 50, "Wikipedia: Avalanche (slab avalanches mostly on 30–45° slopes)") },
];

/** The snowline (the lowest height of year-round snow) by latitude, m: reported anchor points. */
export const SNOWLINE_POINTS: readonly { latitude: number; metres: number; where: string }[] = [
  { latitude: 0, metres: 4800, where: "The equatorial Andes and East Africa (Kilimanjaro, Mount Kenya): about 4,500–5,000 m" },
  { latitude: 28, metres: 5500, where: "The Himalaya: about 5,000–6,000 m (dry subtropical air raises it above the equator's)" },
  { latitude: 46, metres: 2900, where: "The Alps: about 2,700–3,100 m" },
  { latitude: 61, metres: 1500, where: "Southern Norway: about 1,200–1,600 m (lower on the wet coast)" },
  { latitude: 70, metres: 700, where: "Northern Norway and Svalbard: a few hundred metres" },
];
/** The treeline (the highest closed forest) by latitude, m: reported anchor points (Wikipedia: Tree line). */
export const TREELINE_POINTS: readonly { latitude: number; metres: number; where: string }[] = [
  { latitude: 0, metres: 3800, where: "Tropical mountains: about 3,500–4,000 m" },
  { latitude: 30, metres: 3600, where: "Himalaya and Rockies of the south: about 3,500 m" },
  { latitude: 46, metres: 2100, where: "The Alps: about 1,800–2,200 m" },
  { latitude: 61, metres: 1000, where: "Southern Scandinavia: about 900–1,200 m" },
  { latitude: 68, metres: 400, where: "Northern Scandinavia: a few hundred metres" },
];
const interp = (pts: readonly { latitude: number; metres: number }[], lat: number) => {
  const a = Math.abs(lat), k = pts.findIndex(p => p.latitude >= a);
  if (k <= 0) return k === 0 ? pts[0].metres : pts[pts.length - 1].metres;
  const p = pts[k - 1], q = pts[k], t = (a - p.latitude) / (q.latitude - p.latitude);
  return p.metres + (q.metres - p.metres) * t;
};
/** The snowline at a latitude (m), between the reported anchor points. */
export const snowlineAt = (latitude: number) => interp(SNOWLINE_POINTS, latitude);
/** The treeline at a latitude (m), between the reported anchor points. */
export const treelineAt = (latitude: number) => interp(TREELINE_POINTS, latitude);

/** Ground covers: albedo (the share of sunlight reflected, broadband) and a colour for a sunlit, level surface. */
export interface GroundCover { id: string; label: string; albedo: Range; colour: string }
/** Albedo ranges reported by Wikipedia: Albedo (its table); colours estimated from CC0 photographs. */
export const GROUND_COVERS: readonly GroundCover[] = [
  { id: "fresh-snow", label: "Fresh snow", albedo: rep(0.8, 0.85, 0.9, "Wikipedia: Albedo"), colour: "#f4f6fa" },
  { id: "old-snow", label: "Old snow", albedo: rep(0.4, 0.55, 0.7, "Wikipedia: Albedo"), colour: "#d8dce2" },
  { id: "glacier-ice", label: "Glacier ice", albedo: rep(0.2, 0.35, 0.5, "Wikipedia: Albedo (sea ice and glacier ice)"), colour: "#b9cad8" },
  { id: "granite", label: "Granite / gneiss", albedo: est(0.2, 0.28, 0.35), colour: "#8d8a85" },
  { id: "limestone", label: "Limestone", albedo: est(0.3, 0.4, 0.5), colour: "#b7b0a3" },
  { id: "basalt", label: "Basalt, fresh lava", albedo: est(0.05, 0.08, 0.12), colour: "#3b3836" },
  { id: "sandstone", label: "Red sandstone", albedo: est(0.25, 0.3, 0.38), colour: "#a7643f" },
  { id: "desert-sand", label: "Desert sand", albedo: rep(0.3, 0.4, 0.45, "Wikipedia: Albedo"), colour: "#d7b88a" },
  { id: "grass", label: "Grass, alpine meadow", albedo: rep(0.15, 0.25, 0.26, "Wikipedia: Albedo"), colour: "#67744a" },
  { id: "conifer-forest", label: "Conifer forest", albedo: rep(0.08, 0.09, 0.15, "Wikipedia: Albedo"), colour: "#2f3d2a" },
  { id: "broadleaf-forest", label: "Broadleaf forest", albedo: rep(0.15, 0.17, 0.18, "Wikipedia: Albedo"), colour: "#4d6233" },
  { id: "bare-soil", label: "Bare soil", albedo: rep(0.08, 0.17, 0.25, "Wikipedia: Albedo"), colour: "#7a6450" },
];
export const findGroundCover = (id: string): GroundCover => GROUND_COVERS.find(g => g.id === id) ?? GROUND_COVERS[0];

/** Notes on drawing land at a distance (aerial perspective; reported: Wikipedia, Aerial perspective; Koschmieder). */
export const DISTANCE_NOTES: readonly string[] = [
  "Contrast falls with distance: by Koschmieder's law an object's contrast drops to 2% at the visibility (about 40 km on a clear day, a few km in haze).",
  "Far ridges turn toward the colour of the sky behind them (blue by day, warm at sunset); shadows on them lighten first.",
  "Each range is a plane: draw three to five overlapping silhouettes, each lighter and simpler than the one in front.",
  "Snow on far peaks stays bright longest; dark forest is the first to fade into the haze.",
];
