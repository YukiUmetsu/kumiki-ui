/**
 * FLORA1 × CP-F1 — physical sidewall at the original frontal rose petal rim.
 *
 * An upper lip is not a bright contour stroke: the adaxial face folds onto a
 * visible, shaded narrow sidewall before the abaxial underside begins.
 * Each organ shares EXACTLY its source fold's upper hinge segment and its
 * secondary return border is independently drafted with unequal width, a
 * recessed crease, broken dry-pencil glints and short cell-aligned fibres.
 *
 * Draw these narrow, opaque, medium-native sides AFTER their owning face and
 * underside. No third-party artist art, photo pixels, raster filter or SVG
 * stroke-as-fake-sidewall; opt-in anatomy only. Do not paint animated wind
 * on an unapproved still rose.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";
import {ROSE_PHYSICAL_FOLDS} from "./colored-pencil-rose-physical-folds";

type Palette=readonly [string,string,string];
type Bounds=readonly [number,number,number,number];

export interface RosePetalRimSidewall {
  readonly id:"rose-rim-front-left"|"rose-rim-front-right";
  readonly faceId:"petal-front-left"|"petal-front-right";
  /** The physical outer boundary, byte-identical to the petal's fold hinge. */
  readonly hinge:string;
  /** Closed, nonzero area. Reverse edge varies in cuticle/mesophyll depth. */
  readonly path:string;
  readonly bounds:Bounds;
  readonly palette:Palette;
  readonly direction:number;
  readonly flow:number;
  readonly contactShadow:string;
  readonly interruptedGlints:string;
  readonly transverseFibres:string;
  readonly reflectedCuticle:string;
}

/** These are original sidewall silhouettes with a several-paper-unit depth.
 * The lip's proximal and distal ends approach zero thickness; the middle
 * thickens irregularly and curls. Crucially, no source petal silhouette,
 * original detail, or formerly reviewed overlap is substituted.
 */
export const ROSE_PETAL_RIM_SIDEWALLS:readonly RosePetalRimSidewall[]=[
  {
    id:"rose-rim-front-left",faceId:"petal-front-left",
    hinge:"M176 184 C179 169 193 154 209 154 C225 156 237 171 244 187",
    path:"M176 184 C179 169 193 154 209 154 C225 156 237 171 244 187 C242 190 239 186 237 181 C228 169 217 161 208 160 C198 158 188 174 179 185 Q177 190 176 184 Z",
    bounds:[174,151,74,43],
    palette:["#D18A98","#7F3952","#EFB3B8"],
    direction:14,flow:12,
    contactShadow:"M180 184 C190 166 198 159 209 158 M214 160 C223 164 232 173 238 183",
    interruptedGlints:"M185 177 Q196 160 205 157 M214 159 Q221 160 227 168 M231 174 L235 180",
    transverseFibres:"M192 166 L194 168 M200 159 L201 162 M220 166 L218 169 M230 177 L228 179",
    reflectedCuticle:"M183 185 Q188 172 194 169 M205 160 Q211 158 216 162",
  },
  {
    id:"rose-rim-front-right",faceId:"petal-front-right",
    hinge:"M247 189 C257 176 273 163 288 164 C307 162 322 181 327 192",
    path:"M247 189 C257 176 273 163 288 164 C307 162 322 181 327 192 C326 195 323 191 320 187 C310 176 299 167 288 169 C276 167 262 181 252 192 Q248 194 247 189 Z",
    bounds:[244,160,86,37],
    palette:["#CE8392","#71314C","#F1B7B7"],
    direction:-12,flow:-11,
    contactShadow:"M252 189 C262 177 277 166 288 167 M296 167 Q311 173 322 190",
    interruptedGlints:"M253 186 C262 175 271 169 278 167 M284 166 L290 165 M300 168 Q310 175 315 181",
    transverseFibres:"M263 180 L265 182 M275 171 L277 174 M292 164 L291 168 M308 174 L305 175 M318 186 L315 184",
    reflectedCuticle:"M248 190 Q254 185 258 182 M282 168 Q286 167 291 169",
  },
] as const;

function pencil(id:string,path:string,color:string,width:number,
  opacity:number,startFrame:number,durationFrames:number):PencilTrace{
  return {id,path,color,width,opacity,startFrame,durationFrames};
}
export function rosePetalRimContacts(side:RosePetalRimSidewall):PencilTrace[]{
  const prefix=side.id+"-";
  return [
    pencil(prefix+"recess",side.contactShadow,"#73364E",.43,.50,188,54),
    pencil(prefix+"light",side.interruptedGlints,"#FED9CD",.33,.59,245,48),
    pencil(prefix+"fibres",side.transverseFibres,"#AE5975",.28,.47,216,49),
    pencil(prefix+"bounce",side.reflectedCuticle,"#ECA8AD",.34,.43,263,43),
  ];
}
export function inspectRosePetalRimSidewalls():string[]{
  const issues:string[]=[];
  if(ROSE_PETAL_RIM_SIDEWALLS.length!==2)
    issues.push("Exactly two independent upper front petal sidewalls required");
  const ids=new Set<string>();
  for(const side of ROSE_PETAL_RIM_SIDEWALLS){
    if(ids.has(side.id))issues.push("Duplicate rim sidewall "+side.id);
    ids.add(side.id);
    const fold=ROSE_PHYSICAL_FOLDS.find(f=>f.id===side.faceId);
    if(!fold||fold.hinge!==side.hinge||!side.path.startsWith(side.hinge))
      issues.push("Rim must share the EXACT source fold hinge: "+side.id);
    if(!side.path.startsWith("M")||!side.path.endsWith(" Z")||
      /NaN|Infinity/.test(side.path)||side.path.length>12000||
      !side.path.includes(" Q"))
      issues.push("Missing genuinely closed thickness surface: "+side.id);
    if(side.bounds.length!==4||!side.bounds.every(Number.isFinite)||
      side.bounds[2]<25||side.bounds[3]<10||
      side.bounds.some(n=>n<0||n>4096))
      issues.push("Invalid physical sidewall bounds: "+side.id);
    if(side.palette.length!==3||
      side.palette.some(c=>!/^#[\da-f]{6}$/i.test(c)))
      issues.push("Missing distinct dry color families: "+side.id);
    if(!Number.isFinite(side.direction)||!Number.isFinite(side.flow))
      issues.push("Missing local rim pencil flow: "+side.id);
    const contacts=rosePetalRimContacts(side);
    if(contacts.length!==4||contacts.some(t=>!t.path.startsWith("M")||
      typeof t.opacity!=="number"||!Number.isFinite(t.opacity)||t.opacity<=0||
      !Number.isSafeInteger(t.startFrame)||t.startFrame<160||
      t.startFrame+t.durationFrames>335||t.path.length>12000))
      issues.push("Invalid time-addressed dry sidewall contacts: "+side.id);
  }
  return issues;
}
