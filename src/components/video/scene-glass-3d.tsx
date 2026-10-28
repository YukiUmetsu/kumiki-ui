/** Optional real 3D transmission/glass showcase built on Kumiki's HeroAssetViewer.
 * The reusable 2D scene recipe keeps its GPU-free translucent fallback.
 * All geometry is original. No external model, HDRI or texture is downloaded.
 */
import { useMemo } from "react";
import {
  BoxGeometry, CylinderGeometry, EdgesGeometry, Group, LineBasicMaterial,
  LineSegments, Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
} from "three";
import { createAssetResources } from "../../../registry/craft/hero-asset";
import type { HeroAsset } from "../../../registry/craft/hero-asset";
import { HeroAssetViewer } from "../../../registry/craft/hero-viewer";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";

const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
/** Frame-accurate pose with no accumulating transforms or wall-clock animation. */
export function physicalGlassPose(frame:number,index:number,reducedMotion=false) {
  const p=reducedMotion?1:smooth((frame-(22+index*10))/Math.max(1,44+index*5));
  return {
    x:(index-1)*1.67+(1-p)*(index===1?0:index===0?-2.8:2.8),
    y:.1+(1-p)*-.9,z:.05+index*.12+(1-p)*-1.4,
    rotationY:(index-1)*-.16+(1-p)*(index===0?-.57:index===1?.52:.62),
    progress:p,
  };
}
export function createPhysicalGlassAsset(spec:SceneTemplateSpec<"glass-data-reveal">):HeroAsset {
  const res=createAssetResources();
  const group=new Group();
  const panels:Mesh[]=[];
  const surfaceGeo=res.own(new BoxGeometry(1.35,1.95,.17));
  const outlineGeo=res.own(new EdgesGeometry(surfaceGeo));
  const chrome=res.own(new LineBasicMaterial({color:"#cdf8ec",transparent:true,opacity:.75}));
  const backWall=res.own(new MeshStandardMaterial({
    color:"#102a4a",roughness:.31,metalness:.67,
  }));
  const housing=res.own(new BoxGeometry(5.6,3.6,.35));
  const wall=new Mesh(housing,backWall);
  wall.position.set(0,0,-1.5);wall.receiveShadow=true;
  group.add(res.name(wall,"reflective-backdrop"));
  // Objects behind the glass provide a real image for its transmission shader.
  const stripGeo=res.own(new BoxGeometry(.04,2.6,.11));
  const stripMat=res.own(new MeshStandardMaterial({
    color:"#2cc4b2",emissive:"#159f9c",emissiveIntensity:1.7,roughness:.48,
  }));
  for(let i=-9;i<=9;i++){
    const strip=new Mesh(stripGeo,stripMat);
    strip.position.set(i*.29,0,-1.22);
    group.add(strip);
  }
  const ringGeo=res.own(new CylinderGeometry(.32,.32,.05,36));
  const ringMaterial=res.own(new MeshStandardMaterial({
    color:"#d1af76",metalness:.92,roughness:.21,
  }));
  for(const [i,place] of spec.content.panels.entries()){
    const glass=res.own(new MeshPhysicalMaterial({
      color:i%2===0?"#bceff2":"#b3c7f6",
      metalness:0,roughness:.06,transmission:.92,thickness:.38,
      ior:1.48,clearcoat:1,clearcoatRoughness:.06,
      envMapIntensity:1.3,
    }));
    const panel=new Mesh(surfaceGeo,glass);
    panel.castShadow=true;panel.receiveShadow=true;
    panel.name="optical-pane-"+place.id;
    group.add(res.name(panel,"optical-pane-"+place.id));
    const rim=new LineSegments(outlineGeo,chrome);
    panel.add(rim);
    panels.push(panel);
  }
  // A physical golden control puck grounds the authored materials.
  const puck=new Mesh(ringGeo,ringMaterial);
  puck.position.set(0,-1.35,-.1);puck.castShadow=true;
  group.add(res.name(puck,"control-puck"));
  const base={min:[-3.8,-2,-2.2] as const,max:[3.8,2.3,2] as const};
  return {
    id:"physical-glass-"+spec.id,group,bounds:base,parts:res.parts,
    tier:"hero",metersPerUnit:.1,exposure:.97,
    studio:{palette:"midnight",rimColor:"#76e3d1",keyAzimuth:48},
    craft:{materials:["thick dielectric glass, IOR 1.48","polished gold metal",
      "brushed steel backing"],details:["mesh transmission","environment reflections",
      "multiple separate panes","source lighting seen through solid refraction"]},
    pose(state) {
      panels.forEach((panel,index)=>{
        const pos=physicalGlassPose(state.frame,index);
        panel.position.set(pos.x,pos.y,pos.z);
        panel.rotation.y=pos.rotationY;
        panel.rotation.x=(1-pos.progress)*-.12;
      });
    },
    dispose:()=>res.dispose(),
  };
}
export function PhysicalGlassHero3D({spec,frame,reducedMotion=false}:{
  spec:SceneTemplateSpec<"glass-data-reveal">;frame:number;reducedMotion?:boolean;
}){
  const createAsset=useMemo(()=>()=>createPhysicalGlassAsset(spec),[spec]);
  return <div data-km-physical-glass-3d="" style={{position:"relative",
    aspectRatio:"16 / 9",width:"100%",overflow:"hidden",borderRadius:16,
    background:"#0a2035",color:"#e7f9f3",
    border:"1px solid rgba(162,255,237,.22)"}}>
    <HeroAssetViewer createAsset={createAsset} width={960} height={540}
      action="introduce" actionFrame={reducedMotion?119:frame} fps={30}
      azimuth={16} elevation={8} zoom={.87}
      pixelRatio={1.25} ariaLabel="Real transmitted glass plates with studio reflections"
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
    <div aria-hidden="true" style={{position:"absolute",inset:0,
      background:"linear-gradient(90deg,rgba(4,26,44,.65),transparent 56%)",
      pointerEvents:"none"}}/>
    <div style={{position:"absolute",left:"5%",top:"9%",maxWidth:"35%",
      pointerEvents:"none",textShadow:"0 2px 12px #001426"}}>
      <div style={{fontSize:12,letterSpacing:2.4,opacity:.77}}>PHYSICAL GLASS · 3D MATERIAL</div>
      <div style={{marginTop:8,fontSize:"clamp(19px,2.6vw,30px)",
        fontWeight:750,lineHeight:1.19}}>Real transmission, not CSS blur.</div>
    </div>
    <div style={{position:"absolute",bottom:"7%",left:"6%",right:"6%",
      display:"flex",gap:10,justifyContent:"space-between",
      pointerEvents:"none"}}>
      {spec.content.panels.map((panel,i)=>{
        const p=physicalGlassPose(frame,i,reducedMotion).progress;
        return <div key={panel.id} style={{minWidth:0,flex:1,
          borderLeft:"2px solid #82dace",
          background:"rgba(9,27,46,.82)",padding:"7px 11px",
          opacity:Math.max(.35,p),
          fontSize:"clamp(11px,1.1vw,16px)"}}>
          <strong>{panel.label}</strong>
          <div style={{fontSize:".83em",opacity:.84,marginTop:3}}>{panel.text}</div>
        </div>;
      })}
    </div>
  </div>;
}
