/**
 * ARCH1 data: buildings in any art style. The human scale every building shares (doors, ceilings, storeys, stairs),
 * roof pitches by material and climate, the classical orders' proportions, the Japanese modules (shaku, ken, tatami),
 * and building types by place and period with the proportions that make them read.
 *
 * Each value is graded like the other foundations: `reported` (quoted from a cited source), `measured`, `estimated`.
 * `arch-construct.ts` builds measured front elevations from these types; `arch-react.tsx` draws them.
 */
import type { Range } from "./foundation-shapes";
import { range as r } from "./foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string): Range => r(min, typical, max, "reported", source);
const est = (min: number, typical: number, max: number, source?: string): Range => r(min, typical, max, "estimated", source);

/** The human scale (metres): what every building is built round. */
export const HUMAN_SCALE = {
  doorHeight: rep(1.98, 2.03, 2.4, "Wikipedia: Door (standard US door 6 ft 8 in; European 2.0–2.1 m)"),
  doorWidth: rep(0.7, 0.85, 0.95, "Wikipedia: Door"),
  ceilingHeight: rep(2.4, 2.6, 3.2, "Wikipedia: Ceiling (residential 2.4–2.7 m)"),
  storeyHeight: rep(2.7, 3.0, 4.2, "Wikipedia: Storey (floor to floor, residential about 3 m, commercial up to 4 m)"),
  sillHeight: est(0.75, 0.9, 1.1, "Common practice"),
  stairRiser: rep(0.15, 0.17, 0.19, "Wikipedia: Stairs (riser 15–19 cm)"),
  stairTread: rep(0.25, 0.28, 0.32, "Wikipedia: Stairs"),
  handrail: rep(0.86, 0.9, 1.0, "Wikipedia: Handrail"),
} as const;
/** Blondel's stair rule (1675): two risers plus one tread is a stride, about 63 cm (reported: Wikipedia, Stairs). */
export const blondel = (riser: number, tread: number) => 2 * riser + tread;
export const BLONDEL_STRIDE = rep(0.6, 0.63, 0.65, "Wikipedia: Stairs (François Blondel, 1675)");

/** Roof pitch by covering, degrees: steeper for coverings that leak more and for snow and rain. */
export const ROOF_PITCHES: readonly { covering: string; pitch: Range; note: string }[] = [
  { covering: "Thatch (straw, reed)", pitch: rep(45, 50, 60, "Wikipedia: Thatching (pitch of 45° or more)"), note: "Thick, rounded eaves; steep so rain runs off before it soaks in. Gasshō-zukuri farmhouses reach about 60°." },
  { covering: "Slate", pitch: rep(20, 35, 45, "Wikipedia: Slate (roofing)"), note: "Thin, flat courses; crisp ridge and verges." },
  { covering: "Clay tile (pantile, Roman)", pitch: rep(17, 25, 35, "Wikipedia: Roof tiles"), note: "Mediterranean roofs are low; courses of curved tiles read as ribs down the slope." },
  { covering: "Japanese kawara (sangawara)", pitch: est(20, 25, 30, "Wikipedia: Kawara (tile)"), note: "Wavy S-section tiles in straight rows; heavy, dark grey; ridge built up with stacked tiles and onigawara end tiles." },
  { covering: "Wooden shingles / bark (hiwadabuki)", pitch: est(25, 35, 45), note: "Fine layered texture; shrine and temple roofs, often with a curved profile." },
  { covering: "Metal (standing seam)", pitch: rep(3, 15, 45, "Wikipedia: Metal roof"), note: "Vertical seams every 30–60 cm." },
  { covering: "Flat roof (membrane, concrete)", pitch: rep(0.5, 1.5, 10, "Wikipedia: Flat roof (about 1–2° fall for drainage)"), note: "A parapet hides it; read it by the parapet line and the drainage." },
];

/** The classical orders: column height in lower diameters (reported: Vitruvius via Wikipedia, Classical order). */
export const CLASSICAL_ORDERS: readonly { id: string; label: string; height: Range; note: string }[] = [
  { id: "tuscan", label: "Tuscan", height: rep(7, 7, 7, "Wikipedia: Tuscan order (Vignola: 7 diameters)"), note: "Plain, unfluted, a simple base and capital." },
  { id: "doric", label: "Doric", height: rep(4, 5.5, 8, "Wikipedia: Doric order (Greek about 4–6, Roman about 8)"), note: "Greek Doric has no base; a plain cushion capital; 20 shallow flutes." },
  { id: "ionic", label: "Ionic", height: rep(8, 9, 9, "Wikipedia: Ionic order"), note: "Scroll (volute) capital; 24 flutes; a moulded base." },
  { id: "corinthian", label: "Corinthian", height: rep(10, 10, 10, "Wikipedia: Corinthian order"), note: "Acanthus-leaf capital; the slenderest." },
];
/** Columns are spaced in diameters (intercolumniation; reported: Wikipedia, Intercolumniation, after Vitruvius). */
export const INTERCOLUMNIATION = rep(1.5, 2.25, 4, "Wikipedia: Intercolumniation (pycnostyle 1.5 … eustyle 2.25 … araeostyle 4)");

