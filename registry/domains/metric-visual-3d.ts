/** Real Three.js metric geometry. No camera, interval timer, SVG substitute
 * or invented 3D measurements: vertical position uses the same 2D domain.
 */
import {
  BoxGeometry, BufferGeometry, Color, CylinderGeometry, DirectionalLight,
  DoubleSide, HemisphereLight, Mesh, MeshPhysicalMaterial,
  MeshStandardMaterial, Scene, SphereGeometry, Vector3,
} from "three";
import { metricRevealProgress, resolveMetricVisual } from "./metric-model";
import type { MetricReveal, MetricVisualSpec } from "./metric-model";
import type { CameraScene3D } from "../motion/camera-viewport-3d";

export interface MetricScene3D extends CameraScene3D {
  model: ReturnType<typeof resolveMetricVisual>;
}
export interface MetricScene3DOptions {
  reveal?:MetricReveal;
  colors?: { primary?:string; positive?:string; negative?:string; neutral?:string };
}
const FINISH={primary:"#9990FF",positive:"#71E7C4",negative:"#FF859E",neutral:"#66B7D2"};
const WORLD={width:10,height:5.2,depth:1.4};
/** All geometries/materials created by this scene are disposed by its owner. */
export function createMetricScene3D(
  spec:MetricVisualSpec,options:MetricScene3DOptions={},
):MetricScene3D {
  const model=resolveMetricVisual(spec), scene=new Scene();
  scene.background=new Color("#091923");
  const resources:(BufferGeometry|MeshStandardMaterial)[]=[];
  const own=<T extends BufferGeometry|MeshStandardMaterial>(item:T):T=>{
    resources.push(item);return item;
  };
  const matte=own(new MeshStandardMaterial({color:"#1D3541",roughness:.92,metalness:.07}));
  const gridMaterial=own(new MeshStandardMaterial({
    color:"#375565",roughness:1,transparent:true,opacity:.48,side:DoubleSide,
  }));
  const zeroMaterial=own(new MeshStandardMaterial({color:"#809AAA",metalness:.3,roughness:.5}));
  const light=new DirectionalLight("#F8F5FF",3.5);
  light.position.set(4,9,9);light.castShadow=true;
  light.shadow.mapSize.set(1024,1024);
  const fill=new DirectionalLight("#78BBDE",1.7);fill.position.set(-6,4,2);
  scene.add(new HemisphereLight("#A5E9FF","#182632",2),light,fill);
  const floor=new Mesh(own(new BoxGeometry(12,.18,4.6)),matte);
  floor.position.set(0,-.38,-.1);floor.receiveShadow=true;scene.add(floor);
  const [min,max]=model.domain;
  const height=(value:number)=>((value-min)/(max-min))*WORLD.height;
  // Fixed-width grid bars emphasize scale without a misleading truncated zero
  // (trend scale disclosure remains visible in the HTML overlay).
  for(let i=0;i<5;i++){
    const line=new Mesh(own(new BoxGeometry(11,.012,.035)),gridMaterial);
    line.position.set(0,i*WORLD.height/4,-.85);
    scene.add(line);
  }
  if(min<=0&&max>=0){
    const axis=new Mesh(own(new BoxGeometry(11,.045,.055)),zeroMaterial);
    axis.position.set(0,height(0),-.48);scene.add(axis);
  }
  const barGeometry=own(new BoxGeometry(1,1,1));
  const sphereGeometry=own(new SphereGeometry(.135,24,16));
  const tubeGeometry=own(new CylinderGeometry(.065,.065,1,14));
  const columnMeshes:Mesh[]=[];
  const pointMeshes:Array<Mesh|null>=[];
  const connectors:Array<Mesh|null>=[];
  const palette={...FINISH,...options.colors};
  const materials={} as Record<keyof typeof FINISH,MeshPhysicalMaterial>;
  for(const tone of Object.keys(FINISH) as (keyof typeof FINISH)[]){
    materials[tone]=own(new MeshPhysicalMaterial({
      color:palette[tone],roughness:.28,metalness:.52,
      clearcoat:.54,clearcoatRoughness:.22,
      emissive:palette[tone],emissiveIntensity:.10,
    }));
  }
  const n=model.marks.length;
  const space=WORLD.width/n;
  const x=(i:number)=>(i+.5-n/2)*space;
  if(model.kind==="trend"){
    model.marks.forEach((m,i)=>{
      if(m.value===null){pointMeshes.push(null);connectors.push(null);return;}
      const point=new Mesh(sphereGeometry,materials.primary);
      point.position.set(x(i),height(m.value),0);
      point.castShadow=true;
      point.userData={semanticId:m.id,role:"value",value:m.value};
      scene.add(point);pointMeshes.push(point);
      const previous=model.marks[i-1];
      if(i>0&&previous.value!==null){
        const connector=new Mesh(tubeGeometry,materials.primary);
        connector.userData={semanticId:m.id,role:"trend-segment"};
        scene.add(connector);connectors.push(connector);
      }else connectors.push(null);
    });
  }else{
    model.marks.forEach(m=>{
      const column=new Mesh(barGeometry,materials[m.tone]);
      column.castShadow=true;column.receiveShadow=true;
      column.userData={semanticId:m.id,role:"metric-column",value:m.value,
        from:m.from,to:m.to};
      scene.add(column);columnMeshes.push(column);
    });
  }
  const up=new Vector3(0,1,0);
  function updateFrame(frame:number):void{
    model.marks.forEach((mark,index)=>{
      const t=metricRevealProgress(index,frame,options.reveal);
      if(model.kind==="trend"){
        const point=pointMeshes[index];
        if(point){point.visible=t>0;point.scale.setScalar(Math.max(.001,t));}
        const line=connectors[index];
        if(line && mark.value!==null && model.marks[index-1].value!==null){
          const from=new Vector3(x(index-1),height(model.marks[index-1].value!),0);
          const end=new Vector3(x(index),height(mark.value),0);
          const tip=from.clone().lerp(end,t);
          const diff=tip.clone().sub(from);
          const length=diff.length();
          line.visible=t>0&&length>.001;
          line.scale.set(1,Math.max(length,.001),1);
          line.position.copy(from).add(tip).multiplyScalar(.5);
          line.quaternion.setFromUnitVectors(up,diff.normalize());
        }
      }else{
        const column=columnMeshes[index],start=model.kind==="waterfall"?mark.from:0;
        const end=start+(mark.to-start)*t;
        const h=Math.abs(height(end)-height(start));
        column.visible=t>0 && h>.001;
        column.position.set(x(index),(height(start)+height(end))/2,0);
        column.scale.set(Math.min(.88,space*.62),Math.max(.001,h),WORLD.depth);
      }
    });
  }
  updateFrame(Number.MAX_SAFE_INTEGER);
  return {scene,model,updateFrame,dispose(){
    for(const resource of resources)resource.dispose();
    scene.clear();
  }};
}
