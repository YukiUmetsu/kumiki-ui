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
      "M230 145 Q235 139 241 137",
      "M273 145 Q280 142 285 147",
      "M212 161 Q219 168 227 169",
      "M264 177 Q272 177 278 172",
    ]),
  },
  {
    id:"rose-whorl-recess",
    path:"M252 159 C257 152 265 149 273 153 C279 156 282 162 279 167 C272 168 266 172 260 178 C255 180 250 176 248 171 C247 166 249 162 252 159 Z",
    bounds:[239,139,56,47],
    palette:["#743047","#3E1A31","#9D5267"],
    direction:8,flow:13,
    dryContours:contacts("rose-whorl-recess",[
      "M247 157 Q247 151 253 146",
      "M263 150 Q269 147 274 150",
      "M249 174 Q263 183 276 178",
      "M246 157 L248 153 M251 149 L254 146",
    ]),
  },
  {
    id:"rose-whorl-left",
    path:"M220 163 C214 157 214 149 219 143 C223 138 230 137 235 141 C240 145 238 151 233 156 C228 162 227 168 231 174 C235 180 250 184 266 179 C253 191 233 181 222 168 C221 166 220 164 220 163 Z",
    bounds:[212,135,55,57],
    palette:["#A84B62","#55213D","#C9798B"],
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
    path:"M253 145 C260 136 271 132 282 137 C291 142 295 150 290 158 C286 165 278 169 268 171 C261 172 255 168 252 163 C259 164 267 161 272 156 C276 151 272 146 266 145 C261 144 257 148 254 151 C251 151 251 148 253 145 Z",
    bounds:[250,130,45,43],
    palette:["#B45169","#5B2340","#D17C8E"],
    direction:-41,flow:-24,
    dryContours:contacts("rose-whorl-right",[
      "M259 143 Q268 137 277 140",
      "M285 158 Q280 165 271 167",
      "M260 159 Q267 163 273 157",
      "M283 146 L286 150 M280 160 L278 162",
    ]),
  },
  {
    id:"heart",
    path:"M247 180 C254 170 264 164 273 162 C282 160 289 164 291 171 C292 178 284 187 274 191 C264 195 252 189 247 180 Z",
    bounds:[244,159,48,36],
    palette:["#B64D66","#5E2140","#D27A89"],
    direction:9,flow:8,
    replacementBaseDetails:[
      mark("rk-heart-old-upper-crease",
        "M251 178 Q260 168 273 165","#E4A6AD",.39,.39,236,38),
      mark("rk-heart-old-lower-return",
        "M262 190 Q276 190 284 180","#722A47",.46,.43,249,38),
    ],
    dryContours:contacts("heart",[
      "M251 177 Q261 167 273 165",
      "M280 167 Q287 171 285 179",
      "M251 184 Q261 194 273 188",
      "M247 179 L251 175 M283 184 L279 188",
    ]),
  },
  {
    id:"rose-whorl-scroll",
    path:"M232 174 C225 166 227 155 234 148 C241 140 251 139 260 145 C268 151 269 160 263 168 C259 174 252 177 246 179 C252 184 261 185 270 180 C267 189 250 192 239 185 C234 182 232 178 232 174 Z",
    bounds:[222,136,52,60],
    palette:["#A94C64","#55213D","#D27A8D"],
    direction:35,flow:22,
    dryContours:contacts("rose-whorl-scroll",[
      "M239 158 Q245 149 252 148",
      "M257 155 Q262 159 259 164",
      "M250 180 Q257 184 264 180",
      "M247 179 L251 182 M260 182 L264 180",
    ]),
  },
] as const;

/** The tucked physical reverse of the front scroll. Its upper hinge is the
 * exact first cubic of the front face; the exposed abaxial sliver is on its
 * left, not a second concentric outline.
 */
export const ROSE_CENTER_SCROLL_BACKFACE={
  id:"rose-center-scroll-underturn",
  hinge:"M235 174 C229 167 230 158 236 151",
  path:"M235 174 C229 167 230 158 236 151 C230 146 224 150 222 157 C220 164 225 172 231 176 C233 177 234 176 235 174 Z",
  bounds:[218,144,20,34] as const,
  palette:["#8F3B58","#4E1E39","#B96980"] as const,
  direction:61,flow:19,
  details:[
    mark("rk-underturn-crease","M225 166 Q226 158 233 152","#6A304B",.48,.48,192,42),
    mark("rk-underturn-reflect","M227 161 Q230 154 235 151","#E7B5B7",.31,.43,247,38),
    mark("rk-underturn-fibres","M223 160 L226 155 M232 151 L235 150","#A85A74",.25,.34,223,40),
    mark("rk-underturn-tint","M225 169 Q227 174 232 176","#DDA0A9",.27,.36,271,38),
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
