import type {PaintStroke,PaintSurfaceSpec} from "../../../registry/video/watercolour-brush";
import type {WetPaperSpec} from "../../../registry/video/watercolour-wet-paper";

/**
 * WC19: experimental original watercolor eye painting, based on a locally
 * inspected user-owned reference crop (never bundled or used as a bitmap).
 *
 * ALL visible marks are deposited by the real WM1 watercolor brush, including
 * the eyeball, iris, brow, lashes, skin and hair. WM4 handles underpainting,
 * flow and pigment settling. No SVG circles, filled geometry, gradients,
 * bitmap backdrops or postproduction watercolor filters.
 *
 * This is an eye-only construction study, not an approved face or a new
 * public Storybook character. Keep it experimental until native renders pass
 * artist review and a complete anatomical head is constructed.
 */
type Knot=readonly [number,number,number?];
type Layer="atmosphere"|"hair"|"skin"|"brow"|"orbit"|"sclera"|"iris"|"lid"|"lashes"|"micro";
type Gesture={
  id:string;layer:Layer;path:readonly Knot[];color:string;
  width:number;water:number;load:number;dry:number;tone:1|2|3|4|5;
};
export const WC19_EYE_PAPER={color:"#F7F0E5",tooth:.88} as const;
export const WC19_EYE_LANDMARKS={
  eyebrowRoot:{x:187,y:122},
  eyebrowArch:{x:332,y:108},
  eyebrowTail:{x:535,y:155},
  outerCanthus:{x:260,y:264},
  upperLidApex:{x:406,y:218},
  innerCanthus:{x:508,y:249},
  lowerLidBowl:{x:380,y:300},
  irisCenter:{x:416,y:253},
  pupilCenter:{x:427,y:247},
  orbitalFold:{x:354,y:187},
  cheekTurn:{x:350,y:341},
} as const;

// Genuine watercolor palette from observational value groups, not 3D
// lighting gradients or semantic recoloring of a generic ellipse.
const C={
  // Earth and neutral values sampled as broad pigment families from the
  // user's owned reference eye. Avoid purple/pink digital cartoon bands.
  straw:"#B9957E",warm:"#9D6C56",rose:"#AC8574",shadow:"#7A645E",
  umber:"#654736",sepia:"#3F332E",indigo:"#686666",cool:"#8F8580",
  earth:"#956F5C",skin:"#C18E72",gold:"#C1A180",paper:"#C1B4A6",
  olive:"#786B47",iris:"#8B805E",sclera:"#8C817D",
} as const;
const G:Gesture[]=[];
const add=(id:string,layer:Layer,color:string,width:number,
  water:number,load:number,dry:number,points:readonly Knot[],
  tone:1|2|3|4|5=4)=>{
  G.push({id,layer,color,width,water,load,dry,tone,path:points});
};
const paint=(id:string,layer:Layer,color:string,width:number,
  points:readonly Knot[],load=.77,water=.64,dry=.14,tone:1|2|3|4|5=4)=>
  add(id,layer,color,width,water,load,dry,points,tone);
const curve=(a:readonly [number,number],b:readonly [number,number],
  c:readonly [number,number],d:readonly [number,number]):Knot[]=>[
    [a[0],a[1],.09],[b[0],b[1],.79],[c[0],c[1],.91],
    [d[0],d[1],.07],
  ];

// 01. Air, luminous paper and deep hair mass. Pigment is NOT drawn as an
// enclosing face polygon; brush contact and overlap determine its boundaries.
paint("air-blue-left","atmosphere",C.cool,100,curve([56,78],[111,105],[128,165],[151,233]),.29,.96,.05,2);
paint("air-sepia-upper","atmosphere",C.earth,113,curve([29,46],[143,22],[266,60],[343,72]),.21,.95,.05,2);
paint("air-paper-lower","atmosphere",C.rose,92,curve([53,405],[186,388],[276,430],[439,448]),.10,.98,.07,2);
paint("hair-left-ochre","hair",C.earth,74,curve([22,30],[74,82],[115,154],[163,229]),.70,.84,.12,4);
paint("hair-crown-umber","hair",C.umber,76,curve([18,9],[82,39],[141,116],[184,195]),.74,.79,.13,4);
paint("hair-cool-mass","hair",C.indigo,55,curve([22,83],[73,124],[119,191],[149,253]),.73,.68,.25,4);
paint("hair-warm-temple","hair",C.umber,34,curve([85,121],[145,177],[185,230],[212,279]),.62,.61,.37,4);
paint("hair-shadow-middle","hair",C.sepia,28,curve([20,82],[90,128],[159,174],[206,215]),.72,.48,.48,5);
paint("hair-edge-break","hair",C.earth,18,curve([76,66],[129,110],[162,158],[206,213]),.54,.49,.61,4);
paint("hair-root-flyaway","hair",C.umber,11,curve([132,70],[156,110],[180,147],[200,173]),.8,.24,.71,5);
paint("hair-root-flyaway-two","hair",C.umber,7,curve([142,60],[165,93],[198,138],[216,173]),.68,.2,.78,5);
paint("hair-temple-shade","hair",C.sepia,37,curve([110,177],[135,212],[174,267],[198,292]),.73,.49,.44,5);
paint("hair-reflected-ochre","hair",C.straw,35,curve([38,108],[84,137],[129,176],[169,221]),.40,.80,.17,3);
paint("hair-neg-space","hair",C.straw,19,curve([115,153],[146,182],[174,200],[191,213]),.46,.23,.79,3);

