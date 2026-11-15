/**
 * "Urashima Tarō": a UKIYO1 YouTube episode made with the episode template, after the public-domain folktale (story 5
 * of the folktale database). A young fisherman saves a turtle from children; it carries him down to the Dragon Palace,
 * where Princess Otohime welcomes him with feasts and dancing fish. Longing for home, he is given a jewelled box he must
 * never open. On the shore, three hundred years have passed; he opens the box, and white smoke makes him an old man.
 *
 * Eight shots, 106 seconds, 16:9 and 9:16. Narration is the film's caption track.
 */
import type { UkiyoeAction, UkiyoeFigureLook } from "../../registry/video/ukiyoe/ukiyoe-figure";
import type { UkiyoeEpisodeAspect, UkiyoeEpisodeShot, UkiyoeEpisodeSpec } from "../../registry/video/ukiyoe/ukiyoe-episode";
import { ukiyoeEndCard, ukiyoeTitleCard } from "../../registry/video/ukiyoe/ukiyoe-episode";
import type { UkiyoeNode, UkiyoeSceneSpec } from "../../registry/video/ukiyoe/ukiyoe-scene";
import { agedLook, TAMATEBAKO_THICKEST, UKIYOE_OTOHIME_LOOK, UKIYOE_RYUJIN_LOOK, UKIYOE_URASHIMA_LOOK } from "../../registry/video/ukiyoe/ukiyoe-ryugu";
import { base, CAST } from "./ukiyoe-night-ferry";
import { cam, creature, figure, motif } from "./ukiyoe-episode-kit";

type A = UkiyoeEpisodeAspect;
const TARO = UKIYOE_URASHIMA_LOOK, OLD_TARO: UkiyoeFigureLook = agedLook(UKIYOE_URASHIMA_LOOK);
const OLD_WOMAN: UkiyoeFigureLook = { ...CAST.grandmother, hair: "elder", hairColor: "gofun" };
const HZ = 520, BEACH = 800;

/** The shore: sky, the sea out to an island, the sand. `night`/`dusk` change the light; `later` builds the changed village. */
function shore(o: { dusk?: boolean; later?: boolean; boat?: boolean } = {}): UkiyoeNode[] {
  const nodes: UkiyoeNode[] = [
    motif("sky", "sky", -900, -1100, o.dusk ? { width: 4200, height: 1700, top: "ai", mid: "beni", horizon: "ki", band: .62 } : { width: 4200, height: 1700, top: "bero", mid: "sora", horizon: "paper", band: .5 }, { depth: .25 }),
    motif("island", "hills", 1450, HZ + 4, { width: 700, height: 110, color: "asagi", dark: "ai", trees: .6, treeKind: "pine", variant: 3 }, { depth: .35 }),
    motif("sea", "sea", -900, HZ, { width: 4200, height: 600, rows: 14, color: o.dusk ? "ai" : "bero", light: o.dusk ? "beni" : "sora", foam: .25, swell: .5 }, { depth: .7 }),
    { id: "sand", kind: "block", depth: 1, x: 960, y: BEACH + 600, shape: { type: "polygon", points: [[-2400, -660], [-200, -640], [600, -600], [2400, -640], [2400, 700], [-2400, 700]] }, fill: { type: "linear", angle: 90, stops: [[0, "ki", 1], [.15, "kincha", 1], [1, "cha", 1]] }, grain: .8, line: 0 } as UkiyoeNode,
    motif("surf", "sea", -900, BEACH - 72, { width: 4200, height: 40, rows: 2, color: "sora", light: "gofun", foam: .8, swell: .3 }, { depth: 1, opacity: .85 }),
  ];
  if (o.later) {
    // Three hundred years on: tiled shops where the thatched huts stood, a stone lantern, strangers.
    nodes.push(motif("shop-a", "shop", 260, BEACH - 20, { width: 380, height: 280, noren: "ai" }, { depth: .95 }), motif("shop-b", "shop", 700, BEACH - 20, { width: 340, height: 260, noren: "kusa" }, { depth: .95 }));
    nodes.push(motif("toro", "toro", 1060, BEACH + 10, { height: 150 }, { depth: 1 }));
  } else {
    nodes.push(motif("hut-a", "minka", 300, BEACH - 20, { width: 360, smoke: .6, variant: 1 }, { depth: .95 }), motif("hut-b", "minka", 680, BEACH - 30, { width: 280, variant: 2 }, { depth: .95 }));
    if (o.boat !== false) nodes.push(motif("boat-a", "boat", 1180, BEACH + 40, { length: 300, kind: "sampan" }, { depth: 1 }));
  }
  nodes.push(motif("pine", "pine", 1780, BEACH + 30, { height: 520, lean: -10 }, { depth: 1.05 }));
  return nodes;
}

