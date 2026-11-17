/**
 * EXPR1 → original three-quarter Chinese-ink reader portrait adapter.
 *
 * ANAT1 supplies the measured facial landmarks. EXPR1 supplies which
 * muscle groups move; the painted ink geometry remains the original reader's.
 * Never replace the fine eyebrow fibres with a generic smile/frown icon.
 *
 * This opt-in study leaves the neutral production rig and five visemes intact.
 * The returned shape assets can be driven by a film's emotion timeline.
 */
import type {CharacterPathShape,CharacterShapeAsset} from
  "../../registry/character/definition";
import {expressEmotion,expressFace,expressionFeatures,expressionMarks} from
  "../../registry/anatomy/expression-face";
import {scrollReaderFacePortrait} from "./ink-shanshui-reader-face";

export const READER_INK_EMOTIONS=[
  "neutral","smile","sad","angry","surprise",
] as const;
export type ReaderInkEmotion=typeof READER_INK_EMOTIONS[number];
export type ReaderInkLids="open"|"soft"|"closed";
export type ReaderInkMouth="rest"|"aa"|"oh"|"mm"|"smile";

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const round=(n:number)=>Number(n.toFixed(3));
const mark=(d:string,opacity:number,width=.45,ink="$shadow"):CharacterPathShape=>({
  type:"path",d,fill:"none",stroke:ink,strokeWidth:width,opacity:round(opacity),
});

/**
 * Deform each source-authored path's OWN control points. The brow art uses
 * absolute M/L/C/Q commands, so all paper gaps, dry-brush edges and individual
 * follicle marks remain in place rather than being replaced by 2 straight
 * lines. Keep this deliberately limited to that command vocabulary.
 */
type InkWarp=(x:number,y:number)=>readonly [number,number];
function deformAbsoluteInk(shape:CharacterPathShape,warp:InkWarp):CharacterPathShape{
  if(shape.type!=="path")return shape;
  // The original hand-authored source uses absolute cubic/quad curves,
  // whereas pressure strokes use many absolute L vertices. Never attempt
  // to move relative paths: a relative delta is not a facial landmark.
  if(/[^MLCQZ0-9eE+.,\s-]/.test(shape.d))return shape;
  if(/[mlcqz]/.test(shape.d))return shape;
  return {...shape,d:shape.d.replace(
    /(-?\d+(?:\.\d+)?)([\s,]+)(-?\d+(?:\.\d+)?)/g,
    (_whole:string,x:string,space:string,y:string)=>{
      const px=Number(x),py=Number(y);
      const [dx,dy]=warp(px,py);
      return round(px+dx)+space+round(py+dy);
    },
  )};
}
function withShapes(base:CharacterShapeAsset,shapes:CharacterPathShape[]):CharacterShapeAsset{
  if(base.kind!=="shapes")throw new Error("Reader expression requires SVG shape assets");
  return {...base,shapes};
}

export interface ReaderInkExpressionStudy {
  emotion:ReaderInkEmotion;
  intensity:number;
  /** Derived from the shared EXPR1 facial action-unit rig, not a style-specific mood guess. */
  features:ReturnType<typeof expressionFeatures>;
  /** EXPR1 source names which govern the portrait's additional brush creases. */
  activeCreases:readonly string[];
  lids:ReaderInkLids;
  mouth:ReaderInkMouth;
  assets:Record<string,CharacterShapeAsset>;
}

