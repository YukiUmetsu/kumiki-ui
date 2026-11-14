import { createPencilRegion } from "../../registry/video/colored-pencil";
import type { PencilAspect, PencilRegion, PencilTrace } from "../../registry/video/colored-pencil";
import type { PencilActorPart, PencilActorSpec, PencilPoseKey } from "../../registry/video/colored-pencil-actor";
import type { PencilSceneSpec } from "../../registry/video/colored-pencil-scene";

/**
 * Original copper-and-blue songbird illustration. The design is not traced from any user
 * reference; it applies observed craftsmanship principles: distinguishable feather groups,
 * pigment following surface curvature, proper opaque occlusion, toe-to-branch contact,
 * dark eyes with separate catchlights and independently articulated head / wing / tail.
 *
 * All authoring coordinates are local to one 420x360 pencil sheet; FD1 owns film time.
 */
const key = (frame: number, x = 0, y = 0, rotate = 0, sx = 1, sy = 1): PencilPoseKey =>
  ({ frame, translate: [x, y], rotation: rotate, scale: [sx, sy] });
const still = [key(0), key(419)];
const blue: readonly [string, string, string] = ["#8EABB6", "#3C7189", "#B3CFD0"];
const cobalt: readonly [string, string, string] = ["#557F9F", "#284E78", "#7FACC1"];
const night: readonly [string, string, string] = ["#34465B", "#192D42", "#53687B"];
const copper: readonly [string, string, string] = ["#DCA37F", "#C86A65", "#F1BD8D"];
const amber: readonly [string, string, string] = ["#E9BA80", "#C8795F", "#F6D3A3"];
const cream: readonly [string, string, string] = ["#F5DDA7", "#DCA884", "#FFF0C7"];
const bark: readonly [string, string, string] = ["#9D806C", "#614A48", "#C2A18B"];
const leaf: readonly [string, string, string] = ["#B0B784", "#6C9275", "#D2C798"];

function detail(path: string, color = "#504A55", width = 1, startFrame = 168,
  opacity = .79): PencilTrace {
  return { path, color, width, startFrame, durationFrames: 52, opacity };
}

/**
 * ArtCraft feather-tract grammar: every short barb originates on an authored curved
 * rachis. That is a connected feather, not an uncorrelated noise/hatch sticker.
 * Axis coordinates are hand-staged inside their parent silhouette; the actor's
 * existing parent hierarchy carries all grooves and barbs through wing motion.
 */
type FeatherAxis = readonly [number, number, number, number, number];
function featherVanes(axes: readonly FeatherAxis[], color: string,
  startFrame = 190): PencilTrace[] {
  const fmt = (n: number) => n.toFixed(2);
  return axes.map(([x0, y0, x1, y1, bend], index) => {
    const dx = x1 - x0, dy = y1 - y0;
    const length = Math.hypot(dx, dy);
    if (length < 1) throw new RangeError("Feather rachis needs a nonzero length.");
    const nx = -dy / length, ny = dx / length;
    const point = (t: number): readonly [number, number] => {
      const offset = 4 * t * (1 - t) * bend;
      return [x0 + dx * t + nx * offset, y0 + dy * t + ny * offset];
    };
    const mid = point(.5);
    const marks = ["M" + fmt(x0) + " " + fmt(y0) + " Q" +
      fmt(mid[0] * 2 - (x0 + x1) / 2) + " " +
      fmt(mid[1] * 2 - (y0 + y1) / 2) + " " + fmt(x1) + " " + fmt(y1)];
    for (let barb = 0; barb < 5; barb++) {
      const t = .24 + barb * .135;
      const root = point(t), forward = point(t + .055);
      const width = (1 - t) * (2.9 + ((index + barb) % 3) * .38);
      for (const side of [-1, 1]) {
        const tipX = forward[0] + side * nx * width;
        const tipY = forward[1] + side * ny * width;
        const middleX = root[0] * .42 + tipX * .58 + side * nx * .35;
        const middleY = root[1] * .42 + tipY * .58 + side * ny * .35;
        marks.push("M" + fmt(root[0]) + " " + fmt(root[1]) + " Q" +
          fmt(middleX) + " " + fmt(middleY) + " " +
          fmt(tipX) + " " + fmt(tipY));
      }
    }
    return detail(marks.join(" "), color, .63, startFrame + index * 5, .77);
  });
}

