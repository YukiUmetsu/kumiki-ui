/** コンビニで: Emma buys a rice ball from Riku. Everything that happens is in this data; the engine is `storybook-film.ts`. */
import type { StoryAct, StoryDrift, StorybookFilm, StorySet, StoryStagedProp } from "../../../registry/video/storybook/storybook-film";
import { propView, setLayer, spokenLines, sprite } from "./art";
import { castOf } from "./cast";
import birds from "../../../assets/sound/recorded/bed-birds-uguisu.wav?url";
import bagOpens from "../../../assets/sound/recorded/bag-plastic-rustle-1.wav?url";
import bagTaken from "../../../assets/sound/recorded/bag-plastic-rustle-2.wav?url";
import beep from "../../../assets/sound/recorded/beep-scanner-shop.wav?url";
import coinOne from "../../../assets/sound/recorded/coin-slot-1.wav?url";
import coinTwo from "../../../assets/sound/recorded/coin-slot-2.wav?url";
import doorSlides from "../../../assets/sound/recorded/door-slide-wood.wav?url";
import drop from "../../../assets/sound/recorded/drop-water-small.wav?url";
import kalimbaOpens from "../../../assets/sound/recorded/music-kalimba-1.wav?url";
import kalimbaCloses from "../../../assets/sound/recorded/music-kalimba-2.wav?url";
import pageTurns from "../../../assets/sound/recorded/paper-page-turn-1.wav?url";
import paperSlides from "../../../assets/sound/recorded/paper-sheet-slide.wav?url";
import step1 from "../../../assets/sound/recorded/step-stone-1.wav?url";
import step3 from "../../../assets/sound/recorded/step-stone-3.wav?url";
import step4 from "../../../assets/sound/recorded/step-stone-4.wav?url";
import step5 from "../../../assets/sound/recorded/step-stone-5.wav?url";
import bellHigh from "../../../assets/sound/wyzowl/tones/tone-ding-mid.wav?url";
import bellLow from "../../../assets/sound/wyzowl/tones/tone-ding-low.wav?url";

const FULL = { width: 1920, height: 1080 };

/** Where things are, centimetres: the front of the counter stands on 0, its top goes from −92 (front edge) to −104 (back edge), the till from 0 to 98. */
const SHOP_MARKS = { goods: [-53, -98], till: [-15, -98], hand: [-57, -109], screen: [21.9, -116.7] } as const;
/** A painted checkout: what hangs on the wall behind it, and what of it is in front of the person who works there. */
const checkout = (id: "shop" | "till", tall: number): StorySet => ({
  home: { at: [-40, -130], tall }, marks: SHOP_MARKS,
  layers: [setLayer("konbini", id, { z: -100 }), setLayer("konbini", "picture", { z: -99 }), setLayer("konbini", "noren", { z: -98, sway: { pivot: [0.5, 0.03], degrees: 0.35, period: 5.2 } }), setLayer("konbini", `${id}-counter`, { z: 20 })],
});
const SETS: Record<string, StorySet> = {
  street: {
    home: { at: [0, -110], tall: 250 },
    layers: [
      setLayer("konbini", "street", { z: -100 }),
      // a branch close to the viewer: from above, a little soft, moving in the wind
      setLayer("konbini", "branch", { x: -206, y: -350, width: 156, height: 104, z: 50, depth: 1.45, blur: 0.9, mirror: true, sway: { pivot: [1, 0], degrees: 1.5, period: 4.6 } }),
    ],
  },
  shop: checkout("shop", 186),
  till: checkout("till", 118),
  /** The change machine from above, as the customer sees it; the slot for coins is at 0, 0, and what goes into it goes behind its lip. */
  pay: { home: { at: [0, 0], tall: 44 }, layers: [setLayer("konbini", "cash", { z: -100 }), setLayer("konbini", "cash-lip", { z: 8 })] },
  aisle: { home: { at: [-60, -135], tall: 240 }, layers: [setLayer("konbini", "aisle", { z: -100, depth: 0.4, blur: 3 })] },
  paper: { home: { at: [0, -90], tall: 200 }, layers: [] },
};

export const KONBINI_CAST: StorybookFilm["cast"] = castOf("ema", "riku");

