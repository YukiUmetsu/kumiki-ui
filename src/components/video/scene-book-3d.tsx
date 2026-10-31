/** Optional physical page-turn hero built from a deforming Three.js leaf.
 * Uses Kumiki's existing studio / HeroAssetViewer render path. All illustrations
 * and typography on the generated paper are drawn locally; no remote assets.
 * The standard source-distributed PageTurnStory remains GPU-free.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BackSide, BoxGeometry, CanvasTexture, CylinderGeometry, DataTexture,
  FrontSide, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
  PlaneGeometry, RGBAFormat, SRGBColorSpace, UnsignedByteType,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../../../registry/craft/hero-asset";
import type { HeroAsset } from "../../../registry/craft/hero-asset";
import { HeroAssetViewer } from "../../../registry/craft/hero-viewer";
import type { HeroStudioOptions } from "../../../registry/craft/hero-studio";
import { composeHeroScene, createStageSet } from "../../../registry/craft/hero-stage-set";
import type { HeroComposition } from "../../../registry/craft/hero-stage-set";
import { deformPaperPositions, paperCurlPose } from "../../../registry/craft/paper-curl";
import { paintTexture } from "../../../registry/craft/canvas-texture";
import { smooth } from "../../../registry/craft/hero-action";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";

type Page = { heading: string; text?: string; image?: { id:string; src:string } };
/** Both ST1's original pages and the richer book's paired spreads are supported. */
function bookPages(content:SceneTemplateSpec<"page-turn-story">["content"]):Page[]{
  if(content.pages?.length)return content.pages;
  return content.spreads?.map((spread,index)=>({
    heading:spread.right.heading??spread.left.heading??`Spread ${index+1}`,
    text:spread.right.text??spread.left.text,
    image:spread.right.image??spread.left.image,
  }))??[];
}
const PAGE_WIDTH=1.75,PAGE_HEIGHT=2.42;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));

