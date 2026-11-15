/**
 * "Kaguya-hime" (The Tale of the Bamboo Cutter): a UKIYO1 YouTube episode made with the episode template, after the
 * public-domain tale (story 4 of the folktale database). An old bamboo cutter finds a tiny girl in a shining stalk; she
 * grows into a woman of shining beauty, sets five suitors impossible tasks, weeps at the moon, and is taken home by the
 * moon people for all the Emperor's soldiers; the Emperor burns her letter on the highest mountain.
 *
 * Eight shots, 95 seconds, 16:9 and 9:16. Narration is the film's caption track.
 */
import type { UkiyoeAction, UkiyoeFigureLook } from "../../registry/video/ukiyoe/ukiyoe-figure";
import { figureHeight } from "../../registry/video/ukiyoe/ukiyoe-figure";
import type { UkiyoeEpisodeAspect, UkiyoeEpisodeShot, UkiyoeEpisodeSpec } from "../../registry/video/ukiyoe/ukiyoe-episode";
import { ukiyoeEndCard, ukiyoeTitleCard } from "../../registry/video/ukiyoe/ukiyoe-episode";
import { toolContact } from "../../registry/video/ukiyoe/ukiyoe-folk";
import { UKIYOE_HEIAN_LOOKS } from "../../registry/video/ukiyoe/ukiyoe-heian";
import { UKIYOE_KAMI_LOOKS } from "../../registry/video/ukiyoe/ukiyoe-kami";
import { UKIYOE_BUSHI_LOOKS } from "../../registry/video/ukiyoe/ukiyoe-bushi";
import type { UkiyoeNode, UkiyoeSceneSpec } from "../../registry/video/ukiyoe/ukiyoe-scene";
import { base, CAST } from "./ukiyoe-night-ferry";
import { cam, figure, motif } from "./ukiyoe-episode-kit";

type A = UkiyoeEpisodeAspect;
const look = (l: unknown) => l as UkiyoeFigureLook;
const CUTTER: UkiyoeFigureLook = { hair: "elder", hairColor: "gofun", robe: "cha", robePattern: { type: "shima", color: "kogecha", scale: .5, opacity: .5 }, lower: "tucked", legs: "hada", feet: "waraji", beard: true } as UkiyoeFigureLook;
const OLD_WOMAN: UkiyoeFigureLook = { ...CAST.grandmother, hair: "elder", hairColor: "gofun" };
const KAGUYA = look(UKIYOE_HEIAN_LOOKS.lady), KAGUYA_ROBED: UkiyoeFigureLook = { ...KAGUYA, stole: "kin" } as UkiyoeFigureLook;
const ENVOY = look(UKIYOE_KAMI_LOOKS.tennyo), GROUND = 900;