// 02. Structural face values: the brow ridge projects over the orbital
// socket; the cheek turns away under the lower lid. Each gesture follows a
// specific plane instead of random dots spread over one flat flesh polygon.
paint("temple-base-gold","skin",C.gold,88,curve([178,137],[263,133],[352,158],[468,185]),.45,.94,.08,3);
paint("forehead-warm","skin",C.skin,88,curve([253,93],[366,112],[481,130],[570,172]),.46,.90,.07,3);
paint("upper-cheek-light","skin",C.straw,84,curve([220,319],[316,337],[414,355],[539,347]),.45,.93,.07,3);
paint("socket-warm-internal","skin",C.warm,80,curve([193,197],[272,201],[328,212],[399,221]),.42,.86,.06,3);
paint("socket-sienna-out","skin",C.earth,64,curve([184,263],[244,295],[312,328],[365,334]),.44,.82,.13,3);
paint("lower-cheek-rose","skin",C.rose,90,curve([188,346],[278,368],[386,401],[531,414]),.23,.97,.04,2);
paint("cheek-turning-umber","skin",C.earth,54,curve([239,319],[305,350],[414,363],[510,342]),.42,.72,.11,3);
paint("upper-orbit-violet","skin",C.shadow,61,curve([245,183],[323,190],[411,181],[524,211]),.41,.67,.15,3);
paint("nasal-bridge-ochre","skin",C.gold,43,curve([508,213],[536,250],[558,297],[567,338]),.28,.89,.17,3);
paint("tear-trough-blue","skin",C.cool,43,curve([178,291],[251,302],[349,317],[440,307]),.33,.72,.19,3);
paint("socket-cool-wash","skin",C.indigo,49,curve([268,236],[345,225],[436,223],[510,237]),.25,.82,.08,2);
paint("forehead-lift","skin",C.paper,57,curve([309,122],[379,142],[451,139],[531,167]),.31,.93,.04,2);
paint("cheek-lift","skin",C.paper,41,curve([251,344],[339,361],[422,359],[513,379]),.25,.96,.04,2);

// 03. Brows are neither a uniformly thick line nor a row of equal strokes.
// Masses below: their tips are rooted in the supraorbital plane.
paint("brow-main-root","brow",C.umber,14,curve([187,150],[255,132],[346,118],[443,126]),.56,.67,.49,4);
paint("brow-main-tail","brow",C.sepia,11,curve([356,121],[418,114],[471,126],[535,155]),.51,.53,.69,4);
paint("brow-violet-core","brow",C.indigo,17,curve([209,149],[290,122],[353,126],[441,131]),.58,.40,.68,4);
paint("brow-warm-catching-light","brow",C.straw,19,curve([243,122],[329,111],[420,118],[481,138]),.39,.38,.68,3);
for(let i=0;i<12;i++){
  const roots=[216,241,263,291,322,344,371,391,424,445,471,500];
  const x=roots[i], y=141-13*Math.sin(i/11*Math.PI)+(i%3-1)*2.9;
  paint("brow-hair-"+i,"brow",i%3===0?C.earth:C.umber,
    1.45+(i%4)*.24,[[x-7,y+10,.08],[x+(i%3-1)*2,y-4,.67],[x+7+(i%4),y-13+(i%3)*3,.05]],
    .38,.28,.81,4);
}