// ---- 1. Title: the fishing village -------------------------------------------------------------------------------------------------

const villageBackdrop = (a: A): UkiyoeSceneSpec => {
  const dur = 240;
  return base("ur-title", a, dur, {}, "edo", {
    camera: cam(a, [[960, 620, 1], [960, 610, 1.05]], [[900, 720, 1.25], [900, 700, 1.3]], dur),
    wind: { base: .35, turbulence: .3 },
    nodes: [
      ...shore(),
      figure("taro", { ...TARO, prop: "fishing-rod" }, 1500, BEACH + 70, [{ type: "walk", start: 20, end: dur, to: -520 }], { depth: 1, scale: .9, facing: "left" }),
      { id: "gulls", kind: "particles", type: "birds", depth: .5, area: [1200, 160, 0, 0], count: 6, angle: 200, speed: 1.6, size: 1 } as UkiyoeNode,
    ],
  });
};
const title = ukiyoeTitleCard({
  title: "Urashima Tarō", titleJa: "浦島太郎", seal: "組木", backdrop: villageBackdrop, sound: { sound: "bed-surf-beach", gainDb: -16 },
  narration: [{ text: "Long ago, in a fishing village by the sea,", from: 44, to: 136 }, { text: "there lived a kind young fisherman, Urashima Tarō.", from: 142, to: 236 }],
});

// ---- 2. The children and the turtle ---------------------------------------------------------------------------------------------------

const poke = (offset: number): UkiyoeAction[] => [0, 1, 2, 3].map(i => ({ type: "point", start: offset + i * 52, end: offset + i * 52 + 22 } as UkiyoeAction));
const turtleShore: UkiyoeEpisodeShot = {
  id: "turtle", title: "The turtle on the beach", kasumi: 30, sound: { sound: "bed-surf-beach", gainDb: -14 },
  narration: [
    { text: "One day he found children poking a turtle on the sand.", from: 36, to: 156 },
    { text: "'Stop that,' he said, and sent them home.", from: 166, to: 286 },
    { text: "Then he let the turtle go back into the sea.", from: 296, to: 412 },
  ],
  build: a => {
    const dur = 420, gy = BEACH + 110, flee = 250;
    return base("ur-turtle", a, dur, {}, "edo", {
      camera: cam(a, [[960, 760, 1.3], [990, 760, 1.34]], [[1110, 760, 1.5], [1180, 760, 1.55]], dur),
      wind: { base: .35, turbulence: .3 },
      nodes: [
        ...shore({ boat: false }),
        creature("turtle", "turtle", 960, gy, [{ type: "stand", start: 0, end: 320 }, { type: "walk", start: 320, end: dur, to: 240, toY: -170 }], { depth: 1, scale: 1, facing: "right", look: { size: 90 }, exit: { preset: "fade", frame: 395, duration: 20 } }),
        figure("child-a", { ...CAST.child, prop: "staff" }, 760, gy, [...poke(10), { type: "run", start: flee, end: flee + 90, to: -1100 }], { depth: 1, scale: .8, facing: "right" }),
        figure("child-b", { ...CAST.boy, prop: "staff" }, 1160, gy, [...poke(30), { type: "run", start: flee + 6, end: flee + 100, to: -1500 }], { depth: 1, scale: .8, facing: "left" }),
        figure("child-c", { ...CAST.boy, robe: "kusa" }, 1280, gy - 10, [{ type: "cheer", start: 20, end: 140 }, { type: "run", start: flee + 12, end: flee + 100, to: -1700 }], { depth: 1, scale: .78, facing: "left" }),
        figure("taro", TARO, 2100, gy, [{ type: "walk", start: 50, end: 170, to: -620 }, { type: "talk", start: 176, end: 240 }, { type: "point", start: 214, end: 244 }, { type: "kneel", start: 300, end: 340 }, { type: "wave", start: 350, end: dur }], { depth: 1, scale: .95, facing: "left" }),
      ],
    });
  },
};

