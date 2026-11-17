/**
 * CP-F1 × FLORA1 — asymmetrically nested rose centre knot.
 *
 * Source study: close botanical rose buds (Dianne Sutherland, Bristle Studio,
 * UPOV Rosa petal reflex characteristics). A centre is a sequence of short,
 * overlapping *physical laminae* at unequal heights, not concentric engraved C
 * rings. This separate, still-unapproved art experiment keeps the canonical
 * inner whorl / heart IDs and their pigment hashes; only the explicit optical
 * study replaces their original paths and ADDS dry anatomy contacts.
 *
 * All paths below are original source-space drawings, not traced images.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";

type Palette=readonly [string,string,string];
type Bounds=readonly [number,number,number,number];
export type RoseCenterKnotId=
  "inner-fold"|"heart"|"rose-whorl-recess"|"rose-whorl-left"|
  "rose-whorl-right"|"rose-whorl-scroll";

export interface RoseCenterKnotSurface {
  readonly id:RoseCenterKnotId;
  readonly path:string;
  readonly bounds:Bounds;
  readonly palette:Palette;
  readonly direction:number;
  readonly flow:number;
  /** First material is the already-mounted three-pass source petal. */
  readonly dryContours:readonly PencilTrace[];
}
const mark=(id:string,path:string,color:string,width:number,opacity:number,
  startFrame:number,durationFrames:number):PencilTrace=>
  ({id,path,color,width,opacity,startFrame,durationFrames});

const contacts=(id:RoseCenterKnotId,paths:readonly [
    string,string,string,string,
  ]):readonly PencilTrace[]=>[
  // No uniform smooth contour ring: secondary occlusion and reflected
  // cuticle are discontinuous, narrower, and locally aligned to each organ.
  mark("rk-"+id+"-contact",paths[0],"#6C284B",.48,.53,183,51),
  mark("rk-"+id+"-dry-light",paths[1],"#F3B5BB",.37,.46,244,47),
  mark("rk-"+id+"-lamina",paths[2],"#A84B68",.34,.39,217,52),
  mark("rk-"+id+"-fibres",paths[3],"#E3A1A9",.26,.33,272,43),
];

/** The six independent source surfaces are drawn at the original petal
 * depth and keep the original legacy four contacts on each whorl organ.
 * Bespoke curves create pinched/tilted shoulders rather than repeated rings.
 */