/** The bamboo grove at dusk, one stalk shining. */
function grove(o: { shine?: boolean } = {}): UkiyoeNode[] {
  return [
    motif("sky", "sky", -900, -1100, { width: 4200, height: 1900, top: "ai", mid: "murasaki", horizon: "beni", band: .6 }, { depth: .25 }),
    motif("grove-far", "bamboo", 960, GROUND - 30, { width: 3000, height: 820, stalks: 34, color: "matsu" }, { depth: .6, opacity: .7 }),
    { id: "ground", kind: "block", depth: 1, x: 960, y: GROUND + 600, shape: { type: "rect", width: 4800, height: 1400 }, fill: { type: "linear", angle: 90, stops: [[0, "kusa", 1], [.2, "matsu", 1], [1, "sumi", .9]] }, grain: .7, line: 0 } as UkiyoeNode,
    motif("grove", "bamboo", 960, GROUND, { width: 2200, height: 900, stalks: 16, shine: o.shine === false ? -1 : 9 }, { depth: .95 }),
  ];
}
/** The palace veranda (shinden) with a figure kneeling between its interior and its blinds. Floor height: `FLOOR`. */
const PALACE = { x: 820, y: 900, width: 1100, height: 640 }, FLOOR = PALACE.y - PALACE.height * .23;
function veranda(o: { up: number; night?: boolean; lady?: UkiyoeNode[] }): UkiyoeNode[] {
  const px = { width: PALACE.width, height: PALACE.height, bays: 4, up: o.up };
  return [
    motif("sky", "sky", -900, -1100, o.night ? { width: 4200, height: 1900, top: "yoru", mid: "ai", horizon: "murasaki", band: .7 } : { width: 4200, height: 1900, top: "sora", mid: "paper", horizon: "beni", band: .5 }, { depth: .25 }),
    ...(o.night ? [motif("moon", "moon", 1550, 220, { radius: 70, halo: .6 }, { depth: .3 })] : []),
    { id: "garden", kind: "block", depth: 1, x: 960, y: GROUND + 600, shape: { type: "rect", width: 4800, height: 1400 }, fill: { type: "linear", angle: 90, stops: [[0, o.night ? "usuzumi" : "paper", 1], [1, o.night ? "sumi" : "usuzumi", 1]] }, grain: .8, line: 0 } as UkiyoeNode,
    motif("palace", "shinden", PALACE.x, PALACE.y, { ...px, part: "back" }),
    ...(o.lady ?? []),
    motif("palace-front", "shinden", PALACE.x, PALACE.y, { ...px, part: "front" }),
    motif("pine", "pine", 1700, GROUND + 20, { height: 460, lean: -8 }, { depth: 1.02 }),
  ];
}

// ---- 1. Title: the shining stalk ----------------------------------------------------------------------------------------------------

const groveBackdrop = (a: A): UkiyoeSceneSpec => {
  const dur = 240;
  return base("kg-title", a, dur, {}, "twilight", {
    camera: cam(a, [[960, 700, 1], [1000, 700, 1.05]], [[900, 780, 1.25], [1000, 780, 1.3]], dur),
    wind: { base: .3, turbulence: .3 },
    nodes: [...grove(), figure("cutter", CUTTER, 200, GROUND + 30, [{ type: "walk", start: 10, end: 200, to: 420 }, { type: "look", start: 200, end: dur, angle: -8 }], { depth: 1, scale: 1, facing: "right" })],
  });
};
const title = ukiyoeTitleCard({
  title: "Kaguya-hime", titleJa: "かぐや姫", seal: "組木", backdrop: groveBackdrop, sound: { sound: "bed-crickets-night", gainDb: -20 },
  narration: [{ text: "Long ago, an old bamboo cutter went into the grove,", from: 30, to: 132 }, { text: "and found a stalk that shone like the moon.", from: 138, to: 236 }],
});

// ---- 2. The girl in the bamboo -----------------------------------------------------------------------------------------------------

const CUT = 110;
const girl: UkiyoeEpisodeShot = {
  id: "girl", title: "The girl in the bamboo", kasumi: 30, sound: { sound: "bed-crickets-night", gainDb: -22 },
  narration: [
    { text: "Inside, no bigger than his thumb, sat a tiny girl.", from: 140, to: 252 },
    { text: "He carried her home, and they named her Kaguya.", from: 262, to: 356 },
  ],
  build: a => {
    const dur = 360, x = 720, k = 1.2, c = toolContact("chop", figureHeight(CUTTER)), sx = x + c[0] * k;
    return base("kg-girl", a, dur, {}, "twilight", {
      camera: cam(a, [[920, 700, 1.35], [920, 720, 1.45]], [[880, 760, 1.6], [880, 760, 1.7]], dur),
      wind: { base: .3, turbulence: .3 },
      nodes: [
        ...grove({ shine: false }),
        motif("stalk", "bamboo", sx, GROUND + 30, { width: 40, height: 900, stalks: 1, shine: 0 }, { to: CUT }),
        motif("cut", "takegiri", sx, GROUND + 30, { height: 300, rises: 1 }, { from: CUT, keys: [{ frame: 0, progress: 0 }, { frame: CUT + 30, progress: 0 }, { frame: CUT + 90, progress: 1 }] }),
        figure("cutter", CUTTER, x, GROUND + 30, [{ type: "chop", start: 20, end: CUT }, { type: "startle", start: CUT + 8, end: CUT + 50 }, { type: "kneel", start: CUT + 100, end: dur }, { type: "pray", start: CUT + 130, end: dur }], { depth: 1, scale: k, facing: "right" }),
      ],
    });
  },
};