/** Emotion-responsive variant of the existing ANAT1 reader, preserving every source path. */
export function inkReaderExpressionStudy(
  emotion:ReaderInkEmotion="neutral",intensity=1,detail=1,
):ReaderInkExpressionStudy{
  if(!READER_INK_EMOTIONS.includes(emotion))
    throw new RangeError("Unknown Chinese ink reader emotion");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("Emotion intensity must be between 0 and 1");
  const assets=scrollReaderFacePortrait(detail);
  const expressed=emotion==="neutral"?expressFace({}):expressEmotion(emotion,intensity);
  const features=expressionFeatures(expressed);
  const creases=expressionMarks(expressed);
  const activeCreases=creases.filter(m=>m.strength>.05).map(m=>m.id);
  if(emotion==="neutral"||intensity===0){
    return {emotion,intensity,features,activeCreases:[],
      lids:"soft",mouth:"rest",assets};
  }

  // EXPR1 movements are normalized by eye width; the source painting is
  // an asymmetric three-quarter view. Inner ends move in opposite x
  // directions and have distinct projection lengths.
  const inner=clamp(-features.browInner*14,-4.2,4.2);
  const outer=clamp(-features.browOuter*14,-3.8,3.8);
  const knit=clamp(features.browKnit*1.8,-1.5,1.5);
  const browWarp=(x:number)=>{
    if(x>=114&&x<=141){
      const t=clamp((x-118)/18,0,1);
      return (outer*(1-t)+inner*t)*(1-.025*knit);
    }
    if(x>=146&&x<=166){
      const t=clamp((x-149)/14,0,1);
      return (inner*(1-t)+outer*t)*(1+.025*knit);
    }
    return 0;
  };
  const sourceBrow=assets.brow;
  if(sourceBrow.kind!=="shapes")throw new Error("Reader brow must be a shape asset");
  assets.brow=withShapes(sourceBrow,sourceBrow.shapes.map(s=>
    s.type==="path"?deformAbsoluteInk(s,(x,_y)=>[0,browWarp(x)]):s).filter(
      (s):s is CharacterPathShape=>s.type==="path",
    ));

  // Natural expression creases: thin, pressure-sensitive and placed on
  // the original glabella, orbital tail and malar/nasal connections.
  // They follow EXPR1's AU activations but never age a youthful face by
  // adding generic dense wrinkle hatching.
  const strength=(id:string)=>Math.max(0,...creases
    .filter(m=>m.id.startsWith(id)).map(m=>m.strength));
  const extra:CharacterPathShape[]=[];
  const crow=strength("crows-feet");
  if(crow>.05){
    extra.push(
      mark("M116.3 104.1 Q114.1 103.3 112.8 102.1",crow*.42,.35),
      mark("M116.1 106.7 Q113.8 107.5 112.6 109",crow*.33,.31),
      mark("M164.5 102.6 Q166.4 101.8 167.3 100.9",crow*.26,.29),
      mark("M119.3 112.1 Q126.1 114.1 131.7 111.6",crow*.29,.48,"$skinshade"),
    );
  }
  const tension=strength("glabella");
  if(tension>.05){
    extra.push(
      mark("M144.2 94.1 Q143.7 97.1 144.9 98.5",tension*.42,.39),
      mark("M147.2 94 Q147.5 96.2 146.6 97.5",tension*.29,.32),
    );
  }
  const forehead=strength("forehead");
  if(forehead>.05){
    extra.push(
      mark("M130.7 85.4 Q139.4 82.9 149.2 86.2",forehead*.22,.31,"$skinshade"),
      mark("M132.9 88.3 Q140.7 86.5 147.2 88",forehead*.16,.29,"$skinshade"),
    );
  }
  const smileFold=strength("nasolabial");
  if(smileFold>.05 && features.cheekRaise>.025){
    extra.push(
      mark("M155.3 116.8 Q155.8 120.3 150.8 123.6",
        smileFold*clamp(features.cheekRaise*1.4,0,.32),.44,"$skinshade"),
      mark("M130 116.9 Q132 119.4 134.3 121.7",
        smileFold*clamp(features.cheekRaise*1.1,0,.22),.32,"$skinshade"),
    );
  }
  const baseFace=assets.face;
  if(baseFace.kind!=="shapes")throw new Error("Reader face must be a shape asset");
  // AU6 lifts the malar mass. Move only the existing transparent cheek
  // washes (never the opaque head silhouette or the nose's structural ink).
  // In 3/4 projection the near cheek has a broader active area.
  const malarLift=clamp(features.cheekRaise*14,0,2.5);
  const cheekWarp:InkWarp=(x,y)=>{
    const near=clamp(1-Math.abs(x-130)/17,0,1);
    const far=clamp(1-Math.abs(x-157)/10,0,1);
    const height=clamp((y-104)/7,0,1)*clamp((130-y)/10,0,1);
    return [0,-malarLift*height*Math.max(near,far*.58)];
  };
  assets.face=withShapes(baseFace,[
    ...baseFace.shapes.filter((s):s is CharacterPathShape=>s.type==="path")
      .map(s=>(s.fill==="$skinshade"&&s.stroke==="none")?
        deformAbsoluteInk(s,cheekWarp):s),
    ...extra,
  ]);

  // Continuously tighten or widen the existing SOFT eyelid artwork by
  // EXPR1 lid aperture. The nearer eye remains wider, the far-eye stays
  // foreshortened. Doing this on a single source cel avoids the sudden
  // 0%→1% switch between unrelated open and half-lid path topologies.
  const sourceEyes=assets["eyes-soft"];
  if(sourceEyes.kind!=="shapes")throw new Error("Reader lids must be SVG shapes");
  const aperture=clamp(1+1.17*(features.eyeOpen-1),.61,1.56);
  // ANAT1/EXPR1 muscle response is asymmetric: AU6 orbicularis oculi
  // lifts the *lower* tarsal shelf with the zygomatic cheek; AU5 widens
  // the eye by recruiting mostly the upper lid. The previous symmetric
  // scaling changed the ellipse numerically but read as identical in
  // the real 1× five-pose atlas. Each original upper/lower brow and
  // eyelid paint path keeps its own source topology and brush fibres.
  const cheekLid=clamp(features.cheekRaise*3.2,0,.75);
  const narrowLid=clamp((1-features.eyeOpen)*1.3,0,.65);
  const upperOpen=clamp((features.eyeOpen-1)*2.3,0,.8);
  const lidWarp:InkWarp=(x,y)=>{
    const near=x<143;
    const center=near?105.25:104.6;
    const eyeX=near?126.7:156.4;
    const halfSpan=near?9.1:7.4;
    // Contact pressure decays to zero at the original canthi so no
    // detached inner tear duct or broken far-eye perspective appears.
    const contact=Math.pow(clamp(1-Math.abs(x-eyeX)/halfSpan,0,1),.72);
    const fall=clamp(1-Math.abs(y-center)/8,0,1);
    const lower=clamp((y-center)/3.1,0,1);
    const upper=clamp((center-y)/3.1,0,1);
    const asymmetric=-contact*((cheekLid+narrowLid)*lower+
      upperOpen*upper);
    return [0,(y-center)*(aperture-1)*fall+asymmetric];
  };
  assets["eyes-soft"]=withShapes(sourceEyes,sourceEyes.shapes
    .filter((s):s is CharacterPathShape=>s.type==="path")
    .map(s=>deformAbsoluteInk(s,lidWarp)));

  // An expressive mouth is the original closed REST mouth with a
  // continuously warped vermilion border, NOT an instant swap to a
  // different smile/oh/mm cel. Its lip relief and original pressure
  // paths move together, preserving the known five speech visemes.
  const sourceMouth=assets["mouth-rest"];
  if(sourceMouth.kind!=="shapes")throw new Error("Reader lip must be SVG shapes");
  const cornerLift=clamp(features.mouthCorner*13,-3.2,3.2);
  const widthFactor=clamp(1+(features.mouthWidth-1)*.7,.88,1.12);
  const lipWarp:InkWarp=(x,_y)=>{
    const t=clamp((x-135.4)/13.4,0,1);
    // The far corner sits on the receding, slightly higher facial plane.
    const edge=Math.pow(Math.abs(2*t-1),1.25);
    const tilt=t>.5?1.16:.85;
    return [(x-142.1)*(widthFactor-1),-cornerLift*edge*tilt];
  };
  const lipShapes=sourceMouth.shapes
    .filter((s):s is CharacterPathShape=>s.type==="path")
    .map(s=>deformAbsoluteInk(s,lipWarp));

  // AU26 surprise opens the jaw. A pressure-controlled negative ink
  // opening grows from the original lips at zero width/height, with a
  // complementary lower-lip reflected wash. Neither shape is rasterized
  // or drawn on top of a detached smile sticker.
  const gape=emotion==="surprise"?
    clamp(Math.max(features.jaw*12,features.mouthOpen*13),0,6.2):0;
  if(gape>.001){
    const upper=126.4-cornerLift*.06;
    const bottom=upper+gape;
    lipShapes.push({
      type:"path",
      d:`M138.4 ${round(upper)} C140.1 ${round(upper-.38)} 143.9 ${round(upper-.24)} 146.2 ${round(upper-.04)} C145.5 ${round(bottom-.1)} 143.2 ${round(bottom+.2)} 141.4 ${round(bottom)} C139.8 ${round(bottom-.14)} 138.6 ${round(bottom*.5+upper*.5)} 138.4 ${round(upper)} Z`,
      fill:"$shadow",stroke:"$ink",strokeWidth:.39,
      opacity:round(clamp(.18+intensity*.68,0,.87)),
    });
    lipShapes.push(mark(`M139.5 ${round(bottom+.7)} Q142.3 ${round(bottom+1.15)} 145.1 ${round(bottom+.45)}`,
      clamp(intensity*.36,0,.36),.46,"$skinshade"));
  }
  assets["mouth-rest"]=withShapes(sourceMouth,lipShapes);
  return {emotion,intensity,features,activeCreases,
    lids:"soft",mouth:"rest",assets};
}
