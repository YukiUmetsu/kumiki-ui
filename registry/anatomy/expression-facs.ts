/**
 * EXPR1 data: facial expressions as FACS action units (Ekman and Friesen's Facial Action Coding System), the emotion
 * prototypes built from them, and how each unit changes what a draughtsman sees.
 *
 * The data is in four parts:
 * - **Action units.** Names and muscles from the Facial Action Coding System article (Wikipedia, retrieved 2026-11-15).
 * - **Intensities.** Scored A–E (trace to maximum), here 0.2–1.
 * - **Emotion prototypes.** The seven EMFACS combinations are reported (same article). The drawing extras the library's
 *   styles need (laughter, crying, shyness, pain, sleep, a kabuki glare…) are marked estimated.
 * - **Displacements.** The millimetre amounts used to move the ANAT1 face are estimates for drawing: FACS describes
 *   appearance, not distances.
 */
import type { Grade } from "./foundation-shapes";

export type AuRegion = "brow" | "eyes" | "nose" | "cheek" | "mouth" | "jaw" | "gaze" | "head";
export interface ActionUnit {
  id: number;
  name: string;
  muscles: string;
  region: AuRegion;
  /** What changes on the face, in words a draughtsman can use in any style. */
  appearance: readonly string[];
}

const au = (id: number, name: string, muscles: string, region: AuRegion, ...appearance: string[]): ActionUnit => ({ id, name, muscles, region, appearance });

/** The action units EXPR1 can move (muscles as listed in the FACS article). */
export const ACTION_UNITS: Readonly<Record<number, ActionUnit>> = Object.fromEntries([
  au(1, "Inner brow raiser", "frontalis (pars medialis)", "brow", "The inner ends of the brows lift, slanting them up toward the middle.", "Short horizontal lines in the middle of the forehead."),
  au(2, "Outer brow raiser", "frontalis (pars lateralis)", "brow", "The outer ends of the brows lift; the brows arch.", "Horizontal lines across the outer forehead."),
  au(4, "Brow lowerer", "depressor glabellae, depressor supercilii, corrugator supercilii", "brow", "The brows lower and draw together.", "Vertical lines (or a bulge) between the brows."),
  au(5, "Upper lid raiser", "levator palpebrae superioris, superior tarsal muscle", "eyes", "The upper lid lifts: more white shows above the iris."),
  au(6, "Cheek raiser", "orbicularis oculi (pars orbitalis)", "cheek", "The cheeks lift and push up under the eyes.", "Crow's feet at the outer corners; a bag under the lower lid."),
  au(7, "Lid tightener", "orbicularis oculi (pars palpebralis)", "eyes", "The lids tense and narrow, the lower lid straightening and rising."),
  au(9, "Nose wrinkler", "levator labii superioris alaeque nasi", "nose", "The nose wrinkles and the nostril wings lift.", "Lines across the bridge of the nose; the inner brows pulled down."),
  au(10, "Upper lip raiser", "levator labii superioris, caput infraorbitalis", "mouth", "The upper lip lifts, showing the upper teeth.", "The fold from the nose wing to the mouth deepens."),
  au(12, "Lip corner puller", "zygomaticus major", "mouth", "The mouth corners pull up and out (a smile).", "The fold from the nose to the mouth corner deepens and curves."),
  au(14, "Dimpler", "buccinator", "mouth", "The corners tighten inward; dimples form beside them."),
  au(15, "Lip corner depressor", "depressor anguli oris (triangularis)", "mouth", "The mouth corners pull down."),
  au(16, "Lower lip depressor", "depressor labii inferioris", "mouth", "The lower lip pulls down, showing the lower teeth."),
  au(17, "Chin raiser", "mentalis", "jaw", "The chin boss pushes up, pressing the lower lip up.", "Dimpling on the chin; a deep crease below the lower lip."),
  au(20, "Lip stretcher", "risorius with platysma", "mouth", "The mouth stretches sideways, the corners pulled out and a little down."),
  au(23, "Lip tightener", "orbicularis oris", "mouth", "The lips tighten and narrow; their red shows less."),
  au(24, "Lip pressor", "orbicularis oris", "mouth", "The lips press together."),
  au(25, "Lips part", "depressor labii inferioris, or relaxation of mentalis or orbicularis oris", "mouth", "The lips part a little."),
  au(26, "Jaw drop", "masseter; relaxed temporalis and internal pterygoid", "jaw", "The jaw drops, the mouth opens."),
  au(27, "Mouth stretch", "pterygoids, digastric", "jaw", "The mouth is stretched wide open."),
  au(41, "Lid droop", "levator palpebrae superioris (relaxation)", "eyes", "The upper lids sag (sleepy, sad)."),
  au(43, "Eyes closed", "orbicularis oculi (relaxation of levator)", "eyes", "The eyes close."),
  au(61, "Eyes turn left", "lateral and medial recti", "gaze", "The gaze turns to the face's left."),
  au(62, "Eyes turn right", "lateral and medial recti", "gaze", "The gaze turns to the face's right."),
  au(63, "Eyes up", "superior rectus", "gaze", "The gaze lifts."),
  au(64, "Eyes down", "inferior rectus", "gaze", "The gaze drops."),
  au(66, "Cross-eye", "medial recti", "gaze", "Both eyes turn in (the kabuki mie glare)."),
  au(53, "Head up", "", "head", "The head tilts back."),
  au(54, "Head down", "", "head", "The head bows."),
  au(55, "Head tilt left", "", "head", "The head tips to its left."),
  au(56, "Head tilt right", "", "head", "The head tips to its right."),
].map(a => [a.id, a]));