/** The Japanese modules (reported: Wikipedia, Shaku; Ken; Tatami). */
export const JAPANESE_MODULES = {
  shaku: rep(0.303, 0.303, 0.303, "Wikipedia: Shaku (10/33 m)"),
  ken: rep(1.82, 1.82, 1.97, "Wikipedia: Ken (6 shaku = 1.82 m; Kyoto inaka-ma and kyō-ma vary)"),
  tatamiKyoma: rep(1.91, 1.91, 1.91, "Wikipedia: Tatami (kyō-ma 1.91 × 0.955 m)"),
  tatamiEdoma: rep(1.76, 1.76, 1.76, "Wikipedia: Tatami (edo-ma 1.76 × 0.88 m)"),
};

export type RoofKind = "gable" | "hip" | "irimoya" | "flat" | "thatch-hip" | "pagoda";
export type BuildingId = "machiya" | "japanese-temple" | "japanese-farmhouse" | "castle-keep" | "georgian-townhouse" | "half-timbered" | "greek-temple" | "apartment-block" | "adobe";

export interface BuildingType {
  id: BuildingId;
  label: string;
  region: string;
  period: string;
  storeys: number;
  storeyHeight: Range;
  /** Bays across the front and the bay's width (m). */
  bays: number; bayWidth: Range;
  roof: RoofKind;
  pitch: Range;
  /** Whether the roof curves (temples and keeps); plain houses have straight roofs. */
  curvedRoof: boolean;
  /** Eaves overhang, m. */
  eaves: Range;
  wall: string; roofColour: string; trim: string;
  /** What to draw so it reads. */
  notes: readonly string[];
  sources: readonly string[];
}

