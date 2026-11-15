/**
 * "Momotarō": a UKIYO1 YouTube episode made with the episode template, after the public-domain folktale (story 1 of
 * the folktale database). An old woman washing clothes finds a giant peach on the river; a baby boy comes out of it.
 * Grown, he sets out with millet dumplings to stop the oni; a dog, a monkey and a pheasant each take a dumpling and
 * join him; they cross the sea to Onigashima, beat the oni and bring the stolen treasure home.
 *
 * Eight shots, 100 seconds, 16:9 and 9:16. Narration is the film's caption track.
 */
import type { UkiyoeAction, UkiyoeFigureLook } from "../../registry/video/ukiyoe/ukiyoe-figure";
import type { UkiyoeEpisodeAspect, UkiyoeEpisodeShot, UkiyoeEpisodeSpec } from "../../registry/video/ukiyoe/ukiyoe-episode";
import { ukiyoeEndCard, ukiyoeTitleCard } from "../../registry/video/ukiyoe/ukiyoe-episode";
import { interiorScene } from "../../registry/video/ukiyoe/ukiyoe-interior";
import { oniFight, UKIYOE_MOMOTARO_LOOK, UKIYOE_ONI_LOOK } from "../../registry/video/ukiyoe/ukiyoe-oni";
import type { UkiyoeNode, UkiyoeSceneSpec } from "../../registry/video/ukiyoe/ukiyoe-scene";
import { base, CAST } from "./ukiyoe-night-ferry";
import { cam, creature, figure, follow, motif } from "./ukiyoe-episode-kit";

type A = UkiyoeEpisodeAspect;
const MOMO: UkiyoeFigureLook = { ...UKIYOE_MOMOTARO_LOOK, bag: true } as UkiyoeFigureLook;
const OLD_WOMAN: UkiyoeFigureLook = { ...CAST.grandmother, hair: "elder", hairColor: "gofun" };
const OLD_MAN: UkiyoeFigureLook = { ...CAST.elder, prop: "none", hair: "elder", hairColor: "gofun", beard: true };
const DOG = { color: "gofun", belly: "gofun", accent: "beni" }, GROUND = 900;

/** The country: sky, far hills, rice terraces, the ground. */
function country(o: { dusk?: boolean } = {}): UkiyoeNode[] {
  return [
    motif("sky", "sky", -900, -1100, o.dusk ? { width: 4200, height: 1700, top: "ai", mid: "beni", horizon: "ki", band: .6 } : { width: 4200, height: 1700, top: "bero", mid: "sora", horizon: "paper", band: .5 }, { depth: .25 }),
    motif("hills", "hills", 960, 600, { width: 4200, height: 140, trees: .7, treeKind: "cedar", variant: 2 }, { depth: .5 }),
    motif("terraces", "ricefield", -900, 560, { width: 4400, height: 220, crop: "young", terraces: 3 }, { depth: .6 }),
    { id: "ground", kind: "block", depth: 1, x: 960, y: GROUND + 600, shape: { type: "rect", width: 4800, height: 1400 }, fill: { type: "linear", angle: 90, stops: [[0, "kusa", 1], [.12, "kincha", 1], [1, "cha", 1]] }, grain: .7, line: 0 } as UkiyoeNode,
    { id: "path", kind: "block", depth: 1, x: 960, y: GROUND + 40, shape: { type: "rect", width: 4800, height: 110 }, fill: { type: "linear", angle: 90, stops: [[0, "ki", .9], [1, "kincha", .9]] }, grain: 1, line: 0 } as UkiyoeNode,
  ];
}

// ---- 1. Title: the peach on the river ----------------------------------------------------------------------------------------------

