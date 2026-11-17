/**
 * CP-F1 × FLORA1 | true source-local proximal heels for two frontal Rosa
 * laminae. ART HOLD: anatomical construction, not photograph registration.
 *
 * An actual rose petal turns inward at its proximal attachment; it cannot
 * terminate as an isolated sharp triangular slash above the calyx. These
 * are complete replacements of TWO already existing solid petal faces,
 * sharing their byte-identical upper hinges with the real underside regions.
 *
 * Authentic morphological references (no copied pixels or paths):
 * - Mustang Joe, "Pink Rose" (2024), CC0 Wikimedia Commons, oblique
 *   folded lamina, unequal lower returns and a rounded basal contact.
 * - Robertson, Illinois Natural History Survey, Rosa longitudinal section:
 *   petals/sepal insertion onto one continuous floral cup.
 * Artist reference: Ann Swan's botanical coloured pencil portfolio.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";
import {ROSE_FRONT_LAMINA_VOLUME} from "./colored-pencil-rose-front-lamina-volume";

type Bounds=readonly [number,number,number,number];
export interface RoseProximalHeel {
  readonly id:"petal-front-left"|"petal-front-right";
  /** Complete source lamina, not an extra underpaint or sticker. */
  readonly face:string;
  readonly bounds:Bounds;
  /** The exact shared hinge of the existing front and underturned cuticle. */
  readonly hinge:string;
  readonly contacts:readonly PencilTrace[];
}
const dry=(id:string,path:string,color:string,width:number,
  opacity:number,startFrame:number,durationFrames:number):PencilTrace=>({
    id,path,color,width,opacity,startFrame,durationFrames,
  });

/** Distinct soft proximal turns. Leave every upper petal, rim, root,
 * optical-value field, pre-existing stroke, pigment seed and five sepals
 * untouched. All new paths draw within the actual original face, not on top.
 */
export const ROSE_PROXIMAL_HEELS:readonly RoseProximalHeel[]=[
  {
    id:"petal-front-left",
    hinge:"M176 184 C179 169 193 154 209 154 C225 156 237 171 244 187",
    face:"M176 184 C179 169 193 154 209 154 C225 156 237 171 244 187 C252 202 260 212 261 223 C265 236 259 250 260 258 C262 268 257 275 249 279 C243 282 231 278 223 274 C208 269 193 258 181 245 C171 232 167 218 169 206 C169 196 171 189 176 184 Z",
    bounds:[164,149,103,136],
    contacts:[
      dry("rheel-left-root-penumbra",
        "M225 270 C234 274 241 276 249 275",
        "#7C3550",.44,.34,199,67),
      dry("rheel-left-warm-fibre",
        "M211 260 Q228 271 239 272 M220 264 Q235 273 243 274",
        "#E7A2A8",.34,.44,252,53),
      dry("rheel-left-cup-return",
        "M242 278 Q251 277 254 270",
        "#F4C8B6",.29,.47,269,41),
    ],
  },
  {
    id:"petal-front-right",
    hinge:"M247 189 C257 176 273 163 288 164 C307 162 322 181 327 192",
    face:"M247 189 C257 176 273 163 288 164 C307 162 322 181 327 192 C338 204 339 220 330 236 C324 250 309 262 291 267 C275 272 261 276 251 280 C244 282 238 279 242 272 C246 262 252 253 257 243 C263 230 263 217 257 205 C252 196 249 192 247 189 Z",
    bounds:[235,157,110,129],
    contacts:[
      dry("rheel-right-root-penumbra",
        "M243 272 C246 276 248 278 253 277",
        "#6B3049",.47,.39,201,63),
      dry("rheel-right-return-light",
        "M255 274 Q267 270 283 266 M260 273 Q269 269 275 268",
        "#F1B4B0",.33,.49,253,52),
      dry("rheel-right-fine-cuticle",
        "M244 273 Q245 279 250 278",
        "#F9D0BE",.28,.51,272,38),
    ],
  },
] as const;

/** Syntax, material and independent source hinge checks. Browser e2e
 * independently checks actual SVG fill, z-order and pixel restoration.
 */
export function inspectRoseProximalHeels():string[]{
  const issues:string[]=[];
  const ids=new Set<string>();
  if(ROSE_PROXIMAL_HEELS.length!==2)
    issues.push("Two distinct proximal petal heels required");
  for(const heel of ROSE_PROXIMAL_HEELS){
    if(ids.has(heel.id))issues.push("Duplicate proximal heel "+heel.id);
    ids.add(heel.id);
    const prior=ROSE_FRONT_LAMINA_VOLUME.find(v=>v.id===heel.id);
    if(!prior||heel.hinge!==prior.hinge||
      !heel.face.startsWith(prior.hinge)||heel.face===prior.face)
      issues.push("Proximal heel breaks independent underturn hinge "+heel.id);
    if(!/^M[\\d .CQ-]+ Z$/.test(heel.face)||
      heel.face.length>12000||heel.face.split("C").length<9||
      /NaN|Infinity|<image|url\\(/.test(heel.face))
      issues.push("Invalid complete closed heel source "+heel.id);
    const [x,y,w,h]=heel.bounds;
    if(!heel.bounds.every(Number.isFinite)||
      x<155||x>245||y<142||y>176||
      w<90||w>140||h<115||h>150||x+w>365||y+h>310)
      issues.push("Heel exits real rose native bounds "+heel.id);
    const marks=new Set<string>();
    if(heel.contacts.length!==3)
      issues.push("Need three short, independent source-clipped dry marks "+heel.id);
    for(const trace of heel.contacts){
      if(!trace.id||marks.has(trace.id)||!trace.id.startsWith("rheel-")||
        !trace.path.startsWith("M")||trace.path.length>12000||
        !/^#[0-9A-Fa-f]{6}$/.test(trace.color)||
        !Number.isFinite(trace.width)||trace.width<.2||trace.width>.7||
        typeof trace.opacity!=="number"||!Number.isFinite(trace.opacity)||
        trace.opacity<=0||trace.opacity>.65||
        !Number.isSafeInteger(trace.startFrame)||trace.startFrame<185||
        !Number.isSafeInteger(trace.durationFrames)||trace.durationFrames<8||
        trace.startFrame+trace.durationFrames>335)
        issues.push("Invalid proximal heel dry fibre "+heel.id);
      marks.add(trace.id??"");
    }
  }
  return issues;
}