const PETALS: StoryDrift = { id: "petals", sprites: ["petal-a", "petal-b", "petal-c"].map(p => sprite("konbini", p)), count: 16, area: [-250, -330, 560, 120], size: [5, 10], life: 150, flutter: { fall: 1.5, wind: 0.95, swing: 6, period: 44, tilt: 0.8, lift: 1.4, spin: 0.13, gust: 0.5, gustPeriod: 110, precess: 0.006 }, tumble: 0.3, roll: 0.03, vary: 0.4, fade: 0.1, seed: 5, z: 45 };

const RIKU = { actor: "riku", path: [-24, -19], scale: 0.9, z: 10, gaze: [-0.5, 0.3], turn: [-8, 3] } as const;
const EMA = { actor: "ema", path: [-92, 9], z: 30, gaze: [0.15, -0.25] } as const;
/** His arm over the counter: the near one of the picture's left, the far one of its right. */
const OVER = (side: "f" | "b", to?: number) => ({ layers: [`arm-${side}`, `hand-${side}`], z: 26, to });
/** Hands together in front of the apron. */
const TOGETHER = (at: number, seconds: number): StoryAct[] => [{ act: "rest", at, for: seconds, ease: [0.8, 0.8], params: { hand: "b", to: [-27, -113], angle: 72, lean: 0 } }, { act: "rest", at, for: seconds, ease: [0.8, 0.8], params: { hand: "f", to: [-22, -111.5], angle: -72, lean: 0 } }];
/** One arm of hers and nothing else: the picture is what she sees herself. */
const EMA_ARM = { actor: "ema", path: [-21, 156], z: 30, hidden: ["bag", "leg-b", "foot-b", "leg-f", "foot-f", "arm-b", "hand-b", "hips", "torso", "neck", "tails", "scarf", "strap-top", "strap", "head"] } as const;
/** Single steps; each recording has its hit at 0.02 s. */
const STEPS = [step1, step3, step4, step5].map(src => ({ src, lead: 0.02 }));
const COIN_IN = { to: [-6.5, 2.2], grip: "coin", after: "coin", release: 0.5, angle: -104, lean: 0, in: 0.8, away: 0.7 };
const PRICED: StoryStagedProp = { prop: "price", z: 20.4, holds: [{ t: 0, at: "screen" }] };

