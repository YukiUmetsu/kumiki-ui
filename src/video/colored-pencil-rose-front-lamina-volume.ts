/**
 * CP-F1 × FLORA1 — source-native rounded frontal rose lamina construction.
 *
 * The previous paired front faces closed as sharp near-triangular wedges.
 * Real rose petals expand across a rounded abaxial/adaxial belly and bend at
 * different rates between the attached proximal neck and distal perimeter.
 * Experimental, OFF by default; never copy or sample any reference painting.
 *
 * Source observation: Karen Elaine Evans' original Pink Rose (Artfinder),
 * Ann Swan botanical colored pencil, and peer-reviewed rose petal asymmetry
 * in Plant Cell 33 (2021). All are technique/morphology-only references.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";
import {ROSE_PHYSICAL_FOLDS} from "./colored-pencil-rose-physical-folds";

type Bounds=readonly [number,number,number,number];
export interface RoseFrontLaminaVolume {
  readonly id:"petal-front-left"|"petal-front-right";
  /** Reconstructed solid lamina face, NEVER a transient colored overlay. */
  readonly face:string;
  readonly bounds:Bounds;
  /** Byte-identical source attachment to the older abaxial face and sidewall. */
  readonly hinge:string;
  /** Anatomically placed secondary contacts within the facing lamina. */
  readonly contacts:readonly PencilTrace[];
}
const line=(id:string,path:string,color:string,width:number,
  opacity:number,startFrame:number,durationFrames:number):PencilTrace=>
  ({id,path,color,width,opacity,startFrame,durationFrames});

/** The two separate contours do NOT mirror each other.
 * Left: outward/downward convex overhang under the heart, then a shallow
 * return to the stem-side fold.
 * Right: longer flexed shoulder, wide outside convexity, shorter infolded
 * medial edge; shared original rim hinge is deliberately unchanged.
 */
export const ROSE_FRONT_LAMINA_VOLUME:readonly RoseFrontLaminaVolume[]=[
  {
    id:"petal-front-left",
    hinge:"M176 184 C179 169 193 154 209 154 C225 156 237 171 244 187",
    face:"M176 184 C179 169 193 154 209 154 C225 156 237 171 244 187 C252 202 260 212 261 223 C265 236 259 250 260 258 C260 267 250 274 243 274 C221 271 204 261 189 248 C176 236 170 225 169 211 C167 198 170 189 176 184 Z",
    bounds:[164,149,103,129],
    contacts:[
      line("rbl-left-crescent","M236 195 C243 211 248 224 249 238 C249 249 251 257 248 265",
        "#792D4C",.51,.37,195,72),
      line("rbl-left-rosy-turn","M232 201 C238 216 243 232 240 243 C239 253 241 259 244 265",
        "#E89BA6",.39,.41,241,58),
      line("rbl-left-subvein","M182 213 C191 230 207 247 220 252 M187 218 Q198 234 206 238",
        "#B45A74",.33,.35,226,62),
      line("rbl-left-glance","M179 187 Q183 173 194 163 M198 161 Q206 158 211 160",
        "#F7C7C1",.32,.47,264,43),
    ],
  },
  {
    id:"petal-front-right",
    hinge:"M247 189 C257 176 273 163 288 164 C307 162 322 181 327 192",
    face:"M247 189 C257 176 273 163 288 164 C307 162 322 181 327 192 C338 204 339 220 330 236 C324 250 310 262 291 267 C270 274 256 274 241 276 C244 265 252 254 257 243 C263 230 263 217 257 205 C252 196 249 192 247 189 Z",
    bounds:[235,157,110,123],
    contacts:[
      line("rbl-right-crescent","M259 198 C265 212 271 229 266 242 C262 252 253 267 247 272",
        "#7A2B49",.58,.37,197,68),
      line("rbl-right-luminous","M265 206 C271 222 271 231 265 241 Q259 257 251 266",
        "#EDA3A9",.42,.45,244,58),
      line("rbl-right-subvein","M317 211 C315 228 304 246 286 257 M321 220 Q311 246 302 249",
        "#B75B77",.35,.35,230,57),
      line("rbl-right-glance","M288 164 Q301 162 310 174 M314 179 Q322 185 326 195",
        "#F7C8C0",.33,.49,266,41),
    ],
  },
] as const;

/** Fail closed if original physical seams/cuticle walls are detached or
 * authored contacts lose their temporal/source discipline.
 */
export function inspectRoseFrontLaminaVolume():string[]{
  const issues:string[]=[];
  const seen=new Set<string>();
  if(ROSE_FRONT_LAMINA_VOLUME.length!==2)
    issues.push("Need two original asymmetrically curved frontal laminae");
  for(const source of ROSE_FRONT_LAMINA_VOLUME){
    const previous=ROSE_PHYSICAL_FOLDS.find(f=>f.id===source.id);
    if(seen.has(source.id))issues.push("Duplicate front lamina "+source.id);
    seen.add(source.id);
    if(!previous||source.hinge!==previous.hinge||
      !source.face.startsWith(previous.hinge)||
      source.face===previous.face)
      issues.push("Front volume breaks original shared upper hinge: "+source.id);
    if(!/^M.+ Z$/.test(source.face)||source.face.length>12000||
      source.face.split("C").length<8||
      /NaN|Infinity|<image|url\(/.test(source.face))
      issues.push("Invalid source-curved frontal face "+source.id);
    const b=source.bounds;
    if(b.length!==4||!b.every(Number.isFinite)||b[2]<80||b[3]<95||
       b[0]<150||b[1]<130||b[0]+b[2]>365||b[1]+b[3]>300)
      issues.push("Frontal volume exceeds anatomical local bounds: "+source.id);
    if(source.contacts.length!==4)issues.push("Missing four individual dry deposits "+source.id);
    const marks=new Set<string>();
    for(const trace of source.contacts){
      if(!trace.id||marks.has(trace.id))issues.push("Duplicate local mark "+source.id);
      marks.add(trace.id??"");
      if(!trace.path.startsWith("M")||
        trace.path.length>12000||
        !/^#[0-9a-f]{6}$/i.test(trace.color)||
        !Number.isFinite(trace.width)||trace.width<.2||trace.width>.9||
        typeof trace.opacity!=="number"||
        !Number.isFinite(trace.opacity)||trace.opacity<=0||trace.opacity>.75||
        !Number.isSafeInteger(trace.startFrame)||trace.startFrame<185||
        !Number.isSafeInteger(trace.durationFrames)||trace.durationFrames<8||
        trace.startFrame+trace.durationFrames>335)
        issues.push("Invalid pressure-timed front fold pencil mark "+source.id);
    }
  }
  return issues;
}
