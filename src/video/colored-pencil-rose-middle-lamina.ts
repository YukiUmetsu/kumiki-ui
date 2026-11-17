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
    path:"M181 154 C178 140 186 124 204 113 C216 107 232 111 245 121 C231 122 220 133 215 146 C208 155 192 163 181 154 Z",
    bounds:[175,105,74,62],
    palette:["#BB6578","#682B4C","#E2A0A3"],direction:47,flow:22,
    details:marks("left",[
      ["M183 149 C188 134 199 119 213 114 M220 115 Q229 117 234 120","#E0A6AA",.58,.47,174],
      ["M185 154 Q195 161 207 149 Q215 134 226 126","#64253F",.75,.72,201],
      ["M192 139 Q199 127 207 123 M204 148 Q210 138 213 134","#A65269",.44,.54,231],
      ["M188 148 L190 142 M196 130 L198 127 M207 117 L210 115","#F3C0B4",.27,.36,259],
    ]),
  },
  {
    id:"rose-mid-right-tuck",surface:"petal",
    path:"M268 116 C285 108 302 117 314 129 C321 143 311 153 301 160 C290 166 280 161 275 155 C286 153 298 144 296 134 C290 127 278 123 268 126 Z",
    bounds:[264,105,60,65],
    palette:["#B25670","#54243D","#D9959F"],direction:-48,flow:-26,
    details:marks("right",[
      ["M274 116 Q290 112 303 126 M308 130 Q315 137 313 143","#E8A8AE",.58,.43,176],
      ["M276 157 C289 166 307 158 315 143","#55243E",.8,.67,204],
      ["M291 121 Q299 128 300 137 M284 153 Q297 149 301 140","#A94861",.47,.55,231],
      ["M278 116 L282 115 M302 124 L304 128 M312 141 L311 144","#E8B3B1",.28,.32,261],
    ]),
  },
  {
    id:"rose-mid-center-guard",surface:"petal",
    path:"M223 126 C232 110 250 109 263 116 C270 120 269 129 262 135 C255 129 247 129 241 138 C233 147 229 151 227 158 C218 148 216 139 223 126 Z",
    bounds:[214,106,58,56],
    palette:["#B45B75","#5C2743","#D68B9B"],direction:24,flow:17,
    details:marks("guard",[
      ["M225 123 Q237 113 248 114 M254 116 Q261 117 264 121","#E4A3AB",.55,.48,177],
      ["M224 146 Q224 135 235 127 Q249 116 259 126","#662842",.78,.71,207],
      ["M229 138 Q237 126 246 122 M232 149 Q238 139 243 137","#B05A71",.46,.5,232],
      ["M225 127 L227 124 M240 115 L243 114 M262 120 L264 124","#ECB6BA",.28,.38,264],
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
