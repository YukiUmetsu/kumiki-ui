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
    // The original blocky nine-feather row read as hard triangular scales.
    // Instead layer long, directionally connected scapular and covert planes,
    // then paint small irregular warm/cool accents across their actual flow.
    wash("upper-scapular", "M163 191 C191 176 216 177 245 184 C272 190 299 210 305 222 C291 239 267 251 245 254 C213 259 187 249 168 230 Z", "#9AAEB0", .79),
    wash("wing-cool-shadow", "M185 217 C211 199 253 202 278 221 Q291 234 279 245 C251 262 216 258 189 243 Z", "#607E87", .36),
    wash("shoulder-light", "M165 195 Q195 177 219 185 Q236 191 251 204 C225 200 200 210 187 226 Q174 221 165 195 Z", "#E8E6DB", .89),
    wash("covert-warm-bloom", "M185 207 C210 201 233 211 246 221 Q231 239 211 239 Q188 238 185 207 Z", "#C5C5B7", .32),
    ...Array.from({ length: 15 }, (_, i) => {
      const row = Math.floor(i / 5), column = i % 5;
      const x = 182 + column * 20 + row * 6;
      const y = 207 + row * 11 + column % 3 * 3;
      const length = 24 + (column * 7 + row * 3) % 13;
      const tipX = x + length;
      return wash("primary-feather-" + i,
        "M" + x + " " + y +
        " C" + (x + 10) + " " + (y - 5) + " " + (x + 21) + " " + (y + 1) +
        " " + tipX + " " + (y + 10) +
        " Q" + (tipX - 4) + " " + (y + 15) + " " + (tipX - 16) + " " + (y + 17) +
        " C" + (x + 16) + " " + (y + 19) + " " + (x + 6) + " " + (y + 13) +
        " " + x + " " + y + " Z",
        i % 5 === 0 ? "#BAC6C4" : i % 3 === 0 ? "#77939C" :
          i % 3 === 1 ? "#A5B8B8" : "#87A2A9", .34 + (i % 4) * .055);
    }),
    ...Array.from({ length: 13 }, (_, i) => {
      const x = 177 + i * 9;
      const y = 195 + Math.sin(i * .34) * 4;
      const bend = 12 + i % 4 * 3;
      return line("feather-barb-" + i,
        "M" + x.toFixed(1) + " " + y.toFixed(1) +
          " C" + (x + 12).toFixed(1) + " " + (y + 3).toFixed(1) +
          " " + (x + bend).toFixed(1) + " " + (y + 18).toFixed(1) +
          " " + (x + bend + 6).toFixed(1) + " " + (y + 27).toFixed(1),
        i % 4 === 0 ? "#EAECE2" : "#4D7480", .52 + i % 3 * .09, .37, "drybrush");
    }),
    ...Array.from({ length: 11 }, (_, i) => {
      const x = 193 + i * 8;
      const y = 229 + (i % 3) * 3;
      return line("lower-feather-fray-" + i,
        "M" + x + " " + y + " q" + (7 + i % 3) +
          " " + (14 + i % 3 * 2) + " " + (15 + i % 4) + " " + (24 - i % 5),
        i % 5 === 0 ? "#ECF0E7" : "#6C8E9A", .4, .3, "drybrush");
    }),
    line("wing-leading-edge", "M165 195 C198 178 246 186 285 210", "#557481", 1.08, .46, "drybrush"),
    line("wing-fold-shadow", "M184 243 Q222 259 252 253 Q278 246 293 231", "#52737E", .87, .36, "drybrush"),
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
      // Source-guided anatomy: cheek, crown stripe and separate bill mandibles
      // are connected in a narrow heron head, not a round cartoon face.
      wash("crowned-head", "M82 72 Q90 61 105 57 Q119 54 131 65 Q134 71 126 83 Q117 93 106 95 Q91 91 84 80 Z", "#EDE5D2", .92),
      wash("cheek-ivory", "M85 78 Q98 75 109 78 Q119 82 123 88 Q112 95 104 92 Q94 88 85 78 Z", "#F5EEDD", .91),
      wash("temple-shadow", "M105 60 C122 54 129 66 129 74 Q125 82 121 86 Q112 76 105 60 Z", "#82949B", .33),
      wash("black-cap", "M86 67 Q100 53 115 56 C124 57 129 62 132 65 Q126 67 119 67 C106 64 95 68 87 73 Z", "#364D5B", .91),
      wash("lateral-head-stripe", "M95 72 Q111 71 119 77 Q125 78 132 66 Q129 81 119 84 Q104 82 94 78 Z", "#556B75", .57),
      line("forehead-light", "M86 68 C97 61 110 61 119 64", "#F4F0E3", .78, .74, "drybrush"),
      line("occipital-crest", "M129 63 Q142 58 148 48 M131 65 Q141 62 153 54", "#405562", 1.1, .8, "drybrush"),
      wash("upper-mandible", "M86 74 C64 69 39 70 14 74 L8 76 Q40 76 86 79 Z", "#A99263", .95),
      wash("bill-gold-glaze", "M79 76 Q54 74 19 75 Q53 80 82 79 Z", "#E0B66B", .63),
      wash("lower-mandible", "M9 76 Q44 80 85 82 Q85 86 77 84 Q39 79 9 76 Z", "#B98F5D", .84),
      line("bill-ridge", "M12 75 C37 71 66 72 85 76", "#716F62", .8, .68, "drybrush"),
      line("bill-keel", "M12 76 Q51 78 80 81", "#6B6A5B", .53, .65),
      wash("lores-shadow", "M84 70 Q90 68 96 71 L92 78 Q85 77 84 70 Z", "#5F7374", .69),
      wash("eye-mark", "M91 68 Q99 65 102 73 Q100 78 94 79 Q90 76 91 68 Z", "#D5C7A5", .89),
      wash("iris", "M93 70 Q97 67 100 71 Q101 76 96 77 Q92 75 93 70 Z", "#E1BC55", .96),
      wash("pupil", "M96 71 Q99 70 99 73 Q99 75 97 75 Q96 73 96 71 Z", "#223B45", .96),
      line("eye-lid", "M90 71 Q96 66 102 71", "#3E5861", .94, .84),
      line("nostril", "M69 73 q2 -1 3 0", "#494F4A", .65, .67),
      line("cheek-feather", "M104 82 C112 88 117 90 122 88 M99 86 Q111 94 118 91", "#B4B9AE", .75, .55, "drybrush"),
      ...Array.from({ length: 7 }, (_, i) =>
        line("malar-feather-" + i,
          "M" + (103 + i * 2) + " " + (88 + i % 2 * 2) +
          " q" + (4 + i % 3) + " " + (4 + i % 3) + " " + (3 + i % 2) + " " +
          (8 + i % 4), i % 3 === 0 ? "#FAF7E9" : "#81959A",
          .38 + (i % 2) * .2, .35, "drybrush")),
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
  const top = y - height, tipX = x + lean;
  const leaves: WatercolourArtPart[] = [
    line(id + "-stem", "M" + x + " " + y + " C" + (x + lean * .13) + " " +
      (y - height * .21) + " " + (x + lean * .59) + " " +
      (y - height * .72) + " " + tipX + " " + top,
      pigment, 1.4, .72, "drybrush"),
    line(id + "-stem-light", "M" + (x + 1.3) + " " + (y - 4) +
      " Q" + (x + lean * .4 + 1.4) + " " + (y - height * .58) +
      " " + (tipX + .7) + " " + (top + 5), "#DBCFB5", .5, .52),
  ];
  // Each blade shares a stem attachment, but the contour/width/curvature vary.
  // Prevent equally spaced symmetric darts and disconnected seed blobs.
  for (let i = 0; i < 4; i++) {
    const f = .16 + i * .167;
    const px = x + lean * f, py = y - height * f;
    const side = i % 2 ? 1 : -1;
    const reach = 24 + (i * 11 + Math.round(x)) % 22;
    const lift = 26 + (i * 7 + Math.round(height)) % 25;
    const edgeX = px + side * reach;
    leaves.push(wash(id + "-blade-" + i,
      "M" + px.toFixed(1) + " " + py.toFixed(1) +
      " C" + (px + side * (reach * .19)).toFixed(1) + " " + (py - lift * .63).toFixed(1) +
      " " + (px + side * (reach * .61)).toFixed(1) + " " + (py - lift * .83).toFixed(1) +
      " " + edgeX.toFixed(1) + " " + (py - lift).toFixed(1) +
      " C" + (px + side * (reach * .73)).toFixed(1) + " " + (py - lift * .61).toFixed(1) +
      " " + (px + side * (reach * .24)).toFixed(1) + " " + (py - lift * .14).toFixed(1) +
      " " + px.toFixed(1) + " " + py.toFixed(1) + " Z", pigment, .37 + i % 3 * .09));
    leaves.push(line(id + "-vein-" + i,
      "M" + px.toFixed(1) + " " + py.toFixed(1) +
      " Q" + (px + side * reach * .55).toFixed(1) + " " + (py - lift * .67).toFixed(1) +
      " " + edgeX.toFixed(1) + " " + (py - lift).toFixed(1),
      "#CDCBB5", .38, .54, "drybrush"));
  }
  // A connected, tapering seed-head on the stalk, not seven floating polka dots.
  const seedLength = 14 + (Math.round(height) % 9), seedWidth = 3.8 + Math.round(x) % 3;
  leaves.push(wash(id + "-seed-head",
    "M" + tipX + " " + (top + 3) +
    " Q" + (tipX - seedWidth) + " " + (top - seedLength * .42) +
    " " + tipX + " " + (top - seedLength) +
    " Q" + (tipX + seedWidth * 1.1) + " " + (top - seedLength * .4) +
    " " + tipX + " " + (top + 3) + " Z", "#AB967A", .56));
  for (let i = 0; i < 6; i++) {
    const py = top - 2 - i * seedLength / 7;
    const dx = Math.sin(i * 2.31 + x * .06) * seedWidth * .65;
    leaves.push(line(id + "-seed-fibril-" + i,
      "M" + (tipX + dx).toFixed(1) + " " + py.toFixed(1) +
      " q" + (i % 2 ? 2.1 : -2.3) + " -2 " + (i % 2 ? 3.3 : -3.1) + " -4",
      "#B4A08C", .65, .45, "drybrush"));
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
    // Separate wet-on-wet deposits build luminous *area density* rather than
    // one almost invisible broad circular stroke stretched over hundreds of cells.
    ["dawn-cloud-p1", 90, 186, 111, "#DDBCAD", .85, .9, 7],
    ["dawn-cloud-p2", 271, 135, 139, "#F0D3B4", .89, .9, 17],
    ["dawn-cloud-p3", 397, 224, 105, "#C4B6B8", .84, .88, 27],
    ["dawn-cloud-p4", 123, 382, 123, "#C2C9C6", .85, .9, 39],
    ["dawn-cloud-p5", 413, 416, 133, "#9EBCBF", .9, .92, 54],
    ["marsh-pool-p1", 101, 569, 120, "#8BABA7", .89, .96, 69],
    ["marsh-pool-p2", 333, 636, 104, "#779AA3", .98, .95, 84],
    ["marsh-pool-p3", 461, 681, 106, "#819E9E", .88, .95, 96],
    ["marsh-earth-p1", 106, 760, 124, "#B8B09A", .76, .78, 110],
    ["marsh-earth-p2", 441, 772, 117, "#D9B98D", .77, .79, 127],
  ] : [
    ["sky-apricot", 640, 123, 225, "#E0BE9B", .72, .89, 0],
    ["sky-mist", 445, 162, 180, "#A7BCC0", .46, .93, 21],
    ["marsh-sage", 550, 341, 175, "#95AE9E", .59, .87, 42],
    ["pool-slate", 700, 431, 172, "#7999A3", .81, .96, 69],
    ["paper-ochre", 326, 447, 162, "#D6C099", .53, .83, 90],
    ["dawn-cloud-l1", 139, 99, 120, "#E6C4AC", .85, .92, 7],
    ["dawn-cloud-l2", 317, 130, 123, "#C0CBC6", .86, .91, 17],
    ["dawn-cloud-l3", 518, 96, 107, "#D7BDB4", .86, .91, 27],
    ["dawn-cloud-l4", 827, 135, 126, "#E7C3A4", .91, .91, 37],
    ["dawn-cloud-l5", 723, 251, 131, "#ACB8C4", .88, .91, 47],
    ["dawn-cloud-l6", 375, 286, 123, "#A4C0C0", .92, .94, 57],
    ["marsh-pool-l1", 196, 391, 116, "#B3B8AA", .79, .91, 69],
    ["marsh-pool-l2", 400, 447, 127, "#7DA8A4", .9, .95, 80],
    ["marsh-pool-l3", 587, 455, 114, "#6F9AAB", .99, .96, 91],
    ["marsh-pool-l4", 867, 458, 111, "#8BA3A3", .87, .93, 101],
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
