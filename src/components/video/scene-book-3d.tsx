/** Optional physical page-turn hero built from a deforming Three.js leaf.
 * Uses Kumiki's existing studio / HeroAssetViewer render path. All illustrations
 * and typography on the generated paper are drawn locally; no remote assets.
 * The standard source-distributed PageTurnStory remains GPU-free.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BackSide, BoxGeometry, CanvasTexture, CylinderGeometry, DataTexture, DoubleSide,
  FrontSide, Group, InstancedMesh, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
  PlaneGeometry, RGBAFormat, Shape, ShapeGeometry, SRGBColorSpace, TorusGeometry, UnsignedByteType,
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
import { applySurfaceDetail } from "../../../registry/craft/surface-detail";
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
  return paintTexture(1024,1400,(ctx,w,h,random)=>{
    const leather=ctx.createLinearGradient(0,0,w,h);
    leather.addColorStop(0,"#4a2922");leather.addColorStop(.5,"#34201c");leather.addColorStop(1,"#513027");
    ctx.fillStyle=leather;ctx.fillRect(0,0,w,h);
    // Calf grain is irregular and small relative to the tooling; visible in a
    // grazing-light closeup without turning the binding into random grunge.
    for(let i=0;i<28000;i++){
      const x=random()*w,y=random()*h;
      ctx.fillStyle=`rgba(${random()>.5?"207,158,118":"16,8,6"},${.015+random()*.095})`;
      ctx.fillRect(x,y,.4+random()*3,.4+random()*2);
    }
    const gold="#c7a66a";
    ctx.strokeStyle=gold;ctx.lineWidth=6;ctx.strokeRect(45,51,w-90,h-102);
    ctx.lineWidth=2;ctx.strokeRect(65,72,w-130,h-144);ctx.strokeRect(82,91,w-164,h-182);
    // Hand-tooled corners and a sixteen-point cartographic compass medallion.
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
    // Uneven missing gold leaf around exposed edges, not a global opacity.
    for(let i=0;i<340;i++){
      const x=random()*w,y=random()*h;
      ctx.clearRect(x,y,.5+random()*2,.5+random()*3);
    }
  },{fallback:[61,38,30,255],anisotropy:16,seed:911});
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

/** Three distinct original copperplate-style illustrations. The atlas is a
 * narrative object: the question begins under a celestial diagram, the
 * journey crosses a hachured mountain pass, and the discovery reaches a
 * coastal observatory. No downloaded map or scanned print is reproduced.
 * All paths are in a 1024×1440 paper texture's inset plate rectangle.
 */
