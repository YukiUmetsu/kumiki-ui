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
    path:"M252 159 C257 151 265 149 272 153 C279 156 282 162 279 167 C273 168 269 173 266 179 C261 176 258 171 255 166 C252 164 250 161 252 159 Z",
    bounds:[247,147,35,32],palette:["#64283F","#3D182E","#A05B70"],
    direction:8,flow:13,
    details:strokes("recess",[
      ["M253 157 Q259 151 266 151","#54233D",.76,.61,170],
      ["M273 155 Q278 159 277 164","#C17A89",.39,.36,210],
      ["M253 163 Q257 166 261 170","#5B2740",.56,.53,235],
      ["M258 162 L262 157 M265 155 L269 154","#D18E9A",.25,.27,260],
    ]),
  },
  {
    id:"rose-whorl-left",surface:"petal",
    path:"M220 163 C214 157 214 149 219 143 C223 138 230 137 235 141 C240 145 238 151 233 156 C228 162 227 168 231 174 C238 166 247 163 255 166 C261 169 264 174 266 179 C253 191 233 181 222 168 C221 166 220 164 220 163 Z",
    bounds:[212,135,55,57],palette:["#B85A70","#6B2440","#E5949F"],
    direction:54,flow:27,
    details:strokes("left",[
      ["M220 154 Q222 146 229 142","#D38A97",.55,.41,172],
      ["M224 163 Q225 170 230 174","#642640",.73,.68,199],
      ["M250 181 Q254 184 258 182","#A84B66",.43,.48,230],
      ["M222 151 L224 148 M228 143 L231 141","#E0A9AA",.26,.33,258],
    ]),
  },
  {
    id:"rose-whorl-right",surface:"petal",
    path:"M254 146 C262 137 273 134 284 140 C293 145 296 153 290 161 C285 167 276 169 267 167 C260 166 256 162 255 157 C260 157 265 154 268 150 C270 147 267 144 263 145 C259 146 257 150 255 153 C252 151 252 148 254 146 Z",
    bounds:[250,132,46,39],palette:["#C25B71","#6F2542","#F0A1AA"],
    direction:-34,flow:-20,
    details:strokes("right",[
      ["M260 144 Q270 137 280 141","#D78D9A",.55,.4,174],
      ["M286 157 Q280 165 270 166","#58213D",.79,.69,202],
      ["M260 158 Q267 161 273 156","#B65B72",.44,.49,232],
      ["M284 147 L287 151 M280 160 L278 163","#E5A8AA",.25,.32,261],
    ]),
  },
  {
    id:"rose-whorl-scroll",surface:"petal",
    path:"M231 176 C223 168 223 157 230 148 C237 140 249 137 259 141 C268 145 273 154 271 163 C269 172 261 178 251 181 C259 187 269 185 277 177 C276 189 263 195 250 192 C239 190 232 184 231 176 Z",
    bounds:[221,136,58,59],palette:["#C35B70","#70243F","#F1A2AA"],
    direction:40,flow:26,
    details:strokes("scroll",[
      ["M238 155 Q245 145 255 143","#E2A4AB",.52,.39,177],
      ["M264 151 Q270 157 267 164","#61233F",.56,.54,204],
      ["M244 172 Q252 178 262 176","#B85C73",.42,.46,235],
      ["M243 170 L248 174 M256 176 L262 175","#E7B0AE",.25,.33,264],
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
