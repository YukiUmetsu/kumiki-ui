import type { PaintBrushLayer, PaintWash, PaintedCompositionSpec, PaintedLayer } from "../../registry/video/painted-composition";
import type { PaintStroke, BrushPoint } from "../../registry/video/watercolour-brush";

export type PaintedGenre = "nature" | "architecture" | "science" | "product";
export type PaintedOutput = "landscape" | "portrait";
export const PAINTED_GENRES: readonly PaintedGenre[] = ["nature", "architecture", "science", "product"];

interface Artboard {
  width: number; height: number;
  x: number; y: number; w: number; h: number;
  xy: (u: number, v: number) => readonly [number, number];
  P: (u: number, v: number) => string;
  box: (x: number, y: number, w: number, h: number) => readonly [number, number, number, number];
}
function board(output: PaintedOutput): Artboard {
  const portrait = output === "portrait";
  const width = portrait ? 540 : 960, height = portrait ? 960 : 540;
  const x = portrait ? 50 : 445, y = portrait ? 393 : 77;
  const w = portrait ? 442 : 466, h = portrait ? 441 : 390;
  const xy = (u: number, v: number): readonly [number, number] => [Math.round(x + u * w), Math.round(y + v * h)];
  const P = (u: number, v: number) => xy(u, v).join(" ");
  const box = (u: number, v: number, dx: number, dy: number): readonly [number, number, number, number] => {
    const [xx, yy] = xy(u, v);
    return [xx, yy, Math.max(1, Math.round(dx * w)), Math.max(1, Math.round(dy * h))];
  };
  return { width, height, x, y, w, h, xy, P, box };
}
function rectangle(b: Artboard, u: number, v: number, dx: number, dy: number): string {
  return "M" + b.P(u, v) + " L" + b.P(u + dx, v) + " L" + b.P(u + dx, v + dy) +
    " L" + b.P(u, v + dy) + " Z";
}
function ellipse(b: Artboard, cx: number, cy: number, rx: number, ry: number): string {
  const [x, y] = b.xy(cx, cy), rxx = Math.max(1, Math.round(rx * b.w)), ryy = Math.max(1, Math.round(ry * b.h));
  return "M" + (x - rxx) + " " + y + " A" + rxx + " " + ryy + " 0 1 0 " + (x + rxx) + " " + y +
    " A" + rxx + " " + ryy + " 0 1 0 " + (x - rxx) + " " + y + " Z";
}
function ribbon(b: Artboard, coords: readonly (readonly [number,number])[]): string {
  return "M" + coords.map(([u,v]) => b.P(u,v)).join(" L");
}
function defaultGesture(box: readonly [number,number,number,number]): string {
  const [x,y,w,h] = box;
  // A serpentine gesture reveals the actual painted shape; completed passes render its full silhouette.
  return "M" + (x+w*.1).toFixed(1)+" "+(y+h*.17).toFixed(1) +
    " C"+(x+w*.35).toFixed(1)+" "+(y+h*.05).toFixed(1)+" "+(x+w*.7).toFixed(1)+" "+(y+h*.2).toFixed(1)+" "+(x+w*.91).toFixed(1)+" "+(y+h*.27).toFixed(1) +
    " C"+(x+w*.8).toFixed(1)+" "+(y+h*.43).toFixed(1)+" "+(x+w*.22).toFixed(1)+" "+(y+h*.4).toFixed(1)+" "+(x+w*.12).toFixed(1)+" "+(y+h*.55).toFixed(1) +
    " C"+(x+w*.25).toFixed(1)+" "+(y+h*.74).toFixed(1)+" "+(x+w*.84).toFixed(1)+" "+(y+h*.74).toFixed(1)+" "+(x+w*.9).toFixed(1)+" "+(y+h*.86).toFixed(1);
}
function wash(
  id: string, path: string, bounds: readonly [number,number,number,number], pigment: string,
  accent: string, startFrame: number, options: Partial<PaintWash> = {},
): PaintWash {
  return { kind: "wash", id, path, bounds, pigment, accent, tone: 3, opacity: .83,
    water: .74, granulation: .83, edgePooling: .58, startFrame,
    paintFrames: 50, spreadFrames: 34, dryFrames: 75,
    brushPath: defaultGesture(bounds), brushWidth: Math.min(560, Math.max(bounds[2]*.35, bounds[3]*.36)),
    ...options };
}
function brush(
  b: Artboard, id: string, pigment: string, knots: readonly (readonly [number,number,number])[],
  startFrame: number, width: number, options: Partial<PaintStroke> = {},
): PaintBrushLayer {
  const points: BrushPoint[] = knots.map(([x,y,p]) => {
    const [px,py]=b.xy(x,y); return { x:px, y:py, pressure:p, speed:p<.3?.7:.25 };
  });
  return { kind:"brush", id, stroke: { id, color:pigment, tone:4, width,
    water:.34, load:.87, dryBrush:.65, startFrame, drawFrames:42, spreadFrames:20, dryFrames:63,
    points, ...options } };
}