interface RegionOptions {
  color: readonly [string, string, string];
  start?: number;
  direction?: number;
  flow?: number;
  tone?: "core" | "rim" | "even";
  texture?: "hatch" | "fiber" | "stipple";
  base?: number;
  details?: readonly PencilTrace[];
  material?: "soft" | "layered" | "dense";
  contour?: string;
}
function coloredRegion(id: string, shape: string,
  bounds: readonly [number, number, number, number], seed: number,
  opts: RegionOptions): PencilRegion {
  const region = createPencilRegion({
    id, path: shape, bounds, palette: opts.color, seed,
    startFrame: opts.start ?? 32, durationFrames: 178,
    direction: opts.direction ?? -25, flow: opts.flow ?? 17,
    tone: opts.tone ?? "core", texture: opts.texture ?? "fiber",
    material: opts.material ?? "dense", underpaintOpacity: opts.base ?? .63,
    contourColor: opts.contour ?? "#4D4C54", opaqueSupport: true,
    details: opts.details,
  });
  return { ...region, contour: {...region.contour, width: 1.15, opacity: .68},
    layers: region.layers.map((pigment, index) => ({
    ...pigment,
    // A light long-hatch groundwork is followed by directional fibre or granular marks.
    // Distinct layers create overlapping optical colours instead of a single solid fill.
    texture: index === 0 ? "hatch" as const : (opts.texture ?? "fiber"),
  })) };
}
function anatomy(id: string, shape: string,
  bounds: readonly [number, number, number, number], seed: number, opts: RegionOptions,
  parent?: string, pivot: readonly [number, number] = [0, 0],
  poses: readonly PencilPoseKey[] = still): PencilActorPart {
  return { id, parent, pivot, keys: poses, region: coloredRegion(id, shape, bounds, seed, opts) };
}

export const COPPERBIRD_PART_ORDER = [
  "tail-far", "tail-near", "wing-far", "torso", "flank", "breast", "throat",
  "wing-main", "wing-primaries", "wing-coverts", "head", "mask", "cheek", "eye-ring", "eye",
  "catchlight", "beak-upper", "beak-lower", "foot-far", "foot-near",
] as const;

