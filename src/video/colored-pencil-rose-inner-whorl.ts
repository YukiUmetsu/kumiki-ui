/**
 * CP-F1 × FLORA1 — source-led inner rose petals, not a concentric spiral stamp.
 *
 * The flower centre is an overlap of separately facing laminae: a recessed
 * pocket, a narrow left curl, a broader right shoulder and one foreground
 * lobe. Their shoulders, tangents and occlusion roots are intentionally
 * offset. None is a rotated copy of another. Experimental; OFF by default.
 *
 * Morphology references are documented in the companion ArtCraft study.
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
    startFrame,durationFrames:42,
  }));

/** Painting order: asymmetric rear pocket -> left lifted wall -> right tucked
 * shoulder -> foreground turned petal. It is one convex lamina; the narrow reverse
 * supplies the fold, not a closed engraved C-ring.
 */
export const ROSE_INNER_WHORL_ORGANS:readonly RoseInnerWhorlOrgan[]=[
  {
    id:"rose-whorl-recess",surface:"petal",
    path:"M244 159 C241 152 245 145 253 142 C260 139 266 144 271 147 C278 145 285 144 290 150 C294 156 290 163 284 168 C279 174 275 180 268 182 C260 185 251 181 246 175 C241 170 241 164 244 159 Z",
    bounds:[239,139,56,47],palette:["#743047","#3E1A31","#9D5267"],
    direction:8,flow:13,
    details:strokes("recess",[
      ["M226 157 Q230 150 237 148","#54233D",.76,.61,170],
      ["M263 150 Q269 147 274 150","#C17A89",.39,.36,210],
      ["M249 174 Q263 183 276 178","#5B2740",.56,.53,235],
      ["M231 153 L234 150 M237 148 L239 147","#D18E9A",.25,.27,260],
    ]),
  },
  {
    id:"rose-whorl-left",surface:"petal",
    path:"M220 163 C214 157 214 149 219 143 C223 138 230 137 235 141 C240 145 238 151 233 156 C228 162 227 168 231 174 C235 180 244 183 252 184 C241 185 229 178 222 168 C221 166 220 164 220 163 Z",
    bounds:[212,135,42,51],palette:["#A84B62","#55213D","#C9798B"],
    direction:54,flow:27,
    details:strokes("left",[
      ["M220 154 Q222 146 229 142","#D38A97",.55,.41,172],
      ["M222 163 Q223 171 231 177","#642640",.73,.68,199],
      ["M238 177 Q246 183 252 184","#A84B66",.43,.48,230],
      ["M222 151 L224 148 M228 143 L231 141","#E0A9AA",.26,.33,258],
    ]),
  },
  {
    id:"rose-whorl-right",surface:"petal",
    path:"M254 145 C260 137 270 132 280 136 C289 140 294 148 291 156 C288 164 279 168 270 170 C263 171 256 167 252 162 C260 164 269 160 274 154 C271 148 264 147 258 152 C254 154 251 150 254 145 Z",
    bounds:[250,130,45,43],palette:["#B45169","#5B2340","#D17C8E"],
    direction:-41,flow:-24,
    details:strokes("right",[
      ["M259 143 Q268 137 277 140","#D78D9A",.55,.4,174],
      ["M285 158 Q280 165 271 167","#58213D",.79,.69,202],
      ["M260 159 Q267 163 273 157","#B65B72",.44,.49,232],
      ["M283 146 L286 150 M280 160 L278 162","#E5A8AA",.25,.32,261],
    ]),
  },
  {
    id:"rose-whorl-scroll",surface:"petal",
    path:"M235 174 C229 167 230 158 236 151 C242 144 250 143 257 147 C263 151 265 158 260 164 C255 170 246 176 238 178 C236 177 235 175 235 174 Z",
    bounds:[226,143,39,36],palette:["#B0526B","#57213E","#D58696"],
    direction:35,flow:22,
    details:strokes("scroll",[
      ["M239 158 Q245 149 252 148","#E2A4AB",.52,.39,177],
      ["M257 155 Q262 159 259 164","#61233F",.56,.54,204],
      ["M237 169 Q243 176 250 172","#B85C73",.42,.46,235],
      ["M234 163 L237 158 M248 147 L252 147","#E7B0AE",.25,.33,264],
    ]),
  },
] as const;

export function inspectRoseInnerWhorl():string[]{
  const issues:string[]=[];
  if(ROSE_INNER_WHORL_ORGANS.length!==4)
    issues.push("Inner whorl requires four independently authored nested petals");
  const ids=new Set<string>();
  const centres=ROSE_INNER_WHORL_ORGANS.map(o=>[
    o.bounds[0]+o.bounds[2]/2,o.bounds[1]+o.bounds[3]/2,
  ] as const);
  if(new Set(centres.map(([x,y])=>x+","+y)).size!==4)
    issues.push("Inner whorl petals must have independent off-axis centres");
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
    for(const trace of organ.details){
      if(!trace.path.startsWith("M")||trace.path.length>180||
        !/^#[0-9A-Fa-f]{6}$/.test(trace.color)||
        !Number.isFinite(trace.width)||trace.width<.2||trace.width>1||
        (typeof trace.opacity!=="number"||!Number.isFinite(trace.opacity)||trace.opacity<=0||trace.opacity>1)||
        !Number.isSafeInteger(trace.startFrame)||trace.startFrame<160||
        !Number.isSafeInteger(trace.durationFrames)||trace.durationFrames<8||
        trace.startFrame+trace.durationFrames>335)
        issues.push("Invalid whorl pencil contact: "+organ.id);
    }
  }
  return issues;
}
