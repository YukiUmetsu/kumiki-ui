import { createPencilRegion } from "../../registry/video/colored-pencil";
import type { PencilActorSpec, PencilActorPart, PencilPoseKey } from "../../registry/video/colored-pencil-actor";
import type { PencilAspect } from "../../registry/video/colored-pencil";
import type { PencilSceneSpec } from "../../registry/video/colored-pencil-scene";
import { pencilDemoScene } from "./colored-pencil-demo-scenes";

/** Original educational-story characters, authored as distinct pencil-painted body parts.
 * The poses are drawings, not inferred zoological motion. Frame input comes from FilmStage.
 */
const key = (frame: number, x = 0, y = 0, rotation = 0, sx = 1, sy = 1): PencilPoseKey =>
  ({ frame, translate: [x, y], rotation, scale: [sx, sy] });
type Palette = readonly [string, string, string];
const redFox: Palette = ["#DCA776", "#BA7256", "#F4D2A4"];
const foxCream: Palette = ["#F0D9AE", "#C99D76", "#EEDFC2"];
const amber: Palette = ["#C9A178", "#916D50", "#E9C7A0"];
const feather: Palette = ["#8FAAB0", "#667E93", "#B4C7C6"];
const featherLight: Palette = ["#C7D6D1", "#8FA8AE", "#DFE7DD"];

function part(id: string, path: string, bounds: readonly [number, number, number, number],
  palette: Palette, pivot: readonly [number, number], keys: readonly PencilPoseKey[],
  parent?: string, detail?: string): PencilActorPart {
  const seed = 900 + [...(id + palette[0])].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) >>> 0;
  const boundedSeed = seed % 2000000000;
  return {
    id, parent, pivot, keys,
    region: createPencilRegion({
      id, path, bounds, palette, seed: boundedSeed, startFrame: 8, durationFrames: 148,
      material: "dense", underpaintOpacity: .9,
      direction: -28 + (boundedSeed % 33), flow: id.includes("wing") ? 25 : 14,
      tone: "core",
      details: detail ? [{
        path: detail, color: "#6B6157", width: 1.15,
        startFrame: 102, durationFrames: 64, opacity: .74,
      }] : undefined,
    }),
  };
}
function fox(): PencilActorSpec {
  const body = [
    key(0), key(140), key(180, 12, -4, -2), key(210, 23, 0, 1),
    key(245, 23, -3), key(275, 23, 0), key(320, 23),
  ];
  return { id: "fox", parts: [
    part("torso", "M53 113 Q74 88 106 95 Q144 93 158 123 Q168 153 147 174 Q114 185 72 168 Q53 149 53 113 Z",
      [51, 90, 119, 96], redFox, [103, 133], body, undefined,
      "M62 124 Q79 114 94 116 M98 164 Q129 177 151 151"),
    part("tail", "M63 140 Q10 140 10 104 Q17 67 44 97 Q26 99 43 117 Q56 125 71 123 Z",
      [8, 65, 68, 78], redFox, [63, 133], [
        key(0), key(155), key(180, 0, 0, 15), key(218, 0, 0, -15),
        key(250, 0, 0, 12), key(290, 0, 0, -7), key(320),
      ], "torso", "M18 100 Q24 89 35 96 M26 113 Q38 113 48 126"),
    part("back-leg", "M71 164 Q81 159 94 170 L89 204 Q78 211 65 202 Z",
      [64, 159, 32, 53], amber, [81, 167], [
        key(0), key(152), key(175, 0, 0, -19), key(196, 0, 0, 21),
        key(219, 0, 0, -13), key(240), key(320),
      ], "torso"),
    part("front-leg", "M128 164 Q138 164 150 171 L152 207 Q137 215 123 203 Z",
      [122, 162, 32, 55], amber, [140, 170], [
        key(0), key(152), key(175, 0, 0, 18), key(196, 0, 0, -17),
        key(219, 0, 0, 14), key(240), key(320),
      ], "torso"),
    part("head", "M99 98 L84 42 Q99 47 108 63 Q123 49 143 43 L150 95 Q152 126 127 133 Q105 130 94 114 Z",
      [83, 39, 70, 96], redFox, [118, 105], [
        key(0), key(180), key(215, 0, 0, -8), key(243, 0, 0, 5), key(280), key(320),
      ], "torso", "M104 74 Q116 64 130 70 M100 110 Q115 126 135 111"),
    part("muzzle", "M106 109 Q120 97 143 109 Q146 129 124 133 Q109 130 106 109 Z",
      [105, 99, 41, 36], foxCream, [125, 117], [
        key(0), key(195), key(214, 0, 0, 0, 1, .86), key(235, 0, 0, 0, 1, 1.08), key(320),
      ], "head", "M120 118 Q124 124 129 118"),
    part("eyes", "M111 91 Q115 82 119 91 Q120 98 116 100 Q111 97 111 91 Z M135 91 Q139 83 143 90 Q144 99 140 100 Q135 96 135 91 Z",
      [109, 81, 37, 22], amber, [127, 92], [
        key(0), key(225), key(232, 0, 0, 0, 1, .10), key(239), key(320),
      ], "head"),
    part("arm", "M151 131 Q174 117 176 143 L162 164 Q148 159 145 145 Z",
      [143, 115, 37, 53], redFox, [154, 143], [
        key(0), key(175), key(206, 0, -2, -36), key(235, 0, -4, -58),
        key(261, 0, 0, -34), key(284, 0, -4, -54), key(320, 0, 0, -14),
      ], "torso"),
  ]};
}
function bird(): PencilActorSpec {
  return { id: "bird", parts: [
    part("torso", "M46 114 Q45 79 80 70 Q112 66 130 98 Q143 133 115 160 Q83 173 58 149 Z",
      [43, 67, 103, 106], feather, [89, 119], [
        key(0), key(140), key(172, 0, -12, -3), key(203, 0, -3),
        key(230, 0, -14, 3), key(259, 0, -4), key(290, 0, -10), key(320),
      ], undefined, "M55 123 Q80 148 121 129 M62 139 Q88 157 115 148"),
    part("back-wing", "M50 109 Q9 93 23 59 Q34 52 45 64 Q31 78 58 90 Z",
      [19, 49, 41, 65], feather, [51, 100], [
        key(0), key(145), key(169, 0, 0, -30), key(189, 0, 0, 18),
        key(215, 0, 0, -33), key(238, 0, 0, 10), key(320),
      ], "torso"),
    part("head", "M72 80 Q65 45 89 31 Q112 21 125 53 Q135 80 111 92 Z",
      [64, 24, 73, 72], featherLight, [100, 80], [
        key(0), key(170), key(206, 0, -2, 8), key(246, 0, 0, -5), key(320),
      ], "torso", "M83 54 Q94 43 111 49"),
    part("eye", "M102 57 Q106 51 110 58 Q112 67 107 69 Q102 65 102 57 Z",
      [100, 49, 13, 23], amber, [107, 59], [
        key(0), key(203), key(211, -3), key(221, 0, 0, 0, 1, .1),
        key(229, -3), key(270), key(320),
      ], "head"),
    part("beak", "M119 74 L146 84 L122 92 Z",
      [118, 73, 30, 22], amber, [120, 81], [
        key(0), key(205), key(221, 0, 1, 0, 1, 1.12), key(236), key(320),
      ], "head"),
    part("front-wing", "M110 109 Q148 83 160 114 Q159 138 123 148 Q113 140 110 109 Z",
      [108, 81, 55, 69], feather, [118, 117], [
        key(0), key(144), key(167, 0, 0, 28), key(188, 0, 0, -34),
        key(213, 0, 0, 27), key(239, 0, 0, -24), key(320),
      ], "torso", "M125 128 Q148 122 155 111"),
    part("feet", "M82 160 L80 189 L70 195 M80 189 L87 199 M107 161 L109 189 L98 197 M109 189 L118 196",
      [68, 158, 52, 44], amber, [94, 167], [
        key(0), key(174, 0, 4), key(201), key(225, 0, 5), key(320),
      ], "torso"),
  ] };
}