// ---- 3. The turtle's invitation and the dive --------------------------------------------------------------------------------------

const dive: UkiyoeEpisodeShot = {
  id: "dive", title: "Down to the Dragon Palace", kasumi: 30, sound: { sound: "bed-underwater", gainDb: -18 },
  narration: [
    { text: "Days later, the turtle rose beside his boat.", from: 34, to: 140 },
    { text: "'Come with me,' it said, 'to the Dragon Palace.'", from: 150, to: 282 },
    { text: "Down they went, through the light and the bubbles.", from: 296, to: 440 },
  ],
  build: a => {
    const dur = 450, sea = 1000, mount = 130;
    const nodes: UkiyoeNode[] = [
      motif("sky", "sky", -900, -400, { width: 4200, height: 1420, top: "bero", mid: "sora", horizon: "paper", band: .5 }, { depth: .5 }),
      { id: "deep", kind: "block", x: 960, y: 1750, shape: { type: "rect", width: 4200, height: 1500 }, fill: { type: "linear", angle: 90, stops: [[0, "asagi", 1], [.4, "ai", 1], [1, "bero", 1]] }, line: 0 } as UkiyoeNode,
      motif("rays", "lightrays", 960, sea, { width: 2200, height: 1200, count: 10, color: "sora" }),
      motif("palace", "ryugu", 1250, 2250, { width: 1100, height: 760 }),
      motif("seabed", "seabed", 960, 2340, { width: 4200, height: 260 }),
      creature("fish-a", "carp", 300, 1450, [{ type: "float", start: 0, end: dur, to: 300 }], { look: { size: 140, color: "shu" }, facing: "right" }),
      creature("fish-b", "carp", 1500, 1650, [{ type: "float", start: 0, end: dur, to: -320 }], { look: { size: 120, color: "ki" }, facing: "left" }),
      { id: "bubbles", kind: "particles", type: "bubbles", count: 70, area: [100, 1050, 1700, 1300] } as UkiyoeNode,
      // On the surface: the boat with Tarō fishing, the turtle surfacing beside it.
      motif("boat", "boat", 760, sea + 6, { length: 320, kind: "sampan" }, { loops: [{ kind: "rock", amplitude: .8, period: 70 }], exit: { preset: "fade", frame: 200, duration: 30 } }),
      figure("taro-boat", { ...TARO, prop: "fishing-rod" }, 720, sea - 12, [{ type: "kneel", start: 0, end: 140 }, { type: "look", start: 40, end: 120, angle: 10 }], { scale: .8, facing: "right", to: mount }),
      { id: "ride", kind: "group", x: 960, y: sea + 30, keys: [{ frame: 0, x: 960, y: sea + 70 }, { frame: 40, x: 960, y: sea + 24 }, { frame: mount + 20, x: 900, y: sea + 30 }, { frame: 400, x: 1060, y: 2120, ease: "inOut" }, { frame: dur, x: 1080, y: 2150 }] } as UkiyoeNode,
      creature("turtle", "turtle", 0, 0, [{ type: "float", start: 0, end: dur, to: 0 }], { parent: "ride", scale: 1.25, facing: "right", look: { size: 140 } }),
      figure("taro-ride", TARO, -10, -50, [{ type: "kneel", start: 0, end: dur }], { parent: "ride", scale: .8, facing: "right", from: mount }),
      motif("surface", "sea", -900, sea, { width: 4200, height: 160, rows: 5 }, { opacity: .85 }),
    ];
    return base("ur-dive", a, dur, {}, "edo", {
      camera: { keys: [
        { frame: 0, x: 900, y: 860, zoom: a === "portrait" ? 1.35 : 1.15 }, { frame: 150, x: 900, y: 880, zoom: a === "portrait" ? 1.35 : 1.15, ease: "inOut" },
        { frame: 420, x: 1060, y: 1880, zoom: a === "portrait" ? 1.25 : 1, ease: "inOut" }, { frame: dur - 1, x: 1070, y: 1900, zoom: a === "portrait" ? 1.25 : 1 },
      ] },
      nodes,
    });
  },
};