// ---- 3. Grown in three months ---------------------------------------------------------------------------------------------------

const ladyOn = (l: UkiyoeFigureLook, x: number, acts: UkiyoeAction[], extra: Record<string, unknown> = {}) => figure("kaguya", l, x, FLOOR, [{ type: "kneel", start: 0, end: 9999 }, ...acts], { scale: 1.3, facing: "right", ...extra });
const grown: UkiyoeEpisodeShot = {
  id: "grown", title: "A woman of shining beauty", kasumi: 36, transition: "print", sound: { sound: "bed-stream-close", gainDb: -26 },
  narration: [
    { text: "In three months she grew into a woman of shining beauty.", from: 40, to: 192 },
    { text: "Her light filled the whole house.", from: 200, to: 296 },
  ],
  build: a => {
    const dur = 300;
    return base("kg-grown", a, dur, {}, "spring", {
      camera: cam(a, [[960, 720, 1.2], [960, 720, 1.26]], [[1000, 760, 1.5], [1000, 760, 1.55]], dur),
      nodes: [
        ...veranda({ up: .8, lady: [ladyOn(KAGUYA, 880, [{ type: "look", start: 80, end: 200, angle: -5 }])] }),
        { id: "light", kind: "motif", motif: "halo", x: 880, y: FLOOR - 150, params: { radius: 170, rays: 0 }, opacity: .22 } as UkiyoeNode,
        figure("cutter", CUTTER, 1260, GROUND + 30, [{ type: "kneel", start: 0, end: dur }, { type: "bow", start: 120, end: 200, angle: 25 }], { scale: 1, facing: "left" }),
        figure("wife", OLD_WOMAN, 1400, GROUND + 30, [{ type: "kneel", start: 0, end: dur }, { type: "pray", start: 60, end: 240 }], { scale: .95, facing: "left" }),
      ],
    });
  },
};

// ---- 4. The five suitors -----------------------------------------------------------------------------------------------------------

const suitors: UkiyoeEpisodeShot = {
  id: "suitors", title: "Five suitors", kasumi: 30, sound: { sound: "bed-stream-close", gainDb: -26 },
  narration: [
    { text: "Five great lords came to ask for her hand.", from: 30, to: 122 },
    { text: "She asked each for a treasure no one could find:", from: 128, to: 230 },
    { text: "a jewelled branch, a fire-rat robe, a dragon's pearl…", from: 236, to: 334 },
    { text: "None of them could bring it.", from: 342, to: 416 },
  ],
  build: a => {
    const dur = 420, lords = [UKIYOE_HEIAN_LOOKS.noble, UKIYOE_HEIAN_LOOKS.courtier, UKIYOE_HEIAN_LOOKS.noble, UKIYOE_HEIAN_LOOKS.courtier, UKIYOE_HEIAN_LOOKS.noble];
    return base("kg-suitors", a, dur, {}, "spring", {
      camera: cam(a, [[1060, 720, 1.1], [1100, 720, 1.14]], [[900, 760, 1.4], [1350, 760, 1.4]], dur),
      nodes: [
        ...veranda({ up: .15, lady: [ladyOn(KAGUYA, 820, [])] }),
        ...lords.map((l, i) => figure("lord-" + i, { ...look(l), robe: (["matsu", "murasaki", "ai", "kogecha", "beni"] as const)[i] } as UkiyoeFigureLook, 1150 + i * 150, GROUND + 30 + (i % 2) * 10,
          [{ type: "kneel", start: 0, end: dur }, { type: "bow", start: 40 + i * 30, end: 110 + i * 30, angle: 35 }, { type: "bow", start: 350 + i * 6, end: dur, angle: 20 }], { scale: .9, facing: "left" })),
      ],
    });
  },
};