function copperbird(): PencilActorSpec {
  // A real songbird's head is substantially smaller than its torso.
  // The shared parent scale preserves eye/beak alignment and author identity.
  const head = [key(0, 0, 0, 0, .79, .84),
    key(194, 0, 0, 0, .79, .84), key(225, -1, 0, -6, .79, .84),
    key(265, 1, 1, 3, .79, .84), key(295, 0, 0, 0, .79, .84),
    key(348, -1, 1, -3, .79, .84), key(419, 0, 0, 0, .79, .84)];
  const wing = [key(0), key(220), key(251, 0, -2, -7),
    key(286, 0, 1, 3), key(328, 0, 0, -2), key(419)];
  const tail = [key(0), key(224), key(257, 0, 1, 5),
    key(307, 0, 0, -4), key(355), key(419)];
  const blink = [key(0), key(285), key(291, 0, 0, 0, 1, .12),
    key(297), key(352), key(358, 0, 0, 0, 1, .1), key(364), key(419)];
  const beak = [key(0), key(237), key(256, 0, 1, 7), key(285), key(419)];
  const parts: PencilActorPart[] = [
    anatomy("tail-far",
      "M115 211 Q100 265 31 354 Q72 344 124 283 L145 222 Z",
      [29, 208, 118, 150], 1001, {color:night, direction:57, flow:-14, start:46,
        details:[
          detail("M110 241 Q79 307 42 347 M123 256 Q100 311 60 346", "#294B67", 1.75),
          detail("M108 266 Q82 317 52 337 M94 282 Q68 328 39 350", "#AEC6CA", .85),
          detail("M120 272 L88 333 M109 286 L75 338 M100 299 L62 346", "#536B85", .72),
        ]}, undefined, [127, 228], tail),
    anatomy("tail-near",
      "M121 212 Q108 286 55 350 Q89 345 144 275 L158 225 Z",
      [53, 209, 107, 144], 1027, {color:cobalt, direction:64, flow:19,
        details:[
          detail("M122 243 Q101 304 64 342 M136 249 Q122 307 84 336", "#C3DBD5", .95),
          detail("M123 280 Q100 328 77 342 M143 270 Q123 314 98 334", "#153954", 1.15),
        ]}, undefined, [141, 230], tail),
    anatomy("wing-far",
      "M111 153 Q83 131 91 112 Q124 106 149 141 L160 209 Q141 214 116 190 Z",
      [88, 108, 73, 109], 1053, {color:night, direction:51, flow:22,
        details:[
          detail("M112 144 Q132 165 142 204 M101 130 Q119 146 126 178", "#8FB3C1", 1.35),
          detail("M111 170 L129 196 M121 169 L147 208", "#B3D4D3", .85),
        ]}, undefined, [117, 168]),
    anatomy("torso",
      "M108 119 C136 97 176 96 203 125 Q231 154 233 208 C234 251 214 281 168 292 Q119 296 103 262 C91 228 91 158 108 119 Z",
      [92, 96, 144, 200], 1081, {color:blue, direction:-28, flow:23, start:57,
        details:[
          detail("M107 175 Q102 210 110 236 M109 249 Q130 278 166 284", "#496C79", 1.3),
          detail("M113 154 Q127 132 153 124 M185 270 Q213 256 223 231", "#D0D8C9", 1),
        ]}, undefined, [162, 215]),
    anatomy("flank",
      "M101 205 Q116 229 161 247 Q160 269 142 287 Q103 264 100 232 Z",
      [97, 202, 67, 87], 1109, {color:night, direction:59, flow:17, start:75,
        details:[
          detail("M104 230 Q120 253 150 264 M111 245 Q123 263 144 275", "#ADC5C1", .9),
          detail("M108 222 L134 256 M105 237 L127 269", "#6C8D95", .8),
        ]}, "torso", [119, 244]),
    anatomy("breast",
      "M159 125 Q206 125 226 161 Q240 220 215 260 Q199 286 160 281 Q131 278 121 231 Q117 169 159 125 Z",
      [117, 124, 122, 162], 1137, {color:copper, direction:30, flow:-28, start:74,
        details:[
          detail("M146 170 Q161 184 169 211 M156 170 Q175 188 182 220", "#FAE2B5", 1.25),
          detail("M172 178 Q194 202 200 237 M184 164 Q211 193 215 216", "#F5D0AD", .82),
          detail("M143 208 Q155 241 169 258 M157 223 Q176 264 193 272", "#AD646C", 1.15),
          detail("M134 225 Q146 263 164 278 M178 266 Q199 267 209 247", "#F8D8B1", 1.05),
          detail("M132 189 Q142 202 147 215 M146 244 Q154 258 165 268", "#F0B39A", .8),
        ]}, "torso", [159, 190]),
    anatomy("throat",
      "M167 140 Q180 125 196 137 Q214 145 216 164 Q213 182 195 188 Q171 175 167 140 Z",
      [165, 125, 54, 65], 1169, {color:cream, direction:43, flow:-13, start:92,
        details:[
          detail("M164 139 Q181 158 190 177 M175 132 Q194 154 203 179", "#FCF4D8", 1.1),
          detail("M180 148 Q198 169 211 183 M171 162 L191 182", "#CA988B", .8),
        ]}, "torso", [179, 142]),
    anatomy("wing-main",
      "M111 148 Q142 145 173 169 Q164 211 135 254 Q117 272 108 280 Q86 246 96 190 Q99 162 111 148 Z",
      [92, 144, 84, 141], 1201, {color:cobalt, direction:54, flow:31, start:89,
        details:[
          detail("M112 188 Q130 201 151 193 M107 205 Q128 220 158 210", "#AFD1D5", 1.4),
          detail("M110 181 Q125 182 144 187 M110 187 Q126 191 149 195", "#CCE0DA", .75),
          detail("M107 198 Q119 206 137 213 M103 210 Q121 222 144 221", "#D7E6DC", .72),
          detail("M105 229 Q116 238 135 240 M109 244 Q120 252 126 254", "#A6C6C9", .66),
          detail("M113 183 Q123 199 128 218 M124 184 Q135 201 137 231", "#214E72", .75),
          detail("M103 222 Q127 241 148 234 M114 239 Q130 247 139 249", "#BDD8D6", 1.1),
          detail("M110 173 Q135 185 161 177 M113 197 Q139 210 163 201", "#183C5E", 1.15),
          detail("M116 225 Q129 227 141 221 M117 235 Q125 239 131 239", "#456F9B", .9),
          detail("M106 217 Q112 242 128 254 M122 196 Q143 204 154 199", "#1E5074", .85),
          detail("M102 204 Q112 199 121 202 M110 236 Q118 233 128 238", "#173B5A", 1.55, 200, .83),
          ...featherVanes([
            [106, 181, 111, 254, -3], [117, 171, 123, 249, -4],
            [128, 174, 133, 237, -3], [140, 180, 146, 219, -2.5],
            [151, 184, 150, 207, -2],
          ], "#C4DADB"),
        ]}, "torso", [119, 169], wing),
    // Sculpted trailing feathers, not another generic oval filled by a CAD hatch.
    // They travel with the wing but remain layered behind the small shoulder coverts.
    anatomy("wing-primaries",
      "M108 203 Q125 207 153 203 Q149 220 143 225 Q140 233 137 236 Q131 240 131 246 Q126 254 120 257 Q118 269 110 270 Q100 255 102 231 Z",
      [99, 199, 57, 74], 1223, {color:cobalt, direction:63, flow:29, start:101,
        details:[
          detail("M113 208 Q128 225 111 262 M123 208 Q138 228 121 253", "#CEDFD9", .95),
          detail("M133 208 Q144 222 134 243 M143 207 Q148 218 141 228", "#D3E3DB", .83),
          detail("M108 225 Q118 237 106 248 M116 233 Q125 241 118 255", "#2B5076", .83),
          detail("M110 218 Q126 234 116 246 M122 222 Q134 235 125 245", "#224D70", .68),
          detail("M105 224 Q111 219 119 221 M117 237 Q126 228 133 232", "#193A5A", 1.55, 206, .82),
          ...featherVanes([
            [107, 215, 109, 262, -1], [117, 213, 121, 250, -1.6],
            [130, 214, 134, 237, -1.3], [141, 211, 141, 222, -.7],
          ], "#B4D2D8", 201),
        ]}, "wing-main", [121, 210]),
    anatomy("wing-coverts",
      "M109 159 Q133 149 165 167 Q163 188 149 196 Q121 199 104 186 Z",
      [100, 147, 68, 54], 1237, {color:blue, direction:-42, flow:37, start:101,
        details:[
          detail("M114 169 Q128 180 145 184 M112 179 Q128 193 155 193", "#D4E1D8", 1.15),
          detail("M111 166 Q129 173 155 177 M106 175 Q126 185 153 189", "#E1E9DF", .69),
          detail("M113 179 L129 190 M127 173 L142 185 M138 170 L154 180", "#325F85", .77),
          detail("M109 189 Q126 203 150 201 M117 164 Q133 166 148 174", "#254A72", .95),
          detail("M120 175 L135 189 M132 173 L149 191", "#7EA7BA", .75),
          detail("M109 178 Q122 187 137 189 M120 162 Q135 163 151 173", "#244965", 1.4, 205, .78),
          ...featherVanes([
            [112, 165, 137, 185, -2], [122, 160, 146, 186, -2.2],
            [132, 166, 152, 186, -1.7],
          ], "#E0EBE1", 208),
        ]}, "wing-main", [128, 184]),
    anatomy("head",
      "M150 130 C142 109 147 85 161 72 Q177 56 203 60 Q231 61 245 89 Q253 112 236 132 Q222 147 202 149 Q167 155 150 130 Z",
      [140, 57, 114, 98], 1261, {color:blue, direction:-54, flow:29, start:100,
        details:[
          detail("M157 79 Q177 57 204 62 M156 88 Q171 71 194 72", "#D0E6E4", 1.1),
          detail("M168 70 Q188 62 214 69 M151 109 Q165 131 182 140", "#254B69", .9),
          detail("M148 96 L162 112 M153 87 L169 103 M163 73 L179 83", "#B5D4D8", .65),
        ]}, "torso", [182, 118], head),
    anatomy("mask",
      "M179 94 Q192 80 216 81 Q237 83 243 99 Q242 116 229 126 Q207 130 190 116 Q179 107 179 94 Z",
      [177, 79, 69, 51], 1291, {color:night, direction:14, flow:-18, start:115,
        details:[
          detail("M190 85 Q211 77 235 90 M190 115 Q209 123 231 115", "#6B8692", .8),
          detail("M198 81 L216 79 M208 123 L229 117", "#B1C9C5", .65),
        ]}, "head", [211, 99]),
    anatomy("cheek",
      "M186 120 Q209 117 236 121 Q234 142 219 154 Q204 165 190 157 Q178 141 186 120 Z",
      [176, 115, 63, 52], 1327, {color:amber, direction:56, flow:23, start:129,
        details:[
          detail("M182 135 Q203 146 222 144 M188 151 Q202 160 214 155", "#FCDEBB", 1.1),
          detail("M197 128 Q212 132 226 132", "#BB8579", .7),
        ]}, "head", [202, 136]),
    anatomy("eye-ring",
      "M213 97 Q218 88 230 93 Q235 99 232 108 Q224 114 217 110 Q211 104 213 97 Z",
      [209, 88, 27, 27], 1351, {color:cream, direction:18, flow:10, start:144,
        details:[
          detail("M208 95 Q216 84 229 89", "#FDF2D9", 1.2),
          detail("M213 106 Q220 114 231 108", "#8D8183", .68, 212, .72),
        ]}, "head", [219, 100]),
    anatomy("eye",
      "M217 97 Q223 92 229 98 Q233 104 226 108 Q218 109 216 103 Z",
      [213, 92, 21, 20], 1381, {color:night, direction:27, flow:13, start:155, base:1,
        details:[
          detail("M217 102 Q224 109 230 102", "#364E65", .72),
          detail("M217 99 Q221 92 228 98", "#101E30", 1.5, 190, .92),
          detail("M219 103 Q224 107 228 102", "#5D8293", .74, 209, .85),
        ]},
      "head", [223, 101], blink),
    anatomy("catchlight",
      "M220 95 Q224 94 225 97 Q224 100 221 100 Q220 98 220 95 Z",
      [218, 93, 9, 9], 1409, {color:["#FFF8E8", "#FFFFFF", "#E4F1F1"], direction:12,
        material:"soft", base:1, start:166, flow:0, contour:"#FCFAF5"}, "eye", [225, 97], blink),
    anatomy("beak-upper",
      "M238 108 Q252 105 269 111 Q256 118 240 119 Z",
      [237, 104, 33, 16], 1439, {color:["#8D8F8B","#565966","#B1A299"], direction:0,
        material:"dense", start:152, base:.94, contour:"#4A4852",
        details:[detail("M248 109 Q262 109 278 111", "#D7C0A3", .8)]},
      "head", [242, 113]),
    anatomy("beak-lower",
      "M241 119 Q259 119 267 114 Q259 126 245 126 Z",
      [240, 112, 29, 17], 1463, {color:["#B99D8C","#736571","#D7B8A6"],direction:18,
        material:"layered",start:163,base:.94,contour:"#635560"},
      "head", [247, 123], beak),
    anatomy("foot-far",
      "M144 271 Q151 269 153 277 L149 306 Q156 313 166 319 L164 323 Q152 319 146 312 Q138 324 131 326 L129 323 L144 306 Z",
      [126, 268, 43, 61], 1499, {color:["#8D777A","#584953","#BDA196"], direction:59, flow:5,
        material:"dense",start:151,base:.95,
        details:[
          detail("M145 311 Q137 318 130 326 M148 311 Q157 319 166 319", "#4A4650", 1.65),
          detail("M147 299 L150 300 M144 291 L152 293", "#D2B5A0", .7),
        ]}, "torso", [147, 275]),
    anatomy("foot-near",
      "M186 269 Q193 268 195 278 L190 309 Q202 315 212 323 L209 326 Q199 323 190 315 Q182 328 174 329 L172 326 L184 309 Z",
      [170, 266, 45, 66], 1531, {color:["#8D777A","#584953","#BDA196"],direction:57,flow:5,
        material:"dense",start:157,base:.95,
        details:[
          detail("M190 314 Q179 326 174 329 M192 313 Q204 319 211 323", "#48434C", 1.5),
          detail("M190 284 L196 285 M187 297 L193 298", "#CBB1A3", .68),
        ]}, "torso", [189, 274]),
  ];
  return { id:"copperbird", parts };
}