const riverBackdrop = (a: A): UkiyoeSceneSpec => {
  const dur = 240, hz = 470;
  return base("mo-title", a, dur, {}, "spring", {
    camera: cam(a, [[960, 600, 1], [1000, 600, 1.05]], [[900, 700, 1.25], [960, 700, 1.3]], dur),
    wind: { base: .25, turbulence: .3 },
    nodes: [
      motif("sky", "sky", -900, -900, { width: 4200, height: hz + 1500, band: .45, horizon: "beni" }, { depth: .25 }),
      motif("fuji", "mountain", 1350, hz - 40, { width: 420, height: 190 }, { depth: .3 }),
      motif("terraces", "ricefield", -800, hz - 60, { width: 3800, height: 230, crop: "ripe", terraces: 4 }, { depth: .55 }),
      motif("river", "sea", -800, hz + 230, { width: 4000, height: 1200, rows: 16, swell: .6, foam: .1, deepAt: 420, speed: .9 }, { depth: .85 }),
      { id: "bank", kind: "block", depth: .85, x: 300, y: hz + 520, shape: { type: "polygon", points: [[-900, -260], [520, -210], [700, 60], [-900, 200]] }, fill: { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] }, grain: .7, line: 1.6 } as UkiyoeNode,
      motif("willow", "willow", 120, hz + 300, { height: 460 }, { depth: .85 }),
      motif("tub", "tarai", 760, hz + 350, { radius: 60 }, { depth: .85 }),
      figure("grandmother", OLD_WOMAN, 640, hz + 340, [{ type: "kneel", start: 0, end: dur }, { type: "wash", start: 0, end: 150, aim: [110, -10] }, { type: "look", start: 160, end: 230, angle: -6 }, { type: "point", start: 190, end: 230 }], { depth: .85, scale: 1.05, facing: "right" }),
      motif("peach", "peach", 1900, hz + 420, { size: 70 }, { depth: .85, keys: [{ frame: 0, x: 2200 }, { frame: dur, x: 1100, ease: "out" }], loops: [{ kind: "rock", amplitude: 1.2, period: 54 }] }),
      { id: "ripples", kind: "particles", type: "ripples", depth: .85, area: [800, hz + 410, 900, 60], count: 8, size: 1.6 } as UkiyoeNode,
    ],
  });
};
const title = ukiyoeTitleCard({
  title: "Momotarō", titleJa: "桃太郎", seal: "組木", backdrop: riverBackdrop, sound: { sound: "bed-stream-close", gainDb: -16 },
  narration: [{ text: "Long ago, an old woman was washing clothes in the river,", from: 28, to: 144 }, { text: "when a giant peach came floating down.", from: 150, to: 236 }],
});

// ---- 2. The peach opens ---------------------------------------------------------------------------------------------------------

const OPEN = 170;
const home: UkiyoeEpisodeShot = {
  id: "home", title: "The peach opens", kasumi: 30, sound: { sound: "bed-stream-close", gainDb: -28, lowpassHz: 700 },
  narration: [
    { text: "She carried it home to her husband.", from: 36, to: 140 },
    { text: "When they cut it open, out came a baby boy!", from: 186, to: 290 },
    { text: "They named him Momotarō, Peach Boy.", from: 294, to: 358 },
  ],
  build: a => {
    const dur = 360, room = interiorScene("hearth", { frames: dur, seed: 31 });
    const nodes: UkiyoeNode[] = room.nodes.filter(n => n.kind !== "figure");
    const front = nodes.findIndex(n => n.id === "room-front");
    // The old couple kneel either side of the peach; it splits open and the baby sits up laughing.
    nodes.splice(front, 0,
      figure("grandfather", OLD_MAN, 830, 774, [{ type: "kneel", start: 0, end: dur }, { type: "startle", start: OPEN + 4, end: OPEN + 40 }, { type: "cheer", start: OPEN + 70, end: OPEN + 140 }], { scale: 1.1, facing: "right" }),
      figure("grandmother", OLD_WOMAN, 1500, 770, [{ type: "kneel", start: 0, end: dur }, { type: "pray", start: 40, end: OPEN }, { type: "startle", start: OPEN + 6, end: OPEN + 44 }], { scale: 1.1, facing: "left" }),
      motif("peach", "peach", 1060, 826, { size: 72, openAt: OPEN, openDuration: 30 }),
      figure("baby", { ...CAST.momo, prop: "none", hat: "none" }, 1060, 868, [{ type: "kneel", start: 0, end: dur }, { type: "cheer", start: OPEN + 30, end: dur }], { scale: .7, facing: "left", from: OPEN + 12, enter: { preset: "mist", frame: OPEN + 12, duration: 16 } }),
    );
    const P = a === "portrait";
    if (P) nodes.unshift({ id: "under", kind: "block", x: 960, y: 1400, shape: { type: "rect", width: 3000, height: 1000 }, fill: "kogecha", grain: .7, line: 0 } as UkiyoeNode,
      { id: "over", kind: "block", x: 960, y: -300, shape: { type: "rect", width: 3000, height: 800 }, fill: "kogecha", grain: .7, line: 0 } as UkiyoeNode);
    return { ...base("mo-home", a, dur, {}, "edo", {}), nodes, camera: cam(a, [[1150, 660, 1.2], [1150, 660, 1.3]], [[1160, 760, 1.5], [1160, 760, 1.6]], dur) };
  },
};

