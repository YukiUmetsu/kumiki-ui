import type { CrayonColor, CrayonElement, CrayonMotionKey, CrayonSceneSpec } from "../../registry/video/materials/crayon-scene";
import { crayonPerformanceScene } from "./crayon-performance-fixtures";
import { crayonScaleField, crayonMasonryCourses, crayonRoofCourses } from "./crayon-craft-detail-patterns";

/** Original crayon cast: a rigged dragon, forest friend and owl in a detailed village. */
export interface CrayonDragonVillageOptions {
  wingPower:number; detail:number; followThrough:number;
  cast:"duo"|"trio"; palette:"teal"|"copper"|"plum";
}
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;
const stone=["#c9b6a8","#a89695","#f1d9bd"] as const;
const shade=["#a4a6b0","#8a8a9a","#dcd5cc"] as const;
const roof=["#70839f","#526a88","#abb4ca"] as const;
const timber=["#926e66","#765960","#cc9d7b"] as const;
const glass=["#aed5ce","#7faeb6","#e3ecce"] as const;
const gold=["#edbd7b","#c89068","#ffe5aa"] as const;
const paper=["#e8e0cc","#cbbfb6","#fff4df"] as const;
const palettes={
  teal:{skin:["#648e91","#386e79","#a7bdb6"] as const,
    dark:["#4f6c80","#394f69","#91a4b7"] as const,
    wing:["#a7b8bf","#788fa8","#dbcfbf"] as const},
  copper:{skin:["#c27f67","#a4625b","#e2a58b"] as const,
    dark:["#805b72","#614d6c","#a98d93"] as const,
    wing:["#d6ad9b","#b28c90","#efceb0"] as const},
  plum:{skin:["#9c86af","#72668c","#c3acc8"] as const,
    dark:["#687499","#4c557c","#9ba3c8"] as const,
    wing:["#cab7c7","#a297af","#ead4d8"] as const},
};
const egg=(x:number,y:number,rx:number,ry:number)=>
  "M"+(x-rx)+" "+y+"a"+rx+" "+ry+" 0 1 0 "+(2*rx)+" 0a"+rx+" "+ry+" 0 1 0 "+(-2*rx)+" 0Z";
const move=(f:number,r=0,x=0,y=0,sx=1,sy=1):CrayonMotionKey=>
  ({frame:f,rotate:r,x,y,scaleX:sx,scaleY:sy});
const build={order:"outline-first" as const,outlineFraction:.26,glaze:.18};

/**
 * All visible objects are CRAYON1 wax/contour nodes and existing rig links.
 * Absolute timeline (330 frames) is 11s at 30fps; our Storybook preview
 * defaults to 1.2x and remains exact-seek reproducible for production.
 */
