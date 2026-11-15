/**
 * Single-part portrait refinement: the YOUNG SCROLL READER'S FACE ONLY.
 *
 * Figure reference: the user's second 1672×941 ink painting, inspected at
 * face crop around (445,282)–(555,412). A youthful THREE-QUARTER reader:
 * left ear exposed, narrow chin pointing down/right, unequal near/far eyes,
 * restrained mouth, broad wrapped hair crown and dark folded cap.
 *
 * All paths below are original constructed illustration, not extracted pixels.
 * Keep the current head pivot 139,124 and face calibration 110..170/65..142.
 * Other two characters, body anatomy, motion, prop and garments unchanged.
 */
import type {CharacterPathShape,CharacterShapeAsset} from
  "../../registry/character/definition";
import {inkPressureStroke} from "./ink-shanshui-fine-craft";
import {readerCrownShapes} from "./ink-shanshui-reader-crown";
import {readerFaceAnatomy} from "./ink-shanshui-reader-anatomy";

const p=(d:string,fill="none",stroke="$ink",strokeWidth=1,
  opacity=1):CharacterPathShape=>({
  type:"path",d,fill,stroke,strokeWidth,opacity,
});
const pressure=(from:[number,number],c1:[number,number],
  c2:[number,number],to:[number,number],width:number,
  seed:number,ink="$ink",opacity=.83):CharacterPathShape=>
  inkPressureStroke({
    from:{x:from[0],y:from[1]},
    c1:{x:c1[0],y:c1[1]},c2:{x:c2[0],y:c2[1]},
    to:{x:to[0],y:to[1]},width,seed,ink,opacity,samples:22,
  });
