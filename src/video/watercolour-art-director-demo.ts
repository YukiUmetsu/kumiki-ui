import type { WatercolourArtKey, WatercolourArtPart, WatercolourArtwork } from "../../registry/video/watercolour-illustration";
import type { WetPaperSpec, WetPigmentDrop } from "../../registry/video/watercolour-wet-paper";

export type WetlandOutput = "landscape" | "portrait";
const line = (id: string, path: string, stroke: string, strokeWidth = 1, opacity = 1,
  technique: "line" | "drybrush" = "line"): WatercolourArtPart =>
  ({ kind: "path", id, path, technique, stroke, strokeWidth, opacity });
const wash = (id: string, path: string, fill: string, opacity = 1): WatercolourArtPart =>
  ({ kind: "path", id, path, technique: "wash", fill, opacity });
const group = (id: string, children: WatercolourArtPart[],
  keys?: WatercolourArtKey[], pivot?: { x: number; y: number }): WatercolourArtPart =>
  ({ kind: "group", id, children, keys, pivot });
const pose = (frame: number, x: number, y: number, rotation = 0,
  scale = 1, opacity = 1): WatercolourArtKey =>
  ({ frame, x, y, rotation, scale, opacity });

/** Anatomical plan, not a reference tracing:
 * Heron: narrow crowned head -> S-curved neck -> shoulder/body -> folded
 * flight feather rows; two separately rooted legs end in connected toes.
 * Joint pivots are shared between static construction and motion.
 */
export const HERON_ANCHORS = {
  shoulder: { x: 170, y: 202 }, neckRoot: { x: 153, y: 216 },
  crown: { x: 109, y: 75 }, wing: { x: 195, y: 208 },
  hip: { x: 204, y: 281 }, nearFoot: { x: 198, y: 455 },
} as const;

