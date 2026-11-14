import type { CrayonElement, CrayonSceneSpec, CrayonColor } from "../../registry/video/materials/crayon-scene";

export type CrayonDemoSubject = "water-cycle" | "city" | "numbers";
export type CrayonDemoAspect = "landscape" | "portrait";
const wax = (id:string,d:string,bounds:{x:number;y:number;width:number;height:number},
  colors:readonly [CrayonColor,CrayonColor,CrayonColor],start:number,end:number,
  options:Partial<Extract<CrayonElement,{kind:"wax"}>>={})
  : CrayonElement => ({kind:"wax",id,d,bounds,colors,timing:{start,end},...options});
const contour = (id:string,d:string,color:CrayonColor,width:number,start:number,end:number,
  options:Partial<Extract<CrayonElement,{kind:"contour"}>>={})
  : CrayonElement => ({kind:"contour",id,d,color,width,timing:{start,end},...options});
const text = (id:string,lines:readonly string[],x:number,y:number,fontSize:number,
  color:CrayonColor,start:number,end:number,
  options:Partial<Extract<CrayonElement,{kind:"lettering"}>>={}):CrayonElement =>
  ({kind:"lettering",id,lines,x,y,fontSize,color,timing:{start,end},screenSpace:true,...options});
const ellipse = (cx:number,cy:number,rx:number,ry:number) =>
  "M"+(cx-rx)+" "+cy+" a"+rx+" "+ry+" 0 1 0 "+(rx*2)+" 0 a"+rx+" "+ry+" 0 1 0 -"+(rx*2)+" 0 Z";
