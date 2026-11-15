/**
 * "Kasa Jizō" (The Straw Hats): a short UKIYO1 YouTube episode made with the episode template, after the public-domain
 * folktale. A poor old couple have nothing for New Year but five straw hats they wove. The old man cannot sell them in
 * the snow. On the way home he puts them on six roadside jizō, and his own cloth on the sixth. That night the jizō walk
 * to the house pulling a sled of rice and gifts, and leave it at the door.
 *
 * Six shots, 73 seconds, 16:9 and 9:16. Narration is the film's caption track; the scene holds no text but the title and
 * the end card.
 */
import type { UkiyoeAction, UkiyoeFigureLook } from "../../registry/video/ukiyoe/ukiyoe-figure";
import { interiorScene } from "../../registry/video/ukiyoe/ukiyoe-interior";
import type { UkiyoeEpisodeAspect, UkiyoeEpisodeShot, UkiyoeEpisodeSpec } from "../../registry/video/ukiyoe/ukiyoe-episode";
import { ukiyoeEndCard, ukiyoeTitleCard } from "../../registry/video/ukiyoe/ukiyoe-episode";
import type { UkiyoeNode, UkiyoeSceneSpec } from "../../registry/video/ukiyoe/ukiyoe-scene";
import { UKIYOE_JIZO_LOOK } from "../../registry/video/ukiyoe/ukiyoe-village";
import { base, CAST } from "./ukiyoe-night-ferry";
import { cam, figure, follow, motif, STEPS } from "./ukiyoe-episode-kit";

type A = UkiyoeEpisodeAspect;

const OLD_MAN: UkiyoeFigureLook = { ...CAST.elder, robe: "cha", prop: "none", hat: "headband", hatColor: "ai", lower: "tucked", legs: "gofun", feet: "waraji", mino: true };
const OLD_WOMAN: UkiyoeFigureLook = { ...CAST.grandmother, hair: "elder", hairColor: "gofun" };
const SNOW = (n = 220): UkiyoeNode => ({ id: "snow", kind: "particles", type: "snow", depth: 1.1, area: [-400, -400, 2800, 1900], count: n, speed: 1.2, size: 1.2 } as UkiyoeNode);
const sky = (night = false): UkiyoeNode => motif("sky", "sky", -900, -1100, night ? { width: 4200, height: 2400, top: "yoru", mid: "ai", horizon: "murasaki", band: .7 } : { width: 4200, height: 2400, top: "usuzumi", mid: "paper", horizon: "gofun", band: .55 }, { depth: .25 });
const snowfield = (y: number): UkiyoeNode => ({ id: "field", kind: "block", depth: .9, x: 960, y: y + 1200, shape: { type: "rect", width: 4600, height: 2400 }, fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "sora", .8]] }, grain: .5, line: 0 } as UkiyoeNode);

// ---- 1. Title: the village in snow ---------------------------------------------------------------------------------------------------

const villageBackdrop = (a: A): UkiyoeSceneSpec => {
  const hz = 560, dur = 240;
  return base("kj-title", a, dur, {}, "snow", {
    camera: cam(a, [[960, 540, 1], [960, 530, 1.05]], [[1150, 560, 1.2], [1150, 540, 1.26]], dur),
    wind: { base: .3, turbulence: .3 },
    nodes: [
      sky(),
      motif("range", "range", 960, hz + 40, { width: 3600, height: 600, layers: 4, snow: .9, mistColor: "gofun", trees: .4, variant: 2 }, { depth: .35 }),
      snowfield(hz),
      motif("house-a", "minka", 560, hz + 170, { width: 400, snow: 1, smoke: .8, light: .5, variant: 1 }, { depth: .7 }),
      motif("house-b", "minka", 980, hz + 140, { width: 300, snow: 1, smoke: .5, variant: 3 }, { depth: .7 }),
      motif("pine", "pine", 1650, hz + 260, { height: 460, lean: -6 }, { depth: .8 }),
      motif("jizo", "jizo", 1300, hz + 250, { height: 110, count: 6, snow: 1, bib: true }, { depth: .85 }),
      SNOW(),
    ],
  });
};
const title = ukiyoeTitleCard({
  title: "Kasa Jizō", titleJa: "笠地蔵", seal: "組木", backdrop: villageBackdrop, sound: { sound: "bed-wind-mountain", gainDb: -16 },
  narration: [{ text: "Long ago, a poor old man and his wife", from: 50, to: 144 }, { text: "lived in a snowy village.", from: 150, to: 216 }],
});