// 04. Orbital fold follows the actual turning eyelid plate, with the
// strongest edge above the iris, not a fully closed dark almond.
paint("upper-orbit-fold","orbit",C.earth,34,curve([188,220],[266,185],[393,168],[522,193]),.52,.71,.12,4);
paint("upper-orbit-crease","orbit",C.shadow,13,curve([211,224],[293,199],[407,184],[510,207]),.49,.51,.48,4);
paint("upper-orbit-crease-broken","orbit",C.umber,6,curve([281,201],[338,185],[414,187],[462,199]),.49,.36,.7,4);
paint("upper-eyelid-mauve","orbit",C.shadow,24,curve([221,251],[315,232],[413,222],[510,239]),.47,.77,.18,4);
paint("upper-eyelid-warm","orbit",C.rose,27,curve([188,262],[292,242],[411,235],[531,246]),.59,.54,.36,4);
paint("lower-orbit-ochre","orbit",C.earth,49,curve([210,307],[307,319],[398,319],[531,278]),.46,.79,.1,3);
paint("lower-orbit-blue","orbit",C.cool,29,curve([230,317],[313,327],[421,316],[508,292]),.39,.63,.23,3);
paint("lower-orbit-flush","orbit",C.rose,32,curve([229,322],[320,338],[419,338],[482,317]),.38,.73,.11,3);
paint("outer-canthus-violet","orbit",C.shadow,29,curve([164,252],[198,270],[230,281],[261,288]),.56,.51,.27,4);

// 05. Sclera is not white; several faint translucent cool/warm touches
// preserve paper and sit *behind* the lids and iris.
paint("sclera-cool-body","sclera",C.sclera,45,curve([215,266],[297,258],[403,257],[510,262]),.75,.85,.07,3);
paint("sclera-amber-body","sclera",C.paper,38,curve([252,269],[319,270],[426,265],[497,267]),.62,.88,.05,3);
paint("sclera-shaded-far","sclera",C.shadow,16,curve([480,260],[501,255],[522,250],[536,246]),.32,.65,.17,3);
paint("sclera-shadow-top","sclera",C.shadow,22,curve([232,253],[323,246],[418,236],[511,251]),.47,.69,.15,3);

// 06. Iris is observed as a partially occluded, multi-colored volume.
// Repeated stipples only live INSIDE the iris; no pasted circle sticker.
paint("iris-olive-main","iris",C.olive,39,curve([415,233],[424,246],[419,277],[412,293]),.8,.66,.25,4);
paint("iris-warm-ring-left","iris",C.earth,23,curve([397,237],[387,253],[395,281],[412,291]),.82,.40,.62,5);
paint("iris-shadow-right","iris",C.sepia,19,curve([442,239],[457,249],[451,280],[431,288]),.82,.36,.64,5);
paint("iris-blue-upper","iris",C.indigo,31,curve([395,235],[412,228],[433,232],[448,241]),.92,.43,.60,5);
paint("iris-gold-bottom","iris",C.gold,28,curve([401,276],[419,289],[444,286],[457,267]),.62,.64,.23,4);
paint("iris-leaf-green","iris",C.olive,28,curve([402,257],[408,271],[423,281],[440,266]),.59,.53,.35,4);
paint("iris-dark-upper-pocket","iris",C.sepia,17,curve([407,232],[426,231],[449,241],[449,257]),.73,.47,.57,5);
paint("pupil-dark-core","iris",C.sepia,13,curve([425,239],[430,244],[430,256],[424,265]),.97,.25,.75,5);
paint("pupil-deep-cross","iris",C.sepia,10,curve([416,253],[426,249],[439,251],[445,255]),.94,.19,.79,5);
paint("iris-lower-ochre","iris",C.earth,19,curve([406,276],[420,287],[442,278],[452,264]),.66,.29,.73,5);
for(let i=0;i<14;i++){
  const a=i*.435+.28,x=427+28*Math.cos(a),y=258+27*Math.sin(a);
  const x2=427+42*Math.cos(a),y2=258+39*Math.sin(a);
  paint("iris-threads-"+i,"iris",i%4===0?C.gold:i%3===0?C.indigo:C.umber,
    2.1+(i%3)*.7,
    [[x,y,.11],[(x+x2)/2,(y+y2)/2,.78],[x2,y2,.04]],
    .58,.31,.73,5);
}

