import type {CrayonColor,CrayonElement} from "../../registry/video/materials/crayon-scene";

/**
 * F1 V42: native pigmented-wax treatment of the licensed portrait's actual
 * green-black out-of-focus hedge, not a raster/photo underlay. The CC0
 * source is Christopher Campbell's 608x1082 browser-cropped portrait,
 * SHA256 f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2.
 *
 * The CC0 upper 0..163px source has RGB median approximately (19,33,10)
 * while x520..608, y180..355 varies toward (37,61,17). Native wax builds
 * an opaque green-black underlayer, broad organic scumbles, specifically
 * placed out-of-focus leaf bunches and source-directed lamina/vein marks.
 * No SVG filters, external images, CSS masks, drawn leaves as smooth stamps,
 * flattened fill, or duplicated face/rig components. Not art-approved.
 */
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Point=readonly [number,number];
type Cluster={
  id:string;x:number;y:number;angle:number;length:number;width:number;
  family:"shadow"|"olive"|"fern"|"moss";bend:number;spread:number;
};
const palette={
  shadow:["#0c1909","#040b05","#1c3012"],
  olive:["#203c17","#0b1a0b","#49682a"],
  fern:["#294f1b","#0e260f","#647f35"],
  moss:["#1e3713","#081b0b","#4c7027"],
} as const satisfies Record<string,readonly [CrayonColor,CrayonColor,CrayonColor]>;
/** Analyzed from the spatial layout of the photographed source foliage.
 * Actual photo foliage is soft/distant; angles describe natural stem
 * divergence, NOT a globally tiled decorative forest symbol.
 */
const clusters:readonly Cluster[]=[
  {id:"near-left-broad",x:14,y:107,angle:-.70,length:103,width:29,family:"olive",bend:.17,spread:.68},
  {id:"near-left-dapple",x:72,y:151,angle:-1.94,length:72,width:21,family:"moss",bend:-.23,spread:.77},
  {id:"near-left-sprout",x:111,y:61,angle:.64,length:59,width:16,family:"fern",bend:.19,spread:.80},
  {id:"left-drop-leaves",x:30,y:242,angle:-1.28,length:77,width:27,family:"olive",bend:-.16,spread:.71},
  {id:"left-upper-split",x:178,y:49,angle:-.13,length:53,width:18,family:"shadow",bend:.18,spread:.52},
  {id:"upper-center-shade",x:235,y:69,angle:1.42,length:49,width:21,family:"shadow",bend:-.11,spread:.83},
  {id:"high-center-canopy",x:300,y:13,angle:1.27,length:63,width:24,family:"moss",bend:.16,spread:.71},
  {id:"center-hidden-shoot",x:348,y:92,angle:-.84,length:58,width:17,family:"shadow",bend:.18,spread:.84},
  {id:"center-sunleaf",x:405,y:105,angle:-1.05,length:68,width:20,family:"olive",bend:-.13,spread:.72},
  {id:"far-crown-dapple",x:468,y:21,angle:.75,length:91,width:27,family:"moss",bend:.13,spread:.73},
  {id:"far-split-leaf",x:534,y:68,angle:.24,length:82,width:26,family:"fern",bend:-.12,spread:.65},
  {id:"far-high-dapple",x:578,y:111,angle:1.38,length:59,width:23,family:"olive",bend:.21,spread:.73},
  {id:"far-right-lit",x:550,y:186,angle:-.43,length:93,width:32,family:"fern",bend:.10,spread:.88},
  {id:"far-right-middle",x:587,y:286,angle:-1.53,length:70,width:24,family:"moss",bend:-.20,spread:.68},
  {id:"far-right-behind",x:582,y:356,angle:1.23,length:92,width:32,family:"shadow",bend:.14,spread:.77},
  {id:"far-deep-leaf",x:594,y:482,angle:-.91,length:60,width:20,family:"olive",bend:-.25,spread:.58},
  {id:"lower-sun-pocket",x:603,y:639,angle:-2.24,length:72,width:27,family:"fern",bend:.21,spread:.67},
  {id:"lower-green-occlusion",x:595,y:757,angle:-1.67,length:68,width:25,family:"moss",bend:-.18,spread:.83},
  {id:"bottom-shadow",x:587,y:927,angle:-.79,length:62,width:24,family:"shadow",bend:.24,spread:.62},
] as const;
const fmt=(v:number)=>v.toFixed(2);
function place(x:number,y:number,u:number,v:number,theta:number):Point{
  return [x+u*Math.cos(theta)-v*Math.sin(theta),
    y+u*Math.sin(theta)+v*Math.cos(theta)];
}
function leafPath(baseX:number,baseY:number,length:number,width:number,
  angle:number,bend:number):{d:string;midrib:string}{
  const p=(u:number,v:number)=>place(baseX,baseY,length*u,width*v,angle);
  const pair=(a:Point)=>fmt(a[0])+" "+fmt(a[1]);
  const root=p(0,0),l1=p(.21,.48+bend),l2=p(.47,1+bend*.2),
    l3=p(.66,.69),tip=p(1,0),
    r1=p(.72,-.30),r2=p(.33,-.72+bend*.3),r3=p(.08,-.24);
  // Asymmetric, cupped leaf; no symmetrical vector ellipses.
  const d="M"+pair(root)+" C"+pair(l1)+" "+pair(l2)+" "+pair(l3)+
    " C"+pair(p(.83,.42))+" "+pair(p(.94,.16))+" "+pair(tip)+
    " C"+pair(r1)+" "+pair(r2)+" "+pair(r3)+
    " C"+pair(p(.025,-.12))+" "+pair(p(-.02,.08))+" "+pair(root)+"Z";
  const midrib="M"+pair(p(.03,0))+" C"+pair(p(.32,.07))+" "+
    pair(p(.66,bend*.2))+" "+pair(p(.89,.02));
  return {d,midrib};
}
const rect=(x:number,y:number,width:number,height:number)=>
  ({x,y,width,height});