export const BUILDING_TYPES: readonly BuildingType[] = [
  { id: "machiya", label: "Kyoto machiya (town house)", region: "Japan", period: "Edo to Meiji (1603–1912)", storeys: 2, storeyHeight: est(2.4, 2.6, 3), bays: 2, bayWidth: rep(1.82, 1.82, 1.97, "Wikipedia: Ken"),
    roof: "gable", pitch: est(20, 24, 28, "Wikipedia: Kyō-machiya"), curvedRoof: false, eaves: est(0.6, 0.9, 1.2), wall: "#cfc3ad", roofColour: "#4a4c51", trim: "#5a4632",
    notes: ["Narrow front (about 5–6 m, two or three ken) and very deep: 'eel's beds'.", "A low second storey (mushiko-mado clay-slatted windows) under a straight tiled roof; a small eave (hisashi) over the ground floor.", "Wooden lattice (kōshi) across the front; a noren curtain at the door.", "Town roofs are straight; only temples and castle keeps curve."],
    sources: ["Wikipedia: Machiya", "Wikipedia: Kyō-machiya"] },
  { id: "japanese-temple", label: "Japanese Buddhist temple hall", region: "Japan", period: "Nara to Edo", storeys: 1, storeyHeight: est(4.5, 6, 9), bays: 5, bayWidth: est(2.5, 3, 4),
    roof: "irimoya", pitch: est(25, 32, 40), curvedRoof: true, eaves: est(2.5, 3.5, 5, "Deep eaves carried on bracket sets (tokyō)"), wall: "#d9cdb7", roofColour: "#3d4046", trim: "#7a2a1e",
    notes: ["The roof is the building: often taller than the walls, hip-and-gable (irimoya), with eaves that sag in the middle and lift at the corners.", "Bracket sets (tokyō) under the eaves; columns on stone bases; a raised floor and veranda.", "Vermilion (niwa) or bare wood columns, white plaster panels."],
    sources: ["Wikipedia: Japanese Buddhist architecture", "Wikipedia: Irimoya"] },
  { id: "japanese-farmhouse", label: "Japanese farmhouse (minka, gasshō)", region: "Japan", period: "Edo", storeys: 2, storeyHeight: est(2.4, 2.7, 3.5), bays: 4, bayWidth: rep(1.82, 1.82, 1.82, "Wikipedia: Ken"),
    roof: "thatch-hip", pitch: rep(45, 55, 60, "Wikipedia: Gasshō-zukuri (about 60°)"), curvedRoof: false, eaves: est(0.8, 1.2, 1.6), wall: "#b9a888", roofColour: "#7b6a4c", trim: "#4e3d2b",
    notes: ["A huge steep thatched roof over low walls; the thatch is about 1 m thick at the eaves.", "Gasshō 'praying hands' gables in snowy valleys; the attic floors were for silkworms."],
    sources: ["Wikipedia: Minka", "Wikipedia: Gasshō-zukuri"] },
  { id: "castle-keep", label: "Japanese castle keep (tenshu)", region: "Japan", period: "Azuchi–Momoyama to Edo", storeys: 5, storeyHeight: est(3.5, 4, 5), bays: 8, bayWidth: est(1.9, 2.4, 3),
    roof: "pagoda", pitch: est(25, 30, 35), curvedRoof: true, eaves: est(1, 1.5, 2.2), wall: "#ece8df", roofColour: "#565a60", trim: "#2c2b2a",
    notes: ["About as tall above its stone base as it is wide (Himeji); the lower storeys nearly as wide as the first, the top one about half.", "Each storey skirted by a thick tiled roof with lifted corners and white-plastered eaves; gables on the roof faces: a curved kara-hafu, pairs of triangular chidori-hafu, and one large gable higher up.", "White plaster walls (or black boards) with small windows in pairs; an ishigaki of large stones with long-and-short corner stones, upright at the top and curving out at the foot."],
    sources: ["Wikipedia: Tenshu", "Wikipedia: Japanese castle"] },
  { id: "georgian-townhouse", label: "Georgian town house", region: "Britain and Ireland", period: "1714–1830", storeys: 4, storeyHeight: rep(2.8, 3.2, 3.8, "Wikipedia: Georgian architecture (tallest at the first-floor piano nobile)"), bays: 3, bayWidth: est(1.8, 2, 2.3),
    roof: "flat", pitch: rep(0, 30, 35, "Wikipedia: Georgian architecture (a parapet hides the roof)"), curvedRoof: false, eaves: est(0, 0.15, 0.3), wall: "#7b6650", roofColour: "#3f4245", trim: "#f1ece2",
    notes: ["Sash windows about twice as tall as wide in vertical rows: six over six panes, six over nine on the tall first floor; each storey's windows shorter going up.", "Dark stock brick with flat arches of rubbed red brick over the windows and a stucco band at first-floor level.", "A panelled door under a semicircular fanlight, up steps; iron railings along the area; a parapet hides the roof, chimney stacks rise from the party walls."],
    sources: ["Wikipedia: Georgian architecture", "Wikipedia: Sash window"] },
  { id: "half-timbered", label: "Half-timbered house", region: "Northern Europe", period: "Late Middle Ages to 17th century", storeys: 3, storeyHeight: est(2.4, 2.6, 2.9), bays: 3, bayWidth: est(1.8, 2.2, 2.6),
    roof: "gable", pitch: rep(45, 52, 60, "Wikipedia: Timber framing"), curvedRoof: false, eaves: est(0.2, 0.4, 0.6), wall: "#ece4d2", roofColour: "#8a4a32", trim: "#3d2b20",
    notes: ["Dark timbers (posts, rails and braces) with pale infill; upper storeys jettied out over the street.", "A steep gable to the street; small leaded windows."],
    sources: ["Wikipedia: Timber framing", "Wikipedia: Jettying"] },
  { id: "greek-temple", label: "Greek Doric temple", region: "Greece", period: "6th–5th century BC", storeys: 1, storeyHeight: est(9, 10.4, 12, "Parthenon columns 10.4 m"), bays: 8, bayWidth: est(3.7, 4.3, 4.5, "Parthenon"),
    roof: "gable", pitch: rep(12, 14, 16, "Wikipedia: Pediment (a low pediment)"), curvedRoof: false, eaves: est(0.4, 0.6, 0.9), wall: "#e7e1d4", roofColour: "#cfc7b8", trim: "#d8d0c0",
    notes: ["A colonnade on a stepped base (crepidoma); a low triangular pediment; columns about 5½ diameters tall with a slight swelling (entasis).", "The Parthenon: 8 columns across the front."],
    sources: ["Wikipedia: Doric order", "Wikipedia: Parthenon"] },
  { id: "apartment-block", label: "Modern apartment block", region: "Worldwide", period: "1950s–", storeys: 8, storeyHeight: rep(2.8, 3.0, 3.2, "Wikipedia: Storey"), bays: 6, bayWidth: est(3, 3.6, 4.2),
    roof: "flat", pitch: rep(0.5, 1.5, 3, "Wikipedia: Flat roof"), curvedRoof: false, eaves: est(0, 0.1, 0.4), wall: "#c9c4bb", roofColour: "#8a8a88", trim: "#5d6166",
    notes: ["A repeated grid of floors and bays; balconies and window bands repeat exactly.", "Floor slabs read as horizontal lines; a ground floor taller (shops, lobby)."],
    sources: ["Wikipedia: Apartment"] },
  { id: "adobe", label: "Adobe house", region: "Southwest North America, Middle East", period: "Traditional", storeys: 1, storeyHeight: est(2.6, 3, 3.4), bays: 3, bayWidth: est(2, 2.6, 3),
    roof: "flat", pitch: rep(1, 2, 5, "Wikipedia: Adobe (flat roofs on vigas)"), curvedRoof: false, eaves: est(0, 0.05, 0.1), wall: "#b98a62", roofColour: "#a57a55", trim: "#5b4330",
    notes: ["Thick mud-brick walls with softened, rounded edges; small deep-set windows.", "Roof beams (vigas) poke out of the wall below the parapet; drain spouts (canales)."],
    sources: ["Wikipedia: Adobe", "Wikipedia: Pueblo Revival architecture"] },
];
export const findBuildingType = (id: string): BuildingType => BUILDING_TYPES.find(b => b.id === id) ?? BUILDING_TYPES[0];