// 07. Eyelids: two long unequal-weight arcs plus broken short accents.
// Avoid painting a complete enclosed black line around the eye.
paint("lid-upper-broad","lid",C.umber,13,curve([174,259],[297,238],[410,229],[530,247]),.63,.51,.49,4);
paint("lid-upper-dark-core","lid",C.sepia,5,curve([209,252],[327,234],[416,231],[511,243]),.60,.39,.7,5);
paint("lid-upper-warm-reflection","lid",C.rose,13,curve([213,246],[330,231],[418,230],[519,238]),.59,.36,.53,4);
paint("lid-lower-waterline","lid",C.rose,9,curve([177,267],[269,282],[411,281],[535,248]),.49,.57,.52,4);
paint("lid-lower-inner-rim","lid",C.earth,5,curve([222,276],[316,287],[413,279],[497,261]),.45,.34,.67,4);
paint("lid-lower-soft-blue","lid",C.cool,8,curve([255,291],[335,297],[416,293],[483,281]),.30,.66,.31,3);
paint("lid-outer-tear-shadow","lid",C.shadow,12,curve([171,261],[187,270],[217,286],[245,287]),.59,.28,.68,4);
paint("lid-near-corner-bright","lid",C.straw,6,curve([495,263],[512,261],[521,258],[536,247]),.60,.51,.33,4);
paint("lid-far-reflection","lid",C.rose,10,curve([482,251],[503,255],[522,254],[537,247]),.65,.41,.54,4);

// 08. Natural lash direction. No identical radial fence / false eyeliner.
for(let i=0;i<16;i++){
  const offsets=[0,.029,.087,.137,.195,.252,.323,.395,.466,.535,.601,.673,.749,.811,.916,1];
  const t=offsets[i],x=224+t*274;
  const y=260-24*Math.sin(t*Math.PI*.94)-8*t;
  const len=5+8*Math.sin(t*Math.PI)+(i%4)*1.25;
  const lean=(t-.5)*18;
  paint("lash-upper-"+i,"lashes",i%3===0?C.umber:C.sepia,1.6+(i%3)*.3,
    [[x,y+3,.09],[x+lean*.28,y-1,.78],
      [x+lean*.66+(i%4-1.5)*1.6,y-len*.64,.44],
      [x+lean+(i%3-1)*2.4,y-len,.025]],
    .38+.23*Math.sin(i/15*Math.PI),.23,.86,4);
}
for(let i=0;i<8;i++){
  const offsets=[0,.075,.21,.345,.5,.65,.84,1];
  const t=offsets[i],x=236+t*255;
  const y=284+9*Math.sin(t*Math.PI)-10*t;
  paint("lash-lower-"+i,"lashes",C.umber,1.0+(i%3)*.2,
    [[x,y,.08],[x+2,y+4,.72],
      [x+4+(i%2)*2,y+9+(i%3),.45],
      [x+6+(i%3)*2,y+13+(i%3),.04]],
    .24,.21,.86,4);
}

// 09. A few specifically placed micro-gestures; not face-wide random grain.
paint("crease-turn-outer","micro",C.umber,4.2,curve([189,289],[208,298],[225,303],[244,300]),.45,.23,.65,4);
paint("crease-turn-inner","micro",C.shadow,4.3,curve([510,273],[535,289],[545,313],[557,324]),.42,.28,.61,4);
paint("cheek-plane-grain","micro",C.rose,9,curve([273,350],[318,371],[357,360],[408,369]),.30,.28,.58,3);
paint("fold-glint-reserve-shadow","micro",C.gold,7,curve([285,213],[354,197],[426,193],[487,214]),.34,.58,.38,3);

// WM1 has a deliberate 120-stroke ceiling. Each stroke is a real timed
// bristle/taper deposit, never an SVG path drawn directly to final UI.
export const WC19_EYE_GESTURES:readonly Gesture[]=G;

