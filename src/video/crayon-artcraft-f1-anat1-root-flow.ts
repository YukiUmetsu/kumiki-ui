import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

/**
 * ArtCraft F1 V39 / !dev: physically connected root-to-shaft wax gesture
 * trial on the source photograph's EXISTING three hair masses.
 *
 * These 608x1082 source-space cubic guides refine the earlier V38 dark
 * wax shading without replacing the 267 individual pre-existing hair
 * subcurves, the parent's four wax shapes or the underlying face.
 * The real CC0 portrait is Christopher Campbell's 2015 photograph,
 * https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg
 * Source crop registration and original image byte limitations are
 * recorded in docs/research/crayon-f1-anat1-hair-luminance-v38-2026-11-16.md.
 *
 * The guide anchors are reconstructed from the previously drawn and
 * documented source hair rails; NOT newly measured photographic pixels.
 * These are candidate wax paths for independent 1x/3x art review, and
 * must not be presented as verified realism or released as finished art.
 */
type Point = readonly [number,number];
type Guide = readonly [number,number,number,number,number,number,number,number];
type Region = "crown"|"left"|"right";
const hairGuides:Readonly<Record<Region,readonly Guide[]>>={
  crown:[
    [257,207,221,211,168,246,126,293],
    [281,202,247,191,207,204,164,240],
    [304,210,337,219,382,251,418,298],
    [331,221,369,248,407,291,437,354],
    [351,237,380,264,416,321,447,386],
  ],
  left:[
    [35,366,31,542,42,894,57,1084],
    [46,338,54,539,62,903,72,1089],
    [61,316,65,525,86,858,92,1089],
    [76,292,73,520,91,868,107,1090],
    [87,356,80,565,102,892,110,1088],
  ],
  right:[
    [452,315,469,493,474,837,481,1080],
    [466,340,495,527,493,884,497,1088],
    [476,361,506,561,513,898,519,1091],
    [485,399,523,625,543,919,544,1084],
    [495,420,542,632,555,948,562,1092],
    [507,467,552,671,573,917,584,1090],
  ],
};
const parent:Record<Region,string>={
  crown:"hair-crown-surface",
  left:"hair-left-curtain",
  right:"hair-right-curtain",
};
const fmt=(a:number)=>a.toFixed(2);
function point(g:Guide,t:number):Point{
  const s=1-t;
  return [
    s*s*s*g[0]+3*s*s*t*g[2]+3*s*t*t*g[4]+t*t*t*g[6],
    s*s*s*g[1]+3*s*s*t*g[3]+3*s*t*t*g[5]+t*t*t*g[7],
  ];
}
function tangent(g:Guide,t:number):Point{
  const s=1-t;
  return [
    3*s*s*(g[2]-g[0])+6*s*t*(g[4]-g[2])+3*t*t*(g[6]-g[4]),
    3*s*s*(g[3]-g[1])+6*s*t*(g[5]-g[3])+3*t*t*(g[7]-g[5]),
  ];
}
/** Subsegment of an original cubic; no disconnected straight hair ticks. */
function depositedRoot(g:Guide,t0:number,t1:number,offset:number):string{
  const a=point(g,t0),b=point(g,t1);
  const da=tangent(g,t0),db=tangent(g,t1);
  const la=Math.hypot(...da)||1,lb=Math.hypot(...db)||1;
  const begin:[number,number]=[
    a[0]-da[1]/la*offset,a[1]+da[0]/la*offset,
  ];
  const end:[number,number]=[
    b[0]-db[1]/lb*offset,b[1]+db[0]/lb*offset,
  ];
  const scale=(t1-t0)/3;
  const c1:[number,number]=[
    begin[0]+da[0]*scale,begin[1]+da[1]*scale,
  ];
  const c2:[number,number]=[
    end[0]-db[0]*scale,end[1]-db[1]*scale,
  ];
  const coords=[...begin,...c1,...c2,...end];
  if(coords.some(n=>!Number.isFinite(n)||n< -8||n>1098))
    throw new RangeError("V39 source-root guide escaped camera");
  return "M"+fmt(begin[0])+" "+fmt(begin[1])+
    " C"+fmt(c1[0])+" "+fmt(c1[1])+
    " "+fmt(c2[0])+" "+fmt(c2[1])+
    " "+fmt(end[0])+" "+fmt(end[1]);
}
export const CRAYON_F1_V39_ROOT_REGIONS=Object.freeze(["crown","left","right"] as const);

/** Preserve each V38 hair path as a byte-identical PREFIX. Append small
 * source-led, clipped root/shaft gestures inside native group contours.
 * No SVG nodes, elements, filters, raster, extra playback clock, gradients,
 * strokes or original artist-authored microgeometry are removed.
 */
export function crayonF1AddRootedHairFlow(
  elements:readonly CrayonElement[],detail:number,
):CrayonElement[]{
  if(!Number.isFinite(detail)||detail<.2||detail>1)
    throw new RangeError("Invalid source hair study detail");
  const existing=new Map<Region,Map<number,Extract<CrayonElement,{kind:"contour"}>>>();
  const waxMasses=new Set<string>();
  const seen=new Set<string>();
  for(const region of CRAYON_F1_V39_ROOT_REGIONS)existing.set(region,new Map());
  for(const el of elements){
    if(seen.has(el.id))throw new RangeError("Duplicate source hair or feature "+el.id);
    seen.add(el.id);
    if(Object.values(parent).includes(el.id)||el.id==="hair-back"){
      if(el.kind!=="wax")throw new RangeError("Source hair wax missing "+el.id);
      waxMasses.add(el.id);
    }
    if(!el.id.startsWith("hair-rooted-"))continue;
    const m=/^hair-rooted-(crown|left|right)-([0-5])$/.exec(el.id);
    if(!m||el.kind!=="contour"||el.parentId!==parent[m[1] as Region]||
       el.clipToParent!==true||!el.d.startsWith("M"))
      throw new RangeError("Disconnected original source hair "+el.id);
    existing.get(m[1] as Region)!.set(Number(m[2]),el);
  }
  if(waxMasses.size!==4)throw new RangeError("Incomplete source hair volume");
  const appended=new Map<string,string>();
  for(const region of CRAYON_F1_V39_ROOT_REGIONS){
    const bands=existing.get(region)!;
    if(!bands.size)throw new RangeError("Missing source hair fibers "+region);
    const ids=[...bands.keys()].sort((a,b)=>a-b);
    // More guides only for high-detail inspection; low detail preserves
    // true source allocation with no assumed contiguous band indices.
    const guideCount=Math.max(1,Math.round(hairGuides[region].length*detail));
    for(let i=0;i<guideCount;i++){
      const g=hairGuides[region][i];
      const band=ids[i%ids.length];
      const id="hair-rooted-"+region+"-"+band;
      // Two unequal root-to-mid curves with a narrow native-wax offset,
      // deliberately avoiding uniform graphic stripes and mirrored locks.
      const t0=.018+(i%3)*.009;
      const t1=.43+(i%4)*.055;
      const a=depositedRoot(g,t0,t1,-.72+(i%3)*.11);
      const b=depositedRoot(g,t0+.03,t1-.07,.67+(i%2)*.23);
      appended.set(id,(appended.get(id)??"")+" "+a+" "+b);
    }
  }
  if(appended.size<3)throw new RangeError("No natural root continuations");
  return elements.map(el=>{
    const suffix=appended.get(el.id);
    return suffix&&el.kind==="contour"?{...el,d:el.d+suffix}:el;
  });
}