function natural(b: Artboard): PaintedLayer[] {
  const sky = rectangle(b, .05, .06, .91, .74);
  const mountain = "M"+b.P(.04,.69)+" C"+b.P(.2,.54)+" "+b.P(.3,.53)+" "+b.P(.39,.61)+
    " S"+b.P(.72,.48)+" "+b.P(.94,.62)+" L"+b.P(.97,.82)+" L"+b.P(.02,.82)+" Z";
  const sea = "M"+b.P(.05,.76)+" Q"+b.P(.35,.72)+" "+b.P(.54,.77)+
    " T"+b.P(.96,.75)+" L"+b.P(.96,.97)+" L"+b.P(.04,.97)+" Z";
  const hill = "M"+b.P(.03,.87)+" Q"+b.P(.2,.72)+" "+b.P(.36,.84)+
    " T"+b.P(.66,.85)+" T"+b.P(.96,.86)+" L"+b.P(.96,.99)+" L"+b.P(.03,.99)+" Z";
  return [
    wash("sky-pale",sky,b.box(.05,.06,.91,.74),"#CAD7D8","#EDD0C3",0,
      {tone:2,opacity:.55,water:.92,paintFrames:75,brushWidth:200}),
    wash("sun-soft",ellipse(b,.72,.31,.13,.16),b.box(.59,.15,.26,.32),"#E4C389","#F8DBC2",30,
      {tone:2,water:.98,opacity:.75,edgePooling:.19}),
    wash("mountain-haze",mountain,b.box(.02,.47,.95,.35),"#839AAB","#B5ADB8",75,
      {tone:3,opacity:.87,granulation:.72}),
    wash("shoreline-sea",sea,b.box(.04,.72,.93,.25),"#77AAA9","#B6D8CC",135,
      {tone:3,water:.88,opacity:.81,edgePooling:.63}),
    wash("foreground-hill",hill,b.box(.02,.70,.95,.29),"#5E8584","#8CAA8A",182,
      {tone:4,water:.48,opacity:.96,edgePooling:.85}),
    brush(b,"coastal-grass-one","#395E5A",[[.19,.95,.1],[.22,.88,.8],[.25,.79,.05]],218,9),
    brush(b,"coastal-grass-two","#698272",[[.23,.97,.05],[.27,.89,.75],[.31,.82,.04]],224,7),
    brush(b,"sea-light","#F5EBCE",[[.52,.84,.05],[.67,.83,.55],[.78,.85,.65],[.86,.84,.04]],232,11,
      {dryBrush:.87,water:.2,tone:2}),
  ];
}
function architectural(b: Artboard): PaintedLayer[] {
  const wall = rectangle(b,.23,.24,.56,.68);
  const doorway = "M"+b.P(.44,.9)+" L"+b.P(.44,.48)+" Q"+b.P(.51,.37)+" "+b.P(.59,.48)+
    " L"+b.P(.59,.9)+" Z";
  const roof = "M"+b.P(.16,.32)+" L"+b.P(.5,.12)+" L"+b.P(.86,.32)+" L"+b.P(.8,.36)+" L"+b.P(.21,.36)+" Z";
  const windowLeft = rectangle(b,.29,.48,.11,.22);
  const windowRight = rectangle(b,.64,.48,.1,.22);
  return [
    wash("evening-haze",rectangle(b,.05,.06,.89,.88),b.box(.05,.06,.89,.88),"#D5CBBA","#E8D8BC",0,
      {tone:1,opacity:.4,water:.98,brushWidth:205}),
    wash("facade-warm",wall,b.box(.23,.24,.56,.68),"#CEB398","#D9C8AC",58,
      {tone:3,water:.65,granulation:.91,edgePooling:.58,
      reservePaths:[windowLeft,windowRight,doorway]}),
    wash("roof-terracotta",roof,b.box(.16,.12,.7,.24),"#A76F6B","#D3A88B",119,
      {tone:4,water:.56,granulation:.96,edgePooling:.71}),
    wash("doorway-shadow",doorway,b.box(.44,.37,.16,.53),"#47565F","#73818B",166,
      {tone:5,water:.42,edgePooling:.89}),
    wash("window-glass-left",windowLeft,b.box(.29,.48,.11,.22),"#829DA6","#B6D0CD",179,
      {tone:3,water:.82,opacity:.64}),
    wash("window-glass-right",windowRight,b.box(.64,.48,.1,.22),"#829DA6","#B6D0CD",192,
      {tone:3,water:.82,opacity:.64}),
    brush(b,"roof-eaves","#584C51",[[.17,.34,.04],[.46,.32,.86],[.79,.34,.04]],213,9,{dryBrush:.78}),
    brush(b,"window-sill","#6D6E68",[[.28,.71,.1],[.39,.72,.83],[.42,.72,.04]],229,5),
    brush(b,"ground-shadow","#707E77",[[.22,.94,.03],[.48,.95,.72],[.81,.94,.03]],238,20,
      {tone:3,water:.72,dryBrush:.3}),
  ];
}
function scientific(b: Artboard): PaintedLayer[] {
  const cell = ellipse(b,.52,.52,.38,.36);
  const nucleus = ellipse(b,.51,.54,.17,.18);
  const nucleolus = ellipse(b,.53,.53,.062,.072);
  const vesicleOne = ellipse(b,.29,.47,.057,.07);
  const vesicleTwo = ellipse(b,.72,.57,.06,.075);
  const vacuole = ellipse(b,.60,.75,.09,.042);
  return [
    wash("cell-membrane",cell,b.box(.14,.16,.76,.72),"#90B7AD","#B4D5C2",8,
      {tone:2,opacity:.64,water:.91,edgePooling:.84,
      reservePaths:[nucleus,vesicleOne,vesicleTwo]}),
    wash("nucleus-lavender",nucleus,b.box(.34,.36,.34,.36),"#AFA7C4","#C8B3CF",80,
      {tone:4,opacity:.88,water:.81,edgePooling:.74}),
    wash("nucleolus",nucleolus,b.box(.468,.458,.124,.144),"#7F809D","#A39BBD",131,
      {tone:4,water:.4,edgePooling:.9}),
    wash("vesicle-one",vesicleOne,b.box(.233,.4,.114,.14),"#E2AD88","#EFCBA5",149,
      {tone:3,water:.74}),
    wash("vesicle-two",vesicleTwo,b.box(.66,.495,.12,.15),"#8BADC6","#ABD1D4",165,
      {tone:3,water:.78}),
    wash("vacuole",vacuole,b.box(.51,.708,.18,.084),"#A7B8BF","#B9D2D2",181,
      {tone:2,water:.84}),
    brush(b,"membrane-contour","#5B908F",[[.23,.37,.05],[.18,.53,.62],[.22,.73,.7],[.39,.86,.08]],197,10,
      {tone:3,dryBrush:.72}),
    brush(b,"nuclear-strand","#736F9C",[[.41,.54,.08],[.51,.45,.7],[.61,.53,.65],[.57,.61,.05]],209,6,
      {tone:4}),
  ];
}
function product(b: Artboard): PaintedLayer[] {
  const shadow = ellipse(b,.51,.87,.3,.07);
  const bottle = "M"+b.P(.34,.35)+" Q"+b.P(.34,.31)+" "+b.P(.39,.31)+" L"+b.P(.65,.31)+
    " Q"+b.P(.7,.31)+" "+b.P(.7,.36)+" L"+b.P(.7,.79)+" Q"+b.P(.7,.84)+" "+b.P(.64,.84)+
    " L"+b.P(.4,.84)+" Q"+b.P(.34,.84)+" "+b.P(.34,.79)+" Z";
  const liquid = rectangle(b,.38,.49,.28,.30);
  const cap = rectangle(b,.43,.17,.18,.13);
  const label = rectangle(b,.40,.51,.24,.18);
  return [
    wash("ground-shadow",shadow,b.box(.21,.8,.6,.14),"#9A9793","#C2BAAD",0,
      {tone:2,opacity:.46,water:.95}),
    wash("glass-body",bottle,b.box(.34,.31,.36,.53),"#B0CED3","#D4E0D4",54,
      {tone:2,opacity:.45,water:.63,edgePooling:.86,reservePaths:[label]}),
    wash("amber-liquid",liquid,b.box(.38,.49,.28,.3),"#C9915C","#E6BB8D",95,
      {tone:4,opacity:.79,water:.67,granulation:.87,edgePooling:.7,reservePaths:[label]}),
    wash("bronze-cap",cap,b.box(.43,.17,.18,.13),"#9D8372","#C4A695",135,
      {tone:5,water:.29,granulation:.91,edgePooling:.88}),
    wash("paper-label",label,b.box(.4,.51,.24,.18),"#E9DBBF","#F6EACC",170,
      {tone:1,water:.23,opacity:.57,edgePooling:.12}),
    brush(b,"glass-reflection","#E3ECE8",[[.41,.37,.03],[.41,.57,.77],[.43,.76,.07]],192,11,
      {tone:2,water:.31,dryBrush:.24}),
    brush(b,"plant-sprig","#587F6A",[[.27,.83,.05],[.22,.7,.73],[.18,.59,.06]],211,8,
      {tone:4,dryBrush:.75}),
    brush(b,"plant-leaf","#81A383",[[.22,.73,.03],[.29,.62,.85],[.36,.61,.04]],225,19,
      {tone:3,water:.53,dryBrush:.52}),
  ];
}

/** Four different semantic subjects through ONE material grammar.
 * No paintings, logos, character images or reference media are imported.
 */
export function paintedDemoSpec(genre: PaintedGenre, output: PaintedOutput, seed = 47): PaintedCompositionSpec {
  const b = board(output);
  const layers = { nature: natural, architecture: architectural, science: scientific, product }[genre](b);
  return { version: 1, width:b.width, height:b.height, seed,
    paper: {color:"#F5EFE5", tooth:.79}, layers };
}