/** FACS intensity letters A (trace) … E (maximum) as weights. */
export const INTENSITY = { A: .2, B: .4, C: .6, D: .8, E: 1 } as const;

export interface EmotionPrototype {
  id: string;
  name: string;
  ja?: string;
  /** Action units and their weights (0–1). `side` limits the listed units to one side (contempt). */
  aus: Readonly<Record<number, number>>;
  side?: "L" | "R";
  grade: Grade;
  source: string;
  /** What to watch for when drawing it. */
  notes: readonly string[];
}

const EMFACS = "EMFACS combinations as tabulated in Wikipedia, Facial Action Coding System (retrieved 2026-11-15)";
/** The seven EMFACS prototypes (reported) and the drawing extras the styles use (estimated). Ids match UKIYO1's moods where they overlap. */
export const EMOTIONS: readonly EmotionPrototype[] = [
  { id: "smile", name: "Happiness (Duchenne smile)", ja: "笑み", aus: { 6: .8, 12: .8 }, grade: "reported", source: EMFACS,
    notes: ["Cheeks raised and crow's feet (AU 6) with the corners pulled up (AU 12): the smile reaches the eyes (Duchenne).", "Without AU 6 the same mouth reads as a polite or posed smile."] },
  { id: "sad", name: "Sadness", ja: "悲しみ", aus: { 1: .8, 4: .6, 15: .8 }, grade: "reported", source: EMFACS,
    notes: ["The inner brows rise and draw together (1 + 4): the oblique 'grief brow'.", "The corners fall (15); the lids often droop (41)."] },
  { id: "surprise", name: "Surprise", ja: "驚き", aus: { 1: 1, 2: 1, 5: .4, 26: .8 }, grade: "reported", source: EMFACS,
    notes: ["Brows high and round, whites above the irises, jaw dropped loose (not stretched)."] },
  { id: "fear", name: "Fear", ja: "恐れ", aus: { 1: .9, 2: .7, 4: .6, 5: 1, 7: .5, 20: .8, 26: .5 }, grade: "reported", source: EMFACS,
    notes: ["Raised but drawn-together brows (1 + 2 + 4), staring upper lids with tense lower lids (5 + 7), the mouth stretched sideways (20)."] },
  { id: "angry", name: "Anger", ja: "怒り", aus: { 4: 1, 5: .6, 7: .8, 23: .8 }, grade: "reported", source: EMFACS,
    notes: ["Brows down and together, a hard stare (5 + 7), lips tightened thin (23)."] },
  { id: "disgust", name: "Disgust", ja: "嫌悪", aus: { 9: .8, 15: .6, 17: .6 }, grade: "reported", source: EMFACS + " (some versions give 9 + 15 + 16)",
    notes: ["Nose wrinkled, corners down, chin pushed up."] },
  { id: "contempt", name: "Contempt", ja: "軽蔑", aus: { 12: .5, 14: .5 }, side: "R", grade: "reported", source: EMFACS + "; listed at trace (A) intensity, drawn here at C so it reads",
    notes: ["One corner only, tightened and slightly raised: the one-sided expression among the seven."] },
  { id: "polite-smile", name: "Polite smile", aus: { 12: .6 }, grade: "estimated", source: "Duchenne smile article: a non-Duchenne smile involves only zygomatic major",
    notes: ["The mouth smiles; the eyes do not."] },
  { id: "laugh", name: "Laughter", ja: "笑い", aus: { 6: 1, 12: 1, 25: 1, 26: .7 }, grade: "estimated", source: "Duchenne smile with the mouth open",
    notes: ["Eyes squeezed into crescents by the cheeks, mouth open."] },
  { id: "cry", name: "Crying", ja: "泣き", aus: { 1: 1, 4: .8, 6: .6, 15: 1, 17: .7, 25: .4, 43: .4 }, grade: "estimated", source: "Sadness with cheek raise, chin raise and lids closing",
    notes: ["The grief brow, eyes squeezed, corners pulled down over a pushed-up chin."] },
  { id: "shy", name: "Shyness", ja: "恥じらい", aus: { 12: .4, 54: .6, 64: .7 }, grade: "estimated", source: "Small smile with head bowed and gaze lowered",
    notes: ["A small closed smile while the head bows and the eyes look away or down."] },
  { id: "pain", name: "Pain", aus: { 4: .8, 6: .7, 7: .8, 9: .6, 10: .6, 43: .5 }, grade: "estimated", source: "The core pain actions (brow lowering, orbit tightening, levator contraction, eye closure)",
    notes: ["Brows down, eyes squeezed, nose and upper lip pulled up."] },
  { id: "sleepy", name: "Sleepy", aus: { 41: .8, 43: .4, 25: .2 }, grade: "estimated", source: "Lid droop with the lids closing", notes: ["Heavy upper lids, slack mouth."] },
  { id: "determined", name: "Determined", aus: { 4: .5, 7: .5, 17: .6, 24: .8 }, grade: "estimated", source: "Brow lowering with pressed lips and a raised chin", notes: ["Set jaw, lips pressed, a level stare."] },
  { id: "mie", name: "Kabuki glare (mie)", ja: "見得", aus: { 4: 1, 5: 1, 66: 1, 24: 1 }, grade: "estimated", source: "Sharaku's actor prints: a frozen glare at the climax, the eyes crossed",
    notes: ["The actor freezes, eyes crossed (AU 66), brows down, lips pressed: the climactic pose of kabuki, painted with kumadori along the same lines."] },
];

