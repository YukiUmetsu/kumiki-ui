/** Optional physical page-turn hero built from a deforming Three.js leaf.
 * Uses Kumiki's existing studio / HeroAssetViewer render path. Illustrations
 * and typography are original; optional scanned CC0 PBR maps ship locally.
 * The standard source-distributed PageTurnStory remains GPU-free.
 */
/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from "react";
import {
  BackSide, BoxGeometry, CanvasTexture, CylinderGeometry, DataTexture, DoubleSide,
  FrontSide, Group, InstancedMesh, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
  RepeatWrapping, RGBAFormat, Shape, ShapeGeometry, SRGBColorSpace, Texture, TorusGeometry,
  UnsignedByteType, Vector2,
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
import { evaluateBookCamera } from "../../../registry/video/book-camera";
export { evaluateBookCamera } from "../../../registry/video/book-camera";
import { applySurfaceDetail } from "../../../registry/craft/surface-detail";
import {
  createBookLeafGeometry, createBookTextblockStratumGeometry,
  createRaisedBookBandGeometry, createRoundedBookSpineGeometry, createLeatherBoardReliefGeometry,
  createBookCoverBoardGeometry,createBookPastedownGeometry,
} from "../../../registry/craft/book-binding-geometry";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import calfColorUrl from "./assets/epic-book/leather_red_02_coll1.jpg?url";
import calfNormalUrl from "./assets/epic-book/leather_red_02_nor_gl.jpg?url";
import calfRoughnessUrl from "./assets/epic-book/leather_red_02_rough.jpg?url";
import walnutColorUrl from "./assets/epic-book/wood_table_001_diff.jpg?url";
import walnutNormalUrl from "./assets/epic-book/wood_table_001_nor_gl.jpg?url";
import walnutRoughnessUrl from "./assets/epic-book/wood_table_001_rough.jpg?url";
import matColorUrl from "./assets/epic-book/brown_leather_albedo.jpg?url";
import matNormalUrl from "./assets/epic-book/brown_leather_nor_gl.jpg?url";
import matRoughnessUrl from "./assets/epic-book/brown_leather_rough.jpg?url";
import paperEdgeColorUrl from "./assets/epic-book/paper_edges_diff.jpg?url";
import paperEdgeNormalUrl from "./assets/epic-book/paper_edges_nor_gl.jpg?url";
import paperEdgeRoughnessUrl from "./assets/epic-book/paper_edges_rough.jpg?url";

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
// The scan covers a much larger hide than a bound folio. Showing its full
// square on a ~23 cm board makes the pores look like upholstery embossing.
const CALF_GRAIN_TILES=1.75;
type SurfacePhotographs = {
  calf: readonly [HTMLImageElement,HTMLImageElement,HTMLImageElement];
  walnut: readonly [HTMLImageElement,HTMLImageElement,HTMLImageElement];
  mat: readonly [HTMLImageElement,HTMLImageElement,HTMLImageElement];
  paper?: readonly [HTMLImageElement,HTMLImageElement,HTMLImageElement];
};
const surfacePhotoUrls = {
  calf: [calfColorUrl,calfNormalUrl,calfRoughnessUrl],
  walnut: [walnutColorUrl,walnutNormalUrl,walnutRoughnessUrl],
  mat: [matColorUrl,matNormalUrl,matRoughnessUrl],
  paper: [paperEdgeColorUrl,paperEdgeNormalUrl,paperEdgeRoughnessUrl],
} as const;

/** Fixed decoded images: no network fetch or material upload during a seek. */
function photographicTexture(image:HTMLImageElement,color=false){
  const texture=new Texture(image);
  if(color)texture.colorSpace=SRGBColorSpace;
  texture.anisotropy=16;
  texture.needsUpdate=true;
  return texture;
}

function paintCoverTooling(ctx:CanvasRenderingContext2D,w:number,h:number,title:string,
  random:()=>number,wear=true){
  const gold="#c7a66a";
  ctx.strokeStyle=gold;ctx.lineWidth=6;ctx.strokeRect(45,51,w-90,h-102);
  ctx.lineWidth=2;ctx.strokeRect(65,72,w-130,h-144);ctx.strokeRect(82,91,w-164,h-182);
  for(const [x,y,sx,sy] of [[92,104,1,1],[w-92,104,-1,1],[92,h-104,1,-1],[w-92,h-104,-1,-1]]){
    ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);ctx.lineWidth=3;
    for(const radius of [22,44,66]){ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI/2);ctx.stroke();}
    ctx.restore();
  }
  const cx=w/2,cy=h*.525;ctx.lineWidth=6;
  for(const radius of [117,104,71]){ctx.beginPath();ctx.arc(cx,cy,radius,0,2*Math.PI);ctx.stroke();}
  for(let spoke=0;spoke<16;spoke++){
    const a=spoke*Math.PI/8,r=spoke%2?55:102;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.sin(a)*r,cy-Math.cos(a)*r);ctx.stroke();
  }
  ctx.fillStyle="#e4c88f";ctx.textAlign="center";
  ctx.font="bold 26px Georgia,serif";ctx.fillText("THE ILLUSTRATED LIBRARY",cx,218,w-170);
  const words=title.trim().toUpperCase().split(/\s+/);const lines:string[]=[];let current="";
  ctx.font="bold 69px Georgia,serif";
  for(const word of words){const next=current?`${current} ${word}`:word;
    if(current&&ctx.measureText(next).width>w-210){lines.push(current);current=word;}else current=next;}
  if(current)lines.push(current);
  lines.slice(0,3).forEach((line,i)=>ctx.fillText(line,cx,326+i*83,w-200));
  ctx.font="italic 28px Georgia,serif";
  ctx.fillText("A voyage through imagined places",cx,h*.845,w-170);
  ctx.font="24px Georgia,serif";ctx.fillText("VOLUME  ·  I",cx,h*.903,w-170);
  // Pinholes in the metal stamping only, never holes in the leather itself.
  if(wear)for(let i=0;i<340;i++){
    const x=random()*w,y=random()*h;
    ctx.clearRect(x,y,.5+random()*2,.5+random()*3);
  }
}

function coverFoilTexture(title:string){
  return paintTexture(1024,1400,(ctx,w,h,random)=>
    paintCoverTooling(ctx,w,h,title,random),
  {fallback:[255,255,255,0],anisotropy:16,seed:911});
}

/** A single physical scale for both scanned grain maps and the printed cover.
 * Poly Haven's leather tiles seamlessly; keep the title/ornament separate. */
function paintScaledCalf(ctx:CanvasRenderingContext2D,w:number,h:number,scan:HTMLImageElement){
  const tileW=w/CALF_GRAIN_TILES,tileH=h/CALF_GRAIN_TILES;
  for(let y=0;y<h;y+=tileH)for(let x=0;x<w;x+=tileW)
    ctx.drawImage(scan,x,y,tileW+.5,tileH+.5);
}

/** Bookbinding wear is directional: hands polish corners and the joint,
 * while the original dyed leather remains largely intact at the center.
 * Reuse the same spots for color and roughness so they respond to light. */