// ---- 3. Setting out ----------------------------------------------------------------------------------------------------------------

const departure: UkiyoeEpisodeShot = {
  id: "departure", title: "Setting out", kasumi: 30, sound: { sound: "bed-stream-close", gainDb: -22 },
  narration: [
    { text: "Momotarō grew up strong and kind.", from: 32, to: 118 },
    { text: "When oni raided the villages, he set out to stop them,", from: 124, to: 242 },
    { text: "with millet dumplings his mother had made.", from: 248, to: 328 },
  ],
  build: a => {
    const dur = 330;
    return base("mo-departure", a, dur, {}, "spring", {
      camera: cam(a, [[960, 760, 1.2], [1040, 760, 1.25]], [[900, 800, 1.5], [1100, 800, 1.55]], dur),
      wind: { base: .4, turbulence: .3 },
      nodes: [
        ...country(),
        motif("house", "minka", 420, GROUND - 10, { width: 460, smoke: .5, variant: 2 }, { depth: .95 }),
        motif("pine", "pine", 1700, GROUND + 10, { height: 480, lean: -6 }, { depth: 1 }),
        figure("grandfather", OLD_MAN, 640, GROUND + 40, [{ type: "bow", start: 100, end: 150, angle: 20 }, { type: "wave", start: 200, end: dur }], { depth: 1, scale: .95, facing: "right" }),
        figure("grandmother", { ...OLD_WOMAN, prop: "dango" }, 780, GROUND + 40, [{ type: "hold", start: 120, end: 180, angle: 70, amount: 30 }, { type: "wave", start: 220, end: dur }], { depth: 1, scale: .92, facing: "right", to: 185 }),
        figure("grandmother-2", OLD_WOMAN, 780, GROUND + 40, [{ type: "hold", start: 120, end: 180, angle: 70, amount: 30 }, { type: "wave", start: 220, end: dur }], { depth: 1, scale: .92, facing: "right", from: 185 }),
        figure("momo", { ...MOMO, prop: "nobori" }, 1000, GROUND + 40, [{ type: "bow", start: 60, end: 120, angle: 30 }, { type: "walk", start: 200, end: dur, to: 760 }], { depth: 1, scale: 1, facing: "left" }),
      ],
    });
  },
};

// ---- 4. Dog, monkey, pheasant -------------------------------------------------------------------------------------------------------