/** Author separate landscape and portrait stages. No fictional animal measurements or data. */
export function pencilCharacterScene(aspect: PencilAspect): PencilSceneSpec {
  const source = pencilDemoScene("terrain", aspect);
  const portrait = aspect === "portrait";
  const actors = [fox(), bird()].map((actor, i) => ({
    ...actor, transform: portrait
      ? (i === 0 ? "translate(68 514) scale(1)" : "translate(280 499) scale(.99)")
      : (i === 0 ? "translate(483 236) scale(1.2)" : "translate(722 241) scale(1.07)"),
  }));
  const annotations = source.annotations?.filter(item => !item.id.startsWith("guide-")).map(item => {
    if (item.id === "title" && item.type === "text")
      return { ...item, text: ["A SMALL", "ENCOUNTER"] };
    if (item.id === "section" && item.type === "text")
      return { ...item, text: "STORY / ORIGINAL CHARACTERS" };
    if (item.id === "description" && item.type === "text")
      return { ...item, text: ["A fox greets a visiting bird.", "A pencil-drawn character study."] };
    return item;
  });
  const backdrop = { ...source.drawing, regions: source.drawing.regions.map(region => ({
    ...region,
    layers: region.layers.map(layer => ({
      ...layer, pressure: layer.pressure * .55, tipWidth: layer.tipWidth * .73,
    })),
    contour: { ...region.contour, opacity: .32 },
  })) };
  return { ...source, drawing: backdrop, actors, annotations };
}