function paintCalfHandling(ctx:CanvasRenderingContext2D,w:number,h:number,
  mode:"color"|"roughness"){
  // The *same* abrasion locations modify dye and roughness. Independent
  // seeds previously made bright spots reflect like untouched calfskin.
  let wearSeed=0x5a31bd27;
  const random=()=>{wearSeed=(Math.imul(wearSeed,1664525)+1013904223)>>>0;
    return wearSeed/4294967296;};
  const halo=(x:number,y:number,rx:number,ry:number,red:number,green:number,blue:number,alpha:number)=>{
    ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
    const grad=ctx.createRadialGradient(0,0,0,0,0,1);
    grad.addColorStop(0,`rgba(${red},${green},${blue},${alpha})`);
    grad.addColorStop(.55,`rgba(${red},${green},${blue},${alpha*.35})`);
    grad.addColorStop(1,`rgba(${red},${green},${blue},0)`);
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
  };
  // Thumb-polished board corners; the uneven color is not a uniform border.
  for(const [x,y,rx,ry,a] of [
    [35,38,155,168,.24],[w-40,39,133,138,.20],
    [45,h-40,184,152,.34],[w-47,h-46,159,189,.25],
  ]){
    if(mode==="color")halo(x,y,rx,ry,195,123,83,a);
    else halo(x,y,rx,ry,77,77,77,a*1.35);
  }
  // Dark, frequently flexed hinge and a softer finger-held fore edge.
  if(mode==="color"){
    halo(0,h*.48,95,h*.7,33,15,17,.25);
    halo(w,h*.55,90,h*.6,127,75,52,.13);
  }else{
    halo(0,h*.48,80,h*.7,67,67,67,.34);
    halo(w,h*.55,84,h*.6,94,94,94,.22);
  }
  // Old calf wears at the *turned-over* corners. Short exposed-fibre dashes
  // follow those corners, with the same deterministic coordinates in both
  // dyed color and microfacet roughness maps. Avoid a perfectly uniform halo.
  for(const [cornerX,cornerY,sx,sy] of [
    [0,0,1,1],[w,0,-1,1],[0,h,1,-1],[w,h,-1,-1],
  ]){
    for(let i=0;i<38;i++){
      const along=2+Math.pow(random(),1.8)*42;
      const inset=1+Math.pow(random(),2.0)*17;
      const horizontal=random()>.5;
      const x=cornerX+sx*(horizontal?along:inset);
      const y=cornerY+sy*(horizontal?inset:along);
      const length=1+random()*12;
      ctx.strokeStyle=mode==="color"?
        `rgba(222,153,108,${.03+random()*.12})`:
        `rgba(237,237,237,${.04+random()*.12})`;
      ctx.lineWidth=.35+random()*1.3;
      ctx.beginPath();ctx.moveTo(x,y);
      if(horizontal)ctx.lineTo(x+sx*length,y+sy*(random()-.5)*2);
      else ctx.lineTo(x+sx*(random()-.5)*2,y+sy*length);
      ctx.stroke();
    }
  }
  // Short aligned abrasions where covers rub against shelves or fingers.
  // Their density is concentrated near the *edges*, not arbitrary dirt.
  for(let i=0;i<165;i++){
    const edge=Math.floor(random()*4),along=random(),inset=7+random()*70;
    const x=edge===0?inset:edge===1?w-inset:along*w;
    const y=edge===2?inset:edge===3?h-inset:along*h;
    const length=2+random()*19;
    ctx.strokeStyle=mode==="color"?
      `rgba(218,155,104,${.025+random()*.065})`:
      `rgba(226,226,226,${.028+random()*.058})`;
    ctx.lineWidth=.35+random()*.85;
    ctx.beginPath();ctx.moveTo(x,y);
    if(edge<2)ctx.lineTo(x+(random()-.5)*3,y+length);
    else ctx.lineTo(x+length,y+(random()-.5)*3);
    ctx.stroke();
  }
}

function hardcoverRoughnessTexture(roughScan:HTMLImageElement){
  return paintTexture(1024,1400,(ctx,w,h)=>{
    paintScaledCalf(ctx,w,h,roughScan);
    // The aged calf is predominantly matte. An unmodified scan's naturally
    // bright furniture varnish otherwise makes a large plastic-looking glare.
    ctx.fillStyle="rgba(245,245,245,.18)";ctx.fillRect(0,0,w,h);
    paintCalfHandling(ctx,w,h,"roughness");
  },{color:"data",fallback:[174,174,174,255],anisotropy:16,seed:1409});
}

