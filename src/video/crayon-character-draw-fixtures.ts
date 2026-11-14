import type { CrayonColor, CrayonElement, CrayonMotionKey, CrayonSceneSpec } from "../../registry/video/materials/crayon-scene";
import { crayonPerformanceScene } from "./crayon-performance-fixtures";

/**
 * An original crayon construction performance: the author first marks out
 * structure, outlines each major mass, colors with successive directional
 * strokes, then adds acting.  Scene data owns the story; CRAYON1 stays neutral.
 */
export interface CrayonDrawInOptions {
  order: "outline-first" | "fill-first";
  outlineFraction: number;
  glaze: number;
}
export function crayonCharacterDrawScene(
  aspect:"landscape"|"portrait",options:Partial<CrayonDrawInOptions>={},
):CrayonSceneSpec{
  const order=options.order??"outline-first",outlineFraction=options.outlineFraction??.31,
    glaze=options.glaze??.17;
  if(!["outline-first","fill-first"].includes(order)||
    !Number.isFinite(outlineFraction)||outlineFraction<.1||outlineFraction>.75||
    !Number.isFinite(glaze)||glaze<0||glaze>.45)
    throw new RangeError("Invalid character drawing style settings");
  const base=crayonPerformanceScene(aspect);
  const W=base.width,H=base.height,ox=W*.51,oy=aspect==="portrait"?H*.65:H*.63;
  const durationFrames=450;
  const ink:CrayonColor="#726d70";
  const construction={order,outlineFraction,glaze};
  const sceneTimes:Record<string,readonly [number,number]>={
    "distant-meadow":[248,374],"paper-cloud-left":[278,394],"dusk-hill":[282,412],
    "sun-disc":[300,412],"rolling-grass":[324,435],"shadow":[204,310],
    "tail":[112,214],"left-ear":[114,208],"right-ear":[126,218],
    "left-ear-inner":[188,265],"right-ear-inner":[198,270],
    "back-arm":[171,269],"body":[138,276],
    "foot-back":[191,289],"foot-front":[207,303],
    "belly":[222,315],"scarf-wrap":[239,334],"scarf-tail":[251,344],
    "scarf-weave":[308,362],"head":[147,287],"muzzle":[233,322],
    "left-eye":[316,365],"right-eye":[320,368],
    "freckles-left":[343,388],"freckles-right":[346,389],
    "nose":[312,360],"mouth":[328,379],"front-arm":[246,353],
    "flower-stem":[284,358],"flower-leaf":[295,381],
    "flower-petals":[301,393],"petal-etching":[342,411],
    "flower-center":[348,410],
    "meadow-sprig-0":[329,402],"meadow-sprig-1":[338,410],
    "meadow-sprig-2":[348,420],"meadow-sprig-3":[356,432],
  };
  const bodyMotion:readonly CrayonMotionKey[]=[
    {frame:0,x:0,y:0},{frame:347,x:0,y:0},
    {frame:368,x:0,y:-8,rotate:-2},{frame:394,x:0,y:1,rotate:2},
    {frame:430,x:0,y:-3,rotate:-1},{frame:449,x:0,y:0},
  ];
  const headMotion:readonly CrayonMotionKey[]=[
    {frame:0,x:0,y:0},{frame:346,x:0,y:0},
    {frame:375,x:0,y:-2,rotate:7},{frame:410,x:0,y:0,rotate:-6},
    {frame:449,x:0,y:0,rotate:0},
  ];
  const tailMotion:readonly CrayonMotionKey[]=[
    {frame:0,x:0,y:0,rotate:-12},{frame:345,x:0,y:0,rotate:-12},
    {frame:379,x:0,y:0,rotate:17},{frame:408,x:0,y:0,rotate:-12},
    {frame:449,x:0,y:0,rotate:9},
  ];
  const armMotion:readonly CrayonMotionKey[]=[
    {frame:0,x:0,y:0,rotate:-6},{frame:340,x:0,y:0,rotate:-6},
    {frame:375,x:0,y:0,rotate:-29},{frame:399,x:0,y:0,rotate:-16},
    {frame:421,x:0,y:0,rotate:-33},{frame:449,x:0,y:0,rotate:-6},
  ];
  const background=new Set(["distant-meadow","paper-cloud-left","dusk-hill","sun-disc","shadow"]);
  // The paper environment is drawn AFTER the character appears; its gentle,
  // two-layer wax remains subordinate to the illustrated subject.
  const scenicColors:Record<string,readonly [CrayonColor,CrayonColor,CrayonColor]>={
    "distant-meadow":["#b7b4c4","#9e9ab0","#ded6d8"],
    "dusk-hill":["#a6bda9","#88a694","#d1dcbf"],
    "paper-cloud-left":["#e8dac4","#d7cbb8","#fff1dc"],
    "sun-disc":["#e9bb79","#d1a66e","#f9db9e"],
  };
  const elements:CrayonElement[]=base.elements.map((node):CrayonElement=>{
    if(node.kind==="lettering"){
      if(node.id==="eyebrow")return {...node,
        lines:["DRAWN IN WAX  /  ORIGINAL CHARACTER"],timing:{start:1,end:35},
        fontSize:aspect==="portrait"?12:13};
      if(node.id==="headline")return {...node,
        lines:aspect==="portrait"?["FIRST A LINE,","THEN A LIFE"]:["FIRST A LINE, THEN A LIFE"],
        timing:{start:8,end:82},fontSize:aspect==="portrait"?42:51};
      if(node.id==="caption")return {...node,
        lines:aspect==="portrait"?["A FEW MARKS BECOME A FRIEND"]:["A FEW MARKS BECOME A FRIEND"],
        timing:{start:357,end:408},anchor:"start",
        x:aspect==="portrait"?32:48,y:H-78,
        fontSize:aspect==="portrait"?17:20,
        backing:{color:"#f6edda",padding:10,width:aspect==="portrait"?380:445,height:43,radius:5}};
      return {...node,lines:["WAX ON PAPER  /  DRAWN BY DEGREES"],
        timing:{start:416,end:449},fontSize:aspect==="portrait"?11:13};
    }
    const range=sceneTimes[node.id]??[110,180];
    const timing={start:range[0],end:range[1]};
    if(node.kind==="wax")return {
      ...node,timing,
      ...(background.has(node.id) ?
        (node.id==="shadow" ? {} : {
          colors:scenicColors[node.id]??node.colors,
          pressure:Math.min(node.pressure??.76,.57),
          spacing:Math.max(node.spacing??9,12),
          construction:{order:"fill-first" as const,outlineFraction:.14,glaze:.13},
        }) : {construction}),
      ...(node.id==="body"?{motion:bodyMotion}:
        node.id==="head"?{motion:headMotion}:
        node.id==="tail"?{motion:tailMotion}:
        node.id==="front-arm"?{motion:armMotion}:
        node.motion?{motion:[{frame:0,x:0,y:0,rotate:0},
          {frame:345,x:0,y:0,rotate:0},{frame:449,x:0,y:0,rotate:0}]}:{}),
    };
    if(node.kind==="contour"){
      // This is a light paper-landscape gesture, not a strong diagonal divider.
      if(node.id==="rolling-grass")return {...node,timing,
        width:aspect==="portrait"?2.2:3.1,opacity:aspect==="portrait"?.23:.38,
        color:"#829b8b"};
      if(node.id==="left-eye"||node.id==="right-eye")
        return {...node,timing,poseCadence:2,
          poseCues:[{frame:0,pose:"base"},{frame:368,pose:"blink"},
            {frame:375,pose:"base"},{frame:418,pose:"smile"}]};
      if(node.id==="mouth")
        return {...node,timing,poseCadence:2,
          poseCues:[{frame:0,pose:"base"},{frame:389,pose:"smile"}]};
      return {...node,timing};
    }
    return {...node,timing};
  });

  // Light construction gestures are transient: these guide marks precede
  // contours and disappear after the textured permanent drawing replaces them.
  const guide=(id:string,d:string,start:number,end:number):CrayonElement=>({
    kind:"contour",id,d,color:ink,width:1.45,opacity:.36,
    timing:{start,end},exitFade:{start:183,end:234},
  });
  elements.splice(5,0,
    guide("construction-head",
      "M"+(ox-72)+" "+(oy-102)+" C"+(ox-86)+" "+(oy-162)+" "+
      (ox+68)+" "+(oy-184)+" "+(ox+73)+" "+(oy-102)+
      " C"+(ox+75)+" "+(oy-28)+" "+(ox-77)+" "+(oy-23)+" "+
      (ox-72)+" "+(oy-102),32,90),
    guide("construction-center",
      "M"+ox+" "+(oy-183)+" Q"+(ox-9)+" "+(oy-80)+" "+
      (ox+2)+" "+(oy+111),46,109),
    guide("construction-body",
      "M"+(ox-70)+" "+(oy-44)+" Q"+(ox+8)+" "+(oy-92)+" "+
      (ox+75)+" "+(oy-33)+" Q"+(ox+94)+" "+(oy+78)+" "+
      (ox-26)+" "+(oy+119),54,119),
    guide("construction-shoulder",
      "M"+(ox-72)+" "+(oy-22)+" Q"+ox+" "+(oy-9)+" "+
      (ox+67)+" "+(oy-22),65,126),
  );

  return {...base,id:"crayon-draw-in-"+aspect,durationFrames,elements,
    seed:481,paper:"#f8f1e3",paperTooth:.74,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:270,focusX:W/2,focusY:H/2+4,zoom:1.02},
      {frame:449,focusX:W/2,focusY:H/2,zoom:1}],
  };
}
