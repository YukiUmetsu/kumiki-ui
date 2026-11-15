/**
 * Full-figure shanshui art direction, using ONE projected coordinate system for
 * the face, shoulder, waist, arms, sleeve drape, robe, hem and shoes.
 * All geometry is original vector art, not sampled copyrighted image pixels.
 * Hidden anatomy is not reconstructed from these three-quarter paintings.
 */
import type {CharacterPart,CharacterShapeAsset,CharacterPoseDelta,CharacterVec2,
  CharacterPoseCorrectionTracks} from
  "../../registry/character/definition";
import type {ShanshuiScene} from "../../registry/video/ink-shanshui";
import {SHANSHUI_TEACHER_MESHES} from
  "./ink-shanshui-teacher-mesh";
import {shanshuiRoute} from "../../registry/video/ink-shanshui";
import {inkWalkAt,inkRouteAt} from "../../registry/video/ink-actor-director";
import type {InkRoutePlan,InkWalkPlan} from "../../registry/video/ink-actor-director";

type P=CharacterVec2;
const n=(v:number)=>Number(v.toFixed(2));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const mid=(a:P,b:P):P=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const at=(x:number,y:number):P=>({x:n(x),y:n(y)});
const path=(a:P)=>"M"+n(a.x)+" "+n(a.y);
const line=(a:P)=>" L"+n(a.x)+" "+n(a.y);
const quad=(c:P,a:P)=>" Q"+n(c.x)+" "+n(c.y)+" "+n(a.x)+" "+n(a.y);
const cubic=(a:P,b:P,c:P)=>" C"+n(a.x)+" "+n(a.y)+
  " "+n(b.x)+" "+n(b.y)+" "+n(c.x)+" "+n(c.y);
