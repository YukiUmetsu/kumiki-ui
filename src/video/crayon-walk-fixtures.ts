import type { CrayonElement, CrayonMotionKey, CrayonSceneSpec } from "../../registry/video/materials/crayon-scene";
import { crayonPerformanceScene } from "./crayon-performance-fixtures";

/**
 * Story-independent CRAYON1 locomotion study. Artwork is shared with the
 * character performance, but this authored walk stages a different action.
 * Plant intervals pin local sole anchors to world coordinates while the torso
 * travels and secondary parts inherit ordinary articulated rig motion.
 */
export interface CrayonWalkSettings {
  /** Relative world travel and foot stride, 0.6 to 1.6. */
  stride: number;
  /** Relative flight-arc height, 0.6 to 1.8. */
  lift: number;
  /** Drawn knee splines or exact two-bone joint intersections. */
  rig: "drawn" | "ik";
}
export function crayonWalkScene(
  aspect:"landscape"|"portrait",settings:Partial<CrayonWalkSettings>={},
):CrayonSceneSpec {
  const stride=settings.stride ?? 1,lift=settings.lift ?? 1,rig=settings.rig ?? "drawn";
  if(!Number.isFinite(stride)||stride<.6||stride>1.6||
    !Number.isFinite(lift)||lift<.6||lift>1.8||
    (rig!=="drawn"&&rig!=="ik"))
    throw new RangeError("Invalid CRAYON1 walk settings");
  const scaleWalk=(keys:readonly CrayonMotionKey[]):readonly CrayonMotionKey[]=>
    keys.map(k=>({...k,x:k.x*stride,y:k.y<0?k.y*lift:k.y}));

  const base=crayonPerformanceScene(aspect);
  const W=base.width,H=base.height;
  const move:readonly CrayonMotionKey[]=[
    {frame:0,x:-88,y:0},{frame:36,x:-88,y:0},
    {frame:70,x:-62,y:-7,rotate:-2},{frame:94,x:-37,y:0},
    {frame:124,x:-12,y:-8,rotate:2},{frame:156,x:17,y:0},
    {frame:188,x:48,y:-7,rotate:-2},{frame:214,x:78,y:0},
    {frame:269,x:78,y:0},
  ];
  const elements:CrayonElement[]=base.elements.map((node):CrayonElement=>{
    if(node.id==="shadow")return {...node,placement:{...(node.placement??{}),y:18},motion:scaleWalk([
      {frame:0,x:-88,y:0},{frame:36,x:-88,y:0},{frame:94,x:-37,y:0},
      {frame:156,x:17,y:0},{frame:214,x:78,y:0},{frame:269,x:78,y:0},
    ])};
    if(node.id==="body")return {...node,motion:scaleWalk(move),poseCadence:2};
    if(node.id==="foot-back")return {
      ...node,placement:{...(node.placement??{}),y:22},
      pivot:{x:-29,y:107},poseCadence:2,
      motion:scaleWalk([
        {frame:0,x:0,y:0,rotate:-4},{frame:28,x:0,y:0,rotate:7},
        {frame:38,x:0,y:0,rotate:11},
        {frame:65,x:14,y:-22,rotate:-17},{frame:94,x:25,y:0,rotate:-5},
        {frame:148,x:-29,y:0,rotate:6},{frame:156,x:-29,y:0,rotate:11},
        {frame:185,x:-25,y:-18,rotate:-16},
        {frame:214,x:-24,y:0,rotate:-5},{frame:269,x:-24,y:0,rotate:2},
      ]),
      contacts:[{start:0,end:38,anchor:{x:-29,y:107},releaseFrames:10},
        {start:94,end:156,anchor:{x:-29,y:107},releaseFrames:10},
        {start:214,end:269,anchor:{x:-29,y:107}}],
    };
    if(node.id==="foot-front")return {
      ...node,placement:{...(node.placement??{}),y:22},
      pivot:{x:31,y:107},poseCadence:2,
      motion:scaleWalk([
        {frame:0,x:0,y:0,rotate:-4},{frame:80,x:0,y:0,rotate:6},
        {frame:94,x:-51,y:0,rotate:12},
        {frame:124,x:-5,y:-23,rotate:-20},{frame:156,x:20,y:0,rotate:-6},
        {frame:204,x:-41,y:0,rotate:5},{frame:214,x:-41,y:0,rotate:11},
        {frame:269,x:-41,y:0,rotate:2},
      ]),
      contacts:[{start:0,end:94,anchor:{x:31,y:107},releaseFrames:10},
        {start:156,end:269,anchor:{x:31,y:107}}],
    };
    if(node.id==="head")return {...node,motion:[
      {frame:0,x:0,y:0,rotate:-4},{frame:36,x:0,y:0,rotate:-6},
      {frame:94,x:0,y:0,rotate:4},{frame:156,x:0,y:0,rotate:-3},
      {frame:214,x:0,y:0,rotate:5},{frame:269,x:0,y:0,rotate:0},
    ],poseCadence:2};
    if(node.id==="front-arm")return {...node,motion:[
      {frame:0,x:0,y:0,rotate:-14},{frame:60,x:0,y:0,rotate:-31},
      {frame:118,x:0,y:0,rotate:-8},{frame:176,x:0,y:0,rotate:-30},
      {frame:224,x:0,y:0,rotate:-13},{frame:269,x:0,y:0,rotate:-13},
    ],poseCadence:2};
    if(node.id==="back-arm")return {...node,motion:[
      {frame:0,x:0,y:0,rotate:22},{frame:80,x:0,y:0,rotate:-25},
      {frame:145,x:0,y:0,rotate:22},{frame:210,x:0,y:0,rotate:-20},
      {frame:269,x:0,y:0,rotate:9},
    ],poseCadence:2};
    if(node.id==="tail")return {...node,motion:[
      {frame:0,x:0,y:0,rotate:-16},{frame:55,x:0,y:0,rotate:16},
      {frame:124,x:0,y:0,rotate:-13},{frame:188,x:0,y:0,rotate:19},
      {frame:250,x:0,y:0,rotate:-8},{frame:269,x:0,y:0,rotate:-8},
    ],poseCadence:2};
    if(node.kind==="lettering"&&node.id==="eyebrow")
      return {...node,lines:["CRAYON WALK / ORIGINAL CHARACTER"]};
    if(node.kind==="lettering"&&node.id==="headline")
      return {...node,lines:aspect==="portrait"?["A LITTLE","JOURNEY"]:["A LITTLE JOURNEY"]};
    if(node.kind==="lettering"&&node.id==="caption")
      return {...node,lines:["ONE STEP AT A TIME"],timing:{start:112,end:169}};
    if(node.kind==="lettering"&&node.id==="footer")
      return {...node,lines:["CRAYON LOCOMOTION  /  PINNED FOOT CONTACT"]};
    return node;
  });
  // Two independent, curved crayon contours connect hip joints to each foot.
  // Anchors are resolved at each absolute frame after stance correction, so
  // the strokes follow the body during swing without sliding at touchdown.
  elements.splice(7,0,
    {kind:"connector",id:"leg-back",from:{elementId:"body",anchor:{x:-25,y:76}},
      to:{elementId:"foot-back",anchor:{x:-29,y:103}},
      ...(rig==="ik" ? {ik:{upperLength:45,lowerLength:43,bendSide:"left" as const}} :
        {bend:-11,bendKeys:[{frame:0,bend:-5},{frame:38,bend:-6},{frame:65,bend:-28},
          {frame:94,bend:-8},{frame:156,bend:-8},{frame:185,bend:-27},
          {frame:214,bend:-7},{frame:269,bend:-5}]}),
      width:12,color:"#8b6c80",opacity:.86,timing:{start:0,end:26},poseCadence:2},
    {kind:"connector",id:"leg-front",from:{elementId:"body",anchor:{x:27,y:76}},
      to:{elementId:"foot-front",anchor:{x:31,y:103}},
      ...(rig==="ik" ? {ik:{upperLength:45,lowerLength:43,bendSide:"right" as const}} :
        {bend:12,bendKeys:[{frame:0,bend:6},{frame:94,bend:6},{frame:124,bend:29},
          {frame:156,bend:8},{frame:214,bend:7},{frame:269,bend:6}]}),
      width:12,color:"#bb766d",opacity:.92,timing:{start:0,end:26},poseCadence:2},
  );
  // Ink-tracked footprints stay in the world, not under the traveling rig.
  const center=W*.51;
  for(const [i,offset] of [-88,-37,17,78].entries()){
    const x=center+offset+(i%2?25:-29),y=(aspect==="portrait"?H*.65:H*.63)+131;
    elements.splice(4+i,0,{
      kind:"contour",id:"footprint-"+i,timing:{start:38+i*40,end:130+i*35},
      d:"M"+(x-10)+" "+y+" Q"+x+" "+(y+6)+" "+(x+10)+" "+y,
      color:"#9a8c7a",opacity:.58,width:2.5,
    });
  }
  return {...base,id:"crayon-walk-"+aspect,elements};
}