// ---- 2. The last day of the year, by the hearth ----------------------------------------------------------------------------------------

const home: UkiyoeEpisodeShot = {
  id: "home", title: "By the hearth", kasumi: 30, sound: { sound: "bed-wind-mountain", gainDb: -26, lowpassHz: 700 },
  // The fire in the sunken hearth, close by; the wind stays outside the walls.
  ambience: [{ sound: "bed-fire-hearth", gainDb: -22 }],
  narration: [
    { text: "It was the last day of the year,", from: 32, to: 114 },
    { text: "and they had no rice for New Year.", from: 120, to: 204 },
    { text: "All they had were five straw hats they had woven.", from: 210, to: 324 },
  ],
  build: a => {
    const dur = 330, room = interiorScene("hearth", { frames: dur, seed: 23 });
    const nodes = [...room.nodes];
    // The five hats, piled on the boards beside the old woman.
    nodes.splice(nodes.findIndex(n => n.id === "room-front"), 0, motif("hats", "kasa", 1530, 860, { count: 5, size: 62 }));
    // Portrait: a floor under the room and the roof's dark above, so the taller frame is filled.
    const P = a === "portrait";
    if (P) nodes.unshift({ id: "under", kind: "block", x: 960, y: 1400, shape: { type: "rect", width: 3000, height: 1000 }, fill: "kogecha", grain: .7, line: 0 } as UkiyoeNode,
      { id: "over", kind: "block", x: 960, y: -300, shape: { type: "rect", width: 3000, height: 800 }, fill: "kogecha", grain: .7, line: 0 } as UkiyoeNode);
    return { ...base("kj-home", a, dur, {}, "edo", {}), nodes, camera: cam(a, [[960, 560, 1], [980, 580, 1.08]], [[1180, 640, 1.3], [1190, 650, 1.36]], dur) };
  },
};

// ---- 3. The market: no one buys -------------------------------------------------------------------------------------------------------

const market: UkiyoeEpisodeShot = {
  id: "market", title: "The market in the snow", kasumi: 36, transition: "scroll", sound: { sound: "bed-wind-mountain", gainDb: -20 },
  // Passers-by tread the snow and go; the old man stands still with his hats.
  sounds: ["p1", "p2", "p3", "p4"].map(node => ({ sound: STEPS.snow, at: { node, on: "step" as const }, gainDb: -13 })),
  narration: [
    { text: "The old man carried the hats to the market in town.", from: 40, to: 170 },
    { text: "But it snowed all day, and nobody bought a single one.", from: 182, to: 322 },
  ],
  build: a => {
    const dur = 330, hz = 520, gy = 800;
    const passer = (id: string, look: UkiyoeFigureLook, x: number, to: number, start: number, extra: UkiyoeAction[] = []) =>
      figure(id, look, x, gy + 30, [{ type: "walk", start, end: start + 260, to }, ...extra], { depth: 1, scale: .85 });
    return base("kj-market", a, dur, {}, "snow", {
      camera: cam(a, [[930, 640, 1.3], [910, 640, 1.36]], [[900, 620, 1.5], [900, 630, 1.56]], dur),
      wind: { base: .35, turbulence: .4 },
      nodes: [
        sky(),
        snowfield(hz),
        motif("shop-a", "shop", 380, gy - 40, { width: 420, noren: "ai", snow: 1 }, { depth: .9 }),
        motif("shop-b", "shop", 860, gy - 40, { width: 380, noren: "shu", snow: 1 }, { depth: .9 }),
        motif("kura", "kura", 1320, gy - 40, { width: 300, snow: 1 }, { depth: .9 }),
        motif("shop-c", "shop", 1720, gy - 40, { width: 400, noren: "kusa", snow: 1 }, { depth: .9 }),
        { id: "street", kind: "block", depth: 1, x: 960, y: gy + 200, shape: { type: "rect", width: 4600, height: 400 }, fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "usuzumi", .3]] }, grain: .6, line: 0 } as UkiyoeNode,
        motif("hats", "kasa", 840, gy + 40, { count: 5, size: 58 }, { depth: 1 }),
        figure("oldman", { ...OLD_MAN, mino: true }, 960, gy + 30, [{ type: "talk", start: 30, end: 90 }, { type: "wave", start: 120, end: 170 }, { type: "talk", start: 200, end: 250 }, { type: "look", start: 270, end: dur, angle: 12 }], { depth: 1, scale: .9, facing: "left" }),
        passer("p1", { ...CAST.merchant, prop: "umbrella", accent: "ai" }, 2100, -1500, 0),
        passer("p2", { ...CAST.mother, prop: "umbrella", accent: "beni" }, -200, 1500, 40),
        passer("p3", { ...CAST.porter }, 2200, -1600, 120),
        passer("p4", { ...CAST.monk }, -300, 1300, 170),
        SNOW(260),
      ],
    });
  },
};

