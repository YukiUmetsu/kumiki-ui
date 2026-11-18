/**
 * CP-F1 × FLORA1 — asymmetrically nested rose centre, rebuilt as overlapping
 * petals rather than engraved concentric C-loops.
 *
 * Reference-led morphology: an irregular rear cup, an off-axis shaded pocket,
 * one lifted narrow left wall, one broader right shoulder, a foreground
 * convex lamina and an offset front petal with a real abaxial reverse. Their
 * silhouettes have distinct centres, widths, shoulder heights and tangent
 * directions. This is still a 2D projection, not a measured 3D specimen.
 *
 * The opt-in study preserves the existing six semantic region IDs and three
 * pigment layers. Two legacy long centre strokes are re-authored as short
 * local edge contacts; all other existing inner-whorl fibres are retained.
 * Experimental: OFF by default, pending independent 1× art review.
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
  /** Original long base strokes replaced with short source-aligned contacts. */
  readonly replacementBaseDetails?:readonly PencilTrace[];
  /** Four new low-pressure dry-pencil contacts on this physical lamina. */
  readonly dryContours:readonly PencilTrace[];
}
const mark=(id:string,path:string,color:string,width:number,opacity:number,
  startFrame:number,durationFrames:number):PencilTrace=>
  ({id,path,color,width,opacity,startFrame,durationFrames});
const dry=(id:RoseCenterKnotId,part:string,path:string,color:string,
  width:number,opacity:number,startFrame:number):PencilTrace=>
  mark("rk-"+id+"-"+part,path,color,width,opacity,startFrame,38);
const contacts=(id:RoseCenterKnotId,paths:readonly [
  string,string,string,string,
]):readonly PencilTrace[]=>[
  dry(id,"crease",paths[0],"#682641",.52,.56,183),
  dry(id,"cuticle",paths[1],"#E3A5AA",.32,.42,245),
  dry(id,"midtone",paths[2],"#A94C66",.36,.38,218),
  dry(id,"fibres",paths[3],"#D99AA2",.24,.31,270),
];

/** Explicit paint order: rear irregular crown, dark pocket, left turned wall,
 * right overlapping shoulder, lower front lobe, then offset front petal.
 */
export const ROSE_CENTER_KNOT_SURFACES:readonly RoseCenterKnotSurface[]=[
  {
    id:"inner-fold",
    path:"M205 157 C201 151 205 143 213 140 C221 136 227 141 233 145 C237 137 245 131 254 132 C263 133 266 140 270 144 C278 138 287 141 292 149 C298 153 300 159 305 164 C295 163 290 168 283 174 C275 180 265 176 257 181 C248 185 239 179 232 174 C221 171 211 166 205 157 Z",
    bounds:[200,129,109,58],
    palette:["#8F354F","#4D1E37","#C16B80"],
    direction:17,flow:23,
    replacementBaseDetails:[
      mark("rk-inner-fold-old-left-shoulder",
        "M210 153 Q216 145 224 143","#D18C99",.48,.38,223,42),
      mark("rk-inner-fold-old-right-shoulder",
        "M277 146 Q284 147 288 153","#A95770",.4,.36,239,38),
    ],
    dryContours:contacts("inner-fold",[
      "M230 150 Q236 143 244 141",
      "M273 145 Q280 142 285 147",
      "M212 161 Q219 168 227 169",
      "M264 177 Q272 177 278 172",
    ]),
  },
  {
    id:"rose-whorl-recess",
    path:"M252 159 C257 151 265 149 272 153 C279 156 282 162 279 167 C273 168 269 173 266 179 C261 176 258 171 255 166 C252 164 250 161 252 159 Z",
    bounds:[247,147,35,32],
    palette:["#64283F","#3D182E","#A05B70"],
    direction:8,flow:13,
    dryContours:contacts("rose-whorl-recess",[
      "M253 157 Q259 151 266 151",
      "M273 155 Q278 159 277 164",
      "M253 163 Q257 166 261 170",
      "M258 162 L262 157 M265 155 L269 154",
    ]),
  },
  {
    id:"rose-whorl-left",
    path:"M220 163 C214 157 214 149 219 143 C223 138 230 137 235 141 C240 145 238 151 233 156 C228 162 227 168 231 174 C238 166 247 163 255 166 C261 169 264 174 266 179 C253 191 233 181 222 168 C221 166 220 164 220 163 Z",
    bounds:[212,135,55,57],
    palette:["#B85A70","#6B2440","#E5949F"],
    direction:54,flow:27,
    dryContours:contacts("rose-whorl-left",[
      "M220 154 Q222 146 229 142",
      "M224 163 Q225 170 230 174",
      "M250 181 Q254 184 258 182",
      "M222 151 L224 148 M228 143 L231 141",
    ]),
  },
  {
    id:"rose-whorl-right",
    path:"M254 146 C262 137 273 134 284 140 C293 145 296 153 290 161 C285 167 276 169 267 167 C260 166 256 162 255 157 C260 157 265 154 268 150 C270 147 267 144 263 145 C259 146 257 150 255 153 C252 151 252 148 254 146 Z",
    bounds:[250,132,46,39],
    palette:["#A94A62","#61213A","#D77E8E"],
    direction:-34,flow:-20,
    dryContours:contacts("rose-whorl-right",[
      "M260 144 Q270 137 280 141",
      "M286 157 Q280 165 270 166",
      "M260 158 Q267 161 273 156",
      "M284 147 L287 151 M280 160 L278 163",
    ]),
  },
  {
    id:"heart",
    path:"M260 179 C270 169 283 165 296 167 C304 168 309 173 310 179 C300 180 290 184 282 189 C273 195 263 190 260 179 Z",
    bounds:[257,162,55,33],
    palette:["#A94A62","#5E1E37","#D77A8D"],
    direction:22,flow:14,
    replacementBaseDetails:[
      mark("rk-heart-old-upper-crease",
        "M270 181 Q282 175 296 174","#D9929F",.39,.39,236,38),
      mark("rk-heart-old-lower-return",
        "M276 185 Q287 181 298 180","#722A47",.46,.43,249,38),
    ],
    dryContours:contacts("heart",[
      "M263 178 Q277 168 294 168",
      "M297 172 Q305 175 306 180",
      "M275 183 Q286 179 297 179",
      "M269 179 L275 176 M281 181 L288 178",
    ]),
  },
  {
    id:"rose-whorl-scroll",
    path:"M230 176 C221 166 223 151 234 141 C244 131 258 130 269 138 C280 146 283 159 276 169 C271 177 261 180 251 181 C259 185 270 182 279 174 C278 187 265 195 252 193 C239 191 231 184 230 176 Z",
    bounds:[219,128,62,67],
    palette:["#C35B70","#70243F","#F1A2AA"],
    direction:38,flow:26,
    dryContours:contacts("rose-whorl-scroll",[
      "M238 153 Q246 141 258 138",
      "M270 150 Q277 158 273 166",
      "M244 171 Q254 178 266 176",
      "M242 168 L248 173 M260 176 L266 175",
    ]),
  },
] as const;

