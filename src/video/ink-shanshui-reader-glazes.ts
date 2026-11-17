/**
 * ArtCraft v7: layered, source-fitted Ming portrait ink glazing for the
 * YOUNG RIVER SCHOLAR, not a frontal universal face mask.
 *
 * Bochen portrait methods reserve paper in the convex planes and build
 * orbital, nose, malar and sublabial relief using successive translucent
 * ink passes. These original SVG paths follow the ANAT1 near/far source
 * landmarks and turn around anatomy; no blur, circles, flat gradient, or
 * decorative repeated hatching can replace that observed volume.
 *
 * Source context:
 * Zeng Jing (1621), Portrait of Pan Qintai, University of Michigan Museum
 * of Art, 1966/1.110; Staatliche Museen "Faces of China" catalogue 9.8.
 */
import type {CharacterPathShape} from "../../registry/character/definition";

type Point=readonly [number,number];
export type ReaderInkGlazeRegion=
  "orbital-near"|"orbital-far"|"nose-bridge"|
  "malar-near"|"malar-far"|"sublabial";
export const READER_INK_GLAZE_REGIONS:readonly ReaderInkGlazeRegion[]=[
  "orbital-near","orbital-far","nose-bridge",
  "malar-near","malar-far","sublabial",
] as const;

export interface ReaderInkGlazeAnchors{
  nearCanthus:Point;
  farCanthus:Point;
  sellion:Point;
  noseTip:Point;
  nearCheek:Point;
  farCheek:Point;
  chin:Point;
}
export type ReaderInkGlazeMap=Record<
  ReaderInkGlazeRegion,CharacterPathShape[]>;

const decimal=(n:number)=>Number(n.toFixed(2));
const at=(p:Point,x:number,y:number)=>
  decimal(p[0]+x)+" "+decimal(p[1]+y);
const glaze=(d:string,opacity:number,paper=false):CharacterPathShape=>({
  type:"path",d,fill:paper?"$paper":"$skinshade",
  stroke:"none",strokeWidth:0,opacity,
});
const fibre=(d:string,opacity:number):CharacterPathShape=>({
  type:"path",d,fill:"none",stroke:"$skinshade",
  strokeWidth:.27,opacity,
});
const make=():ReaderInkGlazeMap=>({
  "orbital-near":[],"orbital-far":[],"nose-bridge":[],
  "malar-near":[],"malar-far":[],"sublabial":[],
});

/** Original portrait-space (260×340), with every pass controlled by
 * source ANAT1 canthi, zygions, sellion, pronasale and menton. High detail
 * only adds delicate secondary passes; it never replaces original paint.
 */
