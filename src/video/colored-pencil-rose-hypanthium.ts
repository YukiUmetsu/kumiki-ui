/**
 * CP-F1 × FLORA1 | Rose's real hypanthium-to-corolla attachment.
 *
 * In the native 45-region still, the lower flower and green calyx had two
 * white wedges caused by the original receptacle stopping below the petal
 * heel (y282..291) while the front laminae terminate at y274..278.
 * A real Rosa hypanthium is *one continuous physical cup*, attached to the
 * sepals, supporting the overlying petal bases and the pedicel. It is not a
 * small second floating paint patch between the petals and the stem.
 *
 * This source replaces the exact prior 'calyx-receptacle' *whole face*,
 * preserving its lower floral-axis contour, paper, seed, color material,
 * all five original attached sepal bases and true petal occlusion order.
 *
 * References: K.R. Robertson, University of Illinois Natural History
 * Survey, labeled anatomical Rosa cross-section; Minnesota Extension
 * Science of Plants, flower morphology; Native Plant Trust Rosa key.
 * Original SVG hand authorship; no third-party outline or pixels copied.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";
import {ROSE_CALYX_ORGANS} from "./colored-pencil-rose-calyx";

type Bounds=readonly [number,number,number,number];
export interface RoseHypanthiumAttachment {
  readonly id:"calyx-receptacle";
  readonly path:string;
  readonly bounds:Bounds;
  /** Existing lower part is the pedicel and sepal base, not new geometry. */
  readonly originalFloralAxis:string;
  readonly details:readonly PencilTrace[];
}
function mark(id:string,path:string,color:string,width:number,
  opacity:number,startFrame:number,durationFrames:number):PencilTrace{
  return {id,path,color,width,opacity,startFrame,durationFrames};
}

/**
 * Nonmirrored compound shoulders under the two distinct front petals.
 * Left supports the inclined blush front-left lower heel; right reaches
 * behind the red right lamina. Their concave/cupped top is intentionally
 * asymmetrical; the rear wall is more than a decorative green stroke.
 */
export const ROSE_HYPANTHIUM_ATTACHMENT:RoseHypanthiumAttachment={
  id:"calyx-receptacle",
  path:"M216 284 C218 280 223 273 230 271 C235 274 240 277 247 278 C255 272 260 269 268 271 C274 275 277 280 273 282 C272 298 263 314 253 323 Q245 327 237 319 C230 311 222 295 216 284 Z",
  bounds:[212,266,69,63],
  originalFloralAxis:"C272 298 263 314 253 323 Q245 327 237 319",
  details:[
    mark("rhyp-left-petal-contact",
      "M220 283 C226 279 233 279 240 282",
      "#47594B",.52,.46,191,58),
    mark("rhyp-right-return",
      "M250 280 C256 274 263 272 269 274",
      "#DDD7A4",.46,.64,238,53),
    mark("rhyp-continuous-floral-wall",
      "M227 281 C231 289 234 302 239 311 M268 280 Q261 296 253 311",
      "#98B27F",.41,.50,217,61),
    mark("rhyp-cuticle-microfibres",
      "M234 296 Q237 306 241 313 M251 294 Q249 306 247 313",
      "#C7D19B",.34,.44,255,51),
    mark("rhyp-rooted-pedicel",
      "M238 317 Q245 324 252 317",
      "#4F694F",.49,.51,228,56),
  ],
};

/** Prevent silently introducing an unattached green sticker at the junction:
 * the whole original solid calyx, its stem-rooted lower axis and painterly
 * microstructure must remain a single source-linked CP-F1 organ.
 */
export function inspectRoseHypanthiumAttachment():string[]{
  const errors:string[]=[];
  const candidate=ROSE_HYPANTHIUM_ATTACHMENT;
  const original=ROSE_CALYX_ORGANS.find(x=>x.id==="calyx-receptacle");
  if(!original||candidate.id!==original.id||
    !original.path.includes(candidate.originalFloralAxis)||
    !candidate.path.includes(candidate.originalFloralAxis)||
    candidate.path===original.path)
    errors.push("Hypanthium not physically shared with original floral axis");
  if(!/^M[\d .CQ-]+ Z$/.test(candidate.path)||
    candidate.path.length>12000||
    candidate.path.split("C").length<7||
    /NaN|Infinity|image|url\(/.test(candidate.path))
    errors.push("Invalid continuous hypanthium receptacle source contour");
  const [x,y,w,h]=candidate.bounds;
  if(!candidate.bounds.every(Number.isFinite)||candidate.bounds.length!==4||
    x<195||x>223||y<258||y>277||w<60||w>82||h<55||h>76||
    x+w>301||y+h>340)
    errors.push("Hypanthium source extent not joined with calyx and corolla");
  const names=new Set<string>();
  if(candidate.details.length!==5)
    errors.push("Hypanthium needs five independent source-attached local marks");
  for(const contact of candidate.details){
    if(!contact.id||names.has(contact.id)||
      !contact.id.startsWith("rhyp-")||
      !contact.path.startsWith("M")||
      contact.path.length>12000||
      !/^#[0-9a-f]{6}$/i.test(contact.color)||
      !Number.isFinite(contact.width)||contact.width<.2||contact.width>.65||
      !Number.isFinite(contact.opacity)||contact.opacity<=.2||contact.opacity>.7||
      !Number.isSafeInteger(contact.startFrame)||contact.startFrame<185||
      !Number.isSafeInteger(contact.durationFrames)||contact.durationFrames<8||
      contact.startFrame+contact.durationFrames>335)
      errors.push("Unbound or invalid hypanthium optical fibre "+contact.id);
    names.add(contact.id??"");
  }
  return errors;
}
