/**
 * BUG1 data: insects and other small creatures in any art style. Body plans (an insect's three parts and six legs on
 * the thorax; a spider's two parts and eight legs; snails), wings by order, the tripod gait, wingbeat rates and what
 * they look like on film, and fourteen species loved in Japanese art and seasons, with sizes, colours, behaviour and
 * sounds.
 *
 * Each value is graded like the other foundations: `reported` (quoted from a cited source), `measured`, `estimated`.
 * `bug-construct.ts` builds top-view drawings from these; `bug-react.tsx` draws and animates them.
 */
import type { Range } from "./foundation-shapes";
import { range as r } from "./foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string): Range => r(min, typical, max, "reported", source);
const est = (min: number, typical: number, max: number, source?: string): Range => r(min, typical, max, "estimated", source);

export type BugPlanId = "insect" | "spider" | "snail";
export interface BugPlan { id: BugPlanId; label: string; parts: readonly string[]; legs: number; rules: readonly string[]; mistakes: readonly string[] }
export const BUG_PLANS: readonly BugPlan[] = [
  { id: "insect", label: "Insect", parts: ["head (eyes, antennae, mouthparts)", "thorax (three segments: pro-, meso-, metathorax)", "abdomen (about 9–11 segments)"], legs: 6,
    rules: ["All six legs come from the thorax, one pair per segment; none from the abdomen.", "Each leg: coxa, trochanter, femur (long), tibia (long), tarsus (several small segments) and claws.", "Wings (if any) grow from the second and third thoracic segments: two pairs, or one in flies.", "Two antennae on the head, between or in front of the compound eyes."],
    mistakes: ["Legs on the abdomen.", "Four legs, or eight.", "Wings from the head or the abdomen.", "Legs as straight sticks with no knee (the femur–tibia joint)."] },
  { id: "spider", label: "Spider (arachnid)", parts: ["cephalothorax (eyes, fangs, palps, all eight legs)", "abdomen (spinnerets at the tip)"], legs: 8,
    rules: ["Eight legs, all from the cephalothorax; two short palps in front (they look like a fifth pair of tiny legs).", "No antennae and no wings; usually eight simple eyes in rows.", "Legs bend up at the 'knee' and down to the ground, so a spider stands inside a cage of its legs."],
    mistakes: ["Six legs, or antennae.", "Three body parts."] },
  { id: "snail", label: "Snail (gastropod)", parts: ["foot (the whole underside)", "head with two pairs of tentacles (eyes on the upper, longer pair)", "shell (a spiral, usually right-handed)"], legs: 0,
    rules: ["The body is one muscular foot; it glides on a film of mucus by waves running along the sole.", "Most land snails' shells coil clockwise seen from the apex (dextral)."],
    mistakes: ["Eyes on the lower tentacles.", "A shell coiled the wrong way for the species."] },
];

export type WingKind = "none" | "scaled" | "net" | "membrane" | "elytra" | "one-pair" | "tegmina";
/** Wings by order: how many, what they are made of, how they rest. */
export const WINGS: Record<WingKind, { label: string; pairs: number; rest: string; look: string }> = {
  none: { label: "Wingless", pairs: 0, rest: "", look: "" },
  scaled: { label: "Scaled wings (butterflies, moths)", pairs: 2, rest: "Butterflies close them upright over the back; moths fold them flat or tent-wise.", look: "Opaque, coloured by scales; the forewing overlaps the hindwing." },
  net: { label: "Net-veined wings (dragonflies, damselflies)", pairs: 2, rest: "Dragonflies hold all four out flat; damselflies fold them together over the back.", look: "Clear, with a dense net of veins and a dark spot (pterostigma) near each tip; fore and hind work separately." },
  membrane: { label: "Membranous wings (bees, wasps)", pairs: 2, rest: "Folded flat over the back.", look: "Clear with few veins; fore and hind wings hooked together in flight." },
  elytra: { label: "Elytra over flying wings (beetles)", pairs: 2, rest: "The hard forewings (elytra) close over the back and meet in a straight line; the flying wings fold beneath.", look: "Shiny, domed covers; in flight the elytra lift up and out and the clear hindwings beat." },
  "one-pair": { label: "One pair (flies, mosquitoes)", pairs: 1, rest: "Held flat or angled over the back.", look: "Clear; a pair of tiny drumstick halteres behind them." },
  tegmina: { label: "Leathery forewings (crickets, grasshoppers, mantises)", pairs: 2, rest: "The leathery forewings (tegmina) lie along the back over the fan-folded hindwings.", look: "Forewings tinted like leaves; hindwings open like a fan in flight." },
};

