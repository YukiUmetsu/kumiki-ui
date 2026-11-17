/**
 * CP-F1 / FLORA1 — experimental, original middle-whorl rose lamina.
 *
 * Morphology deconstructed from UPOV TG/11/8 (double-flowered Rosa)
 * and original coloured-pencil work by Karen Elaine Evans / Heather Rooney.
 * Technique reference only. No third-party pixel, path or traced edge.
 *
 * Three individually drawn curved support planes deliberately sit between
 * the outer back-cup and the old forward corolla. Front-facing petals occlude
 * their lower roots; this is not three concentric outline strokes.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";

type Bounds=readonly [number,number,number,number];
type Palette=readonly [string,string,string];

export interface RoseMiddleLamina {
  readonly id:string;
  readonly surface:"petal";
  readonly path:string;
  readonly bounds:Bounds;
  readonly palette:Palette;
  readonly direction:number;
  readonly flow:number;
  readonly details:readonly PencilTrace[];
}

type Mark=readonly [string,string,number,number,number];
const marks=(id:string,contacts:readonly Mark[]):readonly PencilTrace[]=>
  contacts.map(([path,color,width,opacity,startFrame],i)=>({
    id:"rm-"+id+"-"+i,path,color,width,opacity,
    startFrame,durationFrames:45,
  }));

/**
 * Z-order: rear left shoulder / right tucked wall / tilted center guard;
 * original forward petal faces are painted after these organs.
 * Each support is independently authored, bounded and pressure-layered.
 */
export const ROSE_MIDDLE_LAMINAE:readonly RoseMiddleLamina[]=[
  {
    id:"rose-mid-left-shoulder",surface:"petal",
    path:"M188 166 C181 150 188 136 202 127 C211 119 226 121 237 130 C223 133 216 144 218 154 C212 169 201 174 188 166 Z",
    bounds:[180,117,60,61],
    palette:["#AA455F","#4B1E38","#C46E85"],direction:47,flow:22,
    details:marks("left",[
      ["M189 155 C194 142 203 129 214 125 M222 126 Q227 126 231 129","#CD8190",.58,.42,174],
      ["M191 164 Q201 169 211 160 Q212 147 225 134","#64253F",.75,.72,201],
      ["M196 148 Q201 139 209 136 M205 160 Q212 152 214 146","#A65269",.44,.54,231],
      ["M191 155 L194 150 M203 134 L206 131 M216 124 L220 125","#F3C0B4",.27,.36,259],
    ]),
  },
  {
    id:"rose-mid-right-tuck",surface:"petal",
    path:"M282 135 C289 126 299 125 310 133 C319 143 318 154 310 162 C303 167 293 165 286 160 C294 153 296 146 291 142 C285 137 282 140 279 144 Z",
    bounds:[275,121,48,49],
    palette:["#A24864","#4F1F3B","#C8758B"],direction:-48,flow:-26,
    details:marks("right",[
      ["M289 131 Q298 126 307 135 M312 140 Q317 146 315 152","#CE8797",.58,.40,176],
      ["M290 160 Q305 167 312 156","#55243E",.8,.67,204],
      ["M298 133 Q308 141 307 149 M296 156 Q303 152 307 145","#A94861",.47,.55,231],
      ["M288 134 L291 132 M309 137 L311 140 M314 152 L312 156","#E8B3B1",.28,.32,261],
    ]),
  },
  {
    id:"rose-mid-center-guard",surface:"petal",
    path:"M232 146 C234 132 247 124 258 128 C269 131 273 142 266 148 C259 150 257 144 252 141 C247 139 242 142 238 152 C235 158 232 162 228 163 C226 156 227 151 232 146 Z",
    bounds:[224,122,51,45],
    palette:["#933B59","#431B36","#B7637D"],direction:24,flow:17,
    details:marks("guard",[
      ["M233 144 Q244 129 255 131 M263 134 Q269 139 268 143","#CD8296",.55,.42,177],
      ["M229 158 Q233 142 246 138 Q256 134 261 142","#662842",.78,.71,207],
      ["M236 147 Q244 136 250 135 M234 156 Q238 150 242 148","#B05A71",.46,.5,232],
      ["M232 149 L234 145 M246 132 L249 130 M265 137 L267 141","#ECB6BA",.28,.38,264],
    ]),
  },
] as const;

export function inspectRoseMiddleLaminae():string[]{
  const issues:string[]=[];
  if(ROSE_MIDDLE_LAMINAE.length!==3)
    issues.push("Rose intermediate cup requires three separately authored petals");
  const ids=new Set<string>();
  for(const o of ROSE_MIDDLE_LAMINAE){
    if(ids.has(o.id))issues.push("Duplicate middle lamina: "+o.id);
    ids.add(o.id);
    if(!/^M.+ Z$/.test(o.path)||!o.path.includes("C")||
       /NaN|Infinity|<image|url\(/.test(o.path)||o.path.length>12000)
      issues.push("Invalid middle lamina support: "+o.id);
    const b=o.bounds;
    if(b.length!==4||!b.every(Number.isFinite)||b[2]<30||b[3]<25||
       b[0]<165||b[1]<95||b[0]+b[2]>330||b[1]+b[3]>185)
      issues.push("Middle lamina outside rose source: "+o.id);
    if(o.details.length!==4)issues.push("Four distinct dry-pencil contacts: "+o.id);
    for(const d of o.details){
      if(!d.path.startsWith("M")||!/^#[0-9A-Fa-f]{6}$/.test(d.color)||
        !Number.isFinite(d.width)||d.width<.2||d.width>1.8||
        (typeof d.opacity!=="number"||!Number.isFinite(d.opacity)||d.opacity<=0||d.opacity>1)||
        !Number.isSafeInteger(d.startFrame)||d.startFrame<160||
        !Number.isSafeInteger(d.durationFrames)||d.durationFrames<8)
        issues.push("Invalid middle lamina contact: "+o.id);
    }
  }
  return issues;
}
