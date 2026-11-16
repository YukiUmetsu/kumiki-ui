/**
 * New character #01 — STAGE 1 ONLY.
 *
 * The previously shipped woman/portrait was deliberately retired and is NOT
 * imported or used here.  This is a fresh neutral adult head construction
 * driven by a separately parameterized MediaPipe ANAT1 mesh.  It deliberately
 * has NO eyes, lashes, nose, lips, ears, hairstyle or clothing yet.
 *
 * The frame starts with one facial-contour region; subsequent ArtCraft PRs
 * must finish and visually approve each feature before another is built.
 * This is an anatomy BLOCKOUT, never a finished character/portrait.
 */
import { createFace, FACE_FEATURES, FACE_LANDMARKS } from "../../registry/anatomy/anatomy-face";
import { smoothPath } from "../../registry/anatomy/anatomy-view";
import { pencilHash } from "../../registry/video/colored-pencil";
import type { PencilTrace } from "../../registry/video/colored-pencil";
import type { PencilSubjectPart, PencilPalette } from "./colored-pencil-living-studies";

type Point=[number,number];
type Point3=[number,number,number];
const r=(x:number)=>Math.round(x*100)/100;
const n=(x:number)=>r(x).toFixed(2);
const line=(a:Point,b:Point,c:Point)=>"M"+n(a[0])+" "+n(a[1])+
  " Q"+n(b[0])+" "+n(b[1])+" "+n(c[0])+" "+n(c[1]);
const drawn=(id:string,path:string,color:string,width:number,opacity:number,
  startFrame=205):PencilTrace=>({
  id,path,color,width,opacity,startFrame,durationFrames:57,
});

/** Three independent, physically short dry-pencil glaze passes.
 * Guide samples come from three new bony structure curves and vary by
 * local tangent; this is not an old portrait's facial shading or a filter.
 */
function newHeadValuePencil(
  guides:readonly (readonly [Point,Point,Point])[],
  seed:number,
):PencilTrace[]{
  const values=[
    {color:"#967678",width:.41,opacity:.36,start:186},
    {color:"#C9A295",width:.34,opacity:.30,start:212},
    {color:"#F2D4B9",width:.27,opacity:.23,start:240},
  ] as const;
  return values.map((v,layer)=>{
    const marks:string[]=[];
    guides.forEach(([a,c,b],index)=>{
      for(let i=0;i<38;i++){
        const key=index*157+layer*53+i;
        const t=Math.max(.025,Math.min(.975,
          (i+.5+(pencilHash(seed,key,11)-.5)*.48)/38));
        const u=1-t;
        const x=u*u*a[0]+2*u*t*c[0]+t*t*b[0];
        const y=u*u*a[1]+2*u*t*c[1]+t*t*b[1];
        const tx=2*u*(c[0]-a[0])+2*t*(b[0]-c[0]);
        const ty=2*u*(c[1]-a[1])+2*t*(b[1]-c[1]);
        const size=Math.hypot(tx,ty);
        if(size<.0001)continue;
        const dx=tx/size,dy=ty/size,nx=-dy,ny=dx;
        const shift=(pencilHash(seed,key,12)-.5)*5;
        const len=(1.9+2.2*pencilHash(seed,key,13))*
          (layer===2?.72:1);
        const x0=x+nx*shift,y0=y+ny*shift;
        const curve=(pencilHash(seed,key,14)-.5)*.8;
        marks.push(line([x0,y0],
          [x0+dx*len*.52+nx*curve,y0+dy*len*.52+ny*curve],
          [x0+dx*len+nx*curve*.4,y0+dy*len+ny*curve*.4]));
      }
    });
    return drawn("newhead-value-"+layer,marks.join(" "),
      v.color,v.width,v.opacity,v.start);
  });
}