const p=(d:string,fill="none",stroke="$ink",strokeWidth=1.1,opacity=1)=>({
  type:"path" as const,d,fill,stroke,strokeWidth,opacity,
});
const art=(...shapes:ReturnType<typeof p>[]):CharacterShapeAsset=>({
  kind:"shapes",width:260,height:340,shapes,
  provenance:{license:"CC0-1.0",source:"Original Kumiki shanshui full-figure SVG art; proportions measured against three teacher images"},
});
const empty=()=>art();
function sourceProjection(scene:ShanshuiScene){
  const ref=SHANSHUI_TEACHER_MESHES[scene],scale=291/ref.figure.height;
  const cx=ref.figure.x+ref.figure.width/2;
  const project=(point:P):P=>at(133+(point.x-cx)*scale,
    43+(point.y-ref.figure.y)*scale);
  const point=(id:string):P=>{
    const item=ref.landmarks[id as keyof typeof ref.landmarks];
    if(!item)throw new RangeError("Source image lacks visible "+id+" for "+scene);
    return project(item.point);
  };
  const box=(id:string)=>{
    const r=ref.regions[id as keyof typeof ref.regions];
    if(!r)throw new RangeError("Source image lacks visible region "+id+" for "+scene);
    return {origin:project({x:r.x,y:r.y}),width:r.width*scale,height:r.height*scale};
  };
  return {ref,scale,project,point,box};
}
export interface ShanshuiBodyFit {
  scene:ShanshuiScene;
  sourceFigureRatio:number;
  sourceHeadRatio:number;
  sourceShoulderRatio:number;
  sourceWaistRatio:number;
  sourceHemRatio:number;
  sourceSleeveRatio:number;
  stageScale:number;stageCenterX:number;stageFootY:number;
  nearSide:"left"|"right";
  headRest:CharacterPoseDelta;
  /** Independently measured hair, eyebrow, eye, pupil and mouth rest offsets. */
  facialRest:Record<"hair"|"brows"|"eyes"|"pupil-left"|
    "pupil-right"|"mouth"|"beard",CharacterPoseDelta>;
  anchors:Record<"leftShoulder"|"rightShoulder"|"leftWaist"|"rightWaist"|
    "leftHip"|"rightHip"|"leftHem"|"rightHem"|
    "nearShoulder"|"farShoulder"|"nearHand"|"farHand"|
    "leftFoot"|"rightFoot"|"neckLeft"|"neckRight",P>;
}
export function shanshuiBodyFit(scene:ShanshuiScene):ShanshuiBodyFit{
  const s=sourceProjection(scene),r=s.ref;
  const leftShoulder=s.point("shoulder-left"),rightShoulder=s.point("shoulder-right");
  const leftWaist=s.point("waist-left"),rightWaist=s.point("waist-right");
  const leftHip=s.point("hip-left"),rightHip=s.point("hip-right");
  const leftHem=s.point("robe-hem-left"),rightHem=s.point("robe-hem-right");
  const leftHand=s.point("hand-left");
  // Invisible far hand in the walking reference is NOT made into a landmark.
  // A separate sleeve construction control is taken from visible fabric bounds.
  const rightHand=scene==="mountain-trail"?
    s.project({x:r.regions["sleeve-screen-right"]!.x+
      r.regions["sleeve-screen-right"]!.width*.6,
      y:r.regions["sleeve-screen-right"]!.y+
      r.regions["sleeve-screen-right"]!.height*.53}):
    s.point("hand-right");
  const nearSide=scene==="river-scholar"?"right":"left";
  const skull=s.box("skull"),face=s.box("face"),hair=s.box("hair");
  // Face vs scalp cannot share one scale: the old generic puppet's face is
  // almost as tall as its skull, whereas all three teacher figures have a
  // compact drawn jaw and a taller crown/bun. Solve independent X/Y size.
  const faceOriginal={x:110,y:65,width:60,height:77};
  const headScaleX=face.width/faceOriginal.width;
  const headScaleY=face.height/faceOriginal.height;
  const pivot={x:139,y:124};
  const headRest:CharacterPoseDelta={
    scaleX:headScaleX,scaleY:headScaleY,
    x:face.origin.x+face.width*.5-
      (pivot.x+(faceOriginal.x+faceOriginal.width*.5-pivot.x)*headScaleX),
    y:face.origin.y-
      (pivot.y+(faceOriginal.y-pivot.y)*headScaleY),
    rotation:scene==="misty-hermit"?-6:scene==="river-scholar"?-4:-8,
  };
  const atHeadY=(originalY:number)=>
    pivot.y+(originalY-pivot.y)*headScaleY+(headRest.y??0);
  const originalHair={pivotY:74,top:scene==="misty-hermit"?36:
    scene==="river-scholar"?27:28,height:scene==="misty-hermit"?64:84};
  // The young reader's measured "hair" box also contains an ear-sideburn
  // and flying ribbon, not just the WRAPPED CAP. Using its full height as
  // cap height pushed the ink hairline down across both eyes. Calibrate the
  // visible cap separately to its ~46px height in the teacher painting:
  // the top knot stays aligned while brows/upper lids remain uncovered.
  const boxHairScale=hair.height/(originalHair.height*headScaleY);
  const hairScaleY=scene==="river-scholar"
    ?Math.min(1.45,boxHairScale):boxHairScale;
  const hairTopBefore=atHeadY(originalHair.pivotY+
    hairScaleY*(originalHair.top-originalHair.pivotY));
  const hairRestY=(hair.origin.y-hairTopBefore)/headScaleY;
  const average=(names:readonly string[])=>names.map(id=>s.point(id))
    .reduce((v,p)=>v+p.y,0)/names.length;
  const partY=(targetY:number,originalY:number)=>
    (targetY-atHeadY(originalY))/headScaleY;
  const eyebrowY=average(["brow-left-inner","brow-right-inner"]);
  const eyeY=average(["eye-left-inner","eye-right-inner"]);
  const mouthY=average(["mouth-left","mouth-right"]);
  const facialRest={
    hair:{scaleY:hairScaleY,y:hairRestY},
    brows:{y:partY(eyebrowY,94)},
    eyes:{y:partY(eyeY,102)},
    "pupil-left":{y:partY(eyeY,102)},
    "pupil-right":{y:partY(eyeY,101)},
    mouth:{y:partY(mouthY,124)},
    beard:{scaleY:scene==="misty-hermit"?.82:1},
  } satisfies ShanshuiBodyFit["facialRest"];
  const hemDist=Math.abs(rightHem.x-leftHem.x);
  const sleeveL=s.box("sleeve-screen-left"),sleeveR=s.box("sleeve-screen-right");
  const leftShoe=r.regions["foot-screen-left"]!,
    rightShoe=r.regions["foot-screen-right"]!;
  const footY=Math.max(leftShoe.y+leftShoe.height*.91,
    rightShoe.y+rightShoe.height*.91)/r.source.height*540;
  return {
    scene,sourceFigureRatio:n(r.figure.width/r.figure.height),
    sourceHeadRatio:n(skull.height/291),
    sourceShoulderRatio:n(Math.hypot(rightShoulder.x-leftShoulder.x,
      rightShoulder.y-leftShoulder.y)/291),
    sourceWaistRatio:n(Math.abs(rightWaist.x-leftWaist.x)/291),
    sourceHemRatio:n(hemDist/291),
    sourceSleeveRatio:n(Math.max(sleeveL.height,sleeveR.height)/291),
    stageScale:n((r.figure.height/r.source.height*540)/291),
    stageCenterX:n((r.figure.x+r.figure.width*.5)/r.source.width*960),
    stageFootY:n(footY),nearSide,headRest,facialRest,
    anchors:{
      leftShoulder,rightShoulder,leftWaist,rightWaist,leftHip,rightHip,
      leftHem,rightHem,
      nearShoulder:nearSide==="left"?leftShoulder:rightShoulder,
      farShoulder:nearSide==="left"?rightShoulder:leftShoulder,
      nearHand:nearSide==="left"?leftHand:rightHand,
      farHand:nearSide==="left"?rightHand:leftHand,
      leftFoot:s.point("foot-left"),rightFoot:s.point("foot-right"),
      neckLeft:s.point("neck-left"),neckRight:s.point("neck-right"),
    },
  };
}
export function shanshuiBodyAssets(scene:ShanshuiScene):Record<string,CharacterShapeAsset>{
  const s=sourceProjection(scene),fit=shanshuiBodyFit(scene),a=fit.anchors;
  const shoulders=mid(a.leftShoulder,a.rightShoulder);
  const waist=mid(a.leftWaist,a.rightWaist);
  const hip=mid(a.leftHip,a.rightHip);
  const hem=mid(a.leftHem,a.rightHem);
  const topY=Math.min(a.leftShoulder.y,a.rightShoulder.y);
  const outline=path(a.leftShoulder)+
    quad(at(a.leftShoulder.x-15,topY+24),a.leftWaist)+
    quad(at(a.leftHip.x-7,hip.y+21),at(a.leftHem.x,a.leftHem.y-6))+
    quad(at(a.leftHem.x-12,a.leftHem.y+11),at(hem.x-22,hem.y+9))+
    quad(at(hem.x+25,hem.y+14),at(a.rightHem.x,a.rightHem.y))+
    quad(at(a.rightHip.x+11,hip.y+20),a.rightWaist)+
    quad(at(a.rightShoulder.x+14,topY+22),a.rightShoulder)+
    quad(at(a.neckRight.x+6,a.neckRight.y+4),at(shoulders.x,topY+9))+
    quad(at(a.neckLeft.x-6,a.neckLeft.y+3),a.leftShoulder)+" Z";
  const body=art(
    p(outline,"$linen","$ink",1.4,1),
    p(path(at(a.leftWaist.x+4,waist.y+2))+
      quad(at(a.leftHip.x-7,hip.y+27),at(a.leftHem.x+16,a.leftHem.y-14))+
      quad(at(hem.x-22,hem.y-2),at(hem.x+5,hem.y+7))+
      quad(at(waist.x-10,hip.y+30),at(waist.x-6,waist.y+2))+" Z",
      "$mist","none",0,.86),
    p(path(at(waist.x+10,waist.y+4))+
      quad(at(waist.x+25,hip.y+29),at(a.rightHem.x-13,a.rightHem.y-9))+
      quad(at(a.rightHem.x+2,hem.y),a.rightHem)+
      quad(at(a.rightHip.x+11,hip.y+12),a.rightWaist)+" Z",
      "$wash","none",0,.37),
  );
  // The outer robe is NOT the full skirt. Long overlapping under-robes extend
  // to the shoe tops in each reference; without this plane the isolated shoes
  // visibly float 20–35 px below the robe silhouette.
  const underBottom=Math.min(337,Math.max(331,
    a.leftFoot.y+13,a.rightFoot.y+13));
  const underHem=art(
    p(path(at(a.leftWaist.x+2,a.leftWaist.y+8))+
      cubic(at(a.leftHip.x-13,hip.y+27),
        at(a.leftHem.x-14,hem.y+11),
        at(a.leftHem.x-17,underBottom-10))+
      cubic(at(a.leftHem.x-17,underBottom+5),
        at(hem.x-21,underBottom+5),
        at(hem.x-7,underBottom+2))+
      cubic(at(hem.x+14,underBottom+10),
        at(a.rightHem.x+7,underBottom+2),
        at(a.rightHem.x+5,underBottom-7))+
      cubic(at(a.rightHip.x+9,hip.y+31),
        at(a.rightWaist.x+3,waist.y+23),a.rightWaist)+
      quad(at(waist.x,waist.y+17),a.leftWaist)+" Z",
      // Preserve a solid, nontransparent under-robe without tracing an
      // unrelated second dark hem across the animated front panels.
      "$mist","none",0,1),
    p(path(at(waist.x-15,waist.y+16))+
      cubic(at(waist.x-29,hip.y+32),
        at(hem.x-35,underBottom-19),
        at(hem.x-25,underBottom-1)),
      "none","$wash",2.6,.61),
    p(path(at(waist.x+3,waist.y+16))+
      cubic(at(waist.x+8,hip.y+30),
        at(hem.x+2,underBottom-24),
        at(hem.x+11,underBottom+1)),
      "none","$shadow",1.05,.66),
    p(path(at(a.leftHem.x-14,underBottom-7))+
      cubic(at(hem.x-23,underBottom+10),
        at(hem.x+22,underBottom+10),
        at(a.rightHem.x+5,underBottom-7)),
      "none","$shadow",.72,.3),
  );
  const strokeFold=(dx:number,dy:number,width:number)=>{
    const begin=at(waist.x+dx*.3,waist.y+6);
    return p(path(begin)+
      quad(at(begin.x+dx*.17,hip.y+13),at(begin.x+dx*.76,hem.y-33))+
      quad(at(begin.x+dx*.83,hem.y-17),at(begin.x+dx,hem.y+dy)),
      "none","$shadow",width,.68);
  };
  const robeOverlay=art(
    // Long defining folds deliberately spaced around the broad wash planes.
    // Shallow local folds and dry-fibre marks live in shanshuiGarmentCraft.
    strokeFold(-57,-5,.65),strokeFold(-42,-3,.89),
    strokeFold(-19,3,1.11),strokeFold(9,-2,.67),
    strokeFold(33,2,1.03),strokeFold(55,3,.53),pathDummy(),
    p(path(at(waist.x-19,waist.y+15))+
      cubic(at(waist.x-25,hip.y+6),
        at(hem.x-42,hem.y-51),at(hem.x-38,hem.y-10)),
      "none","$paper",3,.56),
    p(path(at(waist.x+15,waist.y+16))+
      cubic(at(waist.x+23,hip.y+30),
        at(hem.x+44,hem.y-51),at(hem.x+52,hem.y-10)),
      "none","$paper",2.3,.4),
  );
  function pathDummy(){return p(path(at(a.leftHem.x,a.leftHem.y))+
      quad(at(hem.x-26,hem.y+13),at(hem.x,hem.y+6))+
      quad(at(hem.x+24,hem.y+11),a.rightHem),"none","$shadow",1.05,.52);}
  const collar=art(
    p(path(a.neckLeft)+
      quad(at(waist.x-14,topY+18),at(waist.x+2,topY+41))+
      quad(at(waist.x+16,topY+18),a.neckRight)+
      line(at(a.neckRight.x+5,a.neckRight.y+8))+
      quad(at(waist.x+8,topY+40),at(waist.x+2,topY+51))+
      quad(at(waist.x-11,topY+38),at(a.neckLeft.x-5,a.neckLeft.y+7))+" Z",
      "$linen","$shadow",1.1,1),
    p(path(at(a.neckLeft.x-1,a.neckLeft.y+4))+
      quad(at(waist.x-3,topY+29),at(waist.x+1,topY+45))+
      quad(at(waist.x+10,topY+29),at(a.neckRight.x+1,a.neckRight.y+3)),
      "none","$twine",1,.74),
  );
  const belt=art(
    p(path(at(a.leftWaist.x,a.leftWaist.y-3))+
      quad(at(waist.x,waist.y+1),at(a.rightWaist.x,a.rightWaist.y-4))+
      line(at(a.rightWaist.x+2,a.rightWaist.y+7))+
      quad(at(waist.x,waist.y+15),at(a.leftWaist.x-2,a.leftWaist.y+7))+" Z",
      "$deep","$shadow",.85,.95),
    p(path(at(waist.x-16,waist.y+5))+
      quad(at(waist.x,waist.y+9),at(waist.x+17,waist.y+4)),
      "none","$linen",1.1,.57),
    p(path(at(waist.x-3,waist.y+7))+line(at(waist.x+5,waist.y+23)),
      "none","$twine",1.25,.85),
  );
  const sleeve=(side:"left"|"right")=>{
    const b=s.box("sleeve-screen-"+side);
    const shoulder=side==="left"?a.leftShoulder:a.rightShoulder;
    const hand=side===fit.nearSide?a.nearHand:a.farHand;
    const outer=side==="left"?b.origin.x:b.origin.x+b.width;
    const inner=side==="left"?b.origin.x+b.width:b.origin.x;
    const spread=side==="left"?-1:1;
    const bottom=b.origin.y+b.height;
    // A real hanging 袖: upper cloth gathers at shoulder and elbow, then
    // widens into an elongated, weighted hem. Two cubic sides replace the
    // visibly triangular first-pass sleeve. The wrist stays above the drape.
    const sleeveY=b.origin.y+b.height*.35;
    const edge=at(outer+spread*5,bottom-16);
    const lower=at(outer+spread*2,bottom);
    const innerBottom=at(inner-spread*5,bottom-2);
    const silhouette=path(shoulder)+
      cubic(at(shoulder.x+spread*13,topY+6),
        at(outer-spread*16,sleeveY-18),at(outer,sleeveY))+
      cubic(at(outer+spread*13,sleeveY+19),
        at(outer-spread*8,bottom-48),edge)+
      cubic(at(outer+spread*7,bottom-1),
        at(outer-spread*9,bottom+10),lower)+
      cubic(at((outer+inner)*.44,bottom+14),
        at((outer+inner)*.77,bottom+7),innerBottom)+
      cubic(at(inner+spread*13,bottom-28),
        at(hand.x+spread*14,hand.y+20),hand)+
      cubic(at(hand.x-spread*10,hand.y-15),
        at(shoulder.x-spread*18,shoulder.y+27),
        at(shoulder.x-spread*5,shoulder.y+5))+" Z";
    return art(
      p(silhouette,"$linen","$ink",1.4,1),
      p(path(at(shoulder.x+spread*4,shoulder.y+20))+
        cubic(at(outer-spread*9,sleeveY+17),
          at(outer+spread*10,bottom-54),at(outer+spread*5,bottom-13)),
        "none","$shadow",1.5,.78),
      p(path(at(shoulder.x-spread*4,shoulder.y+13))+
        cubic(at(inner+spread*10,sleeveY+19),
          at(inner+spread*11,bottom-39),at(inner,bottom-15)),
        "none","$wash",3.4,.6),
      p(path(at(outer+spread*4,bottom-12))+
        cubic(at(outer+spread*9,bottom+6),
          at((outer+inner)*.59,bottom+13),innerBottom),
        "none","$shadow",1.2,.78),
      p(path(at(shoulder.x-spread*8,shoulder.y+24))+
        cubic(at(hand.x+spread*6,hand.y+12),
          at(inner+spread*8,bottom-31),at(inner+spread*4,bottom-18)),
        "none","$deep",.95,.62),
      p(path(at(outer+spread*6,bottom-23))+
        cubic(at(outer+spread*1,bottom-5),
          at((outer+inner)*.4,bottom+4),at((outer+inner)*.54,bottom+2)),
        "none","$paper",2,.58),
    );
  };
  const hand=(which:"near"|"far")=>{
    if(scene==="mountain-trail"&&which==="far")return empty();
    const h=which==="near"?a.nearHand:a.farHand;
    if(scene==="river-scholar"){
      // Distinct left/right pinch silhouettes hold the LOWER scroll lip.
      // Previously each hand was a round two-stroke bead on the paper.
      // Both grips use the measured visible knuckles and remain attached to
      // their original wrist/hand joints through all film frames.
      const sign=which==="near"?1:-1;
      const q=(dx:number,dy:number)=>at(h.x+sign*dx,h.y+dy);
      return art(
        // Contiguous opaque skin silhouette. Tucked wrist emerges from
        // the hanging cuff and turns into a thumb against the rolled paper.
        p(path(q(-8,8))+
          cubic(q(-9,3),q(-8,-5),q(-3,-8))+
          cubic(q(0,-10),q(3,-9),q(5,-5))+
          quad(q(9,-2),q(7,2))+
          cubic(q(5,6),q(3,10),q(-1,9))+
          quad(q(-6,11),q(-8,8))+" Z",
          "$skin","$shadow",1.05,1),
        // Thumb turns visibly around the lower paper edge, rather than
        // stopping as an unrelated dark circle on the page.
        p(path(q(2,-7))+
          cubic(q(6,-7),q(9,-4),q(7,-1)),
          "none","$shadow",.92,.85),
        p(path(q(4,-3))+
          quad(q(7,-1),q(5,3)),
          "none","$skinshade",.68,.72),
        // Three non-parallel finger creases taper toward the parchment.
        p(path(q(-4,-5))+
          cubic(q(-3,-2),q(-2,3),q(0,5)),
          "none","$shadow",.69,.72),
        p(path(q(-1,-6))+
          cubic(q(0,-2),q(1,2),q(2,5)),
          "none","$shadow",.55,.63),
        p(path(q(-6,3))+
          quad(q(-4,6),q(-1,7)),
          "none","$skinshade",.7,.57),
        // The soft cuff contact ends at the same measured wrist; no
        // isolated finger dots or floating highlight strokes.
        p(path(q(-9,6))+
          quad(q(-7,9),q(-4,9)),
          "none","$linen",.87,.77),
      );
    }
    return art(
      p(path(at(h.x-6,h.y-3))+
        quad(at(h.x+1,h.y-9),at(h.x+6,h.y-4))+
        quad(at(h.x+9,h.y+5),at(h.x+1,h.y+9))+
        quad(at(h.x-6,h.y+6),at(h.x-6,h.y-3))+" Z",
        "$skin","$shadow",.95,1),
      p(path(at(h.x-3,h.y-3))+
        quad(at(h.x+1,h.y-12),at(h.x+5,h.y-13))+
        path(at(h.x+1,h.y-4))+
        quad(at(h.x+4,h.y-9),at(h.x+7,h.y-11)),
        "none","$shadow",.76,.78),
    );
  };
  const shoe=(side:"left"|"right")=>{
    const b=s.box("foot-screen-"+side),x=b.origin.x,y=b.origin.y,
      w=b.width,h=b.height;
    return art(
      p(path(at(x+w*.23,y+h*.12))+
        quad(at(x+w*.48,y-h*.09),at(x+w*.75,y+h*.26))+
        quad(at(x+w*.96,y+h*.55),at(x+w*.94,y+h*.84))+
        quad(at(x+w*.47,y+h*1.06),at(x+w*.09,y+h*.81))+
        quad(at(x-w*.03,y+h*.53),at(x+w*.23,y+h*.12))+" Z",
        "$ink","$shadow",.84,1),
      p(path(at(x+w*.09,y+h*.79))+
        quad(at(x+w*.5,y+h*1.13),at(x+w*.94,y+h*.79)),
        "none","$linen",1.2,.72),
    );
  };
  // Two opaque lower garment panels that carry their own curved ink volumes.
  // The hip-to-hem construction reuses the SAME source-projected anchors as
  // the static robe, so their later gait poses have genuine visible geometry.
  const walkingHemPanel=(side:"left"|"right")=>{
    const left=side==="left",sign=left?-1:1;
    const sideWaist=left?a.leftWaist:a.rightWaist;
    const sideHip=left?a.leftHip:a.rightHip;
    const sideHem=left?a.leftHem:a.rightHem;
    const start=at(mix(sideWaist.x,sideHip.x,.79),hip.y-7);
    const bottom=at(sideHem.x+sign*3,sideHem.y+4);
    const overlap=at(hem.x-sign*4,hem.y+9);
    const center=at(hem.x-sign*7,hip.y+21);
    const shape=path(start)+
      cubic(at(sideHip.x+sign*9,hip.y+25),
        at(sideHem.x+sign*17,hem.y-45),bottom)+
      quad(at(sideHem.x+sign*8,hem.y+17),overlap)+
      cubic(at(hem.x-sign*11,hem.y-34),
        at(center.x+sign*4,hip.y+38),center)+
      quad(at(waist.x+sign*5,hip.y+5),start)+" Z";
    const foldStart=at(start.x-sign*2,start.y+22);
    const foldEnd=at(sideHem.x-sign*13,sideHem.y-8);
    return art(
      // Neither panel uses an alpha-blended skin/robe silhouette. The
      // unanimated base robe stays beneath as an occlusion safety layer.
      p(shape,"$linen","none",0,1),
      p(path(foldStart)+
        cubic(at(sideHip.x+sign*4,hip.y+39),
          at(foldEnd.x-sign*4,foldEnd.y-36),foldEnd),
        "none","$shadow",1.35,.58),
      p(path(at(start.x-sign*7,start.y+35))+
        cubic(at(waist.x+sign*7,hip.y+46),
          at(hem.x+sign*4,hem.y-31),at(overlap.x+sign*3,overlap.y-7)),
        "none","$wash",2,.4),
      // A short diagonal compression crease communicates hem weight.
      // The former stroke crossed BOTH panels as a straight false hem.
      p(path(at(sideHem.x-sign*4,sideHem.y-19))+
        cubic(at(sideHem.x-sign*7,sideHem.y-11),
          at(sideHem.x-sign*16,sideHem.y-8),
          at(sideHem.x-sign*23,sideHem.y-5)),
        "none","$shadow",.72,.56),
    );
  };
  const hemFabric=art(
    p(path(at(a.leftHem.x+12,a.leftHem.y-14))+
      quad(at(a.leftHem.x-20,hem.y-12),at(a.leftHem.x-24,hem.y+9))+
      quad(at(a.leftHem.x+15,hem.y+17),at(hem.x-1,hem.y+2))+
      " Z","$linen","$shadow",1.1,.96),
    p(path(at(a.leftHem.x-21,hem.y+7))+
      quad(at(hem.x-38,hem.y+13),at(hem.x-12,hem.y+3)),
      "none","$ink",1.0,.61),
  );
  // Separate observed flying cloth masses make these three references
  // distinct. Source positions become ordinary 260×340 authoring geometry.
  const rp=(x:number,y:number)=>s.project({x,y});
  const ribbon=scene==="river-scholar"?
    art(
      p(path(rp(491,506))+
        cubic(rp(448,578),rp(391,610),rp(317,625))+
        cubic(rp(315,629),rp(315,637),rp(325,638))+
        cubic(rp(388,623),rp(459,578),rp(505,525))+" Z",
        "$wash","$shadow",.8,.63),
      p(path(rp(324,633))+
        cubic(rp(394,611),rp(453,579),rp(503,522)),
        "none","$paper",1.15,.65),
      p(path(rp(477,524))+
        cubic(rp(445,633),rp(393,674),rp(354,693))+
        cubic(rp(358,705),rp(370,705),rp(377,695))+
        cubic(rp(452,626),rp(476,572),rp(504,519))+" Z",
        "$linen","$shadow",.85,.9),
    ):
    scene==="mountain-trail"?
    art(
      p(path(rp(1005,542))+
        cubic(rp(1046,604),rp(1093,640),rp(1165,651))+
        cubic(rp(1166,659),rp(1160,667),rp(1157,669))+
        cubic(rp(1113,658),rp(1068,636),rp(1025,560))+" Z",
        "$deep","$shadow",.95,.48),
      p(path(rp(1012,549))+
        cubic(rp(1050,631),rp(1095,687),rp(1161,694))+
        cubic(rp(1162,696),rp(1150,708),rp(1145,710))+
        cubic(rp(1097,684),rp(1053,631),rp(1008,560))+" Z",
        "$linen","$shadow",.95,.81),
      p(path(rp(1046,604))+
        cubic(rp(1085,645),rp(1126,669),rp(1161,661)),
        "none","$paper",1.5,.7),
    ):
    art(
      p(path(rp(691,483))+
        cubic(rp(701,529),rp(732,571),rp(752,587))+
        cubic(rp(754,597),rp(743,602),rp(736,598))+
        cubic(rp(709,573),rp(684,540),rp(683,493))+" Z",
        "$linen","$shadow",1,.83),
      p(path(rp(698,503))+
        cubic(rp(712,555),rp(735,583),rp(749,590)),
        "none","$wash",1.6,.66),
    );
  const sash=art(
    p(path(at(waist.x+5,waist.y+6))+
      quad(at(waist.x+16,hip.y+12),at(waist.x+31,hem.y-30))+
      quad(at(waist.x+15,hem.y-37),at(waist.x+10,hem.y-64))+
      quad(at(waist.x+8,hip.y+15),at(waist.x+5,waist.y+6))+" Z",
      "$deep","$shadow",.85,.51),
    p(path(at(waist.x+8,waist.y+16))+
      quad(at(waist.x+16,hip.y+24),at(waist.x+23,hem.y-41)),
      "none","$paper",1.2,.55),
    ...ribbon.shapes.filter((v):v is ReturnType<typeof p>=>v.type==="path"),
  );
  const reading=scene==="river-scholar";
  const scrollBox=reading?s.box("scroll"):null;
  const lx=scrollBox?scrollBox.origin.x:0;
  const rx=scrollBox?scrollBox.origin.x+scrollBox.width:0;
  const paperY=scrollBox?scrollBox.origin.y:0;
  const paperH=scrollBox?scrollBox.height:36;
  const scroll=reading?art(
    p(path(at(lx,paperY))+
      quad(at((lx+rx)*.5,paperY-4),at(rx,paperY))+
      line(at(rx-2,paperY+paperH*.85))+
      quad(at((lx+rx)*.5,paperY+paperH*1.06),
        at(lx+1,paperY+paperH*.88))+" Z",
      "$paper","$shadow",1.1,1),
    p(path(at(lx+13,paperY+11))+
      quad(at((lx+rx)*.5,paperY+13),at(rx-12,paperY+10))+
      path(at(lx+16,paperY+20))+line(at(rx-12,paperY+17)),
      "none","$wash",1.1,.48),
  ):empty();
  const cuff=(which:"near"|"far")=>{
    const h=which==="near"?a.nearHand:a.farHand;
    return art(p(path(at(h.x-11,h.y+3))+
      quad(at(h.x,h.y+15),at(h.x+11,h.y+3)),
      "none","$shadow",1.2,.74));
  };
  return {
    robe:body,collar,belt,
    "sleeve-near":sleeve(fit.nearSide),
    "sleeve-far":sleeve(fit.nearSide==="left"?"right":"left"),
    "hand-near":hand("near"),"hand-far":hand("far"),
    scroll,brush:empty(),
    "scholar-opaque-ground":underHem,
    "hem-panel-left":walkingHemPanel("left"),
    "hem-panel-right":walkingHemPanel("right"),
    "scholar-robe-overlay":robeOverlay,
    "scholar-flowing-hem":hemFabric,
    "scholar-sash":sash,"scholar-hair-band":empty(),
    "scholar-sleeve-contour":empty(),
    "hem-drape-art":art(p(path(at(a.leftHem.x+6,a.leftHem.y-5))+
      quad(at(hem.x-23,hem.y+7),at(hem.x+9,hem.y+1)),
      "none","$shadow",1.05,.72)),
    "near-cuff-art":cuff("near"),"far-cuff-art":cuff("far"),
    "near-upper":empty(),"far-upper":empty(),
    // The animated shoe parts are separate root children. The former two-bone
    // lower leg graphics must NOT draw another pair of ungrounded dark shoes.
    "near-lower":empty(),"far-lower":empty(),
    "shoe-left":shoe("left"),"shoe-right":shoe("right"),
    "near-brush-grip-art":empty(),
  };
}
export function applyShanshuiBodyFit(
  scene:ShanshuiScene,parts:readonly CharacterPart[],
):CharacterPart[]{
  const fit=shanshuiBodyFit(scene),a=fit.anchors;
  const headRest=fit.headRest;
  return parts.map(part=>{
    switch(part.id){
      case "head":return {...part,rest:{...part.rest,...headRest}};
      case "hair":case "brows":case "eyes":case "pupil-left":
      case "pupil-right":case "mouth":case "beard":
        return {...part,rest:{...part.rest,...fit.facialRest[part.id]}};
      case "far-sleeve":return {...part,pivot:a.farShoulder};
      case "near-sleeve":return {...part,pivot:a.nearShoulder};
      case "far-hand":return {...part,pivot:a.farHand,z:17};
      case "near-hand":return {...part,pivot:a.nearHand,z:20};
      case "scroll":return {...part,parent:"body",pivot:mid(a.nearHand,a.farHand),z:19};
      case "brush":return {...part,pivot:a.nearHand};
      case "collar":return {...part,pivot:mid(a.leftShoulder,a.rightShoulder)};
      case "sash":return {...part,pivot:mid(a.leftWaist,a.rightWaist)};
      case "hem-drape":return {...part,pivot:mid(a.leftHem,a.rightHem)};
      case "far-cuff":return {...part,pivot:a.farHand};
      case "near-cuff":return {...part,pivot:a.nearHand};
      default:return part;
    }
  });
}