const asset=(name:string,shapes:CharacterPathShape[]):CharacterShapeAsset=>({
  kind:"shapes",width:260,height:340,shapes,
  provenance:{license:"CC0-1.0",
    source:"Original Kumiki scroll-reader three-quarter portrait: "+name},
});
const mouth={
  rest:"M135.2 125.4 Q139 126.4 142.3 126 Q146 126.2 148.8 125.1",
  aa:"M135.5 124.8 Q141.7 127.3 147.9 124.4 Q144.2 133.8 139.9 131.4 Q136.2 129.1 135.5 124.8 Z",
  oh:"M141.3 125.2 Q145.2 125.1 145.8 128.5 Q145.5 132.1 142 131.7 Q139.4 129.5 141.3 125.2 Z",
  mm:"M135.6 125.7 Q141 125.4 148.5 124.5",
  smile:"M135.1 124.9 Q142.4 129.3 149.2 123.4",
} as const;
export interface ReaderFaceLandmark {
  name:string;
  /** Original 260×340 portrait design pixel. */
  x:number;y:number;
}
export const READER_FACE_LANDMARKS:readonly ReaderFaceLandmark[]=[
  {name:"forehead",x:141,y:78},
  {name:"exposed-ear",x:115,y:106},
  {name:"earlobe",x:115.3,y:117.8},
  {name:"near-eye-inner",x:136,y:102},
  {name:"near-eye-outer",x:119,y:102.3},
  {name:"far-eye-inner",x:152,y:102.8},
  {name:"far-eye-outer",x:163.5,y:101.1},
  {name:"nose-tip",x:152.4,y:115.5},
  {name:"mouth-corner",x:148.8,y:124},
  {name:"chin",x:143.3,y:143.7},
  {name:"hairline",x:149,y:83.5},
  {name:"cap-peak",x:147,y:29.7},
] as const;
/** Deliberate asymmetry at full size; no neutral front-facing sticker face. */
export function scrollReaderFacePortrait(detail=1):
  Record<string,CharacterShapeAsset>{
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Reader face detail must be between 0 and 1");
  const medium=detail>=.45,high=detail>=.8;
  const anatomy=readerFaceAnatomy(detail);
  const face:CharacterPathShape[]=[
    // Ear is behind the cheek; unlike the former oval its lobe projects
    // past the hairline. Separate flesh planes keep it legible at thumbnail.
    p("M117.2 94.9 C111.1 90.6 107.4 94.5 107.6 102.6 C107.6 112 111.3 121.5 117.2 120.1 C121.9 117.6 122.7 107.7 117.2 94.9 Z",
      "$skin","$shadow",1.3),
    p("M114.2 99.4 Q111.5 101.3 112.6 107.3 Q114.2 112.2 117.1 109",
      "none","$skinshade",1.4,.56),
    p("M117.3 103.6 Q115.2 104.3 115.1 107.8 Q119.6 108.5 116.2 113.5",
      "none","$shadow",.83,.67),
    // Three-quarter temple -> tapered cheek -> defined chin. The right
    // cheek reaches forwards; jaw narrows rapidly below the visible ear.
    p("M119 77.6 C129.2 68.6 147.4 66.8 157.7 73.3 C165.2 79.1 167.4 87.7 166.4 101.5 C165.3 109.8 163.4 117.1 156.6 125.6 C151.8 130.7 147.4 138.5 143.3 143.7 C139.5 145.1 135.2 142.6 130.6 139.4 C124.6 135.8 120.1 130.8 118.8 126.2 C115.5 120.2 114.9 116.8 114.2 106.2 C113.7 93.4 115.2 84.7 119 77.6 Z",
      "$skin","$shadow",1.48),
    // Soft anatomical planes are placed along the jaw and nose and never
    // replace the opaque skin silhouette (no see-through heads).
    p("M154.1 85.5 C160.8 91 162.7 100 160.1 107.8 C158.6 111.8 155.8 113.1 153 115.4 C160 113.4 163.2 108.6 163.8 103.4 C164.8 97 162.6 88.8 154.1 85.5 Z",
      "$skinshade","none",0,.14),
    p("M117.8 111.6 C121.9 124.4 128.3 132.9 141.6 136.6 C135.5 135.5 123.9 132.4 118.4 126.4 Z",
      "$skinshade","none",0,.16),
    pressure([117.7,114.8],[119.2,127.9],[132.5,141.6],[142,140],
      1.3,51,"$shadow",.65),
    pressure([142,140],[151.5,136.5],[160,123.9],[162.1,118.4],
      1.35,52,"$shadow",.76),
    // Subtle, anatomically placed nose bridge and nostril. The earlier
    // big S-shaped nose looked like a cartoon cheek curl.
    // Nose-tip, alar and nostril anatomy is constructed in the separate
    // independently testable ArtCraft face-anatomy layer.
    p("M149.4 116.7 Q152 118.1 153.6 116.7",
      "none","$skinshade",.54,.43),
    // Orbital shadows sit below the eyelids, not as symmetrical smile arcs.
    p("M119.2 105.4 Q127.7 108.8 135.7 105.1",
      "none","$skinshade",.49,.4),
    p("M153.2 105.1 Q158.7 107.1 163.2 104.2",
      "none","$skinshade",.45,.38),
    // Philtrum and lower lip are almost invisible in the teacher art.
    p("M144.5 119.6 Q144.9 121.4 145.3 122.1",
      "none","$skinshade",.35,.37),
    p("M139.9 129.6 Q143.6 131.7 147.2 128.6",
      "none","$skinshade",.66,.57),
  ];
  if(medium)face.push(
    pressure([116.3,108.5],[116.3,114.1],[117.1,118.4],[120.3,122.8],
      .57,58,"$shadow",.43),
    p("M118.7 101.3 Q119.3 98.3 121.5 96.7",
      "none","$paper",.7,.46),
    p("M157.8 122.8 Q155.6 126.6 152.4 128.7",
      "none","$skinshade",.48,.33),
  );
  if(high)face.push(
    pressure([122.3,126.3],[126.6,133.3],[131.1,135.2],[133.9,136],
      .5,60,"$skinshade",.37),
    pressure([147.9,115.4],[149.6,117],[150.2,117],[150.9,117.2],
      .37,61,"$ink",.41),
    p("M120.7 116 Q120.8 118.4 122.6 120.3",
      "none","$paper",.59,.52),
  );

  // Layer the original facial planes by anatomy instead of decorating
  // the surface with equally spaced noise. Keep the opaque base silhouette.
  face.push(...anatomy.planes,...anatomy.nose);

  // The crown remains its independently constructed rigged part.
  const hair=readerCrownShapes(detail);

  const brow:CharacterPathShape[]=[
    // Asymmetry is essential: the near brow is long and the far one is
    // short with a visible gap at the frontal turn.
    pressure([117.8,94.4],[124.1,91.3],[130.4,92.5],[135.8,96.3],
      2.55,81,"$ink",.98),
    pressure([149.2,95.5],[154.4,92.6],[159.4,92.9],[162.9,95.1],
      2.03,82,"$ink",.91),
    p("M118.4 93.2 Q126.6 89.8 135 94.8",
      "none","$shadow",.65,.45),
  ];
  if(medium)brow.push(
    pressure([119.6,92.9],[125.1,90.9],[130.5,92.3],[134.6,95.2],
      .43,83,"$deep",.55),
  );
  brow.push(...anatomy.brow);
  // Three exclusive lid cels: eye relief is painted, the pupil remains a
  // separate gaze target. No overlaid legacy open-eye ellipses are retained.
  const eyesOpen:CharacterPathShape[]=[...anatomy.eyesOpen];
  const eyesSoft:CharacterPathShape[]=[...anatomy.eyesSoft];
  const eyesClosed:CharacterPathShape[]=[...anatomy.eyesClosed];
  const mouthAsset=(state:keyof typeof mouth)=>asset("mouth-"+state,[
    ...(state==="aa"||state==="oh"?anatomy.lips.slice(2):anatomy.lips),
    p(mouth[state],state==="aa"||state==="oh"?"$shadow":"none",
      "$shadow",state==="mm"?1.14:.99,state==="aa"?.85:.94),
    p(state==="aa"?"M139.2 130.8 Q143.4 132.4 146 129.9":
      "M138.2 128.9 Q143.6 129.5 147 127.6",
      "none","$skinshade",.55,.43),
    ...(medium?[p("M135.1 124.2 Q137 123.4 139.1 124.2",
      "none","$skinshade",.41,.38)]:[]),
  ]);
  // Tiny independent pupils remain bound to the existing gaze rig, but
  // are tiny ink lashes BELOW the upper lids, not centred round eyes.
  const pupilLeft=asset("near-pupil",[
    ...anatomy.nearPupil,
    p("M129 105.4 Q129.3 106.1 129.2 106.8",
      "none","$ink",.86,.8),
  ]);
  const pupilRight=asset("far-pupil",[
    ...anatomy.farPupil,
    p("M156.3 104.3 l.2 1.1","none","$ink",.66,.64),
  ]);
  // The near ear needs its own OVER-HAIR plane. In the source painting
  // the ear is outlined *in front of* the sideburn; putting both marks
  // inside the base face asset hid it beneath the cap and read as a wedge.
  const visibleEar=asset("near-ear-front-plane",[
    p("M117.2 95.2 C112.3 92.5 107.8 95.7 108.1 103.3 C107.9 111.6 112.1 119.4 117.3 119.7 C121.7 116.7 122.2 106.1 117.2 95.2 Z",
      "$skin","$shadow",1.21,1),
    p("M115.5 99.7 Q111.7 100.1 112.6 105.7 Q114.1 111.6 118 109.5",
      "none","$skinshade",1,.59),
    p("M116.7 103.1 Q114.1 104.6 115.5 108 Q119.6 109.6 116.2 114",
      "none","$shadow",.86,.71),
    p("M111.1 102.4 Q110.6 109.2 114 114.4",
      "none","$paper",.54,.55),
    ...anatomy.ear,
  ]);
  return {
    "reader-ear":visibleEar,
    face:asset("face-and-ear",face),
    hair:asset("wrapped-crown",hair),
    brow:asset("asymmetric-brows",brow),
    "eyes-open":asset("downcast-open-lids",eyesOpen),
    "eyes-soft":asset("thoughtful-half-lids",eyesSoft),
    "eyes-closed":asset("closed-lids",eyesClosed),
    "mouth-rest":mouthAsset("rest"),
    "mouth-aa":mouthAsset("aa"),
    "mouth-oh":mouthAsset("oh"),
    "mouth-mm":mouthAsset("mm"),
    "mouth-smile":mouthAsset("smile"),
    "pupil-left":pupilLeft,
    "pupil-right":pupilRight,
    beard:asset("beardless",[]),
  };
}