export const ROSE_CENTER_KNOT_SURFACES:readonly RoseCenterKnotSurface[]=[
  {
    id:"inner-fold",
    path:"M207 156 C213 146 224 143 234 147 C243 142 250 140 257 143 C268 136 278 141 286 149 C296 150 298 161 303 165 C288 166 282 177 266 179 C253 175 245 178 236 183 C226 174 215 171 207 156 Z",
    bounds:[203,133,105,54],
    palette:["#8D3651","#4D1F3A","#D17D92"],
    direction:18,flow:22,
    dryContours:contacts("inner-fold",[
      "M210 156 C219 147 228 148 235 152 M259 145 Q275 141 284 151",
      "M215 153 Q223 148 228 148 M269 143 Q277 144 280 148",
      "M225 165 Q236 176 248 171 M266 170 Q276 166 283 158",
      "M224 153 L228 152 M240 149 L244 150 M275 146 L278 149",
    ]),
  },
  {
    id:"rose-whorl-recess",
    path:"M219 158 C220 148 230 140 241 143 C249 137 259 138 268 144 C277 139 287 146 291 155 C286 161 278 162 270 169 C257 176 246 177 236 171 C228 169 225 164 219 158 Z",
    bounds:[215,134,80,47],
    palette:["#923751","#451733","#B65B70"],
    direction:21,flow:19,
    dryContours:contacts("rose-whorl-recess",[
      "M221 157 Q229 145 241 146 M266 146 Q281 143 288 155",
      "M229 154 Q236 146 244 145 M271 146 Q278 147 282 151",
      "M231 166 Q241 171 251 168 M268 166 Q274 162 277 159",
      "M234 154 L236 152 M248 142 L252 142 M275 152 L277 154",
    ]),
  },
  {
    id:"rose-whorl-left",
    path:"M222 161 C217 155 221 145 231 143 C238 137 245 141 249 147 C251 154 243 157 239 163 C236 171 240 179 246 183 C231 180 225 172 222 161 Z",
    bounds:[216,134,38,53],
    palette:["#AA4B65","#55243F","#D18194"],
    direction:54,flow:21,
    dryContours:contacts("rose-whorl-left",[
      "M224 159 C229 149 237 144 244 146",
      "M225 153 Q230 146 236 144 M242 145 L244 147",
      "M228 161 Q225 169 236 177 M238 161 Q234 168 241 177",
      "M225 154 L227 151 M231 146 L233 145 M241 175 L243 178",
    ]),
  },
  {
    id:"rose-whorl-right",
    path:"M251 145 C260 135 272 135 283 143 C294 149 294 157 285 165 C279 169 271 173 260 171 C267 165 273 159 274 153 C269 147 260 149 253 154 Q249 153 251 145 Z",
    bounds:[246,131,52,47],
    palette:["#B65871","#602946","#D7899B"],
    direction:-47,flow:-26,
    dryContours:contacts("rose-whorl-right",[
      "M254 145 Q265 138 274 142 M280 145 Q291 152 287 159",
      "M254 143 Q263 138 271 140 M281 144 Q287 147 290 152",
      "M266 167 Q276 169 283 162 M259 152 Q267 149 274 154",
      "M257 144 L259 143 M277 142 L279 144 M287 157 L285 160",
    ]),
  },
  {
    id:"heart",
    path:"M237 165 C233 157 239 149 247 151 C253 145 261 151 263 157 C268 165 265 171 259 175 C252 177 249 173 250 169 C257 167 260 164 255 161 C251 157 247 159 244 166 Q242 170 237 165 Z",
    bounds:[232,143,38,36],
    palette:["#A93657","#641B40","#E68794"],
    direction:28,flow:16,
    dryContours:contacts("heart",[
      "M241 160 Q244 154 248 154 M260 159 Q263 164 260 169",
      "M242 157 L245 154 M252 152 Q257 153 259 156",
      "M244 165 Q248 162 252 162 M256 170 Q255 173 253 174",
      "M240 161 L241 158 M257 160 L258 163 M254 172 L252 174",
    ]),
  },
  {
    id:"rose-whorl-scroll",
    path:"M234 175 C232 163 239 154 249 151 C255 148 263 153 266 160 C272 160 275 168 269 174 C263 183 251 188 243 183 C239 181 236 178 235 175 C244 178 252 180 258 175 C264 169 262 164 257 164 C250 161 244 169 241 174 Q238 177 234 175 Z",
    bounds:[230,145,47,44],
    palette:["#B65975","#58253F","#D98EA0"],
    direction:33,flow:21,
    dryContours:contacts("rose-whorl-scroll",[
      "M238 165 Q242 156 250 154 M263 159 Q270 166 268 171",
      "M240 161 Q244 155 250 154 M262 156 L265 160",
      "M242 175 Q246 181 255 179 M259 166 Q262 169 260 173",
      "M237 171 L239 166 M250 153 L252 153 M267 166 L269 169",
    ]),
  },
] as const;

/** The tucked, *physical* reverse side of the front scroll is visible
 * outside its first lip segment. Same EXACT source face hinge; it cannot
 * float when the main scroll changes. This is a seventh actual SVG material.
 */