/** Wingbeat frequency, Hz (reported: Wikipedia, Insect flight, and the sources it cites). */
export const WINGBEATS: readonly { who: string; hz: Range }[] = [
  { who: "Butterflies", hz: rep(5, 10, 12, "Wikipedia: Insect flight") },
  { who: "Dragonflies", hz: rep(20, 30, 40, "Wikipedia: Insect flight") },
  { who: "Honeybee", hz: rep(200, 230, 250, "Wikipedia: Insect flight") },
  { who: "Housefly", hz: rep(170, 190, 200, "Wikipedia: Insect flight") },
  { who: "Mosquito", hz: rep(300, 450, 600, "Wikipedia: Mosquito") },
  { who: "Midges", hz: rep(600, 1000, 1046, "Wikipedia: Insect flight") },
];
/** What a wingbeat looks like on film: a camera at `fps` sees each beat as distinct poses only below about fps / 2. */
export function wingsOnFilm(hz: number, fps = 24): "poses" | "blur" { return hz < fps / 2 ? "poses" : "blur"; }

/** The tripod gait: an insect walks on alternating tripods (front and hind leg of one side with the middle leg of the other). */
export const TRIPOD = { groups: [["L1", "R2", "L3"], ["R1", "L2", "R3"]] as const, source: "Wikipedia: Insect locomotion (alternating tripod gait)" };

export type BugId = "firefly" | "dragonfly" | "swallowtail" | "cabbage-white" | "cicada" | "honeybee" | "ant" | "ladybird" | "mantis" | "bell-cricket" | "stag-beetle" | "rhino-beetle" | "orb-spider" | "snail";

export interface BugSpecies {
  id: BugId; label: string; ja: string; latin: string; plan: BugPlanId; wings: WingKind;
  /** Body length, mm (wingspan for butterflies and dragonflies where noted). */
  length: Range; wingspan?: Range;
  /** Colours for body, wings and accents. */
  colours: { body: string; wing?: string; accent?: string; glow?: string };
  /** Body proportions (shares of length): head, thorax, abdomen; and widths (shares of length). */
  shape: { head: number; thorax: number; abdomen: number; width: number; abdomenWidth: number };
  /** Leg length as a share of body length, and antenna length. */
  legs: number; antennae: number;
  season: string; behaviour: readonly string[]; sound?: string;
  sources: readonly string[];
}