// ---- 5. Weeping at the moon ------------------------------------------------------------------------------------------------------

const moon: UkiyoeEpisodeShot = {
  id: "moon", title: "Weeping at the moon", kasumi: 40, transition: "ink", sound: { sound: "bed-crickets-night", gainDb: -18 },
  narration: [
    { text: "Then, night after night, she wept at the moon.", from: 44, to: 164 },
    { text: "'I came from the Moon,' she said at last,", from: 172, to: 262 },
    { text: "'and they are coming to take me home.'", from: 270, to: 356 },
  ],
  build: a => {
    const dur = 360;
    return base("kg-moon", a, dur, {}, "night", {
      camera: cam(a, [[1060, 640, 1.1], [1060, 660, 1.16]], [[1050, 700, 1.4], [1050, 720, 1.45]], dur),
      nodes: [
        ...veranda({ up: .9, night: true, lady: [
          ladyOn(KAGUYA, 900, [{ type: "look", start: 0, end: 170, angle: -18 }, { type: "pray", start: 60, end: 160 }, { type: "talk", start: 180, end: 340 }]),
          figure("cutter", CUTTER, 1180, FLOOR, [{ type: "kneel", start: 0, end: dur }, { type: "look", start: 40, end: 160, angle: 6 }, { type: "startle", start: 200, end: 240 }], { scale: 1.2, facing: "left" }),
        ] }),
      ],
    });
  },
};

// ---- 6. The soldiers and the moon people -------------------------------------------------------------------------------------------

const BLAZE = 140;
const guards: UkiyoeEpisodeShot = {
  id: "guards", title: "The moon people come", kasumi: 30, sound: { sound: "bed-wind-mountain", gainDb: -24, lowpassHz: 900 },
  narration: [
    { text: "The Emperor sent two thousand soldiers to guard her.", from: 30, to: 136 },
    { text: "But in a blaze of light the moon people came,", from: 146, to: 262 },
    { text: "and not one arrow would fly.", from: 276, to: 386 },
  ],
  build: a => {
    const dur = 390, archer = look(UKIYOE_BUSHI_LOOKS.general);
    const aim = (i: number): UkiyoeAction[] => [{ type: "shoot", start: 20 + i * 8, end: BLAZE + 40, contact: 9999, aim: [180, -520] } as UkiyoeAction, { type: "drop", start: BLAZE + 60 + i * 10, end: BLAZE + 80 + i * 10 }, { type: "kneel", start: BLAZE + 90 + i * 10, end: dur }];
    const descend = { id: "host", kind: "group", x: 1200, y: -400, keys: [{ frame: 0, y: -500 }, { frame: BLAZE, y: -500 }, { frame: 320, y: 330, ease: "out" }, { frame: dur, y: 340 }] } as UkiyoeNode;
    return base("kg-guards", a, dur, {}, "night", {
      camera: cam(a, [[960, 720, 1], [960, 700, 1.02]], [[880, 800, 1.3], [1100, 760, 1.3]], dur),
      nodes: [
        motif("sky", "sky", -900, -1100, { width: 4200, height: 1900, top: "yoru", mid: "ai", horizon: "murasaki", band: .7 }, { depth: .25 }),
        motif("moon", "moon", 1300, 160, { radius: 80, halo: .8 }, { depth: .3 }),
        { id: "blaze", kind: "motif", motif: "lightrays", x: 1200, y: -120, params: { width: 1600, height: 1250, count: 11, color: "ki" }, keys: [{ frame: 0, opacity: 0 }, { frame: BLAZE, opacity: 0 }, { frame: BLAZE + 60, opacity: .9 }] } as UkiyoeNode,
        { id: "garden", kind: "block", depth: 1, x: 960, y: GROUND + 600, shape: { type: "rect", width: 4800, height: 1400 }, fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] }, grain: .8, line: 0 } as UkiyoeNode,
        motif("wall", "yashiki", 900, GROUND - 40, { width: 1800, height: 300, night: 1, pines: 0 }, { depth: .95 }),
        ...[0, 1, 2, 3].map(i => figure("archer-" + i, archer, 260 + i * 210, GROUND + 40 + (i % 2) * 14, aim(i), { depth: 1, scale: .95, facing: "right" })),
        descend,
        motif("cloud", "kumo", 0, 0, { width: 520 }, { parent: "host" }),
        motif("cart", "gissha", 40, -10, { width: 260 }, { parent: "host" }),
        motif("cloud-2", "kumo", -360, 80, { width: 360 }, { parent: "host" }),
        figure("envoy-a", ENVOY, -380, 70, [{ type: "fly", start: 0, end: dur, to: 0 }], { parent: "host", scale: .8, facing: "left" }),
        figure("envoy-b", ENVOY, -280, 76, [{ type: "fly", start: 0, end: dur, to: 0 }], { parent: "host", scale: .8, facing: "left" }),
      ],
    });
  },
};