const bird = (): WatercolourArtPart => {
  const hindLeg = group("far-leg", [
    line("far-shank", "M218 267 Q213 309 224 333 Q231 360 219 380 L215 446", "#768085", 3.6),
    line("far-toes", "M215 446 Q205 454 193 452 M215 446 Q226 453 241 451 M215 446 L217 456", "#77766E", 2.2),
    line("far-leg-shadow", "M221 319 Q220 352 225 366", "#E2D5BF", 1.05),
  ]);
  const nearLeg = group("near-leg", [
    line("thigh", "M197 269 Q190 300 190 320 Q190 334 202 344 L198 382", "#707B80", 4.5),
    line("tarsus", "M198 382 Q202 407 199 431 L198 455", "#6F797C", 3.2),
    line("knee-highlight", "M190 320 Q189 336 201 343", "#D4CEBA", 1.15),
    line("near-toes", "M198 454 Q181 463 170 459 M198 455 Q204 459 224 458 M198 455 L199 466", "#4D6065", 2.2),
    line("toe-knuckles", "M176 459 Q181 455 187 456 M212 458 Q216 455 220 457", "#8F968A", .72),
  ]);
  const wing = group("folded-wing", [
    wash("upper-scapular", "M161 190 Q199 165 253 185 Q283 197 302 217 Q282 235 245 250 Q205 266 172 246 Q157 219 161 190 Z", "#7E9BA3", .88),
    wash("wing-cool-shadow", "M185 210 Q233 201 282 220 Q267 250 228 259 Q193 260 180 243 Z", "#567987", .53),
    wash("shoulder-light", "M164 193 Q196 178 220 183 Q237 189 247 202 Q218 204 186 224 Q170 216 164 193 Z", "#D9DAD0", .85),
    ...Array.from({ length: 9 }, (_, i) => {
      const x = 183 + i * 12;
      const tip = 251 + (i % 3) * 4 + Math.floor(i / 4) * 3;
      return wash("primary-feather-" + i,
        "M" + x + " 215 Q" + (x + 11) + " 223 " + (x + 17) + " 241 Q" +
          (x + 14) + " " + tip + " " + (x + 6) + " " + (tip + 6) +
          " Q" + (x - 3) + " " + (tip - 1) + " " + x + " 215 Z",
        i % 3 === 0 ? "#627E8B" : i % 3 === 1 ? "#93B1B5" : "#708D96", .68);
    }),
    ...Array.from({ length: 13 }, (_, i) => {
      const x = 173 + i * 9.4;
      const y = 195 + Math.sin(i * .42) * 7;
      return line("feather-barb-" + i,
        "M" + x.toFixed(1) + " " + y.toFixed(1) +
          " Q" + (x + 11).toFixed(1) + " " + (y + 19).toFixed(1) +
          " " + (x + 10).toFixed(1) + " " + (y + 38).toFixed(1),
        i % 4 === 0 ? "#EBE7DA" : "#46697A", .64, .57, "drybrush");
    }),
    line("wing-leading-edge", "M158 192 Q194 173 223 183 Q260 188 291 210", "#526E7A", 1.2, .66),
    line("wing-fold-shadow", "M180 243 Q215 266 244 252 Q266 245 286 229", "#3D6679", 1.1, .52),
  ], [pose(0, 0, 0, -1), pose(135, 0, 0, 2.5), pose(270, 0, 0, -.7),
    pose(359, 0, 0, -1)], HERON_ANCHORS.wing);
  const neck = group("neck-and-head", [
    wash("s-curved-neck", "M158 220 Q135 216 124 191 Q108 161 110 139 Q112 114 128 100 Q135 88 121 79 Q105 83 107 97 Q97 127 100 145 Q95 175 111 199 Q124 222 154 230 Z", "#C8CDCA", .97),
    wash("neck-shade", "M128 99 Q122 120 116 143 Q111 173 134 209 L154 227 Q129 219 112 199 Q92 173 102 141 Q99 119 112 91 Z", "#7D989C", .69),
    wash("throat-ochre", "M111 92 Q121 95 126 103 Q113 137 115 154 Q120 175 131 188 Q111 171 108 147 Q105 122 111 92 Z", "#C7A99A", .54),
    line("throat-feathers", "M108 109 Q103 135 108 153 Q110 169 119 177 M123 182 Q133 203 147 211", "#5C747C", 1.25, .62),
    ...Array.from({ length: 7 }, (_, i) =>
      line("neck-hackle-" + i,
        "M" + (113 + i * 2) + " " + (158 + i * 8) +
        " q-5 7 -3 11", "#F6F0DF", .95, .72, "drybrush")),
    group("head-beak", [
      wash("crowned-head", "M82 69 Q96 53 111 55 Q125 57 132 69 Q129 83 118 91 Q99 96 86 83 Z", "#E9E4D7", .95),
      wash("temple-shadow", "M102 60 Q116 56 129 69 Q130 81 118 86 Q114 72 102 60 Z", "#7E929A", .63),
      wash("black-cap", "M82 67 Q100 49 116 55 Q125 57 133 63 L130 69 Q119 63 108 65 Q91 65 82 71 Z", "#3D5461", .94),
      line("occipital-crest", "M129 62 Q141 56 147 47 M128 65 Q145 62 149 55", "#405A67", 1.35),
      wash("upper-mandible", "M87 74 Q61 68 28 72 Q19 73 11 75 Q42 81 86 81 Z", "#BDA16A", .99),
      wash("lower-mandible", "M12 75 Q44 83 83 83 Q87 81 88 79 Q47 78 12 75 Z", "#947950", .88),
      line("bill-keel", "M17 76 Q50 76 84 79", "#665C4A", .86, .79),
      wash("eye-mark", "M85 71 Q92 67 100 71 Q94 76 85 75 Z", "#EEE4CB", .9),
      wash("iris", "M91 71 Q95 69 97 73 Q96 77 93 77 Q91 76 91 71 Z", "#C8B16C", .98),
      wash("pupil", "M94 72 Q96 71 97 73 Q97 75 95 76 Q94 75 94 72 Z", "#273F4A"),
      line("eyebrow", "M85 69 Q91 66 100 69", "#384E5D", 1.4),
      line("nostril", "M66 74 q2 -1 4 0", "#524E47", .8),
      line("cheek-feather", "M111 82 Q100 87 95 92 M121 86 Q113 94 107 96", "#A1B2AD", .9, .62),
    ], [pose(0, 0, 0, -.3), pose(170, 0, 0, 2), pose(280, 0, 0, -1),
      pose(359, 0, 0, -.3)], HERON_ANCHORS.crown),
  ], [pose(0, 0, 0, -1), pose(120, 0, 0, 3), pose(255, 0, 0, -2),
    pose(359, 0, 0, -1)], HERON_ANCHORS.neckRoot);
  return group("great-blue-heron", [
    wash("heron-body", "M148 200 Q178 177 227 182 Q273 183 307 218 Q327 246 291 270 Q250 292 208 287 Q177 276 153 242 Q140 224 148 200 Z", "#859CA2", .96),
    wash("underbody", "M160 237 Q204 268 249 268 Q285 263 307 239 Q297 285 230 289 Q179 286 160 237 Z", "#596F79", .52),
    wash("tail", "M278 234 Q304 245 345 259 Q321 266 295 260 Q316 271 328 283 Q296 270 268 269 Z", "#566F79", .81),
    hindLeg, nearLeg, neck, wing,
    ...Array.from({ length: 15 }, (_, i) => {
      const x = 164 + i * 8;
      return line("back-plumage-" + i,
        "M" + x + " " + (196 - Math.sin(i * .28) * 10).toFixed(1) +
        " Q" + (x + 9) + " " + (188 + i % 3 * 5) +
        " " + (x + 16) + " " + (214 + i % 4 * 7),
        i % 4 === 0 ? "#F0EDE0" : "#4A7280", .65, .43, "drybrush");
    }),
  ], [pose(0, 0, 0), pose(140, 0, -2), pose(245, 0, 0),
    pose(359, 0, 0)]);
};