// ---- 4. The six jizō ------------------------------------------------------------------------------------------------------------------

const JIZO_X = [420, 610, 800, 990, 1180, 1370], ROAD = 780, START = 1980, ARRIVE = 110, EACH = 60;
/** When the old man reaches each jizō (right to left), and when the cloth goes on the sixth. */
const placeAt = (k: number) => ARRIVE + k * EACH;
const giving = (): UkiyoeAction[] => {
  const acts: UkiyoeAction[] = [{ type: "walk", start: 0, end: ARRIVE - 4, to: JIZO_X[5] + 95 - START }];
  for (let k = 0; k < 6; k++) {
    const t = placeAt(k), i = 5 - k;
    acts.push({ type: "hold", start: t, end: t + 26, angle: 72, amount: 40 });
    if (k < 5) acts.push({ type: "walk", start: t + 30, end: t + EACH - 2, to: JIZO_X[i - 1] + 95 - START });
  }
  acts.push({ type: "pray", start: placeAt(5) + 36, end: placeAt(5) + 70 });
  return acts;
};
const jizoRow: UkiyoeEpisodeShot = {
  id: "jizo", title: "Six jizō in the snow", kasumi: 30, sound: { sound: "bed-wind-mountain", gainDb: -16 },
  // His steps in the snow from one jizō to the next (the figure without his cloth takes over at the sixth).
  sounds: ["oldman", "oldman-bare"].map(node => ({ sound: STEPS.snow, at: { node, on: "step" as const }, gainDb: -8 })),
  narration: [
    { text: "On the way home, he passed six stone jizō", from: 32, to: 124 },
    { text: "standing in the snow.", from: 130, to: 184 },
    { text: "He brushed off the snow and gave each one a hat.", from: 190, to: 330 },
    { text: "There were only five. To the last, he gave his own cloth.", from: 345, to: 472 },
  ],
  build: a => {
    const dur = 480, hz = 470, acts = giving(), swap = placeAt(5) + 14;
    return base("kj-jizo", a, dur, {}, "snow", {
      camera: cam(a, [[1080, 610, 1.25], [820, 620, 1.3]], [[1450, 560, 1.5], [1100, 560, 1.5], [620, 570, 1.5]], dur),
      wind: { base: .4, turbulence: .5, gusts: [{ frame: 200, duration: 80, strength: .7 }] },
      nodes: [
        sky(),
        motif("range", "range", 960, hz + 30, { width: 3600, height: 520, layers: 3, snow: .95, mistColor: "gofun", trees: .5, variant: 4 }, { depth: .35 }),
        snowfield(hz),
        motif("pine", "pine", 160, ROAD - 10, { height: 520, lean: 8 }, { depth: .9 }),
        { id: "road", kind: "block", depth: 1, x: 960, y: ROAD + 120, shape: { type: "polygon", points: [[-1500, -60], [1500, -80], [1500, 60], [-1500, 80]] }, fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "usuzumi", .3]] }, grain: .6, line: 0 } as UkiyoeNode,
        ...JIZO_X.map((x, i) => {
          const t = placeAt(5 - i);
          return motif("jizo-" + i, "jizo", x, ROAD, { height: 150, snow: 1, variant: i, bib: true, kasa: i > 0, tenugui: i === 0, kasaDrop: true },
            { depth: 1, keys: [{ frame: 0, progress: 0 }, { frame: t + 8, progress: 0 }, { frame: t + 26, progress: 1 }] });
        }),
        // He takes off his own cloth for the sixth: the figure with the headband hands over to one without it.
        figure("oldman", { ...OLD_MAN, prop: "bundle" }, START, ROAD + 10, acts, { depth: 1, scale: .9, facing: "left", to: swap }),
        figure("oldman-bare", { ...OLD_MAN, prop: "bundle", hat: "none" }, START, ROAD + 10, acts, { depth: 1, scale: .9, facing: "left", from: swap }),
        SNOW(300),
      ],
    });
  },
};