/** Stage 1-only head value fields. Pencil touches follow the cranial turn,
 * temporal recession, zygomatic wedge and mandibular fold. Unlike an
 * all-head Cartesian hatch these marks have independent local growth angles
 * and widths; their ellipse boundaries feather by tip pressure, while the
 * actual (unmodified) silhouette owns the SVG clipping. No eyes, nose,
 * hair, ears or feature stickers are drawn.
 *
 * Each field is split into bounded editable traces: no image underlay, canvas
 * photograph, flat gradient, displacement filter or global screen grain.
 */
function newHeadPlanePigment(
  bounds:readonly [number,number,number,number],
  seed:number,
):PencilTrace[]{
  const [x0,y0,w,h]=bounds;
  const planes=[
    {id:"cranial",center:[.49,.26],radii:[.44,.27],skew:-.08,
      heading:.13,turn:.32,colors:["#937A7D","#CEA596","#E6CAB0"],
      load:.87},
    {id:"temporal",center:[.20,.43],radii:[.25,.35],skew:.16,
      heading:-.93,turn:.26,colors:["#775E69","#B38D82","#CFAD99"],
      load:1.00},
    {id:"far-temple",center:[.82,.46],radii:[.18,.30],skew:-.10,
      heading:1.03,turn:-.34,colors:["#8C7376","#C59B87","#E3BFA6"],
      load:.74},
    {id:"malar",center:[.35,.68],radii:[.29,.21],skew:-.30,
      heading:.25,turn:.62,colors:["#9C7374","#D3A28D","#ECC5A6"],
      load:.94},
    // The 3/4 view turns into a lighter, smaller opposite cheek plane.
    // Different projected radii and pigment hue avoid a mirror patch.
    {id:"far-malar",center:[.76,.68],radii:[.22,.20],skew:.15,
      heading:-.49,turn:-.37,colors:["#A0817C","#D0AA97","#E8C9B2"],
      load:.69},
    // The mandibular arch carries a soft warm half-tone under the malar
    // turn: the earlier exact-native crop left this whole region blank.
    {id:"mandibular",center:[.57,.83],radii:[.30,.17],skew:-.18,
      heading:.55,turn:.46,colors:["#927879","#BD9889","#E2BA9F"],
      load:.83},
  ] as const;
  const traces:PencilTrace[]=[];
  planes.forEach((plane,part)=>{
    const cx=x0+w*plane.center[0],cy=y0+h*plane.center[1];
    const rx=w*plane.radii[0],ry=h*plane.radii[1];
    const cs=Math.cos(plane.skew),sn=Math.sin(plane.skew);
    for(let layer=0;layer<3;layer++){
      const layerMarks:string[]=[];
      for(let group=0;group<3;group++){
        const strokes:string[]=[];
      for(let i=0;i<150;i++){
        const key=part*79031+layer*12947+group*313+i;
        const theta=2*Math.PI*pencilHash(seed,key,71);
        const radial=Math.sqrt(pencilHash(seed,key,72))*.98;
        const ux=radial*Math.cos(theta),uy=radial*Math.sin(theta);
        // A dense soft middle feathers outward without stamped ellipse edges.
        const fade=Math.pow(1-radial*radial,.62);
        if(pencilHash(seed,key,73)>.59+.41*fade)continue;
        const localX=ux*rx,localY=uy*ry;
        const x=cx+localX*cs-localY*sn;
        const y=cy+localX*sn+localY*cs;
        const heading=plane.heading+plane.turn*uy+.23*ux+
          (pencilHash(seed,key,74)-.5)*.26;
        const len=(2.7+5.7*pencilHash(seed,key,75))*
          (.32+.68*fade)*(layer===2?.75:1);
        const vx=Math.cos(heading),vy=Math.sin(heading);
        const ox=-vy,oy=vx;
        const bow=(pencilHash(seed,key,76)-.5)*.74*fade;
        strokes.push(line([x-vx*len*.46,y-vy*len*.46],
          [x+ox*bow,y+oy*bow],
          [x+vx*len*.54+ox*bow*.22,
            y+vy*len*.54+oy*bow*.22]));
      }
        // Preserve every original mark; the old three 150-sample groups
        // redundantly used 54 trace slots. Two visually identical,
        // serialized-budget-bound chunks leave room for independently
        // editable anatomical tonal mass, with NO marks discarded.
        layerMarks.push(...strokes);
      }
      const middle=Math.ceil(layerMarks.length/2);
      for(let chunk=0;chunk<2;chunk++){
        const trace=layerMarks.slice(chunk===0?0:middle,
          chunk===0?middle:layerMarks.length).join(" ");
        if(trace.length>12000||trace.length<2)
          throw new Error("Cranial base pencil trace exceeds CP-F1 12kB bound");
        traces.push(drawn(
          "newhead-plane-"+plane.id+"-"+layer+"-"+chunk,
          trace,plane.colors[layer],
          [.43,.34,.27][layer],
          [.40,.34,.29][layer]*plane.load,
          162+layer*22+part*4+chunk*3,
        ));
      }
    }
  });
  return traces;
}