const palette = {
  sky:["#80acbe","#5b8d9e","#a8c9ce"] as const,
  blue:["#4c89b5","#376d98","#8ac2d0"] as const,
  green:["#629577","#3f756a","#a9c4a0"] as const,
  yellow:["#edc57c","#d69c65","#f7dc9b"] as const,
  coral:["#df9278","#b76b69","#f2b6a0"] as const,
  mauve:["#9c8fa9","#6c7799","#c2b2c4"] as const,
  navy:["#445575","#334d66","#7288a4"] as const,
};
/** Each fixture is independent editorial artwork, not a recoloring of the fox picture. */
export function crayonDemoScene(subject:CrayonDemoSubject, aspect:CrayonDemoAspect):CrayonSceneSpec {
  const portrait=aspect==="portrait", W=portrait?540:960,H=portrait?960:540;
  const title=subject==="water-cycle"?"WHERE RAIN BEGINS":subject==="city"?"OUR LITTLE TOWN":"HOW THINGS GROW";
  const subtitle=subject==="water-cycle"?"A water journey":subject==="city"?"Drawn one home at a time":"An illustrative comparison";
  const elements:CrayonElement[]=[
    text("chapter",["DRAWN KNOWLEDGE     /     "+(subject==="water-cycle"?"01":subject==="city"?"02":"03")],
      44,45,13,"#4b596d",1,25,{family:"sans",weight:700}),
    text("headline",portrait?title.split(" ").reduce<string[]>((a,w)=>{
      if(!a.length||a[a.length-1].length+w.length>10)a.push(w);
      else a[a.length-1]+=" "+w;
      return a;
    },[]):[title],44,portrait?114:105,portrait?50:51,"#324a63",12,47,{weight:700,lineHeight:1.08}),
    text("subtitle",[subtitle],44,portrait?285:151,20,"#586a70",27,65,{weight:400}),
    text("footer",["A CRAYON STUDY    /    ORIGINAL ILLUSTRATION"],44,H-24,13,"#394f5d",190,230,{family:"sans",weight:600}),
  ];
  const stageY=portrait?470:283;
  if(subject==="water-cycle") {
    const water = "M0 "+(H*.75)+" Q"+(W*.25)+" "+(H*.67)+" "+(W*.5)+" "+(H*.76)+
      " Q"+(W*.8)+" "+(H*.85)+" "+W+" "+(H*.71)+" V"+H+" H0Z";
    const cloud="M-122 23 C-145 -12 -122 -49 -88 -45 C-85 -82 -21 -91 6 -56 C42 -81 94 -63 94 -35 C135 -28 141 23 108 35Z";
    elements.push(wax("pond",water,{x:0,y:H*.63,width:W,height:H*.37},palette.blue,65,162,{spacing:11}));
    elements.push(wax("sun",ellipse(W*.79,stageY-105,63,63),
      {x:W*.79-64,y:stageY-169,width:128,height:128},palette.yellow,39,119));
    elements.push(wax("cloud",cloud,{x:-147,y:-91,width:300,height:145},palette.mauve,74,158,
      {placement:{x:W*.42,y:stageY-75},motion:[{frame:0,x:-30,y:0},{frame:229,x:25,y:-6}]}));
    for(let i=0;i<9;i++) {
      const x=W*.42+(i-4)*17, y=stageY-5+(i%3)*4;
      elements.push(contour("rain-"+i,`M${x} ${y} l-14 46`,"#4387aa",3,133+i*3,190,{opacity:.7}));
    }
    elements.push(contour("evaporation","M"+W*.66+" "+(H*.7)+" Q"+W*.82+" "+(H*.53)+" "+W*.74+" "+(stageY-20),
      "#cd8959",6,178,215));
    elements.push(contour("breeze","M"+W*.1+" "+(stageY+25)+" Q"+W*.22+" "+(stageY-10)+" "+W*.33+" "+(stageY+25),
      "#fff2cf",3,151,204));
    elements.push(text("label-rain",["PRECIPITATION"],portrait?75:130,stageY+130,16,"#304d60",185,219,{family:"sans",weight:700}));
    elements.push(text("label-vapor",["EVAPORATION"],portrait?270:W*.72,stageY+145,16,"#304d60",185,219,{family:"sans",weight:700}));
  } else if(subject==="city") {
    const hill="M0 "+H*.76+" Q"+W*.3+" "+H*.67+" "+W*.55+" "+H*.76+" Q"+W*.78+" "+H*.65+" "+W+" "+H*.73+" V"+H+"H0Z";
    elements.push(wax("city-hill",hill,{x:0,y:H*.58,width:W,height:H*.42},palette.green,48,143));
    const houses=portrait?[[120,H*.60,.94],[350,H*.77,1.13],[220,H*.91,.68]]:
      [[325,H*.70,1.2],[622,H*.77,1],[790,H*.67,.72]];
    houses.forEach(([x,y,s],i)=>{
      const baseY=0, house="M-65 -24 H65V82H-65Z",roof="M-84 -23 L0 -94 L84 -23 Z";
      const place={x,y,scale:s};
      elements.push(wax("house-"+i,house,{x:-70,y:-29,width:140,height:116},
        i%2?palette.yellow:palette.coral,74+i*15,160+i*12,{placement:place}));
      elements.push(wax("roof-"+i,roof,{x:-90,y:-99,width:180,height:90},
        palette.navy,87+i*14,175+i*12,{placement:place}));
      elements.push(contour("door-"+i,"M-17 82V23H18V82", "#44546d",5,135+i*12,206,{placement:place}));
      elements.push(contour("window-"+i,"M-52 -3H-23V29H-52Z M23 -3H52V29H23Z",
        "#f4dfb3",3,145+i*11,213,{placement:place}));
    });
    elements.push(contour("village-path","M0 "+H*.95+" Q"+W*.42+" "+H*.8+" "+W+" "+H*.95,
      "#e2c49d",13,171,226,{opacity:.75}));
  } else {
    // Values are explicitly fictional illustrative data; not fabricated live measurements.
    const values=[42,64,85,110,133];
    const availableWidth=portrait?440:800,baseX=portrait?57:98;
    const barW=availableWidth/(values.length*1.58),gap=barW*.58;
    const baseY=portrait?765:445;
    values.forEach((height,i)=>{
      const x=baseX+i*(barW+gap),y=baseY-height*(portrait?2.45:1.4);
      elements.push(wax("bar-"+i,`M${x} ${y}H${x+barW}V${baseY}H${x}Z`,
        {x,y,width:barW,height:baseY-y},[palette.blue,palette.green,palette.coral,palette.yellow,palette.mauve][i],
        45+i*20,142+i*15,{spacing:6}));
      elements.push(text("bar-label-"+i,[""+(i+1)],x+barW/2,baseY+31,19,"#334d5d",120+i*11,215,
        {family:"sans",weight:700,anchor:"middle"}));
    });
    elements.push(contour("baseline",`M${baseX-20} ${baseY+7}H${baseX+availableWidth+10}`,
      "#566574",3,35,95));
    elements.push(text("disclaimer",["ILLUSTRATIVE VALUES  •  NOT SENSOR DATA"],44,portrait?858:496,14,
      "#516271",201,230,{family:"sans",weight:500}));
  }
  return {version:1,id:"crayon-"+subject+"-"+aspect,width:W,height:H,
    durationFrames:240,seed:54,paper:"#f8f0dd",paperTooth:.64,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:125,focusX:W/2+18,focusY:H/2-8,zoom:1.025},
      {frame:239,focusX:W/2,focusY:H/2,zoom:1}]};
}