// ---- 4. The palace and the feast -------------------------------------------------------------------------------------------------

/** The Dragon Palace stage under the sea: deep water, the vermilion halls, the sea floor, light from above. */
function palaceStage(): UkiyoeNode[] {
  return [
    { id: "deep", kind: "block", x: 960, y: 540, shape: { type: "rect", width: 4200, height: 3000 }, fill: { type: "linear", angle: 90, stops: [[0, "asagi", 1], [.5, "ai", 1], [1, "bero", 1]] }, line: 0 } as UkiyoeNode,
    motif("rays", "lightrays", 960, -100, { width: 2400, height: 1100, count: 9, color: "sora" }),
    motif("palace", "ryugu", 980, 860, { width: 1700, height: 820 }, { depth: .8 }),
    motif("seabed", "seabed", 960, 1000, { width: 4200, height: 220 }),
    { id: "bubbles", kind: "particles", type: "bubbles", count: 50, area: [0, 0, 1920, 1080] } as UkiyoeNode,
  ];
}
const FLOOR = 930;
const palace: UkiyoeEpisodeShot = {
  id: "palace", title: "Princess Otohime", kasumi: 30, sound: { sound: "bed-underwater", gainDb: -20 },
  narration: [
    { text: "Princess Otohime welcomed him to the palace.", from: 34, to: 150 },
    { text: "There were feasts, music and dancing fish.", from: 164, to: 304 },
    { text: "The days passed by like a dream.", from: 320, to: 470 },
  ],
  build: a => {
    const dur = 480;
    return base("ur-palace", a, dur, {}, "edo", {
      camera: cam(a, [[1000, 700, 1.3], [1020, 700, 1.36]], [[880, 720, 1.45], [920, 720, 1.5]], dur),
      nodes: [
        ...palaceStage(),
        figure("ryujin", UKIYOE_RYUJIN_LOOK, 1460, FLOOR, [{ type: "kneel", start: 0, end: dur }], { scale: 1, facing: "left" }),
        figure("otohime", UKIYOE_OTOHIME_LOOK, 1060, FLOOR, [{ type: "bow", start: 20, end: 90, angle: 20 }, { type: "kyomai", start: 170, end: dur }], { scale: 1.05, facing: "left" }),
        figure("taro", TARO, 640, FLOOR, [{ type: "kneel", start: 0, end: dur }, { type: "bow", start: 30, end: 100, angle: 35 }, { type: "look", start: 180, end: 320, angle: -6 }], { scale: 1, facing: "right" }),
        creature("tai-a", "carp", 380, 520, [{ type: "dance", start: 0, end: dur }], { look: { size: 120, color: "shu" }, facing: "right" }),
        creature("tai-b", "carp", 1560, 470, [{ type: "dance", start: 0, end: dur }], { look: { size: 130, color: "beni" }, facing: "left" }),
        creature("flat", "carp", 820, 380, [{ type: "float", start: 0, end: dur, to: 260 }], { look: { size: 100, color: "ki" }, facing: "right" }),
        creature("octopus", "octopus", 1800, 900, [{ type: "dance", start: 120, end: dur }], { look: { size: 150 } }),
      ],
    });
  },
};