function reed(id: string, x: number, y: number, height: number, lean: number,
  pigment: string): WatercolourArtPart {
  const top = y - height;
  const leaves: WatercolourArtPart[] = [
    line(id + "-stem", "M" + x + " " + y + " Q" + (x + lean * .26) + " " +
      (y - height * .52) + " " + (x + lean) + " " + top, pigment, 1.65, .81, "drybrush"),
  ];
  for (let i = 0; i < 5; i++) {
    const py = y - height * (.19 + i * .135);
    const px = x + lean * (.19 + i * .135);
    const side = i % 2 ? 1 : -1;
    leaves.push(wash(id + "-blade-" + i,
      "M" + px.toFixed(1) + " " + py.toFixed(1) +
      " Q" + (px + side * (16 + i * 2)).toFixed(1) + " " + (py - 19).toFixed(1) +
      " " + (px + side * (25 + i * 3)).toFixed(1) + " " + (py - 32).toFixed(1) +
      " Q" + (px + side * 6).toFixed(1) + " " + (py - 23).toFixed(1) +
      " " + px.toFixed(1) + " " + py.toFixed(1) + " Z", pigment, .68));
  }
  for (let i = 0; i < 7; i++) {
    const py = top - i * 2.5;
    const px = x + lean + Math.sin(i * .7) * 5;
    leaves.push(wash(id + "-seed-" + i,
      "M" + px.toFixed(1) + " " + py.toFixed(1) +
      " q-5 -6 -2 -9 q7 -2 6 5 q-1 4 -4 4 Z", "#AD9275", .59));
  }
  return group(id, leaves, [pose(0, 0, 0, -1), pose(130, 0, 0, 1.7),
    pose(260, 0, 0, -1.3), pose(359, 0, 0, -1)], { x, y });
}