const makeStroke=(g:Gesture,i:number):PaintStroke=>({
  id:g.id,color:g.color,
  // Transparent iris glazing should never accumulate like opaque acrylic;
  // reserve saturated near-black pigment for the pupil, not the iris ring.
  tone:g.layer==="iris" && !g.id.startsWith("pupil-")
    ? Math.min(g.tone,4) as 1|2|3|4|5 : g.tone,
  width:g.width,water:g.water,
  load:g.layer==="iris"&&!g.id.startsWith("pupil-")
    ? Math.min(.57,g.load*.74) : g.load,
  dryBrush:g.dry,
  startFrame:10+Math.floor(i*.9),
  drawFrames:20+(i%7)*2,
  spreadFrames:26+(i%4)*7,dryFrames:134,
  // Reference-study correction: previously the face looked like a very
  // long, nearly closed slit. The eye spans ~2.7–3.5 width/height in the
  // observed source; bring canthi inward WITHOUT shrinking the iris.
  // Pressure ribbons still paint every feature, not premade filled shapes.
  points:g.path.map(([x,y,pressure],k)=>{
    const compressed=["sclera","lid","lashes"].includes(g.layer);
    const grouped=["brow","orbit","micro"].includes(g.layer);
    const xx=compressed?427+(x-427)*.65:grouped?427+(x-427)*.84:x;
    const upper=g.id.startsWith("lid-upper")||g.id.startsWith("lash-upper");
    const lower=g.id.startsWith("lid-lower")||g.id.startsWith("lash-lower");
    const yy=y+(g.layer==="iris"?-5:upper?-6:lower?18:g.layer==="brow"?20:g.layer==="sclera"?4:0);
    return {x:xx,y:yy,pressure:pressure??([.08,.72,.88,.06][Math.min(3,k)]),
      speed:(pressure??.25)<.2?.72:.19};
  }),
});
export function experimentalWatercolourEyeBrush(seed=83):{
  brush:PaintSurfaceSpec;wet:WetPaperSpec;
}{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError("Invalid portrait study seed");
  const paper=WC19_EYE_PAPER;
  const width=640,height=480;
  const reserves=[
    "M424 250 Q427 248 429 252 Q428 256 426 256 Q423 254 424 250 Z",
    "M448 267 Q451 266 452 269 L450 272 Q448 271 448 267 Z",
    "M287 202 Q309 192 332 194 L325 199 Q305 198 287 202 Z",
  ];
  const brush:PaintSurfaceSpec={
    version:1,medium:"watercolour",width,height,seed,paper,
    strokes:WC19_EYE_GESTURES.map(makeStroke),reservePaths:reserves,
    pigmentGranulation:.60,
  };
  const shapes=[
    [{x:20,y:18},{x:615,y:26},{x:638,y:384},{x:591,y:457},
      {x:65,y:463},{x:8,y:325}],
  ];
  // Real pigment physically deposited along pressure-guided wet brush passes.
  // Reserve the paper for the upper iris catchlight and selected fold flecks.
  const wet:WetPaperSpec={
    version:1,width,height,seed,paper,
    cellSize:14,flow:.79,granulation:.87,edgePooling:.74,dryFrames:175,
    paintAreas:shapes,
    reservePaths:reserves,
    drops:[
      {id:"warm-face-base",x:326,y:287,radius:123,pigment:C.straw,load:.59,water:.94,startFrame:8,
        path:[{x:161,y:290,pressure:.14},{x:307,y:302,pressure:.93},{x:495,y:324,pressure:.14}]},
      {id:"warm-forehead-wash",x:326,y:136,radius:132,pigment:C.gold,load:.58,water:.91,startFrame:19,
        path:[{x:180,y:127,pressure:.12},{x:343,y:137,pressure:.91},{x:547,y:159,pressure:.16}]},
      {id:"cool-socket",x:360,y:232,radius:83,pigment:C.shadow,load:.60,water:.88,startFrame:37,
        path:[{x:216,y:218,pressure:.13},{x:373,y:204,pressure:.91},{x:524,y:225,pressure:.09}]},
      {id:"blue-lower-socket",x:316,y:312,radius:95,pigment:C.cool,load:.57,water:.89,startFrame:53,
        path:[{x:189,y:292,pressure:.12},{x:331,y:305,pressure:.88},{x:517,y:295,pressure:.10}]},
      {id:"umber-hair-root",x:108,y:126,radius:106,pigment:C.umber,load:.82,water:.79,startFrame:67,
        path:[{x:57,y:57,pressure:.11},{x:107,y:131,pressure:.95},{x:174,y:234,pressure:.10}]},
      {id:"eyebrow-wet-shadow",x:342,y:136,radius:42,pigment:C.umber,load:.55,water:.76,startFrame:83,
        path:[{x:204,y:145,pressure:.09},{x:326,y:112,pressure:.85},{x:500,y:141,pressure:.07}]},
      {id:"iris-first-olive",x:416,y:253,radius:31,pigment:C.olive,load:.54,water:.72,startFrame:101,
        path:[{x:405,y:234,pressure:.10},{x:423,y:253,pressure:.95},{x:431,y:279,pressure:.08}]},
      {id:"iris-second-sepia",x:431,y:252,radius:14,pigment:C.sepia,load:.68,water:.61,startFrame:126,
        path:[{x:420,y:239,pressure:.07},{x:432,y:253,pressure:.89},{x:437,y:269,pressure:.08}]},
      {id:"inner-eye-rust",x:507,y:259,radius:39,pigment:C.rose,load:.51,water:.86,startFrame:147,
        path:[{x:468,y:250,pressure:.11},{x:500,y:255,pressure:.81},{x:528,y:259,pressure:.09}]},
      {id:"cheek-second-glaze",x:364,y:364,radius:88,pigment:C.warm,load:.40,water:.92,startFrame:174,
        path:[{x:234,y:352,pressure:.12},{x:382,y:358,pressure:.88},{x:523,y:392,pressure:.10}]},
    ],
  };
  return {brush,wet};
}
