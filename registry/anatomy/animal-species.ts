/**
 * ANIM1 species: one record per animal, stating only how it differs from its body plan (`animal-plans.ts`).
 *
 * A record holds what stays true in every art style:
 * - sizes with their sources;
 * - proportions graded "reported" (from a source), "measured" (from a reference plate) or "estimated";
 * - the coat (type, where it is long, how it lies) and the colour zones, with markings and seasonal or juvenile variants;
 * - the eye;
 * - the parts that set it apart (tusks, a crescent, antlers);
 * - behaviour (gaits, rearing, climbing, swimming);
 * - its sounds (recorded catalog sounds where we have them, Openverse search terms where we do not);
 * - its place in Japanese art and folklore;
 * - references (public domain or CC0);
 * - where it is already drawn in this library, style by style.
 *
 * Colours are estimates read from the references, for a painter to start from; they are not measurements.
 */
import type { AnimalPart, AnimalRegion, BodyPlanId, PlanConstruction } from "./animal-plans";
import type { GaitId } from "./animal-gaits";
import { commons as C, range as r, wikipedia as W } from "./foundation-shapes";
import type { FoundationReference, FoundationSound, Grade, Range, StyleImplementation } from "./foundation-shapes";

export type { Grade, Range, StyleImplementation };
export type AnimalSound = FoundationSound;
export type AnimalReference = FoundationReference;

/** The numeric construction values a species can override. */
export type ConstructionKey = "trunk" | "chestDepth" | "legClearance" | "head" | "muzzle" | "neck" | "neckAngle" | "tail" | "girth" | "barrel" | "headAngle" | "bodyAngle";
/**
 * A colour and where it goes. `fill` says how a colour map paints it:
 * - "area" (the default) fills the region;
 * - "tip" fills the region's end (tail tip, ear tips, snout disc, wing tips);
 * - "band" paints a stripe along it (along the spine or the neck crest, along the jaw, a crescent across the chest, an eye stripe on a bird);
 * - "eye-patch" paints a mask round the eye;
 * - "accent" marks colours that are not areas (sheen, claws, spots, patches) and appear only in the palette.
 * The first "back" swatch is the base coat.
 */
export interface Swatch { region: AnimalRegion; name: string; hex: string; fill?: "area" | "tip" | "band" | "eye-patch" | "accent" }
export interface Marking { name: string; region: AnimalRegion; shape: string }
/** A coat for a season, sex or age. `age` marks a young coat: the span of growth (0 youngest … 1 adult, as `animal-growth.ts`) it is worn for. */
export interface CoatVariant { name: string; when: string; palette: readonly Swatch[]; age?: readonly [number, number] }
/**
 * The face, in any style. Profile values are shares of the head length: occiput to nose for mammals, the back of the
 * skull to the bill tip for birds, the snout to the back of the gill cover for fish. `eyeSpacing` is the gap between the
 * eye centres ÷ the head's width square on. A bird's bill share is its `proportions.muzzle`.
 */
export interface AnimalFace {
  /** The eye centre's distance back from the nose (bill tip, snout). */
  eyeFromNose: number;
  /** Eye length, ear height (mammals; birds and fish have none) and head depth at the eye, as shares of the head length. */
  eye: number; ear?: number; depth: number;
  eyeSpacing: number;
  /** How the eye reads: a glossy black bead, an iris with a round or slit pupil. */
  eyeLook: "bead" | "iris" | "slit";
  /** Where the ears sit, and their shape. */
  ears: string;
  /** What makes the face: masks, stripes, muzzle shape, what not to draw. */
  features: readonly string[];
  grade: Grade;
  source: string;
  /** The face square on, where it was measured off a reference (otherwise `frontFace` uses the body plan's). */
  front?: FrontFace;
}

/**
 * A face square on, in units of the head's width at the eyes (cheek to cheek), measured from the eye line (+ up, −
 * down) and the centre line. `animal-front.ts` draws it; `frontFace(species)` falls back to the body plan's.
 */
export interface FrontFace {
  /** Top of the skull between the ears, above the eye line. */
  crown: number;
  /** Chin (or the lower lip) below the eye line. */
  chin: number;
  /** The nose's centre below the eye line, its width, and the muzzle's width at the whisker pads (or lips). */
  nose: number; noseWidth: number; muzzleWidth: number;
  /** Eye width. */
  eye: number;
  /** The ear tip: out from the centre line, and above the eye line (negative: below, a cow's ears out sideways). */
  earTip: readonly [number, number];
  /** The ear's base: its width, and how far out from the centre line its middle sits. */
  earBase: number; earBaseX: number;
  grade: Grade;
  source: string;
}

export interface AnimalSpecies {
  id: string;
  name: string;
  ja: { kana: string; kanji?: string; romaji: string };
  scientific: string;
  plan: BodyPlanId;
  /** Real sizes in cm (lengths) and kg, with sources. `length` is head-and-body (nose to tail root) for mammals, bill to tail tip for birds. */
  size: { shoulder?: Range; length: Range; tail?: Range; wingspan?: Range; mass: Range };
  /** Overrides of the plan's construction, graded. */
  proportions: Partial<Record<ConstructionKey, Range>> & Partial<Pick<PlanConstruction, "back" | "ear" | "tailCarriage">>;
  coat: {
    type: "bristly" | "shaggy" | "dense" | "sleek" | "woolly" | "feathers" | "scales";
    /** Where the coat is longest and how it lies. */
    long: readonly AnimalRegion[];
    lay: string;
    palette: readonly Swatch[];
    markings: readonly Marking[];
    variants: readonly CoatVariant[];
  };
  eyes: { pupil: "round" | "vertical-slit" | "horizontal"; iris: string; note?: string };
  face?: AnimalFace;
  parts: readonly AnimalPart[];
  behaviour: { gaits: readonly GaitId[]; canRear: boolean; climbs?: boolean; swims?: boolean; flies?: boolean; notes: readonly string[] };
  sounds: readonly AnimalSound[];
  culture: readonly string[];
  references: readonly AnimalReference[];
  sources: readonly { title: string; url: string }[];
  styles: readonly StyleImplementation[];
}

const MUYBRIDGE: AnimalReference = { title: "Muybridge, Animals in Motion (1899): phases of the gallop, p. 201", url: "https://archive.org/details/gri_33125012264293", rights: "public-domain", kind: "motion" };
const AKC_SHIBA = "AKC Shiba Inu breed standard";
const INAT = (id: number) => `https://www.inaturalist.org/observations/${id}`;
const INAT_CARP = INAT(259810202), INAT_CARP_2 = INAT(183724795);
const INAT_FOX = INAT(338352584), INAT_CAT_PROFILE = INAT(350287666), INAT_CAT_FRONT = INAT(234370227), INAT_HARE = INAT(307096718), INAT_SIKA = INAT(326610803);
const uk = (id: string, note?: string): StyleImplementation => ({ style: "ukiyo-e", pack: "ukiyoe-handscroll", id, note });

