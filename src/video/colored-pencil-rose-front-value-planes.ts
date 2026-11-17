/**
 * CP-F1 / FLORA1: original, soft coloured-pencil value planes on the two
 * physically folded frontal rose laminae. Experimental and OFF by default.
 *
 * Unlike another opaque petal, each local shadow or reflected-light envelope
 * is transparent dry pigment laid over a parent petal. No paper matte, no
 * generic global gradient and no traced third-party contours.
 *
 * Morphology observations: Karen Elaine Evans, Pink Rose (Artfinder);
 * Heather Rooney coloured-pencil rose; Ann Swan botanical layering; UPOV
 * TG/11/8 rose petal reflex. Technique references only; never image assets.
 */
import type {PencilSurface} from "../../registry/video/colored-pencil-materials";
import type {PencilTrace} from "../../registry/video/colored-pencil";

type Bounds=readonly [number,number,number,number];
type Palette=readonly [string,string,string];

export interface RoseFrontValuePlane {
  readonly id:string;
  readonly parent:"petal-front-left"|"petal-front-right";
  /** Non-occluding, real-area pigment zones; never a second opaque petal. */
  readonly surface:"cast-shadow"|"glaze";
  readonly path:string;
  readonly bounds:Bounds;
  readonly palette:Palette;
  readonly direction:number;
  readonly flow:number;
  readonly details:readonly PencilTrace[];
}

/**
 * Paint order inside each parent's forward layer: broad cool shadow first,
 * then narrower warm reflected light. Every path follows one individually
 * observed form; neither is a resized copy of the petal outline.
 */
export const ROSE_FRONT_VALUE_PLANES:readonly RoseFrontValuePlane[]=[
  {
    id:"rose-front-left-cool-core",parent:"petal-front-left",
    surface:"cast-shadow",
    path:"M232 197 C240 207 244 222 243 233 C244 244 240 251 243 263 C234 257 227 244 226 232 C222 218 227 206 232 197 Z",
    bounds:[220,191,29,77],
    palette:["#8A405F","#4F2B4C","#AE6880"],
    direction:68,flow:17,
    details:[
      {id:"rv-left-core-a",path:"M231 211 C235 223 236 239 239 251",color:"#65314E",
        width:.49,opacity:.38,startFrame:217,durationFrames:56},
      {id:"rv-left-core-b",path:"M228 225 C229 237 234 246 239 254",color:"#8D4F67",
        width:.34,opacity:.29,startFrame:251,durationFrames:49},
    ],
  },
  {
    id:"rose-front-left-warm-bounce",parent:"petal-front-left",
    surface:"glaze",
    path:"M188 181 C198 171 208 170 216 179 C221 188 214 200 207 210 C204 225 211 234 216 241 C203 232 192 216 187 202 C184 192 185 186 188 181 Z",
    bounds:[180,168,43,77],
    palette:["#DEA0A7","#AB6E7C","#F5CCB5"],
    direction:43,flow:14,
    details:[
      {id:"rv-left-bounce-a",path:"M193 181 C199 182 208 182 212 187",color:"#F4CEBB",
        width:.35,opacity:.35,startFrame:247,durationFrames:46},
      {id:"rv-left-bounce-b",path:"M190 197 C193 212 199 222 206 228",color:"#E4A7A3",
        width:.38,opacity:.35,startFrame:276,durationFrames:42},
    ],
  },
  {
    id:"rose-front-right-cool-core",parent:"petal-front-right",
    surface:"cast-shadow",
    path:"M258 199 C267 214 268 226 259 244 C254 254 249 262 244 270 C256 267 267 253 274 240 C277 227 269 208 258 199 Z",
    bounds:[239,194,43,80],
    palette:["#853A59","#462643","#AE657F"],
    direction:-59,flow:-18,
    details:[
      {id:"rv-right-core-a",path:"M262 216 C268 232 257 251 247 263",color:"#603048",
        width:.50,opacity:.40,startFrame:216,durationFrames:54},
      {id:"rv-right-core-b",path:"M267 227 Q267 241 253 260",color:"#94506D",
        width:.32,opacity:.34,startFrame:254,durationFrames:45},
    ],
  },
  {
    id:"rose-front-right-warm-bounce",parent:"petal-front-right",
    surface:"glaze",
    path:"M295 176 C307 177 318 189 318 202 C319 216 311 226 301 236 C305 222 301 210 291 200 C286 191 286 181 295 176 Z",
    bounds:[283,171,40,70],
    palette:["#E1A0A1","#AE7482","#F7C9B0"],
    direction:-38,flow:-14,
    details:[
      {id:"rv-right-bounce-a",path:"M298 179 C306 187 310 195 311 205",color:"#F2C4B7",
        width:.38,opacity:.37,startFrame:245,durationFrames:49},
      {id:"rv-right-bounce-b",path:"M313 206 Q312 219 305 229",color:"#E6B1A6",
        width:.34,opacity:.33,startFrame:278,durationFrames:41},
    ],
  },
] as const;

/** Reject accidental flat opaque support, out-of-petal placement, bad marks
 * and duplicate ids before the CP-F1 renderer receives optional shapes.
 * Pixel-exact parent containment is separately verified in Chromium.
 */
export function inspectRoseFrontValuePlanes():string[]{
  const issues:string[]=[];
  if(ROSE_FRONT_VALUE_PLANES.length!==4)
    issues.push("Expected four individually authored frontal pigment planes");
  const ids=new Set<string>();
  const perParent=new Map<string,Set<PencilSurface>>();
  for(const p of ROSE_FRONT_VALUE_PLANES){
    if(ids.has(p.id))issues.push("Duplicate rose value plane "+p.id);
    ids.add(p.id);
    if(p.surface!=="cast-shadow"&&p.surface!=="glaze")
      issues.push("Opaque region in transparent pigment study "+p.id);
    const kinds=perParent.get(p.parent)??new Set<PencilSurface>();
    kinds.add(p.surface);perParent.set(p.parent,kinds);
    if(!/^M.+ Z$/.test(p.path)||!p.path.includes("C")||
      /NaN|Infinity|<image|url\(/.test(p.path)||p.path.length>12000)
      issues.push("Invalid closed value envelope "+p.id);
    const b=p.bounds;
    if(b.length!==4||!b.every(Number.isFinite)||b[2]<15||b[3]<24||
       b[0]<160||b[1]<145||b[0]+b[2]>340||b[1]+b[3]>284)
      issues.push("Value envelope escapes front of flower "+p.id);
    if(p.details.length!==2)issues.push("Missing hand-authored pencil marks "+p.id);
    for(const trace of p.details){
      if(!trace.path.startsWith("M")||!/^#[0-9A-Fa-f]{6}$/.test(trace.color)||
         !Number.isFinite(trace.width)||trace.width<.2||trace.width>1.2||
         typeof trace.opacity!=="number"||!Number.isFinite(trace.opacity)||
         trace.opacity<=0||trace.opacity>.6||
         !Number.isSafeInteger(trace.startFrame)||trace.startFrame<200||
         !Number.isSafeInteger(trace.durationFrames)||trace.durationFrames<8)
        issues.push("Invalid dry contact "+p.id);
    }
  }
  for(const id of ["petal-front-left","petal-front-right"])
    if(perParent.get(id)?.size!==2)issues.push("Missing cool/warm tonal pair "+id);
  return issues;
}