/**
 * Stage-1 art iteration: three crossed DRY-PENCIL contact passes, sampled on
 * a shaded cranial ellipsoid in the same projected ANAT1 head coordinates.
 * Actual head material remains individually authored vector pigment: there
 * is no bitmap, SVG gradient, blurred mask or broad flat-color fill here.
 *
 * The previous native 960x540 capture was almost white inside a pencil
 * outline: a handful of 0.3px marks cannot build photographed skin mass.
 * Add warm/cool interleaving, a soft side-plane terminator and a localized
 * reflected-light edge with thousands of short pressure-sensitive strokes.
 *
 * This ellipsoid is an ORIGINAL approximation of skull volume. It is not
 * a likeness/reconstruction, nor a measured real-photo tonal map; the
 * independent exact-byte 18-point/five-ROI ArtCraft gate remains blocked.
 */
export function newHeadCranialTonalVolume(
  bounds:readonly [number,number,number,number],
  seed:number,
):PencilTrace[]{
  if(bounds.length!==4||bounds.some(v=>!Number.isFinite(v))||
    bounds[2]<40||bounds[3]<40||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("Stage-1 cranial volume needs finite head bounds and seed");
  const [left,top,width,height]=bounds;
  const cx=left+width*.505,cy=top+height*.47;
  const rx=width*.535,ry=height*.61;
  // Optical layers are colored-pencils, not five solid painted stripes.
  // Keep paper in highlights: semi-transparent warm, neutral and cool
  // touches read differently when layered on the tooth of the same sheet.
  const palette=[
    ["#EED1B7","#F6DABE","#C8B1AE"], // paper-reserved highlight
    ["#D6AD98","#E6BFA2","#BC9C9E"], // frontal light
    ["#B98782","#C39B8B","#9F7985"], // warm/cool halftone
    ["#805C68","#996C72","#745F70"], // deep far temporal terminator
    ["#B18B90","#D0ABA0","#8D7A82"], // narrow cool bounce
  ] as const;
  const opacities=[.28,.43,.58,.73,.48] as const;
  const weights=[2.40,1.75,1.05] as const;
  const strokes:string[][][]=Array.from({length:5},()=>
    Array.from({length:3},()=>[] as string[]));
  // Fill each of 5 values with an exact, independently preserved count.
  // The CP-F1 contract bounds a trace to 12k chars and a material region
  // to 80 traces; sampling more and silently throwing samples away would
  // undermine the original high-detail requirement. The 15 new traces
  // retain all planned marks without changing those resource limits.
  for(let pass=0;pass<3;pass++){
    const budgets=[134,170,176,184,105] as const;
    const collected=budgets.map(()=>0);
    let i=0;
    while(collected.some((n,band)=>n<budgets[band])&&i<150000){
      const key=pass*523991+i++;
      const x=left+width*pencilHash(seed,key,401);
      const y=top+height*pencilHash(seed,key,402);
      const u=(x-cx)/rx,v=(y-cy)/ry;
      const r2=u*u+v*v;
      if(r2>=.965)continue;
      // Ellipsoid z supplies the missing vault shading (ANAT1 ends at
      // hairline). Side light comes from viewer upper-left with a dark,
      // gently curved far-temporal plane, not five horizontal bands.
      const z=Math.sqrt(1-r2);
      const light=.62*z-.63*u-.21*v;
      const bounce=u>.57&&v>-.43&&v<.66&&z<.59;
      const band=bounce?4:light>.68?0:light>.39?1:
        light>.12?2:3;
      if(collected[band]>=budgets[band])continue;
      const edge=Math.pow(1-r2,.28);
      // Sparse reserves reveal paper tooth; avoid a rigid ellipse edge.
      if(pencilHash(seed,key,403)>.64+.36*edge)continue;
      const pressure=(.56+.44*pencilHash(seed,key,404))*edge;
      const angle=-.21+.46*v-.32*u+
        [0,.43,-.51][pass]+
        (pencilHash(seed,key,405)-.5)*.19;
      const ux=Math.cos(angle),uy=Math.sin(angle);
      const orthoX=-uy,orthoY=ux;
      const span=(5.1+6.7*pencilHash(seed,key,406))*
        (.58+.42*edge)*(.77+.23*pressure)*(pass===2?.78:1);
      const deflect=(pencilHash(seed,key,407)-.5)*.54;
      strokes[band][pass].push(line(
        [x-ux*span*.51,y-uy*span*.51],
        [x+orthoX*deflect,y+orthoY*deflect],
        [x+ux*span*.49+orthoX*deflect*.27,
         y+uy*span*.49+orthoY*deflect*.27],
      ));
      collected[band]++;
    }
    if(collected.some((n,band)=>n!==budgets[band]))
      throw new Error("Cranial ellipsoid failed to cover all five values");
  }
  const out:PencilTrace[]=[];
  for(let band=0;band<5;band++)for(let pass=0;pass<3;pass++){
    if(strokes[band][pass].length<12)
      throw new Error("Stage-1 ellipsoid missing a pencil value region");
    const id=["highlight","light","halftone",
      "core-shadow","reflected-light"][band];
    const strokePath=strokes[band][pass].join(" ");
    if(strokePath.length>12000)
      throw new Error("Cranial tonal-pigment trace exceeds CP-F1 12kB bound");
    out.push(drawn("newhead-cranium-"+id+"-cross"+pass,
      strokePath,
      palette[band][pass],weights[pass],
      opacities[band]*[.93,1,.84][pass],
      173+band*4+pass*7));
  }
  return out;
}

export const NEW_CHARACTER_01_ID="head-silhouette-01" as const;
export const NEW_CHARACTER_01_STAGE="head-outline" as const;

/** Source-of-truth for this new head, shared by its drawing and native
 * Storybook construction overlay. These are generated mesh coordinates,
 * NOT independent source-photo landmarks or claims of ArtCraft acceptance.
 * Keep facial details absent until the whole head silhouette is approved.
 */
const NEW_HEAD_FACE={
  norm:"north-american-white" as const,sex:.69,eyeSpacing:.07,
  noseWidth:.02,noseLength:.10,lowerFace:.23,faceWidth:1.035,
};
const NEW_HEAD_YAW=17*Math.PI/180;
const projectNewHeadPoint=(vertex:readonly number[]):Point=>[
  r(224+1.36*(vertex[0]*Math.cos(NEW_HEAD_YAW)+
    (vertex[2]-50)*Math.sin(NEW_HEAD_YAW))),
  r(227-1.44*vertex[1]+.03*(vertex[2]-50)),
];
/**
 * Stage-1 five-value map from ACTUAL ANAT1 face-surface normals.
 *
 * The old rendering placed all material by 2D circles on an invented mask.
 * Instead, project the real 468-vertex, 898-triangle face and accumulate
 * area-weighted vertex normals. Dry-pencil contacts use barycentric points
 * on FRONT-FACING triangles, so the five optical value bands follow cheek,
 * brow, malar and mandibular volume rather than a screen-wide hatch field.
 *
 * Do not mislabel this as photographic fidelity: the ANAT1 face is an
 * averaged mesh and excludes the rear cranium. An independent photographed
 * source + measured landmarks still gate the ArtCraft portrait release.
 * We add only paper pigment, never facial-feature stickers or an image.
 */
function newHeadAnat1ValuePigment(
  face:ReturnType<typeof createFace>,seed:number,
):PencilTrace[]{
  const verts=face.vertices,triangles=face.mesh.faces;
  const normals:Point3[]=verts.map(()=>[0,0,0]);
  const cross=(a:Point3,b:Point3):Point3=>[
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0],
  ];
  const diff=(a:readonly number[],b:readonly number[]):Point3=>[
    a[0]-b[0],a[1]-b[1],a[2]-b[2],
  ];
  const norm=(v:Point3):Point3=>{
    const d=Math.hypot(...v)||1;
    return [v[0]/d,v[1]/d,v[2]/d];
  };
  const dot=(a:Point3,b:Point3)=>
    a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  for(let i=0;i<triangles.length;i+=3){
    const a=triangles[i],b=triangles[i+1],c=triangles[i+2];
    const nrm=cross(diff(verts[b],verts[a]),diff(verts[c],verts[a]));
    for(const ix of [a,b,c]){
      normals[ix][0]+=nrm[0];
      normals[ix][1]+=nrm[1];
      normals[ix][2]+=nrm[2];
    }
  }
  const light=norm([-.62,.58,.52]);
  const camera:Point3=[Math.sin(NEW_HEAD_YAW),0,Math.cos(NEW_HEAD_YAW)];
  const lit=normals.map(nrm=>dot(norm(nrm),light));
  const facing=normals.map(nrm=>dot(norm(nrm),camera));
  const screen=verts.map(projectNewHeadPoint);
  const values=[
    {name:"highlight",min:.72,color:"#F4D9BD",width:.25,opacity:.20},
    {name:"light",min:.47,color:"#DBB299",width:.30,opacity:.29},
    {name:"halftone",min:.19,color:"#B88B7E",width:.34,opacity:.38},
    {name:"core-shadow",min:-.07,color:"#7B6269",width:.42,opacity:.50},
    {name:"reflected-light",min:-Infinity,color:"#C7A39E",width:.28,opacity:.25},
  ] as const;
  type Surface={points:[Point,Point,Point];angle:number;weight:number};
  const palettes:Surface[][]=values.map(()=>[]);
  const totals=values.map(()=>0);
  for(let i=0;i<triangles.length;i+=3){
    const ids=[triangles[i],triangles[i+1],triangles[i+2]] as const;
    if(ids.some(ix=>facing[ix]<.16))continue;
    const p0=screen[ids[0]],p1=screen[ids[1]],p2=screen[ids[2]];
    const ax=p1[0]-p0[0],ay=p1[1]-p0[1];
    const bx=p2[0]-p0[0],by=p2[1]-p0[1];
    const det=ax*by-ay*bx,area=Math.abs(det)*.5;
    if(area<.12)continue;
    const lv=(lit[ids[0]]+lit[ids[1]]+lit[ids[2]])/3;
    const band=values.findIndex(value=>lv>=value.min);
    if(band<0)continue;
    // Tangents follow iso-light directions across the actual triangle.
    const dl1=lit[ids[1]]-lit[ids[0]];
    const dl2=lit[ids[2]]-lit[ids[0]];
    const gx=(dl1*by-dl2*ay)/det;
    const gy=(ax*dl2-bx*dl1)/det;
    const angle=Math.atan2(gx,-gy);
    palettes[band].push({
      points:[p0,p1,p2],
      angle:Number.isFinite(angle)?angle:0,
      weight:area,
    });
    totals[band]+=area;
  }
  if(palettes.some((p,i)=>p.length<9||totals[i]<25))
    throw new Error("ANAT1 face does not provide five visible value surfaces");
  const out:PencilTrace[]=[];
  values.forEach((value,band)=>{
    const surfaces=palettes[band],total=totals[band];
    const distribution:number[]=[];
    let acc=0;
    for(const surface of surfaces){acc+=surface.weight;distribution.push(acc);}
    for(let group=0;group<3;group++){
      const marks:string[]=[];
      // At actual 960×540, five equal-density value maps remained
      // physically sparse and read as floating scratches. Under the
      // same projected area, mass turns receive progressively more
      // short, low-pressure contacts than paper-reserved highlights.
      const density=[150,192,218,238,177][band];
      for(let n=0;n<density;n++){
        const key=band*9001+group*409+n;
        const v=pencilHash(seed,key,81)*total;
        let lo=0,hi=distribution.length-1;
        while(lo<hi){
          const mid=(lo+hi)>>1;
          if(v<distribution[mid])hi=mid;else lo=mid+1;
        }
        const tri=surfaces[lo];
        const root=Math.sqrt(pencilHash(seed,key,82));
        const split=pencilHash(seed,key,83);
        const a=1-root,b=root*(1-split),c=root*split;
        const [pa,pb,pc]=tri.points;
        const x=pa[0]*a+pb[0]*b+pc[0]*c;
        const y=pa[1]*a+pb[1]*b+pc[1]*c;
        const deviation=(pencilHash(seed,key,84)-.5)*.40;
        const angle=tri.angle+deviation;
        const vx=Math.cos(angle),vy=Math.sin(angle);
        const span=(1.8+3.0*pencilHash(seed,key,85))*
          (band===0?.80:band===3?.94:1);
        const curl=(pencilHash(seed,key,86)-.5)*.71;
        marks.push(line(
          [x-vx*span*.51,y-vy*span*.51],
          [x-vy*curl,y+vx*curl],
          [x+vx*span*.49-vy*curl*.25,
            y+vy*span*.49+vx*curl*.25],
        ));
      }
      out.push(drawn("newhead-anat1-"+value.name+"-"+group,
        marks.join(" "),value.color,value.width,value.opacity,
        194+band*8+group*4));
    }
  });
  return out;
}