const MEET = { dog: 70, monkey: 190, pheasant: 280 }, WALK = 360;
const companions: UkiyoeEpisodeShot = {
  id: "companions", title: "Dog, monkey, pheasant", kasumi: 30, sound: { sound: "bed-crickets-night", gainDb: -26 },
  narration: [
    { text: "On the road, a dog asked for a dumpling,", from: 36, to: 160 },
    { text: "then a monkey, then a pheasant.", from: 176, to: 300 },
    { text: "Each one ate, and followed him.", from: 340, to: 470 },
  ],
  build: a => {
    const dur = 480, x = 1100, y = GROUND + 40, off = -900;
    const momo: UkiyoeAction[] = [{ type: "walk", start: 0, end: 50, to: -60 }, { type: "hold", start: MEET.dog + 30, end: MEET.dog + 70, angle: 60, amount: 30 }, { type: "hold", start: MEET.monkey + 30, end: MEET.monkey + 70, angle: 60, amount: 30 }, { type: "hold", start: MEET.pheasant + 30, end: MEET.pheasant + 60, angle: 75, amount: 20 }, { type: "walk", start: WALK, end: dur, to: -60 + off }];
    return base("mo-companions", a, dur, {}, "spring", {
      camera: cam(a, [[960, 760, 1.2], [880, 760, 1.25]], [[960, 800, 1.5], [800, 800, 1.55]], dur),
      wind: { base: .35, turbulence: .3 },
      nodes: [
        ...country(),
        motif("pine", "pine", 760, GROUND + 10, { height: 520, lean: 8 }, { depth: 1 }),
        figure("momo", { ...MOMO, prop: "dango" }, x, y, momo, { depth: 1, scale: 1, facing: "left" }),
        creature("dog", "dog", 300, y + 10, [{ type: "run", start: MEET.dog - 40, end: MEET.dog, to: 600 }, { type: "sit", start: MEET.dog, end: WALK }, { type: "walk", start: WALK, end: dur, to: 600 + off }], { depth: 1, scale: .9, facing: "right", look: DOG }),
        creature("monkey", "monkey", 760, GROUND - 330, [{ type: "sit", start: 0, end: MEET.monkey - 20 }, { type: "hop", start: MEET.monkey - 20, end: MEET.monkey + 10, to: 500, toY: 370 }, { type: "hop", start: MEET.monkey + 12, end: MEET.monkey + 22, to: 480, toY: 370 }, { type: "sit", start: MEET.monkey + 22, end: WALK + 10 }, { type: "walk", start: WALK + 10, end: dur, to: 480 + off }], { depth: 1, scale: .85, facing: "right" }),
        creature("pheasant", "pheasant", -100, 200, [{ type: "fly", start: MEET.pheasant - 60, end: MEET.pheasant, to: 1080, toY: y + 10 - 200 }, { type: "stand", start: MEET.pheasant, end: WALK + 20 }, { type: "walk", start: WALK + 20, end: dur, to: 1080 + off }], { depth: 1, scale: .9, facing: "right" }),
      ],
    });
  },
};

// ---- 5. Across the sea --------------------------------------------------------------------------------------------------------------

const crossing: UkiyoeEpisodeShot = {
  id: "crossing", title: "Across the sea", kasumi: 30, sound: { sound: "bed-surf-beach", gainDb: -12 },
  narration: [
    { text: "Together they sailed for Onigashima,", from: 34, to: 150 },
    { text: "the island where the oni lived.", from: 160, to: 300 },
  ],
  build: a => {
    const dur = 330, sea = 760;
    return base("mo-crossing", a, dur, {}, "edo", {
      camera: cam(a, [[960, 600, 1.05], [1100, 600, 1.1]], [[480, 680, 1.4], [1150, 680, 1.45]], dur),
      wind: { base: .7, turbulence: .5 },
      nodes: [
        motif("sky", "sky", -900, -1100, { width: 4200, height: 1900, top: "bero", mid: "sora", horizon: "paper", band: .5 }, { depth: .25 }),
        motif("island", "onigashima", 1800, sea - 20, { width: 900, height: 420 }, { depth: .45 }),
        motif("sea", "sea", -900, sea - 30, { width: 4200, height: 900, rows: 14, swell: 1, foam: .5 }, { depth: .8 }),
        { id: "craft", kind: "group", x: 500, y: sea + 120, keys: [{ frame: 0, x: 450 }, { frame: dur, x: 1150, ease: "linear" }], loops: [{ kind: "rock", amplitude: 2.5, period: 60 }] } as UkiyoeNode,
        motif("boat", "boat", 0, 0, { length: 420, kind: "sampan" }, { parent: "craft" }),
        figure("momo", { ...MOMO, prop: "nobori" }, 120, -22, [{ type: "brace", start: 0, end: dur, angle: 8 }], { parent: "craft", scale: .9, facing: "right" }),
        creature("monkey", "monkey", -60, -22, [{ type: "sit", start: 0, end: dur }], { parent: "craft", scale: .75, facing: "right" }),
        creature("dog", "dog", -170, -22, [{ type: "sit", start: 0, end: dur }], { parent: "craft", scale: .8, facing: "right", look: DOG }),
        creature("pheasant", "pheasant", 520, 380, [{ type: "fly", start: 0, end: dur, to: 760, toY: -60 }], { scale: .8, facing: "right" }),
        motif("waves", "sea", -900, sea + 150, { width: 4200, height: 300, rows: 4, swell: 1.2, foam: .8 }, { depth: 1.1, opacity: .9 }),
      ],
    });
  },
};

