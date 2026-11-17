/**
 * ArtCraft 2D anatomy pass for the original young three-quarter scroll reader.
 *
 * Technique references: Ming portraits of scholars (Met 55.37), Ruan Zude's
 * Yizhai portrait (Met 59.49.1), and the individual controlled figure strokes
 * in Qiu Ying's Sixteen Luohans (Met 1989.235.3). These are MATERIAL/STROKE
 * benchmarks only. The project teacher image retains silhouette/identity
 * authority; no museum contours or source pixels are imported.
 *
 * All coordinates are original portrait-space 260 × 340 geometry in the
 * existing head pivot. Separate small masses, eyelid edges, iris and nose
 * details keep the face anatomically readable when animated. Do not invent
 * separate circles as cartoon pupils.
 */
import type {CharacterPathShape} from "../../registry/character/definition";
import {inkPressureStroke} from "./ink-shanshui-fine-craft";
import {readerInkPortraitGlazes} from "./ink-shanshui-reader-glazes";
import type {FaceLandmark} from "../../registry/anatomy/anatomy-face";

type P=[number,number];
/**
 * ANAT1 face-landmark vocabulary mapped to this ORIGINAL three-quarter
 * teacher-observed 260×340 image. Image-space coordinates are not a frontal
 * MediaPipe render: far-side foreshortening, head pitch and the existing
 * 139,124 animation pivot remain deliberate. Do NOT replace them with
 * symmetric adult averages or make claims about a sitter's identity.
 * These landmarks are the authority for subsequent facial-plane painting.
 */
export const READER_FACE_ANAT1_POINTS={
  "exocanthion.R":[118.4,103],
  "endocanthion.R":[135.5,104.1],
  "palpebrale-superius.R":[126.7,101.8],
  "palpebrale-inferius.R":[126.7,108.3],
  "exocanthion.L":[163.8,103],
  "endocanthion.L":[149.1,103.7],
  "palpebrale-superius.L":[156.4,102],
  "palpebrale-inferius.L":[156.4,106.9],
  "brow-outer.R":[118.1,94.3],
  "brow-inner.R":[135.8,96.3],
  "brow-inner.L":[149.2,95.5],
  "brow-outer.L":[162.9,95.1],
  "sellion":[147.2,99.5],
  "pronasale":[153.8,116.7],
  "subnasale":[151.8,119.2],
  "alare.R":[149.1,116.1],
  "alare.L":[156.1,117.5],
  "labiale-superius":[142.2,125.7],
  "stomion":[142.2,126.8],
  "labiale-inferius":[142.5,128.5],
  "cheilion.R":[135.5,126],
  "cheilion.L":[149,126.7],
  "sublabiale":[143,132.7],
  "pogonion":[143.9,140.8],
  "menton":[143.3,143.7],
  "zygion.R":[119.1,111.7],
  "zygion.L":[161.5,111.7],
  "gonion.R":[124.9,133.1],
  "gonion.L":[153,126.5],
} as const satisfies Partial<Record<FaceLandmark,readonly [number,number]>>;
const coord=(n:keyof typeof READER_FACE_ANAT1_POINTS)=>READER_FACE_ANAT1_POINTS[n];
const num=(v:number)=>Number(v.toFixed(2));
const ink=(d:string,fill="none",stroke="$shadow",strokeWidth=.7,
  opacity=.65):CharacterPathShape=>({
    type:"path",d,fill,stroke,strokeWidth,opacity,
  });
const line=(from:P,c1:P,c2:P,to:P,width:number,seed:number,
  pigment="$shadow",opacity=.7):CharacterPathShape=>
  inkPressureStroke({
    from:{x:from[0],y:from[1]},
    c1:{x:c1[0],y:c1[1]},c2:{x:c2[0],y:c2[1]},
    to:{x:to[0],y:to[1]},width,seed,ink:pigment,opacity,samples:19,
  });

