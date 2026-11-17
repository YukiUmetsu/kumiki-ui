/**
 * CP-F1 × FLORA1 — experimental real-face outer rose petal edge relief.
 *
 * The earlier source faces were pointed, almost rigid opposed triangular
 * lobes. Here the two *full opaque source laminae* receive independently
 * asymmetrical distal margin scallops, bowed shoulders and a rounder broad
 * return, not a painted or filtered sticker. Their original upper seam is
 * EXACTLY shared with the still-unchanged physically separate reverse face.
 *
 * Botanical art and real-form observations:
 * - Sakurai Midori, Rosa chinensis petals, Wikimedia Commons (CC BY-SA).
 * - Riboim, Rosa Centifolia, Wikimedia Commons (CC0).
 * - UPOV TG/11/8 Rosa petal margin/reflexing guidance.
 * New cubic contours are original authoring, NOT traced from those photos.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";
import {ROSE_PHYSICAL_FOLDS} from "./colored-pencil-rose-physical-folds";

type Bounds=readonly [number,number,number,number];
export type RoseOuterRippleId="outer-left"|"outer-right";
export interface RoseOuterRippleSurface {
  readonly id:RoseOuterRippleId;
  /** One continuous, source-native face with three-dimensional edge flex. */
  readonly face:string;
  readonly bounds:Bounds;
  /** Exact physical upper margin also present in original abaxial surface. */
  readonly hinge:string;
  readonly contacts:readonly PencilTrace[];
}
const trace=(id:string,path:string,color:string,width:number,opacity:number,
  startFrame:number,durationFrames:number):PencilTrace=>
  ({id,path,color,width,opacity,startFrame,durationFrames});

/**
 * Distal scalloping is deliberately *not* bilateral:
 * left lip bows downward with a small mid-left notch and late heel;
 * right lip turns through a longer trailing shoulder and finer stepped rim.
 * Existing proximal attachment, source pigment seeds, z-order and original
 * underturned petal surfaces do not change.
 */
export const ROSE_OUTER_RIPPLE_SURFACES:readonly RoseOuterRippleSurface[]=[
  {
    id:"outer-left",
    hinge:"M131 170 C147 149 168 132 197 127",
    face:"M222 270 C209 272 194 269 182 268 C169 265 158 262 150 256 C142 252 136 244 135 239 C128 235 127 228 129 223 C121 217 121 207 126 200 C126 190 128 180 131 170 C147 149 168 132 197 127 C194 148 191 165 199 187 C205 205 225 227 251 244 C244 251 237 261 222 270 Z",
    bounds:[119,123,137,153],
    contacts:[
      trace("ripple-left-cuticle",
        "M126 201 Q124 208 128 215 M129 228 Q133 235 136 239 M146 252 Q153 257 161 260",
        "#F3C0B9",.34,.49,252,52),
      trace("ripple-left-occlusion",
        "M131 177 C128 191 128 204 132 214 M137 238 C143 246 154 251 164 255",
        "#74304E",.46,.41,198,61),
      trace("ripple-left-axial-turn",
        "M186 155 C181 178 191 205 211 226 C217 234 231 245 240 246",
        "#9C4A67",.39,.38,221,63),
      trace("ripple-left-lift",
        "M141 179 Q139 195 143 211 M157 241 Q174 256 191 259",
        "#EE9FAB",.39,.42,263,48),
      trace("ripple-left-fibre-breaks",
        "M148 223 L152 229 M159 233 L163 237 M178 248 L183 252 M208 253 L212 256",
        "#F5B4BC",.27,.33,282,39),
    ],
  },
  {
    id:"outer-right",
    hinge:"M305 141 C333 150 351 162 365 182",
    face:"M249 259 C272 272 295 275 315 268 C325 266 335 258 338 254 C347 252 352 244 354 239 C363 233 362 226 364 220 C367 210 364 207 365 199 C368 192 367 187 365 182 C351 162 333 150 305 141 C314 163 309 181 298 201 C288 219 261 231 236 237 C240 245 242 251 249 259 Z",
    bounds:[232,136,139,143],
    contacts:[
      trace("ripple-right-cuticle",
        "M366 197 Q367 203 364 208 M363 220 Q361 229 356 233 M348 248 Q343 253 338 255",
        "#F5C9BD",.33,.54,252,52),
      trace("ripple-right-occlusion",
        "M309 149 C323 170 323 196 306 215 M359 230 C352 243 340 249 326 255",
        "#71324F",.48,.42,199,60),
      trace("ripple-right-axial-turn",
        "M324 163 Q337 189 331 209 C328 227 302 250 281 257",
        "#B15F75",.41,.36,224,61),
      trace("ripple-right-lift",
        "M358 194 Q359 210 355 221 M344 243 Q335 259 321 260",
        "#F1A8AF",.38,.46,265,47),
      trace("ripple-right-fibre-breaks",
        "M342 211 L342 215 M332 230 L328 235 M309 247 L303 251 M284 264 L280 265",
        "#F6C1C0",.27,.35,279,42),
    ],
  },
] as const;

/** Conformance guard for the source-linked geometry. The broad lamina
 * silhouette may change, but losing the *real* physical hinge is invalid.
 */
export function inspectRoseOuterRippleSurfaces():string[]{
  const issues:string[]=[];
  const ids=new Set<string>();
  if(ROSE_OUTER_RIPPLE_SURFACES.length!==2)
    issues.push("Two asymmetric rose outer laminae required");
  for(const shape of ROSE_OUTER_RIPPLE_SURFACES){
    const old=ROSE_PHYSICAL_FOLDS.find(p=>p.id===shape.id);
    if(ids.has(shape.id))issues.push("Repeated outer lamina "+shape.id);
    ids.add(shape.id);
    if(!old||shape.hinge!==old.hinge||
      !old.underside.includes(old.hinge)||
      !shape.face.includes(shape.hinge)||shape.face===old.face)
      issues.push("Detached real rose outer cuticle hinge: "+shape.id);
    if(!/^M[\d\s.CQZ-]+Z$/.test(shape.face)||
      shape.face.split("C").length<10||
      /NaN|Infinity|<image|url\(/.test(shape.face)||
      shape.face.length>12000)issues.push("Invalid outer petal source contour "+shape.id);
    const [x,y,w,h]=shape.bounds;
    if(shape.bounds.length!==4||!shape.bounds.every(Number.isFinite)||
      x<110||x>240||y<110||y>150||w<120||w>150||
      h<135||h>170||x+w>390||y+h>320)
      issues.push("Unexpected rose outer source extent "+shape.id);
    if(shape.contacts.length!==5)
      issues.push("Five individually authored lamina micros required "+shape.id);
    const seen=new Set<string>();
    for(const mark of shape.contacts){
      if(!mark.id||!mark.id.startsWith("ripple-")||seen.has(mark.id))
        issues.push("Duplicate or unbound rim mark "+shape.id);
      seen.add(mark.id??"");
      if(!mark.path.startsWith("M")||mark.path.length>12000||
        !/^#[\da-f]{6}$/i.test(mark.color)||
        !Number.isFinite(mark.width)||mark.width<.2||mark.width>.8||
        typeof mark.opacity!=="number"||!Number.isFinite(mark.opacity)||
        mark.opacity<.2||mark.opacity>.65||
        !Number.isSafeInteger(mark.startFrame)||mark.startFrame<185||
        !Number.isSafeInteger(mark.durationFrames)||mark.durationFrames<8||
        mark.startFrame+mark.durationFrames>335)
        issues.push("Invalid pressure-timed microcharacter "+shape.id);
    }
  }
  return issues;
}
