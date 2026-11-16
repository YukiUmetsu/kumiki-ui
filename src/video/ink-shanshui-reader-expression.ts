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
function deformAbsoluteInk(shape:CharacterPathShape,dy:(x:number)=>number):CharacterPathShape{
  if(shape.type!=="path")return shape;
  if(/[^MLCQZ0-9eE+.,\s-]/.test(shape.d))return shape;
  if(/[mlcqz]/.test(shape.d))return shape;
  return {...shape,d:shape.d.replace(
    /(-?\d+(?:\.\d+)?)([\s,]+)(-?\d+(?:\.\d+)?)/g,
    (_whole:string,x:string,space:string,y:string)=>
      x+space+round(Number(y)+dy(Number(x))),
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
    s.type==="path"?deformAbsoluteInk(s,browWarp):s).filter(
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
  assets.face=withShapes(baseFace,[
    ...baseFace.shapes.filter((s):s is CharacterPathShape=>s.type==="path"),...extra,
  ]);

  const mouth:ReaderInkMouth=emotion==="smile"?"smile":
    emotion==="surprise"?"oh":emotion==="angry"?"mm":"rest";
  // Sadness lowers mouth corners (AU 15); happiness lifts them (AU 12).
  // The original lip/philtrum contours remain unmodified in every viseme
  // other than the selected lower-emotion rest cel.
  if(emotion==="sad"){
    const source=assets["mouth-rest"];
    if(source.kind!=="shapes")throw new Error("Reader mouth must be a shape asset");
    const depression=clamp(-features.mouthCorner*11,0,3.2);
    assets["mouth-rest"]=withShapes(source,source.shapes
      .filter((s):s is CharacterPathShape=>s.type==="path")
      .map(s=>deformAbsoluteInk(s,x=>{
        const t=clamp((x-135.4)/13.5,0,1);
        return depression*(.65+.35*Math.abs(2*t-1));
      })));
  }
  return {emotion,intensity,features,activeCreases,
    lids:emotion==="surprise"?"open":"soft",mouth,assets};
}