// ---- 7. The feather robe and the ascent ---------------------------------------------------------------------------------------------

const ROBE = 150, RISE = 200;
const ascent: UkiyoeEpisodeShot = {
  id: "ascent", title: "Home to the moon", kasumi: 30, sound: { sound: "bed-wind-mountain", gainDb: -26, lowpassHz: 900 },
  narration: [
    { text: "An envoy wrapped her in a robe of feathers,", from: 40, to: 160 },
    { text: "and all her earthly sorrow was forgotten.", from: 172, to: 290 },
    { text: "She rose to the moon, and was gone.", from: 300, to: 416 },
  ],
  build: a => {
    const dur = 420;
    return base("kg-ascent", a, dur, {}, "night", {
      camera: { keys: [
        { frame: 0, x: 960, y: 760, zoom: a === "portrait" ? 1.4 : 1.15 }, { frame: RISE, x: 960, y: 760, zoom: a === "portrait" ? 1.4 : 1.15, ease: "inOut" },
        { frame: dur - 30, x: 1060, y: -260, zoom: a === "portrait" ? 1.2 : 1, ease: "inOut" }, { frame: dur - 1, x: 1060, y: -270, zoom: a === "portrait" ? 1.2 : 1 },
      ] },
      nodes: [
        { id: "sky", kind: "block", x: 960, y: -200, shape: { type: "rect", width: 4800, height: 3200 }, fill: { type: "linear", angle: 90, stops: [[0, "yoru", 1], [.6, "ai", 1], [1, "murasaki", 1]] }, line: 0 } as UkiyoeNode,
        motif("moonpalace", "moonpalace", 1100, -560, { radius: 300 }),
        { id: "garden", kind: "block", depth: 1, x: 960, y: GROUND + 600, shape: { type: "rect", width: 4800, height: 1400 }, fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] }, grain: .8, line: 0 } as UkiyoeNode,
        motif("wall", "yashiki", 900, GROUND - 60, { width: 1900, height: 280, night: 1, pines: 0 }, { depth: .9 }),
        ...[0, 1, 2].map(i => figure("archer-" + i, look(UKIYOE_BUSHI_LOOKS.general), 1350 + i * 170, GROUND - 40, [{ type: "kneel", start: 0, end: dur }, { type: "bow", start: 0, end: dur, angle: 30 }], { depth: .9, scale: .7, facing: "left" })),
        figure("cutter", CUTTER, 620, GROUND + 30, [{ type: "kneel", start: 0, end: RISE }, { type: "brace", start: RISE, end: dur, angle: -12 }], { scale: 1, facing: "right" }),
        figure("wife", OLD_WOMAN, 480, GROUND + 30, [{ type: "kneel", start: 0, end: dur }, { type: "pray", start: 40, end: dur }], { scale: .95, facing: "right" }),
        { id: "rise", kind: "group", x: 1000, y: GROUND - 10, keys: [{ frame: 0, x: 1000, y: GROUND - 10 }, { frame: RISE, x: 1000, y: GROUND - 10 }, { frame: dur - 20, x: 1100, y: -360, ease: "inOut" }, { frame: dur, x: 1100, y: -380 }] } as UkiyoeNode,
        motif("cloud", "kumo", 0, 30, { width: 520 }, { parent: "rise", flip: true }),
        figure("kaguya", KAGUYA, 0, 10, [{ type: "look", start: RISE + 20, end: dur, back: true }], { parent: "rise", scale: 1.1, facing: "left", to: ROBE } as Record<string, unknown>),
        figure("kaguya-robed", KAGUYA_ROBED, 0, 10, [{ type: "look", start: RISE + 20, end: dur, back: true }], { parent: "rise", scale: 1.1, facing: "left", from: ROBE } as Record<string, unknown>),
        figure("envoy", ENVOY, 150, 10, [{ type: "hold", start: 60, end: ROBE + 10, angle: 70, amount: 40 }], { parent: "rise", scale: 1, facing: "left" }),
      ],
    });
  },
};