export function readerInkPortraitGlazes(
  guide:Readonly<ReaderInkGlazeAnchors>,detail=1,
):ReaderInkGlazeMap{
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Chinese-ink portrait glaze detail must be in 0..1");
  for(const [id,p] of Object.entries(guide)){
    if(!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)))
      throw new RangeError("Invalid original portrait guide "+id);
  }
  const {nearCanthus:n,farCanthus:f,sellion:s,
    noseTip:t,nearCheek:c,farCheek:r,chin}=guide;
  const passes=make();

  // A deep-set socket is a thin accumulated shadow following the lower
  // tarsal rim, NOT a uniformly dark crescent or fully mirrored far eye.
  // The brighter center remains the untouched original skin pigment.
  passes["orbital-near"].push(
    glaze("M"+at(n,-16.4,-.1)+" C"+at(n,-12.6,1.3)+
      " "+at(n,-7.6,3.8)+" "+at(n,-1.5,2.5)+
      " C"+at(n,-5.2,4.9)+" "+at(n,-12,4.7)+
      " "+at(n,-16.4,-.1)+" Z",.145),
    glaze("M"+at(n,-15.1,.9)+" C"+at(n,-11.7,3.1)+
      " "+at(n,-6.7,4.3)+" "+at(n,-2.9,3.1)+
      " C"+at(n,-7.6,5.3)+" "+at(n,-11.9,4.6)+
      " "+at(n,-15.1,.9)+" Z",.065),
  );
  passes["orbital-far"].push(
    glaze("M"+at(f,.4,1.9)+" C"+at(f,3.8,3.1)+
      " "+at(f,11.2,2.8)+" "+at(f,14.1,.3)+
      " C"+at(f,12.4,4.6)+" "+at(f,5.2,5.3)+
      " "+at(f,.4,1.9)+" Z",.095),
  );

  // A convex nose comes from a restrained gradation beside the paper-
  // light dorsal ridge. Successive partly overlapping passes curve into
  // the alar cartilages rather than making an angular triangular slash.
  passes["nose-bridge"].push(
    glaze("M"+at(s,1,1.1)+" C"+at(s,1.8,5.6)+
      " "+at(s,3.1,10.6)+" "+at(s,5.1,12.8)+
      " C"+at(t,.1,-2)+" "+at(t,.2,-.2)+
      " "+at(t,-.9,.55)+
      " C"+at(s,3.6,14.1)+" "+at(s,1.2,10.8)+
      " "+at(s,1,1.1)+" Z",.13),
    glaze("M"+at(s,1.9,4.2)+" C"+at(s,2.8,8.4)+
      " "+at(s,4.3,12.4)+" "+at(t,-1,0)+
      " C"+at(t,-.4,.6)+" "+at(s,3.5,12.7)+
      " "+at(s,2.8,9.1)+" C"+at(s,2.2,7.1)+
      " "+at(s,2,5.2)+" "+at(s,1.9,4.2)+" Z",.07),
    // Unpainted dorsal light, source-following and almost translucent.
    glaze("M"+at(s,-.5,2.9)+" C"+at(s,-.4,6.3)+
      " "+at(s,.5,9.2)+" "+at(s,1.8,11.8)+
      " C"+at(s,.3,10.7)+" "+at(s,-.8,6.7)+
      " "+at(s,-.5,2.9)+" Z",.11,true),
  );

  // Native 1x Chromium review exposed two parallel brown cheek ribbons.
  // A true cheekbone is not a narrow painted diagonal: follow the zygion
  // into a convex tear-shaped orbital/malar mass, then return beneath the
  // high point into the buccal transition. Use three nested broad, very
  // faint washes; each remains an individually editable cubic ink pass.
  passes["malar-near"].push(
    glaze("M"+at(c,2,-1.7)+" C"+at(c,6.8,-4.4)+
      " "+at(c,13.2,-1.1)+" "+at(c,17.4,4.6)+
      " C"+at(c,19.5,7.6)+" "+at(c,16.5,10.3)+
      " "+at(c,12.1,9.2)+
      " C"+at(c,7.5,8)+" "+at(c,4.1,4.6)+
      " "+at(c,2,-1.7)+" Z",.067),
    glaze("M"+at(c,3.1,.8)+" C"+at(c,7.5,-.6)+
      " "+at(c,13.5,2.5)+" "+at(c,16,6.4)+
      " C"+at(c,12.8,7.8)+" "+at(c,8.6,6.7)+
      " "+at(c,3.1,.8)+" Z",.074),
    glaze("M"+at(c,4.6,2.6)+" C"+at(c,8.3,3.6)+
      " "+at(c,11.3,5.3)+" "+at(c,13.1,6.1)+
      " C"+at(c,10.1,5.7)+" "+at(c,7.7,5.5)+
      " "+at(c,4.6,2.6)+" Z",.044),
  );
  passes["malar-far"].push(
    glaze("M"+at(r,-6.1,-1.6)+" C"+at(r,-2.4,-2.4)+
      " "+at(r,1.1,1.3)+" "+at(r,-.1,5.4)+
      " C"+at(r,-1.6,7.1)+" "+at(r,-4.1,7.2)+
      " "+at(r,-6.1,-1.6)+" Z",.095),
  );

  // The underside of the young lip/chin is nearly paper-bright. Use
  // shallow curved value transitions rather than a fixed smile wrinkle.
  passes.sublabial.push(
    glaze("M"+at(chin,-8.6,-14.2)+" C"+at(chin,-2.7,-11.8)+
      " "+at(chin,2.4,-11.5)+" "+at(chin,6.5,-14.3)+
      " C"+at(chin,3.9,-9.4)+" "+at(chin,-4.1,-9.8)+
      " "+at(chin,-8.6,-14.2)+" Z",.087),
  );
  if(detail>=.45){
    passes["orbital-near"].push(
      glaze("M"+at(n,-14.1,2.5)+" C"+at(n,-8.2,4.7)+
        " "+at(n,-4.2,4.8)+" "+at(n,-2.7,3.4)+
        " C"+at(n,-6.9,5.7)+" "+at(n,-11.9,5.1)+
        " "+at(n,-14.1,2.5)+" Z",.048),
    );
    passes["orbital-far"].push(
      glaze("M"+at(f,2.1,2.8)+" C"+at(f,5.1,4.2)+
        " "+at(f,10.4,3.7)+" "+at(f,12.2,1.7)+
        " C"+at(f,8.6,5)+" "+at(f,5.2,5.1)+
        " "+at(f,2.1,2.8)+" Z",.042),
    );
    passes["malar-near"].push(
      // Mid-tone hugs the *inferior* zygomatic relief instead of
      // drawing a third straight slash toward the mouth.
      glaze("M"+at(c,3.8,3)+" C"+at(c,7.8,4.4)+
        " "+at(c,12.7,7.3)+" "+at(c,14.2,8.3)+
        " C"+at(c,11.2,8.8)+" "+at(c,6.4,7.4)+
        " "+at(c,3.8,3)+" Z",.046),
    );
    passes["malar-far"].push(
      glaze("M"+at(r,-5,-.1)+" C"+at(r,-2.3,.7)+
        " "+at(r,-.7,3.2)+" "+at(r,-1.1,5.7)+
        " C"+at(r,-2.6,5.3)+" "+at(r,-4,2.7)+
        " "+at(r,-5,-.1)+" Z",.038),
    );
    passes.sublabial.push(
      glaze("M"+at(chin,-6.1,-12.9)+" C"+at(chin,-2.5,-11)+
        " "+at(chin,2,-11.2)+" "+at(chin,3.4,-13.1)+
        " C"+at(chin,1.4,-10.3)+" "+at(chin,-2.6,-10.8)+
        " "+at(chin,-6.1,-12.9)+" Z",.049),
    );
  }
  if(detail>=.8){
    // Three individually placed, extremely fine dry pressure remnants
    // follow source musculature. They do not become generic grain dots.
    passes["nose-bridge"].push(
      fibre("M"+at(t,-3,-2.6)+" Q"+at(t,-2,-1.7)+
        " "+at(t,-1.3,-.5),.235),
    );
    passes["malar-near"].push(
      fibre("M"+at(c,3.9,5.2)+" Q"+at(c,7.4,8.3)+
        " "+at(c,11.4,8.8),.18),
    );
    passes["malar-far"].push(
      fibre("M"+at(r,-3.9,.7)+" Q"+at(r,-2,3)+
        " "+at(r,-2.5,5.1),.17),
    );
  }
  return passes;
}
