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
      ["M222 158 C231 143 244 142 255 141 M265 143 Q281 147 285 152","#4E2540",.89,.65,170],
      ["M225 164 Q234 177 251 175 Q277 167 286 153","#623049",.8,.66,198],
      ["M227 151 C241 141 254 147 268 144 M238 170 Q258 170 271 157","#C77E89",.48,.4,226],
      ["M225 158 Q231 149 237 147 M276 150 Q281 154 278 159","#CF8298",.28,.28,257],
    ]),
  },
  {
    id:"rose-whorl-left",surface:"petal",
    path:"M219 163 C214 152 226 139 244 140 C252 142 251 147 245 153 C237 162 235 172 245 183 C232 181 222 174 219 163 Z",
    bounds:[213,137,42,50],palette:["#AA4B65","#55243F","#D18194"],
    direction:53,flow:24,
    details:strokes("left",[
      ["M221 157 Q227 148 235 144 M238 143 L241 144","#D998A4",.63,.39,171],
      ["M227 154 C223 163 230 177 242 180","#6F314C",.78,.7,200],
      ["M232 151 Q228 161 233 166 M238 147 Q236 153 237 156","#9A4762",.45,.49,231],
      ["M219 160 L222 155 M226 150 L229 148 M235 144 L237 143","#DFACAE",.29,.36,260],
    ]),
  },
  {
    id:"rose-whorl-right",surface:"petal",
    path:"M245 144 C259 133 277 134 287 145 C295 151 290 164 279 170 C266 177 251 172 246 161 C257 165 273 162 279 152 C269 142 255 146 245 151 Z",
    bounds:[242,130,53,49],palette:["#B65871","#602946","#D7899B"],
    direction:-43,flow:-23,
    details:strokes("right",[
      ["M251 146 Q258 139 266 141 M273 143 Q282 147 285 152 M286 156 Q284 160 282 161","#E19FAA",.61,.41,173],
      ["M248 160 C259 173 278 171 286 156","#712A46",1.08,.72,202],
      ["M260 141 Q271 146 276 153 M255 166 Q266 169 273 164","#B85872",.46,.5,231],
      ["M253 148 L257 146 M269 141 L271 142 M284 149 L285 152","#DFA4AB",.28,.33,259],
    ]),
  },
  {
    id:"rose-whorl-scroll",surface:"petal",
    path:"M232 171 C235 159 244 152 258 154 C265 153 273 162 271 170 C269 179 257 185 247 183 C241 181 242 176 247 173 C254 170 260 174 264 169 C261 161 250 160 244 166 Q240 173 232 171 Z",
    bounds:[229,147,43,40],palette:["#B65975","#58253F","#D98EA0"],
    direction:34,flow:19,
    details:strokes("scroll",[
      ["M237 165 Q245 154 255 157 M260 158 Q265 161 266 166","#E8A7B2",.62,.43,177],
      ["M244 170 Q251 158 261 165 Q270 173 257 180","#5B2944",.72,.68,205],
      ["M238 166 Q241 157 248 158 M252 179 Q260 178 264 172","#A94E69",.45,.5,237],
      ["M234 169 L238 164 M246 156 L249 155 M264 161 L267 165","#E8B2B3",.3,.4,266],
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