// ---- 5. The gift of the box --------------------------------------------------------------------------------------------------------

const gift: UkiyoeEpisodeShot = {
  id: "gift", title: "The jewelled box", kasumi: 30, sound: { sound: "bed-underwater", gainDb: -20 },
  narration: [
    { text: "But Tarō missed his home and his mother.", from: 34, to: 150 },
    { text: "The princess gave him a jewelled box.", from: 164, to: 284 },
    { text: "'Never open it,' she said.", from: 298, to: 384 },
  ],
  build: a => {
    const dur = 390, hand = 210;
    const otoActs: UkiyoeAction[] = [{ type: "pray", start: 120, end: hand }, { type: "bow", start: hand + 20, end: hand + 70, angle: 15 }, { type: "point", start: 300, end: 360 }];
    const taroActs: UkiyoeAction[] = [{ type: "kneel", start: 0, end: 110 }, { type: "bow", start: 150, end: 200, angle: 30 }, { type: "pray", start: hand, end: dur }];
    return base("ur-gift", a, dur, {}, "edo", {
      camera: cam(a, [[900, 800, 1.35], [900, 800, 1.42]], [[880, 840, 1.7], [880, 840, 1.78]], dur),
      nodes: [
        ...palaceStage(),
        // The box passes from her hands to his: each figure is drawn with and without it, handing over at `hand`.
        figure("otohime", { ...UKIYOE_OTOHIME_LOOK, prop: "tamatebako" }, 1040, FLOOR, otoActs, { scale: 1.05, facing: "left", to: hand }),
        figure("otohime-2", { ...UKIYOE_OTOHIME_LOOK, prop: "hiogi" }, 1040, FLOOR, otoActs, { scale: 1.05, facing: "left", from: hand }),
        figure("taro", TARO, 760, FLOOR, taroActs, { scale: 1, facing: "right", to: hand }),
        figure("taro-2", { ...TARO, prop: "tamatebako" }, 760, FLOOR, taroActs, { scale: 1, facing: "right", from: hand }),
        creature("turtle", "turtle", 380, FLOOR + 20, [{ type: "float", start: 0, end: dur, to: 0 }], { scale: 1.3, facing: "right", look: { size: 120 } }),
      ],
    });
  },
};

// ---- 6. The changed shore ----------------------------------------------------------------------------------------------------------

const returnShore: UkiyoeEpisodeShot = {
  id: "return", title: "Three hundred years", kasumi: 30, sound: { sound: "bed-surf-beach", gainDb: -14 },
  narration: [
    { text: "Back on the shore, nothing was as he had left it.", from: 34, to: 164 },
    { text: "No one knew him. His house was gone.", from: 176, to: 300 },
    { text: "Three hundred years had passed.", from: 314, to: 414 },
  ],
  build: a => {
    const dur = 420, gy = BEACH + 110;
    return base("ur-return", a, dur, {}, "edo", {
      camera: cam(a, [[1080, 760, 1.25], [960, 760, 1.3]], [[1250, 780, 1.55], [960, 780, 1.6]], dur),
      wind: { base: .35, turbulence: .3 },
      nodes: [
        ...shore({ later: true }),
        figure("taro", { ...TARO, prop: "tamatebako" }, 1600, gy, [{ type: "pray", start: 0, end: dur }, { type: "walk", start: 10, end: 150, to: -420 }, { type: "look", start: 160, end: 230, angle: 15, back: true }, { type: "startle", start: 250, end: 290 }, { type: "walk", start: 300, end: dur, to: -560 }], { depth: 1, scale: .95, facing: "left" }),
        figure("stranger-a", CAST.merchant, 300, gy - 10, [{ type: "walk", start: 0, end: 300, to: 700 }], { depth: 1, scale: .9, facing: "right" }),
        figure("old-woman", OLD_WOMAN, 980, gy, [{ type: "look", start: 120, end: 200, angle: 10 }, { type: "talk", start: 200, end: 280 }], { depth: 1, scale: .9, facing: "right" }),
        figure("stranger-b", { ...CAST.mother, prop: "umbrella" }, 2050, gy + 10, [{ type: "walk", start: 60, end: dur, to: -900 }], { depth: 1, scale: .9, facing: "left" }),
      ],
    });
  },
};

