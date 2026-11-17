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
  // The neutral scholar rests his lips without a thick horizontal bar:
  // slight perspective asymmetry preserves soft mouth-corner volume.
  // Other AA/OH/MM/smile paths remain independently animated visemes.
  rest:"M135.4 125.9 C137.1 125.6 139.1 126.2 141.6 126.8 C143.2 127.2 145.7 127.1 148.7 126.2",
  // The historical native OH preview read as an unbroken dark lozenge
  // on the lower cheek. A 3/4 /a/ opening is wider than /o/ but the
  // unsupported flat cartoon "mouth sticker" is not a wet-ink mouth.
  // Preserve independently riggable cels; build continuous lip-rolling
  // cubic anatomy, asymmetrical lower vermilion and real ink relief.
  aa:"M136.4 125.8 C139.3 124.95 146.4 125.35 148.3 125.1 C147.6 126.9 146.6 128.9 144.8 130.55 C142.9 132.05 140.75 130.9 139.4 129.1 C138 127.45 137.1 126.45 136.4 125.8 Z",
  oh:"M141.1 125.9 C142.6 125.2 144.1 125.42 144.9 126.52 C145.8 127.7 145.63 129.4 144.28 130.4 C143.18 131.08 141.65 130.44 141.12 129.2 C140.55 127.75 140.7 126.55 141.1 125.9 Z",
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
  {name:"far-eye-inner",x:152,y:103.6},
  {name:"far-eye-outer",x:163.5,y:102},
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
    p("M117.2 94.9 C113.3 92.7 109.1 96.2 109.2 103.2 C109.3 111.9 112.4 120.6 117.2 120.1 C121.5 117.3 121.7 107.5 117.2 94.9 Z",
      "$skin","$shadow",1.03,1),
    p("M114.2 99.4 Q111.5 101.3 112.6 107.3 Q114.2 112.2 117.1 109",
      "none","$skinshade",1.4,.56),
    p("M117.3 103.6 Q115.2 104.3 115.1 107.8 Q119.6 108.5 116.2 113.5",
      "none","$shadow",.83,.67),
    // Three-quarter temple -> broad malar arch -> rounded menton. In
    // the first source-resolution review the almost triangular chin
    // made a mask-like face; preserve the same ANAT1 menton and gonion
    // positions, but transition through a rounded 4px chin plateau.
    // The left/near cheek is fuller than the foreshortened right cheek.
    p("M119 77.6 C129.2 68.6 147.4 66.8 157.7 73.3 C163.3 78.4 166.2 87.5 165.8 97.7 C165.5 107 162.7 114.6 157.3 122.8 C154.8 126.2 152.6 129.4 150.3 131.8 C148.6 133.7 146.5 136.7 145 139 C146 141.4 144.9 143.2 143.3 143.7 C140.6 144.6 138.7 143.7 136.1 142.2 C131.8 140.2 127.4 137.3 124.9 133.1 C121.1 128.8 118.9 124.8 117.3 120.1 C115.9 116 115 112.3 114.6 106.8 C113.7 100.3 113.9 95.1 114.4 90.5 C114.7 86.8 116 81.3 119 77.6 Z",
      "$skin","$skinshade",.94,1),
    // Original Chinese portrait methods: Zeng Jing's light ink face
    // contours and multiple near-transparent wash values carry more
    // structure than a thick continuous cartoon outline. The entire
    // opaque face geometry stays untouched: the contour uses a lighter
    // pigment and thinner ink width, NEVER alpha on the skin silhouette
    // (which would make the original actor's head see-through).
    // Orbital, nasal and malar wash planes remain independently layered.
    // Soft anatomical planes are placed along the jaw and nose and never
    // replace the opaque skin silhouette (no see-through heads).
    p("M154.1 85.5 C160.8 91 162.7 100 160.1 107.8 C158.6 111.8 155.8 113.1 153 115.4 C160 113.4 163.2 108.6 163.8 103.4 C164.8 97 162.6 88.8 154.1 85.5 Z",
      "$skinshade","none",0,.14),
    // A light embedded cheek plane follows the malar arch, not the
    // old long striped jaw hatch. Preserve unpainted skin for the light.
    // A broad straight lower-cheek stripe looked like painted-on
    // hatching rather than the rounded jaw plane. Follow the
    // masseter into the mentolabial shadow with a fine wet taper.
    // The lower masseter plane curves below the cheek bulge and rolls
    // toward the labiomental hollow; it is neither a straight stripe
    // through the mouth nor an age-inappropriate wrinkle. Keep the
    // independent wet-paper plane and separate dry contour strokes.
    p("M119.2 116 C121.4 120.5 124.8 123.5 128.7 124.8 C131.3 126.1 132.6 127.6 132 129.1 C129.5 127.9 126.8 126.6 124.4 124.9 C122 122.6 120.4 119.6 119.2 116 Z",
      "$skinshade","none",0,.078),
    // No additional heavy jaw-tracing strokes: the solid face outline
    // already describes the young chin. Extra lines aged this reader.
    // Subtle, anatomically placed nose bridge and nostril. The earlier
    // big S-shaped nose looked like a cartoon cheek curl.
    // Nose-tip, alar and nostril anatomy is constructed in the separate
    // independently testable ArtCraft face-anatomy layer.
    p("M149.4 116.7 Q152 118.1 153.6 116.7",
      "none","$skinshade",.47,.21),
    // Orbital shadows sit below the eyelids, not as symmetrical smile arcs.
    p("M119.2 105.4 Q127.7 108.8 135.7 105.1",
      "none","$skinshade",.49,.4),
    p("M153.2 105.9 Q158.7 107.9 163.2 105",
      "none","$skinshade",.45,.38),
    // Philtrum and lower lip are almost invisible in the teacher art.
    p("M144.5 119.6 Q144.9 121.4 145.3 122.1",
      "none","$skinshade",.35,.37),
    // The lip underside was once stamped on the immobile head across
    // EVERY active viseme; this made OH look like a small third eye at
    // true 1×. Its identical original ink is retained below, now in the
    // independent mouth cel, so it follows the singing/speaking lips.
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
    // Scholar eyebrows carry emotion with tapered individual hair flow.
    // Two former thick near-horizontal bars overwhelmed the delicate
    // gongbi eye folds and read as stamped makeup at native resolution.
    // Follow the existing two asymmetrical sockets, peak gently in the
    // outer-middle third, and let the inner head of each brow breathe.
    // Keep all original separately planted ANAT1 follicle strokes.
    pressure([117.8,94.4],[123.3,91.2],[128.2,90.8],[135.8,96.3],
      1.18,81,"$ink",.78),
    pressure([149.2,95.5],[153.4,92.9],[158.4,92.7],[162.9,95.1],
      .94,82,"$ink",.75),
    p("M118.4 93.2 Q125.4 90.2 134.6 94.3",
      "none","$shadow",.42,.24),
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
  // Independent speech lip planes in original 260x340 head space.
  // The AA and OH dark apertures are translucent pigment separated
  // from the 3/4 orbicularis lip rim and reflected paper-light.
  // Retain the original five viseme identity/rig contracts and all
  // mouth/jaw source-space anatomy; add living shape detail, not an icon.
  const speechLips=(state:keyof typeof mouth):CharacterPathShape[]=>{
    if(state==="oh")return [
      // Lower vermilion: an irregular convex wet edge, not a badge oval.
      p("M141 130.15 C141.9 131.5 144.45 131.85 145.35 129.9 C144.65 132.35 141.95 132.8 140.95 130.85 Z",
        "$skinshade","none",0,.18),
      p("M141.15 125.82 C142.35 125.13 144.22 125.4 145.14 126.56",
        "none","$shadow",.42,.53),
      p("M141.05 130.05 C142.12 131.22 144.15 131.3 144.95 130.12",
        "none","$skinshade",.37,.56),
      // A near-transparent outer cheek-to-vermilion transition wraps the
      // oblique mouth surface; the central oral fissure is much smaller
      // than its lip ring. Wet pigments accumulate in different directions
      // instead of filling a mechanically flat oval.
      p("M141.4 126.5 C142.38 125.86 144.11 126.14 144.7 127.22 C145.12 128.06 145 129.1 144.35 129.69 C143.37 130.35 142 129.87 141.56 128.95 C141.23 128.15 141.12 127.19 141.4 126.5 Z",
        "$skinshade","none",0,.125),
      p("M142.02 127.02 C142.84 126.43 144.04 126.74 144.3 127.63 C144.56 128.53 144.31 129.37 143.54 129.68 C142.63 129.77 141.89 129.06 141.92 128.21 C141.91 127.73 141.89 127.37 142.02 127.02 Z",
        "$shadow","none",0,.32),
      p("M142.55 127.36 C143.1 127.1 143.72 127.35 143.85 127.9 C143.97 128.61 143.62 129.16 143.05 129.13 C142.55 128.97 142.41 127.95 142.55 127.36 Z",
        "$deep","none",0,.18),
      // Deepest wet ink accumulates only in a tiny crescent under the
      // receding upper lip. $deep is the lighter ochre pigment, whereas
      // $ink holds the true dark line. Never fill the full oral oval.
      // Centre-of-hole black dots read as a painted pupil. Shift the
      // strongest ink to a small tilted *upper cavity shelf* rooted in
      // the moving vermilion, leaving the lower mouth paper-translucent.
      p("M142.73 127.56 C143.03 127.43 143.52 127.54 143.69 127.78 C143.46 127.98 143.04 127.93 142.73 127.56 Z",
        "$ink","none",0,.22),
      // Unequal sidewalls: near orbicularis has a broader lip roll,
      // far lip recedes toward the nose rather than mirroring the oval.
      p("M141.08 126.85 C140.74 127.82 140.72 128.79 141.25 129.76",
        "none","$skinshade",.34,.29),
      p("M144.86 126.72 C145.36 127.59 145.27 128.56 144.84 129.44",
        "none","$shadow",.23,.29),
      pressure([141.38,125.98],[142.1,125.43],[143.73,125.58],
        [144.73,126.36],.27,792,"$shadow",.31),
      // Source paper glimmers through the lower lip's wet edge;
      // a closed translucent wedge, not a white graphic highlight.
      p("M142.18 131.3 C142.98 131.6 144.02 131.32 144.68 130.86 C144.23 131.71 143.02 131.95 142.18 131.3 Z",
        "$paper","none",0,.21),
      p("M142.3 131.85 Q143.55 132.17 144.5 131.43",
        "none","$paper",.28,.24),
    ];
    if(state==="aa")return [
      p("M136.55 125.85 C140.15 124.95 145.1 125.8 148.15 125.15",
        "none","$shadow",.49,.53),
      // A small roof of paper tone indicates a receding upper dental
      // plane without a modern white smile-sticker.
      p("M138.2 126.3 C140.9 125.8 143.9 126.3 146.35 126.2 C144.6 127.15 140.75 127.5 138.2 126.3 Z",
        "$paper","none",0,.3),
      // AA lower lip follows the jaw-opening displacement as an
      // asymmetrical convex wet plane (larger near lip, shortened far).
      p("M138.8 129.35 C140.75 130.94 144.15 131.52 147.07 128.75 C145.6 131.84 141.4 132.78 138.8 129.35 Z",
        "$skinshade","none",0,.155),
      p("M138.55 129.82 C140.2 132.08 144.15 132.52 146.15 130.18",
        "none","$skinshade",.43,.53),
      // Mouth cavity grows below the lip seam. Preserve a soft outer
      // vermilion brush wash; restrict the deeper recess to the central
      // negative space, with no straight edge across the far cheek.
      p("M137.8 126.3 C140.4 125.83 146.3 126.08 147.6 125.95 C146.8 127.64 145.4 130.2 143.95 130.75 C141.45 130.58 139.22 128.47 137.8 126.3 Z",
        "$skinshade","none",0,.14),
      p("M138.96 127.0 C141.2 126.64 145.1 127.15 146.96 126.6 C146.06 128.63 144.83 130.17 143.36 130.18 C141.62 129.93 140.13 128.62 138.96 127 Z",
        "$shadow","none",0,.29),
      p("M140.16 127.52 C141.92 127.5 144.7 127.9 145.72 127.44 C145.15 128.81 144.08 129.67 142.85 129.57 C141.53 129.24 140.76 128.43 140.16 127.52 Z",
        "$deep","none",0,.24),
      p("M141.48 127.91 C142.3 127.94 144.11 128.24 144.74 128.01 C144.35 128.7 143.63 129.08 142.77 128.95 C142.13 128.7 141.78 128.36 141.48 127.91 Z",
        "$ink","none",0,.26),
      pressure([137.22,125.85],[139.72,125.45],[144.7,125.73],
        [147.85,125.26],.3,793,"$shadow",.32),
      pressure([139.1,129.44],[140.32,131.07],[143.65,131.76],
        [145.58,130.35],.26,794,"$skinshade",.32),
      p("M140.25 130.2 C141.42 131.02 144.43 131.48 145.2 130.02",
        "none","$deep",.28,.38),
      p("M139.5 132.18 Q142.54 133.18 145.75 131.45",
        "none","$paper",.31,.24),
    ];
    return [];
  };
  // A static resting stomion across the centre of a rounded /o/
  // made the native 3× close-up resemble a third eye. Keep ALL original
  // ANAT1 orbicularis and paper-reserve paths, but turn their 4 inherited
  // resting-mouth contours into the physically displaced upper/lower lip
  // planes for speaking cels. This is not a loss of fine marks: the paths
  // retain the original material, opacity, topology count and rig.
  const speechAnatomyLips=(state:keyof typeof mouth):CharacterPathShape[]=>{
    if(state!=="aa"&&state!=="oh")return anatomy.lips;
    const moved:readonly string[]=state==="oh"?[
      "M141.7 131.35 Q143.1 132.2 144.6 131.1",
      "M140.45 125.45 C141.5 124.92 143.45 124.94 145.12 125.73 C143.5 125.58 141.98 125.53 140.45 125.45 Z",
      "M140.65 125.45 Q142.7 124.82 145.15 125.86",
      "M141.04 131.12 Q142.98 132.4 144.9 130.72",
    ]:[
      "M138.85 132.12 Q142.2 133.3 145.85 131.35",
      "M136.3 124.8 C140.3 124.05 146.2 124.31 148.52 124.45 C145.5 125.7 140.1 125.28 136.3 124.8 Z",
      "M136.3 124.82 Q142.2 124.1 148.5 124.58",
      "M138.75 131.2 Q142.65 133.42 146.75 130.05",
    ];
    return anatomy.lips.slice(2).map((shape,i)=>
      shape.type==="path"&&i<moved.length?
        {...shape,d:moved[i]}:shape);
  };
  // Move the ACTUAL original lower-lip light off the immobile face
  // and onto the speaking cel; preserve ink/material/weight/opacity in
  // REST and let its 3/4 anatomical attachment bend with AA and OH.
  const attachedLowerLip=(state:keyof typeof mouth)=>
    p(state==="aa"?
      "M138.5 132 Q142.8 134.1 146.3 130.8":
      state==="oh"?
      "M141.05 131.05 Q143.05 132.72 145.02 130.8":
      "M139.9 129.6 Q143.6 131.7 147.2 128.6",
    "none","$skinshade",.46,.35);
  const mouthAsset=(state:keyof typeof mouth)=>asset("mouth-"+state,[
    ...speechAnatomyLips(state),
    // The aperture is not a fully opaque cartoony dark badge. Pigment
    // optically builds via multiple independent lip and cavity passes.
    p(mouth[state],state==="aa"||state==="oh"?"$shadow":"none",
      state==="aa"||state==="oh"?"none":"$shadow",
      state==="aa"||state==="oh"?0:state==="mm"?.84:state==="rest"?.74:.9,
      // The source opening is the barely stained first wet impression:
      // dark cavity values are layered centrally, not pasted in one fill.
      state==="aa"?.17:state==="oh"?.18:state==="rest"?.75:.9),
    ...speechLips(state),
    attachedLowerLip(state),
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
    // Real 1× Chromium review showed a second isolated dark dot just
    // outside the near iris. Preserve its separate pressure mark, but
    // bring it INSIDE the original ANAT1 limbal envelope (125.2..129.4)
    // as the broken far-side iris rim, not an extra pupil.
    p("M128.15 105.18 Q128.58 105.92 128.02 107.2",
      "none","$ink",.36,.51),
  ]);
  const pupilRight=asset("far-pupil",[
    ...anatomy.farPupil,
    // A projected far-eye iris is a single oval under the upper tarsus.
    // Retain this micro-stroke, following the inside of its distal edge
    // instead of an unrelated heavy dash beside the pupil.
    p("M158.02 104.57 Q158.42 105.38 157.92 106.13",
      "none","$ink",.28,.49),
  ]);
  // The near ear needs its own OVER-HAIR plane. In the source painting
  // the ear is outlined *in front of* the sideburn; putting both marks
  // inside the base face asset hid it beneath the cap and read as a wedge.
  const visibleEar=asset("near-ear-front-plane",[
    // The ear turns behind the sideburn rather than hanging as a uniform
    // ink oval. Its rounded soft lobule returns into the cheek without a
    // sharp apex, and the rim has more paper-visible negative space.
    p("M117.1 95.2 C113.6 93.7 110.5 97.9 110.3 103.7 C110.25 109 112.1 115.1 115.7 118.5 C117.9 120 119.2 117.1 119.3 113.6 C120.7 109.9 120.3 104.7 118.7 98.9 C118.15 96.8 117.6 95.45 117.1 95.2 Z",
      "$skin","$shadow",.78,1),
    // Outer rim/fossa: a shallow scapha wash, not two nested C-shaped
    // outlines that make the source portrait look like a rubber stamp.
    p("M115.65 97.7 C112.7 97.3 111.2 100.6 111.85 104.9 C112.2 108.2 113.25 111.5 114.9 112.8",
      "none","$skinshade",.56,.45),
    // ANAT1 Y-shaped antihelix: the superior and inferior crura depart
    // from exactly the same stem hinge while projecting at different depths.
    p("M116.15 113.4 C114.65 111.45 113.8 109.15 114.45 106.7 M114.45 106.7 C113.7 104.4 114.3 101.9 116.35 100.95 M114.45 106.7 C115.5 105.25 117 105.3 117.75 106.5",
      "none","$shadow",.55,.57),
    p("M111.25 102.7 Q111.02 107.2 113.12 114.5",
      "none","$paper",.43,.57),
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