// ---- 8. End card: the smoke on the mountain ----------------------------------------------------------------------------------------

const fujiBackdrop = (a: A): UkiyoeSceneSpec => {
  const dur = 360, top: [number, number] = [980, 300];
  return base("kg-end", a, dur, {}, "twilight", {
    camera: cam(a, [[960, 560, 1], [960, 560, 1.03]], [[1000, 600, 1.25], [1000, 600, 1.3]], dur),
    nodes: [
      motif("sky", "sky", -900, -1100, { width: 4200, height: 1900, top: "ai", mid: "beni", horizon: "ki", band: .6 }, { depth: .25 }),
      motif("moon", "moon", 1500, 200, { radius: 46, halo: .3 }, { depth: .25 }),
      motif("fuji", "mountain", 980, 900, { width: 1500, height: 600, snowLine: .35 }, { depth: .5 }),
      { id: "smoke", kind: "particles", type: "smoke", depth: .5, bursts: Array.from({ length: 9 }, (_, i) => ({ frame: i * 38, x: top[0] + (i % 3 - 1) * 12, y: top[1] - 30 - (i % 2) * 20, radius: 70, count: 6 })) } as UkiyoeNode,
      motif("mist", "cloud", 900, 760, { width: 1800, height: 70, color: "gofun", steps: 3 }, { depth: .6, opacity: .8 }),
      { id: "ground", kind: "block", depth: 1, x: 960, y: 1500, shape: { type: "rect", width: 4800, height: 1200 }, fill: { type: "linear", angle: 90, stops: [[0, "matsu", 1], [1, "sumi", 1]] }, grain: .7, line: 0 } as UkiyoeNode,
    ],
  });
};
const end = ukiyoeEndCard({
  closing: "おしまい", next: "Next: Tsuru no Ongaeshi", seal: "組木", backdrop: fujiBackdrop, kasumi: 30, sound: { sound: "bed-wind-mountain", gainDb: -26 },
  narration: [{ text: "The Emperor burned her last letter", from: 44, to: 118 }, { text: "on the highest mountain,", from: 124, to: 184 }, { text: "and they say its smoke still rises to the moon.", from: 190, to: 300 }],
});

export const KAGUYA_EPISODE: UkiyoeEpisodeSpec = { id: "ukiyoe-kaguya-hime", title: "Kaguya-hime", lang: "en", shots: [title, girl, grown, suitors, moon, guards, ascent, end] };