export function watercolorWetlandSpec(output: WetlandOutput, seed = 83): WatercolourArtwork {
  const portrait = output === "portrait";
  const width = portrait ? 540 : 960, height = portrait ? 960 : 540;
  const paper = { color: "#F7F2E8", tooth: .81 };
  const backdropDrops: WetPigmentDrop[] = (portrait ? [
    ["sky-apricot", 330, 280, 230, "#D8BC99", .71, .83, 0],
    ["sky-mist", 192, 360, 175, "#B5C5C5", .48, .91, 26],
    ["marsh-sage", 395, 532, 184, "#9EAF9B", .66, .92, 49],
    ["pool-slate", 215, 646, 185, "#7695A0", .71, .92, 74],
    ["paper-ochre", 357, 724, 165, "#D5BB8D", .45, .72, 96],
  ] : [
    ["sky-apricot", 640, 123, 225, "#E0BE9B", .72, .89, 0],
    ["sky-mist", 445, 162, 180, "#A7BCC0", .46, .93, 21],
    ["marsh-sage", 550, 341, 175, "#95AE9E", .59, .87, 42],
    ["pool-slate", 700, 431, 172, "#7999A3", .81, .96, 69],
    ["paper-ochre", 326, 447, 162, "#D6C099", .53, .83, 90],
  ]).map((item) => {
    const [id, x, y, radius, pigment, load, water, startFrame] = item as
      [string, number, number, number, string, number, number, number];
    return { id, x, y, radius, pigment, load, water, startFrame };
  });
  const wetPaper: WetPaperSpec = { version: 1, width, height, seed, paper,
    flow: .68, granulation: .8, dryFrames: 200, cellSize: 24, edgePooling: .24,
    drops: backdropDrops };
  const foreground: WatercolourArtPart[] = [
    wash("distant-bank", "M0 352 Q99 340 180 352 Q280 335 387 360 Q485 342 600 356 Q740 343 960 354 L960 414 Q758 395 640 417 Q478 399 300 414 Q134 408 0 419 Z", "#99A895", .34),
    line("horizon-break", "M21 355 Q149 348 261 359 M439 357 Q603 351 795 356 M821 352 Q900 350 946 354", "#687F83", 1.05, .37),
    ...Array.from({ length: 13 }, (_, i) => {
      const x = 140 + i * 59;
      const y = 424 + (i % 4) * 8;
      return line("current-" + i,
        "M" + x + " " + y + " q" + (16 + i % 3 * 8) + " -4 " +
        (34 + i % 3 * 12) + " 0", i % 3 === 0 ? "#6F959B" : "#C3B99D",
        i % 4 === 0 ? 1.4 : .75, .37, "drybrush");
    }),
    ...Array.from({ length: 6 }, (_, i) =>
      reed("left-reed-" + i, 90 + i * 27, 492 + (i % 3) * 5,
        135 + (i % 4) * 21, (i % 2 ? -1 : 1) * (18 + i * 3),
        i % 2 ? "#6E887D" : "#9D9873")),
    ...Array.from({ length: 7 }, (_, i) =>
      reed("right-reed-" + i, 797 + i * 20, 487 + (i % 3) * 4,
        139 + (i % 4) * 27, -18 - i * 2,
        i % 3 ? "#789080" : "#A39C78")),
    group("heron-placement", [bird()], [pose(0, 426, 19), pose(359, 426, 19)]),
    ...Array.from({ length: 8 }, (_, i) => line("foot-ripple-" + i,
      "M" + (602 + i * 11) + " " + (474 + i % 2 * 3) +
      " q" + (7 + i % 3 * 3) + " -3 " + (17 + i % 3 * 4) + " 0",
      i % 2 ? "#72949A" : "#A7B6AD", .8, .56)),
  ];
  return {
    version: 1, width, height, seed, paper,
    wetPaper,
    parts: [group("art-direction-viewport", foreground,
      [pose(0, portrait ? -277 : 0, portrait ? 237 : 0, 0, portrait ? .94 : 1)])],
  };
}
