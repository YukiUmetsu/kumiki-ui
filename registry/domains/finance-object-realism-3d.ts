/** Dedicated physical construction for complex finance subjects. Procedural
 * studio assets, not photogrammetry or an implied photo-match certification.
 * Ownership of every geometry/material/texture remains with the parent scene.
 */
import {
  BufferGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry,
  DataTexture, DoubleSide, ExtrudeGeometry, Group, LatheGeometry, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, RGBAFormat,
  Shape, SphereGeometry, TubeGeometry, UnsignedByteType, Vector2, Vector3,
} from "three";
import type { FinanceObjectArchetype, FinancialCandle } from "./finance-object-model";
import { ILLUSTRATIVE_MARKET_CANDLES } from "./finance-object-model";

export interface FinanceDetailKit {
  root:Group;
  own:<T extends BufferGeometry>(geometry:T)=>T;
  texture:(texture:DataTexture)=>DataTexture;
  material:(hex:string,metalness?:number,roughness?:number)=>MeshStandardMaterial;
  box:(w:number,h:number,d:number,x:number,y:number,z:number,
    material:MeshStandardMaterial)=>Mesh;
  slab:(w:number,h:number,d:number,r:number,x:number,y:number,z:number,
    material:MeshStandardMaterial,name:string)=>Mesh;
  round:(r:number,h:number,x:number,y:number,z:number,
    material:MeshStandardMaterial,turn?:boolean)=>Mesh;
  ball:(r:number,x:number,y:number,z:number,
    material:MeshStandardMaterial,sx?:number,sy?:number,sz?:number)=>Mesh;
  materials:{
    accent:MeshStandardMaterial;white:MeshStandardMaterial;dark:MeshStandardMaterial;
    steel:MeshStandardMaterial;glass:MeshStandardMaterial;darkGlass:MeshStandardMaterial;
    muted:MeshStandardMaterial;polymer:MeshStandardMaterial;gold:MeshStandardMaterial;
    seam:MeshStandardMaterial;paper:MeshStandardMaterial;ink:MeshStandardMaterial;
    indicator:MeshStandardMaterial;stone:MeshStandardMaterial;
  };
}
/** The same standardized part labels power mechanical QA and camera targeting. */
export function buildFinanceRealismFamily(
  kind:FinanceObjectArchetype,kit:FinanceDetailKit,
  marketCandles:readonly FinancialCandle[]=ILLUSTRATIVE_MARKET_CANDLES,
):boolean{
  const {root,own,texture,material,box,slab,round,ball,materials:m}=kit;
  const named=(mesh:Mesh,name:string)=>{
    mesh.name=name;mesh.userData.partRole=name;mesh.castShadow=true;return mesh;
  };
  const B=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,
    mat:MeshStandardMaterial)=>named(box(w,h,d,x,y,z,mat),name);
  const cylinder=(name:string,r:number,depth:number,x:number,y:number,z:number,
    mat:MeshStandardMaterial,axis:"z"|"y"="z")=>{
    const mesh=round(r,depth,x,y,z,mat,axis==="z");
    return named(mesh,name);
  };
  const S=(name:string,w:number,h:number,d:number,r:number,x:number,y:number,z:number,
    mat:MeshStandardMaterial)=>named(slab(w,h,d,r,x,y,z,mat),name);
  const sphere=(name:string,r:number,x:number,y:number,z:number,
    mat:MeshStandardMaterial,sx=1,sy=1,sz=1)=>named(ball(r,x,y,z,mat,sx,sy,sz),name);
  const tube=(name:string,pts:readonly Vector3[],r:number,mat:MeshStandardMaterial)=>{
    const path=new CatmullRomCurve3([...pts]);
    const mesh=new Mesh(own(new TubeGeometry(path,Math.max(16,pts.length*9),r,10,false)),mat);
    named(mesh,name);root.add(mesh);return mesh;
  };
  const finish=(name:string,geo:BufferGeometry,x:number,y:number,z:number,
    mat:MeshStandardMaterial)=>{
    const mesh=new Mesh(own(geo),mat);
    mesh.position.set(x,y,z);named(mesh,name);root.add(mesh);return mesh;
  };
  function workstation(){
    // Professional dual-display configuration: real monitor thickness,
    // separated LCD glass, stands, ventilated back, keys and chart marks.
    B("workstation-desk",4.35,.17,2.04,0,.36,.10,m.stone);
    for(const x of [-1.9,1.9])
      for(const z of [-.76,.86])B("workstation-desk-leg",.09,.72,.10,x,-.06,z,m.steel);
    const panel=material("#091924",.02,.23);
    const chartGrid=material("#46697A",.02,.81);
    const up=material("#45D9AA",.13,.38);
    const down=material("#F47188",.13,.38);
    const standBase=material("#52636D",.66,.3);
    for(let monitor=0;monitor<2;monitor++){
      const x=monitor===0?-.96:.96;
      S("monitor-aluminum-housing",1.91,1.38,.12,.065,x,2.05,-.22,m.steel);
      S("monitor-black-bezel",1.83,1.28,.025,.04,x,2.05,-.141,m.polymer);
      S("monitor-display-glass",1.74,1.18,.012,.02,x,2.05,-.119,panel);
      B("monitor-reflection-stripe",.012,1.08,.008,x+.84,2.05,-.107,m.glass);
      B("monitor-neck",.085,.56,.10,x,1.15,-.40,m.steel);
      B("monitor-vase-base",.89,.052,.51,x,.89,-.42,standBase);
      // Display graticule: all marks are physically in front of LCD plane.
      const cx=x-.76;
      for(let j=0;j<5;j++){
        B("stock-gridline",1.53,.008,.008,x,1.65+j*.205,-.103,chartGrid);
      }
      for(let j=0;j<7;j++){
        B("stock-timeline-grid",.008,.96,.008,cx+j*.245,2.03,-.101,chartGrid);
      }
      const low=Math.min(...marketCandles.map(c=>c.low)),high=Math.max(...marketCandles.map(c=>c.high));
      const span=Math.max(.0001,high-low);
      const py=(v:number)=>1.65+.86*(v-low)/span;
      const subset=monitor===0?marketCandles.slice(0,Math.min(12,marketCandles.length)):
        marketCandles.slice(Math.max(0,marketCandles.length-12));
      for(let j=0;j<subset.length;j++){
        const c=subset[j],xx=cx+.08+(j+.5)*1.35/subset.length;
        const color=c.close>=c.open?up:down;
        B("candlestick-wick",.012,Math.max(.008,py(c.high)-py(c.low)),.017,
          xx,(py(c.high)+py(c.low))/2,-.079,color);
        B("candlestick-real-body",.060,Math.max(.009,Math.abs(py(c.close)-py(c.open))),.022,
          xx,(py(c.close)+py(c.open))/2,-.070,color);
      }
      B("market-dashboard-topbar",1.48,.054,.019,x,2.56,-.086,m.muted);
      B("market-session-indicator",.16,.045,.022,x-.60,2.56,-.066,up);
      for(let j=0;j<5;j++)
        B("market-data-column",.15,.018,.016,x-.58+j*.27,1.57,-.092,
          j%2?down:up);
      // rear ventilation and VESA plate, even though the front is the default view
      for(let j=0;j<8;j++) B("monitor-rear-vent",.65,.014,.015,x,
        2.48-j*.048,-.286,m.seam);
      B("monitor-vesa-mount",.29,.29,.08,x,2.02,-.34,m.steel);
    }
    // Full ergonomic keyboard, individual raised caps, spacebar, mouse.
    const keyboard=material("#142630",.06,.67);
    B("trading-keyboard-case",2.43,.10,.52,0,.54,.69,keyboard);
    for(let row=0;row<4;row++)
      for(let col=0;col<15;col++){
        if(row===3&&col>4&&col<10)continue;
        const x=-1.06+col*.15,y=.608,z=.48+row*.119;
        B("individual-keycap",.112,.052,.084,x,y,z,
          row===0&&col%4===0?m.accent:m.polymer);
      }
    B("keyboard-spacebar",.71,.052,.083,.015,.608,.84,m.polymer);
    S("trading-mouse",.28,.48,.11,.11,1.50,.59,.78,m.polymer);
    B("mouse-scrollwheel",.043,.05,.024,1.50,.63,.845,m.muted);
    for(let j=0;j<2;j++)
      tube("display-power-cable",[new Vector3(j?1.0:-1.0,1.8,-.47),
       new Vector3(j?1.0:-1.0,.82,-.8),
       new Vector3(j?1.15:-1.15,.43,-.72)],.017,m.seam);
  }
  function press(){
    // Industrial sheet-fed offset press, not a tabletop inkjet or money counter.
    // Emphasis: sequential printing units, plate/blanket cylinders, registration,
    // guarded sheet feed, stainless control bridge and separate delivery area.
    B("press-industrial-frame",4.32,.28,2.13,0,.32,0,m.dark);
    for(const x of [-2.0,-.9,.9,2.0])
      for(const z of [-.84,.85])
        B("press-chassis-column",.12,2.42,.16,x,1.62,z,m.steel);
    B("press-upper-enclosure",4.37,.55,2.14,0,2.93,-.02,m.white);
    B("press-rear-drive-housing",4.33,1.8,.33,0,1.58,-.96,m.dark);
    for(const x of [-1.28,0,1.28]){
      S("press-unit-side-guard",1.10,1.95,.08,.045,x,1.54,.77,m.steel);
      S("press-view-port",.96,.97,.018,.03,x,1.75,.822,m.darkGlass);
      for(const y of [1.43,1.80,2.17]){
        // Rollers are true 3D steel cylinders with collars/shafts.
        const roller=finish("press-blanket-cylinder",
          new CylinderGeometry(.255,.255,.98,48),x,y,.12,m.muted);
        roller.rotation.z=Math.PI/2;
        for(const delta of [-.49,.49]){
          const hub=cylinder("roller-bearing-hub",.14,.065,x+delta,y,.12,m.steel);
          hub.rotation.z=Math.PI/2;
        }
      }
      for(let i=0;i<10;i++)
        B("press-enclosure-vent",.060,.015,.022,x-.37+i*.08,.85,.83,m.seam);
      B("press-registration-sensor",.11,.075,.065,x+.39,2.47,.82,m.indicator);
      B("press-module-control",.42,.20,.065,x+.26,2.68,.81,m.polymer);
      B("press-emergency-stop",.10,.10,.09,x+.38,2.68,.88,m.gold);
    }
    // Sheet feed tray, lateral guide rails, delivery conveyor and grippers.
    B("press-sheet-feeder",.63,.27,1.25,-2.24,.78,.14,m.steel);
    B("press-delivery-tray",.68,.17,1.10,2.26,.66,.23,m.steel);
    for(const x of [-2.08,2.09]){
      B("sheet-guide-rail",.07,.04,1.13,x,.86,.25,m.muted);
    }
    for(let i=0;i<22;i++){
      B("press-sheet-stack",.62,.004,.91,-2.27,.93+i*.004,.15,m.paper);
    }
    B("press-conveyor-belt",4.25,.065,.67,0,.56,.21,m.polymer);
    for(let i=0;i<18;i++)B("conveyor-roller-separator",.033,.075,.69,
      -1.98+i*.231,.56,.19,m.steel);
    for(let i=0;i<3;i++)
      B("printing-unit-access-handle",.24,.043,.08,-1.27+i*1.28,
        1.01,.89,m.muted);
    for(const x of [-2.0,2.0])B("floor-mounting-foot",.31,.09,.32,x,.12,.72,m.dark);
  }
  function bag(){
    // Bespoke soft body profile: dense lathe silhouette + seeded linen weave,
    // neck compression, wrapped drawstring and attached braided cords.
    const size=128,pixels=new Uint8Array(size*size*4);
    let seed=190371;
    const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967295;};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const n=(Math.floor(x/3)%2===Math.floor(y/3)%2?14:-10)+(rand()-.5)*11;
      const v=Math.max(0,Math.min(255,154+n));
      const idx=(y*size+x)*4;
      pixels[idx]=v+19;pixels[idx+1]=v+5;pixels[idx+2]=Math.round(v*.64);
      pixels[idx+3]=255;
    }
    const weave=texture(new DataTexture(pixels,size,size,RGBAFormat,UnsignedByteType));
    weave.wrapS=weave.wrapT=RepeatWrapping;
    weave.repeat.set(7,5);
    weave.needsUpdate=true;
    const burlap=material("#B68A55",0,.94);
    if(burlap instanceof MeshPhysicalMaterial){
      burlap.map=weave;
      burlap.bumpMap=weave;
      burlap.bumpScale=.015;
      burlap.needsUpdate=true;
    }
    const profile:Vector2[]=[];
    for(let i=0;i<=36;i++){
      const h=i/36*2.56;
      let r=.38+1.03*Math.sin(Math.min(1,(h+.25)/2.57)*Math.PI*.83);
      r*=1+.032*Math.sin(i*2.1)+.018*Math.sin(i*3.7);
      if(h>2.01)r=.35+(.32*(2.56-h));
      if(i===0)r=.08;
      profile.push(new Vector2(Math.max(.06,r),h));
    }
    const sack=finish("sack-woven-wrinkled-body",
      new LatheGeometry(profile,64),0,.18,0,burlap);
    sack.castShadow=true;sack.receiveShadow=true;
    cylinder("bag-neck-cord-collar",.40,.13,0,2.23,0,m.gold,"y");
    const rope=material("#E4C99A",.02,.95);
    for(let i=0;i<3;i++){
      const angle=i*Math.PI*2/3;
      tube("braided-drawstring",[
        new Vector3(Math.cos(angle)*.45,2.26,Math.sin(angle)*.45),
        new Vector3(Math.cos(angle+.7)*.55,2.15,Math.sin(angle+.7)*.55),
        new Vector3(Math.cos(angle+1.7)*.49,2.29,Math.sin(angle+1.7)*.49),
        new Vector3(Math.cos(angle+2.1)*.42,2.17,Math.sin(angle+2.1)*.42)],.038,rope);
    }
    for(const side of [-1,1])
      tube("hanging-bag-drawcord",[
        new Vector3(side*.35,2.23,.07),new Vector3(side*.72,1.94,.36),
        new Vector3(side*.83,1.45,.4),new Vector3(side*.73,.96,.45)],.049,rope);
    // Twisted folded opening with frayed lip and physical threading eyelets.
    const top=finish("bag-fabric-draw-mouth",new CylinderGeometry(.33,.40,.19,32,
      1,true),0,2.48,0,burlap);
    top.castShadow=true;
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8;
      tube("bag-top-stitched-fold",[
        new Vector3(Math.sin(a)*.36,2.47,Math.cos(a)*.36),
        new Vector3(Math.sin(a+.08)*.4,2.59,Math.cos(a+.08)*.4)],
      .014,rope);
    }
    // No literal real-bank marks or counterfeit printed banknotes.
    S("embossed-bag-value-patch",.47,.57,.018,.07,0,1.14,1.12,m.paper);
  }
  function check(){
    // Thin paper sheet, layered serial-free financial fields, microline texture
    // and printed VOID state. No routing number, account number or valid MICR.
    const base=material("#F3F3E8",0,.86);
    S("check-rag-paper-stock",3.42,1.81,.016,.015,0,1.33,0,base);
    const blue=material("#A5C6D0",.05,.85);
    for(let y=0;y<16;y++)
      B("check-security-background-line",3.21,.008,.003,0,.53+y*.103,.015,
        y%3?blue:m.paper);
    B("check-horizontal-payee-line",2.68,.010,.007,-.24,1.40,.026,m.ink);
    B("check-written-amount-line",2.70,.012,.008,0,1.04,.026,m.ink);
    B("check-date-field",.71,.010,.007,1.05,1.90,.028,m.ink);
    B("check-amount-box",.65,.07,.009,1.12,1.57,.028,m.ink);
    B("check-signature-line",1.29,.013,.009,.90,.72,.029,m.ink);
    // Abstract void watermark, intentionally no valid payment data.
    for(let i=0;i<4;i++) {
      const mesh=B("check-VOID-watermark-segment",.40,.035,.008,
        -.96+i*.63,1.30,.031,m.accent);
      mesh.rotation.z=-.18;
    }
    for(let i=0;i<18;i++)
      B("check-microprint-border",.062,.018,.006,-1.56+i*.18,.59,.027,m.muted);
  }
  function corporate(){
    // Glass curtain-wall tower: genuine floor slabs, spandrels, mullions,
    // recessed podium entrance, mechanical penthouse and rooftop railings.
    B("corporate-building-core",2.51,2.86,1.63,0,1.59,-.20,m.dark);
    const panelMat=material("#547886",.25,.20);
    const mullion=m.steel;
    for(const z of [-1.05,.66]){
      for(let floor=0;floor<9;floor++){
        const y=.40+floor*.29;
        B("corporate-spandrel",2.48,.047,.037,0,y,z,m.steel);
        for(let j=0;j<8;j++){
          const x=-1.08+j*.31;
          B("corporate-glass-curtain-panel",.28,.223,.025,x,y+.142,z,panelMat);
          B("corporate-window-vertical-mullion",.025,.26,.055,x+.155,y+.14,z,
            mullion);
        }
      }
    }
    for(const x of [-1.24,1.24]){
      for(let floor=0;floor<9;floor++){
        const y=.40+floor*.29;
        for(let j=0;j<4;j++)
          B("corporate-side-glazing",.024,.23,.31,x,y+.14,-.80+j*.43,panelMat);
      }
    }
    B("corporate-marble-podium",3.30,.76,2.15,0,.46,.05,m.stone);
    S("corporate-revolving-entrance",.91,.67,.16,.08,0,.49,1.17,m.darkGlass);
    for(let i=0;i<4;i++){
      const door=B("revolving-door-leaf",.028,.53,.59,0,.47,1.29,m.steel);
      door.rotation.y=i*Math.PI/4;
    }
    B("corporate-canopy",1.75,.09,.87,0,.95,1.10,m.steel);
    B("corporate-roof-penthouse",1.15,.24,.75,0,3.14,-.10,m.dark);
    B("corporate-rooftop-antenna",.045,.38,.045,.40,3.40,-.12,m.steel);
    for(const x of [-1.13,1.13])
      B("corporate-podium-bollard",.10,.32,.10,x,.31,1.28,m.muted);
  }
  function bullBear(bull:boolean){
    // Animal anatomy is intentionally a stylized physical maquette, *not*
    // an unreviewed photoreal sculpt. Genuine anatomy requires licensed
    // sculpted mesh + photographic PBR maps and visual approval.
    const bronze=material(bull?"#66503C":"#4E4743",.81,.27);
    const black=material("#18181A",.31,.44);
    sphere(bull?"bull-muscular-torso":"bear-heavy-torso",.96,-.12,1.42,0,
      bronze,1.35,bull?.75:.92,bull?.70:.90);
    sphere("animal-chest",.72,.68,1.57,0,bronze,.82,1.03,.79);
    const head=sphere("animal-head",.50,1.09,bull?1.79:1.42,.08,
      bronze,bull?1.13:1.10,bull?.72:.88,.9);
    head.rotation.z=bull?-.14:.15;
    sphere("animal-muzzle",.35,1.50,bull?1.66:1.13,.21,
      bronze,1.0,bull?.54:.68,.75);
    sphere("animal-nose",.10,1.74,bull?1.58:1.10,.45,black);
    sphere("animal-eye",.064,1.40,bull?1.92:1.58,.47,black);
    for(const x of [-.91,.83]){
      for(const z of [-.45,.44]){
        const upper=sphere("animal-upper-leg",.23,x,1.00,z,bronze,1,1.4,.92);
        upper.rotation.z=x<0?.09:-.13;
        const hoof=box(.31,.14,.32,x,.19,z,black);
        named(hoof,bull?"bull-cloven-hoof":"bear-clawed-paw");
        for(let i=0;i<3&&!bull;i++)
          B("bear-claw",.045,.12,.07,x-.08+i*.09,.16,z+.19,m.ink);
      }
    }
    if(bull){
      for(const zz of [-.40,.42])
        tube("bull-curved-taper-horn",[
          new Vector3(1.05,2.13,zz),new Vector3(1.30,2.36,zz*1.6),
          new Vector3(1.42,2.52,zz*1.75),new Vector3(1.51,2.60,zz*1.58)],.072,m.paper);
      tube("bull-lashing-tail",[
        new Vector3(-1.39,1.65,0),new Vector3(-1.75,1.42,.15),
        new Vector3(-1.85,1.73,.32)],.065,bronze);
    }else{
      for(const zz of [-.32,.40])
        sphere("bear-rounded-ears",.19,1.08,1.83,zz,bronze,.8,1,1.3);
      sphere("bear-neck-hump",.57,.50,2.05,-.04,bronze,.8,.8,.9);
    }
    B("sculpture-stone-plinth",3.94,.22,2.15,0,.10,0,m.stone);
  }
  switch(kind){
    case "workstation":workstation();return true;
    case "press":press();return true;
    case "bag":bag();return true;
    case "check":check();return true;
    case "corporate":corporate();return true;
    case "bull":bullBear(true);return true;
    case "bear":bullBear(false);return true;
    default:return false;
  }
}
