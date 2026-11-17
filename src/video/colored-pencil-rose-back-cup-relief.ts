/**
 * CP-F1 / FLORA1 — original asymmetric rose rear corolla underturn and lip.
 *
 * Reference morphology: double-rose petal reflex / rear-cup scallop (UPOV
 * TG/11/8), Karen Elaine Evans' artist-owned Pink Rose and the botanical
 * coloured-pencil instruction at Draw Botanical. Technique-only observation:
 * NO reference pixels, sampled gradients or traced third-party contours.
 *
 * This is a reversible source-geometry replacement inside the existing
 * opt-in physical-folds experiment, not the production-default rose.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";

type Bounds=readonly [number,number,number,number];
type Palette=readonly [string,string,string];

export interface RoseBackCupRelief {
  readonly id:"back-cup";
  /** Individual asymmetric cuticle crest follows the real uppermost fold. */
  readonly face:string;
  readonly faceBounds:Bounds;
  /** An abaxial lamina of nonzero exposed area, not a second outline stroke. */
  readonly underside:string;
  readonly undersideBounds:Bounds;
  readonly hinge:string;
  readonly direction:number;
  readonly flow:number;
  readonly undersidePalette:Palette;
}

/** Contrast against the old smooth U-shaped rim:
 * - two unequal shoulders with staggered apices, not mirrored parabolas;
 * - the narrow apex at (220,120) lifts separately from the right at (284,119);
 * - the right-side rim tucks behind the facing petal before its outer return;
 * - back and front share the same actual source-space hinge endpoints.
 */
export const ROSE_BACK_CUP_RELIEF:RoseBackCupRelief={
  id:"back-cup",
  face:"M163 158 C169 145 175 137 187 130 C198 120 207 116 220 120 C228 111 238 110 249 117 C260 108 275 110 284 119 C298 117 307 131 315 140 C317 153 309 164 299 173 C275 193 255 202 235 193 C216 189 201 182 192 177 C178 172 168 167 163 158 Z",
  faceBounds:[157,104,165,102],
  underside:"M163 158 C157 151 155 140 163 127 C173 109 189 98 201 100 C211 86 227 82 241 91 C259 72 276 76 293 89 C312 94 329 114 329 128 C327 135 321 139 315 140 C307 131 298 117 284 119 C275 110 260 108 249 117 C238 110 228 111 220 120 C207 116 198 120 187 130 C175 137 169 145 163 158 Z",
  undersideBounds:[151,68,182,99],
  hinge:"M163 158 C169 145 175 137 187 130 C198 120 207 116 220 120 C228 111 238 110 249 117 C260 108 275 110 284 119 C298 117 307 131 315 140",
  direction:13,flow:19,
  undersidePalette:["#B76F88","#602C50","#E6A2A9"],
} as const;

const mark=(id:string,path:string,color:string,width:number,opacity:number,
  startFrame:number,durationFrames:number):PencilTrace=>
  ({id,path,color,width,opacity,startFrame,durationFrames});

/** Distinguish the cast underside contact from the selectively illuminated
 * top crest. Hairline cuts can interrupt, but must NOT erase, the broader
 * source material layers and mineral-tooth dry pigment.
 */
export function roseBackCupUndersideDetails():PencilTrace[]{
  return [
    mark("rc-relief-rear-crease",
      "M169 153 C179 132 195 120 218 116 C233 107 246 113 251 113 C270 106 290 115 310 136",
      "#55213E",.82,.68,168,54),
    mark("rc-relief-warm-cuticle",
      "M164 147 C177 126 193 117 211 116 M226 113 C234 107 241 109 249 114 M268 111 Q290 117 309 134",
      "#F1C1BB",.61,.57,230,55),
    mark("rc-relief-rear-basal-fibres",
      "M182 115 Q193 103 207 102 M213 92 Q228 92 239 101 M266 81 Q276 94 291 101",
      "#9E5673",.39,.46,212,55),
    mark("rc-relief-reflected-fibres",
      "M177 134 Q183 126 190 121 M232 88 Q238 96 243 106 M294 93 Q304 105 311 122",
      "#F7C9BE",.34,.52,256,43),
    mark("rc-relief-crest-break",
      "M197 125 L203 122 M214 117 L218 117 M255 115 L262 111 M298 124 L306 132",
      "#6C2947",.31,.42,270,35),
  ];
}

/** Face-local return shading: the short underlip is cool but the broad convex
 * face remains intact; a center seam must not become a continuous white CAD
 * outline. These marks stay clipped by the existing petal material recipe.
 */
export function roseBackCupFaceDetails():PencilTrace[]{
  return [
    mark("rc-relief-face-shadow",
      "M181 147 C203 133 215 128 227 130 M238 129 C260 125 281 132 303 145",
      "#78314D",.78,.54,193,61),
    mark("rc-relief-mid-warm",
      "M177 154 C192 163 207 169 222 174 M245 175 Q270 185 289 167",
      "#DA8096",.68,.51,221,58),
    mark("rc-relief-inner-bow",
      "M200 156 Q216 151 228 157 M273 147 Q286 151 294 159",
      "#622843",.43,.57,250,48),
    mark("rc-relief-selective-high",
      "M177 142 Q189 129 201 125 M218 123 L222 123 M255 120 Q268 117 277 121",
      "#F4BDBB",.35,.42,271,38),
    mark("rc-relief-fine-veins",
      "M202 137 L199 146 M207 143 Q216 153 217 162 M281 139 L285 150",
      "#9D5770",.32,.44,273,44),
  ];
}

export function inspectRoseBackCupRelief():string[]{
  const issues:string[]=[];
  const r=ROSE_BACK_CUP_RELIEF;
  for(const [name,path] of [["face",r.face],["underside",r.underside]]){
    if(!path.startsWith("M")||!path.endsWith(" Z")||!path.includes("C")||
      /NaN|Infinity|<image|url\(/.test(path)||path.length>12000)
      issues.push("Invalid rear cup "+name+" silhouette");
  }
  for(const bounds of [r.faceBounds,r.undersideBounds]){
    if(bounds.length!==4||!bounds.every(Number.isFinite)||
      bounds[2]<80||bounds[3]<65||
      bounds[0]<130||bounds[1]<60||
      bounds[0]+bounds[2]>370||bounds[1]+bounds[3]>230)
      issues.push("Invalid rear-cup source-space bounds");
  }
  if(!r.face.startsWith(r.hinge)||r.hinge.length<100||
    !r.underside.startsWith("M163 158")||!r.underside.includes("315 140"))
    issues.push("Detached rear-cup face-to-underturn hinge");
  for(const [name,details,count] of [
    ["underside",roseBackCupUndersideDetails(),5],
    ["face",roseBackCupFaceDetails(),5],
  ] as const){
    if(details.length!==count)issues.push("Missing "+name+" optical contacts");
    const ids=new Set<string>();
    for(const d of details){
      if(ids.has(d.id??""))issues.push("Duplicate "+name+" contact");
      ids.add(d.id??"");
      if(!d.path.startsWith("M")||d.path.length>12000||
        !/^#[0-9a-f]{6}$/i.test(d.color)||
        !Number.isFinite(d.width)||d.width<.2||d.width>1.3||
        typeof d.opacity!=="number"||d.opacity<=0||d.opacity>1||
        !Number.isSafeInteger(d.startFrame)||d.startFrame<160||
        !Number.isSafeInteger(d.durationFrames)||d.durationFrames<8)
        issues.push("Invalid "+name+" dry-pencil contact");
    }
  }
  return issues;
}