/** The tucked physical reverse of the front scroll. Its upper hinge is the
 * exact first cubic of the front face; the exposed abaxial sliver is on its
 * left, not a second concentric outline.
 */
export const ROSE_CENTER_SCROLL_BACKFACE={
  id:"rose-center-scroll-underturn",
  hinge:"M230 176 C221 166 223 151 234 141",
  path:"M230 176 C221 166 223 151 234 141 C228 143 221 148 219 156 C217 165 222 173 228 178 C230 180 230 178 230 176 Z",
  bounds:[215,139,20,41] as const,
  palette:["#97445D","#4F1D37","#C8798A"] as const,
  direction:60,flow:18,
  details:[
    mark("rk-underturn-crease","M224 166 Q221 159 226 151","#6A304B",.48,.48,192,42),
    mark("rk-underturn-reflect","M222 160 Q224 153 228 148","#E7B5B7",.31,.43,247,38),
    mark("rk-underturn-fibres","M219 160 L222 154 M227 149 L230 145","#A85A74",.25,.34,223,40),
    mark("rk-underturn-tint","M224 169 Q227 175 230 178","#DDA0A9",.27,.36,271,38),
  ] as readonly PencilTrace[],
} as const;

/** Structural inspector: distinct off-axis silhouettes, short local contacts,
 * fixed source-space bounds, and an exact shared physical cuticle hinge.
 */
export function inspectRoseCenterKnot():string[]{
  const issues:string[]=[];
  const expected:RoseCenterKnotId[]=["inner-fold","rose-whorl-recess",
    "rose-whorl-left","rose-whorl-right","heart","rose-whorl-scroll"];
  if(ROSE_CENTER_KNOT_SURFACES.length!==expected.length||
    ROSE_CENTER_KNOT_SURFACES.some((x,i)=>x.id!==expected[i]))
    issues.push("Knot needs six independently sequenced corolla laminae");
  const seen=new Set<string>();
  const centres=ROSE_CENTER_KNOT_SURFACES.map(s=>[
    s.bounds[0]+s.bounds[2]/2,s.bounds[1]+s.bounds[3]/2,
  ] as const);
  if(new Set(centres.map(([x,y])=>x+","+y)).size!==6)
    issues.push("Central laminae must have six distinct off-axis bounds centres");
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
      issues.push("Four new local dry-pencil contacts required: "+shape.id);
    if(shape.replacementBaseDetails&&shape.replacementBaseDetails.length!==2)
      issues.push("Two re-authored base contacts required: "+shape.id);
    for(const trace of [
      ...(shape.replacementBaseDetails??[]),...shape.dryContours,
    ]){
      if(!trace.id?.startsWith("rk-"+shape.id+"-")&&
        !trace.id?.startsWith("rk-inner-fold-")&&
        !trace.id?.startsWith("rk-heart-"))
        issues.push("Unkeyed center pencil contact "+shape.id);
      if(!trace.path.startsWith("M")||trace.path.length>180||
        !/^#[0-9a-f]{6}$/i.test(trace.color)||
        !Number.isFinite(trace.width)||trace.width<.2||trace.width>.8||
        typeof trace.opacity!=="number"||!Number.isFinite(trace.opacity)||
        trace.opacity<=0||trace.opacity>.65||
        !Number.isSafeInteger(trace.startFrame)||trace.startFrame<160||
        !Number.isSafeInteger(trace.durationFrames)||trace.durationFrames<8||
        trace.startFrame+trace.durationFrames>335)
        issues.push("Invalid source-local pencil contact "+shape.id);
    }
  }
  const scroll=ROSE_CENTER_KNOT_SURFACES.find(s=>s.id==="rose-whorl-scroll");
  const under=ROSE_CENTER_SCROLL_BACKFACE;
  if(!scroll?.path.startsWith(under.hinge)||
    !under.path.startsWith(under.hinge)||
    !/^M.+ Z$/.test(under.path)||
    under.bounds[2]*under.bounds[3]<500||
    under.details.length!==4||under.details.some(t=>!t.path.startsWith("M")||
      t.path.length>180||typeof t.opacity!=="number"||!Number.isFinite(t.opacity)))
    issues.push("Detached scroll rear-facing physical cuticle");
  return issues;
}
