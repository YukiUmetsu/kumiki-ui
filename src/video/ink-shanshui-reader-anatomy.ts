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

type P=[number,number];
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
    ink("M150.6 113.1 C152.7 113.1 155.2 114.2 155.9 116 C155.5 117.8 153.6 118.6 151.6 118.2",
      "none","$shadow",.83,.66),
    ink("M149.1 116.1 Q149.3 118.2 151.7 118.8",
      "none","$shadow",.56,.69),
    ink("M154.3 116.8 Q155.2 118.6 156.1 117.5",
      "none","$ink",.56,.63),
    ink("M149.7 117.6 Q150.4 118.6 151.2 118.6",
      "none","$ink",.42,.63),
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
    ink("M135.5 125.8 Q138.7 125.3 141.4 125.9 Q145.8 125.5 149.2 125.3 Q147 127.8 142.2 127.8 Q138.4 127.3 135.5 125.8 Z",
      "$skinshade","none",0,.28),
    ink("M135.1 125.7 Q138.2 125 141.6 125.8 Q145.7 126 148.7 125.2",
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
