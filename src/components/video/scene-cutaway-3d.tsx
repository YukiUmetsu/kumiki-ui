/** Opt-in authored 3D material-cutaway showcase.
 * Uses the existing crafted HeroAssetViewer, not CSS pretending to be mesh 3D.
 * Original geometric fixture; no third-party models, fonts, or texture rights.
 * It intentionally remains a Storybook/host adapter, not a mandatory dependency
 * of scene-template-foundation or its 2D browser export.
 */
import { useMemo } from "react";
import { BoxGeometry, CylinderGeometry, EdgesGeometry, Group, LineSegments,
  LineBasicMaterial, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { createAssetResources } from "../../../registry/craft/hero-asset";
import type { HeroAsset } from "../../../registry/craft/hero-asset";
import { HeroAssetViewer } from "../../../registry/craft/hero-viewer";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";

const palette=[
  {body:"#b5dce0",edge:"#d7f9ef",metalness:.25,roughness:.28},
  {body:"#318c9c",edge:"#a7e6e4",metalness:.64,roughness:.24},
  {body:"#b99667",edge:"#f2dbaf",metalness:.68,roughness:.3},
  {body:"#596b96",edge:"#c1cef2",metalness:.45,roughness:.38},
] as const;
const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
const ease=(t:number)=>{const p=clamp01(t);return p*p*(3-2*p);};
/** Creates a real scene graph with independently animated, solid section layers.
 * Inertial motion is evaluated only from the requested frame; scrubbing and
 * non-linear capture remain deterministic.
 */
export function createCutawayHero(spec:SceneTemplateSpec<"layered-cutaway">):HeroAsset {
  const res=createAssetResources();
  const group=new Group();
  const slabs:Mesh[]=[];
  const unit=3.1;
  const count=spec.content.layers.length;
  const countSpan=Math.max(1,count-1);
  const thickness=.27;
  const pcb=res.own(new MeshStandardMaterial({color:"#133d4e",roughness:.43,metalness:.56}));
  const copper=res.own(new MeshStandardMaterial({color:"#d5a66a",roughness:.24,metalness:.68}));
  const screwGeo=res.own(new CylinderGeometry(.07,.07,.07,12));
  const railGeo=res.own(new BoxGeometry(.075,.024,unit*.76));
  for(let index=0;index<count;index++){
    const colors=palette[index%palette.length];
    const shell=res.own(new MeshPhysicalMaterial({
      color:colors.body,metalness:colors.metalness,roughness:colors.roughness,
      clearcoat:.56,clearcoatRoughness:.18,
      transmission:index===0?.16:0,thickness:.35,
    }));
    const edgeMat=res.own(new LineBasicMaterial({color:colors.edge}));
    const slabGeo=res.own(new BoxGeometry(unit,thickness,unit*.77));
    const slab=new Mesh(slabGeo,shell);
    slab.castShadow=true;slab.receiveShadow=true;
    // Authored at rest as a physically stacked assembly: upper slabs lift
    // in world Y, allowing viewers to look through every real geometric gap.
    slab.position.y=.2+(count-1-index)*.29;
    slab.userData.baseY=slab.position.y;
    slab.rotation.y=-.06;
    group.add(res.name(slab,spec.content.layers[index].id));
    slabs.push(slab);
    const outlines=new LineSegments(res.own(new EdgesGeometry(slabGeo)),edgeMat);
    slab.add(outlines);
    // Mount fasteners on the real surface rather than flat screen overlays.
    for(const x of [-unit*.4,unit*.4])for(const z of [-unit*.29,unit*.29]){
      const screw=new Mesh(screwGeo,copper);
      screw.castShadow=true;
      screw.position.set(x,thickness/2+.035,z);
      slab.add(screw);
    }
    if(index===1 || index===2){
      for(const x of [-.75,-.33,.1,.53]){
        const trace=new Mesh(railGeo,pcb);
        trace.position.set(x,thickness/2+.018,0);
        slab.add(trace);
      }
    }
  }
  // Mechanical guide pillars remain attached to the bottom of the assembly.
  const postMat=res.own(new MeshStandardMaterial({color:"#d4e7e7",roughness:.31,metalness:.74}));
  const postGeo=res.own(new CylinderGeometry(.045,.045,2.8,16));
  for(const x of [-1.22,1.22])for(const z of [-.87,.87]){
    const post=new Mesh(postGeo,postMat);
    post.castShadow=true;
    post.position.set(x,.68,z);
    group.add(post);
  }
  const maxExplode=(Math.min(3,count)*.56)+1;
  return {
    id:"scene-cutaway-"+spec.id,group,bounds:{
      min:[-2,-.4,-2],max:[2,count*.52+maxExplode+1,2],
    },parts:res.parts,tier:"hero",metersPerUnit:.08,exposure:.94,
    studio:{palette:"midnight",keyAzimuth:50,rimColor:"#79e2d2"},
    craft:{materials:["glass-coated polymer","brushed titanium","copper alloy"],
      details:["solid plate thickness","machined screw mounts","layer separation","studio reflections"]},
    pose(state){
      const travel=ease((state.frame-20)/72);
      slabs.forEach((slab,i)=>{
        const offset=travel*(count-1-i)*.58;
        slab.position.y=Number(slab.userData.baseY)+offset;
        slab.rotation.y=-.06+travel*.15;
        slab.rotation.z=Math.sin(travel*Math.PI)*(i-countSpan*.5)*.012;
      });
    },
    dispose:()=>res.dispose(),
  };
}
export function CutawayHero3D({spec,frame,reducedMotion=false}:{
  spec:SceneTemplateSpec<"layered-cutaway">;frame:number;reducedMotion?:boolean;
}){
  const createAsset=useMemo(()=>()=>createCutawayHero(spec),[spec]);
  const travel=reducedMotion?1:ease((frame-20)/72);
  return <div data-km-premium-cutaway-3d="" data-km-3d-travel={travel.toFixed(3)}
    style={{position:"relative",width:"100%",aspectRatio:"16 / 9",
      background:"#0b2036",borderRadius:18,overflow:"hidden",
      border:"1px solid rgba(172,241,233,.2)",color:"#e6f3f1"}}>
    <HeroAssetViewer data-km-frame-addressed="" createAsset={createAsset} width={960} height={540} action="explode"
      actionFrame={reducedMotion?119:frame} fps={30}
      azimuth={24+travel*18} elevation={22+travel*9}
      zoom={.95+travel*.08} pixelRatio={1.25}
      ariaLabel={"Animated 3D material cutaway of "+spec.content.relationship}
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
    <div aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none",
      background:"linear-gradient(90deg,rgba(3,22,38,.68),transparent 48%,rgba(4,21,38,.25))"}}/>
    <div style={{position:"absolute",left:"5%",top:"8%",maxWidth:"42%",
      pointerEvents:"none",textShadow:"0 2px 13px #081927"}}>
      <div style={{fontSize:12,letterSpacing:3,opacity:.73}}>MATERIAL ANATOMY</div>
      <div style={{fontSize:"clamp(17px,2.3vw,28px)",fontWeight:770,lineHeight:1.19,marginTop:6}}>
        {spec.content.relationship}
      </div>
    </div>
    <div style={{position:"absolute",right:"4%",bottom:"10%",width:"26%",
      display:"grid",gap:5,pointerEvents:"none"}}>
      {spec.content.layers.map((layer,i)=><div key={layer.id}
        style={{background:"rgba(6,25,43,.77)",padding:"5px 9px",
          borderLeft:"2px solid #8ae3d2",fontSize:"clamp(10px,1.25vw,15px)",
          opacity:reducedMotion||travel>(i+1)/(spec.content.layers.length+1)?1:.4}}>
        <span style={{opacity:.6,paddingRight:8}}>{i+1}</span>{layer.label}
      </div>)}
    </div>
  </div>;
}