// ---- 6. The fight -----------------------------------------------------------------------------------------------------------------

const battle: UkiyoeEpisodeShot = {
  id: "battle", title: "The fight on Onigashima", kasumi: 30, sound: { sound: "bed-surf-beach", gainDb: -16 },
  narration: [
    { text: "The pheasant pecked, the monkey scratched,", from: 150, to: 270 },
    { text: "the dog bit, and Momotarō fought the oni king", from: 280, to: 410 },
    { text: "until the oni king fell.", from: 430, to: 536 },
  ],
  build: a => {
    const dur = 540, f = oniFight({ id: "fight", x: 640, y: GROUND + 20, scale: 1, hero: { ...UKIYOE_MOMOTARO_LOOK } });
    const oniX = (f.nodes.find(n => n.id === "fight-oni")!.x ?? 0);
    return base("mo-battle", a, dur, {}, "twilight", {
      camera: { ...cam(a, [[960, 720, 1.15], [1000, 720, 1.2]], [[oniX - 120, 760, 1.4], [oniX - 140, 760, 1.45]], dur), shake: f.shake },
      wind: { base: .5, turbulence: .5 },
      nodes: [
        motif("sky", "sky", -900, -1100, { width: 4200, height: 1800, top: "ai", mid: "beni", horizon: "ki", band: .6 }, { depth: .25 }),
        motif("island", "onigashima", 1300, GROUND - 120, { width: 1500, height: 560 }, { depth: .6 }),
        { id: "rock", kind: "block", depth: 1, x: 960, y: GROUND + 600, shape: { type: "rect", width: 4800, height: 1300 }, fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] }, grain: 1, line: 0 } as UkiyoeNode,
        ...f.nodes,
        creature("pheasant", "pheasant", 200, 260, [{ type: "fly", start: 150, end: 200, to: oniX - 230, toY: GROUND - 520 }, { type: "peck", start: 200, end: 240 }, { type: "fly", start: 240, end: 320, to: oniX - 600, toY: -100 }], { scale: .85, facing: "right" }),
        creature("monkey", "monkey", 300, GROUND + 30, [{ type: "run", start: 230, end: 262, to: oniX - 300 }, { type: "leap", start: 262, end: 292 }, { type: "run", start: 300, end: 330, to: oniX - 650 }], { scale: .85, facing: "right" }),
        creature("dog", "dog", 160, GROUND + 30, [{ type: "run", start: 330, end: 372, to: oniX - 270 }, { type: "howl", start: 372, end: 400 }, { type: "run", start: 404, end: 440, to: oniX - 650 }], { scale: .9, facing: "right", look: DOG }),
      ],
    });
  },
};

// ---- 7. The oni give up their treasure --------------------------------------------------------------------------------------------