function hardcoverTexture(title:string,calfPhoto?:HTMLImageElement){
  return paintTexture(1024,1400,(ctx,w,h,random)=>{
    if(calfPhoto){
      // The board already carries the continuous photographic calfskin PBR.
      // A second fully opaque leather rectangle on top caused the obvious
      // darker inset panel in closed-cover renders. Print only the historic
      // ink/gilt ornament here, so the same underlying hide shows across the
      // whole board (including its rounded edge and corners).
      ctx.clearRect(0,0,w,h);
      paintCoverTooling(ctx,w,h,title,random,false);
      return;
    }else{
      const leather=ctx.createLinearGradient(0,0,w,h);
      leather.addColorStop(0,"#4a2922");leather.addColorStop(.5,"#34201c");leather.addColorStop(1,"#513027");
      ctx.fillStyle=leather;ctx.fillRect(0,0,w,h);
    }
    // Calf grain is irregular and small relative to the tooling; visible in a
    // grazing-light closeup without turning the binding into random grunge.
    for(let i=0;i<(calfPhoto?1100:28000);i++){
      const x=random()*w,y=random()*h;
      ctx.fillStyle=`rgba(${random()>.5?"207,158,118":"16,8,6"},${.015+random()*.095})`;
      ctx.fillRect(x,y,.4+random()*3,.4+random()*2);
    }
    // The quiet underprint keeps the chapter readable when the physical
    // metal leaf reflects a dark part of the environment at a grazing angle.
    // The reflective foil sits on a separate plane over this ink foundation.
    paintCoverTooling(ctx,w,h,title,random,!calfPhoto);
  },{fallback:[61,38,30,255],anisotropy:16,seed:911});
}
function endpaperTexture(){
  return paintTexture(768,1024,(ctx,w,h)=>{
    ctx.fillStyle="#a7b7a7";ctx.fillRect(0,0,w,h);
    // Combed marbling: many narrow, colored mineral-pigment veins move around
    // the same swirling currents. At film resolution these must form visible
    // groups rather than 80 near-transparent, nearly horizontal hairlines.
    const veins=["#355b58","#c9af7c","#e4d8b4","#64847a"];
    for(let i=0;i<96;i++){
      const yy=i*h/96;
      ctx.strokeStyle=veins[i%veins.length];ctx.globalAlpha=.27+(i%5)*.055;
      ctx.lineWidth=i%7===0?4.8:2.3;
      ctx.beginPath();
      for(let x=0;x<=w;x+=8){
        const eddy=29*Math.sin((x-330)*.010+i*.13)+13*Math.sin(x*.027-i*.29);
        const y=yy+eddy+9*Math.sin(x*.043+i*.2);
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.strokeStyle="#e1d5ba";ctx.lineWidth=6;
    ctx.strokeRect(37,37,w-74,h-74);
    ctx.strokeStyle="#48645e";ctx.lineWidth=3;
    ctx.strokeRect(56,56,w-112,h-112);
  },{fallback:[172,191,180,255],anisotropy:16});
}

/** Three distinct original copperplate-style illustrations. The atlas is a
 * narrative object: the question begins under a celestial diagram, the
 * journey crosses a hachured mountain pass, and the discovery reaches a
 * coastal observatory. No downloaded map or scanned print is reproduced.
 * All paths are in a 1024×1440 paper texture's inset plate rectangle.
 */
function engraveAtlasPlate(ctx:CanvasRenderingContext2D,index:number){
  ctx.save();ctx.beginPath();ctx.rect(154,393,716,600);ctx.clip();
  const bronze="#715636",ink="#344b40",dark="#26382f";
  const plate=ctx.createLinearGradient(0,393,0,993);
  plate.addColorStop(0,"#e8e0cb");plate.addColorStop(.63,"#d9d1b7");plate.addColorStop(1,"#c7bb9c");
  ctx.fillStyle=plate;ctx.fillRect(154,393,716,600);
  const type=index%3;
  if(type===0){
    // Celestial navigation plate: engraved radial guide, twelve route stars,
    // delicate latitude arcs and a centrally inked compass rose.
    const cx=512,cy=698;
    ctx.strokeStyle="rgba(49,68,57,.36)";ctx.lineWidth=2;
    for(let x=179;x<872;x+=42){ctx.beginPath();ctx.moveTo(x,393);ctx.lineTo(x,993);ctx.stroke();}
    for(let y=419;y<985;y+=39){ctx.beginPath();ctx.moveTo(154,y);ctx.lineTo(870,y);ctx.stroke();}
    ctx.strokeStyle=ink;
    for(const radius of [102,163,217,252]){
      ctx.globalAlpha=radius===217?.91:.73;ctx.lineWidth=radius===217?4.1:2.5;
      ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=1;
    for(let a=0;a<24;a++){
      const theta=a*Math.PI/12,outer=a%3===0?253:244;
      ctx.strokeStyle=bronze;ctx.lineWidth=a%3===0?3.6:2;
      ctx.beginPath();ctx.moveTo(cx+Math.cos(theta)*223,cy+Math.sin(theta)*223);
      ctx.lineTo(cx+Math.cos(theta)*outer,cy+Math.sin(theta)*outer);ctx.stroke();
    }
    for(let a=0;a<16;a++){
      const theta=a*Math.PI/8,tip=a%2===0?94:63;
      ctx.beginPath();ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.sin(theta-.12)*tip,cy-Math.cos(theta-.12)*tip);
      ctx.lineTo(cx+Math.sin(theta)*15,cy-Math.cos(theta)*15);
      ctx.closePath();ctx.fillStyle=a%2?bronze:dark;ctx.globalAlpha=.95;ctx.fill();
    }
    ctx.globalAlpha=1;
    for(let i=0;i<24;i++){
      const a=i*2.39996,r=118+(i%6)*22,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
      const arm=i%5===0?10:5;
      ctx.strokeStyle=i%3===0?bronze:ink;ctx.lineWidth=2.6;
      ctx.beginPath();ctx.moveTo(x-arm,y);ctx.lineTo(x+arm,y);ctx.moveTo(x,y-arm);
      ctx.lineTo(x,y+arm);ctx.stroke();
    }
    ctx.font="italic 25px Georgia,serif";ctx.fillStyle=dark;ctx.textAlign="center";
    ctx.fillText("THE UNCHARTED SKY",512,451);
    ctx.font="19px Georgia,serif";ctx.fillText("N · E · S · W",512,962);
  } else if(type===1){
    // Mountain route plate: overlapping relief contours and dense hachures,
    // following 19th-century engraved atlas conventions without copying one.
    for(let ridge=0;ridge<10;ridge++){
      const baseline=559+ridge*46,height=120-ridge*8;
      const curve=(x:number)=>baseline-(Math.sin(x*.008+ridge*.85)*.46+
        Math.cos(x*.015-ridge*.9)*.28+Math.sin(x*.032+ridge)*.13+
        Math.abs(Math.sin(x*.042+ridge*.37))*.13)*height;
      ctx.beginPath();ctx.moveTo(148,1004);
      for(let x=148;x<=878;x+=7)ctx.lineTo(x,curve(x));
      ctx.lineTo(878,1004);ctx.closePath();
      ctx.fillStyle=ridge%2?"rgba(77,92,73,.34)":"rgba(74,79,60,.4)";ctx.fill();
      ctx.strokeStyle=`rgba(43,61,50,${.68+ridge*.025})`;ctx.lineWidth=2.9;ctx.stroke();
      for(let x=159;x<858;x+=10){
        const yy=curve(x),h=10+(ridge%4)*4;
        ctx.strokeStyle="rgba(47,62,49,.61)";ctx.lineWidth=2.1;
        ctx.beginPath();ctx.moveTo(x,yy+5);ctx.lineTo(x+5,yy+h);ctx.stroke();
      }
    }
    ctx.strokeStyle="#5d553e";ctx.lineWidth=5.5;ctx.setLineDash([11,9]);
    ctx.beginPath();ctx.moveTo(234,880);ctx.bezierCurveTo(325,720,474,837,560,652);
    ctx.bezierCurveTo(634,575,720,646,805,489);ctx.stroke();ctx.setLineDash([]);
    for(const [x,y] of [[234,880],[560,652],[805,489]]){
      ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fillStyle=bronze;ctx.fill();
      ctx.strokeStyle="#f1e6cb";ctx.lineWidth=3;ctx.stroke();
    }
    ctx.font="italic 22px Georgia,serif";ctx.fillStyle=dark;
    ctx.fillText("THE HIGH PASS",622,484);ctx.fillText("SOUTHERN VALLEY",225,932);
  } else {
    // Coastal discovery chart: the ochre continent occupies the west;
    // fine parallel current strokes and a small tower identify the harbor.
    ctx.beginPath();ctx.moveTo(154,393);ctx.lineTo(460,393);
    for(let y=393;y<=1002;y+=8){
      const x=445+53*Math.sin(y*.008+.5)+27*Math.cos(y*.024);
      ctx.lineTo(x,y);
    }
    ctx.lineTo(154,1002);ctx.closePath();
    ctx.fillStyle="rgba(103,116,81,.52)";ctx.fill();
    ctx.strokeStyle=dark;ctx.lineWidth=5.5;ctx.stroke();
    // Hand-engraved coastal relief strokes follow the coast without forming
    // mechanically even horizontal stripes.
    for(let row=0;row<55;row++){
      const y=411+row*10.5,x=390+51*Math.sin(y*.008+.5)+24*Math.cos(y*.024);
      ctx.strokeStyle="rgba(44,61,50,.55)";ctx.lineWidth=2.2;
      ctx.beginPath();ctx.moveTo(x-12,y-3);ctx.lineTo(x-34-(row%4)*6,y+10);ctx.stroke();
    }
    for(let row=0;row<24;row++){
      const y=412+row*24;
      ctx.strokeStyle="rgba(51,83,80,.39)";ctx.lineWidth=2.5;
      for(let col=0;col<5;col++){
        const x=520+col*78+(row%2)*19;
        ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+17,y-6,x+32,y+5,x+45,y);ctx.stroke();
      }
    }
    // Inked lighthouse/observatory, printed as linework rather than a solid
    // polygon: roofs, cornice and brickwork remain legible at modest scale.
    ctx.fillStyle="#d1bea0";ctx.strokeStyle=dark;ctx.lineWidth=3;
    ctx.fillRect(347,556,57,164);ctx.strokeRect(347,556,57,164);
    ctx.fillRect(335,536,81,26);ctx.strokeRect(335,536,81,26);
    ctx.beginPath();ctx.moveTo(338,536);ctx.lineTo(375,492);ctx.lineTo(414,536);
    ctx.closePath();ctx.fill();ctx.stroke();
    for(let row=0;row<8;row++){
      const y=572+row*18;
      ctx.strokeStyle="rgba(48,66,58,.4)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(350,y);ctx.lineTo(402,y);ctx.stroke();
    }
    ctx.fillStyle=dark;ctx.fillRect(370,587,11,24);ctx.fillRect(370,641,11,24);
    ctx.beginPath();ctx.moveTo(375,490);ctx.lineTo(375,469);ctx.strokeStyle=bronze;
    ctx.lineWidth=4;ctx.stroke();
    ctx.strokeStyle=bronze;ctx.lineWidth=4;ctx.setLineDash([8,10]);
    ctx.beginPath();ctx.moveTo(395,750);ctx.bezierCurveTo(546,872,776,813,773,529);ctx.stroke();ctx.setLineDash([]);
    ctx.font="italic 22px Georgia,serif";ctx.fillStyle=dark;
    ctx.fillText("THE OBSERVATORY",188,755);ctx.fillText("EASTERN SEA",679,464);
  }
  ctx.restore();
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
    const W=1024,H=1440;
    canvas.width=W;canvas.height=H;
    const grain=ctx.createLinearGradient(0,0,W,H);
    grain.addColorStop(0,"#eee2c8");grain.addColorStop(.44,paper);grain.addColorStop(1,"#e1d3b8");
    ctx.fillStyle=grain;ctx.fillRect(0,0,W,H);
    // Fixed-seed fibres, tide marks and print plate wear survive arbitrary seeks.
    let seed=(index+1)*2654435761>>>0;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<14500;i++){
      ctx.fillStyle=rand()>.5?"rgba(100,73,46,.07)":"rgba(255,253,228,.17)";
      ctx.fillRect(rand()*W,rand()*H,.4+rand()*1.6,1+rand()*9);
    }
    const inkColor=/^#[0-9a-f]{3,8}$/i.test(ink)?ink:"#26344b";
    ctx.strokeStyle="#89765d";ctx.globalAlpha=.6;ctx.lineWidth=2;
    ctx.strokeRect(76,71,872,1296);ctx.strokeRect(94,89,836,1260);ctx.globalAlpha=1;
    for(const y of [107,1324]){
      ctx.beginPath();ctx.moveTo(128,y);ctx.lineTo(896,y);ctx.strokeStyle="#a78b60";ctx.lineWidth=3;ctx.stroke();
      for(const x of [120,904]){ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle="#b19263";ctx.fill();}
    }
    ctx.textAlign="center";ctx.fillStyle=inkColor;
    ctx.font="bold 27px Georgia, serif";ctx.fillText("THE EXPLORER'S ATLAS     •     CHAPTER "+String(index+1).padStart(2,"0"),W/2,163);
    ctx.font="bold 79px Georgia, serif";
    const title=page.heading.length>25?page.heading.slice(0,24)+"…":page.heading;
    ctx.fillText(title,W/2,280,824);
    ctx.fillStyle="#91764b";ctx.fillRect(172,330,680,3);
    // In the browser, the author-provided image is decoded before the 3D
    // renderer mounts. This is the actual page image, not generated artwork.
    if(source){
      ctx.save();
      ctx.beginPath();
      if(typeof ctx.roundRect==="function")ctx.roundRect(154,393,716,600,8);
      else ctx.rect(154,393,716,600);
      ctx.clip();
      ctx.fillStyle="#d3d4ca";ctx.fillRect(154,393,716,600);
      // Center-fit instead of stretching. An author's page image may be
      // portrait, wide landscape, or square; all proportions are preserved.
      const sourceW=source.naturalWidth,sourceH=source.naturalHeight;
      if(sourceW<=0||sourceH<=0)throw new Error("Decoded page image has no dimensions");
      const fit=Math.min(716/sourceW,600/sourceH);
      const w=sourceW*fit,h=sourceH*fit;
      ctx.drawImage(source,154+(716-w)/2,393+(600-h)/2,w,h);
      ctx.restore();
    }
    if(!source)engraveAtlasPlate(ctx,index);
    ctx.strokeStyle="#91764b";ctx.lineWidth=3;ctx.strokeRect(153,392,718,602);
    ctx.fillStyle="#725e43";ctx.font="italic 25px Georgia, serif";
    ctx.fillText("PLATE  " + String(index+1).padStart(2,"0") + "   —   An imagined geography",W/2,1049,750);
    ctx.fillStyle=inkColor;ctx.font="32px Georgia, serif";
    const copy=page.text?.trim()||"Every discovery begins with a question.";
    const words=copy.split(/\s+/);
    let line="",y=1142;
    for(const word of words){
      const next=line?line+" "+word:word;
      if(ctx.measureText(next).width>735 && line){
        ctx.fillText(line,W/2,y);line=word;y+=46;if(y>1254)break;
      }else line=next;
    }
    if(line && y<=1254)ctx.fillText(line,W/2,y);
    ctx.font="bold 25px Georgia, serif";ctx.fillText(String(index+1).padStart(2,"0"),W/2,1353);
    const texture=new CanvasTexture(canvas);
    texture.colorSpace=SRGBColorSpace;
    texture.anisotropy=16;
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
  options:{deskMounted?:boolean;photographs?:SurfacePhotographs}={}):HeroAsset{
  const resources=createAssetResources();
  const transform=new Matrix4();
  const group=new Group();
  const pages=bookPages(spec.content);
  if(!pages.length)throw new Error("The physical book needs at least one authored page or spread.");
  const paper=spec.content.paper?.color??"#f7f1e4";
  const ink=spec.content.paper?.ink??"#2c3746";
  const textures=pages.map((page,i)=>resources.own(pageTexture(page,i,ink,paper,pageImages?.[i])));
  const materials=textures.map(map=>resources.own(applySurfaceDetail(new MeshPhysicalMaterial({
    map,color:"#f2ebdf",roughness:.94,metalness:0,side:FrontSide,
    clearcoat:.025,clearcoatRoughness:.95,
  }),{kind:"paper",frequency:112,strength:.00024,roughnessVariation:.12,albedoVariation:.045})));
  // A page seen from its verso after a half-turn has reversed horizontal
  // handedness. Print a mirrored UV on that side so chapter lettering reads
  // normally while the sheet is curling; otherwise it becomes mirror text.
  const versoTextures=textures.map(texture=>{
    const mirrored=resources.own(texture.clone());
    mirrored.repeat.x=-1;mirrored.offset.x=1;mirrored.needsUpdate=true;
    return mirrored;
  });
  const reversed=versoTextures.map(map=>resources.own(applySurfaceDetail(new MeshPhysicalMaterial({
    map,color:"#f2ebdf",roughness:.94,metalness:0,side:BackSide,
    clearcoat:.025,clearcoatRoughness:.95,
  }),{kind:"paper",frequency:112,strength:.00024,roughnessVariation:.12,albedoVariation:.045})));
  const calf=options.photographs?.calf;
  const calfColor=calf&&resources.own(photographicTexture(calf[0],true));
  const calfNormal=calf&&resources.own(photographicTexture(calf[1]));
  const calfRoughness=calf&&resources.own(photographicTexture(calf[2]));
  if(calf)for(const map of [calfColor,calfNormal,calfRoughness]){
    map!.wrapS=map!.wrapT=RepeatWrapping;
    map!.repeat.set(CALF_GRAIN_TILES,CALF_GRAIN_TILES);
  }
  const boards=resources.own(calf?new MeshPhysicalMaterial({
    map:calfColor,normalMap:calfNormal,roughnessMap:calfRoughness,
    color:"#bca9a2",normalScale:new Vector2(.29,.29),roughness:.87,
    metalness:0,clearcoat:.075,clearcoatRoughness:.79,
    sheen:.16,sheenRoughness:.9,sheenColor:"#ac7161",
  }):applySurfaceDetail(new MeshPhysicalMaterial({
    color:"#482a23",roughness:.83,metalness:.01,clearcoat:.1,clearcoatRoughness:.8,
    sheen:.2,sheenRoughness:.92,sheenColor:"#9a654d",
  }),{kind:"fabric",frequency:105,strength:.0007,roughnessVariation:.15,albedoVariation:.1}));
  const gilt=resources.own(applySurfaceDetail(new MeshStandardMaterial({
    color:"#ad9161",roughness:.53,metalness:.59,
  }),{kind:"brushed",frequency:55,strength:.00035,roughnessVariation:.2}));
  const backGeo=resources.own(createBookCoverBoardGeometry(PAGE_WIDTH+.16,PAGE_HEIGHT+.19,.16));
  const cover=new Mesh(backGeo,boards);
  cover.position.set(PAGE_WIDTH/2,0,-.14);cover.castShadow=true;cover.receiveShadow=true;
  group.add(resources.name(cover,"hardback-cover"));
  // A distinct front board pivots about the real spine; it covers the right
  // page block when shut, then sweeps onto the left in a physical half-turn.
  const coverPivot=new Group();
  group.add(resources.name(coverPivot,"front-cover-hinge"));
  const frontBoard=new Mesh(resources.own(createBookCoverBoardGeometry(PAGE_WIDTH+.12,PAGE_HEIGHT+.17,.14)),boards);
  frontBoard.position.set(PAGE_WIDTH/2,0,.17);frontBoard.castShadow=true;frontBoard.receiveShadow=true;
  coverPivot.add(resources.name(frontBoard,"front-hardcover-board"));
  // A cased-in leather binding has a thin, flexible French joint between the
  // rigid board and the rounded back. Keep its dark recess and eased leather
  // lip attached to the *moving* board, instead of stamping a straight line
  // onto the stationary spine or disguising the joint with gold decoration.
  const jointLeather=resources.own(new MeshPhysicalMaterial({
    color:calf?"#4f2725":"#281713",roughness:.94,metalness:0,
    sheen:.15,sheenRoughness:.91,sheenColor:"#905446",
  }));
  const frenchGroove=new Mesh(resources.own(new RoundedBoxGeometry(
    .015,PAGE_HEIGHT+.075,.005,4,.002)),jointLeather);
  frenchGroove.position.set(.097,0,.2515);
  frenchGroove.castShadow=true;
  coverPivot.add(resources.name(frenchGroove,"book-french-groove"));
  const jointLip=new Mesh(resources.own(new CylinderGeometry(.0045,.0045,PAGE_HEIGHT+.055,12)),boards);
  jointLip.position.set(.112,0,.251);
  jointLip.castShadow=true;
  coverPivot.add(resources.name(jointLip,"book-joint-leather-lip"));
  const coverPrint=resources.own(hardcoverTexture(spec.content.documentTitle,calf?.[0]));
  const coverInk=resources.own(calf?new MeshPhysicalMaterial({
    map:coverPrint,normalMap:calfNormal,
    roughnessMap:resources.own(hardcoverRoughnessTexture(calf[2])),
    normalScale:new Vector2(.18,.18),roughness:.86,metalness:.12,
    transparent:true,alphaTest:.08,depthWrite:false,opacity:.83,
    clearcoat:.025,clearcoatRoughness:.86,
  }):applySurfaceDetail(new MeshPhysicalMaterial({
    map:coverPrint,roughness:.76,metalness:.04,clearcoat:.07,clearcoatRoughness:.8,
  }),{kind:"fabric",frequency:138,strength:.00028,roughnessVariation:.17}));
  // Use the same sculpted leather skin for the ink and the actual foil leaf.
  // The only separation is the controlled thin metal-layer clearance.
  const coverRelief=resources.own(createLeatherBoardReliefGeometry(PAGE_WIDTH-.18,PAGE_HEIGHT-.22));
  const goldStamp=new Mesh(coverRelief,coverInk);
  // Raised board face ends at z=.240; a ~.005 leather surface layer
  // allows the stamped pressure grooves to remain flush without clipping.
  goldStamp.position.set(PAGE_WIDTH/2,0,.245);
  coverPivot.add(resources.name(goldStamp,"embossed-cover-print"));
  if(calf){
    const foiledType=resources.own(coverFoilTexture(spec.content.documentTitle));
    const leafMetal=resources.own(new MeshPhysicalMaterial({
      map:foiledType,transparent:true,opacity:.36,alphaTest:.14,depthWrite:false,
      roughness:.36,metalness:.79,clearcoat:.07,clearcoatRoughness:.52,
      side:FrontSide,
    }));
    const tooling=new Mesh(coverRelief,leafMetal);
    tooling.position.set(PAGE_WIDTH/2,0,.2466);
    coverPivot.add(resources.name(tooling,"cover-metallic-foil-stamp"));
  }
  // The two visible foil edge glints align with the *actual* printed
  // finishing template (45/51 and 65/72 px), not an oversized floating frame.
  // The deeper tool compression lives in the shared relief beneath them.
  const outerWidth=(1-90/1024)*(PAGE_WIDTH-.18);
  const outerHeight=(1-102/1400)*(PAGE_HEIGHT-.22);
  const horizontal=new InstancedMesh(resources.own(new BoxGeometry(outerWidth,.0024,.001)),gilt,4);
  const vertical=new InstancedMesh(resources.own(new BoxGeometry(.0024,outerHeight,.001)),gilt,4);
  let border=0;
  for(const [pxX,pxY] of [[45,51],[65,72]]){
    const w=(1-2*pxX/1024)*(PAGE_WIDTH-.18);
    const h=(1-2*pxY/1400)*(PAGE_HEIGHT-.22);
    for(const sign of [-1,1]){
      transform.makeScale(w/outerWidth,1,1);
      transform.setPosition(PAGE_WIDTH/2,sign*h/2,.2465);
      horizontal.setMatrixAt(border,transform);
      transform.makeScale(1,h/outerHeight,1);
      transform.setPosition(PAGE_WIDTH/2+sign*w/2,0,.2465);
      vertical.setMatrixAt(border,transform);
      border++;
    }
  }
  horizontal.instanceMatrix.needsUpdate=true;vertical.instanceMatrix.needsUpdate=true;
  coverPivot.add(resources.name(horizontal,"cover-foil-horizontal"));
  coverPivot.add(resources.name(vertical,"cover-foil-vertical"));
  // The original compass circles are a *pressed* mark. These metal edges
  // are hair-thin gilded glints on top of a separately recessed leather stamp.
  const compassX=(PAGE_WIDTH-.18)/1024,compassY=(PAGE_HEIGHT-.22)/1400;
  const embossedCompass=new Mesh(resources.own(new TorusGeometry(1,.0012,5,96)),gilt);
  embossedCompass.scale.set(117*compassX,117*compassY,1);
  embossedCompass.position.set(PAGE_WIDTH/2,-.025*(PAGE_HEIGHT-.22),.2464);
  coverPivot.add(resources.name(embossedCompass,"cover-gilt-ornament"));
  for(const radius of [104,71]){
    const ring=new Mesh(resources.own(new TorusGeometry(1,.001,5,96)),gilt);
    ring.scale.set(radius*compassX,radius*compassY,1);
    ring.position.copy(embossedCompass.position);
    coverPivot.add(ring);
  }
  const endpaper=resources.own(endpaperTexture());
  const endpaperMaterial=resources.own(new MeshPhysicalMaterial({
    map:endpaper,roughness:.92,metalness:0,side:FrontSide,
  }));
  const liner=new Mesh(resources.own(createBookPastedownGeometry(PAGE_WIDTH-.115,PAGE_HEIGHT-.13)),
    endpaperMaterial);
  liner.receiveShadow=true;
  liner.position.set(PAGE_WIDTH/2,0,.094);liner.rotation.y=Math.PI;
  coverPivot.add(resources.name(liner,"cloth-bound-endpaper"));
  // Bookbinders fold the hide over each board before pasting in the liner.
  // Real narrow leather returns frame that liner on the inside of the cover.
  const turnIn=new Group();
  const longReturn=resources.own(new RoundedBoxGeometry(PAGE_WIDTH+.035,.071,.013,3,.005));
  const shortReturn=resources.own(new RoundedBoxGeometry(.071,PAGE_HEIGHT-.12,.013,3,.005));
  for(const sign of [-1,1]){
    const end=new Mesh(longReturn,boards);
    end.position.set(PAGE_WIDTH/2,sign*(PAGE_HEIGHT/2+.031),.085);
    turnIn.add(end);
    const side=new Mesh(shortReturn,boards);
    side.position.set(PAGE_WIDTH/2+sign*(PAGE_WIDTH/2+.014),0,.085);
    turnIn.add(side);
  }
  coverPivot.add(resources.name(turnIn,"book-leather-turn-in"));
  // Two real masses of paper: sheets leave the right textblock and accumulate
  // on the opened left board. A single permanently full right-hand stack made
  // the turning film read as a rigid flipbook, not a bound volume.
  const TOTAL_STRATA=96,STRATUM=.00079;
  const RIGHT_BASE=-.063,LEFT_BASE=-.093;
  const leafEdge=resources.own(applySurfaceDetail(new MeshStandardMaterial({
    color:"#e6d9bf",roughness:.94,
  }),{kind:"paper",frequency:95,strength:.00025,roughnessVariation:.09}));
  const signatures=new InstancedMesh(resources.own(createBookTextblockStratumGeometry(
    "right",PAGE_WIDTH-.09,PAGE_HEIGHT-.07,.00065,PAGE_WIDTH)),leafEdge,TOTAL_STRATA);
  const leftSignatures=new InstancedMesh(resources.own(createBookTextblockStratumGeometry(
    "left",PAGE_WIDTH-.09,PAGE_HEIGHT-.07,.00065,PAGE_WIDTH)),leafEdge,TOTAL_STRATA);
  signatures.receiveShadow=true;leftSignatures.receiveShadow=true;
  signatures.frustumCulled=false;leftSignatures.frustumCulled=false;
  group.add(resources.name(signatures,"book-page-signatures"));
  group.add(resources.name(leftSignatures,"book-page-signatures-left"));
  // Edge gilding is a thin burnished glaze on the cut fibres, not three
  // bright metal rails. Its independent physical strips leave the printed
  // faces and the central sewing gutter completely unobstructed. The glaze
  // follows each stack's real thickness rather than staying a full-height bar.
  const paperEdgePhoto=options.photographs?.paper;
  const edgeGlaze=resources.own(paperEdgePhoto?new MeshPhysicalMaterial({
    map:resources.own(photographicTexture(paperEdgePhoto[0],true)),
    normalMap:resources.own(photographicTexture(paperEdgePhoto[1])),
    roughnessMap:resources.own(photographicTexture(paperEdgePhoto[2])),
    color:"#dbc3a0",normalScale:new Vector2(.19,.19),
    roughness:.93,metalness:.035,
  }):applySurfaceDetail(new MeshPhysicalMaterial({
    color:"#bda580",roughness:.79,metalness:.17,clearcoat:.06,
  }),{kind:"paper",frequency:118,strength:.00011,roughnessVariation:.13,albedoVariation:.08}));
  // Box UVs run differently on fore cuts and head/tail cuts. The scan's
  // horizontal fibre bands must always follow the stack's Z thickness, not
  // look like transverse lines across the book's height.
  const foreEdgeGlaze=paperEdgePhoto?resources.own(new MeshPhysicalMaterial({
    map:resources.own(photographicTexture(paperEdgePhoto[0],true)),
    normalMap:resources.own(photographicTexture(paperEdgePhoto[1])),
    roughnessMap:resources.own(photographicTexture(paperEdgePhoto[2])),
    color:"#dbc3a0",normalScale:new Vector2(.19,.19),
    roughness:.93,metalness:.035,
  })):edgeGlaze;
  if(paperEdgePhoto){
    for(const texture of [foreEdgeGlaze.map,foreEdgeGlaze.normalMap,foreEdgeGlaze.roughnessMap]){
      if(!texture)continue;
      texture.center.set(.5,.5);texture.rotation=Math.PI/2;
      texture.needsUpdate=true;
    }
  }
  const foreGeometry=resources.own(new BoxGeometry(.008,PAGE_HEIGHT-.07,1));
  const headGeometry=resources.own(new BoxGeometry(PAGE_WIDTH-.09,.008,1));
  const fore=new Mesh(foreGeometry,foreEdgeGlaze);
  fore.position.x=PAGE_WIDTH-.045;
  group.add(resources.name(fore,"book-fore-edge-gilding"));
  const leftFore=new Mesh(foreGeometry,foreEdgeGlaze);
  leftFore.position.x=-PAGE_WIDTH+.045;
  group.add(resources.name(leftFore,"book-left-fore-edge-gilding"));
  const rightEdges=[fore],leftEdges=[leftFore];
  for(const [name,y] of [["head",(PAGE_HEIGHT-.07)/2],["tail",-(PAGE_HEIGHT-.07)/2]] as const){
    const edge=new Mesh(headGeometry,edgeGlaze);
    edge.position.set(PAGE_WIDTH/2,y,0);
    group.add(resources.name(edge,`book-${name}-edge-gilding`));
    rightEdges.push(edge);
    const other=new Mesh(headGeometry,edgeGlaze);
    other.position.set(-PAGE_WIDTH/2,y,0);
    group.add(resources.name(other,`book-left-${name}-edge-gilding`));
    leftEdges.push(other);
  }
  function poseTextblock(leftCount:number){
    const rightCount=TOTAL_STRATA-leftCount;
    for(const [mesh,count,side,base] of [
      [signatures,rightCount,1,RIGHT_BASE],[leftSignatures,leftCount,-1,LEFT_BASE],
    ] as const){
      mesh.count=count;
      for(let i=0;i<count;i++){
        // Tiny coherent deckle in the fore edge, no random frame-time noise.
        transform.makeScale(1-(i%7)*.00055,1-(i%5)*.00035,1);
        transform.setPosition(side*PAGE_WIDTH/2,(i%3-1)*.00055,base+i*STRATUM);
        mesh.setMatrixAt(i,transform);
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
    for(const [edges,count,base] of [
      [rightEdges,rightCount,RIGHT_BASE],[leftEdges,leftCount,LEFT_BASE],
    ] as const){
      const depth=count*STRATUM;
      for(const edge of edges){
        edge.visible=count>0;
        edge.scale.z=depth;
        edge.position.z=base+depth/2;
      }
    }
    return {leftTop:LEFT_BASE+leftCount*STRATUM,rightTop:RIGHT_BASE+rightCount*STRATUM};
  }
  poseTextblock(0);
  // The rounded-back leather is a watertight extruded arch with a return
  // under the cover. Raised bands follow that same arch, rather than five
  // rectangular gold blocks floating across a beveled box.
  const spineLeather=resources.own(calf?new MeshPhysicalMaterial({
    map:calfColor,normalMap:calfNormal,roughnessMap:calfRoughness,
    color:"#986f71",normalScale:new Vector2(.28,.28),roughness:.74,
    metalness:0,clearcoat:.13,clearcoatRoughness:.67,
    sheen:.18,sheenRoughness:.84,sheenColor:"#aa6a56",
  }):new MeshPhysicalMaterial({color:"#3d2522",roughness:.75,metalness:.01,
    clearcoat:.12,clearcoatRoughness:.72}));
  const spine=new Mesh(resources.own(createRoundedBookSpineGeometry(PAGE_HEIGHT+.2)),spineLeather);
  spine.castShadow=true;spine.receiveShadow=true;
  group.add(resources.name(spine,"book-leather-spine"));
  const ribs=new InstancedMesh(resources.own(createRaisedBookBandGeometry(.036)),spineLeather,5);
  const bandGold=new InstancedMesh(resources.own(createRaisedBookBandGeometry(.0045)),gilt,10);
  for(let i=0;i<5;i++){
    const y=-.94+i*.47;
    transform.makeTranslation(0,y,0);ribs.setMatrixAt(i,transform);
    for(const sign of [-1,1]){
      transform.makeTranslation(0,y+sign*.023,0);
      bandGold.setMatrixAt(i*2+(sign+1)/2,transform);
    }
  }
  ribs.instanceMatrix.needsUpdate=true;ribs.castShadow=true;
  group.add(resources.name(ribs,"book-gilt-raised-ribs"));
  bandGold.instanceMatrix.needsUpdate=true;
  group.add(resources.name(bandGold,"book-band-gilt-seams"));
  // Woven silk headbands sit at the text block head and tail, just proud of
  // the rounded spine. The striped braid is individual thread segments.
  const silk=resources.own(new MeshStandardMaterial({color:"#8d4b40",roughness:.82}));
  const braid=resources.own(new MeshStandardMaterial({color:"#d9bd8d",roughness:.79}));
  for(const [end,y] of [["head",1.215],["tail",-1.215]] as const){
    const headband=new Mesh(resources.own(new CylinderGeometry(.057,.057,.34,16)),silk);
    headband.rotation.z=Math.PI/2;headband.position.set(.025,y,-.12);
    group.add(resources.name(headband,`book-headband-${end}`));
    const threadGeo=resources.own(new CylinderGeometry(.0575,.0575,.011,10));
    const threads=new InstancedMesh(threadGeo,braid,12);
    for(let i=0;i<12;i++){
      transform.makeRotationZ(Math.PI/2);
      transform.setPosition(-.125+i*.03,y,-.12);
      threads.setMatrixAt(i,transform);
    }
    threads.instanceMatrix.needsUpdate=true;group.add(threads);
  }
  const ribbonPattern=new Shape();
  ribbonPattern.moveTo(-.043,.31);ribbonPattern.lineTo(.043,.31);
  ribbonPattern.lineTo(.043,-.32);ribbonPattern.lineTo(0,-.25);
  ribbonPattern.lineTo(-.043,-.32);ribbonPattern.closePath();
  const ribbon=new Mesh(resources.own(new ShapeGeometry(ribbonPattern)),
    resources.own(applySurfaceDetail(new MeshStandardMaterial({
      color:"#8b5146",side:DoubleSide,roughness:.95,
    }),{kind:"fabric",frequency:120,strength:.00012,roughnessVariation:.1})));
  ribbon.position.set(.37,-1.40,-.057);ribbon.rotation.z=.04;
  group.add(resources.name(ribbon,"book-silk-ribbon"));
  // Blind debossed title lines on the leather spine provide a readable
  // tactile rhythm even when the foil-stamped title is out of focus.
  const spineLineGeo=resources.own(new BoxGeometry(.012,.27,.012));
  for(const y of [-.69,.69]){
    const line=new Mesh(spineLineGeo,gilt);line.position.set(-.13,y,-.163);
    group.add(line);
  }
  // A narrow linen hinge line, not the outer leather spine, is what is seen
  // between the two top sheets when the text block lies open.
  const gutter=new Mesh(resources.own(new BoxGeometry(.012,PAGE_HEIGHT-.08,.002)),
    resources.own(new MeshStandardMaterial({color:"#cabb9e",roughness:.96})));
  gutter.position.set(0,0,.025);
  group.add(resources.name(gutter,"book-linen-gutter"));
  // An open signature is sculpted around the tight sewing gutter and shoulder
  // on both sides. The visible paper moves vertically as the two textblock
  // masses exchange leaves; it does not hover above a motionless full stack.
  const leftGeo=resources.own(createBookLeafGeometry("left",PAGE_WIDTH,PAGE_HEIGHT));
  const rightGeo=resources.own(createBookLeafGeometry("right",PAGE_WIDTH,PAGE_HEIGHT));
  // Initialize to a genuinely absent left sheet. Even before the first pose,
  // the sole marbled pastedown is the liner on the moving board; the static
  // left geometry is reserved for printed pages that have actually landed.
  const left=new Mesh(leftGeo,materials[0]);
  left.visible=false;
  const right=new Mesh(rightGeo,materials[0]);
  left.receiveShadow=true;right.receiveShadow=true;
  group.add(resources.name(left,"open-left-page"));
  group.add(resources.name(right,"open-right-page"));
  const bendGeo=resources.own(createBookLeafGeometry("right",PAGE_WIDTH,PAGE_HEIGHT,72,24));
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
    craft:{materials:["antique wove paper with printed fibres","grained calf-leather binding","aged gilt tooling","woven silk headbands"],
      details:["raised leather sewing ribs","96 sculpted leaf strata","recessed moving French leather joint",
        "72×24 subdivided curling leaf",
        "double-sided engraved page plates","gilt compass medallion","silk bookmark","articulated hardcover hinge"]},
    pose(state){
      const frame=Math.max(0,state.frame);
      const openFrames=Math.max(1,Math.min(55,Math.floor(spec.durationFrames*.38)));
      const opened=state.id==="static"?1:smooth(frame/openFrames);
      coverPivot.rotation.y=-Math.PI*opened;
      // The pastedown belongs to the moving cover. Before a first leaf has
      // actually landed on the left, displaying a second stationary marbled
      // page creates a floating white triangle and a duplicated endpaper.
      // Visibility is decided below after the page-turn state is evaluated.
      // The text block is already present under the shut cover. It should be
      // revealed by the board's movement, not pop into existence late.
      right.visible=true;
      const elapsed=Math.max(0,frame-openFrames);
      const pageSpan=Math.max(1,(spec.durationFrames-openFrames)/Math.max(1,numberOfPages-1));
      const turn=Math.max(0,Math.min(numberOfPages-2,Math.floor(elapsed/pageSpan)));
      const local=clamp((elapsed-turn*pageSpan)/pageSpan);
      const turning=numberOfPages>1&&state.id!=="static"&&frame>openFrames&&local>=.13&&local<.85;
      // The bound mesh starts on the RIGHT of the gutter. When it lies on
      // the desk it must always swing up and LEFT: letting a legacy "right"
      // metadata value invert the turn sends the sheet *through* the table.
      // Non-desk recipes retain their authored direction.
      const physicalDirection=options.deskMounted?"left":(spec.content.direction??"left");
      const pagePose=paperCurlPose(local,.13,.85,physicalDirection,false);
      const settled=local>=.85||frame>=spec.durationFrames-1;
      const hasLeftPrintedLeaf=numberOfPages>1&&(turn>0||settled);
      left.visible=opened>.75&&hasLeftPrintedLeaf;
      // These three editorial chapters stand for a larger bound textblock.
      // The film turns up to three quarters of its 96 physical leaves; a
      // remaining right-hand section supports the final printed chapter.
      const transfer=(numberOfPages>1?(turn+pagePose.progress)/(numberOfPages-1):0);
      const leftCount=Math.round(TOTAL_STRATA*.75*clamp(transfer));
      const tops=poseTextblock(leftCount);
      left.position.z=tops.leftTop+.0025;
      right.position.z=tops.rightTop+.0025;
      // Never duplicate the marbled pastedown as a stationary left sheet.
      // Once a printed leaf has settled, reveal its chapter over the
      // real accumulated left textblock (and in front of the cover liner).
      left.material=materials[settled?turn:Math.max(0,turn-1)];
      // The following chapter is beneath the turning leaf, already visible
      // as the sheet lifts. Do not swap the printed spread when the leaf
      // disappears; that causes a one-frame illustration/heading flash.
      right.material=materials[turning||settled?Math.min(numberOfPages-1,turn+1):turn];
      leafPivot.visible=turning;
      if(turning){
        front.material=materials[turn];
        // The verso belongs to the current leaf; the *next* chapter is the
        // stationary right-hand leaf underneath it. Printing that next page
        // on the reverse makes chapters jump sides mid-turn.
        rear.material=reversed[turn];
        // A vertical product-inspection book uses the native page curl sign.
        // When the whole book lies face-up on the desk, that same positive Y
        // rotation swings the leaf into the tabletop. Reverse the physical
        // hinge arc so the turning page actually rises into visible space.
        leafPivot.position.z=tops.rightTop+.012+
          (tops.leftTop-tops.rightTop)*pagePose.progress;
        leafPivot.rotation.y=(options.deskMounted?-1:1)*pagePose.angleRadians;
        const position=bendGeo.attributes.position;
        const deformed=position.array as Float32Array;
        deformPaperPositions(rest,deformed,PAGE_WIDTH,pagePose);
        // A rigid Y half-turn inverts the raised paper shoulder in world Z.
        // Without counter-shaping the original leaf relief, the verso sinks
        // *under* the accumulated left signatures near the sewing gutter.
        // A signed cosine progressively reverses the local rest shoulder:
        // at 0° it matches the right textblock, and at 180° the flipped
        // local height once again matches the LEFT textblock from above.
        // The transient curling displacement remains frame-addressable.
        const shoulderOrientation=Math.cos(pagePose.angleRadians);
        for(let i=2;i<deformed.length;i+=3)
          deformed[i]+=rest[i]*(shoulderOrientation-1);
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
  studioOverride?:Partial<Omit<HeroStudioOptions,"bounds">>,
  photographs?:SurfacePhotographs):HeroComposition{
  const book=createBookHero3D(spec,pageImages,{deskMounted:true,photographs});
  const stage=createStageSet("desk",{deskStyle:"heritage"});
  const photoResources:(Texture|MeshPhysicalMaterial|MeshStandardMaterial)[]=[];
  const extraGeometries:BoxGeometry[]=[];
  if(photographs){
    const [woodColor,woodNormal,woodRoughness]=photographs.walnut.map((image,index)=>{
      const texture=photographicTexture(image,index===0);
      // The grain of the scanned table runs lengthwise across the desk.
      texture.center.set(.5,.5);texture.rotation=Math.PI/2;
      // An entire 160 cm tabletop is not one 40–60 cm photographic patch.
      // Keep physical grain scale and all three PBR channels registered.
      texture.wrapS=texture.wrapT=RepeatWrapping;
      texture.repeat.set(2.55,1.42);
      photoResources.push(texture);
      return texture;
    });
    const woodMaterial=new MeshPhysicalMaterial({map:woodColor,
      normalMap:woodNormal,roughnessMap:woodRoughness,
      color:"#c7b6ad",normalScale:new Vector2(.32,.32),roughness:.86,metalness:0,
      clearcoat:.12,clearcoatRoughness:.68});
    photoResources.push(woodMaterial);
    // The scanned walnut is oriented *vertically* in its source photo. The
    // tabletop was rotated ninety degrees for lengthwise grain. Historic
    // solid-wood legs are different: the fibres run with the 70 cm leg axis,
    // not horizontally across it like a decorative printed veneer.
    const verticalLegMaps=photographs.walnut.map((image,index)=>{
      const map=photographicTexture(image,index===0);
      map.wrapS=map.wrapT=RepeatWrapping;
      map.repeat.set(.34,1.25);
      photoResources.push(map);
      return map;
    });
    const verticalLegWood=new MeshPhysicalMaterial({
      map:verticalLegMaps[0],normalMap:verticalLegMaps[1],
      roughnessMap:verticalLegMaps[2],color:"#c7b6ad",
      normalScale:new Vector2(.23,.23),roughness:.88,metalness:0,
      clearcoat:.1,clearcoatRoughness:.74,
    });
    photoResources.push(verticalLegWood);
    const deskTop=stage.group.getObjectByName("desk-walnut-top");
    if(deskTop instanceof Mesh){
      const originalMaterial=deskTop.material;
      stage.group.traverse(child=>{
        if(child instanceof Mesh&&child.material===originalMaterial)
          child.material=child.name.startsWith("desk-heritage-tapered-walnut-leg")?
            verticalLegWood:woodMaterial;
      });
    }
    // Subtle joined-plank lines on the desktop, not raised golden trim.
    // Position above the top face by less than 0.2 mm at this stage scale.
    const woodJointMaterial=new MeshPhysicalMaterial({
      color:"#291a13",roughness:.92,metalness:0,transparent:true,
      opacity:.25,depthWrite:false,
    });
    photoResources.push(woodJointMaterial);
    const plankJointGeo=new BoxGeometry(31.4,.002,.012);
    extraGeometries.push(plankJointGeo);
    for(const [index,z] of [-3.4,1.7].entries()){
      const seam=new Mesh(plankJointGeo,woodJointMaterial);
      seam.position.set(0,.002,z);
      seam.castShadow=false;seam.receiveShadow=true;
      seam.name=`desk-walnut-plank-joint-${index}`;
      stage.group.add(seam);
    }
    const [matColor,matNormal,matRoughness]=photographs.mat.map((image,index)=>{
      const texture=photographicTexture(image,index===0);
      // The source covers about 40 cm; the desk blotter is roughly 85 cm
      // across. Tile to physical scale or the pores look like pebble gravel.
      texture.wrapS=texture.wrapT=RepeatWrapping;
      texture.repeat.set(2.2,1.45);
      photoResources.push(texture);
      return texture;
    });
    const matMaterial=new MeshPhysicalMaterial({map:matColor,
      normalMap:matNormal,roughnessMap:matRoughness,
      color:"#968b83",normalScale:new Vector2(.09,.09),
      roughness:.95,metalness:0,sheen:.09,sheenRoughness:.96,
      sheenColor:"#70584b"});
    photoResources.push(matMaterial);
    const mat=stage.group.getObjectByName("desk-leather-mat");
    if(mat instanceof Mesh)mat.material=matMaterial;
    // Rolled and burnished leather returns run just outside the stitch row,
    // while the top face retains the soft texture of the scanned hide.
    const rolledEdge=new MeshPhysicalMaterial({
      color:"#4b342b",roughness:.9,metalness:0,
      sheen:.16,sheenRoughness:.94,sheenColor:"#84624b",
    });
    photoResources.push(rolledEdge);
    const longEdgeGeo=new BoxGeometry(16.84,.024,.047);
    const shortEdgeGeo=new BoxGeometry(.047,.024,8.78);
    extraGeometries.push(longEdgeGeo,shortEdgeGeo);
    for(const [name,z] of [["near",-2.045],["far",6.845]] as const){
      const edge=new Mesh(longEdgeGeo,rolledEdge);
      edge.position.set(-1.5,.114,z);
      edge.castShadow=true;edge.receiveShadow=true;
      edge.name=`desk-mat-rolled-edge-${name}`;stage.group.add(edge);
    }
    for(const [name,x] of [["left",-9.94],["right",6.94]] as const){
      const edge=new Mesh(shortEdgeGeo,rolledEdge);
      edge.position.set(x,.114,2.4);
      edge.castShadow=true;edge.receiveShadow=true;
      edge.name=`desk-mat-rolled-edge-${name}`;stage.group.add(edge);
    }
    // The construction-preview stitches are intentionally much finer and
    // darker than the earlier high-contrast dotted outline.
    const stitching=stage.group.getObjectByName("desk-mat-stitching");
    if(stitching instanceof InstancedMesh){
      // The generic stage has 2 cm dashes—too widely spaced for this macro.
      // Eight-millimetre hand-sewn passes wrap the actual mat perimeter.
      stitching.visible=false;
      const thread=new MeshStandardMaterial({color:"#6c564a",roughness:.97});
      const stitchGeo=new BoxGeometry(.095,.008,.015);
      const placements:Matrix4[]=[];
      for(const z of [-1.65,6.45])for(let x=-9.55;x<=6.55;x+=.16)
        placements.push(new Matrix4().makeTranslation(x,.125,z));
      for(const x of [-9.65,6.65])for(let z=-1.55;z<=6.35;z+=.16){
        const matrix=new Matrix4().makeRotationY(Math.PI/2);
        matrix.setPosition(x,.125,z);
        placements.push(matrix);
      }
      const saddle=new InstancedMesh(stitchGeo,thread,placements.length);
      placements.forEach((matrix,i)=>saddle.setMatrixAt(i,matrix));
      saddle.instanceMatrix.needsUpdate=true;
      stage.group.add(saddle);saddle.name="desk-mat-saddle-stitches";
      // Each stitch pulls through a tiny darkened hole. Without the
      // perforations, the separate thread cubes seemed glued onto the mat.
      const punctureMaterial=new MeshPhysicalMaterial({
        color:"#261c17",roughness:.98,metalness:0,
      });
      const punctureGeo=new BoxGeometry(.127,.005,.036);
      const punctures=new InstancedMesh(punctureGeo,punctureMaterial,placements.length);
      placements.forEach((matrix,i)=>{
        const under=matrix.clone();
        under.elements[13]=.122;
        punctures.setMatrixAt(i,under);
      });
      punctures.instanceMatrix.needsUpdate=true;
      punctures.name="desk-mat-stitch-perforations";
      stage.group.add(punctures);
      photoResources.push(thread,punctureMaterial);
      // The stage owns its original geometry; track this scene-only detail.
      extraGeometries.push(stitchGeo,punctureGeo);
    }
  }
  const scene=composeHeroScene(stage,[
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
    studio:{...scene.studio,palette:"sand",backdrop:"#44382f",environmentIntensity:.68,
      keyAzimuth:-38,rimColor:"#e8b978",...studioOverride},
    pose(state){scene.poseItems({book:{id:state.id,frame:state.frame,fps:state.fps}});},
    dispose(){
      scene.dispose();for(const item of photoResources)item.dispose();
      for(const geometry of extraGeometries)geometry.dispose();
    },
  };
}
export function PhysicalBookHero3D({spec,frame,reducedMotion=false,width=960,height=540,cameraOverride,studioOverride}:{
  spec:SceneTemplateSpec<"page-turn-story">;frame:number;reducedMotion?:boolean;
  width?:number;height?:number;
  cameraOverride?:{position:readonly[number,number,number];target:readonly[number,number,number];fov:number};
  studioOverride?:Partial<Omit<HeroStudioOptions,"bounds">>;
}){
  const [imagery,setImagery]=useState<{
    images:(HTMLImageElement|undefined)[];photographs:SurfacePhotographs;
  }|{error:string}|null>(null);
  useEffect(()=>{
    let alive=true;
    setImagery(null);
    // Provenance and rights stay in the VideoExportStage manifest. The decode
    // stage refuses tainted/cross-origin images rather than inventing content.
    const authoredPages=Promise.all(bookPages(spec.content).map(page=>page.image?new Promise<HTMLImageElement>((resolve,reject)=>{
      const source=new Image();
      source.crossOrigin="anonymous";
      source.onload=()=>resolve(source);
      source.onerror=()=>reject(new Error("Cannot decode story image "+page.image!.id));
      source.src=page.image!.src;
    }):Promise.resolve(undefined)));
    const decode=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
      const source=new Image();
      source.onload=()=>resolve(source);
      source.onerror=()=>reject(new Error("Cannot decode bundled photographic material: "+url));
      source.src=url;
    });
    const triplet=async(urls:readonly[string,string,string])=>{
      const [color,normal,roughness]=await Promise.all(urls.map(decode));
      return [color,normal,roughness] as const;
    };
    Promise.all([authoredPages,triplet(surfacePhotoUrls.calf),
      triplet(surfacePhotoUrls.walnut),triplet(surfacePhotoUrls.mat),
      triplet(surfacePhotoUrls.paper)]).then(([images,calf,walnut,mat,paper])=>{
        if(alive)setImagery({images,photographs:{calf,walnut,mat,paper}});
      })
      .catch(cause=>{if(alive)setImagery({error:cause instanceof Error?cause.message:String(cause)});});
    return ()=>{alive=false;};
  },[spec]);
  const createAsset=useMemo(()=>()=>createBookOnDesk3D(spec,
    imagery&&"images" in imagery?imagery.images:undefined,studioOverride,
    imagery&&"images" in imagery?imagery.photographs:undefined),[spec,imagery,studioOverride]);
  const defaultCamera=evaluateBookCamera(frame,spec.durationFrames,width,height);
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
