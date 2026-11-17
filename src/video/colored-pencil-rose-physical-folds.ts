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
    face:"M166 158 C174 138 191 122 213 115 C225 111 234 111 243 113 C265 102 294 118 311 133 C324 151 312 167 299 171 Q253 199 202 180 C188 175 174 166 166 158 Z",
    faceBounds:[160,102,167,103],
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
    face:"M176 184 C181 169 192 156 208 156 C219 163 233 178 246 185 C250 207 253 239 236 270 Q194 256 173 223 Q163 203 176 184 Z",
    faceBounds:[163,151,93,124],
    underside:"M176 184 Q166 170 179 153 Q190 137 210 136 Q227 166 252 174 Q252 179 246 185 Q226 171 208 156 C192 156 181 169 176 184 Z",
    undersideBounds:[168,131,89,59],
    hinge:"M176 184 C181 169 192 156 208 156 C219 163 233 178 246 185",
    direction:53,flow:20,
    undersidePalette:["#E6A6A8","#713B54","#F9D8C7"],
    dryLight:"M178 178 C189 153 198 153 208 152 Q227 165 244 181",
    shadowVein:"M182 156 Q192 151 200 153 M212 145 Q220 157 226 169",
    reflectedVein:"M184 173 Q192 161 202 162 M228 161 Q233 172 243 176",
  },
  {
    id:"petal-front-right",
    face:"M252 188 C261 179 272 170 285 166 C306 170 319 181 326 192 C329 217 316 238 305 250 Q283 268 237 278 C242 248 246 208 252 188 Z",
    faceBounds:[233,162,101,122],
    underside:"M252 188 Q249 182 250 171 Q291 132 319 164 C324 173 325 184 326 192 C319 181 306 170 285 166 C272 170 261 179 252 188 Z",
    undersideBounds:[244,134,88,63],
    hinge:"M252 188 C261 179 272 170 285 166 C306 170 319 181 326 192",
    direction:-38,flow:-19,
    undersidePalette:["#E7A5A9","#88445D","#FFDDD0"],
    dryLight:"M256 183 Q271 170 285 161 C302 165 315 177 322 186",
    shadowVein:"M265 163 Q280 148 292 151 M302 155 Q310 166 310 175",
    reflectedVein:"M277 147 Q291 156 295 168 M317 166 Q321 177 321 183",
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
  }
  return issues;
}
