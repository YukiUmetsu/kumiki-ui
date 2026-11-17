/**
 * ArtCraft CP-F1: seven independently authored rose petal rolled-lip studies.
 * Experimental, opt-in; no outside artist contours or image pixels included.
 * Coordinates are attached to the original rose's own petal paths.
 * Each visible lip retains an inner fold occlusion, a warm reflected half-tone,
 * and a sparse sharp dry-paper highlight. No closed opaque area is introduced.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";

export interface RoseLipBand {
  readonly id:string;
  readonly occlusion:string;
  readonly returnLight:string;
  readonly dryEdge:string;
  /** Three optical deposits, mixed separately for each local petal plane. */
  readonly pigments:readonly [string,string,string];
  readonly nibs:readonly [number,number,number];
}
/** Source-native edge topology, not a generic radial stamp. */
export const ROSE_LIP_BANDS:readonly RoseLipBand[]=[
  {id:"outer-left",
   pigments:["#53283F","#C46A80","#F5B9B5"],nibs:[0.98,0.78,0.34],
   occlusion:"M188 94 C177 125 183 158 196 182",
   returnLight:"M184 101 C175 132 183 161 201 190",
   dryEdge:"M185 97 C178 121 179 147 188 166"},
  {id:"outer-right",
   pigments:["#642846","#ED9296","#FFD6BD"],nibs:[1.04,0.77,0.38],
   occlusion:"M315 105 C326 137 323 167 309 190",
   returnLight:"M319 111 C332 142 327 174 311 196",
   dryEdge:"M318 108 C330 135 327 157 320 171"},
  {id:"back-cup",
   pigments:["#692343","#DF7F91","#FFD2B9"],nibs:[0.93,0.84,0.38],
   occlusion:"M169 147 C185 106 212 91 242 95 C270 76 301 91 314 114",
   returnLight:"M173 146 C190 111 214 96 242 101 C275 84 300 100 311 119",
   dryEdge:"M174 130 C194 101 222 92 243 97 M266 88 C283 89 298 98 305 109"},
  {id:"petal-front-left",
   pigments:["#64203E","#E38B9B","#FFE0C9"],nibs:[1.1,0.85,0.41],
   occlusion:"M181 173 Q190 144 210 140 Q228 170 243 177",
   returnLight:"M182 175 Q191 146 209 143 Q222 163 237 170",
   dryEdge:"M181 165 Q192 142 208 139 Q221 159 231 164"},
  {id:"petal-front-right",
   pigments:["#822C4C","#F3A19C","#FFDEBD"],nibs:[1.05,0.81,0.43],
   occlusion:"M250 171 Q291 132 319 164",
   returnLight:"M254 176 Q290 141 315 166",
   dryEdge:"M260 165 Q291 140 314 160"},
  {id:"inner-fold",
   pigments:["#55213D","#CE7893","#FFD7C6"],nibs:[0.74,0.65,0.31],
   occlusion:"M205 144 Q245 118 273 144 Q292 143 305 158",
   returnLight:"M209 149 Q244 125 270 149 Q287 149 300 160",
   dryEdge:"M212 141 Q243 123 265 139 M278 145 Q292 144 301 153"},
  {id:"heart",
   pigments:["#451C37","#D27C95","#FFCEBD"],nibs:[0.55,0.48,0.26],
   occlusion:"M222 152 Q235 133 254 150 Q260 159 256 168",
   returnLight:"M226 154 Q237 140 250 152 Q257 159 253 166",
   dryEdge:"M227 149 Q238 139 248 148"},
] as const;

/** Independent optical marks that preserve the full native contour and its
 * paper-open highlight. Frame sequencing follows the existing pencil clock. */
export function roseRolledLipTraces(id:string):PencilTrace[]{
  const band=ROSE_LIP_BANDS.find(b=>b.id===id);
  if(!band)throw new RangeError("Unknown rose petal lip: "+id);
  return [
    {id:"rose-lip-"+id+"-occlusion",path:band.occlusion,
     color:band.pigments[0],width:band.nibs[0],opacity:.48,startFrame:178,durationFrames:54},
    {id:"rose-lip-"+id+"-return",path:band.returnLight,
     color:band.pigments[1],width:band.nibs[1],opacity:.47,startFrame:224,durationFrames:47},
    {id:"rose-lip-"+id+"-dry",path:band.dryEdge,
     color:band.pigments[2],width:band.nibs[2],opacity:.62,startFrame:267,durationFrames:43},
  ];
}