export const BUG_SPECIES: readonly BugSpecies[] = [
  { id: "firefly", label: "Genji firefly", ja: "源氏蛍", latin: "Luciola cruciata", plan: "insect", wings: "elytra", length: rep(10, 15, 18, "Wikipedia: Luciola cruciata"),
    colours: { body: "#2a2622", wing: "#2a2622", accent: "#c4402f", glow: "#c8ff5a" }, shape: { head: 0.1, thorax: 0.22, abdomen: 0.68, width: 0.32, abdomenWidth: 0.3 }, legs: 0.5, antennae: 0.5,
    season: "Early summer (June), by streams at dusk", behaviour: ["Glows yellow-green (about 560 nm) from the last abdominal segments.", "Flashes in time with others: about every 4 s in eastern Japan, about every 2 s in the west.", "Red-orange pronotum with a black cross-shaped mark."], sources: ["Wikipedia: Luciola cruciata", "Wikipedia: Bioluminescence"] },
  { id: "dragonfly", label: "Red dragonfly", ja: "赤とんぼ (秋茜)", latin: "Sympetrum frequens", plan: "insect", wings: "net", length: rep(32, 38, 46, "Wikipedia: Sympetrum frequens"), wingspan: est(55, 60, 65),
    colours: { body: "#b8371f", wing: "rgba(235,230,215,0.35)", accent: "#3a2a20" }, shape: { head: 0.1, thorax: 0.2, abdomen: 0.7, width: 0.18, abdomenWidth: 0.08 }, legs: 0.35, antennae: 0.04,
    season: "Autumn (September–October), over rice fields", behaviour: ["Huge eyes meeting on top of the head; a long thin abdomen; four wings held flat at rest.", "Perches on stems tips, wings angled forward and down.", "Males turn red as they mature."], sources: ["Wikipedia: Sympetrum frequens", "Wikipedia: Dragonfly"] },
  { id: "swallowtail", label: "Swallowtail", ja: "揚羽蝶", latin: "Papilio xuthus", plan: "insect", wings: "scaled", length: rep(25, 30, 35, "Wikipedia: Papilio xuthus"), wingspan: rep(65, 80, 100, "Wikipedia: Papilio xuthus"),
    colours: { body: "#1f1c18", wing: "#f1d36a", accent: "#1f1c18" }, shape: { head: 0.08, thorax: 0.28, abdomen: 0.64, width: 0.16, abdomenWidth: 0.12 }, legs: 0.6, antennae: 0.75,
    season: "Spring to autumn, at citrus and flowers", behaviour: ["Pale yellow wings with black veins and bands, blue and red spots near the tails.", "Rests and feeds with wings closed upright; flutters at about 5–10 beats a second."], sources: ["Wikipedia: Papilio xuthus"] },
  { id: "cabbage-white", label: "Cabbage white", ja: "紋白蝶", latin: "Pieris rapae", plan: "insect", wings: "scaled", length: rep(15, 18, 20, "Wikipedia: Pieris rapae"), wingspan: rep(32, 45, 47, "Wikipedia: Pieris rapae"),
    colours: { body: "#3a3833", wing: "#f3f1e8", accent: "#3a3833" }, shape: { head: 0.1, thorax: 0.3, abdomen: 0.6, width: 0.16, abdomenWidth: 0.12 }, legs: 0.6, antennae: 0.7,
    season: "Spring (the first butterfly of spring in haiku)", behaviour: ["White with grey tips and one or two black spots on the forewing.", "Erratic, bobbing flight."], sources: ["Wikipedia: Pieris rapae"] },
  { id: "cicada", label: "Large brown cicada", ja: "油蝉", latin: "Graptopsaltria nigrofuscata", plan: "insect", wings: "membrane", length: rep(53, 58, 60, "Wikipedia: Graptopsaltria nigrofuscata (with wings)"),
    colours: { body: "#3b2d22", wing: "rgba(110,70,40,0.75)", accent: "#5e8a5b" }, shape: { head: 0.16, thorax: 0.36, abdomen: 0.48, width: 0.4, abdomenWidth: 0.36 }, legs: 0.35, antennae: 0.08,
    season: "High summer (July–August)", behaviour: ["Broad head with widely set eyes; opaque brown wings held tent-wise over the body.", "Males sing from tree trunks in the heat; the call is a sizzling like oil frying."], sound: "Sizzling buzz (aburazemi); minminzemi 'min-min-min'; higurashi 'kana-kana' at dusk", sources: ["Wikipedia: Graptopsaltria nigrofuscata", "Wikipedia: Cicada"] },
  { id: "honeybee", label: "Japanese honeybee", ja: "日本蜜蜂", latin: "Apis cerana japonica", plan: "insect", wings: "membrane", length: rep(10, 12, 13, "Wikipedia: Apis cerana"),
    colours: { body: "#5a3d1e", wing: "rgba(230,230,235,0.35)", accent: "#e1a43a" }, shape: { head: 0.2, thorax: 0.32, abdomen: 0.48, width: 0.32, abdomenWidth: 0.34 }, legs: 0.6, antennae: 0.3,
    season: "Spring to autumn", behaviour: ["Banded abdomen, a fuzzy thorax; pollen baskets on the hind legs.", "Wings a blur (about 230 beats a second); a hum."], sound: "A hum about 230 Hz", sources: ["Wikipedia: Apis cerana", "Wikipedia: Insect flight"] },
  { id: "ant", label: "Japanese carpenter ant", ja: "黒大蟻", latin: "Camponotus japonicus", plan: "insect", wings: "none", length: rep(7, 10, 12, "Wikipedia: Camponotus japonicus"),
    colours: { body: "#1d1a17" }, shape: { head: 0.24, thorax: 0.34, abdomen: 0.42, width: 0.22, abdomenWidth: 0.3 }, legs: 0.85, antennae: 0.6,
    season: "Spring to autumn", behaviour: ["A narrow waist (petiole) between thorax and abdomen; elbowed antennae.", "Walks in files on scent trails, using the tripod gait."], sources: ["Wikipedia: Camponotus japonicus", "Wikipedia: Ant"] },
  { id: "ladybird", label: "Seven-spot ladybird", ja: "七星天道", latin: "Coccinella septempunctata", plan: "insect", wings: "elytra", length: rep(5, 7, 8, "Wikipedia: Coccinella septempunctata"),
    colours: { body: "#141414", wing: "#d12a1c", accent: "#141414" }, shape: { head: 0.14, thorax: 0.2, abdomen: 0.66, width: 0.82, abdomenWidth: 0.8 }, legs: 0.35, antennae: 0.15,
    season: "Spring to autumn", behaviour: ["A domed red shell with seven black spots (three on each elytron and one shared at the front).", "White patches on the black pronotum."], sources: ["Wikipedia: Coccinella septempunctata"] },
  { id: "mantis", label: "Chinese mantis", ja: "大蟷螂", latin: "Tenodera sinensis", plan: "insect", wings: "tegmina", length: rep(70, 85, 95, "Wikipedia: Tenodera sinensis"),
    colours: { body: "#7c9a52", wing: "#8aa860", accent: "#c5b36a" }, shape: { head: 0.08, thorax: 0.38, abdomen: 0.54, width: 0.1, abdomenWidth: 0.12 }, legs: 0.6, antennae: 0.35,
    season: "Late summer to autumn", behaviour: ["A long neck-like prothorax; spiked front legs folded as if praying.", "A triangular head that turns to look at you."], sources: ["Wikipedia: Tenodera sinensis"] },
  { id: "bell-cricket", label: "Bell cricket", ja: "鈴虫", latin: "Meloimorpha japonica", plan: "insect", wings: "tegmina", length: rep(17, 19, 25, "Wikipedia: Meloimorpha japonica"),
    colours: { body: "#2a251c", wing: "rgba(120,110,80,0.7)", accent: "#cfc6a0" }, shape: { head: 0.16, thorax: 0.16, abdomen: 0.68, width: 0.36, abdomenWidth: 0.36 }, legs: 0.9, antennae: 1.6,
    season: "Autumn nights", behaviour: ["Males raise their wide, clear forewings to sing; long thread antennae.", "Kept in cages for their song since the Heian period."], sound: "A clear 'rī-n rī-n' chirp around 4 kHz", sources: ["Wikipedia: Meloimorpha japonica"] },
  { id: "stag-beetle", label: "Giant stag beetle", ja: "大鍬形", latin: "Dorcus hopei binodulosus", plan: "insect", wings: "elytra", length: rep(27, 55, 77, "Wikipedia: Dorcus hopei (males with mandibles)"),
    colours: { body: "#1a1512", wing: "#1f1915", accent: "#3a2e26" }, shape: { head: 0.28, thorax: 0.2, abdomen: 0.52, width: 0.36, abdomenWidth: 0.38 }, legs: 0.45, antennae: 0.2,
    season: "Summer nights, on sap", behaviour: ["Males carry huge antler-like mandibles (part of the head's length).", "Glossy black-brown elytra."], sources: ["Wikipedia: Dorcus hopei", "Wikipedia: Stag beetle"] },
  { id: "rhino-beetle", label: "Japanese rhinoceros beetle", ja: "兜虫", latin: "Trypoxylus dichotomus", plan: "insect", wings: "elytra", length: rep(30, 55, 85, "Wikipedia: Trypoxylus dichotomus (males with horn)"),
    colours: { body: "#3a1f12", wing: "#4a2816", accent: "#2a160c" }, shape: { head: 0.22, thorax: 0.24, abdomen: 0.54, width: 0.44, abdomenWidth: 0.48 }, legs: 0.45, antennae: 0.1,
    season: "Summer nights, on sap", behaviour: ["Males: a forked horn on the head and a short one on the pronotum.", "Reddish-brown, glossy; strong spiny legs."], sources: ["Wikipedia: Trypoxylus dichotomus"] },
  { id: "orb-spider", label: "Jorō spider", ja: "女郎蜘蛛", latin: "Trichonephila clavata", plan: "spider", wings: "none", length: rep(17, 22, 30, "Wikipedia: Trichonephila clavata (females)"),
    colours: { body: "#2a2a22", accent: "#e6c63a", wing: "#b8332a" }, shape: { head: 0.3, thorax: 0, abdomen: 0.7, width: 0.25, abdomenWidth: 0.32 }, legs: 1.9, antennae: 0,
    season: "Late summer to autumn", behaviour: ["Females: yellow and blue-black bands, a red mark under the abdomen; very long banded legs.", "Golden orb webs with a fine net, often in groups.", "The jorōgumo of folklore."], sources: ["Wikipedia: Trichonephila clavata", "Wikipedia: Jorōgumo"] },
  { id: "snail", label: "Land snail", ja: "蝸牛", latin: "Euhadra spp.", plan: "snail", wings: "none", length: est(25, 35, 45, "Wikipedia: Euhadra"),
    colours: { body: "#a3907a", wing: "#9a6e3e", accent: "#4a3424" }, shape: { head: 0.2, thorax: 0, abdomen: 0.8, width: 0.4, abdomenWidth: 0.6 }, legs: 0, antennae: 0.4,
    season: "Rainy season (tsuyu, June)", behaviour: ["Glides on its foot leaving a shining trail; withdraws its tentacles at a touch.", "Some Euhadra coil left (sinistral), unlike most snails."], sources: ["Wikipedia: Euhadra", "Wikipedia: Snail"] },
];
export const findBug = (id: string): BugSpecies => BUG_SPECIES.find(b => b.id === id) ?? BUG_SPECIES[0];