/** Reblock the complete figure at the teacher's 16:9 scale and ground point.
 * All four original walk keys move together and retain smooth film pacing.
 */
export function shanshuiFittedRoute(scene:ShanshuiScene):InkRoutePlan{
  const route=shanshuiRoute(scene),fit=shanshuiBodyFit(scene);
  const final=route.waypoints[route.waypoints.length-1];
  const offsetX=fit.stageCenterX-final.x;
  const offsetY=fit.stageFootY-final.y;
  const baseScale=final.scale??1;
  return {...route,waypoints:route.waypoints.map(k=>({
    ...k,x:n(k.x+offsetX),y:n(k.y+offsetY),
    scale:n((k.scale??1)/baseScale*fit.stageScale),
  }))};
}

/** Explicit paper-space shoe placement from the canonical contact-aware gait,
 * converted to design coordinates BEFORE evaluation. Each shoe is moved by
 * the exact correction required to place its approved art anchor on the foot
 * contact target at each absolute frame. No invented ankle joint coordinate.
 */
export function bakeShanshuiGroundedShoes(
  plan:InkWalkPlan,fit:ShanshuiBodyFit,lastFrame=299,
):CharacterPoseCorrectionTracks{
  if(!Number.isSafeInteger(lastFrame)||lastFrame<plan.endFrame||
      lastFrame>360000)throw new RangeError("Shoe track duration invalid.");
  const tracks:CharacterPoseCorrectionTracks={
    "shoe-left":[],"shoe-right":[],
  };
  const frames:number[]=[];
  for(let i=0;i<lastFrame;i+=2)frames.push(i);
  frames.push(lastFrame);
  for(const frame of frames){
    const stage=inkRouteAt(plan.route,frame);
    const contact=inkWalkAt(plan,frame);
    for(const [id,foot,base] of [
      ["shoe-left",contact.left,fit.anchors.leftFoot],
      ["shoe-right",contact.right,fit.anchors.rightFoot],
    ] as const){
      const designX=133+(foot.x-stage.x)/stage.scale;
      const designY=340+(foot.y-stage.y)/stage.scale;
      tracks[id].push({
        frame,pose:{
          x:n(designX-base.x),y:n(designY-base.y),
          rotation:foot.planted?0:foot.x>=stage.x?-2:2,
        },
      });
    }
  }
  return tracks;
}

