/**
 * FLORA1 × CP-F1 — independently authored, physically shaped rose underturns.
 *
 * Source morphology (UPOV TG/11/8, reflexing petals; original artist studies):
 * a bent petal is not an outline around a filled teardrop. The thin rolled
 * abaxial (underside) surface occupies a real, sometimes asymmetrical area
 * outside its adaxial lamina. Both regions meet along one authored fold seam
 * while overlapped petal regions retain their true paint order.
 *
 * Experimental, never substituted into exported default artwork. This is
 * original source geometry, not extracted artwork, scans or photos.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";

type Palette=readonly [string,string,string];
type Bounds=readonly [number,number,number,number];
export interface RosePhysicalFold {
  readonly id:string;
  /** Actual new front-facing petal silhouette, not a second texture stamp. */
  readonly face:string;
  readonly faceBounds:Bounds;
  /** Turned-over lamina surface, visible behind the re-profiled front. */
  readonly underside:string;
  readonly undersideBounds:Bounds;
  /** Shared physical seam between face and underturn. */
  readonly hinge:string;
  /** Direction/orientation is local, not a generic radial flower rotation. */
  readonly direction:number;
  readonly flow:number;
  readonly undersidePalette:Palette;
  readonly dryLight:string;
  readonly shadowVein:string;
  readonly reflectedVein:string;
}
/** Source contour and fold hinge are bespoke for each overlapping petal.
 * Roots and distal rims are separate; even paired outer petals differ in
 * width, curl attitude, degree of reflex and edge rhythm.
 */
export const ROSE_PHYSICAL_FOLDS:readonly RosePhysicalFold[]=[
  {
    id:"outer-left",
    face:"M222 270 C171 261 136 242 130 206 C126 193 128 180 131 170 C147 149 168 132 197 127 C191 151 193 167 204 194 C213 211 231 226 251 244 Q237 252 222 270 Z",
    faceBounds:[125,122,130,153],
    underside:"M131 170 C122 150 140 116 165 101 C172 97 180 95 188 94 C192 95 199 105 200 115 Q201 122 197 127 C168 132 147 149 131 170 Z",
    undersideBounds:[120,90,85,89],
    hinge:"M131 170 C147 149 168 132 197 127",
    direction:58,flow:23,
    undersidePalette:["#B8798D","#682D4E","#F0B0B3"],
    dryLight:"M138 162 C157 139 180 124 197 123",
    shadowVein:"M145 144 Q164 123 185 115 M151 134 Q165 129 177 129",
    reflectedVein:"M165 102 Q180 111 188 125 M151 121 Q157 127 158 133",
  },
  {
    id:"outer-right",
    face:"M249 259 C304 274 344 244 359 214 C365 200 367 189 365 182 C351 162 333 150 305 141 C313 169 292 204 236 237 Q246 244 249 259 Z",
    faceBounds:[230,135,139,143],
    underside:"M305 141 C302 132 309 114 315 105 C349 111 372 140 372 170 Q374 179 365 182 C351 162 333 150 305 141 Z",
    undersideBounds:[300,101,77,85],
    hinge:"M305 141 C333 150 351 162 365 182",
    direction:-46,flow:-22,
    undersidePalette:["#CF8998","#76384F","#F7C2B7"],
    dryLight:"M310 140 C332 150 357 163 368 174",
    shadowVein:"M318 119 Q341 136 357 161 M327 128 Q328 146 340 152",
    reflectedVein:"M352 141 Q359 152 362 166 M334 118 Q352 132 358 141",
  },
  {
    id:"back-cup",
    face:"M166 158 C174 138 191 122 213 115 C225 111 234 111 243 113 C265 102 294 118 311 133 C324 151 312 167 299 171 Q253 237 202 180 C188 175 174 166 166 158 Z",
    faceBounds:[160,102,167,112],
    underside:"M166 158 C155 153 160 122 180 105 C201 84 225 81 242 91 C275 67 296 80 319 108 C322 118 319 130 311 133 C294 118 265 102 243 113 C234 111 225 111 213 115 C191 122 174 138 166 158 Z",
    undersideBounds:[154,70,171,94],
    hinge:"M166 158 C174 138 191 122 213 115 C225 111 234 111 243 113 C265 102 294 118 311 133",
    direction:10,flow:15,
    undersidePalette:["#D28C99","#7E3855","#FFD3C7"],
    dryLight:"M170 149 C182 126 210 104 242 110 C266 100 291 116 307 128",
    shadowVein:"M177 124 Q196 107 219 101 M248 91 Q275 95 293 110",
    reflectedVein:"M198 91 Q213 96 220 109 M276 82 Q282 97 296 109",
  },
  {
    id:"petal-front-left",
    face:"M176 184 C179 169 193 154 209 154 C225 156 237 171 244 187 C251 203 260 216 259 225 C257 238 248 245 250 259 C251 267 246 271 240 274 C220 269 194 251 179 229 C168 212 167 197 176 184 Z",
    faceBounds:[165,150,100,127],
    underside:"M176 184 C164 174 168 160 179 146 C190 131 202 130 210 135 C225 154 238 167 244 187 C237 171 225 156 209 154 C193 154 179 169 176 184 Z",
    undersideBounds:[163,129,85,63],
    hinge:"M176 184 C179 169 193 154 209 154 C225 156 237 171 244 187",
    direction:53,flow:20,
    undersidePalette:["#E6A6A8","#713B54","#F9D8C7"],
    dryLight:"M178 177 C186 159 196 151 209 150 C226 152 239 169 242 181",
    shadowVein:"M181 156 Q192 143 203 148 M212 143 Q221 153 228 164",
    reflectedVein:"M184 173 Q191 160 203 158 M225 160 Q234 169 239 178",
  },
  {
    id:"petal-front-right",
    face:"M247 189 C257 176 273 163 288 164 C307 162 322 181 327 192 C332 204 325 231 305 250 C283 269 249 273 237 278 C240 257 249 242 256 226 C255 208 250 199 247 189 Z",
    faceBounds:[233,160,101,124],
    underside:"M247 189 C243 173 253 165 264 158 C277 145 289 134 304 149 C321 164 327 178 327 192 C322 181 307 162 288 164 C273 163 257 176 247 189 Z",
    undersideBounds:[240,135,90,64],
    hinge:"M247 189 C257 176 273 163 288 164 C307 162 322 181 327 192",
    direction:-38,flow:-19,
    undersidePalette:["#E7A5A9","#88445D","#FFDDD0"],
    dryLight:"M252 183 C263 170 274 163 288 160 C304 158 320 172 324 187",
    shadowVein:"M260 168 Q276 151 291 152 M299 152 Q310 162 312 173",
    reflectedVein:"M278 148 Q287 153 296 163 M314 164 Q321 173 323 182",
  },
] as const;