const surrender: UkiyoeEpisodeShot = {
  id: "surrender", title: "The treasure returned", kasumi: 30, sound: { sound: "bed-surf-beach", gainDb: -18 },
  narration: [
    { text: "The oni bowed low and begged for mercy.", from: 34, to: 170 },
    { text: "They gave back everything they had stolen.", from: 184, to: 356 },
  ],
  build: a => {
    const dur = 360, y = GROUND + 30;
    const oni = (id: string, look: UkiyoeFigureLook, x: number) => figure(id, { ...look, prop: "none" } as UkiyoeFigureLook, x, y, [{ type: "kneel", start: 0, end: dur }, { type: "bow", start: 20 + x % 30, end: dur, angle: 40 }], { scale: 1, facing: "left" });
    return base("mo-surrender", a, dur, {}, "twilight", {
      camera: cam(a, [[960, 760, 1.15], [960, 760, 1.2]], [[820, 800, 1.4], [1250, 800, 1.4]], dur),
      nodes: [
        motif("sky", "sky", -900, -1100, { width: 4200, height: 1800, top: "ai", mid: "beni", horizon: "ki", band: .6 }, { depth: .25 }),
        motif("island", "onigashima", 1100, GROUND - 120, { width: 1600, height: 600 }, { depth: .6 }),
        { id: "rock", kind: "block", depth: 1, x: 960, y: GROUND + 600, shape: { type: "rect", width: 4800, height: 1300 }, fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] }, grain: 1, line: 0 } as UkiyoeNode,
        motif("treasure", "takara", 980, y + 10, { size: 260 }, { enter: { preset: "mist", frame: 150, duration: 20 } }),
        oni("oni-red", UKIYOE_ONI_LOOK, 1260),
        oni("oni-blue", CAST["oni-blue"], 1480),
        figure("momo", { ...MOMO, prop: "nobori" }, 640, y, [{ type: "brace", start: 0, end: dur, angle: 4 }], { scale: 1, facing: "right" }),
        creature("dog", "dog", 470, y + 10, [{ type: "sit", start: 0, end: dur }], { scale: .85, facing: "right", look: DOG }),
        creature("monkey", "monkey", 350, y + 10, [{ type: "sit", start: 0, end: dur }], { scale: .8, facing: "right" }),
        creature("pheasant", "pheasant", 520, y + 10, [{ type: "stand", start: 0, end: dur }], { scale: .8, facing: "right" }),
      ],
    });
  },
};

// ---- 8. Home with the treasure: end card --------------------------------------------------------------------------------------------

const homecoming = (a: A): UkiyoeSceneSpec => {
  const dur = 360, y = GROUND + 40, walk: UkiyoeAction[] = [{ type: "walk", start: 0, end: 220, to: 520 }];
  return base("mo-end", a, dur, {}, "spring", {
    camera: cam(a, [[1000, 760, 1.15], [1080, 760, 1.18]], [[700, 800, 1.4], [1300, 800, 1.45]], dur),
    nodes: [
      ...country({ dusk: true }),
      motif("house", "minka", 1550, GROUND - 10, { width: 460, smoke: .6, light: .7, variant: 2 }, { depth: .95 }),
      motif("cart", "kuruma", 380, y, { width: 340, travel: 520 }, { keys: follow(walk, 380, 220).map(k => ({ ...k, progress: ((k.x ?? 380) - 380) / 520 })) }),
      figure("momo", MOMO, 640, y, [...walk, { type: "wave", start: 240, end: dur }], { depth: 1, scale: 1, facing: "right" }),
      creature("dog", "dog", 760, y + 10, [{ type: "walk", start: 0, end: 220, to: 520 }, { type: "sit", start: 222, end: dur }], { scale: .85, facing: "right", look: DOG }),
      creature("monkey", "monkey", 230, y + 10, [{ type: "walk", start: 0, end: 220, to: 520 }, { type: "sit", start: 222, end: dur }], { scale: .8, facing: "right" }),
      creature("pheasant", "pheasant", 500, 420, [{ type: "fly", start: 0, end: 220, to: 560, toY: 20 }], { scale: .8, facing: "right" }),
      figure("grandfather", OLD_MAN, 1700, y, [{ type: "wave", start: 60, end: 240 }, { type: "cheer", start: 240, end: dur }], { depth: 1, scale: .95, facing: "left" }),
      figure("grandmother", OLD_WOMAN, 1820, y, [{ type: "pray", start: 100, end: 260 }, { type: "bow", start: 270, end: dur, angle: 20 }], { depth: 1, scale: .92, facing: "left" }),
    ],
  });
};
const end = ukiyoeEndCard({
  closing: "めでたし、めでたし", next: "Next: Kaguya-hime", seal: "組木", backdrop: homecoming, kasumi: 30, sound: { sound: "bed-stream-close", gainDb: -20 },
  narration: [{ text: "They came home with the treasure,", from: 44, to: 136 }, { text: "and everyone lived happily ever after.", from: 144, to: 230 }],
});

export const MOMOTARO_EPISODE: UkiyoeEpisodeSpec = { id: "ukiyoe-momotaro", title: "Momotarō", lang: "en", shots: [title, home, departure, companions, crossing, battle, surrender, end] };
