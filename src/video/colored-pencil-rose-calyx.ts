/**
 * Original CP-F1 / FLORA1 rose calyx, native art coordinates.
 * Read-only study geometry: no external image or traced third-party contour.
 * A five-sepal whorl is physically rooted on a shaped receptacle; it is
 * intentionally opt-in until source-matched visual approval.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";

export interface RoseCalyxOrgan {
  readonly id:string;
  readonly path:string;
  readonly bounds:readonly [number,number,number,number];
  readonly palette:readonly [string,string,string];
  readonly direction:number;
  readonly flow:number;
  readonly details:readonly PencilTrace[];
}
function fibre(path:string,color:string,width:number,startFrame=209,opacity=.72):PencilTrace{
  return {path,color,width,opacity,startFrame,durationFrames:53};
}

/** Petal-facing side is above y=281, stalk attachment is below y=316.
 * All five tapering leaf-like sepals converge at the receptacle rather than
 * floating as detached triangular symbols below the flower. */
export const ROSE_CALYX_ORGANS: readonly RoseCalyxOrgan[]=[
  {
    id:"calyx-receptacle",
    path:"M221 286 C232 291 259 290 273 282 C272 298 263 314 253 323 Q245 327 237 319 C230 311 224 298 221 286 Z",
    bounds:[220,280,56,49],palette:["#66825B","#384F46","#B5C08E"],
    direction:80,flow:17,
    details:[
      fibre("M231 291 Q239 305 245 317 M260 291 Q257 307 251 318","#D3D6A1",.84,211,.75),
      fibre("M232 302 Q241 312 250 314","#425C4A",.7,226,.63),
      fibre("M244 294 Q245 306 247 313","#BDD198",.55,239,.77),
    ],
  },
  {
    id:"calyx-sepal-far-left",
    path:"M242 300 C220 289 189 274 165 250 C172 274 192 299 217 309 C230 313 238 309 242 300 Z",
    bounds:[162,247,85,69],palette:["#718961","#3D5946","#C0C996"],
    direction:34,flow:21,
    details:[
      fibre("M174 263 Q199 291 239 303","#D4DBAC",1.02,211,.85),
      fibre("M189 277 Q196 274 202 276 M205 290 Q216 286 225 291","#405C4B",.58,230,.66),
      fibre("M177 269 Q186 281 195 288","#ACBC82",.7,241,.7),
    ],
  },
  {
    id:"calyx-sepal-far-right",
    path:"M252 300 C276 286 301 268 319 247 C314 276 295 297 270 308 C259 310 253 307 252 300 Z",
    bounds:[249,243,74,72],palette:["#819569","#435C48","#CCD3A0"],
    direction:-33,flow:-20,
    details:[
      fibre("M258 301 Q288 288 313 260","#D5DAA7",1.04,211,.88),
      fibre("M280 288 Q283 281 282 274 M298 275 Q303 278 309 275","#3D5E4C",.61,231,.67),
      fibre("M270 298 Q287 291 301 277","#B5C78F",.65,242,.77),
    ],
  },
  {
    id:"calyx-sepal-near-left",
    path:"M246 311 C232 290 221 269 213 251 C209 278 218 301 236 316 C243 319 247 315 246 311 Z",
    bounds:[208,248,42,74],palette:["#6D865A","#345045","#D3D7A1"],
    direction:68,flow:13,
    details:[
      fibre("M218 265 Q229 292 244 312","#D2D9A0",.88,212,.82),
      fibre("M219 284 Q226 282 232 285 M229 303 Q236 300 240 302","#3E5B4A",.55,230,.64),
    ],
  },
  {
    id:"calyx-sepal-near-right",
    path:"M248 313 C267 300 279 277 287 254 C291 282 279 307 256 319 Q249 321 248 313 Z",
    bounds:[246,251,47,71],palette:["#728D60","#395648","#C8D29B"],
    direction:-61,flow:-14,
    details:[
      fibre("M252 314 Q276 294 285 264","#D8D8A6",.89,212,.86),
      fibre("M262 301 Q270 301 274 295 M278 282 Q284 281 286 276","#355449",.57,231,.66),
    ],
  },
  {
    id:"calyx-sepal-axial",
    path:"M248 320 C241 295 237 270 242 249 C252 274 260 296 253 318 Q251 323 248 320 Z",
    bounds:[236,246,26,79],palette:["#7D9568","#405D4B","#C8D49D"],
    direction:87,flow:8,
    details:[
      fibre("M244 260 Q249 291 250 319","#DCE1AD",.81,213,.82),
      fibre("M242 277 Q246 275 251 279 M246 297 Q251 294 256 298","#435D4A",.53,232,.68),
    ],
  },
] as const;
export const ROSE_CALYX_SEPAL_IDS:readonly string[]=
  ROSE_CALYX_ORGANS.filter(o=>o.id.startsWith("calyx-sepal-")).map(o=>o.id);

export function validateRoseCalyxOrgans():string[]{
  const issues:string[]=[];
  const ids=new Set<string>();
  for(const organ of ROSE_CALYX_ORGANS){
    if(ids.has(organ.id))issues.push("Duplicate calyx organ: "+organ.id);
    ids.add(organ.id);
    if(!organ.path.startsWith("M")||!organ.path.endsWith("Z")||
      /NaN|Infinity/.test(organ.path))issues.push("Invalid calyx closed contour: "+organ.id);
    if(!organ.bounds.every(v=>Number.isFinite(v))||
      organ.bounds[2]<=0||organ.bounds[3]<=0)issues.push("Invalid bounds: "+organ.id);
    if(organ.details.length<2)issues.push("Missing calyx micro-veins: "+organ.id);
  }
  if(ROSE_CALYX_SEPAL_IDS.length!==5)issues.push("Expected exactly five distinct attached sepals");
  return issues;
}