/** Gait-directed deformation for two individually painted, opaque skirt
 * panels. Foot targets come from the SAME world-locked IK plan as the shoes.
 * Pose offsets are evaluated per absolute frame; no accumulated integration,
 * random movement or hidden knee measurements. The uncut base robe keeps
 * the two layers fully opaque when their lower edges separate in motion.
 */
export function bakeShanshuiWalkingHem(
  plan:InkWalkPlan,fit:ShanshuiBodyFit,amount=.72,lastFrame=299,
):CharacterPoseCorrectionTracks{
  if(!Number.isFinite(amount)||amount<0||amount>1||
    !Number.isSafeInteger(lastFrame)||lastFrame<plan.endFrame||
    lastFrame>36000)
    throw new RangeError("Walking robe requires bounded 0..1 motion and film frames.");
  const tracks:CharacterPoseCorrectionTracks={
    "hem-panel-left":[],"hem-panel-right":[],
  };
  const frames:number[]=[];
  for(let frame=0;frame<lastFrame;frame+=2)frames.push(frame);
  frames.push(lastFrame);
  for(const frame of frames){
    const root=inkRouteAt(plan.route,frame);
    const gait=inkWalkAt(plan,frame);
    // As the character approaches a stop, cloth settles instead of
    // continuing its cycle over a stationary figure.
    const moving=Math.min(1,Math.hypot(root.vx,root.vy)/.32)*amount;
    const phase=2*Math.PI*(Math.min(frame,plan.endFrame)-
      plan.startFrame)/plan.cycleFrames;
    for(const [side,foot,rest] of [
      ["left",gait.left,fit.anchors.leftFoot],
      ["right",gait.right,fit.anchors.rightFoot],
    ] as const){
      // A planted foot travels *back* relative to the pelvis and a swing
      // foot advances. The skirt's corresponding panel follows with a
      // restrained delayed arc; the root's world position is never changed.
      const designX=133+(foot.x-root.x)/root.scale;
      const relative=Math.max(-18,Math.min(18,designX-rest.x));
      const delayed=Math.sin(phase-.68+(side==="left"?0:Math.PI));
      const sweep=Math.max(-3.6,Math.min(3.6,relative*.19));
      const lift=Math.max(0,delayed);
      tracks["hem-panel-"+side].push({frame,pose:{
        // Explicit positive zeros avoid stale signed-zero poses when the
        // performer has finished walking or the cloth control is disabled.
        x:moving===0?0:n(moving*(sweep+delayed*1.35)),
        y:moving===0?0:n(-moving*lift*1.2),
        rotation:moving===0?0:n(moving*(sweep*.66+delayed*1.75)),
      }});
    }
  }
  return tracks;
}