export const READER_FACE_CRAFT_REGIONS=[
  {id:"orbit-near",observed:"Longer near eyelid; soft brow ridge and dark iris under the lid",
    bounds:[117,98,138,111]},
  {id:"orbit-far",observed:"Foreshortened far eye; shorter lower lid and restrained sclera",
    bounds:[148,99,166,109]},
  {id:"nasal-bridge",observed:"Tapered nasal ridge, tip and transitional tonal side plane",
    bounds:[145,98,157,117]},
  {id:"alar-nostril",observed:"Asymmetric alar wings and subtle underside nostril accents",
    bounds:[147,113,157,121]},
  {id:"cheek-volume",observed:"Tempered malar and jaw modeling by transparent ink washes",
    bounds:[119,108,163,141]},
  {id:"mouth-volume",observed:"Upper/lower lip relief, philtrum and slight unequal corners",
    bounds:[133,121,151,133]},
  {id:"ear-concha",observed:"Helix turns into concha and tragus before joining lobe",
    bounds:[108,94,123,121]},
] as const;

export interface ReaderFacialAnatomy {
  planes:CharacterPathShape[];
  nose:CharacterPathShape[];
  ear:CharacterPathShape[];
  brow:CharacterPathShape[];
  eyesOpen:CharacterPathShape[];
  eyesSoft:CharacterPathShape[];
  eyesClosed:CharacterPathShape[];
  nearPupil:CharacterPathShape[];
  farPupil:CharacterPathShape[];
  lips:CharacterPathShape[];
}

/** Stable facial layers, allowing the expression rig to swap lids and
 * translate pupil assets independently. A closed eye never carries an iris. */
