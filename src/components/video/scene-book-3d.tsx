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
import { createAssetResources } from "../../../registry/craft/hero-asset";
import type { HeroAsset } from "../../../registry/craft/hero-asset";
import { HeroAssetViewer } from "../../../registry/craft/hero-viewer";
import { deformPaperPositions, paperCurlPose } from "../../../registry/craft/paper-curl";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";

type Page = SceneTemplateSpec<"page-turn-story">["content"]["pages"][number];
const PAGE_WIDTH=1.75,PAGE_HEIGHT=2.42;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));

/** A deterministic original typographic texture. This optional 3D preview
 * uses headings/text. The GPU-free scene remains the correct renderer for
 * authored raster illustration pages until a rights-checked UV bridge exists.
 */
function pageTexture(page:Page,index:number,ink:string,paper:string,source?:CanvasImageSource){
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
      ctx.beginPath();ctx.roundRect(77,249,360,268,12);ctx.clip();
      ctx.drawImage(source,77,249,360,268);
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
export function createBookHero3D(spec:SceneTemplateSpec<"page-turn-story">,pageImages?:readonly CanvasImageSource[]):HeroAsset{
  const resources=createAssetResources();
  const group=new Group();
  const {pages}=spec.content;
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
  const boards=resources.own(new MeshStandardMaterial({color:"#34556b",roughness:.61,metalness:.08}));
  const gilt=resources.own(new MeshStandardMaterial({color:"#cba675",roughness:.36,metalness:.62}));
  const backGeo=resources.own(new BoxGeometry(PAGE_WIDTH*2+.16,PAGE_HEIGHT+.19,.16));
  const cover=new Mesh(backGeo,boards);
  cover.position.set(0,0,-.14);cover.castShadow=true;cover.receiveShadow=true;
  group.add(resources.name(cover,"hardback-cover"));
  const spineGeo=resources.own(new CylinderGeometry(.11,.11,PAGE_HEIGHT+.13,24));
  const spine=new Mesh(spineGeo,boards);
  // CylinderGeometry is Y-aligned already, matching the vertical page spine.
  spine.position.set(0,0,-.055);spine.castShadow=true;
  group.add(resources.name(spine,"book-spine"));
  const bandGeo=resources.own(new BoxGeometry(PAGE_WIDTH*2+.22,.023,.17));
  for(const y of [-1.18,1.18]){
    const band=new Mesh(bandGeo,gilt);band.position.set(0,y,-.09);
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
    craft:{materials:["matte paper","cloth-covered board","gilt bands"],
      details:["56x12 subdivided paper leaf","distinct front/back textures","nonlinear curl with fixed spine"]},
    pose(state){
      const frame=Math.max(0,state.frame);
      const pageSpan=Math.max(1,spec.durationFrames/numberOfPages);
      const currentIndex=Math.min(numberOfPages-1,Math.floor(frame/pageSpan));
      const previousIndex=Math.max(0,currentIndex-1);
      const local=(frame-currentIndex*pageSpan)/pageSpan;
      const turning=state.id!=="static"&&currentIndex>0&&local<.77;
      const pagePose=paperCurlPose(local,0,.77,
        spec.content.direction??"left",false);
      left.material=materials[previousIndex];
      right.material=materials[currentIndex];
      leafPivot.visible=turning;
      if(turning){
        front.material=materials[previousIndex];
        rear.material=reversed[currentIndex];
        leafPivot.rotation.y=pagePose.angleRadians;
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
export function PhysicalBookHero3D({spec,frame,reducedMotion=false}:{
  spec:SceneTemplateSpec<"page-turn-story">;frame:number;reducedMotion?:boolean;
}){
  const [imagery,setImagery]=useState<{images:HTMLImageElement[]}|{error:string}|null>(null);
  useEffect(()=>{
    let alive=true;
    setImagery(null);
    // Provenance and rights stay in the VideoExportStage manifest. The decode
    // stage refuses tainted/cross-origin images rather than inventing content.
    Promise.all(spec.content.pages.map(page=>new Promise<HTMLImageElement>((resolve,reject)=>{
      const source=new Image();
      source.crossOrigin="anonymous";
      source.onload=()=>resolve(source);
      source.onerror=()=>reject(new Error("Cannot decode story image "+page.image.id));
      source.src=page.image.src;
    }))).then(images=>{if(alive)setImagery({images});})
      .catch(cause=>{if(alive)setImagery({error:cause instanceof Error?cause.message:String(cause)});});
    return ()=>{alive=false;};
  },[spec]);
  const createAsset=useMemo(()=>()=>createBookHero3D(spec,
    imagery&&"images" in imagery?imagery.images:undefined),[spec,imagery]);
  const cameraPhase=clamp(frame/Math.max(1,spec.durationFrames-1));
  return <div data-km-physical-book-3d=""
    data-km-book-textures={imagery?("error" in imagery?"error":"ready"):"pending"}
    style={{position:"relative",width:"100%",
    aspectRatio:"16 / 9",background:"#122738",color:"#f5f1e7",
    borderRadius:16,overflow:"hidden",border:"1px solid rgba(236,219,189,.26)"}}>
    {imagery&&"images" in imagery&&
    <HeroAssetViewer data-km-frame-addressed="" createAsset={createAsset}
      width={960} height={540} action={reducedMotion?"static":"turn-pages"}
      actionFrame={frame} fps={spec.fps.num/spec.fps.den}
      azimuth={reducedMotion?3:3+cameraPhase*8}
      elevation={reducedMotion?12:12+cameraPhase*7}
      zoom={1.23} pixelRatio={1.25}
      ariaLabel="Three dimensional storybook with curved turning paper"
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>}
    {imagery&&"error" in imagery&&<div role="alert" style={{position:"absolute",inset:0,
      background:"#122738",color:"#fff0e8",padding:24,display:"grid",placeItems:"center"}}>
      <span>Page texture unavailable: {imagery.error}</span>
    </div>}
    <div aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none",
      background:"linear-gradient(90deg,rgba(7,22,37,.45),transparent 56%)"}}/>
    <div style={{position:"absolute",top:"7%",left:"5%",maxWidth:"43%",
      pointerEvents:"none",textShadow:"0 2px 14px #102436"}}>
      <div style={{fontSize:12,letterSpacing:2.8,opacity:.85}}>A LIVING STORYBOOK</div>
      <div style={{fontSize:"clamp(18px,2.9vw,32px)",fontWeight:780,lineHeight:1.15,marginTop:7}}>
        {spec.content.documentTitle}
      </div>
    </div>
  </div>;
}
