/** Procedural finance/business objects with real Three.js meshes, independent
 * of fonts/models/remote assets. Own all geometries/materials and dispose.
 */
import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry,
  DataTexture, DoubleSide, ExtrudeGeometry, Group, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, Scene, Shape, SphereGeometry, TubeGeometry, Vector3,
} from "three";
import { createCraftMaterialKit } from "../craft/material-kit";
import { createCraftStudio } from "../craft/studio-kit";
import { buildFinanceRealismFamily } from "./finance-object-realism-3d";
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
  const geometry=new Set<BufferGeometry>();
  const textures=new Set<DataTexture>();
  const materials=new Set<MeshStandardMaterial>();
  const owned=<T extends BufferGeometry>(g:T):T=>{
    geometry.add(g);return g;
  };
  const material=(hex:string,metalness=.34,roughness=.38)=>{
    const m=new MeshPhysicalMaterial({color:hex,metalness,roughness,
      clearcoat:.5,clearcoatRoughness:.21,side:DoubleSide});
    materials.add(m);return m;
  };
  // Measured micro-roughness gives physical materials a plausible response to
  // area-like studio lights; textures are original seeded data, not downloaded art.
  const surfaceKit=createCraftMaterialKit({seed:4907,overrides:{
    "brushed-metal":{color:"#AFBABE",roughness:.30},
    "painted-metal":{color:"#334958",roughness:.39},
    "molded-polymer":{color:"#25313B",roughness:.62},
    "display-glass":{color:"#142D3B",roughness:.105},
    "ceramic":{color:"#E7E9E8",roughness:.41},
  }});
  const accent=material(item.accent??"#62DDCE",.42,.22);
  const white=surfaceKit.get("ceramic");
  const dark=surfaceKit.get("painted-metal");
  const darkGlass=surfaceKit.get("display-glass");
  const gold=material("#D9B273",.91,.22);
  const muted=surfaceKit.get("brushed-metal");
  const polymer=surfaceKit.get("molded-polymer");
  const steel=surfaceKit.get("anodized-metal");
  const paper=material("#D1D9CA",.025,.84);
  const ink=material("#425A4F",.0,.92);
  const glass=surfaceKit.get("optical-glass");
  const indicator=surfaceKit.get("indicator");
  const stone=material("#B4B4AE",.10,.83);
  const seam=material("#465B65",.28,.76);
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
  /** Rounded, dimensionally stable slab with visible sidewalls and bevel. */
  function slab(w:number,h:number,d:number,r:number,
    x:number,y:number,z:number,m:MeshStandardMaterial,name:string) {
    const R=Math.min(r,w/2,h/2),sh=new Shape();
    sh.moveTo(-w/2+R,-h/2);
    sh.lineTo(w/2-R,-h/2);
    sh.quadraticCurveTo(w/2,-h/2,w/2,-h/2+R);
    sh.lineTo(w/2,h/2-R);
    sh.quadraticCurveTo(w/2,h/2,w/2-R,h/2);
    sh.lineTo(-w/2+R,h/2);
    sh.quadraticCurveTo(-w/2,h/2,-w/2,h/2-R);
    sh.lineTo(-w/2,-h/2+R);
    sh.quadraticCurveTo(-w/2,-h/2,-w/2+R,-h/2);
    const mesh=new Mesh(owned(new ExtrudeGeometry(sh,{
      depth:Math.max(.002,d-.018),bevelEnabled:true,bevelSegments:3,
      steps:1,bevelThickness:.009,bevelSize:.009,curveSegments:10,
    })),m);
    mesh.name=name;mesh.userData.partRole=name;
    mesh.position.set(x,y,z-d/2);
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    return mesh;
  }
  function detailedBox(w:number,h:number,d:number,
    x:number,y:number,z:number,m:MeshStandardMaterial,name:string){
    const mesh=box(w,h,d,x,y,z,m);
    mesh.name=name;mesh.userData.partRole=name;
    return mesh;
  }
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
    // Real modern bank: stone-clad bays, high-performance glazed panels,
    // recessed public entrance and a thin floating canopy (no fake logos).
    detailedBox(3.70,.22,1.75,0,.14,0,stone,"stone-foundation");
    detailedBox(3.62,2.36,.43,0,1.47,-.54,stone,"structural-stone-back");
    for(let i=0;i<7;i++){
      const x=-1.48+i*.49;
      detailedBox(.035,1.98,.065,x,1.54,-.25,muted,"window-mullion");
      if(i<6)detailedBox(.445,1.92,.052,x+.245,1.54,-.26,
        i===3?darkGlass:glass,"curtain-wall-glass");
    }
    detailedBox(3.8,.28,2.0,0,2.74,0,stone,"stone-parapet");
    detailedBox(3.95,.13,2.15,0,2.93,.03,muted,"metal-roof-coping");
    detailedBox(2.05,.16,.94,0,2.41,.72,muted,"cantilevered-canopy");
    detailedBox(1.04,1.88,.11,0,1.16,.38,darkGlass,"recessed-entrance");
    for(const x of [-.45,.45])detailedBox(.035,1.86,.09,x,1.16,.46,muted,"entry-door-frame");
    detailedBox(.15,1.66,.16,0,1.19,.46,steel,"door-mullion");
    detailedBox(1.2,.07,.23,0,.26,.58,dark,"entry-sill");
    for(const x of [-1.74,1.74])
      detailedBox(.27,2.38,.55,x,1.48,.02,stone,"facade-stone-pier");
    detailedBox(3.61,.05,.22,0,1.5,-.12,muted,"spandrel");
    for(const x of [-1.58,1.58])
      detailedBox(.09,.10,.11,x,.35,.44,indicator,"recessed-uplight");
  }
  function card(){
    // ISO ID-1 aspect 85.60×53.98; thickness ~0.76 mm. Models use meters
    // in arbitrary scene units; the *ratio* and relative thickness are held.
    slab(3.36,2.12,.036,.12,0,1.41,0,steel,"card-rounded-metal-core");
    slab(3.30,2.065,.012,.11,0,1.41,.029,accent,"card-finish");
    detailedBox(.60,.43,.012,-.86,1.36,.056,gold,"emv-contact-inlay");
    // Eight separated EMV chip pads, seam borders and a central module line.
    for(let row=0;row<2;row++)for(let col=0;col<4;col++){
      const chip=detailedBox(.116,.164,.016,
        -1.072+col*.144,1.445-row*.17,.065,muted,"emv-contact-pad");
      chip.castShadow=false;
    }
    detailedBox(1.01,.018,.011,-.57,.78,.046,white,"laser-label-stripe");
    detailedBox(.72,.018,.011,-.72,.70,.046,muted,"emboss-alignment");
    for(let i=0;i<3;i++){
      const arc=new Mesh(owned(new CylinderGeometry(.27+i*.10,.27+i*.10,.01,44,1,true,
        Math.PI*.80,Math.PI*.41)),white);
      arc.name="contactless-antenna-arc";
      arc.userData.partRole="contactless-antenna-arc";
      arc.rotation.x=Math.PI/2;arc.position.set(.98,1.36,.052);root.add(arc);
    }
    // Fine metallic perimeter; no PAN, CVC, issuer/network logo or credentials.
    slab(3.345,2.105,.004,.12,0,1.41,-.027,dark,"reverse-card-back");
  }
  function terminal(){
    // Reference-correct ATM casing: recessed screen, physical side keys,
    // privacy shielding, card slot, separate receipt/cash paths and keypad.
    slab(2.40,3.19,1.02,.13,0,1.66,0,steel,"atm-powder-coated-cabinet");
    slab(2.13,2.72,.08,.09,0,1.73,.55,dark,"atm-faceplate");
    slab(1.61,1.08,.07,.065,-.22,2.36,.61,polymer,"atm-screen-recess");
    slab(1.43,.91,.025,.03,-.22,2.36,.66,darkGlass,"atm-display-glass");
    detailedBox(1.02,.025,.03,-.22,2.56,.681,indicator,"atm-display-status");
    for(let i=0;i<4;i++){
      const yy=2.68-i*.22;
      detailedBox(.105,.082,.08,-1.08,yy,.65,muted,"screen-side-button");
      detailedBox(.105,.082,.08,.63,yy,.65,muted,"screen-side-button");
    }
    slab(.72,.16,.08,.025,.66,2.05,.66,polymer,"atm-card-reader-housing");
    detailedBox(.48,.027,.09,.67,2.05,.72,seam,"atm-card-slot");
    detailedBox(.09,.028,.07,.96,2.05,.72,indicator,"atm-card-reader-led");
    slab(1.12,.65,.12,.08,-.31,1.42,.65,polymer,"atm-keypad-panel");
    for(let i=0;i<12;i++) {
      detailedBox(.195,.112,.07,
        -.66+(i%3)*.34,1.61-Math.floor(i/3)*.155,.75,
        i===11?accent:muted,"atm-physical-key");
    }
    // A recessed separate cash dispense mouth, wide enough for notes.
    slab(1.41,.22,.1,.035,-.15,.91,.61,polymer,"atm-cash-dispenser-bezel");
    detailedBox(1.18,.055,.10,-.15,.91,.69,seam,"atm-cash-exit");
    detailedBox(.63,.032,.06,.62,1.68,.68,seam,"atm-receipt-slot");
    detailedBox(.64,.02,.05,.62,1.77,.66,white,"atm-receipt-label");
    for(let i=0;i<9;i++)detailedBox(.025,.066,.034,
      .35+(i%3)*.065,1.82+Math.floor(i/3)*.047,.65,seam,"speaker-perforation");
    detailedBox(2.1,.24,.88,0,.16,.01,dark,"atm-plinth");
  }
  function cash(){
    // Real bills are extremely thin, not a stack of four colored slabs.
    // Individually model paper-edge stratification and security-colored bands,
    // without reproducing serial numbers or official banknote artwork.
    const layers=36,noteW=3.06,noteH=1.32;
    for(let i=0;i<layers;i++){
      const z=-.20+i*.012;
      detailedBox(noteW,noteH,.011,.0,.99,z,
        i%5===0?white:paper,"banknote-paper-sheet");
    }
    const front=.25;
    slab(2.98,1.27,.012,.015,0,.99,front,paper,"banknote-face");
    for(const x of [-1.24,1.24])for(const y of [.53,1.45])
      detailedBox(.11,.045,.014,x,y,front+.014,ink,"banknote-corner-print");
    round(.42,.018,0,.99,front+.035,ink,true).name="banknote-abstract-seal";
    detailedBox(2.65,.021,.018,0,1.44,front+.026,ink,"banknote-guilloche-top");
    detailedBox(2.65,.021,.018,0,.54,front+.026,ink,"banknote-guilloche-bottom");
    // Security thread and restrained treasury-green printing, conceptual only.
    detailedBox(.08,1.19,.022,.82,.99,front+.026,accent,"banknote-security-band");
    // Wrap around a stack, not an imaginary infinitely thick banknote.
    detailedBox(.36,1.34,.025,-.52,.99,front+.036,white,"cash-bundle-band");
  }
  function wallet(){
    box(2.92,1.85,.53,0,1.11,0,accent);
    box(2.55,1.5,.18,0,1.27,.33,dark);
    box(1.3,.74,.24,.92,1.11,.46,white);
    round(.15,.1,1.1,1.11,.59,gold,true);
  }
  function pig(){
    // Glazed ceramic savings bank with soft, coherent anatomy and handmade
    // finishing. Still a conceptual product model until photo-review approval.
    const glaze=material("#DFB9AF",.01,.14);
    const earInner=material("#B57875",0,.48);
    const pupils=material("#1A2426",.04,.14);
    const nostril=material("#734D4B",0,.72);
    const body=ball(1.08,0,1.46,0,glaze,1.27,.83,.77);
    body.name="piggy-ceramic-glazed-body";body.userData.partRole=body.name;
    const chest=ball(.70,.69,1.44,.02,glaze,.80,.98,.72);
    chest.name="piggy-contiguous-shoulder-volume";
    const head=ball(.56,1.00,1.69,.13,glaze,1.01,.78,.89);
    head.name="piggy-ceramic-head";
    const muzzle=ball(.38,1.44,1.53,.37,glaze,1.0,.56,.79);
    muzzle.name="piggy-oval-snout";
    const nose=round(.16,.035,1.72,1.54,.38,earInner,true);
    nose.rotation.z=-.12;
    for(const y of [1.60,1.48])round(.047,.039,1.75,y,.40,nostril,true);
    // Eyes embedded in the head surface, not floating black dots.
    for(const z of [-.32,.49]){
      const eye=ball(.115,1.33,1.89,z,glaze,.96,.96,.50);
      eye.name="piggy-eye-surround";
      ball(.065,1.407,1.89,z+.035,pupils,.9,1,.7).name="piggy-glass-eye";
      ball(.023,1.445,1.916,z+.048,white).name="piggy-eye-catchlight";
    }
    // Shell ears formed from beveled/scalloped lightweight molded ceramic.
    for(const z of [-.47,.49]){
      const shape=new Shape();
      shape.moveTo(-.20,-.23);
      shape.quadraticCurveTo(-.37,.25,-.02,.44);
      shape.quadraticCurveTo(.32,.20,.27,-.22);
      shape.closePath();
      const ear=new Mesh(owned(new ExtrudeGeometry(shape,{depth:.055,
        bevelEnabled:true,bevelSize:.045,bevelThickness:.035,
        bevelSegments:3,curveSegments:14})),glaze);
      ear.position.set(.99,2.19,z);
      ear.rotation.z=z<0?.23:-.18;
      ear.castShadow=true;ear.name="piggy-molded-ceramic-ear";
      ear.userData.partRole=ear.name;root.add(ear);
    }
    // Rounded planted feet with dark unglazed tips.
    for(const x of [-.82,.79])for(const z of [-.46,.47]){
      const foot=ball(.30,x,.65,z,glaze,.78,1.12,.87);
      foot.name="piggy-attached-rounded-leg";
      const hoof=ball(.245,x,.37,z+.06,earInner,.83,.52,.92);
      hoof.name="piggy-unglazed-foot";
    }
    const slot=slab(.61,.072,.043,.033,-.18,2.28,.06,nostril,"piggy-functional-coin-slot");
    slot.rotation.x=-.04;
    // Porcelain tail, taper and curling instead of rigid horizontal cube.
    const curl=new CatmullRomCurve3([
      new Vector3(-1.22,1.75,.05),new Vector3(-1.47,1.92,.09),
      new Vector3(-1.57,2.06,.14),new Vector3(-1.38,2.14,.21),
      new Vector3(-1.28,2.03,.19),
    ]);
    const tail=new Mesh(owned(new TubeGeometry(curl,36,.062,10,false)),glaze);
    tail.name="piggy-curled-ceramic-tail";tail.userData.partRole=tail.name;
    root.add(tail);
  }
  function safe(){
    slab(2.67,2.88,1.28,.12,0,1.53,0,steel,"safe-heavy-cabinet");
    slab(2.42,2.62,.13,.12,0,1.53,.73,muted,"safe-armored-door");
    round(.63,.18,0,1.52,.88,dark,true).name="safe-dial-recess";
    round(.47,.20,0,1.52,.99,white,true).name="safe-combination-dial";
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6;
      detailedBox(.045,.12,.045,Math.sin(angle)*.39,
        1.52+Math.cos(angle)*.39,1.10,seam,"safe-dial-index");
    }
    detailedBox(.16,.82,.25,1.03,1.54,.89,dark,"safe-pull-handle");
    for(const y of [.68,2.38])round(.19,.34,1.34,y,.31,muted,true);
  }
  function vault(){
    // Photo reference: enormous circular armored door with a projecting steel
    // edge, layered locking rings and many heavy radial bolt pins.
    const disk=round(1.18,.39,-.06,1.62,.47,muted,true);
    disk.name="vault-armored-steel-door";disk.userData.partRole=disk.name;
    const back=round(1.26,.28,-.06,1.62,.19,steel,true);
    back.name="vault-reinforced-outer-ring";
    round(1.015,.07,-.06,1.62,.69,dark,true).name="vault-recessed-annulus";
    round(.85,.08,-.06,1.62,.76,muted,true).name="vault-inner-armored-plate";
    round(.37,.15,-.06,1.62,.88,dark,true).name="vault-spindle-hub";
    round(.22,.18,-.06,1.62,1.01,gold,true).name="vault-handwheel-hub";
    for(let i=0;i<18;i++){
      const a=i*Math.PI/9;
      const x=-.06+Math.sin(a)*1.10,y=1.62+Math.cos(a)*1.10;
      round(.091,.30,x,y,.75,steel,true).name="vault-radial-locking-bolt";
    }
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      const cx=-.06+Math.sin(a)*.61,cy=1.62+Math.cos(a)*.61;
      const spoke=detailedBox(.085,.62,.14,cx,cy,.93,white,"vault-spindle-spoke");
      spoke.rotation.z=-a;
    }
    for(const yy of [.68,1.68,2.66]){
      round(.22,.44,1.32,yy,.11,steel,true).name="vault-exposed-hinge-knuckle";
      detailedBox(.64,.19,.21,1.16,yy,.35,muted,"vault-hinge-arm");
    }
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
    // Street-front retail architecture with real cladding, recessed glazed
    // storefront, door hardware, slatted awning, retail shelving and lighting.
    detailedBox(3.48,.22,2.14,0,.16,0,stone,"storefront-concrete-slab");
    detailedBox(3.37,2.14,1.63,0,1.39,-.17,stone,"storefront-wall");
    detailedBox(3.58,.24,1.94,0,2.51,-.02,dark,"storefront-roof-coping");
    detailedBox(3.05,1.85,.082,0,1.46,.75,darkGlass,"storefront-recessed-glazing");
    for(const x of [-1.34,-.65,.05,.75,1.37])
      detailedBox(.05,1.80,.12,x,1.43,.81,steel,"storefront-anodized-mullion");
    detailedBox(.07,1.91,.10,-.12,1.43,.84,steel,"storefront-door-pivot");
    detailedBox(.83,1.72,.10,.54,1.43,.84,glass,"storefront-glass-entrance");
    detailedBox(.08,.60,.14,.91,1.48,.95,gold,"storefront-door-pull");
    for(const x of [-1.42,1.42])
      detailedBox(.21,2.08,.32,x,1.37,.88,stone,"storefront-cladding-pier");
    // Awnings are short individual metal/fabric ribs, no monolithic block.
    const canvas=material("#5B808A",.08,.77);
    for(let i=0;i<11;i++) {
      const rib=detailedBox(.305,.048,.95,-1.50+i*.30,2.30,1.13,
        i%2===0?canvas:white,"storefront-striped-awning-fabric");
      rib.rotation.x=-.18;
    }
    for(const x of [-1.38,1.38])
      detailedBox(.06,.04,.92,x,2.24,1.16,steel,"awning-cantilever-rib");
    // Interior shelving visible behind glass, not a flat painted facade.
    for(const x of [-1.05,1.10]){
      for(let level=0;level<3;level++){
        detailedBox(.70,.06,.37,x,.66+level*.49,.10,muted,"store-shelf");
        for(let j=0;j<4;j++)
          detailedBox(.12,.22,.20,x-.23+j*.16,.82+level*.49,.12,
            j%2?accent:paper,"store-merchandise-box");
      }
    }
    detailedBox(2.95,.24,.22,0,2.77,.83,dark,"retail-sign-lightbox");
    for(let i=0;i<12;i++)
      detailedBox(.092,.037,.018,-.94+i*.17,2.77,.96,white,"retail-sign-abstract-type");
    for(const x of [-1.56,1.56]){
      detailedBox(.32,.36,.34,x,.38,.98,stone,"store-planter");
      ball(.26,x,.66,.97,accent,1.0,.92,.84).name="store-planter-foliage";
    }
  }
  function briefcase(){
    box(2.97,1.98,.92,0,1.31,0,accent);
    box(3.0,.17,.96,0,1.46,.01,white);
    box(.89,.22,.35,0,1.45,.53,gold);
    for(const x of [-.39,.39])box(.15,.49,.17,x,2.43,0,dark);
    box(.98,.16,.24,0,2.70,0,dark);
  }
  function chart(){
    // Semantic column-chart prop with a proper zero baseline, three horizontal
    // reference grids and distinct market bars. Concept visualization only:
    // for actual prices use the validated metric + OHLC packages.
    const panel=material("#153445",.09,.39);
    slab(3.56,2.76,.19,.08,0,1.54,0,panel,"chart-wall-panel");
    for(let i=0;i<5;i++)
      detailedBox(3.09,.011,.015,0,.42+i*.50,.12,seam,"finance-chart-gridline");
    for(let i=0;i<6;i++)
      detailedBox(.012,2.13,.015,-1.44+i*.55,1.54,.12,seam,"finance-chart-axis-guide");
    const values=[.77,1.11,.94,1.54,1.83,2.07],scale=2.11/2.07;
    values.forEach((raw,i)=>{
      const h=raw*scale;
      const bar=detailedBox(.31,h,.19,-1.25+i*.50,.39+h/2,.22,
        i===5?accent:i===2?muted:steel,"finance-chart-measured-column");
      bar.userData.demoValue=raw;
      detailedBox(.36,.03,.22,-1.25+i*.50,.36,.22,dark,"finance-chart-bottom-rail");
    });
    detailedBox(3.11,.06,.12,0,.38,.22,white,"finance-chart-zero-baseline");
    detailedBox(1.02,.055,.02,-.97,2.63,.13,white,"finance-chart-title-marker");
    for(let j=0;j<3;j++)
      detailedBox(.33,.033,.021,.47+j*.42,2.63,.13,j===2?accent:muted,
        "finance-chart-legend-swatch");
  }
  function calculator(){
    // Handheld desk calculator: injected-polymer case, individually sculpted
    // keycaps, inset LCD glass and seven-segment display, rubber pads/screws.
    slab(2.02,3.08,.39,.16,0,1.70,0,polymer,"calculator-molded-polymer-shell");
    slab(1.78,.81,.08,.06,0,2.63,.25,dark,"calculator-display-recess");
    slab(1.64,.64,.019,.025,0,2.63,.30,darkGlass,"calculator-LCD-glass");
    const segments:number[][]=[
      [0,0],[0,.22],[0,-.22],[-.12,.12],[-.12,-.12],[.12,.12],[.12,-.12],
    ];
    for(let digit=0;digit<5;digit++){
      const cx=-.46+digit*.24;
      for(const [j,[dx,dy]] of segments.entries())
        detailedBox(j<3?.19:.026,j<3?.027:.22,.012,cx+dx,2.59+dy,.32,
          digit%2===0||j%3!==1?accent:muted,"calculator-raised-LCD-segment");
    }
    const keyMat=material("#17232C",.015,.64);
    const actionMat=material("#E38B6D",.035,.38);
    for(let i=0;i<20;i++){
      const x=-.66+(i%4)*.44, y=2.09-Math.floor(i/4)*.40;
      slab(.34,.29,.071,.048,x,y,.26,i%4===3?actionMat:keyMat,
        "calculator-individual-rubber-keycap");
      detailedBox(.155,.021,.009,x,y,.314,white,"calculator-key-label");
      if(i%4===3)
        detailedBox(.035,.105,.010,x,y,.322,dark,"calculator-key-symbol");
    }
    for(const x of [-.74,.74])for(const y of [.42,2.89])
      round(.04,.04,x,y,-.228,steel,true).name="calculator-rear-assembly-screw";
    for(const x of [-.64,.64])
      detailedBox(.26,.09,.16,x,.42,-.24,dark,"calculator-nonslip-foot");
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
    if(buildFinanceRealismFamily(kind,{
      root,own:owned,texture(t){textures.add(t);return t;},material,
      box,slab,round,ball,
      materials:{accent,white,dark,steel,glass,darkGlass,muted,polymer,
        gold,seam,paper,ink,indicator,stone},
    },item.marketCandles))return;
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
      case "vault":item.kind==="vault"?vault():safe();break;
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
  const studio=createCraftStudio({mood:"studio",ground:true,
    groundY:.015,shadowMapSize:2048,background:"#0C202E"});
  studio.setFocus(0,1.55,0);
  scene.add(studio.group);
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
      for(const t of textures)t.dispose();
      surfaceKit.dispose();studio.dispose();
      scene.clear();
    }};
}