function scenery(transform: string): PencilRegion[] {
  const source = [
    coloredRegion("perch-bark",
      "M6 309 C65 298 126 317 193 313 Q251 305 309 300 Q360 290 405 286 L409 298 Q360 312 312 320 C260 328 194 340 121 329 Q49 319 8 331 Z",
      [4, 283, 409, 60], 1777, {color:bark, start:47, direction:11, flow:12,
        material:"dense",texture:"fiber",base:.74,
        details:[
          detail("M17 317 Q72 312 136 324 Q212 337 294 310", "#473B3F", 1.7),
          detail("M38 312 Q86 316 119 325 M160 329 Q203 331 249 317", "#DCC2A8", 1.1),
          detail("M45 319 Q87 310 132 321 M188 326 Q230 320 276 315", "#5B4548", .8),
          detail("M18 326 L58 319 M83 322 L107 323 M275 324 L314 315", "#D7BCA8", .65),
          detail("M275 311 Q320 304 387 295 M299 320 Q352 306 402 295", "#715750", 1.35),
        ]}),
    coloredRegion("branch-twig",
      "M296 314 Q328 276 356 218 Q372 181 401 157 Q386 204 383 230 Q365 287 326 315 Z",
      [293, 154, 111, 165], 1801, {color:bark, start:70, direction:-61, flow:14,
        material:"layered",base:.72,
        details:[
          detail("M317 304 Q352 254 371 208 M362 235 Q376 196 392 172", "#604B49", 1.05),
        ]}),
    coloredRegion("leaf-cluster-a",
      "M356 216 Q328 184 342 155 Q373 168 381 203 Q379 216 356 216 Z M386 190 Q382 156 407 139 Q416 170 404 193 Z",
      [327, 137, 93, 83], 1837, {color:leaf,start:89,direction:38,flow:29,
        material:"soft",texture:"fiber",base:.60,
        details:[
          detail("M358 210 Q354 183 344 160 M398 185 Q405 163 408 147", "#648A6E", .8),
        ]}),
    coloredRegion("leaf-cluster-b",
      "M319 261 Q294 247 295 223 Q321 228 330 249 Q334 263 319 261 Z M385 246 Q391 215 414 210 Q407 240 389 250 Z",
      [292, 208, 126, 58], 1867, {color:leaf,start:103,direction:-44,flow:21,
        material:"soft",texture:"fiber",base:.60,
        details:[
          detail("M315 252 Q304 231 299 226 M391 240 Q402 223 410 215", "#6A9373", .8),
        ]}),
  ];
  return source.map(region => ({...region, transform}));
}

