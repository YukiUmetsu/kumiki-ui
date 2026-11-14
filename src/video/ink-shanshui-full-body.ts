/**
 * Full-figure shanshui art direction, using ONE projected coordinate system for
 * the face, shoulder, waist, arms, sleeve drape, robe, hem and shoes.
 * All geometry is original vector art, not sampled copyrighted image pixels.
 * Hidden anatomy is not reconstructed from these three-quarter paintings.
 */
import type {CharacterPart,CharacterShapeAsset,CharacterPoseDelta,CharacterVec2} from
  "../../registry/character/definition";
import type {ShanshuiScene} from "../../registry/video/ink-shanshui";
import {SHANSHUI_TEACHER_MESHES,SHANSHUI_LEGACY_PUPPET_MESH} from
  "./ink-shanshui-teacher-mesh";
import {shanshuiRoute} from "../../registry/video/ink-shanshui";
import type {InkRoutePlan} from "../../registry/video/ink-actor-director";

type P=CharacterVec2;
const n=(v:number)=>Number(v.toFixed(2));
const mid=(a:P,b:P):P=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const at=(x:number,y:number):P=>({x:n(x),y:n(y)});
const path=(a:P)=>"M"+n(a.x)+" "+n(a.y);
const line=(a:P)=>" L"+n(a.x)+" "+n(a.y);
const quad=(c:P,a:P)=>" Q"+n(c.x)+" "+n(c.y)+" "+n(a.x)+" "+n(a.y);
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
  const skull=s.box("skull"),face=s.box("face");
  const old=SHANSHUI_LEGACY_PUPPET_MESH.regions.skull!;
  const headScale=Math.max(.49,Math.min(1,skull.height/old.height));
  const headPivot={x:139,y:124};
  const faceTopInArt=65,faceCenterInArt=139.5;
  const headRest:CharacterPoseDelta={
    scaleX:headScale,scaleY:headScale,
    x:n(face.origin.x+face.width*.5-
      (headPivot.x+(faceCenterInArt-headPivot.x)*headScale)),
    y:n(face.origin.y-
      (headPivot.y+(faceTopInArt-headPivot.y)*headScale)),
    rotation:scene==="misty-hermit"?-6:scene==="river-scholar"?-4:-8,
  };
  const hemDist=Math.abs(rightHem.x-leftHem.x);
  const sleeveL=s.box("sleeve-screen-left"),sleeveR=s.box("sleeve-screen-right");
  const boxFoot=s.ref.regions["foot-screen-left"]!;
  const footY=(boxFoot.y+boxFoot.height*.86)/r.source.height*540;
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
    stageFootY:n(footY),nearSide,headRest,
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
  const strokeFold=(dx:number,dy:number,width:number)=>{
    const begin=at(waist.x+dx*.3,waist.y+6);
    return p(path(begin)+
      quad(at(begin.x+dx*.17,hip.y+13),at(begin.x+dx*.76,hem.y-33))+
      quad(at(begin.x+dx*.83,hem.y-17),at(begin.x+dx,hem.y+dy)),
      "none","$shadow",width,.68);
  };
  const robeOverlay=art(
    strokeFold(-42,-3,1.05),strokeFold(-19,3,1.22),
    strokeFold(9,-2,.82),strokeFold(33,2,1.14),
    pathDummy(),
  );
  function pathDummy(){return p(path(at(a.leftHem.x,a.leftHem.y))+
      quad(at(hem.x-26,hem.y+13),at(hem.x,hem.y+6))+
      quad(at(hem.x+24,hem.y+11),a.rightHem),"none","$ink",1.25,.8);}
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
    const silhouette=path(shoulder)+
      quad(at(shoulder.x+spread*20,topY+23),at(outer,b.origin.y+b.height*.38))+
      quad(at(outer+spread*13,bottom-27),at(outer+spread*2,bottom))+
      quad(at((outer+inner)*.51,bottom+7),at(inner,bottom-6))+
      quad(at(hand.x+spread*11,hand.y+14),hand)+
      quad(at(hand.x-spread*11,hand.y-12),at(shoulder.x-spread*9,shoulder.y+16))+
      " Z";
    return art(
      p(silhouette,"$linen","$ink",1.4,1),
      p(path(at(shoulder.x+spread*6,shoulder.y+19))+
        quad(at(outer-spread*3,b.origin.y+b.height*.5),
          at(outer+spread*8,bottom-12)),
        "none","$shadow",1.4,.77),
      p(path(at(shoulder.x-spread*5,shoulder.y+18))+
        quad(at(inner,b.origin.y+b.height*.5),at(inner+spread*3,bottom-10)),
        "none","$wash",2.1,.51),
      p(path(at(outer+spread*2,bottom-3))+
        quad(at((outer+inner)*.5,bottom+12),at(inner,bottom-7)),
        "none","$shadow",1.2,.79),
    );
  };
  const hand=(which:"near"|"far")=>{
    if(scene==="mountain-trail"&&which==="far")return empty();
    const h=which==="near"?a.nearHand:a.farHand;
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
  const hemFabric=art(
    p(path(at(a.leftHem.x+12,a.leftHem.y-14))+
      quad(at(a.leftHem.x-20,hem.y-12),at(a.leftHem.x-24,hem.y+9))+
      quad(at(a.leftHem.x+15,hem.y+17),at(hem.x-1,hem.y+2))+
      " Z","$linen","$shadow",1.1,.96),
    p(path(at(a.leftHem.x-21,hem.y+7))+
      quad(at(hem.x-38,hem.y+13),at(hem.x-12,hem.y+3)),
      "none","$ink",1.0,.61),
  );
  const sash=art(
    p(path(at(waist.x+5,waist.y+6))+
      quad(at(waist.x+16,hip.y+12),at(waist.x+31,hem.y-30))+
      quad(at(waist.x+15,hem.y-37),at(waist.x+10,hem.y-64))+
      quad(at(waist.x+8,hip.y+15),at(waist.x+5,waist.y+6))+" Z",
      "$deep","$shadow",.85,.57),
    p(path(at(waist.x+8,waist.y+16))+
      quad(at(waist.x+16,hip.y+24),at(waist.x+23,hem.y-41)),
      "none","$paper",1.2,.55),
  );
  const reading=scene==="river-scholar";
  const lx=Math.min(a.nearHand.x,a.farHand.x)-12;
  const rx=Math.max(a.nearHand.x,a.farHand.x)+17;
  const paperY=Math.min(a.nearHand.y,a.farHand.y)-18;
  const scroll=reading?art(
    p(path(at(lx,paperY))+
      quad(at((lx+rx)*.5,paperY-4),at(rx,paperY))+
      line(at(rx-2,paperY+36))+
      quad(at((lx+rx)*.5,paperY+44),at(lx+1,paperY+36))+" Z",
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
    "scholar-opaque-ground":empty(),
    "scholar-robe-overlay":robeOverlay,
    "scholar-flowing-hem":hemFabric,
    "scholar-sash":sash,"scholar-hair-band":empty(),
    "scholar-sleeve-contour":empty(),
    "hem-drape-art":hemFabric,
    "near-cuff-art":cuff("near"),"far-cuff-art":cuff("far"),
    "near-upper":empty(),"far-upper":empty(),
    "near-lower":shoe("right"),"far-lower":shoe("left"),
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