// ---- 5. Night: the jizō come ----------------------------------------------------------------------------------------------------------

const DOOR = 640, NIGHT_ROAD = 790, ARRIVE_AT = 280, LEAVE_AT = 356;
const jizoWalk = (dx: number, away: number): UkiyoeAction[] => [
  { type: "walk", start: 0, end: ARRIVE_AT, to: dx },
  { type: "bow", start: 292, end: 332, angle: 25 },
  { type: "turn", start: 340, end: LEAVE_AT },
  { type: "walk", start: LEAVE_AT, end: 470, to: dx + away },
];
const night: UkiyoeEpisodeShot = {
  id: "night", title: "The jizō come in the night", kasumi: 40, transition: "ink", sound: { sound: "bed-wind-mountain", gainDb: -20, lowpassHz: 900 },
  sounds: [
    // New Year's Eve: a temple bell far off (joya no kane), then the stone feet in the snow. The six walk in step, so six crunches
    // on one frame would only make one loud one: the lead and two others, quieter, in different takes, sound like many feet.
    { sound: "bell-temple-large", at: 64, gainDb: -3, pan: -.35, distance: 40 },
    { sound: STEPS.snow, at: { node: "jizo-0", on: "step" }, gainDb: -9 },
    ...[2, 4].map(k => ({ sound: STEPS.snow, at: { node: "jizo-" + k, on: "step" as const }, gainDb: -14 })),
    // The loaded sled comes to rest at the door.
    { sound: "thud-club-1", at: ARRIVE_AT + 2, source: "sled", distance: 5, gainDb: -12 },
  ],
  narration: [
    { text: "That night, there were footsteps in the snow.", from: 44, to: 170 },
    { text: "Six jizō were coming to the house, pulling a heavy sled.", from: 184, to: 330 },
    { text: "They left it at the door, and went quietly away.", from: 345, to: 465 },
  ],
  build: a => {
    const dur = 470, hz = 520, lead0 = 2150, leadStop = DOOR + 230, dx = leadStop - lead0;
    const lead = jizoWalk(dx, 0).slice(0, 2);   // the lead pulls the sled to the door and stays to bow, then leaves with the rest
    const leadActs = [...lead, { type: "turn", start: 340, end: LEAVE_AT }, { type: "walk", start: LEAVE_AT, end: 470, to: dx + 1100 }] as UkiyoeAction[];
    const sledActs: UkiyoeAction[] = [{ type: "walk", start: 0, end: ARRIVE_AT, to: dx }];
    const followers = [0, 1, 2, 3, 4].map(j => figure("jizo-" + (j + 1), { ...UKIYOE_JIZO_LOOK, ...(j === 4 ? { hat: "headband", hatColor: "ai" } : {}) } as UkiyoeFigureLook,
      lead0 + 420 + j * 120, NIGHT_ROAD, jizoWalk(dx, 1100), { depth: 1, scale: 1, facing: "left" }));
    return base("kj-night", a, dur, {}, "night", {
      camera: cam(a, [[1080, 600, 1.2], [960, 600, 1.24]], [[1980, 560, 1.25], [1460, 560, 1.25], [900, 560, 1.25], [900, 560, 1.25]], dur),
      wind: { base: .2, turbulence: .3 },
      nodes: [
        sky(true),
        motif("moon", "moon", 1500, 200, { radius: 42, halo: .5 }, { depth: .25 }),
        motif("range", "range", 960, hz + 30, { width: 3600, height: 520, layers: 3, snow: .9, mistColor: "ai", trees: .4, variant: 5 }, { depth: .35 }),
        { id: "field", kind: "block", depth: .9, x: 960, y: hz + 700, shape: { type: "rect", width: 4600, height: 1400 }, fill: { type: "linear", angle: 90, stops: [[0, "gofun", .95], [1, "sora", 1]] }, grain: .5, line: 0 } as UkiyoeNode,
        motif("house", "minka", DOOR - 160, NIGHT_ROAD - 20, { width: 460, snow: 1, smoke: .3, light: .9, variant: 1 }, { depth: .95 }),
        motif("sled", "sori", lead0 + 200, NIGHT_ROAD + 4, { width: 300, bales: 3, mochi: 1, bundles: 2, rope: 60, ropeY: -95 }, { depth: 1, flip: true, keys: follow(sledActs, lead0 + 200, ARRIVE_AT) }),
        figure("jizo-0", UKIYOE_JIZO_LOOK, lead0, NIGHT_ROAD, leadActs, { depth: 1, scale: 1, facing: "left" }),
        ...followers,
        SNOW(160),
      ],
    });
  },
};