export interface PencilWildlifeOptions {
  /** Distinct authored landscape / portrait staging; same design proportions and anatomy. */
  aspect: PencilAspect;
  /** Bounded physical paper tooth; optical pigment remains paper-anchored. */
  paperTooth?: number;
  /** Sparse drawing vs complete field-study colour layers. */
  detail?: "study" | "full";
}

export function pencilWildlifeScene({aspect, paperTooth = .68,
  detail: detailMode = "full"}: PencilWildlifeOptions): PencilSceneSpec {
  if (aspect !== "landscape" && aspect !== "portrait") throw new RangeError("Invalid page aspect");
  if (!Number.isFinite(paperTooth) || paperTooth < 0 || paperTooth > 1)
    throw new RangeError("paperTooth must be between 0 and 1");
  if (detailMode !== "full" && detailMode !== "study")
    throw new RangeError("Invalid wildlife detail profile");
  const portrait = aspect === "portrait";
  const transform = portrait ? "translate(-14 171) scale(1.42)" : "translate(426 42) scale(1.33)";
  const original = copperbird();
  const actors = [{...original, transform, parts: original.parts.map(part => ({
    ...part, region: detailMode === "full" ? part.region :
      {...part.region, details: part.region.details?.filter((_, index) => index % 2 === 0)},
  }))}];
  const width = portrait ? 540 : 960, height = portrait ? 960 : 540;
  const x = portrait ? 42 : 46;
  const annotations: NonNullable<PencilSceneSpec["annotations"]> = [
    {id:"category",type:"text",text:"FIELD NOTES  /  ORIGINAL WILDLIFE STUDY",
      at:[x, portrait ? 75 : 62],color:"#637B79",size:12,startFrame:0,durationFrames:12,
      font:"sans"},
    {id:"headline",type:"text",text:["THE COPPER", "SONGBIRD"],
      at:[x, portrait ? 126 : 125],color:"#344954",size:portrait ? 51 : 55,
      startFrame:0,durationFrames:18,font:"serif"},
    {id:"caption",type:"text",text:portrait ?
      ["A living feather study.", "Graphite, copper, cobalt."] :
      ["Feather groups, glassy eyes, deliberate", "movement and a firmly planted perch."],
      at:[x, portrait ? 758 : 280],color:"#657776",size:portrait ? 17 : 16,
      startFrame:194,durationFrames:42,font:"serif"},
    {id:"footer",type:"text",text:portrait ?
      "STUDY 04  /  MATERIAL-NATIVE COLOUR PENCIL" :
      "STUDY 04  /  MATERIAL-NATIVE COLOUR PENCIL",
      at:[x, portrait ? 914 : 505],color:"#78837B",size:12,
      startFrame:0,durationFrames:15,font:"sans"},
    {id:"underline",type:"stroke",path:portrait ?
      "M42 230 L496 230" : "M46 324 L397 324",color:"#B88D78",
      width:1.1,startFrame:30,durationFrames:50,space:"screen"},
  ];
  return {
    version:1,
    drawing:{version:1,width,height,seed:619,paper:"#FAF5EC",paperTooth,
      regions:scenery(transform)},
    actors,
    annotations,
    camera:{from:[0,0,1],to:portrait ? [-5,-2,1.015] : [-7,-2,1.02],
      startFrame:270,durationFrames:150},
  };
}