const color=(a:string)=>a as CrayonColor;
/**
 * No changes to original CC0 portrait nodes or original seeded wax indices.
 * Append the spatial reference backdrop in a semantic painter's underlayer;
 * CrayonScene renders layer=backdrop ahead of the original portrait while
 * computing seeds from their original authored indices.
 */
export function crayonF1AddSourceHedgeV42(
  portrait:readonly CrayonElement[],detail:number,
):CrayonElement[]{
  if(!Number.isFinite(detail)||detail<.2||detail>1)
    throw new RangeError("Invalid photographic hedge detail");
  if(portrait.length===0||!portrait.some(el=>el.id==="hair-back")||
     !portrait.some(el=>el.id==="face-outline")||
     !portrait.some(el=>el.id==="hair-right-curtain"))
    throw new RangeError("Missing source-registered portrait beneath hedge");
  const seen=new Set(portrait.map(el=>el.id));
  if(seen.size!==portrait.length)throw new RangeError("Duplicated source portrait id");
  const bg:CrayonElement[]=[];
  function add(element:CrayonElement){
    if(seen.has(element.id))throw new RangeError("Duplicate source hedge element");
    seen.add(element.id);bg.push(element);
  }
  const mass=(id:string,d:string,bounds:ReturnType<typeof rect>,
    colors:readonly [CrayonColor,CrayonColor,CrayonColor],
    timing:{start:number;end:number},
    overrides:Partial<Wax>={})=>{
    add({id,kind:"wax",renderLayer:"backdrop",d,bounds,colors,timing,
      pressure:.86,spacing:8.5,strokeOrder:"patches",markLength:"long",
      deposition:"stroke-built",nibStyle:"dry",coverage:"opaque",
      markStrength:.29,underpaintTooth:.24,opaqueBurnish:.7,
      edgeRoughness:.24,outlineOpacity:0,...overrides});
  };
  // Full dark wax foundation: source median ≈ (19,33,10), not paper beige.
  mass("cc0-hedge-dark-underpaint",
    "M-9 -9L617 -9L617 1091L-9 1091Z",
    rect(-9,-9,626,1100),["#0e1907","#030804","#1a2d11"],
    {start:0,end:8},{pressure:1,spacing:9,markStrength:.12,
      underpaintTooth:.12,opaqueBurnish:1,
      underpaintGradient:{light:"#1b3614",shadow:"#030804",
        focusX:.83,focusY:.22,radius:1.18}});
  // Shadow and oblique plant silhouettes behind source greenery.
  mass("cc0-hedge-top-cast",
    "M-10 -10L620 -10L620 110"+
    "Q561 72 505 78Q461 98 412 80"+
    "Q359 42 325 70Q283 100 239 86"+
    "Q190 35 145 74Q105 102 65 86Q29 66 -10 81Z",
    rect(-10,-10,630,125),["#101b0b","#040907","#223015"],
    {start:3,end:26},{coverage:"open",pressure:.48,markStrength:.37,
      underpaintTooth:0,opaqueBurnish:0,blendRadius:13});
  mass("cc0-hedge-far-pocket",
    "M491 106Q562 84 620 127L620 710"+
    "Q597 680 579 644Q554 582 576 537"+
    "Q600 464 555 390Q524 322 512 260Z",
    rect(491,102,133,622),["#162c0f","#051407","#304b19"],
    {start:9,end:45},{pressure:.89,markStrength:.24,opaqueBurnish:.88,
      featherContacts:true,blendRadius:11,
      underpaintGradient:{light:"#3e6021",shadow:"#030d04",
        focusX:.73,focusY:.26,radius:1.16}});
  mass("cc0-hedge-left-pocket",
    "M-9 67Q58 53 105 92Q152 135 117 204"+
    "Q74 273 -9 325Z",
    rect(-9,49,165,284),["#1e3914","#071c09","#577632"],
    {start:10,end:52},{pressure:.79,featherContacts:true,blendRadius:12,
      underpaintGradient:{light:"#547a2c",shadow:"#081b08",
        focusX:.32,focusY:.55,radius:1.2}});
  // The backplane is deliberate brushwork, not a photographic filter.
  // Each distant cluster has 3 nonidentical cupped lobes, diverging stem
  // axes, physically separated wax-ridge contacts and clipped fine veins.
  const count=Math.round(clusters.length*detail);
  for(const cluster of clusters.slice(0,Math.max(4,count))){
    const parts:string[]=[],roots:string[]=[];
    const factor=[.72,.96,.57] as const;
    for(let i=0;i<3;i++){
      const angle=cluster.angle+(i-1)*cluster.spread+
        (i===1?cluster.bend:cluster.bend*.45);
      const root=place(cluster.x,cluster.y,i*3-4,2*i-3,cluster.angle);
      const leaf=leafPath(root[0],root[1],cluster.length*factor[i],
        cluster.width*(.84+i*.1),angle,cluster.bend+(i-1)*.11);
      parts.push(leaf.d);
      roots.push(leaf.midrib);
    }
    const colorSet=palette[cluster.family];
    const radius=cluster.length+cluster.width*3+18;
    const leafId="cc0-hedge-leaf-"+cluster.id;
    // Convert the photographed lamina axis into CRAYON1's [-89,89]
    // material hatch angle modulo 180, rather than painting every leaf
    // with an identical horizontal digital stripe.
    const grainAngle=((cluster.angle*180/Math.PI+810)%180)-90;
    mass(leafId,parts.join(" "),
      rect(cluster.x-radius,cluster.y-radius,radius*2,radius*2),
      colorSet,{start:18,end:74},{pressure:.72,spacing:8.7,
        angle:grainAngle,markStrength:.28,featherContacts:true,
        blendRadius:14,underpaintTooth:.31,opaqueBurnish:.72,
        underpaintGradient:{light:colorSet[2],shadow:colorSet[1],
          focusX:.28,focusY:.18,radius:1.12}});
    add({id:"cc0-hedge-lamina-"+cluster.id,kind:"contour",
      renderLayer:"backdrop",parentId:leafId,clipToParent:true,
      timing:{start:40,end:93},d:roots.join(" "),color:color("#7f9851"),
      width:.43,opacity:.24,waxContact:"dry-wax",waxPressure:.45});
  }
  // All unapproved backgrounds remain *after* the legacy scene array;
  // the separate presentation layer, not insertion-order mutation, puts
  // them optically behind. This is also reversible by V41 control selection.
  return [...portrait,...bg];
}