export const ROSE_CENTER_SCROLL_BACKFACE={
  id:"rose-center-scroll-underturn",
  hinge:"M234 175 C232 163 239 154 249 151",
  path:"M234 175 C232 163 239 154 249 151 C243 146 236 149 231 157 C227 165 230 173 234 175 Z",
  bounds:[225,145,29,34] as const,
  palette:["#B87790","#652E4D","#E5A9B1"] as const,
  direction:59,flow:18,
  details:[
    mark("rk-underturn-crease","M232 168 Q235 157 243 152","#6A304B",.5,.48,192,56),
    mark("rk-underturn-reflect","M233 164 Q237 154 245 151","#F4CBC5",.33,.5,247,46),
    mark("rk-underturn-fibres","M233 161 L235 159 M237 154 L240 153","#9D5472",.27,.37,223,48),
    mark("rk-underturn-tint","M231 169 Q232 174 234 175","#E3A5AC",.29,.38,271,40),
  ] as readonly PencilTrace[],
} as const;

/** Input-safety source inspector. The renderer's formal bounds validator also
 * runs on every produced drawing, in both aspect ratios and high seeds.
 */
export function inspectRoseCenterKnot():string[]{
  const issues:string[]=[];
  const expected:RoseCenterKnotId[]=["inner-fold","rose-whorl-recess",
    "rose-whorl-left","rose-whorl-right","heart","rose-whorl-scroll"];
  if(ROSE_CENTER_KNOT_SURFACES.length!==expected.length||
    ROSE_CENTER_KNOT_SURFACES.some((x,i)=>x.id!==expected[i]))
    issues.push("Knot needs six independently sequenced corolla laminae");
  const seen=new Set<string>();
  for(const shape of ROSE_CENTER_KNOT_SURFACES){
    if(seen.has(shape.id))issues.push("Duplicate center organ "+shape.id);
    seen.add(shape.id);
    if(!/^M.+ Z$/.test(shape.path)||!shape.path.includes("C")||
      /NaN|Infinity|<image|url\(/.test(shape.path)||shape.path.length>12000)
      issues.push("Invalid closed knot surface "+shape.id);
    const b=shape.bounds;
    if(b.length!==4||!b.every(Number.isFinite)||b[2]<=18||
      b[3]<=20||b[0]<195||b[1]<120||b[0]+b[2]>320||
      b[1]+b[3]>195)issues.push("Center surface bounds "+shape.id);
    if(shape.palette.length!==3||
      shape.palette.some(c=>!/^#[0-9a-f]{6}$/i.test(c))||
      !Number.isFinite(shape.direction)||!Number.isFinite(shape.flow))
      issues.push("Invalid material atlas "+shape.id);
    if(shape.dryContours.length!==4)
      issues.push("Missing dry local contacts "+shape.id);
    for(const trace of shape.dryContours){
      if(!trace.id?.startsWith("rk-"+shape.id+"-")||
        !trace.path.startsWith("M")||trace.path.length>12000||
        !/^#[0-9a-f]{6}$/i.test(trace.color)||
        !Number.isFinite(trace.width)||trace.width<.2||trace.width>1||
        typeof trace.opacity!=="number"||!Number.isFinite(trace.opacity)||
        trace.opacity<=0||trace.opacity>1||
        !Number.isSafeInteger(trace.startFrame)||trace.startFrame<160||
        !Number.isSafeInteger(trace.durationFrames)||trace.durationFrames<8||
        trace.startFrame+trace.durationFrames>335)
        issues.push("Invalid time-bound dry contact "+shape.id);
    }
  }
  const scroll=ROSE_CENTER_KNOT_SURFACES.find(s=>s.id==="rose-whorl-scroll");
  const under=ROSE_CENTER_SCROLL_BACKFACE;
  if(!scroll?.path.startsWith(under.hinge)||
    !under.path.startsWith(under.hinge)||
    !/^M.+ Z$/.test(under.path)||
    under.bounds[2]*under.bounds[3]<600||
    under.details.length!==4||under.details.some(t=>!t.path.startsWith("M")||
      typeof t.opacity!=="number"||!Number.isFinite(t.opacity)))
    issues.push("Detached scroll rear-facing physical cuticle");
  return issues;
}
