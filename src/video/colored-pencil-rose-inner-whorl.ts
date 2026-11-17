/**
 * CP-F1 × FLORA1 — authored nested inner rose whorl, not a generic spiral stamp.
 *
 * Double-flowered roses arrange increasingly short petals around a deeply
 * shaded recess. Each original bounded surface here has its own attachment,
 * curl, occlusion, material and four pressure-timed pencil contacts.
 * Technique/morphology references are recorded in the companion research note.
 * Experimental: OFF for all production defaults pending independent 1× review.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";

type Bounds=readonly [number,number,number,number];
type Palette=readonly [string,string,string];

export interface RoseInnerWhorlOrgan {
  readonly id:string;
  readonly surface:"petal";
  readonly path:string;
  readonly bounds:Bounds;
  readonly palette:Palette;
  readonly direction:number;
  readonly flow:number;
  readonly details:readonly PencilTrace[];
}
type Contact=readonly [string,string,number,number,number];
const strokes=(id:string,passes:readonly Contact[]):readonly PencilTrace[]=>
  passes.map(([path,color,width,opacity,startFrame],index)=>({
    id:"rw-"+id+"-"+index,path,color,width,opacity,
    startFrame,durationFrames:46,
  }));

/** Painting order: shaded cup -> left turn -> right turn -> front scroll.
 * These are four independently authored concave or reflexed physical laminae,
 * rather than four rotations of a shared wedge or a stroke-only dark line.
 * The existing inner-fold and heart sources stay in the drawing unchanged.
 */
export const ROSE_INNER_WHORL_ORGANS:readonly RoseInnerWhorlOrgan[]=[
  {
    id:"rose-whorl-recess",surface:"petal",
    path:"M216 159 C216 145 229 134 245 135 C261 129 284 138 293 150 C289 161 276 169 262 177 C242 186 223 174 216 159 Z",
    bounds:[212,126,85,63],palette:["#923751","#451733","#B65B70"],
    direction:14,flow:25,
    details:strokes("recess",[
      ["M220 155 C227 139 240 140 252 139 C270 138 282 145 288 151","#481B38",1.15,.74,170],
      ["M225 164 Q234 177 251 175 Q277 167 286 153","#623049",.8,.66,198],
      ["M227 151 C241 141 254 147 268 144 M238 170 Q258 170 271 157","#C77E89",.48,.4,226],
      ["M224 158 Q231 148 239 145 M276 148 Q282 152 279 159","#F1A5AC",.35,.36,257],
    ]),
  },
  {
    id:"rose-whorl-left",surface:"petal",
    path:"M219 163 C214 152 226 139 244 140 C252 142 251 147 245 153 C237 162 235 172 245 183 C232 181 222 174 219 163 Z",
    bounds:[213,137,42,50],palette:["#C3667A","#71334D","#F1ACAA"],
    direction:53,flow:24,
    details:strokes("left",[
      ["M220 160 C226 147 235 141 244 144","#F3BFBB",.84,.68,171],
      ["M227 154 C223 163 230 177 242 180","#6F314C",.78,.7,200],
      ["M232 151 Q228 161 233 166 M238 147 Q236 153 237 156","#9A4762",.45,.49,231],
      ["M218 159 L221 154 M224 149 L229 145 M235 142 L239 141","#FFE2C6",.32,.57,260],
    ]),
  },
  {
    id:"rose-whorl-right",surface:"petal",
    path:"M245 144 C259 133 277 134 287 145 C295 151 290 164 279 170 C266 177 251 172 246 161 C257 165 273 162 279 152 C269 142 255 146 245 151 Z",
    bounds:[242,130,53,49],palette:["#DA7B85","#78314D","#F7B5AB"],
    direction:-43,flow:-23,
    details:strokes("right",[
      ["M249 145 Q269 133 283 147 Q291 155 282 164","#FFD2BC",.86,.7,173],
      ["M248 160 C259 173 278 171 286 156","#712A46",1.08,.72,202],
      ["M260 141 Q271 146 276 153 M255 166 Q266 169 273 164","#B85872",.46,.5,231],
      ["M252 148 L259 145 M267 139 L271 140 M283 146 L286 151","#FFE2CD",.33,.5,259],
    ]),
  },
  {
    id:"rose-whorl-scroll",surface:"petal",
    path:"M232 169 C233 159 242 151 251 152 C259 150 269 157 268 166 C268 174 259 182 250 183 C242 180 239 174 244 168 C249 162 256 164 257 169 Q251 175 247 171 Q246 169 249 167 C242 165 237 171 232 169 Z",
    bounds:[229,147,43,40],palette:["#DB8190","#662742","#FFE0C7"],
    direction:34,flow:19,
    details:strokes("scroll",[
      ["M234 168 C239 156 248 154 254 155 C262 155 267 160 265 165","#FFE1C9",.72,.75,177],
      ["M249 181 Q260 180 264 170 Q260 159 252 161 Q244 164 247 170","#682743",.78,.78,205],
      ["M238 166 Q239 160 244 158 M254 178 Q261 174 260 169","#A94E69",.45,.52,237],
      ["M234 170 L237 164 M242 156 L247 154 M263 160 L266 164","#FFE5CE",.3,.55,266],
    ]),
  },
] as const;

export function inspectRoseInnerWhorl():string[]{
  const issues:string[]=[];
  if(ROSE_INNER_WHORL_ORGANS.length!==4)
    issues.push("Inner whorl requires four independently authored nested petals");
  const ids=new Set<string>();
  for(const organ of ROSE_INNER_WHORL_ORGANS){
    if(ids.has(organ.id))issues.push("Duplicate whorl organ "+organ.id);
    ids.add(organ.id);
    if(!/^M.+ Z$/.test(organ.path)||!organ.path.includes("C")||
      /NaN|Infinity|<image|url\(/.test(organ.path)||organ.path.length>12000)
      issues.push("Invalid closed curved whorl path: "+organ.id);
    const b=organ.bounds;
    if(b.length!==4||!b.every(Number.isFinite)||b[2]<=10||b[3]<=10||
       b[0]<200||b[1]<120||b[0]+b[2]>320||b[1]+b[3]>200)
      issues.push("Whorl surface escapes the source flower center: "+organ.id);
    if(organ.details.length!==4)issues.push("Four optical passes required: "+organ.id);
    for(const detail of organ.details){
      if(!detail.path.startsWith("M")||!/^#[0-9A-Fa-f]{6}$/.test(detail.color)||
        !Number.isFinite(detail.width)||detail.width<.2||detail.width>2||
        (typeof detail.opacity!=="number"||!Number.isFinite(detail.opacity)||detail.opacity<=0||detail.opacity>1)||
        !Number.isSafeInteger(detail.startFrame)||detail.startFrame<160||
        !Number.isSafeInteger(detail.durationFrames)||detail.durationFrames<8)
        issues.push("Invalid whorl pencil contact: "+organ.id);
    }
  }
  return issues;
}