export const KONBINI_LINES = spokenLines("konbini");
export const KONBINI_FILM: StorybookFilm = {
  id: "konbini", title: "コンビニで — At the convenience store", size: FULL, fps: 24, paper: "#fbf3e1", frame: { x: 48, y: 40, width: 1824, height: 810 },
  cast: KONBINI_CAST, sets: SETS, lines: KONBINI_LINES,
  props: {
    onigiri: { name: "おにぎり", ...propView("konbini", "onigiri"), hangs: 0, shadow: 0.4 },
    beam: { name: "scanner light", ...propView("konbini", "beam"), hangs: 0 }, beep: { name: "ピッ", ...propView("konbini", "beep"), hangs: 0 },
    bag: { name: "袋", ...propView("konbini", "bag"), views: { empty: propView("konbini", "bag-empty") }, hangs: true },
    "100": { name: "百円", ...propView("konbini", "coin-100-b"), views: { cherry: propView("konbini", "coin-100-a") } },
    "50": { name: "五十円", ...propView("konbini", "coin-50-b"), views: { chrysanthemum: propView("konbini", "coin-50-a") } },
    price: { name: "price on the screen", ...propView("konbini", "screen-price") },
  },
  shots: [
    {
      id: "street", label: "Emma walks along an old street with cherry trees to a convenience store.", set: "street", seconds: 4.4, layout: "page",
      camera: [{ t: 0, at: [0, -141], tall: 304 }, { t: 1, at: [0, -141], tall: 303 }, { t: 3.4, at: [36, -98], tall: 214, ease: "ease-in-out-cubic" }, { t: 4.4, at: [40, -96], tall: 208, ease: "ease-out-quad" }],
      roles: [{ actor: "ema", view: "side", path: [{ t: -1, x: -338, y: 2 }, { t: 4.4, x: 118, y: 2, ease: "linear" }], z: 10, steps: { takes: STEPS, gain: -15 } }],
      drifts: [PETALS],
      words: [{ text: "コンビニで", gloss: "At the convenience store", at: 0.3, place: [960, 948], size: 84, tone: "title" }],
      sounds: [{ src: birds, at: 0, gain: -9, bed: true, fade: [0.5, 1.1] }, { src: kalimbaOpens, at: 0.35, for: 11.35, gain: -7, bed: true, fade: [0, 0.6] }],
    },
    {
      id: "welcome", label: "Inside the shop Riku bows behind the counter as Emma comes in.", set: "shop", seconds: 3.5, transition: { kind: "shoji", seconds: 0.9 },
      camera: [{ t: 0, at: [-44, -146], tall: 200 }, { t: 3.5, at: [-46, -140], tall: 176, ease: "ease-in-out-cubic" }],
      roles: [{ ...RIKU, acts: [...TOGETHER(-1, 6), { act: "bow", at: 1.25, for: 1.9, params: { degrees: 20, arms: false } }] }, { actor: "ema", view: "side", path: [{ t: 0.2, x: -300, y: 12 }, { t: 3.5, x: -128, y: 12, ease: "ease-out-quad" }], z: 30, steps: { takes: STEPS, gain: -21 } }],
      says: [{ line: "welcome", at: 1.1 }],
      // the door draws open with the picture; then the two notes of a shop's door
      sounds: [{ src: doorSlides, at: 0.42, lead: 0.74, gain: -9 }, { src: bellHigh, at: 0.5, gain: -13 }, { src: bellLow, at: 0.84, gain: -13 }, { src: birds, at: 0.3, for: 28.2, from: 4.4, gain: -17, bed: true, fade: [1, 2] }],
    },
    {
      id: "order", label: "Emma puts a rice ball on the counter and asks for it.", set: "till", seconds: 5.9, transition: { kind: "wash", seconds: 0.6 },
      camera: [{ t: 0, at: [-52, -134], tall: 138 }, { t: 4.4, at: [-52, -136], tall: 118, ease: "ease-in-out-quad" }],
      roles: [
        { ...RIKU, acts: [...TOGETHER(-1, 8), { act: "listen", at: 0.8, for: 4.4 }, { act: "nod", at: 4.9 }] },
        { ...EMA, acts: [{ act: "carry", at: -0.5, for: 2.9, params: { grip: "onigiri", x: 0.12, y: 0.15, angle: -84 } }, { act: "nod", at: 0.45, for: 1.05, strength: 0.7 }, { act: "place", at: 1.7, for: 2.1, params: { to: [-56.1, -99.4], grip: "onigiri", after: "open", release: 0.45, angle: -84 } }, { act: "carry", at: 2.95, for: 1.5, ease: [0.6, 0.5], params: { x: 0.05, y: 0.17, angle: -66 } }] },
      ],
      props: [{ prop: "onigiri", z: 21, holds: [{ t: 0, by: "ema", socket: "onigiri-f" }, { t: 2.62, at: "goods", over: 0.12, z: 31 }] }],
      says: [{ line: "onigiri-please", at: 0.45 }],
      sounds: [{ src: drop, at: 0.16, gain: -14 }, { src: bagTaken, at: 2.64, lead: 0.4575, gain: -15 }],
    },
    {
      id: "scan", label: "Riku scans the rice ball; the screen shows 150 yen and Riku says it.", set: "till", seconds: 4.6,
      camera: [{ t: 0, at: [-24, -137], tall: 104 }, { t: 4.6, at: [-20, -139], tall: 96, ease: "ease-in-out-quad" }],
      // the scanner comes to the rice ball and goes back under the counter; the rice ball goes down on the counter
      roles: [{ ...RIKU, gaze: [0.1, 0.4], turn: [2, 2], raise: [OVER("b")], acts: [
        { act: "rest", at: -1, for: 3.4, params: { hand: "b", to: [-16, -149], grip: "hold", angle: 170, lean: 0 } }, { act: "place", at: 1.4, for: 1.75, params: { in: 0.95, away: 0.5, hand: "b", to: [-13.3, -94.8], grip: "hold", after: "open", release: 0.88, angle: 56, lean: 10 } }, { act: "invite", at: 2.75, for: 3, params: { hand: "b", to: [9, -107], angle: -62 } },
        { act: "rest", at: -1, for: 2.4, params: { hand: "f", to: [-47, -106], grip: "gun", angle: -74, lean: 0 } }, { act: "scan", at: 0.05, for: 1.7, params: { hand: "f", to: [-19, -134], grip: "gun", angle: -100, lean: 0 } }, { act: "rest", at: 1.4, for: 1.6, ease: [0.7, 0.4], params: { hand: "f", to: [-44, -92], grip: "gun", angle: -20, lean: 0 } },
      ] }],
      props: [{ prop: "onigiri", z: 21, holds: [{ t: 0, by: "riku", socket: "ball-b" }, { t: 2.4, at: "till", over: 0.1, z: 27 }] }, { prop: "beam", holds: [{ t: 0.75, by: "riku", socket: "ball-b" }, { t: 1.2, by: "riku", socket: "ball-b", hidden: true }] }, { prop: "beep", holds: [{ t: 1.1, by: "riku", socket: "ball-b" }, { t: 1.5, by: "riku", socket: "ball-b", hidden: true }] }, { ...PRICED, holds: [{ t: 1.15, at: "screen" }] }],
      says: [{ line: "price", at: 1.5 }],
      sounds: [{ src: beep, at: 1.1, lead: 0.36, gain: -9 }],
    },
    {
      id: "bag", label: "Riku holds up a bag and asks if one is needed.", set: "till", seconds: 2.9,
      camera: [{ t: 0, at: [-34, -140], tall: 80 }, { t: 2.9, at: [-36, -141], tall: 76, ease: "ease-in-out-quad" }],
      // the bag comes up from under the counter and its bottom on the counter top: the hand at the height of the chest, toward the customer, the elbow bent near a right angle and not higher than the ribs
      roles: [{ ...RIKU, acts: [{ act: "rest", at: -1, for: 3, ease: [0.1, 0.5], params: { hand: "f", to: [-56, -98], grip: "grip", angle: 36, lean: 0 } }, { act: "rest", at: -0.1, for: 6, ease: [1.2, 0.3], params: { hand: "f", to: [-21, -136], grip: "grip", angle: 66, lean: 0 } }] }],
      props: [{ prop: "bag", holds: [{ t: 0, by: "riku", socket: "fist-f", view: "empty" }] }, PRICED],
      says: [{ line: "bag", at: 0.3 }],
      sounds: [{ src: bagOpens, at: 0.02, lead: 0.06, for: 0.9, gain: -15, fade: [0, 0.4] }],
    },
    {
      id: "answer", label: "Emma thinks for a moment and says yes.", set: "aisle", seconds: 3.8,
      camera: [{ t: 0, at: [-66, -135], tall: 70 }, { t: 3.6, at: [-68, -136], tall: 64, ease: "ease-in-out-quad" }],
      roles: [{ ...EMA, acts: [{ act: "think", at: 0, for: 1, params: { hand: false, look: "neutral" } }, { act: "nod", at: 1 }, { act: "feel", at: 2.4, for: 1.4, params: { look: "happy" } }] }],
      says: [{ line: "yes-please", at: 0.7 }],
      sounds: [{ src: kalimbaCloses, at: 0, for: 17, gain: -7, bed: true, fade: [0, 1] }],
    },
    {
      id: "pay", label: "Emma puts a 100 yen coin and a 50 yen coin into the change machine.", set: "pay", seconds: 3.9,
      camera: [{ t: 0, at: [1.5, 0], tall: 45 }, { t: 3.9, at: [1, 0], tall: 39, ease: "ease-in-out-quad" }],
      roles: [{ ...EMA_ARM, acts: [{ act: "rest", at: -1.5, for: 8, params: { to: [-22, 24], grip: "coin", angle: -118, lean: 0 } }, { act: "place", at: -0.55, for: 2.1, params: COIN_IN }, { act: "place", at: 1.4, for: 2.6, params: COIN_IN }] }],
      props: [
        { prop: "100", z: 4, holds: [{ t: 0, by: "ema", socket: "coin-f" }, { t: 0.62, at: [-0.3, 3.8], over: 0.22 }, { t: 1, at: [0, 0], hidden: true }] },
        { prop: "50", z: 4, holds: [{ t: 1.5, by: "ema", socket: "coin-f" }, { t: 2.66, at: [-0.3, 3.8], over: 0.22 }, { t: 3.04, at: [0, 0], hidden: true }] },
      ],
      sounds: [{ src: coinOne, at: 0.72, gain: -6 }, { src: coinTwo, at: 2.78, lead: 0.11, gain: -9 }],
      words: [{ text: "{百円|ひゃくえん}", at: 0.5, place: [740, 962], size: 72, tone: "vocab" }, { text: "{五十円|ごじゅうえん}", at: 2.3, place: [1180, 962], size: 72, tone: "vocab" }],
    },
    {
      id: "thanks", label: "Emma takes the bag and thanks Riku, who bows.", set: "till", seconds: 6.3, transition: { kind: "brush", seconds: 0.7 },
      camera: [{ t: 0, at: [-54, -134], tall: 120 }, { t: 2.8, at: [-44, -126], tall: 140, ease: "ease-in-out-quad" }],
      roles: [
        { ...RIKU, raise: [OVER("f", 3)], acts: [{ act: "rest", at: -1, for: 2, params: { hand: "f", to: [-59, -124], grip: "grip", angle: 60, lean: 0 } }, { act: "place", at: 0.5, for: 2.4, params: { hand: "f", to: "hand", grip: "grip", after: "open", release: 0.48, angle: 62, away: 1, lean: 6 } }, ...TOGETHER(1.9, 5), { act: "bow", at: 3.7, for: 2.2, params: { degrees: 26, arms: false } }] },
        { ...EMA, path: [-96, 9], acts: [{ act: "take", at: 0.5, for: 2, params: { to: "hand", grip: "easy", after: "grip", catch: 0.5, in: 0.9 } }, { act: "carry", at: 1.9, for: 5.2, ease: [0.6, 0.35], params: { grip: "grip", x: 0.12, y: 0.2 } }, { act: "greet", at: 1.8, for: 1.5, params: { arms: false } }, { act: "feel", at: 1.7, for: 1.9, params: { look: "happy" } }, { act: "feel", at: 5.1, for: 2, params: { look: "happy" } }] },
      ],
      props: [{ prop: "bag", holds: [{ t: 0, by: "riku", socket: "fist-f" }, { t: 1.5, by: "ema", socket: "fist-f", over: 0.3 }] }],
      says: [{ line: "thanks", at: 1.5 }, { line: "thanks-again", at: 3.7 }],
      sounds: [{ src: paperSlides, at: 0, for: 0.8, gain: -14, fade: [0.1, 0.3] }, { src: bagTaken, at: 1.52, lead: 0.4575, gain: -13 }],
    },
    {
      id: "words", label: "The words of the story, with their readings.", set: "paper", seconds: 4.2, layout: "full", transition: { kind: "page", seconds: 1 },
      camera: [{ t: 0, at: [0, -90], tall: 200 }],
      roles: [{ actor: "ema", path: [104, -56], scale: 0.58, z: 10, acts: [{ act: "bow", at: 1.9, for: 1.9, params: { degrees: 22 } }, { act: "feel", at: 1.4, for: 2.8, params: { look: "happy" } }] }],
      props: [
        { prop: "onigiri", scale: 5.2, holds: [{ t: 0, at: [-104, -62] }] },
        { prop: "100", scale: 8, holds: [{ t: 0, at: [-44, -66] }] },
        { prop: "50", scale: 8, holds: [{ t: 0, at: [-24, -66] }] },
        { prop: "bag", scale: 1.6, holds: [{ t: 0, at: [30, -62] }] },
      ],
      sounds: [{ src: pageTurns, at: 0.34, lead: 0.0856, gain: -5 }],
      words: [
        { text: "{今日|きょう}の ことば", gloss: "Today’s words", at: 0, place: [960, 182], size: 72, tone: "title" },
        { text: "おにぎり", gloss: "rice ball", means: true, at: 0.4, place: [400, 812], size: 64, tone: "vocab" },
        { text: "{円|えん}", gloss: "yen", means: true, at: 0.8, place: [770, 812], size: 64, tone: "vocab" },
        { text: "{袋|ふくろ}", gloss: "bag", means: true, at: 1.2, place: [1120, 812], size: 64, tone: "vocab" },
        { text: "お{願|ねが}いします", gloss: "please", means: true, at: 1.6, place: [1530, 812], size: 64, tone: "vocab" },
      ],
    },
  ],
};