export const NEW_CHARACTER_01_INSPECTION_KEYS=[
  "forehead","glabella","zygion.R","zygion.L",
  "cheekbone.R","cheekbone.L","gonion.R","gonion.L","menton",
] as const satisfies readonly (keyof typeof FACE_LANDMARKS)[];

export function newCharacterHeadInspectionAnchors(){
  const face=createFace(NEW_HEAD_FACE);
  return NEW_CHARACTER_01_INSPECTION_KEYS.map(id=>({
    id,point:projectNewHeadPoint(face.vertices[FACE_LANDMARKS[id]]),
  }));
}

/** Fresh original skull/vault blockout: measured lower face plus newly
 * authored parietal and frontal arch; NO previous woman silhouette. */
export function newCharacterHeadStageOne(seed=271,cranialVolume=true):PencilSubjectPart[]{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("New character study requires a valid drawing seed");
  if(typeof cranialVolume!=="boolean")
    throw new RangeError("Cranial pencil volume toggle must be boolean");
  // Fresh proportions, camera yaw, outline and local marks are independent
  // of pencilPortraitAnatomy() and the retired woman face() factory.
  const face=createFace(NEW_HEAD_FACE);
  const at=(key:keyof typeof FACE_LANDMARKS):Point=>
    projectNewHeadPoint(face.vertices[FACE_LANDMARKS[key]]);
  // Browser 960×540 review rejected the unmodified face MASK: it was a
  // flat-topped salmon shield, not a skull. MediaPipe deliberately STOPS at
  // the hairline and lacks the cranial vault. Keep the mesh's measured lower
  // face/jaw points, but lift an independently drafted vault from observed
  // head/skull construction ratios. This is still a FIRST-STAGE outline.
  const faceRing=FACE_FEATURES.oval.loop.map(i=>projectNewHeadPoint(face.vertices[i]));
  if(faceRing.length<30||faceRing.some(p=>p.some(v=>!Number.isFinite(v))))
    throw new Error("Missing ANAT1 facial outline anchor points");
  const faceTop=Math.min(...faceRing.map(p=>p[1]));
  const faceBottom=Math.max(...faceRing.map(p=>p[1]));
  const faceWidth=Math.max(...faceRing.map(p=>p[0]))-
    Math.min(...faceRing.map(p=>p[0]));
  // The cheek-temple interfaces are the FIRST anatomical points below
  // about 24% of the facial mask's projected height on each side.
  const templeLevel=faceTop+(faceBottom-faceTop)*.24;
  const rightTempleIndex=faceRing.findIndex((p,i)=>
    i>0&&p[1]>=templeLevel);
  // Repository TypeScript libs target pre-ES2023: explicit reverse
  // scan preserves deterministic source mesh ordering on every runtime.
  let leftTempleIndex=-1;
  for(let i=faceRing.length-1;i>rightTempleIndex;i--){
    if(faceRing[i][1]>=templeLevel){leftTempleIndex=i;break;}
  }
  if(rightTempleIndex<2||leftTempleIndex-rightTempleIndex<16)
    throw new Error("ANAT1 lacks two connected cheek/temple side chains");
  const lo=Math.min(...faceRing.map(p=>p[0]));
  const hi=Math.max(...faceRing.map(p=>p[0]));
  const centerX=(lo+hi)*.5;
  // ANAT1 supplies the REAL facial cheek/jaw chain but has no cranial
  // volume. Preserve all 23 measured lower-oval points, then apply a
  // bounded, smooth skin-volume recession only at the temporal hollow.
  // 3/4 reference: the temporal plane INSETS before the zygion emerges.
  // This is not a simple symmetrical head oval or a path traced from
  // another artist's portrait.
  const lower=faceRing.slice(rightTempleIndex,leftTempleIndex+1)
    .map(([x,y]):Point=>{
      const t=(y-faceTop)/(faceBottom-faceTop);
      const temporal=Math.exp(-Math.pow((t-.40)/.12,2));
      const malar=Math.exp(-Math.pow((t-.53)/.075,2));
      const side=x<centerX?-1:1;
      // The first rounded-vault candidate pinched BOTH temples into a
      // peanut silhouette: native 1x/2.15x art review rejected it even
      // though the earlier browser geometry gate was green. In a
      // slight 3/4 turn, the near temporal inset is visible; the far
      // contour remains mostly straight until its cheekbone turn.
      const recession=faceWidth*.042*temporal*(side===-1?1:.45);
      const cheekLift=faceWidth*.009*malar*(side===-1?1:.78);
      return [r(x-side*(recession-cheekLift)),y];
    });
  // A complete adult CRANIUM is a high convex parietal dome that flows
  // into a temporal narrowing, then flares over the cheekbones. The
  // original eight vault points reached almost the entire head width at
  // 15% of height (native browser scanline 0.953); that produced the
  // rejected square-top cylindrical/bucket silhouette.
  //
  // Technique/reference, NOT copied pixels: CC-BY-SA 3.0 photograph of
  // a 3/4 human skull by Circa24/Marijo Readey (Wikimedia Commons),
  // plus OpenStax 7.3 skull anatomy and ANAT1's independent face mask.
  // These 11 separately authored frontal/parietal points retain a
  // continuous contour and a mild off-axis dome apex at 17° yaw.
  const vault:Point[]=[
    [r(lo-faceWidth*.018),r(faceTop+faceWidth*.26)],
    [r(lo-faceWidth*.010),r(faceTop+faceWidth*.12)],
    [r(lo+faceWidth*.11),r(faceTop-faceWidth*.055)],
    [r(lo+faceWidth*.235),r(faceTop-faceWidth*.205)],
    [r(lo+faceWidth*.400),r(faceTop-faceWidth*.312)],
    [r(lo+faceWidth*.555),r(faceTop-faceWidth*.325)],
    [r(lo+faceWidth*.713),r(faceTop-faceWidth*.315)],
    [r(lo+faceWidth*.845),r(faceTop-faceWidth*.20)],
    [r(hi-faceWidth*.080),r(faceTop-faceWidth*.06)],
    [r(hi+faceWidth*.005),r(faceTop+faceWidth*.095)],
    [r(hi+faceWidth*.025),r(faceTop+faceWidth*.26)],
  ];
  const perimeter=[...lower,...vault];
  const contour=smoothPath(perimeter,true);
  const xs=perimeter.map(p=>p[0]),ys=perimeter.map(p=>p[1]);
  const x0=Math.min(...xs)-4,y0=Math.min(...ys)-4;
  const bounds:readonly [number,number,number,number]=[
    r(x0),r(y0),r(Math.max(...xs)-x0+4),r(Math.max(...ys)-y0+4),
  ];
  // Preserve open, useful negative space. These lines are temporary
  // *construction marks* for forehead/jaw/cheek only, not fake eyes/mouth.
  const forehead=at("forehead"),glabella=at("glabella");
  const leftCheek=at("cheekbone.L"),rightCheek=at("cheekbone.R");
  const leftJaw=at("gonion.L"),rightJaw=at("gonion.R");
  const chin=at("menton"),zyL=at("zygion.L"),zyR=at("zygion.R");
  const guides:readonly (readonly [Point,Point,Point])[]=[
    [forehead,glabella,chin],
    [zyR,rightCheek,rightJaw],
    [zyL,leftCheek,leftJaw],
  ];
  // Stage 1 is PENCIL CONSTRUCTION on paper, not fully opaque dermal
  // paint. The previous flat salmon wax mask was rejected in native proof.
  const palette:PencilPalette=["#B1978A","#82707A","#E0C3A6"];
  return [{
    id:NEW_CHARACTER_01_ID,material:"glaze",palette,path:contour,
    bounds,direction:64,flow:11,start:73,
    details:[
      ...newHeadPlanePigment(bounds,(seed+1831)%2147483647),
      ...(cranialVolume?newHeadCranialTonalVolume(
        bounds,(seed+1957)%2147483647):[]),
      ...newHeadAnat1ValuePigment(face,(seed+2393)%2147483647),
      ...newHeadValuePencil(guides,(seed+1001)%2147483647),
      drawn("newhead-sagittal-guide",line(forehead,glabella,chin),
        "#90777C",.32,.31,103),
      drawn("newhead-zygomatic-guides",
        line(zyR,rightCheek,rightJaw)+" "+line(zyL,leftCheek,leftJaw),
        "#987B7B",.33,.46,139),
      drawn("newhead-mandibular-hinge",
        line(rightJaw,chin,leftJaw),"#7E6871",.36,.43,165),
      drawn("newhead-orbital-placement-only",
        line(at("exocanthion.R"),glabella,at("exocanthion.L")),
        "#B39D97",.28,.24,174),
      // Partial nested skull vault line is observed construction, NOT hair.
      drawn("newhead-cranial-vault-turn",
        line([vault[2][0]+8,vault[2][1]+20],
          [vault[5][0],vault[5][1]+31],
          [vault[8][0]-9,vault[8][1]+25]),
        "#A58C85",.33,.35,153),
    ],
  }];
}