export function crayonDragonVillageScene(
  aspect:"landscape"|"portrait",options:Partial<CrayonDragonVillageOptions>={},
):CrayonSceneSpec {
  const wingPower=options.wingPower??1,detail=options.detail??.85,
    followThrough=options.followThrough??7,cast=options.cast??"trio",
    palette=options.palette??"teal";
  if(!Number.isFinite(wingPower)||wingPower<.5||wingPower>1.6 ||
    !Number.isFinite(detail)||detail<.25||detail>1 ||
    !Number.isSafeInteger(followThrough)||followThrough<0||followThrough>18 ||
    !["duo","trio"].includes(cast)||!(palette in palettes))
    throw new RangeError("Invalid CRAYON1 dragon village settings");
  const portrait=aspect==="portrait",W=portrait?540:960,H=portrait?960:540,D=330;
  const dragon=palettes[palette];
  const elements:CrayonElement[]=[];
  const wax=(id:string,d:string,bounds:{x:number;y:number;width:number;height:number},
    colors:readonly [CrayonColor,CrayonColor,CrayonColor],extra:Partial<Wax>={})=>{
    elements.push({kind:"wax",id,d,bounds,colors,timing:{start:14,end:82},
      pressure:.77,spacing:7,construction:build,...extra});
  };
  const line=(id:string,d:string,color:CrayonColor="#566078",width=2.5,
    extra:Partial<Contour>={})=>{
    elements.push({kind:"contour",id,d,color,width,opacity:.70,
      timing:{start:28,end:112},...extra});
  };
  wax("sky-paper",`M0 0H${W}V${H}H0Z`,
    {x:0,y:0,width:W,height:H},paper,
    {construction:undefined,timing:{start:0,end:34},spacing:24,pressure:.17});
  // Atmospheric sky details maintain a clear text band and give the
  // architectural silhouette scale without competing with the characters.
  const moonX=W*(portrait?.83:.79),moonY=H*(portrait?.18:.24);
  wax("village-moon",egg(moonX,moonY,portrait?40:31,portrait?40:31),
    {x:moonX-44,y:moonY-44,width:88,height:88},
    ["#f5d59c","#e4b784","#ffeed1"],
    {timing:{start:12,end:75},spacing:7,pressure:.42,
      construction:{order:"outline-first",outlineFraction:.26,glaze:.13}});
  line("village-moon-craters",
    `M${moonX-13} ${moonY-2}q9 -8 13 -4M${moonX+11} ${moonY+13}q-8 3 -12 0`,
    "#dcb992",2.1,{timing:{start:55,end:109},opacity:.45});
  const cloud=(id:string,cx:number,cy:number,scale:number)=>{
    wax(id,
      `M${cx-75*scale} ${cy+9*scale}Q${cx-83*scale} ${cy-15*scale}
      ${cx-47*scale} ${cy-20*scale}Q${cx-34*scale} ${cy-52*scale}
      ${cx+2*scale} ${cy-37*scale}Q${cx+29*scale} ${cy-56*scale}
      ${cx+47*scale} ${cy-18*scale}Q${cx+87*scale} ${cy-10*scale}
      ${cx+72*scale} ${cy+13*scale}Z`,
      {x:cx-89*scale,y:cy-60*scale,width:179*scale,height:78*scale},
      ["#ede3d4","#d6d4d1","#fff6e3"],
      {spacing:10,pressure:.39,timing:{start:19,end:89},
        construction:{order:"outline-first",outlineFraction:.28,glaze:.17}});
    line(id+"-shadow",
      `M${cx-45*scale} ${cy+8*scale}Q${cx} ${cy+17*scale}
      ${cx+51*scale} ${cy+8*scale}`,
      "#bbb7b5",1.8,{opacity:.35,timing:{start:55,end:111}});
  };
  cloud("left-sky-cloud",W*(portrait?.22:.28),H*(portrait?.25:.28),portrait?.64:.86);
  cloud("right-sky-cloud",W*(portrait?.66:.91),H*(portrait?.30:.33),portrait?.56:.56);
  // Group nearby small strokes to preserve performance as complexity grows.
  for(let i=0;i<11;i+=3){
    const sparkPath=Array.from({length:Math.min(3,11-i)},(_,k)=>{
      const n=i+k,sx=W*(.08+((n*23)%83)/100);
      const sy=H*(portrait?.11:.19)+((n*17)%41);
      return `M${sx-3} ${sy}h6M${sx} ${sy-3}v6`;
    }).join(" ");
    line("sky-wax-spark-"+i,sparkPath,
      i%2?"#d8bda2":"#acb8b1",1.5,
      {timing:{start:18+i,end:89+i},opacity:.26});
  }
  wax("hills",`M0 ${H*.75}Q${W*.2} ${H*.60} ${W*.45} ${H*.77}Q${W*.74} ${H*.59} ${W} ${H*.75}V${H}H0Z`,
    {x:0,y:H*.56,width:W,height:H*.44},
    ["#b3c5b1","#94ad9d","#dce1bf"],
    {construction:undefined,timing:{start:8,end:62},spacing:17,pressure:.35});
  // Each cottage has separately drawn clay roof, masonry, wood door and leaded glass.
  const cottage=(id:string,x:number,y:number,s:number,style:"gable"|"turret")=>{
    const p={x,y,scale:s};
    wax(id+"-facade",style==="gable"?
      "M-80 -90L-80 54H80V-90L0 -148Z":
      "M-79 -142H79V54H-79Z",
      {x:-84,y:-150,width:168,height:208},shade,
      {placement:p,timing:{start:13,end:97},spacing:8});
    const parentId=id+"-facade";
    wax(id+"-roof",style==="gable"?
      "M-101 -86L0 -168L101 -86L81 -78L0 -142L-82 -78Z":
      "M-100 -142L0 -215L99 -142L78 -132L0 -184L-78 -132Z",
      {x:-105,y:-220,width:212,height:151},roof,
      {parentId,timing:{start:16,end:87}});
    line(id+"-hand-laid-roof-tiles",
      crayonRoofCourses({apexX:0,apexY:style==="gable"?-168:-215,
        halfWidth:style==="gable"?101:99,height:style==="gable"?82:73,
        rows:Math.round(4+detail*4),seed:style==="gable"?109:137}),
      "#d9c6bd",1.6,{parentId:id+"-roof",opacity:.68,timing:{start:94,end:158}});
    wax(id+"-door","M-23 55V-6Q0 -39 23 -6V55Z",
      {x:-26,y:-42,width:52,height:99},timber,
      {parentId,timing:{start:45,end:119},spacing:5});
    for(const [side,v] of [["l",-49],["r",49]] as const){
      wax(id+"-window-"+side,`M${v-15} -63Q${v} -88 ${v+15} -63V-29H${v-15}Z`,
        {x:v-17,y:-91,width:34,height:67},glass,
        {parentId,timing:{start:42,end:124},spacing:4.6});
      line(id+"-windowbars-"+side,`M${v} -81V-29M${v-14} -55H${v+14}`,
        "#6f7484",2.5,{parentId,timing:{start:77,end:139}});
    }
    const mortar=crayonMasonryCourses({x:-76,y:-12,
      rows:Math.round(2+detail*4),columns:1,courseWidth:42,courseHeight:13,seed:84})+" "+
      crayonMasonryCourses({x:38,y:-12,
        rows:Math.round(2+detail*4),columns:1,courseWidth:38,courseHeight:13,seed:86});
    line(id+"-cut-stone-courses",mortar,"#8b7b86",1.45,
      {parentId,opacity:.52,timing:{start:75,end:153}});
    line(id+"-door-rivets",
      "M-13 7h2M13 7h2M-13 26h2M13 26h2M-13 43h2M13 43h2",
      "#eac095",2.1,{parentId,opacity:.70,timing:{start:99,end:163}});
  };
  cottage("western-shop",W*(portrait?.19:.14),H*(portrait?.60:.84),portrait?.42:.60,"gable");
  cottage("eastern-shop",W*(portrait?.83:.89),H*(portrait?.61:.84),portrait?.45:.53,"turret");
  const tx=W*(portrait?.54:.52),ty=H*(portrait?.49:.85);
  const tscale=portrait?.91:.81, tower="castle-main";
  // Multi-level observatory facade with genuine multi-part silhouette.
  wax(tower,"M-127 -151H-89V-213H-40V-181H38V-236H88V-160H129V55H-127Z",
    {x:-134,y:-244,width:269,height:304},stone,
    {placement:{x:tx,y:ty,scale:tscale},timing:{start:18,end:102}});
  wax("castle-left-pier","M-145 -151H-81V55H-145Z",
    {x:-149,y:-157,width:72,height:216},shade,{parentId:tower,timing:{start:22,end:107}});
  wax("castle-right-pier","M77 -157H145V55H77Z",
    {x:73,y:-161,width:77,height:221},shade,{parentId:tower,timing:{start:24,end:109}});
  wax("castle-center-roof","M-67 -183L0 -267L67 -183L53 -166H-54Z",
    {x:-73,y:-275,width:148,height:114},roof,{parentId:tower,timing:{start:8,end:87}});
  line("castle-center-roof-tiles",
    crayonRoofCourses({apexX:0,apexY:-267,halfWidth:63,height:82,
      rows:Math.round(5+detail*5),seed:531}),
    "#d8d2db",1.7,{parentId:"castle-center-roof",opacity:.7,timing:{start:91,end:166}});
  for(const [side,x] of [["left",-112],["right",112]] as const){
    wax("castle-"+side+"-spire",`M${x-43} -149L${x} -258L${x+43} -149Z`,
      {x:x-48,y:-261,width:96,height:116},roof,
      {parentId:tower,timing:{start:9,end:96},spacing:5});
    line("castle-"+side+"-hand-laid-tiles",
      crayonRoofCourses({apexX:x,apexY:-258,halfWidth:42,height:106,
        rows:Math.round(5+detail*4),seed:side==="left"?401:402}),
      "#d2c4c7",1.65,{parentId:"castle-"+side+"-spire",
        opacity:.67,timing:{start:96,end:162}});
    wax("castle-"+side+"-glass",
      `M${x-17} -117Q${x} -151 ${x+17} -117V-62H${x-17}Z`,
      {x:x-19,y:-155,width:38,height:96},glass,
      {parentId:tower,timing:{start:43,end:127},spacing:4});
    line("castle-"+side+"-mullions",
      `M${x} -137V-61M${x-17} -97H${x+17}`,
      "#5d6b7d",2.7,{parentId:tower,timing:{start:74,end:144}});
    line("castle-"+side+"-lancet-quatrefoil",
      "M"+(x-13)+" -112Q"+x+" -139 "+(x+13)+" -112"+
        "M"+(x-8)+" -117Q"+x+" -127 "+(x+8)+" -117"+
        "M"+(x-16)+" -76Q"+x+" -69 "+(x+16)+" -76",
      "#d2c7ba",1.9,{parentId:tower,opacity:.77,timing:{start:108,end:188}});
    line("castle-"+side+"-cap",`M${x-31} -150H${x+31}`,
      "#e7d4c3",3,{parentId:tower,timing:{start:72,end:135}});
  }
  wax("castle-arch-door","M-43 55V-17Q-43 -82 0 -83Q43 -82 43 -17V55Z",
    {x:-48,y:-87,width:96,height:144},timber,
    {parentId:tower,timing:{start:58,end:148},spacing:5});
  line("castle-door-stone","M-50 55V-20Q-50 -91 0 -94Q51 -91 51 -20V55",
    "#7b7787",4,{parentId:tower,timing:{start:76,end:151}});
  const voussoirs:string[]=[];
  for(let i=0;i<=10;i++){
    const a=Math.PI-(i/10)*Math.PI;
    const x=Math.cos(a)*48,y=-20-Math.sin(a)*69;
    const xo=Math.cos(a)*58,yo=-20-Math.sin(a)*78;
    voussoirs.push("M"+x.toFixed(1)+" "+y.toFixed(1)+
      "L"+xo.toFixed(1)+" "+yo.toFixed(1));
  }
  line("castle-carved-voussoir-arch",voussoirs.join(" "),
    "#9d8990",2.15,{parentId:tower,opacity:.72,timing:{start:104,end:189}});
  line("castle-keystone","M-9 -89L0 -103L9 -89L0 -81Z",
    "#c2a18a",2.25,{parentId:tower,timing:{start:116,end:193}});
  line("castle-door-planks","M0 -66V53M-27 0H26M-26 31H27",
    "#d3aa84",2.8,{parentId:tower,timing:{start:91,end:169}});
  wax("castle-clock",egg(0,-124,31,31),
    {x:-34,y:-158,width:68,height:68},paper,
    {parentId:tower,timing:{start:47,end:129},spacing:5});
  line("castle-clock-rim",egg(0,-124,32,32),
    "#667087",4,{parentId:tower,timing:{start:77,end:148}});
  const clockTicks:string[]=[];
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2-Math.PI/2;
    clockTicks.push("M"+(Math.cos(a)*23).toFixed(1)+" "+(-124+Math.sin(a)*23).toFixed(1)+
      "L"+(Math.cos(a)*27).toFixed(1)+" "+(-124+Math.sin(a)*27).toFixed(1));
  }
  line("castle-clock-engraved-ticks",clockTicks.join(" "),
    "#84778b",1.9,{parentId:tower,timing:{start:107,end:169},opacity:.76});
  line("castle-clock-hands","M0 -124V-144M0 -124L14 -114",
    "#5b5e77",3.4,{parentId:tower,timing:{start:86,end:154}});
  // Rosette arches and the lit entry add an architectural "lived in" layer.
  for(const [side,x] of [["left",-1],["right",1]] as const){
    const at=x*62;
    wax("castle-door-lamp-"+side,egg(at,-43,8,12),
      {x:at-10,y:-57,width:20,height:30},gold,
      {parentId:tower,timing:{start:88,end:173},spacing:4.3,pressure:.78});
    line("castle-lamp-bracket-"+side,
      `M${at-x*9} -43H${at}v13`,
      "#816775",2.4,{parentId:tower,timing:{start:111,end:184}});
    line("castle-lamp-rays-"+side,
      `M${at-x*17} -44h${x*5}M${at} -59v-5`,
      "#edc58c",1.7,{parentId:tower,timing:{start:137,end:196},opacity:.57});
  }
  for(let i=0;i<12;i+=3){
    const shinglePaths=Array.from({length:3},(_,k)=>{
      const n=i+k,x=-48+(n%4)*29,y=-191+Math.floor(n/4)*10;
      return `M${x} ${y}q9 3 17 0`;
    }).join(" ");
    line("castle-roof-shingle-"+i,shinglePaths,
      "#c6c0c5",1.6,{parentId:tower,timing:{start:103+i,end:168+i},opacity:.52});
  }
  wax("castle-terrace","M-81 -35H83V-17H-81Z",
    {x:-85,y:-40,width:172,height:28},shade,
    {parentId:tower,timing:{start:62,end:139}});
  for(let i=0;i<Math.round(4+detail*7);i++){
    const x=-78+i*14;
    line("castle-railing-"+i,`M${x} -32V-5M${x-3} -9H${x+4}`,
      "#887d86",2.3,{parentId:tower,timing:{start:72,end:155}});
  }
  const masonryCount=Math.round(12+detail*24);
  for(let i=0;i<masonryCount;i+=4){
    const marks:string[]=[];
    for(let k=i;k<Math.min(i+4,masonryCount);k++){
      const x=-117+(k%7)*34+(Math.floor(k/7)%2)*8;
      const y=-154+Math.floor(k/7)*24;
      if(Math.abs(x)<58 && y>-92)continue;
      marks.push(`M${x} ${y}h${15+(k%3)*3}`);
    }
    if(marks.length)line("castle-masonry-"+i,marks.join(" "),
      "#9b8786",1.6,{parentId:tower,opacity:.36,timing:{start:73,end:162}});
  }
  for(const side of [-1,1] as const){
    const x=side===-1?-138:79;
    line("castle-"+(side===-1?"west":"east")+"-fine-mortar",
      crayonMasonryCourses({x,y:-138,rows:Math.round(7+detail*5),
        columns:2,courseWidth:26,courseHeight:15,seed:side===-1?338:339}),
      "#8c8390",1.3,{parentId:tower,opacity:.33,timing:{start:120,end:191}});
  }
  line("castle-roof-engrave","M-45 -188L0 -249L46 -188M-26 -190L0 -228L26 -190",
    "#c3c4d1",2.3,{parentId:tower,timing:{start:72,end:157}});
  line("castle-cobble-path",
    `M${W*.33} ${H*.99}Q${W*.46} ${H*.87} ${W*.50} ${H*.88}Q${W*.59} ${H*.93} ${W*.67} ${H*.99}`,
    "#bfa58f",3,{opacity:.40,timing:{start:72,end:149}});

  // Dragon: multilink tail, independent wings, chest, four legs, neck,
  // facial rig and antler-like horns. Far-side parts are painted first.
  const dx=W*(portrait?.585:.725),dy=H*(portrait?.76:.76);
  const ds=portrait?.87:.89,root="dragon-body";
  const wing=(front:boolean):readonly CrayonMotionKey[]=>[
    move(0,-4),move(92,-4),
    move(138,front?14*wingPower:-12*wingPower,0,-5,1.09, .94),
    move(176,front?-18*wingPower:14*wingPower,0,2,.96,1.14),
    move(220,front?11*wingPower:-14*wingPower,0,-3,1.06,.95),
    move(269,front?-11*wingPower:9*wingPower,0,0,.97,1.08),
    move(329,-4)];
  const tail=(a:number,b:number):readonly CrayonMotionKey[]=>[
    move(0,-10),move(114,-10),move(165,a),move(224,b),move(281,a*.6),move(329,-10)];
  wax("dragon-tail-base",
    "M-56 24Q-103 44 -133 14Q-145 -3 -153 -27Q-116 -14 -72 -17L-45 -3Z",
    {x:-160,y:-34,width:121,height:83},dragon.dark,
    {parentId:root,pivot:{x:-59,y:16},motion:tail(15,-12),
      motionLagFrames:followThrough,timing:{start:49,end:142}});
  wax("dragon-tail-mid",
    "M-125 -12Q-167 -32 -186 -61Q-201 -88 -207 -105Q-179 -76 -151 -65L-110 -36Z",
    {x:-214,y:-110,width:111,height:101},dragon.skin,
    {parentId:"dragon-tail-base",pivot:{x:-124,y:-25},
      motion:tail(-20,22),motionLagFrames:Math.min(24,followThrough+5),
      timing:{start:56,end:151}});
  wax("dragon-tail-tip",
    "M-194 -86L-228 -139Q-235 -148 -247 -145L-235 -111L-211 -77Z",
    {x:-253,y:-152,width:64,height:79},gold,
    {parentId:"dragon-tail-mid",pivot:{x:-196,y:-85},
      motion:tail(21,-16),motionLagFrames:Math.min(24,followThrough+9),
      timing:{start:63,end:160},spacing:5});
  line("dragon-tail-scutes",
    crayonScaleField({x:-187,y:-77,rows:3,columns:3,
      stepX:13,stepY:12,width:10,depth:4,seed:68,taper:2.5}),
    "#567486",1.9,{parentId:"dragon-tail-mid",opacity:.56,
      timing:{start:132,end:205}});
  line("dragon-tail-engrave","M-209 -111L-218 -118M-214 -102L-227 -111",
    "#d9b17f",2.25,{parentId:"dragon-tail-tip",opacity:.76,
      timing:{start:148,end:205}});
  wax("dragon-wing-far",
    "M-47 -16Q-89 -153 -159 -192Q-137 -175 -118 -153Q-99 -164 -81 -126Q-58 -141 -54 -91L-40 -34Z",
    {x:-163,y:-198,width:130,height:192},dragon.wing,
    {parentId:root,pivot:{x:-43,y:-17},motion:wing(false),
      motionLagFrames:Math.min(24,followThrough+3),
      timing:{start:50,end:151},spacing:6});
  line("dragon-wing-far-ribs","M-43 -23Q-87 -139 -158 -191M-85 -109L-118 -152M-65 -77L-81 -125",
    "#667b8a",3,{parentId:"dragon-wing-far",timing:{start:92,end:174}});
  line("dragon-wing-far-laced-membrane",
    "M-141 -175Q-114 -154 -99 -143M-127 -153Q-104 -128 -88 -120"+
    "M-111 -132Q-94 -108 -72 -101M-98 -107Q-81 -87 -64 -76"+
    "M-82 -74Q-65 -63 -54 -52",
    "#576d85",1.55,{parentId:"dragon-wing-far",opacity:.55,
      timing:{start:113,end:202}});
  wax("dragon-wing-near",
    "M-14 -24Q-23 -167 49 -218Q42 -181 76 -168Q39 -158 36 -123Q3 -137 -1 -87L-15 -38Z",
    {x:-26,y:-224,width:108,height:206},dragon.wing,
    {parentId:root,pivot:{x:-14,y:-24},motion:wing(true),
      motionLagFrames:followThrough,timing:{start:53,end:155},spacing:6});
  line("dragon-wing-near-ribs","M-14 -27Q-1 -159 49 -216M-10 -85Q14 -145 75 -168M-10 -88L36 -124",
    "#647989",3.2,{parentId:"dragon-wing-near",timing:{start:91,end:177}});
  line("dragon-wing-near-membrane-veins",
    "M-4 -177Q9 -153 13 -125M18 -182Q22 -151 26 -137"+
    "M39 -170Q27 -142 31 -117M-5 -132Q3 -115 -1 -91"+
    "M-6 -106Q-11 -78 -13 -58",
    "#576b80",1.9,{parentId:"dragon-wing-near",opacity:.72,
      timing:{start:120,end:218}});
  line("dragon-wing-near-crosswax",
    "M-11 -112l13 10M-9 -97l12 8M-4 -154l17 9"+
    "M16 -145l17 7M24 -170l12 8M40 -154l13 9",
    "#eee0c7",1.5,{parentId:"dragon-wing-near",opacity:.42,
      timing:{start:142,end:226}});
  wax(root,
    "M-75 -9Q-69 -55 -13 -60Q45 -63 73 -10Q89 35 44 61Q2 81 -46 53Q-82 37 -75 -9Z",
    {x:-88,y:-66,width:181,height:154},dragon.skin,
    {placement:{x:dx,y:dy,scale:ds},pivot:{x:0,y:10},
      motion:[move(0,0,-17),move(65,0,-17),move(98,-2,-4,-12,.97,1.04),
        move(140,2,0,3,1.07,.95),move(187,-2,0,0,.98,1.04),
        move(230,3,0,7,1.08,.94),move(277,0),move(329,0)],
      timing:{start:40,end:145},spacing:6});
  // Instead of flat teal torso fill, hand-engraved interlocking scutes
  // follow the ribcage. Two levels of pigment read as anatomy, not noise.
  line("dragon-flank-scale-field",
    crayonScaleField({x:-59,y:-34,rows:Math.round(3+detail*3),columns:Math.round(4+detail*4),
      stepX:14,stepY:14,width:10,depth:5.8,seed:417,taper:1}),
    "#3f6273",1.9,{parentId:root,opacity:.58,
      timing:{start:128,end:238}});
  line("dragon-flank-highlight-scales",
    crayonScaleField({x:-52,y:-30,rows:Math.round(2+detail*3),columns:Math.round(3+detail*4),
      stepX:14,stepY:14,width:7,depth:3,seed:914,taper:1}),
    "#d6d3b9",1.25,{parentId:root,opacity:.43,
      timing:{start:153,end:254}});
  line("dragon-shoulder-and-haunch-muscles",
    "M29 -36Q58 -25 62 5M37 -16Q57 4 48 27"+
    "M-53 -15Q-70 10 -49 31M-34 -37Q-11 -50 6 -43"+
    "M17 48Q29 54 44 46",
    "#315e6f",2.7,{parentId:root,opacity:.56,
      timing:{start:151,end:231}});
  for(const [side,x,far] of [
    ["back-far",-49,true],["front-far",48,true],
    ["back-near",-30,false],["front-near",61,false],
  ] as const){
    const y=far?24:32;
    wax("dragon-leg-"+side,
      `M${x-14} ${y}Q${x-25} 64 ${x-16} 87L${x+13} 90Q${x+21} 77 ${x+8} 59L${x+12} ${y}Z`,
      {x:x-29,y:y-4,width:59,height:102},far?dragon.dark:dragon.skin,
      {parentId:root,pivot:{x,y},motion:[move(0),move(92),
        move(129,far?14:-12),move(167,far?-11:12),move(218,far?13:-12),
        move(267),move(329)],
        motionLagFrames:far?Math.min(24,followThrough+4):0,
        timing:{start:67,end:175},spacing:5});
    line("dragon-claws-"+side,`M${x-19} 84l-4 10M${x-6} 90l-3 8M${x+7} 90l2 7`,
      "#f3d4a1",2.4,{parentId:"dragon-leg-"+side,timing:{start:117,end:181}});
    line("dragon-leg-folds-"+side,
      "M"+(x-17)+" "+(y+29)+"q12 7 24 -1"+
      "M"+(x-18)+" "+(y+45)+"q10 7 22 0",
      far?"#a3aab2":"#42777c",1.7,{parentId:"dragon-leg-"+side,
        opacity:.54,timing:{start:143,end:225}});
  }
  wax("dragon-belly","M-13 -22Q33 -30 62 4Q69 40 43 54Q10 65 -9 46Q15 17 -13 -22Z",
    {x:-21,y:-34,width:97,height:102},gold,
    {parentId:root,timing:{start:88,end:180},pressure:.58,spacing:5});
  for(let i=0;i<Math.round(8+detail*7);i++){
    const x=-57+i*9,y=-47+Math.sin(i*.42)*9;
    wax("dragon-spine-"+i,
      `M${x-7} ${y+13}L${x} ${y-6-(i%3)*3}L${x+10} ${y+11}Z`,
      {x:x-9,y:y-23,width:22,height:38},dragon.dark,
      {parentId:root,timing:{start:90+i*2,end:170+i*2},spacing:4.2});
  }
  const bellyScutes=Array.from({length:12},(_,i)=>{
    const x=-3+i*5.8,y=3+i*4.4;
    return "M"+(x-7).toFixed(1)+" "+y.toFixed(1)+
      "q7 9 16 1";
  }).join(" ");
  line("dragon-belly-scutes",bellyScutes,
    "#9e725b",2.15,{parentId:root,opacity:.66,timing:{start:127,end:232}});
  line("dragon-belly-wax-reflections",
    "M20 -16Q40 -4 46 8M14 3Q32 23 40 30M4 22Q14 42 28 45",
    "#fff1ce",1.7,{parentId:root,opacity:.57,timing:{start:168,end:246}});
  wax("dragon-neck","M35 -14Q43 -75 91 -84L115 -54Q84 -42 69 10Z",
    {x:27,y:-92,width:94,height:109},dragon.skin,
    {parentId:root,pivot:{x:47,y:-16},motion:[
      move(0,-3),move(121,-3),move(174,-13),move(220,11),move(276,-4),move(329,-3)],
      motionLagFrames:followThrough,timing:{start:72,end:170}});
  line("dragon-neck-overlapping-scutes",
    crayonScaleField({x:48,y:-66,rows:4,columns:3,
      stepX:11,stepY:13,width:8,depth:4.5,seed:604,taper:3.1}),
    "#2f6775",1.95,{parentId:"dragon-neck",opacity:.56,timing:{start:143,end:222}});
  line("dragon-neck-belly-folds",
    "M62 -12Q80 -27 84 -51M55 -21Q73 -35 78 -56M53 -33Q65 -49 68 -62",
    "#f0c9a4",2.3,{parentId:"dragon-neck",opacity:.73,timing:{start:161,end:231}});
  wax("dragon-head",
    "M76 -75Q76 -110 113 -114Q152 -122 168 -99L192 -91Q205 -78 195 -61Q176 -40 145 -50Q108 -31 87 -48Z",
    {x:70,y:-128,width:139,height:105},dragon.skin,
    {parentId:"dragon-neck",pivot:{x:94,y:-68},motion:[
      move(0),move(135),move(189,-12),move(230,9),move(284,-6),move(329)],
      motionLagFrames:Math.min(24,followThrough+4),
      timing:{start:80,end:182}});
  line("dragon-cheek-small-scutes",
    crayonScaleField({x:109,y:-86,rows:3,columns:4,
      stepX:11,stepY:10,width:7,depth:4.5,seed:724,taper:2}),
    "#417784",1.7,{parentId:"dragon-head",opacity:.55,timing:{start:164,end:238}});
  line("dragon-muzzle-volume",
    "M167 -96Q191 -105 195 -86M160 -51Q179 -47 190 -59"+
    "M109 -54Q124 -47 137 -50",
    "#e2c59e",2.5,{parentId:"dragon-head",opacity:.72,
      timing:{start:169,end:249}});
  wax("dragon-jaw",
    "M128 -56Q159 -38 197 -60Q191 -39 175 -30Q148 -28 128 -41Z",
    {x:124,y:-65,width:80,height:47},gold,
    {parentId:"dragon-head",pivot:{x:137,y:-55},motion:[
      move(0),move(174),move(203,14),move(231,2),move(262,11),move(298),move(329)],
      motionLagFrames:3,timing:{start:112,end:199}});
  wax("dragon-horn-left","M99 -103Q90 -138 65 -145Q90 -149 107 -132L118 -104Z",
    {x:61,y:-151,width:61,height:51},gold,
    {parentId:"dragon-head",timing:{start:95,end:182},spacing:5});
  wax("dragon-horn-right","M140 -107Q148 -141 176 -153Q169 -121 160 -93Z",
    {x:135,y:-158,width:45,height:68},gold,
    {parentId:"dragon-head",timing:{start:100,end:186},spacing:4.9});
  line("dragon-horn-growth-rings",
    "M86 -135l11 5M92 -128l12 6M150 -130l12 3M148 -119l14 4",
    "#a6806d",1.75,{parentId:"dragon-head",opacity:.67,timing:{start:136,end:222}});
  wax("dragon-eye",egg(151,-86,9,7),
    {x:139,y:-96,width:24,height:20},dragon.dark,
    {parentId:"dragon-head",timing:{start:121,end:204},spacing:4});
  line("dragon-eye-catchlight","M149 -88q3 -3 5 0",
    "#fdf2d2",2.8,{parentId:"dragon-head",opacity:.9,timing:{start:165,end:219}});
  line("dragon-eyelid","M137 -92Q151 -102 163 -91",
    "#48566c",3.5,{parentId:"dragon-head",timing:{start:133,end:204},
      poses:[{id:"blink",d:"M138 -87Q150 -81 162 -88"},
        {id:"smile",d:"M137 -92Q151 -105 163 -90"}],
      poseCues:[{frame:0,pose:"base"},{frame:207,pose:"blink"},
        {frame:212,pose:"base"},{frame:278,pose:"smile"}]});
  line("dragon-nostril","M183 -75q4 -5 7 0",
    "#46556b",3,{parentId:"dragon-head",timing:{start:142,end:208}});
  for(const [side,n] of [["high",-1],["low",1]] as const){
    line("dragon-whisker-"+side,
      `M163 -58Q${205+n*10} ${-65+n*12} ${229+n*10} ${-96+n*24}`,
      "#ab8682",2.4,{parentId:"dragon-head",pivot:{x:163,y:-57},
        motion:[move(0),move(170),move(221,n*13),move(280,-n*10),move(329)],
        motionLagFrames:Math.min(24,followThrough+8),
        timing:{start:138,end:225}});
  }
  line("dragon-mouth","M158 -49Q180 -38 196 -60",
    "#775969",3.5,{parentId:"dragon-head",timing:{start:140,end:211}});
  for(let i=0;i<5;i++)line("dragon-tooth-"+i,
    `M${153+i*8} -43l3 6`,"#fff0d2",2,
    {parentId:"dragon-jaw",timing:{start:149+i*2,end:228+i*2}});
  for(let i=0;i<7;i++){
    const x=dx+ds*(203+i*11),y=dy+ds*(-79+(i%3)*8);
    line("dragon-magic-"+i,`M${x-3} ${y}h6M${x} ${y-3}v6`,
      i%2?"#efc17f":"#e6a798",2.6,{timing:{start:181+i*3,end:243+i*2},opacity:.64});
  }

  // A second expressive animal reuses existing source art but has a new
  // rig identity, independent parent hierarchy, placement, expressions and keys.
  const friend=crayonPerformanceScene(aspect);
  const included=new Set(["tail","left-ear","right-ear","left-ear-inner","right-ear-inner",
    "back-arm","body","foot-back","foot-front","belly","scarf-wrap",
    "scarf-tail","scarf-weave","head","muzzle","left-eye","right-eye",
    "freckles-left","freckles-right","nose","mouth","front-arm"]);
  const fx=W*(portrait?.23:.20),fy=H*(portrait?.835:.83),fs=portrait?.62:.68;
  for(const node of friend.elements){
    if(!included.has(node.id))continue;
    const id="friend-"+node.id;
    const parentId=node.parentId?"friend-"+node.parentId:undefined;
    const timing={start:66,end:Math.min(210,node.timing.end+65)};
    if(node.kind==="wax"){
      const motion:readonly CrayonMotionKey[]|undefined=node.id==="body"?[
        move(0,0,-16,0),move(72,0,-16,0),move(112,-5,-3,-6,.96,1.05),
        move(153,3,2,1,1.07,.95),move(195,-3),move(235,6,4,-9),
        move(279,-5,0,0,.95,1.06),move(329)]:
        node.id==="head"?[move(0),move(157),move(202,10),move(240,-11),move(293,8),move(329)]:
        node.id==="tail"?[move(0,-12),move(149,-12),move(192,18),move(242,-19),move(291,15),move(329)]:
        node.id==="front-arm"?[move(0,-9),move(166,-9),move(211,-37),
          move(244,-15),move(280,-48),move(329,-9)]:
        node.id==="back-arm"?[move(0,4),move(167,4),move(216,27),move(275,-10),move(329,4)]:
        node.motion?[move(0),move(172),move(225,4),move(285,-4),move(329)]:undefined;
      wax(id,node.d,node.bounds,node.colors,{
        ...node,id,parentId,timing,construction:build,
        placement:node.id==="body"?{x:fx,y:fy,scale:fs}:node.placement,
        ...(motion?{motion,motionLagFrames:node.id==="tail"?
          Math.min(24,followThrough+6):node.id==="head"?followThrough:0}:{}),
      });
    }else if(node.kind==="contour"){
      const cues=node.id==="mouth"?[
        {frame:0,pose:"base"},{frame:191,pose:"oh"},
        {frame:211,pose:"base"},{frame:258,pose:"smile"}]:
        node.id==="left-eye"||node.id==="right-eye"?[
          {frame:0,pose:"base"},{frame:199,pose:"blink"},
          {frame:204,pose:"base"},{frame:269,pose:"smile"}]:undefined;
      line(id,node.d,node.color,node.width,{
        ...node,id,parentId,timing,...(cues?{poseCues:cues}:{})});
    }
  }

  // Third character has distinct owl anatomy: ears, circular facial disk,
  // asymmetrically timed wings, breast feathers, toes and blink performance.
  if(cast==="trio"){
    const ox=W*(portrait?.22:.39),oy=H*(portrait?.575:.60),os=.57,owl="owl-body";
    wax("owl-tail","M-28 21Q-66 53 -43 72L-13 43Z",
      {x:-67,y:18,width:58,height:59},dragon.dark,
      {parentId:owl,pivot:{x:-28,y:22},
        motion:[move(0,-7),move(172,-7),move(216,19),move(285,-14),move(329)],
        motionLagFrames:Math.min(24,followThrough+7),
        timing:{start:87,end:164}});
    wax("owl-wing-far","M-35 -7Q-91 -49 -92 21Q-68 52 -39 27Z",
      {x:-96,y:-54,width:68,height:109},roof,
      {parentId:owl,pivot:{x:-34,y:-8},
        motion:[move(0),move(162),move(198,-49),move(230,10),move(272,-33),move(329)],
        motionLagFrames:followThrough,timing:{start:83,end:173}});
    wax(owl,"M-46 -31Q-57 -80 -3 -87Q52 -83 52 -22Q63 37 0 58Q-64 46 -46 -31Z",
      {x:-64,y:-94,width:129,height:159},timber,
      {placement:{x:ox,y:oy,scale:os},pivot:{x:0,y:-22},
        motion:[move(0),move(160),move(197,7,0,-8,.97,1.08),
          move(237,-7,0,0,1.07,.95),move(289,4),move(329)],
        timing:{start:79,end:167}});
    wax("owl-wing-near","M39 -8Q94 -50 97 18Q69 52 39 26Z",
      {x:35,y:-54,width:67,height:110},roof,
      {parentId:owl,pivot:{x:39,y:-8},
        motion:[move(0),move(164),move(204,47),move(240,-9),
          move(278,33),move(329)],
        motionLagFrames:Math.min(24,followThrough+4),
        timing:{start:86,end:173}});
    wax("owl-breast",egg(0,6,32,42),
      {x:-36,y:-39,width:72,height:91},paper,
      {parentId:owl,timing:{start:103,end:186},spacing:5});
    wax("owl-head",egg(0,-65,51,47),
      {x:-54,y:-116,width:109,height:99},timber,
      {parentId:owl,pivot:{x:0,y:-49},
        motion:[move(0),move(160),move(198,12),move(246,-12),move(289,9),move(329)],
        motionLagFrames:followThrough,timing:{start:81,end:173}});
    line("owl-forehead-feather-vines",
      "M-40 -94Q-26 -113 -14 -98M-13 -101Q0 -118 14 -100"+
      "M15 -99Q26 -112 41 -92M-40 -49Q-34 -36 -20 -29"+
      "M39 -49Q34 -35 20 -29",
      "#d5bca1",2.1,{parentId:"owl-head",opacity:.68,timing:{start:136,end:216}});
    line("owl-wing-far-feather-groups",
      "M-78 -27Q-70 -9 -54 4M-86 -7Q-71 10 -52 17"+
      "M-81 12Q-62 23 -44 27",
      "#d1c1b6",2.4,{parentId:"owl-wing-far",opacity:.61,timing:{start:138,end:219}});
    line("owl-wing-near-feather-groups",
      "M54 -26Q78 -14 83 4M56 -4Q71 13 87 16"+
      "M51 13Q65 26 79 29",
      "#e6d5ba",2.4,{parentId:"owl-wing-near",opacity:.63,timing:{start:140,end:221}});
    for(const [side,sign] of [["left",-1],["right",1]] as const){
      const x=sign*23;
      wax("owl-ear-"+side,
        sign===-1?"M-47 -93L-65 -131L-19 -108Z":"M18 -110L64 -134L47 -91Z",
        {x:sign===-1?-68:15,y:-137,width:53,height:50},timber,
        {parentId:"owl-head",timing:{start:95,end:175},spacing:5});
      wax("owl-face-"+side,egg(x,-71,21,24),
        {x:x-24,y:-98,width:48,height:55},paper,
        {parentId:"owl-head",timing:{start:111,end:191},spacing:4});
      wax("owl-pupil-"+side,egg(x-sign*2,-66,7,10),
        {x:x-13,y:-81,width:27,height:28},dragon.dark,
        {parentId:"owl-head",timing:{start:141,end:207},spacing:4});
      line("owl-eye-glint-"+side,
        "M"+(x-sign*2-1)+" -70l2 -2",
        "#fff6e6",2.9,{parentId:"owl-head",opacity:.92,timing:{start:166,end:229}});
      line("owl-lid-"+side,`M${x-17} -85Q${x} -95 ${x+17} -85`,
        "#675e71",3.2,{parentId:"owl-head",timing:{start:133,end:211},
          poses:[{id:"blink",d:`M${x-17} -66Q${x} -60 ${x+17} -66`},
            {id:"smile",d:`M${x-17} -87Q${x} -101 ${x+17} -87`}],
          poseCues:[{frame:0,pose:"base"},{frame:207,pose:"blink"},
            {frame:213,pose:"base"},{frame:284,pose:"smile"}]});
      wax("owl-foot-"+side,
        `M${x-8} 40L${x+8} 40L${x+11} 73L${x-12} 73Z`,
        {x:x-15,y:38,width:30,height:37},gold,
        {parentId:owl,timing:{start:143,end:217},spacing:4});
      line("owl-talons-"+side,`M${x-11} 70l-6 8M${x} 71l-1 8M${x+9} 70l5 8`,
        "#806f75",2,{parentId:owl,timing:{start:158,end:219}});
    }
    wax("owl-beak","M-10 -57L0 -35L12 -57Q0 -64 -10 -57Z",
      {x:-13,y:-67,width:28,height:36},gold,
      {parentId:"owl-head",timing:{start:144,end:205}});
    const breastFeathers=Array.from({length:18},(_,i)=>{
      const row=Math.floor(i/6),col=i%6;
      const x=-27+col*10+(row%2)*4,y=-9+row*17;
      return "M"+x+" "+y+"q4 10 0 18";
    }).join(" ");
    line("owl-layered-breast-feathers",breastFeathers,
      "#b89c91",1.8,{parentId:"owl-breast",opacity:.65,
        timing:{start:148,end:241}});
    line("owl-tail-feather-partings",
      "M-38 34Q-48 50 -47 60M-31 37Q-36 51 -37 66",
      "#d2ac94",2,{parentId:"owl-tail",opacity:.68,
        timing:{start:145,end:225}});
  }
  // Landscape and portrait have independent editorial composition.
  elements.push({kind:"lettering",id:"dragon-village-title",screenSpace:true,
    lines:portrait?["DRAGON","& THE VILLAGE"]:["DRAGON & THE VILLAGE"],
    x:portrait?28:43,y:portrait?80:62,fontSize:portrait?43:46,
    lineHeight:1.06,timing:{start:0,end:25},weight:700,family:"serif",
    color:"#516179"});
  elements.push({kind:"lettering",id:"dragon-village-subtitle",screenSpace:true,
    lines:[cast==="trio"?"THREE LITTLE LIVES  /  ONE CRAYON WORLD":"TWO LITTLE LIVES  /  ONE CRAYON WORLD"],
    x:portrait?29:45,y:portrait?174:93,fontSize:portrait?12:15,
    timing:{start:18,end:69},family:"sans",weight:700,color:"#847584"});
  elements.push({kind:"lettering",id:"dragon-village-caption",screenSpace:true,
    lines:["ORIGINAL WAX ART  /  FRAME BY FRAME"],
    x:portrait?30:44,y:portrait?H-30:131,fontSize:portrait?12:14,
    timing:{start:183,end:283},family:"serif",weight:700,color:"#697783"});
  return {version:1,id:"crayon-dragon-village-"+aspect,
    width:W,height:H,durationFrames:D,
    paper:"#f7f0e2",paperTooth:.69,seed:7264,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:170,focusX:W/2,focusY:H/2+4,zoom:1.017},
      {frame:329,focusX:W/2,focusY:H/2,zoom:1}]};
}