function engraveAtlasPlate(ctx:CanvasRenderingContext2D,index:number){
  ctx.save();ctx.beginPath();ctx.rect(154,393,716,600);ctx.clip();
  const bronze="#967b52",ink="#455b53",dark="#334942";
  const plate=ctx.createLinearGradient(0,393,0,993);
  plate.addColorStop(0,"#e8e0cb");plate.addColorStop(.63,"#d9d1b7");plate.addColorStop(1,"#c7bb9c");
  ctx.fillStyle=plate;ctx.fillRect(154,393,716,600);
  const type=index%3;
  if(type===0){
    // Celestial navigation plate: engraved radial guide, twelve route stars,
    // delicate latitude arcs and a centrally inked compass rose.
    const cx=512,cy=698;
    ctx.strokeStyle="rgba(66,82,73,.33)";ctx.lineWidth=1.5;
    for(let x=179;x<872;x+=42){ctx.beginPath();ctx.moveTo(x,393);ctx.lineTo(x,993);ctx.stroke();}
    for(let y=419;y<985;y+=39){ctx.beginPath();ctx.moveTo(154,y);ctx.lineTo(870,y);ctx.stroke();}
    ctx.strokeStyle=ink;
    for(const radius of [102,163,217,252]){
      ctx.globalAlpha=radius===217?.66:.42;ctx.lineWidth=radius===217?3:1.5;
      ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=1;
    for(let a=0;a<24;a++){
      const theta=a*Math.PI/12,outer=a%3===0?253:244;
      ctx.strokeStyle=bronze;ctx.lineWidth=a%3===0?3:1;
      ctx.beginPath();ctx.moveTo(cx+Math.cos(theta)*223,cy+Math.sin(theta)*223);
      ctx.lineTo(cx+Math.cos(theta)*outer,cy+Math.sin(theta)*outer);ctx.stroke();
    }
    for(let a=0;a<16;a++){
      const theta=a*Math.PI/8,tip=a%2===0?94:63;
      ctx.beginPath();ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.sin(theta-.12)*tip,cy-Math.cos(theta-.12)*tip);
      ctx.lineTo(cx+Math.sin(theta)*15,cy-Math.cos(theta)*15);
      ctx.closePath();ctx.fillStyle=a%2?bronze:dark;ctx.globalAlpha=.75;ctx.fill();
    }
    ctx.globalAlpha=1;
    for(let i=0;i<24;i++){
      const a=i*2.39996,r=118+(i%6)*22,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
      const arm=i%5===0?10:5;
      ctx.strokeStyle=i%3===0?bronze:ink;ctx.lineWidth=1.4;
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
      const curve=(x:number)=>baseline-(Math.sin(x*.008+ridge*.85)*.55+
        Math.cos(x*.015-ridge*.9)*.32+Math.sin(x*.032+ridge)*.13)*height;
      ctx.beginPath();ctx.moveTo(148,1004);
      for(let x=148;x<=878;x+=7)ctx.lineTo(x,curve(x));
      ctx.lineTo(878,1004);ctx.closePath();
      ctx.fillStyle=ridge%2?"rgba(94,110,91,.20)":"rgba(88,87,69,.25)";ctx.fill();
      ctx.strokeStyle=`rgba(53,71,61,${.4+ridge*.04})`;ctx.lineWidth=1.6;ctx.stroke();
      for(let x=159;x<858;x+=10){
        const yy=curve(x),h=10+(ridge%4)*4;
        ctx.strokeStyle="rgba(54,68,54,.36)";ctx.lineWidth=1.2;
        ctx.beginPath();ctx.moveTo(x,yy+5);ctx.lineTo(x+5,yy+h);ctx.stroke();
      }
    }
    ctx.strokeStyle="#586c65";ctx.lineWidth=4;ctx.setLineDash([9,10]);
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
    ctx.fillStyle="rgba(116,125,88,.35)";ctx.fill();
    ctx.strokeStyle=dark;ctx.lineWidth=4;ctx.stroke();
    // Hand-engraved coastal relief strokes follow the coast without forming
    // mechanically even horizontal stripes.
    for(let row=0;row<55;row++){
      const y=411+row*10.5,x=390+51*Math.sin(y*.008+.5)+24*Math.cos(y*.024);
      ctx.strokeStyle="rgba(53,69,58,.32)";ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(x-12,y-3);ctx.lineTo(x-34-(row%4)*6,y+10);ctx.stroke();
    }
    for(let row=0;row<24;row++){
      const y=412+row*24;
      ctx.strokeStyle="rgba(62,102,99,.25)";ctx.lineWidth=1.5;
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
  // A page seen from its verso after a half-turn has reversed horizontal
  // handedness. Print a mirrored UV on that side so chapter lettering reads
  // normally while the sheet is curling; otherwise it becomes mirror text.
  const versoTextures=textures.map(texture=>{
    const mirrored=resources.own(texture.clone());
    mirrored.repeat.x=-1;mirrored.offset.x=1;mirrored.needsUpdate=true;
    return mirrored;
  });
  const reversed=versoTextures.map(map=>resources.own(new MeshPhysicalMaterial({
    map,roughness:.88,metalness:0,side:BackSide,
    clearcoat:.09,clearcoatRoughness:.8,
  })));
  const boards=resources.own(applySurfaceDetail(new MeshPhysicalMaterial({
    color:"#482a23",roughness:.83,metalness:.01,clearcoat:.1,clearcoatRoughness:.8,
    sheen:.2,sheenRoughness:.92,sheenColor:"#9a654d",
  }),{kind:"fabric",frequency:105,strength:.0007,roughnessVariation:.15,albedoVariation:.1}));
  const gilt=resources.own(applySurfaceDetail(new MeshStandardMaterial({
    color:"#ac8853",roughness:.46,metalness:.68,
  }),{kind:"brushed",frequency:55,strength:.00035,roughnessVariation:.2}));
  const backGeo=resources.own(new RoundedBoxGeometry(PAGE_WIDTH+.16,PAGE_HEIGHT+.19,.16,4,.055));
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
  const embossedCompass=new Mesh(resources.own(new TorusGeometry(.17,.0055,7,64)),gilt);
  embossedCompass.position.set(PAGE_WIDTH/2,-.05,.25);
  coverPivot.add(resources.name(embossedCompass,"cover-gilt-ornament"));
  // Tiny concentric raised tooling catches the key lamp, without metallic
  // light flashes from large mirror-finish polygons.
  for(const radius of [.185,.206]){
    const ring=new Mesh(resources.own(new TorusGeometry(radius,.0019,5,64)),gilt);
    ring.position.copy(embossedCompass.position);ring.position.z+=.001;
    coverPivot.add(ring);
  }
  const endpaper=resources.own(endpaperTexture());
  const liner=new Mesh(resources.own(new PlaneGeometry(PAGE_WIDTH-.16,PAGE_HEIGHT-.18)),
    resources.own(new MeshPhysicalMaterial({map:endpaper,roughness:.92,metalness:0,side:FrontSide})));
  liner.position.set(PAGE_WIDTH/2,0,.094);liner.rotation.y=Math.PI;
  coverPivot.add(resources.name(liner,"cloth-bound-endpaper"));
  // Genuinely separate paper signatures at a finer scale than the 12 toy-like
  // slabs. GPU instances keep the 96 distinct fore-edge strata inexpensive.
  const leafEdge=resources.own(applySurfaceDetail(new MeshStandardMaterial({
    color:"#e6d9bf",roughness:.94,
  }),{kind:"paper",frequency:95,strength:.00025,roughnessVariation:.09}));
  const signatures=new InstancedMesh(
    resources.own(new BoxGeometry(PAGE_WIDTH-.09,PAGE_HEIGHT-.07,.00065)),leafEdge,96);
  const transform=new Matrix4();
  for(let i=0;i<96;i++){
    transform.makeTranslation(PAGE_WIDTH/2,0,-.063+i*.00079);
    signatures.setMatrixAt(i,transform);
  }
  signatures.instanceMatrix.needsUpdate=true;signatures.receiveShadow=true;
  group.add(resources.name(signatures,"book-page-signatures"));
  // A calf-leather rounded spine and the actual raised binding ribs.
  const spine=new Mesh(resources.own(new RoundedBoxGeometry(.24,PAGE_HEIGHT+.2,.20,5,.082)),boards);
  // The structural spine is *behind* the paper joint. A raised central tube
  // in front of both open pages reads as a giant clasp, not a bound book.
  spine.position.set(-.008,0,-.182);spine.castShadow=true;spine.receiveShadow=true;
  group.add(resources.name(spine,"book-leather-spine"));
  const ribs=new InstancedMesh(resources.own(new RoundedBoxGeometry(.255,.035,.213,4,.016)),gilt,5);
  for(let i=0;i<5;i++){transform.makeTranslation(-.008,-.94+i*.47,-.182);ribs.setMatrixAt(i,transform);}
  ribs.instanceMatrix.needsUpdate=true;ribs.castShadow=true;
  group.add(resources.name(ribs,"book-gilt-raised-ribs"));
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
  const bendGeo=resources.own(new PlaneGeometry(PAGE_WIDTH,PAGE_HEIGHT,72,24));
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
    craft:{materials:["antique wove paper with printed fibres","grained calf-leather binding","aged gilt tooling","woven silk headbands"],
      details:["raised leather sewing ribs","96 individually modeled leaf strata","72×24 subdivided curling leaf",
        "double-sided engraved page plates","gilt compass medallion","silk bookmark","articulated hardcover hinge"]},
    pose(state){
      const frame=Math.max(0,state.frame);
      const openFrames=Math.max(1,Math.min(55,Math.floor(spec.durationFrames*.38)));
      const opened=state.id==="static"?1:smooth(frame/openFrames);
      coverPivot.rotation.y=-Math.PI*opened;
      left.visible=opened>.75;
      // The text block is already present under the shut cover. It should be
      // revealed by the board's movement, not pop into existence late.
      right.visible=true;
      const elapsed=Math.max(0,frame-openFrames);
      const pageSpan=Math.max(1,(spec.durationFrames-openFrames)/Math.max(1,numberOfPages-1));
      const turn=Math.max(0,Math.min(numberOfPages-2,Math.floor(elapsed/pageSpan)));
      const local=clamp((elapsed-turn*pageSpan)/pageSpan);
      const turning=numberOfPages>1&&state.id!=="static"&&frame>openFrames&&local>=.13&&local<.85;
      const pagePose=paperCurlPose(local,.13,.85,
        spec.content.direction??"left",false);
      const settled=local>=.85||frame>=spec.durationFrames-1;
      left.material=materials[settled?turn:Math.max(0,turn-1)];
      right.material=materials[settled?Math.min(numberOfPages-1,turn+1):turn];
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
  const scene=composeHeroScene(createStageSet("desk",{deskStyle:"heritage"}),[
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
    studio:{...scene.studio,palette:"sand",backdrop:"#44382f",environmentIntensity:.82,
      keyAzimuth:-38,rimColor:"#e8b978",...studioOverride},
    pose(state){scene.poseItems({book:{id:state.id,frame:state.frame,fps:state.fps}});},
  };
}
/** Frame-addressable lens and target, separate from the generic everyday desk camera.
 * This is exported so framing regressions can be caught without a browser GPU.
 */
export function evaluateBookCamera(frame:number,durationFrames:number,width:number,height:number){
  const cameraPhase=clamp(frame/Math.max(1,durationFrames-1));
  const portraitSweep=smooth(frame/Math.max(1,durationFrames*.23));
  const portrait=height>width;
  return {
    // A vertical frame needs its own close, controlled product shot. Reusing
    // the landscape camera distance leaves the book tiny in empty cyclorama.
    position:portrait ? [5.2-.8*cameraPhase,11.8-1.3*cameraPhase,14.5-2*cameraPhase] as const :
      [8.1-3.7*cameraPhase,11.8-3.1*cameraPhase,15.4-4.7*cameraPhase] as const,
    target:portrait ? [.3-.2*portraitSweep,.6+.12*portraitSweep,2.2-.2*cameraPhase] as const :
      [-1.7+.95*cameraPhase,.35+.35*cameraPhase,2.55-.4*cameraPhase] as const,
    fov:portrait?38:36,
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