// ---- 7. The box is opened ----------------------------------------------------------------------------------------------------------

const OPEN_AT = 120, OPEN_FOR = 220, SWAP = OPEN_AT + Math.round(OPEN_FOR * TAMATEBAKO_THICKEST);
const opening: UkiyoeEpisodeShot = {
  id: "box", title: "The box is opened", kasumi: 30, sound: { sound: "bed-surf-beach", gainDb: -18, lowpassHz: 1600 },
  narration: [
    { text: "In his sorrow, Tarō untied the cord.", from: 30, to: 140 },
    { text: "White smoke poured out of the box,", from: 152, to: 280 },
    { text: "and he was an old, old man.", from: 296, to: 414 },
  ],
  build: a => {
    const dur = 420, gy = BEACH + 120, x = 900;
    return base("ur-box", a, dur, {}, "twilight", {
      camera: cam(a, [[940, 800, 1.45], [940, 780, 1.5]], [[930, 860, 1.75], [930, 840, 1.8]], dur),
      wind: { base: .3, turbulence: .3 },
      nodes: [
        ...shore({ dusk: true, later: true }),
        figure("taro", TARO, x, gy, [{ type: "kneel", start: 0, end: dur }, { type: "look", start: 0, end: 80, angle: -10 }, { type: "pray", start: 90, end: OPEN_AT + 20 }], { depth: 1, scale: 1, facing: "right", to: SWAP }),
        figure("taro-old", OLD_TARO, x, gy, [{ type: "kneel", start: 0, end: dur }, { type: "bow", start: SWAP, end: dur, angle: 22 }, { type: "startle", start: SWAP + 70, end: SWAP + 110 }], { depth: 1, scale: 1, facing: "right", from: SWAP }),
        motif("box", "tamatebako", x + 80, gy + 6, { size: 52, opens: 1, smoke: 360, toward: -70 }, { depth: 1, keys: [{ frame: 0, progress: 0 }, { frame: OPEN_AT, progress: 0 }, { frame: OPEN_AT + OPEN_FOR, progress: 1, ease: "linear" }] }),
      ],
    });
  },
};

// ---- 8. End card -----------------------------------------------------------------------------------------------------------------

const duskBackdrop = (a: A): UkiyoeSceneSpec => {
  const dur = 360;
  return base("ur-end", a, dur, {}, "twilight", {
    camera: cam(a, [[960, 680, 1.05], [960, 680, 1.08]], [[1000, 760, 1.3], [1000, 760, 1.34]], dur),
    nodes: [
      ...shore({ dusk: true, later: true }),
      motif("sun", "sun", 1500, HZ - 20, { radius: 60 }, { depth: .3 }),
      figure("taro-old", OLD_TARO, 1180, BEACH + 110, [{ type: "kneel", start: 0, end: dur }, { type: "bow", start: 0, end: dur, angle: 18 }], { depth: 1, scale: .95, facing: "right" }),
      { id: "gulls", kind: "particles", type: "birds", depth: .5, area: [1300, 200, 0, 0], count: 5, angle: 190, speed: 1.2, size: 1 } as UkiyoeNode,
    ],
  });
};
const end = ukiyoeEndCard({
  closing: "おしまい", next: "Next: Momotarō", seal: "組木", backdrop: duskBackdrop, kasumi: 30, sound: { sound: "bed-surf-beach", gainDb: -20 },
  narration: [{ text: "He sat by the sea he loved, watching the waves.", from: 44, to: 190 }],
});

export const URASHIMA_EPISODE: UkiyoeEpisodeSpec = { id: "ukiyoe-urashima-taro", title: "Urashima Tarō", lang: "en", shots: [title, turtleShore, dive, palace, gift, returnShore, opening, end] };