/** Kumadori, kabuki stage make-up: the colours and what they mean (Wikipedia, Kumadori, retrieved 2026-11-15). */
export const KUMADORI = {
  colours: [
    { colour: "red", hex: "#c8202e", meaning: "A powerful hero: virtue and courage (Kamakura Gongorō in Shibaraku)." },
    { colour: "blue", hex: "#28407a", meaning: "A villain, and negative emotions such as fear and jealousy; ghosts and fox spirits." },
    { colour: "brown", hex: "#6a4630", meaning: "Monsters and non-human spirits such as oni (the earth spider)." },
    { colour: "black", hex: "#1c1a1a", meaning: "Exaggerates the brows and the line of the mouth." },
  ],
  patterns: [
    { name: "Nihon-guma (two lines)", meaning: "Quiet strength in heroes." },
    { name: "Suji-guma", meaning: "Power and righteous anger (Shibaraku): the best-known red pattern." },
    { name: "Mukimi-guma", meaning: "Young, handsome, virtuous heroes (Sukeroku)." },
    { name: "Zare-guma", meaning: "Comic villains, drawn to look like animals." },
    { name: "Kuge-guma", meaning: "A villainous court aristocrat, in blue." },
  ],
  note: "Over 50 patterns in four colours over a white base. The lines follow the face's own action lines (brow, cheek, mouth), so an expression's wrinkle marks (`expressionMarks`) are where kumadori strokes go.",
} as const;

/**
 * Noh masks: the same carved face reads differently with a slight tilt. Facing slightly upward ("brightening" the mask)
 * catches more light and looks laughing or smiling (Wikipedia, Noh mask). Bowing it (the opposite, called clouding in
 * Noh) is described as darkening it toward sorrow.
 */
export const NOH_TILT = { up: "brightens: reads as laughing or smiling (reported)", down: "clouds: reads as sorrowful (estimated: the opposite of brightening)" } as const;
