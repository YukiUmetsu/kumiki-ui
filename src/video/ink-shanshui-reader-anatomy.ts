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
  "exocanthion.L":[163.9,102],
  "endocanthion.L":[149,102.9],
  "palpebrale-superius.L":[156.4,101.2],
  "palpebrale-inferius.L":[156.4,106.1],
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
    ink("M119.1 107.9 C122.3 109.4 124.1 117.3 127.4 120.2 C131.3 123.8 136.9 124.1 139.4 127.7 C132.1 125.1 123.5 121.3 119.1 107.9 Z",
      "$skinshade","none",0,.11),
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
      " C149.2 103.4 153 109.3 155 112.6 "+
      "C156.1 115.1 155.4 117 153.9 118.5 "+
      "C152 116.8 149.5 113.3 148.7 109 "+
      "C148.1 105.3 148 102 148.1 100.4 Z",.26),
    plane(
      "M149.1 113.9 C151.2 112.9 154.8 114.5 156.6 116.5 "+
      "C156.4 118.9 153.8 119.7 151.4 118.8 "+
      "C153.4 117.9 151.7 115.8 149.1 113.9 Z",.2),
    // Wide malar transition gives the cheek its actual skull volume
    // without dark drawn stripes or the previous mask-like flatness.
    plane(
      "M"+num(cheek[0]+1.7)+" "+num(cheek[1]-2.1)+
      " C124.9 107 132.3 109.5 139.8 113.8 "+
      "C143.2 117.5 145.1 121.1 143.8 124.8 "+
      "C138.9 124.1 133.1 120.5 128.3 117.8 "+
      "C124.3 115.9 122.1 112.6 120.8 109.6 Z",.16),
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
  const nose:CharacterPathShape[]=[
    // Two separated bridge strokes, not a curled S pasted onto the cheek.
    line([147.2,99.5],[149,104.4],[150.3,108.4],[151.3,112.4],
      .8,630,"$shadow",.68),
    line([148.1,104.5],[147.8,109.6],[148.3,112.5],[149.6,114.3],
      .43,631,"$skinshade",.34),
    ink("M151.2 113.5 Q153.9 114 155.3 115.7 Q155.2 117.1 153.8 117.7",
      "none","$shadow",.59,.57),
    ink("M149.1 116.1 Q149.3 118.2 151.7 118.8",
      "none","$shadow",.56,.69),
    ink("M154.3 116.8 Q155.2 118.6 156.1 117.5",
      "none","$ink",.56,.63),
    ink("M149.7 117.6 Q150.4 118.6 151.2 118.6",
      "none","$ink",.42,.63),
    // Nasal tip relief is part of the nose/alar volume. The near nostril
    // is an oblique aperture, not a centered cartoon S or duplicate curve.
    ink("M149.2 113.8 C151.2 114.5 153.5 116.1 154.3 117.6 "+
      "C151.6 117.5 149.8 116.8 149.2 113.8 Z",
      "$skinshade","none",0,.21),
    ink("M150.2 118.1 Q151.1 118.7 152.3 118.2",
      "none","$ink",.31,.46),
  ];
  if(high)nose.push(
    ink("M151.2 111.8 Q153.2 111.7 154.5 113.1",
      "none","$paper",.53,.59),
    line([156.3,115],[157,116.5],[155.4,118.5],[154.3,119],
      .38,632,"$skinshade",.31),
  );
  const ear:CharacterPathShape[]=[
    ink("M117 97.8 Q112.2 96.3 110.7 101.6 Q110.7 107.3 114.1 110.5",
      "none","$shadow",.7,.64),
    ink("M114.5 100.6 C118.1 98.6 120.7 103.9 118 106.6 C116.9 107.2 116.2 108.1 117 109.8",
      "none","$shadow",.79,.78),
    ink("M112.1 105.9 Q111.5 110.1 115.1 113.8 Q118.8 117.6 117 118.8",
      "none","$skinshade",.76,.7),
    ink("M117.8 105.3 Q114.6 104.9 115.6 107.2",
      "none","$deep",.6,.7),
    ink("M113.4 110.2 Q114.4 112 115.9 111.2",
      "none","$paper",.65,.57),
  ];
  if(high)ear.push(
    line([115.9,114.1],[117.3,115.4],[117.9,117.9],[116.2,118.7],
      .44,634,"$shadow",.62),
    ink("M111.7 100.4 Q111.1 102.9 111.4 105.1",
      "none","$paper",.5,.45),
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
    ink("M149.1 102.9 C153.2 100.7 159.1 100.9 164 101.9 C160.8 105.6 154.9 107.1 149.5 105.5 Z",
      "$paper","none",0,.61),
    line([118.3,103],[123.7,100.8],[130,101.5],[135.5,104.1],
      1.65,670,"$ink",.96),
    line([149,102.9],[154.5,101.2],[160.8,100.8],[163.9,102],
      1.3,671,"$ink",.96),
    ink("M118.8 105.2 C123.3 108.8 130 109.4 135.2 105.6",
      "none","$shadow",.66,.69),
    ink("M149.5 105.5 C154.4 107.1 159.5 106.2 163.6 102.8",
      "none","$shadow",.53,.66),
    // Fine medial canthus; do not enlarge into round doll highlights.
    ink("M135 104.4 Q136 103.9 136.6 105.2",
      "none","$skinshade",.48,.61),
    ink("M148.9 103.8 Q148.1 103 147.8 103.8",
      "none","$skinshade",.42,.58),
  ];
  if(medium)eyesOpen.push(
    ink("M120 109.3 Q125.1 111.6 132.1 109.1",
      "none","$skinshade",.49,.36),
    ink("M150.3 107.6 Q156.1 109 161 105.8",
      "none","$skinshade",.44,.33),
  );
  if(high)eyesOpen.push(
    line([119.2,102.6],[118.8,103.7],[118.2,104.8],[117.5,105.1],
      .35,678,"$ink",.57),
    line([163.2,102],[164.3,102.8],[164.9,103.4],[165,104],
      .33,679,"$ink",.53),
  );
  const eyesSoft:CharacterPathShape[]=[
    // Downcast eyes still have curved tarsal planes and an orbital
    // shadow; a horizontal flat-line gaze destroys volume and emotion.
    ink("M118.5 104.3 C123.4 102.5 130.2 102.8 135.4 105.5 "+
      "C132.1 106.3 125.3 107 119.1 105.2 Z",
      "$skinshade","none",0,.205),
    ink("M149 103.9 C154.2 101.9 160.1 101.7 163.8 102.2 "+
      "C161.8 104.8 155.8 105.8 149.4 104.8 Z",
      "$skinshade","none",0,.175),
    ink("M118.3 105 C124.1 104.4 130.1 104.7 135.5 105.8",
      "none","$shadow",1.07,.83),
    ink("M149 104.6 Q155.7 103.6 163.5 103",
      "none","$shadow",.94,.83),
    ink("M119.2 107.2 Q126.3 109 134.8 107.4",
      "none","$skinshade",.52,.56),
    ink("M149.6 106.6 Q156.1 107.8 163.1 104.3",
      "none","$skinshade",.5,.51),
    ink("M121 110.2 Q126.5 111.3 132.6 109.2",
      "none","$skinshade",.4,.35),
  ];
  const eyesClosed:CharacterPathShape[]=[
    line([118.4,106.5],[125.2,108.5],[130.7,109.1],[135.2,107.4],
      1.01,680,"$ink",.94),
    line([149.2,106.5],[155.5,106.8],[159.3,106.1],[163.6,104.4],
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
    ink("M156 103.2 Q157.6 102.7 158.6 103.3 Q159.1 105 157.3 105.9 Q156.1 105.4 156 103.2 Z",
      "$shadow","none",0,.62),
    ink("M157.1 103.4 Q157.8 103.7 157.6 105.2",
      "none","$ink",.63,.8),
    ink("M156.3 103.7 Q156.5 103.3 156.8 103.3",
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
    ink("M135.2 125.9 Q138.9 125.6 142 126.7 Q145.9 127 148.7 126.6",
      "none","$shadow",.58,.79),
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
