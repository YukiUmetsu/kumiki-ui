/** Procedural finance/business objects with real Three.js meshes, independent
 * of fonts/models/remote assets. Own all geometries/materials and dispose.
 */
import {
  BoxGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight,
  DoubleSide, ExtrudeGeometry, Group, HemisphereLight, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, Scene, Shape, SphereGeometry,
} from "three";
import { financeObjectProgress, resolveFinanceObject } from "./finance-object-model";
import type { FinanceObjectSpec, FinanceObjectArchetype } from "./finance-object-model";
import type { CameraScene3D } from "../motion/camera-viewport-3d";

export interface FinanceObjectScene3D extends CameraScene3D {
  root:Group;
  semanticId:string;
}
export interface FinanceObjectSceneOptions {
  startFrame?:number;
  revealFrames?:number;
}
export function createFinanceObjectScene3D(
  spec:FinanceObjectSpec,opts:FinanceObjectSceneOptions={},
):FinanceObjectScene3D {
  const item=resolveFinanceObject(spec);
  const scene=new Scene();
  scene.background=new Color("#081925");
  const geometry=new Set<BoxGeometry|CylinderGeometry|SphereGeometry|ExtrudeGeometry|ConeGeometry>();
  const materials=new Set<MeshStandardMaterial>();
  const owned=<T extends BoxGeometry|CylinderGeometry|SphereGeometry|ExtrudeGeometry|ConeGeometry>(g:T):T=>{
    geometry.add(g);return g;
  };
  const material=(hex:string,metalness=.34,roughness=.38)=>{
    const m=new MeshPhysicalMaterial({color:hex,metalness,roughness,
      clearcoat:.5,clearcoatRoughness:.21,side:DoubleSide});
    materials.add(m);return m;
  };
  const accent=material(item.accent??"#62DDCE",.42,.22);
  const white=material("#E4F3F8",.22,.3);
  const dark=material("#183545",.54,.3);
  const darkGlass=material("#2E5971",.25,.18);
  const gold=material("#E6C272",.76,.18);
  const muted=material("#86A7B9",.34,.39);
  const root=new Group();
  root.userData={semanticId:item.id,kind:item.kind,archetype:item.archetype};
  scene.add(root);
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:MeshStandardMaterial)=>{
    const obj=new Mesh(owned(new BoxGeometry(w,h,d)),m);
    obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;
    root.add(obj);return obj;
  };
  const round=(radius:number,height:number,x:number,y:number,z:number,
    m:MeshStandardMaterial,turn=false)=>{
    const mesh=new Mesh(owned(new CylinderGeometry(radius,radius,height,48)),m);
    mesh.position.set(x,y,z);if(turn)mesh.rotation.x=Math.PI/2;
    mesh.castShadow=true;root.add(mesh);return mesh;
  };
  const ball=(radius:number,x:number,y:number,z:number,m:MeshStandardMaterial,
    sx=1,sy=1,sz=1)=>{
    const mesh=new Mesh(owned(new SphereGeometry(radius,28,20)),m);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;
    root.add(mesh);return mesh;
  };
  const cap=(x:number,y:number,z:number)=>box(.19,.06,.065,x,y,z,white);
  function document(){
    box(1.75,2.35,.12,0,1.30,0,white);
    box(1.03,.13,.17,-.19,2.04,.1,accent);
    for(let i=0;i<4;i++)box(1.27,.055,.13,0,1.77-i*.28,.11,muted);
    box(.52,.065,.15,.34,.49,.12,accent);
  }
  function coin(x:number,y:number,z:number,r=.45){
    const c=round(r,.14,x,y,z,gold,true);
    c.rotation.z=.09;
    const emboss=box(.12,r*.96,.08,x,y,z+.09,dark);
    emboss.rotation.z=.08;
    cap(x,y+.08,z+.14);cap(x,y-.08,z+.14);
  }
  function building(){
    box(3.3,.19,1.55,0,.2,0,dark);
    box(3.05,.16,1.43,0,2.42,0,accent);
    const roof=new Mesh(owned(new ConeGeometry(1.94,.65,4,1)),accent);
    roof.rotation.y=Math.PI/4;roof.position.set(0,2.86,0);
    roof.scale.z=.52;roof.castShadow=true;root.add(roof);
    for(const x of [-1.13,-.38,.38,1.13]){
      box(.30,1.69,.45,x,1.31,.12,white);
      box(.45,.15,.62,x,2.18,.12,accent);
      box(.45,.12,.62,x,.46,.12,accent);
    }
  }
  function card(){
    const o=box(3.35,2.05,.17,0,1.40,0,accent);
    o.rotation.y=-.13;
    box(3.34,.38,.19,0,1.87,.04,dark);
    box(.68,.46,.21,-.85,1.35,.065,gold);
    box(1.1,.075,.2,-.55,.78,.07,white);
    for(let i=0;i<3;i++)round(.17,.035,.97+i*.19,1.06,.105,white,true);
  }
  function terminal(){
    const shell=box(2.08,3.08,1.1,0,1.65,0,dark);
    shell.rotation.x=-.045;
    box(1.6,1.03,.17,0,2.33,.6,darkGlass);
    box(.87,.18,.2,0,2.42,.72,accent);
    for(let i=0;i<9;i++)box(.3,.19,.13,
      -.44+(i%3)*.44,1.57-Math.floor(i/3)*.33,.63,i===8?accent:muted);
    box(.87,.08,.12,0,.66,.62,white);
  }
  function cash(){
    for(let i=0;i<4;i++){
      const note=box(2.8,1.23,.075,.12*i,1.0+i*.11,-.12*i,i%2?white:accent);
      note.rotation.y=-.07;
      box(1.25,.54,.09,.12*i,1.0+i*.11,.06-.12*i,dark);
      round(.29,.08,.12*i,1.0+i*.11,.13-.12*i,gold,true);
    }
  }
  function wallet(){
    box(2.92,1.85,.53,0,1.11,0,accent);
    box(2.55,1.5,.18,0,1.27,.33,dark);
    box(1.3,.74,.24,.92,1.11,.46,white);
    round(.15,.1,1.1,1.11,.59,gold,true);
  }
  function pig(){
    ball(1,0,1.57,0,accent,1.25,.80,.8);
    ball(.4,1.17,1.49,.1,white,1,.85,.67);
    for(const x of [-.8,.7])for(const z of [-.40,.42])
      box(.27,.56,.29,x,.59,z,accent);
    for(const x of [-.66,.64]){
      const ear=new Mesh(owned(new ConeGeometry(.32,.57,3)),accent);
      ear.position.set(x,2.33,0);ear.castShadow=true;root.add(ear);
    }
    ball(.095,.75,1.91,.58,dark);
    box(.68,.085,.18,-.08,2.15,.05,dark);
  }
  function safe(){
    box(2.6,2.72,1.27,0,1.45,0,dark);
    box(2.37,2.46,.24,0,1.45,.73,accent);
    round(.68,.15,0,1.58,.9,white,true);
    round(.46,.17,0,1.58,1.01,dark,true);
    cap(0,1.77,1.14);cap(0,1.39,1.14);
    cap(.20,1.58,1.14);cap(-.20,1.58,1.14);
    box(.18,.79,.27,1.03,1.53,.88,white);
  }
  function house(){
    box(2.72,1.73,1.9,0,1.02,0,white);
    const roof=new Mesh(owned(new ConeGeometry(2.18,1.35,4)),accent);
    roof.rotation.y=Math.PI/4;roof.position.set(0,2.43,0);
    roof.scale.z=.8;root.add(roof);
    box(.72,1.10,.12,-.40,.77,1.03,dark);
    box(.61,.58,.16,.72,1.44,1.02,darkGlass);
  }
  function shop(){
    box(3.08,2.12,1.6,0,1.17,0,white);
    box(3.24,.37,1.77,0,2.38,.13,accent);
    for(const x of [-1.08,-.36,.36,1.08])
      box(.55,.36,.28,x,2.19,.95,x===-.36||x===1.08?white:accent);
    box(1.16,1.26,.14,-.66,1.00,.87,darkGlass);
    box(.77,1.65,.14,.91,.85,.87,dark);
  }
  function briefcase(){
    box(2.97,1.98,.92,0,1.31,0,accent);
    box(3.0,.17,.96,0,1.46,.01,white);
    box(.89,.22,.35,0,1.45,.53,gold);
    for(const x of [-.39,.39])box(.15,.49,.17,x,2.43,0,dark);
    box(.98,.16,.24,0,2.70,0,dark);
  }
  function chart(){
    box(3.3,.095,1.26,0,.24,0,dark);
    const heights=[.62,1.18,1.69,2.47];
    heights.forEach((h,i)=>box(.50,h,.50,-1.12+i*.75,.31+h/2,0,i===3?accent:muted));
  }
  function calculator(){
    box(2.03,3.02,.50,0,1.70,0,dark);
    box(1.64,.71,.15,0,2.54,.33,accent);
    for(let i=0;i<12;i++)box(.38,.25,.11,
      -.56+(i%3)*.56,1.88-Math.floor(i/3)*.41,.34,i%3===2?accent:white);
  }
  function shield(){
    const shape=new Shape();
    shape.moveTo(0,1.5);shape.lineTo(1.28,.98);shape.lineTo(1.17,-.50);
    shape.quadraticCurveTo(1.0,-1.26,0,-1.72);
    shape.quadraticCurveTo(-1.0,-1.26,-1.17,-.5);
    shape.lineTo(-1.28,.98);shape.closePath();
    const body=new Mesh(owned(new ExtrudeGeometry(shape,{depth:.21,bevelEnabled:true,
      bevelSize:.09,bevelThickness:.07,bevelSegments:3})),accent);
    body.position.set(0,1.72,0);root.add(body);
    box(.12,.93,.29,-.17,1.61,.36,white).rotation.z=-Math.PI/4;
    box(.12,1.53,.29,.34,1.86,.36,white).rotation.z=.78;
  }
  function transfer(){
    coin(-1.04,1.34,.1,.57);coin(1.04,1.34,.1,.57);
    box(1.60,.17,.17,0,1.88,.08,accent);
    const arrow=new Mesh(owned(new ConeGeometry(.29,.49,3)),accent);
    arrow.rotation.z=-Math.PI/2;arrow.position.set(1.04,1.88,.08);root.add(arrow);
    box(1.60,.16,.17,0,.73,.08,white);
    const reverse=new Mesh(owned(new ConeGeometry(.27,.47,3)),white);
    reverse.rotation.z=Math.PI/2;reverse.position.set(-1.04,.73,.08);root.add(reverse);
  }
  function handshake(){
    const left=box(1.69,.52,.66,-.68,1.43,0,accent);
    const right=box(1.69,.52,.66,.68,1.43,.17,white);
    left.rotation.z=-.4;right.rotation.z=.4;
    for(let i=0;i<3;i++)box(.25,.13,.55,-.03+i*.17,1.43-i*.2,.42,dark);
  }
  function calendar(){
    box(2.51,2.65,.3,0,1.61,0,white);
    box(2.51,.52,.34,0,2.64,.02,accent);
    for(const x of [-.73,0,.73])for(const y of [.69,1.13,1.57,2.01])
      box(.48,.30,.13,x,y,.23,x===0&&y===1.13?accent:muted);
  }
  function build(kind:FinanceObjectArchetype){
    switch(kind){
      case "institution":building();break;
      case "account":document();coin(.88,.88,.33,.39);break;
      case "card":card();break;
      case "terminal":terminal();break;
      case "document":document();break;
      case "cash":cash();break;
      case "coin":for(let i=0;i<4;i++)coin(-.82+i*.57,.66+i*.38,.04,.4);break;
      case "wallet":wallet();break;
      case "piggy":pig();break;
      case "vault":safe();break;
      case "house":house();break;
      case "store":shop();break;
      case "briefcase":briefcase();break;
      case "chart":chart();break;
      case "calculator":calculator();break;
      case "shield":shield();break;
      case "transfer":transfer();break;
      case "handshake":handshake();break;
      case "calendar":calendar();break;
    }
  }
  build(item.archetype);
  const key=new DirectionalLight("#FFFFFF",3.2);
  key.position.set(4,7,6);
  const rim=new DirectionalLight("#6BBDD2",2);rim.position.set(-4,4,-3);
  scene.add(new HemisphereLight("#FFFFFF","#244255",1.9),key,rim);
  function updateFrame(frame:number){
    const p=financeObjectProgress(frame,opts.startFrame??0,opts.revealFrames??20);
    root.scale.setScalar(Math.max(.001,p));
    root.visible=p>0;
    root.rotation.y=-.21+.21*p;
  }
  updateFrame(Number.MAX_SAFE_INTEGER);
  return {scene,root,semanticId:item.id,updateFrame,
    dispose(){for(const geo of geometry)geo.dispose();
      for(const mat of materials)mat.dispose();
      scene.clear();
    }};
}