// ---- 6. Morning: the end card ---------------------------------------------------------------------------------------------------------

const morningBackdrop = (a: A): UkiyoeSceneSpec => {
  const dur = 360, hz = 520;
  return base("kj-morning", a, dur, {}, "snow", {
    camera: cam(a, [[960, 540, 1], [960, 540, 1.03]], [[740, 560, .96], [740, 560, 1]], dur),
    nodes: [
      motif("sky", "sky", -900, -1100, { width: 4200, height: 2400, top: "sora", mid: "paper", horizon: "sakura", band: .55 }, { depth: .25 }),
      motif("sun", "sun", 1450, 360, { radius: 70 }, { depth: .25 }),
      motif("range", "range", 960, hz + 30, { width: 3600, height: 520, layers: 3, snow: .9, mistColor: "gofun", trees: .4, variant: 5 }, { depth: .35 }),
      snowfield(hz),
      motif("house", "minka", DOOR - 160, NIGHT_ROAD - 20, { width: 460, snow: 1, smoke: .7, light: 0, variant: 1 }, { depth: .95 }),
      motif("sled", "sori", DOOR + 380, NIGHT_ROAD + 4, { width: 300, bales: 3, mochi: 1, bundles: 2 }, { depth: 1, flip: true }),
      figure("oldman", { ...OLD_MAN, mino: false, hat: "none" }, DOOR + 60, NIGHT_ROAD, [{ type: "startle", start: 20, end: 60 }, { type: "bow", start: 120, end: 200, angle: 35 }], { depth: 1, scale: .9, facing: "right" }),
      figure("oldwoman", OLD_WOMAN, DOOR - 30, NIGHT_ROAD, [{ type: "pray", start: 90, end: 220 }], { depth: 1, scale: .86, facing: "right" }),
    ],
  });
};
const end = ukiyoeEndCard({
  closing: "めでたし、めでたし", next: "Next: Urashima Tarō", seal: "組木", backdrop: morningBackdrop, kasumi: 30, sound: { sound: "bed-wind-mountain", gainDb: -24 },
  // New Year's morning: crows in the trees beyond the village.
  ambience: [{ sound: "bed-crows-day", gainDb: -21, lowpassHz: 5000 }],
  narration: [
    { text: "In the morning, they found rice and mochi", from: 44, to: 124 },
    { text: "and gifts for New Year.", from: 130, to: 196 },
  ],
});

export const KASA_JIZO_EPISODE: UkiyoeEpisodeSpec = { id: "ukiyoe-kasa-jizo", title: "Kasa Jizō", lang: "en", shots: [title, home, market, jizoRow, night, end] };