function hardcoverTexture(title:string){
  return paintTexture(1024,1400,(ctx,w,h)=>{
    ctx.fillStyle="#1e3941";ctx.fillRect(0,0,w,h);
    const gold="#bda178";
    ctx.strokeStyle=gold;ctx.lineWidth=7;ctx.strokeRect(54,56,w-108,h-112);
    ctx.lineWidth=2;ctx.globalAlpha=.65;ctx.strokeRect(75,76,w-150,h-152);ctx.globalAlpha=1;
    ctx.fillStyle=gold;ctx.textAlign="center";
    ctx.font="bold 28px Georgia,serif";ctx.fillText("A COLLECTION OF STORIES",w/2,220,w-150);
    ctx.font="bold 74px Georgia,serif";
    const words=title.trim().split(/\s+/);let line="",y=560,lines=0;
    for(const word of words){
      const next=line?line+" "+word:word;
      if(ctx.measureText(next).width>w-180&&line){
        ctx.fillText(line,w/2,y,w-160);line=word;y+=96;lines++;
        if(lines>=3)break;
      }
      else line=next;
    }
    if(line)ctx.fillText(lines>=3&&words.length>12?line.slice(0,16)+"…":line,w/2,y,w-160);
    ctx.lineWidth=4;ctx.strokeStyle=gold;
    ctx.beginPath();ctx.moveTo(w*.25,h*.73);ctx.lineTo(w*.75,h*.73);ctx.stroke();
    ctx.font="italic 25px Georgia,serif";ctx.fillText("An illustrated edition",w/2,h*.82,w-140);
    // Deliberate linen weave, not an arbitrary tiled grunge map.
    ctx.globalAlpha=.045;ctx.strokeStyle="#e4d5b7";ctx.lineWidth=1;
    for(let x=0;x<w;x+=5){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let yy=0;yy<h;yy+=5){ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke();}
    ctx.globalAlpha=1;
  },{fallback:[30,58,65,255],anisotropy:16});
}
function endpaperTexture(){
  return paintTexture(768,1024,(ctx,w,h)=>{
    ctx.fillStyle="#b0c0b6";ctx.fillRect(0,0,w,h);
    // Discreet marbling, printed and matte like an endpaper, not a glow effect.
    ctx.strokeStyle="#657f78";ctx.globalAlpha=.15;ctx.lineWidth=2;
    for(let i=0;i<80;i++){
      ctx.beginPath();const yy=i*h/80;
      for(let x=0;x<=w;x+=12){const y=yy+9*Math.sin(x*.014+i*.28)+4*Math.sin(x*.037-i*.41);
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
      ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.strokeStyle="#e8e3cc";ctx.lineWidth=6;
    ctx.strokeRect(37,37,w-74,h-74);
    ctx.strokeStyle="#5c756d";ctx.lineWidth=2;
    ctx.strokeRect(56,56,w-112,h-112);
  },{fallback:[172,191,180,255],anisotropy:16});
}

/** A deterministic original typographic texture. This optional 3D preview
 * uses headings/text. The GPU-free scene remains the correct renderer for
 * authored raster illustration pages until a rights-checked UV bridge exists.
 */
function pageTexture(page:Page,index:number,ink:string,paper:string,source?:HTMLImageElement){
  const canvas=typeof document!=="undefined"?document.createElement("canvas"):undefined;
  // DOM test environments may intentionally omit Canvas2D. Keep geometry
  // creation testable without requiring a browser GPU or a native canvas mock.
  let ctx:CanvasRenderingContext2D|null=null;
  try { ctx=canvas?.getContext("2d")??null; } catch { ctx=null; }
  if(ctx&&canvas){
    canvas.width=512;canvas.height=720;
    ctx.fillStyle=paper;ctx.fillRect(0,0,512,720);
    const inkColor=/^#[0-9a-f]{3,8}$/i.test(ink)?ink:"#26344b";
    ctx.strokeStyle=inkColor;ctx.globalAlpha=.34;ctx.lineWidth=2;
    ctx.strokeRect(35,36,442,647);ctx.globalAlpha=1;
    ctx.textAlign="center";ctx.fillStyle=inkColor;
    ctx.font="bold 17px Georgia, serif";ctx.fillText("THE EXPLORER'S JOURNAL",256,88);
    ctx.font="bold 43px Georgia, serif";
    const title=page.heading.length>20?page.heading.slice(0,19)+"…":page.heading;
    ctx.fillText(title,256,174,425);
    ctx.fillStyle="#728a83";ctx.fillRect(81,199,350,3);
    // In the browser, the author-provided image is decoded before the 3D
    // renderer mounts. This is the actual page image, not generated artwork.
    if(source){
      ctx.save();
      ctx.beginPath();
      if(typeof ctx.roundRect==="function")ctx.roundRect(77,249,360,268,12);
      else ctx.rect(77,249,360,268);
      ctx.clip();
      ctx.fillStyle="#d3d4ca";ctx.fillRect(77,249,360,268);
      // Center-fit instead of stretching. An author's page image may be
      // portrait, wide landscape, or square; all proportions are preserved.
      const sourceW=source.naturalWidth,sourceH=source.naturalHeight;
      if(sourceW<=0||sourceH<=0)throw new Error("Decoded page image has no dimensions");
      const fit=Math.min(360/sourceW,268/sourceH);
      const w=sourceW*fit,h=sourceH*fit;
      ctx.drawImage(source,77+(360-w)/2,249+(268-h)/2,w,h);
      ctx.restore();
    }
    // Preserve original procedural illustration for Node/geometry-only tests
    // without a browser decode stage or when this source adapter is not used.
    if(!source){ctx.save();ctx.translate(256,385);
    for(let i=0;i<7;i++){
      ctx.beginPath();ctx.ellipse(0,0,144-i*13,100-i*10,
        .15+i*.09,0,Math.PI*2);
      ctx.strokeStyle=i%2?"#a6b8a4":"#7e9fa8";ctx.lineWidth=i%2?2.3:1.1;ctx.stroke();
    }
    ctx.beginPath();ctx.arc(19,-16,29,0,Math.PI*2);
    ctx.fillStyle="#496e7b";ctx.fill();
    ctx.beginPath();ctx.arc(11,-25,8,0,Math.PI*2);
    ctx.fillStyle="#dbebdf";ctx.fill();
    ctx.restore();}
    ctx.fillStyle=inkColor;ctx.font="20px Georgia, serif";
    const copy=page.text?.trim()||"Every discovery begins with a question.";
    const words=copy.split(/\s+/);
    let line="",y=553;
    for(const word of words){
      const next=line?line+" "+word:word;
      if(ctx.measureText(next).width>375 && line){
        ctx.fillText(line,256,y);line=word;y+=30;if(y>635)break;
      }else line=next;
    }
    if(line && y<=635)ctx.fillText(line,256,y);
    ctx.font="16px Georgia, serif";ctx.fillText(String(index+1).padStart(2,"0"),256,666);
    const texture=new CanvasTexture(canvas);
    texture.colorSpace=SRGBColorSpace;
    return texture;
  }
  // Node/jsdom source unit tests do not need a canvas implementation.
  const data=new Uint8Array([238,230,211,255]);
  const texture=new DataTexture(data,1,1,RGBAFormat,UnsignedByteType);
  texture.needsUpdate=true;
  return texture;
}
export function createBookHero3D(spec:SceneTemplateSpec<"page-turn-story">,
  pageImages?:readonly (HTMLImageElement|undefined)[],
  options:{deskMounted?:boolean}={}):HeroAsset{
  const resources=createAssetResources();
  const group=new Group();
  const pages=bookPages(spec.content);
  if(!pages.length)throw new Error("The physical book needs at least one authored page or spread.");
  const paper=spec.content.paper?.color??"#f7f1e4";
  const ink=spec.content.paper?.ink??"#2c3746";
  const textures=pages.map((page,i)=>resources.own(pageTexture(page,i,ink,paper,pageImages?.[i])));
  const materials=textures.map(map=>resources.own(new MeshPhysicalMaterial({
    map,roughness:.88,metalness:0,side:FrontSide,
    clearcoat:.09,clearcoatRoughness:.8,
  })));
  const reversed=textures.map(map=>resources.own(new MeshPhysicalMaterial({
    map,roughness:.88,metalness:0,side:BackSide,
    clearcoat:.09,clearcoatRoughness:.8,
  })));
  const boards=resources.own(new MeshStandardMaterial({color:"#294a53",roughness:.78,metalness:.02}));
  const gilt=resources.own(new MeshStandardMaterial({color:"#cba675",roughness:.36,metalness:.62}));
  const backGeo=resources.own(new BoxGeometry(PAGE_WIDTH+.16,PAGE_HEIGHT+.19,.16));
  const cover=new Mesh(backGeo,boards);
  cover.position.set(PAGE_WIDTH/2,0,-.14);cover.castShadow=true;cover.receiveShadow=true;
  group.add(resources.name(cover,"hardback-cover"));
  // A distinct front board pivots about the real spine; it covers the right
  // page block when shut, then sweeps onto the left in a physical half-turn.
  const coverPivot=new Group();
  group.add(resources.name(coverPivot,"front-cover-hinge"));
  const frontBoard=new Mesh(resources.own(new RoundedBoxGeometry(PAGE_WIDTH+.12,PAGE_HEIGHT+.17,.14,4,.045)),boards);
  frontBoard.position.set(PAGE_WIDTH/2,0,.17);frontBoard.castShadow=true;frontBoard.receiveShadow=true;
  coverPivot.add(resources.name(frontBoard,"front-hardcover-board"));
  const coverPrint=resources.own(hardcoverTexture(spec.content.documentTitle));
  const coverInk=resources.own(new MeshPhysicalMaterial({map:coverPrint,roughness:.68,metalness:.12,
    clearcoat:.08,clearcoatRoughness:.75}));
  const goldStamp=new Mesh(resources.own(new PlaneGeometry(PAGE_WIDTH-.18,PAGE_HEIGHT-.22)),coverInk);
  goldStamp.position.set(PAGE_WIDTH/2,0,.247);
  coverPivot.add(resources.name(goldStamp,"embossed-cover-print"));
  const endpaper=resources.own(endpaperTexture());
  const liner=new Mesh(resources.own(new PlaneGeometry(PAGE_WIDTH-.16,PAGE_HEIGHT-.18)),
    resources.own(new MeshPhysicalMaterial({map:endpaper,roughness:.92,metalness:0,side:FrontSide})));
  liner.position.set(PAGE_WIDTH/2,0,.094);liner.rotation.y=Math.PI;
  coverPivot.add(resources.name(liner,"cloth-bound-endpaper"));
  // Rounded paper block beneath the moving leaves, with visible thin fore-edge.
  const leafEdge=resources.own(new MeshStandardMaterial({color:"#ddd3c0",roughness:.94}));
  for(let i=0;i<12;i++){
    const edge=new Mesh(resources.own(new BoxGeometry(PAGE_WIDTH-.08,PAGE_HEIGHT-.065,.004)),leafEdge);
    edge.position.set(PAGE_WIDTH/2,0,-.062+i*.006);edge.receiveShadow=true;
    group.add(edge);
  }
  const spineGeo=resources.own(new CylinderGeometry(.11,.11,PAGE_HEIGHT+.13,24));
  const spine=new Mesh(spineGeo,boards);
  // CylinderGeometry is Y-aligned already, matching the vertical page spine.
  spine.position.set(0,0,-.055);spine.castShadow=true;
  group.add(resources.name(spine,"book-spine"));
  const bandGeo=resources.own(new BoxGeometry(PAGE_WIDTH+.22,.023,.17));
  for(const y of [-1.18,1.18]){
    const band=new Mesh(bandGeo,gilt);band.position.set(PAGE_WIDTH/2,y,-.09);
    group.add(band);
  }
  // Static left/right leaves. The turning leaf has a separate shared geometry
  // with two materials and a hinge at x=0.
  const leftGeo=resources.own(new PlaneGeometry(PAGE_WIDTH,PAGE_HEIGHT,2,2));
  leftGeo.translate(-PAGE_WIDTH/2,0,.013);
  const rightGeo=resources.own(new PlaneGeometry(PAGE_WIDTH,PAGE_HEIGHT,2,2));
  rightGeo.translate(PAGE_WIDTH/2,0,.019);
  const left=new Mesh(leftGeo,materials[0]);
  const right=new Mesh(rightGeo,materials[0]);
  left.receiveShadow=true;right.receiveShadow=true;
  group.add(resources.name(left,"open-left-page"));
  group.add(resources.name(right,"open-right-page"));
  const bendGeo=resources.own(new PlaneGeometry(PAGE_WIDTH,PAGE_HEIGHT,56,12));
  bendGeo.translate(PAGE_WIDTH/2,0,0);
  const rest=new Float32Array(bendGeo.attributes.position.array);
  const leafPivot=new Group();
  leafPivot.position.set(0,0,.041);
  group.add(leafPivot);
  const front=new Mesh(bendGeo,materials[0]);
  const rear=new Mesh(bendGeo,reversed[Math.min(1,pages.length-1)]);
  front.castShadow=true;rear.castShadow=true;
  leafPivot.add(resources.name(front,"turning-front-page"));
  leafPivot.add(resources.name(rear,"turning-back-page"));
  const numberOfPages=pages.length;
  return {
    id:"physical-book-"+spec.id,group,
    bounds:{min:[-2.1,-1.5,-.5],max:[2.1,1.55,1.1]},
    parts:resources.parts,tier:"hero",metersPerUnit:.1,exposure:1.02,
    studio:{palette:"slate",keyAzimuth:32,rimColor:"#ffe0ad"},
    craft:{materials:["matte cotton paper","cloth-covered hardboard","gilt stamped cover and bands"],
      details:["articulated hardcover hinge","12-layer fore-edge","56x12 subdivided curling leaf","distinct front/back textures"]},
    pose(state){
      const frame=Math.max(0,state.frame);
      const openFrames=Math.min(55,Math.floor(spec.durationFrames*.38));
      const opened=state.id==="static"?1:smooth(frame/openFrames);
      coverPivot.rotation.y=-Math.PI*opened;
      left.visible=opened>.75;
      // The text block is already present under the shut cover. It should be
      // revealed by the board's movement, not pop into existence late.
      right.visible=true;
      const elapsed=Math.max(0,frame-openFrames);
      const pageSpan=Math.max(1,(spec.durationFrames-openFrames)/(numberOfPages-1));
      const turn=Math.min(numberOfPages-2,Math.floor(elapsed/pageSpan));
      const local=clamp((elapsed-turn*pageSpan)/pageSpan);
      const turning=state.id!=="static"&&frame>openFrames&&local>=.13&&local<.85;
      const pagePose=paperCurlPose(local,.13,.85,
        spec.content.direction??"left",false);
      const settled=local>=.85||frame>=spec.durationFrames-1;
      left.material=materials[settled?turn:Math.max(0,turn-1)];
      right.material=materials[settled?turn+1:turn];
      leafPivot.visible=turning;
      if(turning){
        front.material=materials[turn];
        rear.material=reversed[turn+1];
        // A vertical product-inspection book uses the native page curl sign.
        // When the whole book lies face-up on the desk, that same positive Y
        // rotation swings the leaf into the tabletop. Reverse the physical
        // hinge arc so the turning page actually rises into visible space.
        leafPivot.rotation.y=(options.deskMounted?-1:1)*pagePose.angleRadians;
        const position=bendGeo.attributes.position;
        deformPaperPositions(rest,position.array as Float32Array,PAGE_WIDTH,pagePose);
        position.needsUpdate=true;
        bendGeo.computeVertexNormals();
        bendGeo.computeBoundingSphere();
      }
    },
    dispose:()=>resources.dispose(),
  };
}
/** The same book mesh placed physically on the shared walnut desktop.
 * This is a composition, not a duplicate book renderer or timeline.
 */
export function createBookOnDesk3D(spec:SceneTemplateSpec<"page-turn-story">,
  pageImages?:readonly (HTMLImageElement|undefined)[],
  studioOverride?:Partial<Omit<HeroStudioOptions,"bounds">>):HeroComposition{
  const book=createBookHero3D(spec,pageImages,{deskMounted:true});
  const scene=composeHeroScene(createStageSet("desk"),[
    {id:"book",asset:book,slot:"mat-center",scale:1.3},
  ],{id:"desk-book-"+spec.id,frame:"set"});
  const holder=scene.group.getObjectByName("item-book");
  if(!holder){scene.dispose();throw new Error("Book anchor missing from desk composition.");}
  holder.rotation.x=-Math.PI/2; // printed page faces upward, spine extends across the tabletop
  // Bottom of the 2.6×-scaled back board is ~.57 set units below the spine
  // origin; compensate so it sits on the .12-high leather mat, not inside it.
  holder.position.y+=.58;
  return {
    ...scene,
    studio:{...scene.studio,palette:"graphite",keyAzimuth:-38,rimColor:"#edd1a5",...studioOverride},
    pose(state){scene.poseItems({book:{id:state.id,frame:state.frame,fps:state.fps}});},
  };
}
export function PhysicalBookHero3D({spec,frame,reducedMotion=false,width=960,height=540,cameraOverride,studioOverride}:{
  spec:SceneTemplateSpec<"page-turn-story">;frame:number;reducedMotion?:boolean;
  width?:number;height?:number;
  cameraOverride?:{position:readonly[number,number,number];target:readonly[number,number,number];fov:number};
  studioOverride?:Partial<Omit<HeroStudioOptions,"bounds">>;
}){
  const [imagery,setImagery]=useState<{images:(HTMLImageElement|undefined)[]}|{error:string}|null>(null);
  useEffect(()=>{
    let alive=true;
    setImagery(null);
    // Provenance and rights stay in the VideoExportStage manifest. The decode
    // stage refuses tainted/cross-origin images rather than inventing content.
    Promise.all(bookPages(spec.content).map(page=>page.image?new Promise<HTMLImageElement>((resolve,reject)=>{
      const source=new Image();
      source.crossOrigin="anonymous";
      source.onload=()=>resolve(source);
      source.onerror=()=>reject(new Error("Cannot decode story image "+page.image!.id));
      source.src=page.image!.src;
    }):Promise.resolve(undefined))).then(images=>{if(alive)setImagery({images});})
      .catch(cause=>{if(alive)setImagery({error:cause instanceof Error?cause.message:String(cause)});});
    return ()=>{alive=false;};
  },[spec]);
  const createAsset=useMemo(()=>()=>createBookOnDesk3D(spec,
    imagery&&"images" in imagery?imagery.images:undefined,studioOverride),[spec,imagery,studioOverride]);
  const cameraPhase=clamp(frame/Math.max(1,spec.durationFrames-1));
  const portrait=height>width;
  const defaultCamera={
    position:portrait ? [8,17,21] as const :
      [8-3*cameraPhase,11-cameraPhase,13-2*cameraPhase] as const,
    target:[-1.5,.4,2.6] as const,fov:portrait?35:36,
  };
  return <div data-km-physical-book-3d=""
    data-km-book-textures={imagery?("error" in imagery?"error":"ready"):"pending"}
    style={{position:"relative",width:"100%",
    aspectRatio:`${width} / ${height}`,background:"#182224",color:"#f5f1e7",overflow:"hidden"}}>
    {imagery&&"images" in imagery&&
    <HeroAssetViewer data-km-frame-addressed="" createAsset={createAsset}
      width={width} height={height} action={reducedMotion?"static":"turn-pages"}
      actionFrame={frame} fps={spec.fps.num/spec.fps.den}
      camera={cameraOverride??defaultCamera} pixelRatio={1.25}
      ariaLabel="Three dimensional storybook with curved turning paper"
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>}
    {imagery&&"error" in imagery&&<div role="alert" style={{position:"absolute",inset:0,
      background:"#122738",color:"#fff0e8",padding:24,display:"grid",placeItems:"center"}}>
      <span>Page texture unavailable: {imagery.error}</span>
    </div>}
  </div>;
}