export function readerFaceAnatomy(detail=1):ReaderFacialAnatomy {
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Reader face anatomy detail must be in 0..1");
  const medium=detail>=.45,high=detail>=.8;
  const planes:CharacterPathShape[]=[
    // Keep the skintone flat and opaque behind transparent character planes.
    // Front cheek is fuller than the foreshortened far cheek.
    // The original 1× portrait showed a hard diagonal streak all the
    // way to the mouth. Rotate this malar wash around the ANAT1 zygion:
    // softly convex upper cheek fades towards the buccal pocket and
    // keeps unpainted central paper. No layer is removed.
    ink("M119.1 107.9 C121.1 111 123.2 115.9 126.9 119.2 C129.7 122.1 133.7 124.1 137.9 126.1 C132.6 124.8 128.8 123 125.8 120.8 C122.2 116.8 120 112.2 119.1 107.9 Z",
      "$skinshade","none",0,.095),
    ink("M152.8 100.8 C158.2 104.3 159.2 112.4 154.8 117.9 C161.1 114.1 162.2 107.7 160.8 101 Z",
      "$skinshade","none",0,.17),
    ink("M132.7 131.9 C139.3 136.9 145.4 138.7 149.8 132.8 C145.5 141.4 138.4 143.1 132.7 131.9 Z",
      "$skinshade","none",0,.13),
  ];
  // Zeng Jing-style graded face volume beneath baimiao outlines. Eight
  // distinct closed wet-paper value planes follow the ANAT1 canthi,
  // sellion/alar, zygion and lip/chin stations rather than random hatching.
  // No opaque cartoon blush circles, mirror symmetry or new face overlay.
  const nearCanthus=coord("endocanthion.R"),
    farCanthus=coord("endocanthion.L"),
    sellion=coord("sellion"),noseTip=coord("pronasale"),
    cheek=coord("zygion.R"),farCheek=coord("zygion.L"),
    chin=coord("menton");
  const plane=(d:string,opacity:number)=>
    ink(d,"$skinshade","none",0,opacity);
  planes.push(
    plane(
      "M117.7 99.7 C123.3 96.2 129.8 97 "+
      num(nearCanthus[0]+.8)+" "+num(nearCanthus[1]-3)+" "+
      "C130.7 99.6 125.2 101.1 120.1 104.6 "+
      "C118.4 103.7 117.6 101.9 117.7 99.7 Z",.235),
    plane(
      "M"+num(farCanthus[0]-.7)+" "+
      num(farCanthus[1]-3)+" C153.4 97 160.1 97.6 164.1 99.8 "+
      "C162.8 101.1 158.4 102 153.8 103.9 "+
      "C151.2 103.8 149.5 102.4 148.3 99.9 Z",.19),
    // A soft, sloping anatomical glabella→nose bridge, lifted paper
    // on the center plane and an alar shadow on the near nostril.
    plane(
      "M"+num(sellion[0]+.9)+" "+num(sellion[1]+.9)+
      " C149.1 103.8 150.4 109.1 152.2 112.5 "+
      "C153.8 114.1 154.6 115.7 154 117.1 "+
      "C152.7 116.6 150.7 114.8 149.7 112.4 "+
      "C148.8 109.6 148.2 105.2 148.1 100.4 Z",.185),
    plane(
      "M149.1 113.9 C151.2 112.9 154.8 114.5 156.6 116.5 "+
      "C156.4 118.9 153.8 119.7 151.4 118.8 "+
      "C153.4 117.9 151.7 115.8 149.1 113.9 Z",.2),
    // Wide malar transition gives the cheek its actual skull volume
    // without dark drawn stripes or the previous mask-like flatness.
    plane(
      "M"+num(cheek[0]+1.7)+" "+num(cheek[1]-2.1)+
      " C125.6 110 132.9 113.4 137.2 116.3 "+
      "C139.8 119 140.6 121 138.7 121.6 "+
      "C134.6 119.4 129.7 116.8 126.3 114.2 "+
      "C123.5 112.5 121.8 111.6 120.8 109.6 Z",.125),
    plane(
      "M"+num(farCheek[0]-6.3)+" "+num(farCheek[1]-4.7)+
      " C159 108.2 161.5 110.8 161.4 114.2 "+
      "C159.9 119.6 156.9 122.6 152.1 126.2 "+
      "C156.7 119.1 158.7 113.6 155.2 107 Z",.165),
    plane(
      "M136 129.9 C139.1 131.9 145.5 132.8 150.3 129.6 "+
      "C149 134.1 146 138.1 142.9 138.1 "+
      "C139.1 137.2 137 134.4 136 129.9 Z",.185),
    plane(
      "M133.8 137.6 C137.3 139.4 141.6 142.4 "+
      num(chin[0])+" "+num(chin[1])+
      " C140.5 144.1 136.8 141.2 133.8 137.6 Z",.12),
    // Paper-bright planar relief (not a white glow or a skin-gradient).
    ink("M146.7 100.8 C147.8 104.4 149.1 108.5 149 111.5 "+
      "C147.3 109.4 146.5 105.2 146.7 100.8 Z",
      "$paper","none",0,.32),
    ink("M125.8 114.1 C129 113.3 134.2 114.9 137.7 117.4 "+
      "C134.9 116.8 130.7 116.7 125.8 114.1 Z",
      "$paper","none",0,.16),
    ink("M148.6 125.4 Q150.3 121.7 "+num(noseTip[0])+
      " "+num(noseTip[1])+" Q151.5 120.7 148.6 125.4 Z",
      "$paper","none",0,.13),
  );
  if(medium)planes.push(
    ink("M120.4 111.7 C122.5 114.4 124.7 118.2 129 120.4 C125 117.4 123.3 114.5 122.9 112.8 Z",
      "$skinshade","none",0,.11),
    ink("M144.9 106.3 Q147.7 108.4 148.3 113.2 Q150.2 110.2 149.8 106.5 Z",
      "$skinshade","none",0,.13),
    // Non-specular light picked out by leaving paper-tone pigment.
    ink("M145.6 99.1 Q146.8 105.6 147.2 109.8 Q146.3 107.3 145.6 99.1 Z",
      "$paper","none",0,.31),
  );
  if(high)planes.push(
    line([120.3,111.8],[123,115.6],[126.5,116.9],[130.6,117.5],
      .37,620,"$skinshade",.25),
    line([122,119],[126.1,126.7],[131.4,129.6],[135.4,130.8],
      .42,621,"$skinshade",.26),
    line([155.5,122],[152,127.3],[149.2,130.7],[146.9,131.4],
      .39,622,"$skinshade",.25),
  );
  // Retain every existing original face wash and source pressure edge.
  // Add only translucent, source-anchored multi-pass glazes. Layered
  // technique follows Zeng Jing / Bochen portrait relief: convex paper
  // remains visibly bright, unlike a single hard nasal triangle.
  const glazes=readerInkPortraitGlazes({
    nearCanthus,farCanthus,sellion,noseTip,
    nearCheek:cheek,farCheek,chin,
  },detail);
  for(const region of Object.values(glazes))planes.push(...region);
  const nose:CharacterPathShape[]=[
    // The original native crop showed a harsh acute slash from brow to
    // tip and several overlapping dark hooks that read as a beak. Use a
    // pressure-tapered dorsal line, leave the forward bridge plane
    // unpainted and describe alar cartilage with lighter separated
    // strokes, not a single black S. All positions derive from the
    // original ANAT1 3/4 nose bridge, tip and alare.
    line([147.2,99.5],[148.4,104],[149.2,108.4],[151,112.9],
      .62,630,"$shadow",.53),
    line([148.1,104.5],[147.8,109.4],[148.3,112.4],[149.5,114.2],
      .38,631,"$skinshade",.29),
    ink("M151.1 114 C153.2 113.9 154.3 114.6 154.9 115.8 Q155 116.8 153.8 117.2",
      "none","$shadow",.45,.43),
    ink("M149.2 116.4 Q149.8 117.7 151.5 118.4",
      "none","$shadow",.42,.52),
    ink("M154.2 116.8 Q154.8 117.9 155.8 117.4",
      "none","$ink",.39,.46),
    ink("M149.9 117.7 Q150.6 118.4 151.3 118.4",
      "none","$ink",.32,.45),
    // Nasal tip relief is part of the nose/alar volume. The near nostril
    // is an oblique aperture, not a centered cartoon S or duplicate curve.
    ink("M149.2 113.8 C151.2 114.5 153.5 116.1 154.3 117.6 "+
      "C151.6 117.5 149.8 116.8 149.2 113.8 Z",
      "$skinshade","none",0,.21),
    ink("M150.2 118.1 Q151.1 118.7 152.3 118.2",
      "none","$ink",.31,.46),
  ];
  if(high)nose.push(
    ink("M151.3 112.1 Q153.1 112.1 154.3 113.4",
      "none","$paper",.49,.55),
    line([156.3,115],[157,116.5],[155.4,118.5],[154.3,119],
      .38,632,"$skinshade",.31),
  );
  const ear:CharacterPathShape[]=[
    // Baimiao line economy + weak ochre/wash modelling. Anatomical anchors:
    // an outer rolled helix, shallow scapha, Y-branch antihelix, concha,
    // tragus/antitragus/intertragal notch, and non-cartilaginous lobule.
    // In three-quarter projection all of these must remain distinct,
    // not three concentric ornamental spirals.
    ink("M116.55 96.95 C113.85 96.8 112.25 99.35 112.58 103.4",
      "none","$shadow",.40,.37),
    // Superior helix crus breaks toward the triangular fossa rather
    // than continuing parallel around the entire outer rim.
    ink("M115.2 102.35 Q116.5 101.65 117.85 102.75",
      "none","$shadow",.42,.37),
    // The lower antihelix returns to antitragus, not a round cartoon curl.
    ink("M113.65 110.7 C114.6 112.6 116.6 113.1 117.45 112.2",
      "none","$skinshade",.47,.58),
    // Tragus is a small inward lip facing the shadowed meatus.
    ink("M118.5 108.7 Q117.5 109.45 117.85 110.6 Q118.45 111.6 117.55 112.1",
      "none","$deep",.4,.56),
    ink("M112.8 103.2 Q112.4 106.3 114 108.9",
      "none","$paper",.35,.49),
  ];
  if(high)ear.push(
    // Soft lobule has little or no cartilage; no hard spiral inside it.
    line([115.65,115.2],[117,116],[118.3,117.5],[116.5,118.3],
      .35,634,"$shadow",.4),
    ink("M111.35 99.95 Q110.95 102.6 111.2 104.5",
      "none","$paper",.43,.53),
    // The asymmetric concha is a *recessed* ink-wash volume, not a ring.
    ink("M116.9 107.35 C117.85 107 118.6 107.7 118.7 108.65 C118.4 109.45 117.7 110.6 116.6 110.35 C116.2 109.65 116.35 108.25 116.9 107.35 Z",
      "$shadow","none",0,.21),
    ink("M117.6 109.4 Q118.45 109.9 118.05 110.85",
      "none","$deep",.40,.47),
    ink("M117.0 110.15 Q116.7 109.5 117.25 109.0",
      "none","$deep",.23,.32),
    // Weak ochre glaze holds the upper scapha and antitragal fold
    // together without smearing the contour or erasing paper grain.
    ink("M112.65 100.4 C112.1 107.5 114.15 113.8 115.8 115",
      "none","$skinshade",1.45,.11),
  );
  const brow:CharacterPathShape[]=[];
  if(medium){
    // Different follicle directions across the brow; do not make two
    // copied stamped eyebrows or perfectly parallel hatch rows.
    for(let i=0;i<7;i++){
      const x=119.9+i*2.05;
      const y=93.5-1.5*Math.sin((i+.5)/7*Math.PI)+i*.18;
      brow.push(line([x,y+.45],[x+.9,y-.8],[x+1.1,y-.9],
        [x+1.9,y-.33],.18,650+i,"$deep",.49));
    }
    for(let i=0;i<5;i++){
      const x=150.6+i*2.17;
      const y=95.1-.9*Math.sin((i+.3)/5*Math.PI);
      brow.push(line([x,y+.4],[x+.65,y-1],[x+1.2,y-.6],
        [x+1.7,y-.2],.16,660+i,"$deep",.47));
    }
  }
  const eyesOpen:CharacterPathShape[]=[
    // Apertures and tear ducts are closed tinted slivers—not dot eyes.
    ink("M118.4 103 C124.2 100.7 130.2 101.6 135.5 104.1 C132.3 107.2 125.9 110.2 119 105.1 Z",
      "$paper","none",0,.67),
    ink("M149.1 103.7 C153.7 101.9 159.3 102 163.8 103 C161.4 106.1 155.1 107.5 149.5 106.3 Z",
      "$paper","none",0,.61),
    line([118.3,103.4],[123.7,100.9],[130.2,101.6],[135.5,104.1],
      1.36,670,"$ink",.9),
    line([149.1,103.7],[153.9,102],[159.4,102.2],[163.8,103],
      1.13,671,"$ink",.9),
    ink("M118.8 105.2 C123.3 108.8 130 109.4 135.2 105.6",
      "none","$shadow",.66,.69),
    ink("M149.5 106.3 C154.4 107.6 159.7 106.5 163.6 103.8",
      "none","$shadow",.53,.66),
    // Fine medial canthus; do not enlarge into round doll highlights.
    ink("M135 104.4 Q136 103.9 136.6 105.2",
      "none","$skinshade",.48,.61),
    ink("M149 104.4 Q148.4 103.8 147.9 104.4",
      "none","$skinshade",.42,.58),
  ];
  if(medium)eyesOpen.push(
    ink("M120 109.3 Q125.1 111.6 132.1 109.1",
      "none","$skinshade",.49,.36),
    ink("M150.3 108.1 Q155.8 109.3 161.3 106.4",
      "none","$skinshade",.44,.33),
  );
  if(high)eyesOpen.push(
    line([119.2,102.6],[118.8,103.7],[118.2,104.8],[117.5,105.1],
      .35,678,"$ink",.57),
    line([163.2,103],[164.1,103.7],[164.6,104.3],[164.7,104.8],
      .33,679,"$ink",.53),
  );
  const eyesSoft:CharacterPathShape[]=[
    // Layer a thin *real almond opening* beneath each lowered upper lid.
    // Without it the gaze looked like two stamped straight eyebrow dashes
    // and its moving iris appeared to float on bare skin. These are tiny
    // partial scleral reserves, not wide cartoon white eyes; the near
    // aperture spans more canvas because the face is in 3/4 view.
    ink("M118.4 104.6 C123.7 103.7 130.4 104.4 135.4 105.9 "+
      "C132.2 107.2 125 108.2 119.1 106.3 Z",
      "$paper","none",0,.38),
    ink("M149.1 104.8 C154 103.8 160.1 103.6 163.7 103.9 "+
      "C160.9 105.9 155.4 106.6 149.6 105.9 Z",
      "$paper","none",0,.32),
    // Each upper lid folds over the iris; two differently weighted
    // tarsal creases follow the sockets rather than mirroring.
    line([118.2,104.2],[124.1,102.9],[129.7,104.1],[135.6,105.7],
      1.08,690,"$shadow",.73),
    line([149.1,104.8],[153.5,103.4],[159.7,103.1],[163.9,103.9],
      .83,691,"$shadow",.66),
    // Downcast eyes still have curved tarsal planes and an orbital
    // shadow; a horizontal flat-line gaze destroys volume and emotion.
    ink("M118.5 104.3 C123.4 102.5 130.2 102.8 135.4 105.5 "+
      "C132.1 106.3 125.3 107 119.1 105.2 Z",
      "$skinshade","none",0,.205),
    ink("M149.1 104.7 C153.8 102.9 159.9 102.9 163.7 103.2 "+
      "C161.5 105.4 155.6 106.6 149.5 105.8 Z",
      "$skinshade","none",0,.175),
    ink("M118.3 105 C124.1 104.4 130.1 104.7 135.5 105.8",
      "none","$shadow",1.07,.83),
    ink("M149.1 105.4 Q155.6 104.2 163.5 103.9",
      "none","$shadow",.94,.83),
    ink("M119.2 107.2 Q126.3 109 134.8 107.4",
      "none","$skinshade",.52,.56),
    ink("M149.7 107.2 Q156.1 108.4 163.2 105.1",
      "none","$skinshade",.5,.51),
    ink("M121 110.2 Q126.5 111.3 132.6 109.2",
      "none","$skinshade",.4,.35),
  ];
  const eyesClosed:CharacterPathShape[]=[
    line([118.4,106.5],[125.2,108.5],[130.7,109.1],[135.2,107.4],
      1.01,680,"$ink",.94),
    line([149.2,107.1],[155.5,107.6],[159.3,106.9],[163.6,105.2],
      .95,681,"$ink",.91),
    ink("M120 109 Q126 110.5 133.4 108.6",
      "none","$skinshade",.52,.41),
  ];
  const nearPupil:CharacterPathShape[]=[
    // Partial upper iris belongs to gaze-target asset, inside the aperture.
    ink("M125.2 104.5 Q127 103.9 128.8 104.7 Q129.4 106.6 127.3 108.3 Q125.4 107.7 125.2 104.5 Z",
      "$shadow","none",0,.68),
    ink("M126.3 104.8 Q127.4 104.5 127.7 105.7 Q127.7 107.3 126.8 107.6",
      "none","$ink",.71,.81),
    ink("M125.7 105.1 Q126.2 104.4 126.5 104.5",
      "none","$paper",.38,.46),
  ];
  const farPupil:CharacterPathShape[]=[
    ink("M156 104 Q157.6 103.5 158.6 104.1 Q159.1 105.8 157.3 106.7 Q156.1 106.2 156 104 Z",
      "$shadow","none",0,.62),
    ink("M157.1 104.2 Q157.8 104.5 157.6 106",
      "none","$ink",.63,.8),
    ink("M156.3 104.5 Q156.5 104.1 156.8 104.1",
      "none","$paper",.29,.43),
  ];
  const lips:CharacterPathShape[]=[
    // Orbicularis oris upper roll and lower lip reflected plane: the
    // near corner is lower and the far corner lifts a fraction as the
    // actual three-quarter muzzle rotates. This stays BELOW the live
    // mouth cels, so speech/visemes and smiles never become fixed paint.
    ink("M135.5 126.1 C137.9 125.2 139.3 124.7 141.8 125.8 "+
      "C144.5 125.5 147.2 125.3 149 126.6 "+
      "C145.5 127.5 141.5 127 138.8 126.8 "+
      "C137.2 126.8 136.2 126.6 135.5 126.1 Z",
      "$skinshade","none",0,.185),
    ink("M137.5 127.6 C139.7 128.9 144.1 130.1 147.7 127.8 "+
      "C145.2 130.9 140.5 130.6 137.5 127.6 Z",
      "$skinshade","none",0,.16),
    ink("M139.5 128.7 Q143.2 129.7 145.8 128.2",
      "none","$paper",.39,.36),
    ink("M135.5 126 Q139 125.6 141.9 126.6 Q145.7 126.7 149 126.7 Q145.5 129.1 142.4 128.5 Q138.6 127.9 135.5 126 Z",
      "$skinshade","none",0,.28),
    // This fixed anatomical lip-roll is not the speaking mouth seam.
    // Let the expression-specific cel own the visible mouth contour;
    // keep the original lip muscle geometry as a finer wet value.
    ink("M135.2 125.9 Q138.9 125.6 142 126.7 Q145.9 127 148.7 126.6",
      "none","$skinshade",.42,.47),
    ink("M137.2 128.3 Q142.1 130.2 147.1 127.2",
      "none","$skinshade",.48,.49),
    ink("M134.4 125.1 Q135.3 125.4 135.7 126.1",
      "none","$shadow",.39,.52),
  ];
  if(high)lips.push(
    ink("M139.1 123.4 Q140.1 122.5 141.2 123.3",
      "none","$skinshade",.34,.4),
    ink("M146.5 125.9 Q148.4 126.5 149.2 124.2",
      "none","$skinshade",.38,.38),
  );
  return {planes,nose,ear,brow,eyesOpen,eyesSoft,eyesClosed,nearPupil,
    farPupil,lips};
}