function stroke(id:string,path:string,color:string,width:number,
  startFrame:number,durationFrames:number,opacity:number):PencilTrace{
  return {id,path,color,width,opacity,startFrame,durationFrames};
}
/**
 * Each underturn is its own bounded, independently shaded material region,
 * not a visual embellishment attached to the original flat petal.
 */
export function physicalFoldUndersideDetails(fold:RosePhysicalFold):PencilTrace[]{
  const key="rf-"+fold.id+"-";
  return [
    stroke(key+"hinge",fold.hinge,"#5C2544",.88,169,52,.64),
    stroke(key+"dry-cuticle",fold.dryLight,"#FFE4D3",.72,235,54,.72),
    stroke(key+"shadow-veins",fold.shadowVein,"#78405E",.41,212,55,.43),
    stroke(key+"reflected-fibres",fold.reflectedVein,"#F7C5BF",.36,251,49,.55),
  ];
}
/** Bespoke dry-pencil face contacts follow the newly curved medial S seams.
 * They ADD to (never replace) the existing authored petal details and optical
 * lamina/lip passes, and share the same paper-locked absolute film clock.
 */
export function physicalFoldFaceDetails(fold:RosePhysicalFold):PencilTrace[]{
  if(fold.id==="petal-front-left")return [
    stroke("rf-front-left-crease",
      "M238 193 C242 208 235 226 231 241 C229 251 233 260 235 263",
      "#742B48",.72,206,48,.48),
    stroke("rf-front-left-return",
      "M231 192 C237 204 233 219 226 232",
      "#F1A5A8",.41,257,44,.48),
  ];
  if(fold.id==="petal-front-right")return [
    stroke("rf-front-right-crease",
      "M250 193 C256 207 262 213 255 228 C248 244 243 258 240 268",
      "#762C49",.79,208,48,.59),
    stroke("rf-front-right-return",
      "M256 199 C262 209 263 215 259 230 C255 242 250 252 246 259",
      "#F2A9AA",.39,258,45,.46),
  ];
  return [];
}
export function inspectRosePhysicalFolds():string[]{
  const issues:string[]=[];
  const ids=new Set<string>();
  if(ROSE_PHYSICAL_FOLDS.length!==5)
    issues.push("Expected five independent corolla folds");
  for(const fold of ROSE_PHYSICAL_FOLDS){
    if(ids.has(fold.id))issues.push("Duplicate corolla organ "+fold.id);
    ids.add(fold.id);
    for(const [name,path] of [["face",fold.face],["underside",fold.underside]]){
      if(!path.startsWith("M")||!path.endsWith(" Z")||
        /NaN|Infinity/.test(path)||path.length>12000)
        issues.push("Invalid closed "+name+" silhouette: "+fold.id);
    }
    for(const bb of [fold.faceBounds,fold.undersideBounds]){
      if(bb.length!==4||!bb.every(Number.isFinite)||bb[2]<=0||bb[3]<=0||
        Math.max(...bb)>4096)issues.push("Invalid physical fold bounds: "+fold.id);
    }
    if(!fold.hinge.startsWith("M")||physicalFoldUndersideDetails(fold).length!==4)
      issues.push("Missing non-raster underturn pencil contacts: "+fold.id);
    const front=physicalFoldFaceDetails(fold);
    if((fold.id.startsWith("petal-front-")?front.length!==2:front.length!==0)||
      front.some(trace=>!trace.path.startsWith("M")||
        trace.path.length>12000||!Number.isFinite(trace.width)||
        !Number.isFinite(trace.opacity)||!Number.isSafeInteger(trace.startFrame)))
      issues.push("Missing bounded anatomically attached frontal crease: "+fold.id);
  }
  return issues;
}