export const ANIMAL_SPECIES: readonly AnimalSpecies[] = [
  {
    id: "asian-black-bear", name: "Asian black bear (moon bear)", ja: { kana: "ツキノワグマ", kanji: "月輪熊", romaji: "tsukinowaguma" }, scientific: "Ursus thibetanus (Japan: U. t. japonicus)", plan: "ursid",
    size: { shoulder: r(70, 85, 100, "reported", "Asian black bear"), length: r(120, 155, 190, "reported", "Asian black bear"), tail: r(10, 11, 12, "reported", "Asian black bear"), mass: r(40, 100, 200, "reported", "Asian black bear") },
    proportions: { trunk: r(1.15, 1.25, 1.35, "estimated", "head-and-body ÷ shoulder less the head and neck"), chestDepth: r(.55, .62, .68, "measured", "Tanaka 1875 plate"),
      legClearance: r(.3, .36, .42, "measured", "Tanaka 1875 plate"), head: r(.38, .42, .46, "measured", "Tanaka 1875 plate"), muzzle: r(.36, .4, .45, "measured", "Okuhida specimens"), back: "arched" },
    coat: { type: "shaggy", long: ["neck", "throat", "chest", "belly"], lay: "Long black hair round the neck and shoulders forming a ruff; shorter on the face and legs.",
      palette: [{ region: "back", name: "coat", hex: "#1c1a19" }, { region: "back", name: "sheen", hex: "#3d3936", fill: "accent" }, { region: "muzzle", name: "muzzle", hex: "#9a7856" },
        { region: "chest", name: "crescent", hex: "#f1ede2", fill: "band" }, { region: "eyes", name: "iris", hex: "#4a3020" }, { region: "feet", name: "claws", hex: "#bdb3a4", fill: "accent" }],
      markings: [{ name: "crescent (tsukinowa)", region: "chest", shape: "A white V or crescent across the throat and upper chest; its size varies and it can be absent." },
        { name: "tan muzzle", region: "muzzle", shape: "Brown to tan from the stop to the nose and under the chin." }],
      variants: [{ name: "cub", when: "first year", age: [0, .6], palette: [{ region: "back", name: "coat", hex: "#232020" }, { region: "chest", name: "crescent", hex: "#f1ede2", fill: "band" }] }] },
    eyes: { pupil: "round", iris: "#4a3020", note: "Small, set forward." },
    face: { eyeFromNose: .45, eye: .05, ear: .3, depth: .5, eyeSpacing: .4, eyeLook: "iris", ears: "Large, round, set high and wide at the top corners of the skull.",
      features: ["A long, tapering tan muzzle: narrow at the bridge between the eyes, broad at the big black nose.", "The forehead slopes into the muzzle with little stop.", "Small eyes, set wide; a short straight mouth (no smile).", "Broad cheeks framed by the shaggy ruff."],
      grade: "estimated", source: "Read by eye off Kinloch's moon bear (front), the Omiya and Okuhida photographs (profile)" },
    parts: [{ id: "crescent", name: "white chest crescent", region: "chest" }, { id: "ruff", name: "neck ruff", region: "neck" }, { id: "round-ears", name: "large round ears", region: "ears", note: "Set high and wide on the skull; larger than a brown bear's." }],
    behaviour: { gaits: ["walk", "amble", "gallop"], canRear: true, climbs: true, swims: true, notes: ["The most bipedal bear: it walks upright for long distances.", "Fore claws 30–45 mm, longer than the hind (18–36 mm)."] },
    sounds: [{ kind: "vocal", label: "growl", query: "bear growl" }, { kind: "vocal", label: "huff and jaw pop", query: "bear huff" }, { kind: "foley", label: "heavy padded footsteps", query: "heavy footsteps leaves animal" }],
    culture: ["Kintarō wrestles a bear and rides it (Hokusai, Kiyomasu).", "Mountain spirit and hunter's quarry in matagi lore."],
    references: [{ title: "Kinloch, Large Game Shooting: moon bear face", url: C("Moon_bear_face.png"), rights: "public-domain", kind: "plate" }, { title: "Omiya park zoo bear", url: C("Omiya_park_zoo_008.jpg"), rights: "CC0", kind: "photo" }, { title: "Tanaka Yoshio, Dōbutsu kunmō: Tibet bear (1875)", url: C("クマ「熊」_-_TIBET_BEAR_(URSUS_THIBETANUS)_動物訓蒙_初編（哺乳類)_1875.jpg"), rights: "public-domain", kind: "plate" },
      { title: "Okuhida Bear Park specimens", url: C("Okuhida_Bear_Park_20210502_01.jpg"), rights: "CC0", kind: "photo" },
      { title: "Ursus thibetanus on Mount Kurai", url: C("Ursus_thibetanus_in_Mount_Kurai_2011-02-20.JPG"), rights: "CC0", kind: "photo" },
      { title: "Hokusai, Sakata Kintoki Riding on Bear's Back (Met 56.121.16)", url: C("Katsushika_Hokusai_-_Sakata_Kintoki_Riding_on_Bear's_Back_-_56.121.16_-_Metropolitan_Museum_of_Art.jpg"), rights: "public-domain", kind: "painting" }, MUYBRIDGE],
    sources: [W("Asian_black_bear")], styles: [uk("bear", "Profile, three-quarter, front, back; the crescent, tan muzzle and claws.")],
  },
  {
    id: "japanese-wild-boar", name: "Japanese wild boar", ja: { kana: "ニホンイノシシ", kanji: "猪", romaji: "inoshishi" }, scientific: "Sus scrofa leucomystax", plan: "suid",
    size: { shoulder: r(63, 75, 95, "reported", "Wild boar (European averages; Japanese boar are smaller)"), length: r(110, 140, 160, "reported", "Wild boar"), tail: r(15, 20, 25, "estimated"), mass: r(45, 75, 130, "reported", "Wild boar") },
    proportions: { trunk: r(1.1, 1.2, 1.3, "estimated", "head-and-body ÷ shoulder less the head and neck"), chestDepth: r(.4, .45, .52, "measured", "Fauna Japonica pl. 20"),
      legClearance: r(.4, .5, .57, "measured", "Fauna Japonica pl. 20; della Bella"), head: r(.52, .6, .66, "measured", "Fauna Japonica pl. 20"), muzzle: r(.5, .55, .6, "measured", "Fauna Japonica pl. 20"), back: "sloping" },
    coat: { type: "bristly", long: ["back", "neck"], lay: "Coarse bristles lying back; a crest of long bristles along the nape and spine stands up when the boar is roused.",
      palette: [{ region: "back", name: "coat", hex: "#4f3626" }, { region: "back", name: "crest", hex: "#2e2018", fill: "band" }, { region: "face", name: "jaw stripe", hex: "#d9d0c2", fill: "band" },
        { region: "feet", name: "lower legs", hex: "#6b5a4a" }, { region: "feet", name: "hooves", hex: "#1f1a17" }, { region: "muzzle", name: "snout disc", hex: "#4a3b36", fill: "tip" }],
      markings: [{ name: "white jaw stripe (leucomystax, 'white whiskers')", region: "face", shape: "A pale band from the corner of the mouth back along the jaw to the throat." }],
      variants: [{ name: "piglet (uribō, 'melon')", when: "first months", age: [0, .4], palette: [{ region: "back", name: "base", hex: "#8a6a4a" }, { region: "back", name: "stripes", hex: "#e4d3b4", fill: "band" }] }] },
    eyes: { pupil: "round", iris: "#3b2a1e", note: "Small, set high and well back on the head." },
    face: { eyeFromNose: .6, eye: .04, ear: .3, depth: .5, eyeSpacing: .5, eyeLook: "iris", ears: "Broad, hairy, pointed; laid back on the crown just behind the eye.",
      features: ["A long deep wedge: forehead and snout one straight line, ending in the flat snout disc.", "The small eye is set far back, about three-fifths of the way from the snout to the ear.", "Heavy jaw and jowl; the lower tusk curving up out of the lip.", "Square on, the head is nearly as wide as the chest and carried low."],
      grade: "estimated", source: "Read by eye off Fauna Japonica pl. 20, Jan Fyt's Head of a Wild Boar and the Allen & Ginter card (MET)" },
    parts: [{ id: "tusks", name: "tusks", region: "muzzle", note: "Lower canines curve up and back out of the lip; exposed 10–12 cm in old males." }, { id: "crest", name: "bristle crest", region: "back" }],
    behaviour: { gaits: ["walk", "trot", "gallop"], canRear: false, swims: true, notes: ["Runs up to 40 km/h and jumps 140–150 cm.", "Digs with its snout like a plough."] },
    sounds: [{ kind: "vocal", label: "grunt", query: "wild boar grunt" }, { kind: "vocal", label: "squeal", query: "pig squeal" }, { kind: "foley", label: "hooves on earth", query: "hooves running dirt" }],
    culture: ["The last of the twelve zodiac animals (i).", "Nitta no Shirō Tadatsune rode and killed a giant boar at Mount Fuji (Kuniyoshi).", "'Inoshishi-musha': a warrior who charges straight ahead."],
    references: [{ title: "Jan Fyt, The Head of a Wild Boar", url: C("The_Head_of_a_Wild_Boar_.PNG"), rights: "public-domain", kind: "painting" }, { title: "Wild Boar, Allen & Ginter (MET DP836519)", url: C("Wild_Boar,_from_the_Wild_Animals_of_the_World_series_(N25)_for_Allen_&_Ginter_Cigarettes_MET_DP836519.jpg"), rights: "CC0", kind: "print" }, { title: "Fauna Japonica, Mammalia pl. 20: Sus leucomystax", url: C("Sus_leucomystax_(Fauna_Japonica_Mammalia_20).jpg"), rights: "public-domain", kind: "plate" },
      { title: "Tachibana Morikuni, Wild boars running (LC 2008660987)", url: C("Wild_boars_running,_on_cliffs,_and_near_pine_trees_LCCN2008660987.jpg"), rights: "public-domain", kind: "print" },
      { title: "Kuniyoshi, Nitta no Shirō Tadatsune and the boar (BM 2008,3037.21407)", url: C("Print_(BM_2008,3037.21407).jpg"), rights: "public-domain", kind: "print" }, MUYBRIDGE],
    sources: [W("Wild_boar")], styles: [uk("boar", "Wedge head, snout disc, tusk, jaw stripe, crest, cloven hooves.")],
  },
  {
    id: "red-fox", name: "Red fox", ja: { kana: "キツネ", kanji: "狐", romaji: "kitsune" }, scientific: "Vulpes vulpes", plan: "canid",
    size: { shoulder: r(35, 42, 50, "reported", "Red fox"), length: r(45, 68, 90, "reported", "Red fox"), tail: r(30, 42, 55, "reported", "Red fox"), mass: r(2.2, 6, 14, "reported", "Red fox") },
    proportions: { trunk: r(.85, .95, 1.05, "estimated", "head-and-body ÷ shoulder less the head and neck"), head: r(.32, .36, .4, "estimated"), ear: { length: .55, width: .36, shape: "pointed" }, neck: r(.26, .3, .34, "estimated"), tail: r(.55, .62, .7, "reported", "tail ÷ length"), muzzle: r(.5, .55, .6, "estimated") },
    coat: { type: "dense", long: ["tail", "throat", "chest", "hind-leg"], lay: "Lies back along the body; a full brush of a tail; a ruff on the cheeks and throat in winter.",
      palette: [{ region: "back", name: "coat", hex: "#c8642a" }, { region: "throat", name: "white bib", hex: "#f3ece0" }, { region: "feet", name: "black stockings", hex: "#2a1e18" },
        { region: "ears", name: "ear backs", hex: "#2a1e18" }, { region: "tail", name: "tail tip", hex: "#f5f1ea", fill: "tip" }],
      markings: [{ name: "white tail tip", region: "tail", shape: "The last few centimetres of the brush." }, { name: "black stockings and ear backs", region: "feet", shape: "Black from the elbows and hocks down." }],
      variants: [{ name: "winter coat", when: "winter", palette: [{ region: "back", name: "coat", hex: "#d17a3a" }] },
        { name: "kit", when: "first weeks: dark brown fluffy fur, the eyes blue (reported: Wikipedia, Red fox); the coat changes from three weeks, red and white on the face by a month, so only the very youngest drawn age wears it", age: [0, .08], palette: [{ region: "back", name: "dark brown", hex: "#4a3a30" }, { region: "throat", name: "dark brown", hex: "#4a3a30" }, { region: "tail", name: "dark brown", hex: "#4a3a30", fill: "tip" }, { region: "eyes", name: "blue", hex: "#6f8fae" }] }] },
    eyes: { pupil: "vertical-slit", iris: "#d9a43a" },
    face: { eyeFromNose: .56, eye: .1, ear: .5, depth: .45, eyeSpacing: .36, eyeLook: "slit", ears: "Large pointed triangles, black-backed, set high and close together; pale fur inside.",
      features: ["A long, slender muzzle tapering to a small black nose; the eye sits well back, just behind the stop.", "Amber eyes with slit pupils, set obliquely.", "White upper lip, cheeks and chin; dark patches on the sides of the muzzle.", "Square on, a narrow wedge of a face under wide ears."],
      grade: "estimated", source: "Read off a near-profile and two frontal photographs (iNaturalist 338352584, CC0; Commons, public domain)",
      front: { crown: .49, chin: .6, nose: .48, noseWidth: .19, muzzleWidth: .33, eye: .14, earTip: [.5, .77], earBase: .33, earBaseX: .32, grade: "measured", source: "Red fox face (Commons, public domain); the chin is below the frame, estimated" } },
    parts: [{ id: "brush", name: "brush (tail)", region: "tail" }],
    behaviour: { gaits: ["walk", "trot", "rotary"], canRear: false, notes: ["Pounces on prey under snow with a high arching leap."] },
    sounds: [{ kind: "vocal", label: "scream and bark", query: "fox scream" }, { kind: "vocal", label: "gekkering", query: "fox gekkering" }],
    culture: ["Inari's messenger, carrying a key, a jewel or a scroll in its mouth.", "Shape-shifter (kitsune); the nine-tailed fox.", "The fox's wedding in a sunshower."],
    references: [{ title: "Red fox, head turned to profile (iNaturalist 338352584)", url: INAT_FOX, rights: "CC0", kind: "photo" }, { title: "Red fox at Cape Newenham, square on", url: C("Vulpes_vulpes_at_Cape_Newenham.jpg"), rights: "public-domain", kind: "photo" }, { title: "Red fox face", url: C("Vulpes_vulpes_face.jpg"), rights: "public-domain", kind: "photo" }], sources: [W("Red_fox")],
    styles: [uk("fox", "Up to nine tails; foxfire."), { style: "crayon", pack: "crayon", id: "fox", note: "Storybook fox." }],
  },
  {
    id: "japanese-raccoon-dog", name: "Japanese raccoon dog (tanuki)", ja: { kana: "タヌキ", kanji: "狸", romaji: "tanuki" }, scientific: "Nyctereutes viverrinus", plan: "canid",
    size: { length: r(45, 58, 71, "reported", "Common raccoon dog (total length; the Japanese species is a little smaller)"), tail: r(12, 15, 18, "reported", "Common raccoon dog"), mass: r(3, 6, 10, "reported", "Common raccoon dog") },
    proportions: { trunk: r(1.2, 1.35, 1.5, "estimated"), legClearance: r(.3, .36, .42, "estimated"), tail: r(.25, .3, .35, "reported", "Common raccoon dog"), muzzle: r(.35, .4, .45, "estimated"), back: "level" },
    coat: { type: "shaggy", long: ["back", "flank", "tail", "throat"], lay: "Long guard hairs over dense underfur; very full in winter, so the body looks round.",
      palette: [{ region: "back", name: "grizzled coat", hex: "#8a7a62" }, { region: "face", name: "dark mask", hex: "#2b2420", fill: "eye-patch" }, { region: "fore-leg", name: "dark legs", hex: "#2b2420" }, { region: "hind-leg", name: "dark legs", hex: "#2b2420" },
        { region: "throat", name: "pale cheeks", hex: "#d8ccb2" }, { region: "back", name: "shoulder band", hex: "#3a322b", fill: "band" }],
      markings: [{ name: "dark eye mask", region: "face", shape: "A black patch round each eye, like a raccoon's." }, { name: "dark legs and shoulder band", region: "fore-leg", shape: "Black legs, and a dark band across the shoulders." }],
      variants: [{ name: "summer coat", when: "summer", palette: [{ region: "back", name: "coat", hex: "#7b6a52" }] }] },
    eyes: { pupil: "round", iris: "#3a2a1c" },
    face: { eyeFromNose: .4, eye: .07, ear: .2, depth: .5, eyeSpacing: .45, eyeLook: "iris", ears: "Small, rounded, edged dark, set wide on the crown.",
      features: ["A short pointed muzzle with a black nose (not a fox's long snout).", "The dark mask surrounds each eye and runs down and back over the cheek, slanting outward square on.", "Pale fur above the eyes, between them and on the sides of the muzzle.", "Full grizzled cheek fur makes the face broad below."],
      grade: "estimated", source: "Read by eye off the Zoological Society plate (1874), Specht (1884) and the Genoa specimen" },
    parts: [{ id: "mask", name: "eye mask", region: "face" }],
    behaviour: { gaits: ["walk", "trot"], canRear: false, climbs: true, notes: ["The only canid that hibernates (in the coldest regions).", "Plays dead when caught (tanuki-neiri)."] },
    sounds: [{ kind: "vocal", label: "whine and growl", query: "raccoon dog" }],
    culture: ["Shape-shifter and trickster; the folk statue with a straw hat and sake bottle.", "Bunbuku chagama: the tanuki that became a tea kettle.", "Drums its belly on moonlit nights (tanuki-bayashi)."],
    references: [{ title: "Nyctereutes procyonoides, Proc. Zool. Soc. London (1874)", url: C("Nyctereutes_procyonoides_-_Proceedings_of_the_Zoological_Society_of_London,_1874.jpg"), rights: "public-domain", kind: "plate" }, { title: "Specht, Chien viverrin (1884)", url: C("Chien_viverrin_(Nyctereutes_viverrinus)_Les_Mammifères_par_Carl_Vogt_ouvrage_illustré_par_Frédéric_Specht_(1884).jpg"), rights: "public-domain", kind: "plate" }, { title: "Nyctereutes procyonoides, Museo Civico di Storia Naturale, Genoa", url: C("Nyctereutes_procyonoides_-_Museo_Civico_di_Storia_Naturale_Giacomo_Doria_-_Genoa,_Italy_-_DSC02598.JPG"), rights: "CC0", kind: "photo" }, ], sources: [W("Japanese_raccoon_dog"), W("Common_raccoon_dog")], styles: [uk("tanuki", "Straw hat and sake bottle; drums its belly.")],
  },
  {
    id: "japanese-wolf", name: "Japanese wolf (extinct)", ja: { kana: "ニホンオオカミ", kanji: "日本狼", romaji: "nihon ōkami" }, scientific: "Canis lupus hodophilax", plan: "canid",
    size: { shoulder: r(56, 57, 58, "reported", "Japanese wolf"), length: r(95, 110, 120, "estimated"), mass: r(15, 20, 25, "estimated") },
    proportions: { trunk: r(1.05, 1.15, 1.25, "estimated"), legClearance: r(.5, .54, .58, "estimated"), tail: r(.3, .35, .4, "estimated") },
    coat: { type: "dense", long: ["neck", "tail"], lay: "Short and grizzled, a mane over the shoulders.",
      palette: [{ region: "back", name: "grizzled grey", hex: "#8c8a84" }, { region: "belly", name: "pale underparts", hex: "#e6e1d6" }, { region: "back", name: "dark saddle", hex: "#4a4743", fill: "band" }], markings: [], variants: [] },
    eyes: { pupil: "round", iris: "#c9a23a" },
    face: { eyeFromNose: .45, eye: .09, ear: .25, depth: .52, eyeSpacing: .4, eyeLook: "iris", ears: "Short and pointed, set wide on the crown and leaning back; shorter than a grey wolf's.",
      features: ["A long, straight muzzle with a shallow stop; the eye just behind the stop.", "Small oblique eyes with dark-lined lids.", "Grey-brown face, paler on the muzzle, lips and cheeks."],
      grade: "estimated", source: "Measured off Siebold's Fauna Japonica plate (profile); spacing from a grey wolf photographed square on",
      front: { crown: .37, chin: .55, nose: .41, noseWidth: .2, muzzleWidth: .39, eye: .12, earTip: [.4, .54], earBase: .3, earBaseX: .3, grade: "measured", source: "Grey wolf portrait square on (Commons, public domain); the Japanese wolf was not photographed square on" } },
    parts: [],
    behaviour: { gaits: ["walk", "trot", "rotary"], canRear: false, notes: ["Last confirmed in 1905; smaller than other grey wolves, about the size of a large dog."] },
    sounds: [{ kind: "vocal", label: "howl", catalog: "howl-dog", query: "wolf howl" }],
    culture: ["Ōkuchi no makami: guardian god of mountain shrines (Mitsumine), protector of fields from boar and deer.", "The okuri-inu that follows travellers on mountain roads at night."],
    references: [{ title: "Siebold, Fauna Japonica: Canis hodophilax (profile)", url: C("Japanese_Wolf_Canis_Lupus_Hodophilax_by_PF_Siebold.png"), rights: "public-domain", kind: "plate" }, { title: "Grey wolf, square on", url: C("Canis_lupus_portrait.jpg"), rights: "public-domain", kind: "photo" }], sources: [W("Japanese_wolf")], styles: [uk("wolf", "Grey, pale belly; howls.")],
  },
  {
    id: "shiba-inu", name: "Japanese dog (Shiba type)", ja: { kana: "シバイヌ", kanji: "柴犬", romaji: "shiba inu" }, scientific: "Canis familiaris", plan: "canid",
    size: { shoulder: r(35, 38, 41, "reported", "Shiba Inu"), length: r(60, 68, 74, "estimated"), mass: r(8, 9, 11, "reported", "Shiba Inu") },
    proportions: { trunk: r(1.05, 1.1, 1.15, "reported", AKC_SHIBA + ": height to length 10 : 11 (males), females slightly longer"),
      chestDepth: r(.45, .48, .5, "reported", AKC_SHIBA + ": one-half or slightly less of the height"), legClearance: r(.5, .52, .55, "reported", "1 − chest depth"),
      muzzle: r(.38, .4, .42, "reported", AKC_SHIBA + ": 40 percent of the head length"), tail: r(.4, .45, .5, "estimated"), tailCarriage: "curled" },
    coat: { type: "dense", long: ["tail", "neck"], lay: "A stiff outer coat over soft underfur; the tail curls over the back.",
      palette: [{ region: "back", name: "red", hex: "#c87a3e" }, { region: "throat", name: "urajiro cream", hex: "#f1e4cc" }, { region: "belly", name: "urajiro cream", hex: "#f1e4cc" }],
      markings: [{ name: "urajiro", region: "throat", shape: "Cream on the cheeks, throat, chest, belly and inside the legs and tail." }],
      variants: [{ name: "black and tan", when: "colour variety", palette: [{ region: "back", name: "black", hex: "#262220" }, { region: "throat", name: "tan points", hex: "#c48a52" }] }] },
    eyes: { pupil: "round", iris: "#3a2a1c" },
    face: { eyeFromNose: .43, eye: .08, ear: .33, depth: .55, eyeSpacing: .37, eyeLook: "iris", ears: "Small, triangular and firmly pricked, set well apart and tilted forward (AKC).",
      features: ["Muzzle 40% of the head from occiput to nose (AKC), straight-bridged and tapering slightly; a moderate stop.", "Deep-set, somewhat triangular dark eyes slanting up toward the ears, black-rimmed.", "Broad flat forehead; full cheeks: square on, a rounded triangle.", "White (urajiro) on the muzzle sides, cheeks and throat; black nose and lips."],
      grade: "estimated", source: "Muzzle share reported by the AKC standard; eye, ear and spacing read off Shiba photographs (Commons, public domain)",
      front: { crown: .43, chin: .56, nose: .25, noseWidth: .14, muzzleWidth: .34, eye: .09, earTip: [.44, .54], earBase: .24, earBaseX: .3, grade: "measured", source: "Shiba Inu square on (Commons, public domain)" } },
    parts: [{ id: "curled-tail", name: "curled tail", region: "tail" }],
    behaviour: { gaits: ["walk", "trot", "rotary"], canRear: false, notes: [] },
    sounds: [{ kind: "vocal", label: "bark", catalog: "bark-dog-1", query: "dog bark" }, { kind: "vocal", label: "double bark", catalog: "bark-dog-2" }, { kind: "vocal", label: "howl", catalog: "howl-dog" }],
    culture: ["Momotarō's dog, paid with a millet dumpling.", "Shiro, the dog of the old man who made the dead trees bloom (Hanasaka jiisan)."],
    references: [MUYBRIDGE, { title: "Shiba Inu, square on", url: C("Shiba_inu_taiki.jpg"), rights: "public-domain", kind: "photo" }, { title: "Aka (red) Shiba in profile", url: C("Shiba_Inu_Aka.png"), rights: "public-domain", kind: "photo" }], sources: [W("Shiba_Inu"), { title: AKC_SHIBA, url: "https://images.akc.org/pdf/breeds/standards/ShibaInu.pdf" }],
    styles: [uk("dog", "Tawny or white."), { style: "rig", pack: "rig", id: "quadrupedRig(\"dog\")", note: "Walk, trot, canter, rotary gallop, sit." }],
  },
  {
    id: "domestic-cat", name: "Domestic cat", ja: { kana: "ネコ", kanji: "猫", romaji: "neko" }, scientific: "Felis catus", plan: "felid",
    size: { shoulder: r(23, 24, 25, "reported", "Cat"), length: r(40, 46, 52, "reported", "Cat"), tail: r(25, 30, 35, "reported", "Cat"), mass: r(3, 4.5, 6, "reported", "Cat") },
    proportions: { trunk: r(1.25, 1.37, 1.5, "estimated", "head-and-body ÷ shoulder less the head and neck"), tail: r(.55, .65, .75, "reported", "tail ÷ length") },
    coat: { type: "sleek", long: [], lay: "Short and close, lying smoothly back.",
      palette: [{ region: "back", name: "white (calico base)", hex: "#f4f0e8" }, { region: "back", name: "orange patch", hex: "#d98a3c", fill: "accent" }, { region: "back", name: "black patch", hex: "#252220", fill: "accent" }],
      markings: [{ name: "calico (mike-neko)", region: "back", shape: "White with orange and black patches." }],
      variants: [{ name: "grey tabby", when: "colour variety", palette: [{ region: "back", name: "grey", hex: "#8b8f97" }, { region: "back", name: "stripes", hex: "#4e5158", fill: "accent" }] }] },
    eyes: { pupil: "vertical-slit", iris: "#c9a227" },
    face: { eyeFromNose: .42, eye: .16, ear: .4, depth: .7, eyeSpacing: .45, eyeLook: "slit", ears: "Large upright triangles, broad at the base, set on the top corners of a round head.",
      features: ["A short face: big eyes close behind a short muzzle and a small nose leather.", "Slit pupils that open round in the dark.", "Whisker pads either side of the split upper lip; square on, a round head with the ears as its corners."],
      grade: "estimated", source: "Read off profile and frontal photographs (iNaturalist 350287666 and 234370227, CC0; Commons CC0)",
      front: { crown: .41, chin: .45, nose: .29, noseWidth: .13, muzzleWidth: .35, eye: .17, earTip: [.42, .62], earBase: .35, earBaseX: .3, grade: "measured", source: "Adult cat (Hauskatze, Commons CC0) for the eyes, nose and muzzle; the ears and crown off a kitten (Commons CC0), its ears scaled down" } },
    parts: [{ id: "bobtail", name: "Japanese bobtail", region: "tail", note: "A short pom-pom tail is the traditional Japanese cat." }],
    behaviour: { gaits: ["walk", "trot", "rotary"], canRear: true, climbs: true, notes: ["Direct register: the hind feet land in the fore feet's prints."] },
    sounds: [{ kind: "vocal", label: "meow", query: "cat meow" }, { kind: "vocal", label: "purr", query: "cat purr" }],
    culture: ["The beckoning cat (maneki-neko).", "The bakeneko and the two-tailed nekomata that dance with a towel on the head."],
    references: [{ title: "Cat in near profile (iNaturalist 350287666)", url: INAT_CAT_PROFILE, rights: "CC0", kind: "photo" }, { title: "Cat square on (iNaturalist 234370227)", url: INAT_CAT_FRONT, rights: "CC0", kind: "photo" }, { title: "Tortoiseshell cat in profile", url: C("Tortoiseshell_cat_in_profile.jpg"), rights: "CC0", kind: "photo" }], sources: [W("Cat")],
    styles: [uk("cat", "Calico; the bakeneko towel."), { style: "rig", pack: "rig", id: "quadrupedRig(\"cat\")" }],
  },
  {
    id: "japanese-hare", name: "Japanese hare", ja: { kana: "ノウサギ", kanji: "兎", romaji: "usagi" }, scientific: "Lepus brachyurus", plan: "leporid",
    size: { length: r(45, 50, 54, "reported", "Japanese hare"), tail: r(2, 3.5, 5, "reported", "Japanese hare"), mass: r(2.1, 2.4, 2.6, "reported", "Japanese hare") },
    proportions: { head: r(.4, .45, .5, "estimated") },
    coat: { type: "dense", long: [], lay: "Soft and dense, lying back.",
      palette: [{ region: "back", name: "brown", hex: "#9a7c58" }, { region: "belly", name: "pale belly", hex: "#efe6d6" }, { region: "ears", name: "ear tips", hex: "#2a2420", fill: "tip" }],
      markings: [{ name: "dark ear tips", region: "ears", shape: "The ear tips are dark." }],
      variants: [{ name: "winter white", when: "winter, in snowy regions", palette: [{ region: "back", name: "white", hex: "#f6f4ef" }, { region: "ears", name: "ear tips", hex: "#2a2420", fill: "tip" }] }] },
    eyes: { pupil: "round", iris: "#5a3a20", note: "Large, at the sides of the head." },
    face: { eyeFromNose: .55, eye: .15, ear: .8, depth: .57, eyeSpacing: .75, eyeLook: "iris", ears: "Long and narrow with black tips, set together on the crown; laid back along the neck at rest.",
      features: ["A blunt, deep muzzle with a split upper lip and long whiskers.", "A large dark eye set high and far back, ringed with pale fur.", "Eyes on the sides of the head: square on, they sit at the face's edges."],
      grade: "estimated", source: "Read off live hares and rabbits in profile (iNaturalist 307096718 and 391307506, CC0) and the National Museum of Nature and Science specimen (Commons, CC0; its mounted eye sits too far forward)" },
    parts: [{ id: "ears-long", name: "ears 7.6–8.3 cm", region: "ears" }],
    behaviour: { gaits: ["walk", "bound"], canRear: true, notes: ["Hind legs 12–15 cm, front legs 10–15 cm."] },
    sounds: [{ kind: "foley", label: "thump", query: "rabbit thump" }],
    culture: ["The hare in the moon pounding mochi.", "The white hare of Inaba.", "The hare and the tanuki of Kachi-kachi yama."],
    references: [{ title: "Lepus brachyurus specimen, National Museum of Nature and Science, Tokyo", url: C("Lepus_brachyurus_-_National_Museum_of_Nature_and_Science,_Tokyo_-_DSC07045.JPG"), rights: "CC0", kind: "photo" }, { title: "Hare head in profile (iNaturalist 307096718)", url: INAT_HARE, rights: "CC0", kind: "photo" }], sources: [W("Japanese_hare")],
    styles: [uk("rabbit"), { style: "crayon", pack: "crayon", id: "hare", note: "Wildlife portrait." }],
  },
  {
    id: "japanese-macaque", name: "Japanese macaque (snow monkey)", ja: { kana: "ニホンザル", kanji: "猿", romaji: "nihonzaru" }, scientific: "Macaca fuscata", plan: "primate",
    size: { length: r(47, 55, 60, "reported", "Japanese macaque (height 52–57 cm)"), tail: r(7, 8.5, 10, "reported", "Japanese macaque"), mass: r(8, 10, 14, "reported", "Japanese macaque") },
    proportions: { tail: r(.13, .16, .19, "reported", "tail ÷ length") },
    coat: { type: "dense", long: ["back", "neck", "face"], lay: "A thick grey-brown coat, longer in winter; the face, hands and rump are bare.",
      palette: [{ region: "back", name: "grey-brown", hex: "#8c8278" }, { region: "face", name: "red face", hex: "#d0675a" }, { region: "rump", name: "red rump", hex: "#c95a4e" }],
      markings: [{ name: "red face and rump", region: "face", shape: "Bare red skin, redder in adults and in the breeding season." }],
      variants: [{ name: "infant", when: "born with dark brown hair (reported: Wikipedia, Japanese macaque)", age: [0, .35], palette: [{ region: "back", name: "dark brown", hex: "#4a3a2e" }, { region: "face", name: "pale face", hex: "#d9a8a0" }] }] },
    eyes: { pupil: "round", iris: "#6a4a2a", note: "Forward-facing under a heavy brow." },
    face: { eyeFromNose: .37, eye: .07, ear: .27, depth: .85, eyeSpacing: .33, eyeLook: "iris", ears: "Small, round and naked, set low on the sides of the head, half hidden in the fur.",
      features: ["A flat red face, red around the eyes, under a heavy brow ridge; framed by a thick grey ruff.", "Eyes close together and facing forward.", "A short muzzle, a flat nose and a wide thin-lipped mouth; cheek pouches."],
      grade: "estimated", source: "Measured off Siebold's Fauna Japonica plate (profile and square on)" },
    parts: [{ id: "stub-tail", name: "stub tail", region: "tail" }],
    behaviour: { gaits: ["walk", "bound"], canRear: true, climbs: true, swims: true, notes: ["Bathes in hot springs in winter."] },
    sounds: [{ kind: "vocal", label: "coo and alarm bark", query: "macaque call" }],
    culture: ["Momotarō's monkey.", "The three wise monkeys of Nikkō.", "The monkey and the crab (Saru kani gassen)."],
    references: [{ title: "Siebold, Fauna Japonica: Macacus speciosus, head studies", url: C("Macacus_speciosus_-_details_-_1833-1850_-_Print_-_Iconographia_Zoologica_-_Special_Collections_University_of_Amsterdam_-_UBA01_IZ20000105.tif"), rights: "public-domain", kind: "plate" }, { title: "Japanese macaque", url: C("JapaneseMacaqueM2186.jpg"), rights: "public-domain", kind: "photo" }], sources: [W("Japanese_macaque")], styles: [uk("monkey", "Grey coat, red face.")],
  },
  {
    id: "sika-deer", name: "Sika deer", ja: { kana: "ニホンジカ", kanji: "鹿", romaji: "shika" }, scientific: "Cervus nippon", plan: "ruminant",
    size: { shoulder: r(50, 80, 110, "reported", "Sika deer"), length: r(95, 135, 180, "reported", "Sika deer"), tail: r(7.5, 10, 13, "reported", "Sika deer"), mass: r(30, 55, 109, "reported", "Sika deer") },
    proportions: { trunk: r(.95, 1.05, 1.15, "estimated", "head-and-body ÷ shoulder less the head and neck"), legClearance: r(.52, .56, .6, "estimated"), neck: r(.32, .38, .45, "estimated"), head: r(.3, .34, .38, "estimated") },
    coat: { type: "sleek", long: ["neck"], lay: "Short in summer; a darker, shaggier winter coat and a mane on stags in the rut.",
      palette: [{ region: "back", name: "chestnut", hex: "#9b6a3e" }, { region: "back", name: "white spots", hex: "#f4ece0", fill: "accent" }, { region: "rump", name: "white rump patch", hex: "#f6f2ea" }, { region: "belly", name: "pale belly", hex: "#e8dcc6" }],
      markings: [{ name: "white spots", region: "flank", shape: "Rows of white spots along the back and flanks in summer." }, { name: "white rump patch", region: "rump", shape: "Flared when alarmed." }],
      variants: [{ name: "winter coat", when: "winter", palette: [{ region: "back", name: "grey-brown", hex: "#6b5a4a" }] }] },
    eyes: { pupil: "horizontal", iris: "#3a2a1c" },
    face: { eyeFromNose: .63, eye: .12, ear: .4, depth: .5, eyeSpacing: .7, eyeLook: "bead", ears: "Large and leaf-shaped, set high behind the eyes and held out to the sides.",
      features: ["A long tapering face with the eye far back; a dark gland pit in front of the eye.", "A big dark eye with no white showing.", "A dark nose; a pale chin.", "Stags carry antlers (up to four points), shed each spring."],
      grade: "estimated", source: "Read off a profile photograph of resting hinds (iNaturalist 326610803, CC0) and Siebold's Fauna Japonica plate" },
    parts: [{ id: "antlers", name: "antlers (stags)", region: "head", note: "Up to four points, shed each spring." }],
    behaviour: { gaits: ["walk", "trot", "gallop", "rotary"], canRear: false, notes: ["Stags whistle in the autumn rut."] },
    sounds: [{ kind: "vocal", label: "rut whistle", query: "sika deer call" }, { kind: "foley", label: "hooves", query: "deer hooves" }],
    culture: ["Messengers of the Kasuga deity at Nara.", "Autumn's deer calling on the mountain in classical poetry."],
    references: [{ title: "Sika hinds in profile (iNaturalist 326610803)", url: INAT_SIKA, rights: "CC0", kind: "photo" }, { title: "Siebold, Fauna Japonica: Cervus sika with skulls", url: C("Cervus_sika_-_met_schedel_-_1833-1850_-_Print_-_Iconographia_Zoologica_-_Special_Collections_University_of_Amsterdam_-_UBA01_IZ21500346.tif"), rights: "public-domain", kind: "plate" }], sources: [W("Sika_deer")], styles: [uk("deer", "Stag with antlers and summer spots.")],
  },
  {
    id: "japanese-black-cattle", name: "Japanese Black cattle", ja: { kana: "クロウシ", kanji: "黒毛和種", romaji: "kuroge washu" }, scientific: "Bos taurus", plan: "ruminant",
    size: { shoulder: r(129, 137, 145, "reported", "Japanese Black (female–male)"), length: r(230, 250, 270, "estimated"), mass: r(512, 660, 809, "reported", "Japanese Black (female–male)") },
    proportions: { trunk: r(1.15, 1.22, 1.3, "estimated"), legClearance: r(.42, .46, .5, "estimated"), chestDepth: r(.5, .54, .58, "estimated"), neck: r(.3, .35, .4, "estimated") },
    coat: { type: "sleek", long: [], lay: "Short and smooth.",
      palette: [{ region: "back", name: "black", hex: "#1e1b1a" }, { region: "muzzle", name: "muzzle", hex: "#3a3634" }, { region: "head", name: "horns", hex: "#e3d6b8", fill: "accent" }], markings: [], variants: [] },
    eyes: { pupil: "horizontal", iris: "#3a2a1c" },
    face: { eyeFromNose: .6, eye: .1, ear: .3, depth: .55, eyeSpacing: .75, eyeLook: "bead", ears: "Broad and held out sideways below the horns, fringed inside.",
      features: ["A broad flat forehead with a curly poll between short horns.", "A wide wet nose pad with flared nostrils.", "Large dark eyes at the sides of the face; square on, the cheeks bulge past them."],
      grade: "estimated", source: "Read off a bull in profile and a Japanese Black square on (Commons, public domain)",
      front: { crown: .62, chin: .95, nose: .76, noseWidth: .57, muzzleWidth: .7, eye: .13, earTip: [1.1, .14], earBase: .3, earBaseX: .55, grade: "measured", source: "Japanese Black (Akita) square on (Commons, public domain); the chin is estimated" } },
    parts: [{ id: "horns", name: "short curved horns", region: "head" }, { id: "dewlap", name: "dewlap", region: "throat" }],
    behaviour: { gaits: ["walk", "trot"], canRear: false, notes: [] },
    sounds: [{ kind: "vocal", label: "low", query: "cow moo" }],
    culture: ["The reclining ox of Tenjin's shrines (Kitano).", "The cowherd of Tanabata."],
    references: [{ title: "Jersey bull in profile", url: C("Jersey_Bull_(22790343352).jpg"), rights: "public-domain", kind: "photo" }, { title: "Japanese Black (Akita), square on", url: C("Akita-yurigyuu.jpg"), rights: "public-domain", kind: "photo" }, { title: "Tajiri, founder bull of the Tajima line", url: C("Tajiri.JPG"), rights: "public-domain", kind: "photo" }, MUYBRIDGE], sources: [W("Japanese_Black")], styles: [uk("ox")],
  },
  {
    id: "kiso-horse", name: "Japanese native horse (Kiso)", ja: { kana: "キソウマ", kanji: "木曽馬", romaji: "kiso uma" }, scientific: "Equus caballus", plan: "equid",
    size: { shoulder: r(124, 132, 140, "reported", "Kiso horse (average 131.9 ± 4.4 cm)"), length: r(230, 255, 280, "estimated"), mass: r(300, 350, 420, "estimated") },
    proportions: { trunk: r(1.0, 1.06, 1.12, "estimated") },
    coat: { type: "sleek", long: ["neck", "tail"], lay: "Short body coat; a thick mane and tail.",
      palette: [{ region: "back", name: "bay", hex: "#6e4a2e" }, { region: "neck", name: "black mane", hex: "#1e1814", fill: "band" }, { region: "back", name: "dorsal stripe", hex: "#3a2a1e", fill: "band" }],
      markings: [{ name: "dorsal stripe", region: "back", shape: "Many native horses carry a dark line down the spine." }], variants: [] },
    eyes: { pupil: "horizontal", iris: "#3a2a1c" },
    face: { eyeFromNose: .67, eye: .09, ear: .25, depth: .45, eyeSpacing: .8, eyeLook: "bead", ears: "Short, pointed and mobile, set on top of the poll.",
      features: ["A long head with the eye two thirds of the way from the nose to the poll.", "A big, dark, glossy eye under a bony brow.", "Large nostrils over a soft muzzle; a straight face; a forelock."],
      grade: "estimated", source: "Measured off a horse's head in profile (Commons, public domain)" },
    parts: [],
    behaviour: { gaits: ["walk", "trot", "canter", "gallop"], canRear: true, notes: ["Short, sturdy and long-backed compared with Western breeds; warhorses of the Kamakura period stood 110–140 cm."] },
    sounds: [{ kind: "vocal", label: "whinny", query: "horse whinny" }, { kind: "foley", label: "hooves", query: "horse hooves walking" }],
    culture: ["Votive horse pictures (ema).", "Packhorses of the Tōkaidō."],
    references: [{ title: "Orlov trotter's head in profile", url: C("Head_of_Orlov_Trotter_horse_turned_right_2026.jpg"), rights: "public-domain", kind: "photo" }, MUYBRIDGE], sources: [W("Kiso_Horse")],
    styles: [uk("horse", "Tōkaidō packhorse tack."), { style: "rig", pack: "rig", id: "quadrupedRig(\"horse\")" }],
  },
  {
    id: "japanese-weasel", name: "Japanese weasel", ja: { kana: "イタチ", kanji: "鼬", romaji: "itachi" }, scientific: "Mustela itatsi", plan: "mustelid",
    size: { length: r(25, 30, 35, "reported", "Japanese weasel (males up to 35 cm)"), tail: r(10, 14, 17, "reported", "Japanese weasel"), mass: r(.15, .4, .65, "estimated") },
    proportions: {},
    coat: { type: "dense", long: ["tail"], lay: "Short and dense.",
      palette: [{ region: "back", name: "orange-brown", hex: "#b5763a" }, { region: "throat", name: "pale throat", hex: "#efe2c8" }, { region: "face", name: "dark mask", hex: "#4a3020", fill: "eye-patch" }], markings: [], variants: [] },
    eyes: { pupil: "round", iris: "#1e1814" }, parts: [],
    face: { eyeFromNose: .35, eye: .06, ear: .15, depth: .45, eyeSpacing: .45, eyeLook: "bead", ears: "Small and rounded, low on the side of the head (not on top).",
      features: ["A small flat wedge of a head, no wider than the long neck; a short blunt muzzle.", "A dark brown mask round the eyes and over the muzzle; white upper lip and chin.", "Square on, a broad flat face."],
      grade: "estimated", source: "Read by eye off the Tokyo specimen (Mustela itatsi), Ōkyo's weasel studies and a Siberian weasel photograph" },
    behaviour: { gaits: ["walk", "bound"], canRear: true, swims: true, notes: ["Stands up on its hind legs to look round."] },
    sounds: [{ kind: "vocal", label: "chatter", query: "weasel" }],
    culture: ["The kamaitachi: a sickle-weasel in the whirlwind that cuts without pain."],
    references: [{ title: "Mustela itatsi, National Museum of Nature and Science, Tokyo", url: C("Mustela_itatsi_-_National_Museum_of_Nature_and_Science,_Tokyo_-_DSC06815.JPG"), rights: "CC0", kind: "photo" }, { title: "Weasel attributed to Maruyama Ōkyo (Homma Museum of Art)", url: C("Weasel_attributed_to_Maruyama_Okyo_(Homma_Museum_of_Art).jpg"), rights: "public-domain", kind: "painting" }, { title: "Mustela sibirica 230828854", url: C("Mustela_sibirica_230828854.jpg"), rights: "CC0", kind: "photo" }, ], sources: [W("Japanese_weasel")], styles: [uk("weasel")],
  },
  {
    id: "house-mouse", name: "House mouse", ja: { kana: "ハツカネズミ", kanji: "鼠", romaji: "nezumi" }, scientific: "Mus musculus", plan: "rodent",
    size: { length: r(7.5, 8.5, 10, "reported", "House mouse"), tail: r(5, 7.5, 10, "reported", "House mouse"), mass: r(.011, .02, .03, "reported", "House mouse") },
    proportions: {},
    coat: { type: "sleek", long: [], lay: "Short and smooth.",
      palette: [{ region: "back", name: "grey-brown", hex: "#7d7066" }, { region: "belly", name: "pale belly", hex: "#d9d2c8" }, { region: "ears", name: "pink ears", hex: "#e2b5ad" }, { region: "tail", name: "tail", hex: "#c9a8a0" }],
      markings: [], variants: [{ name: "white", when: "fancy mouse", palette: [{ region: "back", name: "white", hex: "#f6f4ef" }, { region: "eyes", name: "red eye", hex: "#b03030" }] }] },
    eyes: { pupil: "round", iris: "#121010" }, parts: [],
    face: { eyeFromNose: .45, eye: .14, ear: .55, depth: .45, eyeSpacing: .6, eyeLook: "bead", ears: "Huge, thin and round, half the head's length, standing just behind the eye.",
      features: ["A cone from the round crown to a fine pointed snout with a pink nose.", "A large glossy black eye, no iris showing.", "No neck: the head runs straight on from the body.", "Long whiskers from the snout."],
      grade: "estimated", source: "Read by eye off CC0 photographs (Wikimedia Commons: House mouse 2808, 2732; Mus musculus 131536695)" },
    behaviour: { gaits: ["walk", "bound"], canRear: true, climbs: true, notes: ["Runs with a stride of about 4.5 cm; jumps up to 45 cm."] },
    sounds: [{ kind: "vocal", label: "squeak", query: "mouse squeak" }],
    culture: ["Daikoku's messenger.", "The mouse's wedding (nezumi no yomeiri).", "The first of the twelve zodiac animals."],
    references: [{ title: "House mouse (Mus musculus) 2808", url: C("House_mouse_(Mus_musculus)_2808.jpg"), rights: "CC0", kind: "photo" }, { title: "Mus musculus 131536695", url: C("Mus_musculus_131536695.jpg"), rights: "CC0", kind: "photo" }, ], sources: [W("House_mouse")], styles: [uk("mouse")],
  },
  {
    id: "red-crowned-crane", name: "Red-crowned crane", ja: { kana: "タンチョウ", kanji: "丹頂", romaji: "tanchō" }, scientific: "Grus japonensis", plan: "bird-wader",
    size: { length: r(101, 140, 150, "reported", "Red-crowned crane (bill to tail; standing 150–158 cm)"), wingspan: r(220, 235, 250, "reported", "Red-crowned crane"), mass: r(4.8, 8.5, 10.5, "reported", "Red-crowned crane") },
    proportions: { muzzle: r(.5, .55, .6, "estimated", "read off the Tsurui crane's head in profile"), tail: r(.15, .18, .21, "reported", "tail 21.5–30 cm ÷ length") },
    coat: { type: "feathers", long: ["tail"], lay: "Smooth white body; the black secondaries droop over the tail like a bustle.",
      palette: [{ region: "back", name: "white", hex: "#f6f4ef" }, { region: "neck", name: "black neck", hex: "#1c1b1b" }, { region: "wings", name: "black secondaries", hex: "#1c1b1b", fill: "tip" },
        { region: "crown", name: "red crown", hex: "#c1272d" }, { region: "muzzle", name: "bill", hex: "#8a9a6a" }, { region: "hind-leg", name: "legs", hex: "#2a2a2a" }],
      markings: [{ name: "red crown", region: "crown", shape: "A patch of bare red skin on top of the head." }, { name: "black 'tail'", region: "wings", shape: "The black secondaries fall over the white tail." }],
      variants: [
        { name: "chick (natal down)", when: "first two weeks (reported: Wikipedia, Red-crowned crane)", age: [0, .3], palette: [{ region: "back", name: "yellow down", hex: "#d6b75e" }, { region: "neck", name: "yellow down", hex: "#d6b75e" }, { region: "crown", name: "yellow down", hex: "#d6b75e" }, { region: "wings", name: "yellow down", hex: "#cdae58", fill: "tip" }] },
        { name: "juvenile", when: "first year: white with tawny and cinnamon brown, the crown grey and tawny, the neck coffee brown (reported: Wikipedia)", age: [.3, .8], palette: [{ region: "neck", name: "coffee brown", hex: "#8a6448" }, { region: "crown", name: "grey and tawny", hex: "#9c8a72" }, { region: "wings", name: "cinnamon", hex: "#a8774a", fill: "tip" }] },
      ] },
    eyes: { pupil: "round", iris: "#4a3a2a" },
    face: { eyeFromNose: .74, eye: .05, depth: .25, eyeSpacing: .85, eyeLook: "bead", ears: "None visible: the ear opening is hidden under the feathers behind the eye.",
      features: ["A long straight greenish-horn bill, more than half the head.", "Bare red skin on the crown (the tanchō, red cap); a black face and throat; white from behind the eye round the nape.", "A small dark eye at the edge of the black face, close to the white."],
      grade: "estimated", source: "Measured off a red-crowned crane's head in profile (Commons, CC0)" }, parts: [],
    behaviour: { gaits: ["walk"], canRear: false, flies: true, notes: ["Dances in pairs: bowing, leaping and throwing grass."] },
    sounds: [{ kind: "vocal", label: "unison call", query: "crane call" }, { kind: "foley", label: "wingbeats", catalog: "flap-wings-1" }],
    culture: ["Longevity: 'the crane lives a thousand years'.", "The crane's gratitude (Tsuru no ongaeshi)."],
    references: [{ title: "Red-crowned crane, head in profile", url: C("Wiki-c-tantyo-head.jpg"), rights: "CC0", kind: "photo" }], sources: [W("Red-crowned_crane")], styles: [uk("crane")],
  },
  {
    id: "grey-heron", name: "Grey heron", ja: { kana: "アオサギ", kanji: "蒼鷺", romaji: "aosagi" }, scientific: "Ardea cinerea", plan: "bird-wader",
    size: { length: r(84, 93, 102, "reported", "Grey heron"), wingspan: r(155, 175, 195, "reported", "Grey heron"), mass: r(1.0, 1.5, 2.1, "reported", "Grey heron") },
    proportions: { muzzle: r(.72, .77, .8, "estimated", "read off Boutell's heron head") },
    coat: { type: "feathers", long: ["neck", "crown"], lay: "Long plumes on the breast and a black crest from the eye back.",
      palette: [{ region: "back", name: "grey", hex: "#9aa1a6" }, { region: "neck", name: "white neck", hex: "#eceae6" }, { region: "crown", name: "black crest", hex: "#1c1c1e", fill: "band" }, { region: "muzzle", name: "yellow bill", hex: "#d8b03a" }],
      markings: [{ name: "black eye stripe and crest", region: "crown", shape: "From above the eye back into a thin plume." }], variants: [] },
    eyes: { pupil: "round", iris: "#e3c23a" },
    face: { eyeFromNose: .87, eye: .06, depth: .15, eyeSpacing: .85, eyeLook: "iris", ears: "None visible.",
      features: ["A dagger bill three quarters of the head, deep at the base and tapering to a point.", "A slim flat head with the yellow eye at the very back of the bill's line; a bare strip from the eye to the bill.", "Black plumes from behind the eye trail down the nape."],
      grade: "estimated", source: "Measured off Boutell's 'Head of heron' engraving (Commons, public domain)" }, parts: [],
    behaviour: { gaits: ["walk"], canRear: false, flies: true, notes: ["Stands motionless, neck coiled, then strikes."] },
    sounds: [{ kind: "vocal", label: "harsh frank", query: "heron call" }], culture: ["The heron maiden (Sagi musume)."],
    references: [{ title: "Boutell, Picture Natural History No. 156: head of heron", url: C("Picture_Natural_History_-_No_156_-_Head_of_Heron.png"), rights: "public-domain", kind: "plate" }], sources: [W("Grey_heron")], styles: [uk("heron")],
  },
  {
    id: "large-billed-crow", name: "Large-billed crow", ja: { kana: "ハシブトガラス", kanji: "烏", romaji: "karasu" }, scientific: "Corvus macrorhynchos", plan: "bird-perching",
    size: { length: r(46, 52, 59, "reported", "Large-billed crow"), wingspan: r(95, 110, 125, "estimated", "scaled from the carrion crow's reported 84–100 cm; the large-billed crow is heavier (450–1,000 g against 400–600 g)"), mass: r(.45, .7, 1.0, "reported", "Large-billed crow") },
    proportions: { muzzle: r(.43, .47, .5, "estimated", "read off a large-billed crow's head in profile") },
    coat: { type: "feathers", long: [], lay: "Glossy black, a blue-purple sheen.",
      palette: [{ region: "back", name: "black", hex: "#141416" }, { region: "back", name: "sheen", hex: "#2c3a5a", fill: "accent" }], markings: [], variants: [] },
    eyes: { pupil: "round", iris: "#2a2220" },
    face: { eyeFromNose: .63, eye: .075, depth: .4, eyeSpacing: .8, eyeLook: "bead", ears: "None visible.",
      features: ["A heavy bill nearly half the head, its top arching down from a steep, domed forehead.", "Bristle feathers over the nostrils at the bill's base.", "A dark eye (blue in fledglings) just behind the bill base."],
      grade: "estimated", source: "Measured off a large-billed crow fledgling's head in profile (Commons, public domain)" }, parts: [{ id: "arched-bill", name: "heavy arched bill (7–8 cm)", region: "head" }],
    behaviour: { gaits: ["walk", "bound"], canRear: false, flies: true, notes: [] },
    sounds: [{ kind: "vocal", label: "caws", catalog: "bed-crows-day", query: "crow caw" }],
    culture: ["Yatagarasu, the three-legged crow that guided Emperor Jimmu.", "Crows at dusk, calling the children home."],
    references: [{ title: "Large-billed crow, head in profile", url: C("Corvus_macrorhynchos(head).jpg"), rights: "public-domain", kind: "photo" }], sources: [W("Large-billed_crow")], styles: [uk("crow")],
  },
  {
    id: "green-pheasant", name: "Green pheasant", ja: { kana: "キジ", kanji: "雉", romaji: "kiji" }, scientific: "Phasianus versicolor", plan: "bird-galliform",
    size: { length: r(60, 75, 89, "reported", "Common pheasant (close relative): males, including tail"), wingspan: r(56, 71, 86, "reported", "Common pheasant (close relative)"), mass: r(.5, 1.0, 1.4, "reported", "Common pheasant (close relative)") },
    proportions: { muzzle: r(.33, .37, .4, "estimated", "read off Huet's Phasianus versicolor"), tail: r(.5, .55, .6, "reported", "Common pheasant: tail ~50 cm of the male's length") },
    coat: { type: "feathers", long: ["tail"], lay: "Scaled iridescent breast; a long barred tail.",
      palette: [{ region: "breast", name: "dark green", hex: "#2f5d3a" }, { region: "face", name: "red wattle", hex: "#c0302b", fill: "eye-patch" }, { region: "back", name: "bronze back", hex: "#7a5a3a" }, { region: "tail", name: "barred tail", hex: "#a4865e" }],
      markings: [{ name: "red facial wattle", region: "face", shape: "Bare red skin round the eye." }],
      variants: [{ name: "hen", when: "female", palette: [{ region: "back", name: "mottled brown", hex: "#9a7c58" }] }] },
    eyes: { pupil: "round", iris: "#d0a23a" },
    face: { eyeFromNose: .72, eye: .08, depth: .55, eyeSpacing: .85, eyeLook: "iris", ears: "Small feather ear tufts at the back of the crown (the male's).",
      features: ["A short, pale, slightly hooked bill.", "Bare scarlet wattles round the eye, swelling down the cheek in the breeding male.", "Iridescent blue-green head and neck."],
      grade: "estimated", source: "Measured off Huet's 1838 plate of the male in profile (Commons, public domain)" }, parts: [],
    behaviour: { gaits: ["walk", "trot"], canRear: false, flies: true, notes: ["Bursts up noisily when flushed; prefers to run."] },
    sounds: [{ kind: "vocal", label: "kokyo crow", query: "pheasant call" }, { kind: "foley", label: "wing burst", catalog: "flap-wings-1" }],
    culture: ["Japan's national bird.", "Momotarō's pheasant."],
    references: [{ title: "Huet, Phasianus versicolor male (1838)", url: C("Phasianus_versicolor_male_1838.jpg"), rights: "public-domain", kind: "plate" }, { title: "H. Jones, Green Japanese pheasant", url: C("Green_Japanese_Pheasant_by_H._Jones.png"), rights: "public-domain", kind: "plate" }], sources: [W("Green_pheasant"), W("Common_pheasant")], styles: [uk("pheasant")],
  },
  {
    id: "eurasian-tree-sparrow", name: "Eurasian tree sparrow", ja: { kana: "スズメ", kanji: "雀", romaji: "suzume" }, scientific: "Passer montanus", plan: "bird-perching",
    size: { length: r(12.5, 13.3, 14, "reported", "Eurasian tree sparrow"), wingspan: r(20, 21, 22, "reported", "Eurasian tree sparrow"), mass: r(.02, .024, .028, "reported", "Eurasian tree sparrow") },
    proportions: { muzzle: r(.2, .23, .26, "estimated", "read off a tree sparrow in profile") },
    coat: { type: "feathers", long: [], lay: "Puffed in cold weather.",
      palette: [{ region: "crown", name: "chestnut crown", hex: "#8a4f2b" }, { region: "face", name: "white cheek", hex: "#f2eee6" }, { region: "face", name: "black cheek spot", hex: "#1c1a18", fill: "accent" },
        { region: "back", name: "streaked back", hex: "#9b7650" }, { region: "breast", name: "buff breast", hex: "#d8cdb8" }],
      markings: [{ name: "black cheek spot", region: "face", shape: "A black spot on the white cheek." }], variants: [] },
    eyes: { pupil: "round", iris: "#1a1614" },
    face: { eyeFromNose: .46, eye: .13, depth: .7, eyeSpacing: .8, eyeLook: "bead", ears: "None visible; a black ear spot on the white cheek.",
      features: ["A short, thick, conical seed-eater's bill.", "A chestnut crown and nape; a black bib and a black spot on a white cheek.", "A large dark eye in a black mask from the bill."],
      grade: "estimated", source: "Measured off a tree sparrow photographed in Osaka (Commons, public domain)" }, parts: [],
    behaviour: { gaits: ["bound"], canRear: false, flies: true, notes: ["Hops with both feet together."] },
    sounds: [{ kind: "vocal", label: "chirp", query: "sparrow chirp" }], culture: ["The tongue-cut sparrow (Shita-kiri suzume)."],
    references: [{ title: "Tree sparrow, Osaka", url: C("Tree_Sparrow_August_2007_Osaka_Japan.jpg"), rights: "public-domain", kind: "photo" }], sources: [W("Eurasian_tree_sparrow")], styles: [uk("sparrow"), { style: "rig", pack: "rig", id: "birdRig()", note: "Songbird." }],
  },
  {
    id: "eurasian-goshawk", name: "Eurasian goshawk", ja: { kana: "オオタカ", kanji: "蒼鷹", romaji: "ōtaka" }, scientific: "Accipiter gentilis", plan: "bird-raptor",
    size: { length: r(46, 58, 69, "reported", "Eurasian goshawk (males 46–63, females 58–69)"), wingspan: r(89, 110, 127, "reported", "Eurasian goshawk"), mass: r(.5, 1.0, 2.2, "reported", "Eurasian goshawk") },
    proportions: { muzzle: r(.27, .3, .34, "estimated", "read off Naumann's goshawk (head turned to the viewer)") },
    coat: { type: "feathers", long: ["hind-leg"], lay: "Feathered 'trousers'; finely barred underparts.",
      palette: [{ region: "back", name: "slate grey", hex: "#5e6670" }, { region: "breast", name: "white, barred", hex: "#eceae6" }, { region: "face", name: "white brow", hex: "#f2f0ec", fill: "band" }, { region: "feet", name: "yellow feet", hex: "#e2b23a" }],
      markings: [{ name: "white eyebrow", region: "face", shape: "A white stripe over the eye." }, { name: "fine barring", region: "breast", shape: "Thin dark bars across the white underparts." }], variants: [] },
    eyes: { pupil: "round", iris: "#e08a2a", note: "Yellow to deep orange with age." },
    face: { eyeFromNose: .45, eye: .12, depth: .6, eyeSpacing: .65, eyeLook: "iris", ears: "None visible.",
      features: ["A short, deep, hooked bill with a yellow cere.", "A large yellow to orange eye shaded by a bony brow ridge: the fierce look.", "A dark crown and cheek, a white eyebrow stripe."],
      grade: "estimated", source: "Read off Naumann's plate (1899) and a 1904 plate (Commons, public domain); both turn the head toward the viewer, so the bill is foreshortened" }, parts: [],
    behaviour: { gaits: ["walk"], canRear: false, flies: true, notes: ["Short broad wings and a long tail for flying through woods."] },
    sounds: [{ kind: "vocal", label: "kek-kek alarm", query: "goshawk call" }], culture: ["The falconer's bird (takagari)."],
    references: [{ title: "Naumann, Accipiter gentilis (1899)", url: C("Accipiter_gentilis,_Naumann_1899.jpg"), rights: "public-domain", kind: "plate" }, { title: "Accipiter gentilis (1904)", url: C("Accipiter_gentilis_1904.jpg"), rights: "public-domain", kind: "plate" }], sources: [W("Eurasian_goshawk")], styles: [uk("hawk")],
  },
  {
    id: "mandarin-duck", name: "Mandarin duck", ja: { kana: "オシドリ", kanji: "鴛鴦", romaji: "oshidori" }, scientific: "Aix galericulata", plan: "bird-waterfowl",
    size: { length: r(41, 45, 49, "reported", "Mandarin duck"), wingspan: r(65, 70, 75, "reported", "Mandarin duck"), mass: r(.43, .55, .69, "estimated") },
    proportions: { muzzle: r(.24, .27, .3, "estimated", "read off a mandarin drake in profile") },
    coat: { type: "feathers", long: ["crown"], lay: "The drake's orange 'sails' stand up over the back; a crest at the nape.",
      palette: [{ region: "back", name: "dark back", hex: "#4a4436" }, { region: "wings", name: "orange sails", hex: "#e07b28" }, { region: "face", name: "white eye stripe", hex: "#f4f1ea", fill: "band" }, { region: "breast", name: "purple breast", hex: "#5a3a6a" },
        { region: "crown", name: "green crest", hex: "#3a6a4a" }, { region: "muzzle", name: "red bill", hex: "#c8473a" }],
      markings: [{ name: "white crescent over the eye", region: "face", shape: "A broad white stripe from the eye to the nape." }],
      variants: [{ name: "duck (female)", when: "female", palette: [{ region: "back", name: "grey-brown", hex: "#8a7f72" }, { region: "face", name: "white eye ring", hex: "#f4f1ea", fill: "eye-patch" }] },
        { name: "duckling", when: "very like a mallard duckling (reported: Wikipedia, Mandarin duck): dark above, yellow below and on the face (Wikipedia, Mallard)", age: [0, .4],
          palette: [{ region: "back", name: "dark brown down", hex: "#4a3e2c" }, { region: "breast", name: "yellow", hex: "#dcc062" }, { region: "face", name: "yellow", hex: "#dcc062", fill: "band" }, { region: "wings", name: "dark brown down", hex: "#4a3e2c" }, { region: "muzzle", name: "dark bill", hex: "#3a3430" }] }] },
    eyes: { pupil: "round", iris: "#2a1e18" },
    face: { eyeFromNose: .48, eye: .06, depth: .7, eyeSpacing: .85, eyeLook: "bead", ears: "None visible.",
      features: ["A short red bill with a pale nail at the tip (the drake's).", "A dark eye in a broad white eyebrow that sweeps back into the crest.", "Orange 'whiskers' fanning down the cheek; a full crest at the back."],
      grade: "estimated", source: "Measured off a mandarin drake swimming in profile (Commons, CC0)" }, parts: [{ id: "sails", name: "orange sail feathers", region: "wings" }],
    behaviour: { gaits: ["walk"], canRear: false, swims: true, flies: true, notes: [] },
    sounds: [{ kind: "vocal", label: "whistle", query: "mandarin duck" }], culture: ["Conjugal fidelity: 'oshidori fūfu'."],
    references: [{ title: "Mandarin drake, Doorwerth", url: C("Aix_galericulata_(Mandarin_duck)_male,_Doorwerth,_the_Netherlands.jpg"), rights: "CC0", kind: "photo" }], sources: [W("Mandarin_duck")], styles: [uk("oshidori")],
  },
  {
    id: "common-kingfisher", name: "Common kingfisher", ja: { kana: "カワセミ", kanji: "翡翠", romaji: "kawasemi" }, scientific: "Alcedo atthis", plan: "bird-perching",
    size: { length: r(15, 16, 17, "reported", "Common kingfisher"), wingspan: r(24, 25, 26, "reported", "Common kingfisher"), mass: r(.034, .04, .046, "reported", "Common kingfisher") },
    proportions: { muzzle: r(.4, .45, .5, "estimated") },
    coat: { type: "feathers", long: [], lay: "Tight and glossy.",
      palette: [{ region: "back", name: "azure", hex: "#1d8ec4" }, { region: "breast", name: "orange", hex: "#e3793b" }, { region: "throat", name: "white throat", hex: "#f4f1ea" }, { region: "feet", name: "red feet", hex: "#d2453a" }],
      markings: [{ name: "azure back stripe", region: "back", shape: "A bright stripe down the back, glinting in flight." }], variants: [] },
    eyes: { pupil: "round", iris: "#121010" },
    face: { eyeFromNose: .72, eye: .09, depth: .4, eyeSpacing: .8, eyeLook: "bead", ears: "None visible; an orange ear patch and a white neck patch.",
      features: ["A long dagger bill about half the head (the female's lower mandible is orange).", "A big head on a short body; the eye at the top of an orange stripe from the bill.", "Blue-green crown with pale blue spots."],
      grade: "estimated", source: "Measured off a kingfisher photographed in Japan (Commons, public domain)" }, parts: [{ id: "dagger-bill", name: "dagger bill", region: "head" }],
    behaviour: { gaits: [], canRear: false, flies: true, notes: ["Dives headfirst from a perch."] },
    sounds: [{ kind: "vocal", label: "shrill whistle", query: "kingfisher call" }], culture: ["The 'river jewel' (kawasemi) of haiku."],
    references: [{ title: "Common kingfisher in Japan", url: C("Common_kingfisher_in_Japan,_January_2019_-_谷崎7303.jpg"), rights: "public-domain", kind: "photo" }], sources: [W("Common_kingfisher")],
    styles: [{ style: "paper-craft", pack: "paper-craft", id: "kingfisher" }, { style: "coloured-pencil", pack: "colored-pencil", id: "createKingfisherActor" }],
  },
  {
    id: "koi", name: "Koi (ornamental carp)", ja: { kana: "ニシキゴイ", kanji: "錦鯉", romaji: "nishikigoi" }, scientific: "Cyprinus carpio (Amur carp)", plan: "fish",
    size: { length: r(30, 60, 120, "reported", "Common carp (domesticated carp reach 120 cm)"), mass: r(.5, 4, 40, "reported", "Common carp") },
    proportions: {},
    coat: { type: "scales", long: [], lay: "Large overlapping scales in diagonal rows; mirror and leather varieties have few.",
      palette: [{ region: "back", name: "kohaku white", hex: "#f5f1ea" }, { region: "back", name: "kohaku red", hex: "#d9362b", fill: "band" }, { region: "back", name: "sumi black", hex: "#1c1a1a", fill: "accent" }, { region: "fins", name: "fins", hex: "#f0e8dc" }],
      markings: [{ name: "kohaku", region: "back", shape: "Red patterns on white." }, { name: "taishō sanshoku", region: "back", shape: "Red and black on white." }], variants: [] },
    eyes: { pupil: "round", iris: "#2a2220" },
    face: { eyeFromNose: .36, eye: .11, depth: .95, eyeSpacing: .7, eyeLook: "iris", ears: "None; the gill cover ends the head.",
      features: ["A small toothless mouth at the end of a blunt snout, with two pairs of barbels.", "A gold-ringed eye high on the head, a third of the way back.", "The gill cover's curved edge marks the end of the head."],
      grade: "estimated", source: "Measured off common carp in side view (iNaturalist 259810202 and 183724795, CC0)" }, parts: [{ id: "barbels", name: "two pairs of barbels", region: "head" }],
    behaviour: { gaits: [], canRear: false, swims: true, notes: [] },
    sounds: [{ kind: "foley", label: "splash", catalog: "props-splash", query: "fish splash" }],
    culture: ["The carp that climbs the waterfall becomes a dragon: carp streamers (koinobori) for Children's Day."],
    references: [{ title: "Common carp, side view (iNaturalist 259810202)", url: INAT_CARP, rights: "CC0", kind: "photo" }, { title: "Common carp, side view (iNaturalist 183724795)", url: INAT_CARP_2, rights: "CC0", kind: "photo" }], sources: [W("Koi"), W("Common_carp")],
    styles: [uk("carp"), { style: "rig", pack: "rig", id: "fishRig()", note: "Koi." }],
  },
];

/** A species by id (or by the id it is drawn by in a style: `findAnimal("boar")`). */
export function findAnimal(id: string): AnimalSpecies | undefined {
  return ANIMAL_SPECIES.find(s => s.id === id) ?? ANIMAL_SPECIES.find(s => s.styles.some(i => i.id === id)) ?? ANIMAL_SPECIES.find(s => s.ja.romaji === id);
}
/** Every species in a body plan. */
export const animalsInPlan = (plan: BodyPlanId) => ANIMAL_SPECIES.filter(s => s.plan === plan);
/** Where an animal is already drawn, by style: start a new style from these. */
export const animalStyles = (id: string) => findAnimal(id)?.styles ?? [];
