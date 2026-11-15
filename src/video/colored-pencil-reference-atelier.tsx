import { useEffect, useMemo, useRef, useState } from "react";
import {
  createPencilPhotoStudy,pencilPhotoStrokeCount,PENCIL_PHOTO_DEFAULTS,
} from "./colored-pencil-photo";
import type {
  PencilPhotoPixels,PencilPhotoOptions,PencilPhotoStudy,
} from "./colored-pencil-photo";
import {mapCC0WomanPortraitFeatures} from "./colored-pencil-portrait-guides";
import {createDryPortraitPlate} from "./colored-pencil-dry-portrait";
import {
  createDryPencilHeadPlate,HEAD_STORYBOARD_PHASES,
  selectHeadStoryboardStrokes,
} from "./colored-pencil-full-head";
import {
  compareCC0PortraitTones,compareCC0HairOcclusion,
  compareCC0Vermilion,compareCC0SoftSkin,
  compareCC0LuminousSkin,
  CC0_HAIR_OCCLUSION_PROBE,
} from "./colored-pencil-full-head-tone-proof";
import type {
  PencilToneComparison,CC0HairOcclusionResult,CC0VermilionResult,
  CC0SoftSkinResult,CC0LuminousSkinResult,
} from "./colored-pencil-full-head-tone-proof";

/**
 * Source-backed pencil renderer. The default images are demonstrably public
 * domain / CC0 wildlife *photographs*; artist-owned paintings are never loaded,
 * traced or shipped. Users can upload their own references, wholly in-browser.
 *
 * Wikimedia file records:
 * /wiki/File:Red_fox_detailed_photo.jpg (USFWS, PD)
 * /wiki/File:Perched_blue_and_orange_bird_(Unsplash).jpg (CC0, 2015)
 */
const photos={
  fox:{
    url:"https://upload.wikimedia.org/wikipedia/commons/2/29/Red_fox_detailed_photo.jpg",
    title:"Fox photograph · Sarvis John / USFWS · Public Domain",
    license:"https://commons.wikimedia.org/wiki/File:Red_fox_detailed_photo.jpg",
  },
  kingfisher:{
    url:"https://upload.wikimedia.org/wikipedia/commons/3/32/Perched_blue_and_orange_bird_%28Unsplash%29.jpg",
    title:"Kingfisher photograph · Vincent van Zalinge · CC0",
    license:"https://commons.wikimedia.org/wiki/File:Perched_blue_and_orange_bird_(Unsplash).jpg",
  },
  woman:{
    url:"https://upload.wikimedia.org/wikipedia/commons/1/16/Brunette_woman_portrait_%28Unsplash%29.jpg",
    title:"Human portrait · Christopher Campbell · 2015 CC0",
    license:"https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg",
  },
  man:{
    url:"https://upload.wikimedia.org/wikipedia/commons/0/04/Face_portrait_%28Unsplash%29.jpg",
    title:"Close-up human portrait · William Stitt · 2016 CC0",
    license:"https://commons.wikimedia.org/wiki/File:Face_portrait_(Unsplash).jpg",
  },
} as const;
type Sample=keyof typeof photos;
const control={display:"grid",gap:5,font:"600 13px system-ui"} as const;
const field={padding:"8px 10px",border:"1px solid #AFAEA5",borderRadius:6,
  color:"#2E4147",background:"#FFFAF0",minHeight:40} as const;
const btn={...field,cursor:"pointer"} as const;
const capture=(img:HTMLImageElement,width:number,height:number,
  mode:"fit"|"focus",focal:readonly[number,number],zoom=1):PencilPhotoPixels=>{
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d",{willReadFrequently:true});
  if(!context)throw new Error("Canvas 2D required for image-conditioned pencil mode");
  context.fillStyle="#FAF5ED";
  context.fillRect(0,0,width,height);
  const cover=mode==="focus";
  const scale=(cover?
    Math.max(width/img.naturalWidth,height/img.naturalHeight):
    Math.min(width/img.naturalWidth,height/img.naturalHeight))*(cover?zoom:1);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  // Keep selected face/eye near center, but never create negative margins
  // when zoomed beyond a source edge. Drawing remains from source pixels.
  const dx=cover?Math.max(width-w,Math.min(0,width*.5-w*focal[0])):
    (width-w)*.5;
  const dy=cover?Math.max(height-h,Math.min(0,height*.5-h*focal[1])):
    (height-h)*.5;
  context.drawImage(img,dx,dy,w,h);
  return {width,height,data:context.getImageData(0,0,width,height).data};
};

/** Paint only newly deposited marks during forward playback; reconstruct on seek. */
function paintMarkRange(ctx:CanvasRenderingContext2D,
  study:Pick<PencilPhotoStudy,"strokes">,from:number,to:number){
  ctx.lineCap="round";ctx.lineJoin="round";
  for(let i=from;i<to;i++){
    const stroke=study.strokes[i];
    ctx.beginPath();ctx.moveTo(stroke.x,stroke.y);
    ctx.quadraticCurveTo(stroke.controlX,stroke.controlY,stroke.endX,stroke.endY);
    ctx.strokeStyle=stroke.color;ctx.lineWidth=stroke.width;
    ctx.globalAlpha=stroke.alpha;ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function paint(ctx:CanvasRenderingContext2D,study:PencilPhotoStudy,
  frame:number,source:HTMLCanvasElement,wash:number){
  const {width,height}=study;
  ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
  ctx.fillStyle="#FAF5ED";ctx.fillRect(0,0,width,height);
  const foundation=Math.min(1,Math.max(0,frame/140))*wash;
  if(foundation>0){
    // Source-derived *pigment*, not a full-strength photograph: retain paper
    // voids and let graphite/mid-tone/fur microstroke families carry the value.
    ctx.globalAlpha=foundation;
    ctx.drawImage(source,0,0);
  }
  if(frame>95)paintMarkRange(ctx,study,0,pencilPhotoStrokeCount(study,frame));
  ctx.globalAlpha=1;
}
/** One existing sidebar folder, no external subscription/AI or server upload. */
export function ReferencePencilAtelier({
  initialSample="kingfisher",initialStoryboard=false,
}:{initialSample?:Sample;initialStoryboard?:boolean}={}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const faceMacroRef=useRef<HTMLCanvasElement>(null);
  const dryFaceRef=useRef<HTMLCanvasElement>(null);
  const fullHeadRef=useRef<HTMLCanvasElement>(null);
  const fullHeadSourceRef=useRef<HTMLCanvasElement>(null);
  const storyboardRefs=useRef<(HTMLCanvasElement|null)[]>([]);
  const boundarySourceRef=useRef<HTMLCanvasElement>(null);
  const boundaryPencilRef=useRef<HTMLCanvasElement>(null);
  const featureSourceRef=useRef<HTMLCanvasElement>(null);
  const featureDryRef=useRef<HTMLCanvasElement>(null);
  const underpaint=useRef<HTMLCanvasElement|null>(null);
  const progress=useRef<{study:PencilPhotoStudy;frame:number;drawn:number;wash:number}|null>(null);
  const localObjectUrl=useRef<string|null>(null);
  const sourceImage=useRef<HTMLImageElement>(null);
  // Kingfisher is the preferred first artwork: saturated feather detail gives
  // better immediate source-vs-pencil feedback than a shaded fox background.
  const [sample,setSample]=useState<Sample>(initialSample);
  // Defer initial source assignment until after the first Storybook mount.
  // Explicit selections already load reliably; this avoids the premature
  // first image request being orphaned by Storybook/StrictMode setup.
  const [sourceUrl,setSourceUrl]=useState<string>("");
  const [reload,setReload]=useState(0);
  const [raw,setRaw]=useState<PencilPhotoPixels|null>(null);
  const [aspect,setAspect]=useState<"landscape"|"portrait">("landscape");
  const [framing,setFraming]=useState<"focus"|"fit">("focus");
  const [frame,setFrame]=useState(350);
  const [playing,setPlaying]=useState(false);
  const [error,setError]=useState("");
  const [options,setOptions]=useState<PencilPhotoOptions>(() =>
    initialSample==="woman"||initialSample==="man"
      ? {...PENCIL_PHOTO_DEFAULTS,focus:.63,paper:.14,saturation:.96,edges:.53,density:1.35,depth:.88}
      : {...PENCIL_PHOTO_DEFAULTS});
  const [wash,setWash]=useState((initialSample==="woman"||initialSample==="man") ? .91 : .84);
  const [showReference,setShowReference]=useState(false);
  const [showFaceGuides,setShowFaceGuides]=useState(false);
  const [showFaceMacro,setShowFaceMacro]=useState(false);
  const [showFullHead,setShowFullHead]=useState(initialStoryboard);
  const [showStoryboard,setShowStoryboard]=useState(initialStoryboard);
  const [showHairContact,setShowHairContact]=useState(initialStoryboard);
  const [headScumble,setHeadScumble]=useState(.65);
  const [featureDepth,setFeatureDepth]=useState(.85);
  const [skinCoverage,setSkinCoverage]=useState(.70);
  const [showFeatureAtlas,setShowFeatureAtlas]=useState(initialStoryboard);
  const [featureFocus,setFeatureFocus]=
    useState<"eyes"|"nose"|"lips"|"skin">("lips");
  const [headToneComparison,setHeadToneComparison]=
    useState<PencilToneComparison|null>(null);
  const [headOcclusion,setHeadOcclusion]=
    useState<CC0HairOcclusionResult|null>(null);
  const [vermilionEvidence,setVermilionEvidence]=
    useState<CC0VermilionResult|null>(null);
  const [skinEvidence,setSkinEvidence]=
    useState<CC0SoftSkinResult|null>(null);
  const [lightSkinEvidence,setLightSkinEvidence]=
    useState<CC0LuminousSkinResult|null>(null);
  const [faceMacroRegion,setFaceMacroRegion]=useState<"eyes"|"lips">("eyes");
  const [applyFaceCraft,setApplyFaceCraft]=useState(true);
  const [uploaded,setUploaded]=useState(false);
  const size=aspect==="landscape"?{width:900,height:506}:{width:506,height:900};
  const faceSource=!uploaded&&(sample==="woman"||sample==="man");
  const mode=aspect==="portrait"||faceSource?framing:"fit";
  const focal:readonly[number,number]=uploaded?[.5,.5]:
    sample==="fox"?[.32,.43]:
    sample==="woman"?[.52,.25]:
    sample==="man"?[.5,.53]:[.65,.46];
  const faceZoom=sample==="woman"?2.05:1;
  useEffect(()=>setSourceUrl(prev=>prev||photos[initialSample].url),[initialSample]);

  // Browser-created object URLs are explicitly revoked on replace/unmount,
  // without affecting the in-flight load of the newly selected source.
  useEffect(()=>()=>{if(localObjectUrl.current){
    URL.revokeObjectURL(localObjectUrl.current);localObjectUrl.current=null;
  }},[]);
  const captureSource=(image:HTMLImageElement)=>{
    if(!image.naturalWidth||!image.naturalHeight)return;
    try{
      setRaw(capture(image,size.width,size.height,mode,focal,faceSource?faceZoom:1));
      setError("");
    }catch{
      setRaw(null);
      setError("The image host does not permit Canvas pixels. Upload a locally owned photo.");
    }
  };
  // Browser-native img loads are reliable in React/Storybook StrictMode. The
  // previous detached Image() sometimes stayed pending despite HTTP 200.
  useEffect(()=>{
    const image=sourceImage.current;
    if(image?.complete && image.naturalWidth>0)captureSource(image);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[sourceUrl,reload,size.width,size.height,mode,sample,uploaded,faceZoom,faceSource]);
  useEffect(()=>{
    if(!sourceUrl||raw||error)return;
    if(reload<3){
      // Storybook's first mount may leave the initial CDN image request pending.
      // Re-key the native image after a bounded delay; after changing the
      // source from the selector, ordinary onLoad finishes immediately.
      const timer=window.setTimeout(()=>setReload(n=>n+1),9500);
      return()=>window.clearTimeout(timer);
    }
    const timer=window.setTimeout(()=>setError(
      "Reference still loading. Retry, or choose a local photograph."),16000);
    return()=>window.clearTimeout(timer);
  },[raw,error,sourceUrl,reload]);
  // Reproject photo-source landmarks into every canvas crop; never reuse
  // this woman's face coordinates on the other licensed images or uploads.
  const faceGuides=useMemo(()=>{
    if(!raw||uploaded||sample!=="woman")return undefined;
    const image=sourceImage.current;
    if(!image?.naturalWidth||!image.naturalHeight)return undefined;
    return mapCC0WomanPortraitFeatures({
      width:raw.width,height:raw.height,
      naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,
      mode,focal,zoom:faceSource?faceZoom:1,
    });
  },[raw,uploaded,sample,mode,focal[0],focal[1],faceSource,faceZoom]);
  // Actual render A/B. Source pixels and crop remain identical; only
  // source-aligned feature and facial-plane pencil passes are toggled.
  const study=useMemo(()=>raw?createPencilPhotoStudy(
    raw,options,applyFaceCraft?faceGuides:undefined):null,
    [raw,options,faceGuides,applyFaceCraft]);
  // Pencil-only ArtCraft proof: a separate paper canvas made entirely of
  // algorithmically laid pigment, never a sampled image underpaint.
  const dryPlate=useMemo(()=>raw&&faceGuides&&showFaceMacro?
    createDryPortraitPlate(raw,faceGuides,faceMacroRegion,options.seed):null,
    [raw,faceGuides,showFaceMacro,faceMacroRegion,options.seed]);
  // Opt-in research plate; expensive full-head mark construction is never
  // computed for ordinary video exports or for unrelated photos/characters.
  const headPlate=useMemo(()=>raw&&faceGuides&&showFullHead?
    createDryPencilHeadPlate(raw,faceGuides,options.seed,
      headScumble,featureDepth,skinCoverage):null,
    [raw,faceGuides,showFullHead,options.seed,headScumble,featureDepth,
      skinCoverage]);
  // The static precomputed tone layer is cached: seeking/speed does not
  // recompute pixels, gradients, stochastic paper or stroke directions.
  useEffect(()=>{
    if(!study){underpaint.current=null;progress.current=null;return;}
    const image=document.createElement("canvas");
    image.width=study.width;image.height=study.height;
    const ctx=image.getContext("2d");
    if(!ctx)return;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(study.pigment),study.width,study.height),0,0);
    underpaint.current=image;
  },[study]);
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    if(study&&underpaint.current){
      const target=pencilPhotoStrokeCount(study,frame);
      const previous=progress.current;
      if(previous&&previous.study===study&&previous.wash===wash&&
        frame>=previous.frame&&previous.frame>=140&&target>=previous.drawn){
        paintMarkRange(ctx,study,previous.drawn,target);
      }else paint(ctx,study,frame,underpaint.current,wash);
      progress.current={study,frame,drawn:target,wash};
    }else{
      ctx.fillStyle="#FAF5ED";ctx.fillRect(0,0,canvas.width,canvas.height);
      progress.current=null;
    }
  },[study,frame,wash]);
  // Capture the ACTUAL finished canvas into a separate inspector. This keeps
  // review pixels identical to PNG export and prevents guide/zoom UI from
  // becoming part of any video frame.
  useEffect(()=>{
    if(!showFaceMacro||!faceGuides)return;
    const artwork=canvasRef.current,macro=faceMacroRef.current;
    if(!artwork||!macro)return;
    const ctx=macro.getContext("2d");
    if(!ctx)return;
    const anchor=faceMacroRegion==="eyes"?
      faceGuides.eyeNearCenter:faceGuides.lipCupid;
    // A source-native 120×80 window maps to 360×240 review pixels:
    // exactly 3× nearest-neighbour inspection, never an estimated zoom.
    const cropWidth=macro.width/3,cropHeight=macro.height/3;
    ctx.globalAlpha=1;
    ctx.fillStyle="#FAF5ED";ctx.fillRect(0,0,macro.width,macro.height);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(artwork,anchor[0]-cropWidth*.5,anchor[1]-cropHeight*.5,
      cropWidth,cropHeight,0,0,macro.width,macro.height);
  },[showFaceMacro,faceMacroRegion,faceGuides,study,frame,wash]);
  useEffect(()=>{
    const canvas=dryFaceRef.current;
    if(!canvas||!dryPlate)return;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
    ctx.fillStyle="#FAF5ED";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    paintMarkRange(ctx,dryPlate,0,dryPlate.strokes.length);
    canvas.setAttribute("data-km-pencil-dry-rendered-region",faceMacroRegion);
  },[dryPlate,faceMacroRegion]);
  useEffect(()=>{
    const dry=fullHeadRef.current,sourceCanvas=fullHeadSourceRef.current;
    if(!headPlate||!raw||!dry||!sourceCanvas)return;
    const ink=dry.getContext("2d"),reference=sourceCanvas.getContext("2d");
    if(!ink||!reference)return;
    ink.globalAlpha=1;ink.globalCompositeOperation="source-over";
    ink.fillStyle=headPlate.paperColor;
    ink.fillRect(0,0,dry.width,dry.height);
    paintMarkRange(ink,headPlate,0,headPlate.strokes.length);
    dry.setAttribute("data-km-pencil-full-head-rendered","true");
    const temp=document.createElement("canvas");
    temp.width=raw.width;temp.height=raw.height;
    const tempCtx=temp.getContext("2d");if(!tempCtx)return;
    tempCtx.putImageData(new ImageData(new Uint8ClampedArray(raw.data),
      raw.width,raw.height),0,0);
    const crop=headPlate.crop;
    reference.fillStyle=headPlate.paperColor;
    reference.fillRect(0,0,sourceCanvas.width,sourceCanvas.height);
    reference.drawImage(temp,crop.left,crop.top,crop.width,crop.height,
      0,0,sourceCanvas.width,sourceCanvas.height);
    sourceCanvas.setAttribute("data-km-pencil-full-head-source","ready");
    const original=reference.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
    const rendered=ink.getImageData(0,0,dry.width,dry.height);
    setHeadToneComparison(compareCC0PortraitTones(original,rendered));
    setHeadOcclusion(compareCC0HairOcclusion(original,rendered));
    setVermilionEvidence(compareCC0Vermilion(original,rendered));
    setSkinEvidence(compareCC0SoftSkin(original,rendered));
    setLightSkinEvidence(compareCC0LuminousSkin(original,rendered));
  },[headPlate,raw]);
  useEffect(()=>{
    if(!showHairContact||!headPlate)return;
    const src=fullHeadSourceRef.current,dry=fullHeadRef.current;
    const targetSrc=boundarySourceRef.current;
    const targetDry=boundaryPencilRef.current;
    if(!src||!dry||!targetSrc||!targetDry)return;
    // One measured ear/hair shadow contact, not a generic photo filter.
    // The crop is visual QA ONLY; the actual portrait drawing remains
    // individually authored strokes, with no reference-image underpaint.
    const sx=60/285*src.width,sy=205/318*src.height;
    const sw=53/285*src.width,sh=61/318*src.height;
    for(const [canvas,target] of [
      [src,targetSrc],[dry,targetDry],
    ] as const){
      const ctx=target.getContext("2d");if(!ctx)continue;
      ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
      ctx.imageSmoothingEnabled=true;
      ctx.clearRect(0,0,target.width,target.height);
      ctx.drawImage(canvas,sx,sy,sw,sh,
        0,0,target.width,target.height);
      target.setAttribute("data-km-pencil-contact-rendered","ready");
    }
  },[showHairContact,headPlate,raw]);
  useEffect(()=>{
    if(!showFeatureAtlas||!headPlate)return;
    const from=fullHeadSourceRef.current,to=fullHeadRef.current;
    const sourceDetail=featureSourceRef.current;
    const pencilDetail=featureDryRef.current;
    if(!from||!to||!sourceDetail||!pencilDetail)return;
    // The coordinate registration is the actual 285×318 Chromium CC0
    // proof screenshot, not an invented vector face. Every crop is simply
    // an observation of the finished source/mark canvas; it never adds
    // photographic pixels to the rendered dry-pencil artwork.
    const centres={
      eyes:[155,121],nose:[179,152],lips:[186,189],skin:[151,151],
    } as const;
    const [cx,cy]=centres[featureFocus];
    const sx=(cx-60)/285*540,sy=(cy-43)/318*600;
    const sw=120/285*540,sh=86/318*600;
    for(const [original,detail] of [
      [from,sourceDetail],[to,pencilDetail],
    ] as const){
      const ctx=detail.getContext("2d");if(!ctx)continue;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,detail.width,detail.height);
      ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
      ctx.imageSmoothingEnabled=true;
      ctx.drawImage(original,sx,sy,sw,sh,
        0,0,detail.width,detail.height);
      detail.setAttribute("data-km-pencil-anatomy-rendered",featureFocus);
    }
  },[showFeatureAtlas,featureFocus,headPlate,raw]);
  // Each storyboard panel reuses the EXACT paper-only full-head strokes,
  // chronologically filtered by construction material and immutable pass.
  // Small stage canvases render at 1/2 scale without any bitmap shortcut.
  useEffect(()=>{
    if(!showStoryboard||!headPlate)return;
    for(const [index,phase] of HEAD_STORYBOARD_PHASES.entries()){
      const canvas=storyboardRefs.current[index];
      if(!canvas)continue;
      const ctx=canvas.getContext("2d");if(!ctx)continue;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.setTransform(.5,0,0,.5,0,0);
      ctx.fillStyle=headPlate.paperColor;
      ctx.fillRect(0,0,headPlate.width,headPlate.height);
      const stageMarks=selectHeadStoryboardStrokes(headPlate.strokes,phase.id);
      paintMarkRange(ctx,{strokes:stageMarks},0,stageMarks.length);
      ctx.setTransform(1,0,0,1,0,0);
      canvas.setAttribute("data-km-pencil-storyboard-rendered",phase.id);
      canvas.setAttribute("data-km-pencil-storyboard-strokes",
        String(stageMarks.length));
    }
  },[showStoryboard,headPlate]);
  useEffect(()=>{
    if(!playing)return;
    const began=performance.now(),offset=frame;
    let raf=0;
    const tick=(now:number)=>{
      const value=Math.min(350,offset+Math.floor((now-began)*.035));
      setFrame(value);
      if(value<350)raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
    // Only changing play/pause anchors time; frame is an absolute target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  const update=(key:keyof PencilPhotoOptions,val:number)=>{
    setOptions(prev=>({...prev,[key]:val}));setPlaying(false);
  };
  const usePhoto=(subject:Sample)=>{
    setReload(0);setError("");
    if(localObjectUrl.current){
      URL.revokeObjectURL(localObjectUrl.current);localObjectUrl.current=null;
    }
    setSample(subject);setSourceUrl(photos[subject].url);
    // A curated photograph's auto-salience is not a general segmentation
    // model. Fox's dark back reaches the source border: lower focus retains it.
    const face=subject==="woman"||subject==="man";
    setOptions(prev=>({...prev,
      focus:face?.63:subject==="fox"?.38:.91,
      paper:face?.14:subject==="fox"?.18:.20,
      saturation:face?.96:subject==="fox"?.92:.96,
      edges:face?.53:PENCIL_PHOTO_DEFAULTS.edges,
      density:face?1.35:PENCIL_PHOTO_DEFAULTS.density,
      depth:face?.88:0,
    }));
    setWash(face?.91:subject==="fox"?.94:.90);
    setFraming("focus");
    setUploaded(false);setPlaying(false);setRaw(null);setFrame(350);
  };
  return <main style={{background:"#E7E5DC",minHeight:"100vh",
    padding:24,font:"14px/1.5 system-ui",color:"#34464C",
    display:"grid",gap:16,alignContent:"start"}}>
    {sourceUrl&&<img key={sourceUrl+"-"+reload} ref={sourceImage}
      src={sourceUrl} crossOrigin="anonymous" alt=""
      aria-hidden="true" style={{display:"none"}}
      onLoad={e=>captureSource(e.currentTarget)}
      onError={()=>{setRaw(null);setError(
        "Reference unavailable. Retry, or choose a local image.");}}/>}
    <header style={{maxWidth:1000}}>
      <div style={{letterSpacing:2,color:"#687A71",fontSize:12,fontWeight:700}}>
        ARTCRAFT / SOURCE-CONDITIONED COLOUR-PENCIL
      </div>
      <h1 style={{font:"600 34px Georgia,serif",margin:"7px 0"}}>
        Anatomy-first pencil reconstruction
      </h1>
      <p style={{margin:0,maxWidth:870}}>
        The old vector characters were too simple. This alternate code-only
        renderer preserves real source-image anatomy, creates softened paper
        pigment, and draws seeded strokes tangent to the source's features.
        Upload a licensed photograph or study CC0 human, fox and bird examples.
      </p>
    </header>
    <section aria-label="Reference pencil controls" style={{
      display:"flex",flexWrap:"wrap",alignItems:"end",gap:13,maxWidth:1120,
    }}>
      <label style={control}>Reference
        <select aria-label="Pencil photo source" value={uploaded?"uploaded":sample}
          style={field} onChange={e=>usePhoto(e.target.value as Sample)}>
          <option value="fox">Public-domain fox photo</option>
          <option value="kingfisher">CC0 kingfisher photo</option>
          <option value="woman">CC0 human portrait (woman)</option>
          <option value="man">CC0 human face macro (man)</option>
          {uploaded&&<option value="uploaded">Uploaded photograph</option>}
        </select>
      </label>
      <label style={control}>Own source image (never uploaded)
        <input aria-label="Upload pencil reference photo" type="file"
          accept="image/png,image/jpeg,image/webp" style={field}
          onChange={e=>{
            const file=e.target.files?.[0];if(!file)return;
            if(!["image/png","image/jpeg","image/webp"].includes(file.type)||
              file.size>16*1024*1024){
              setError("Use a PNG, JPEG or WebP image no larger than 16 MB.");
              return;
            }
            if(localObjectUrl.current)URL.revokeObjectURL(localObjectUrl.current);
            const url=URL.createObjectURL(file);
            localObjectUrl.current=url;
            setError("");setRaw(null);setReload(0);
            setUploaded(true);setSourceUrl(url);
            // Arbitrary uploads should not inherit fox/bird preset segmentation.
            setOptions(prev=>({...prev,focus:.60,depth:0}));
            setWash(.88);setPlaying(false);setFrame(350);
            // Object URL stays in the browser; no network submission.
          }}/>
      </label>
      <label style={control}>Page
        <select aria-label="Pencil photo aspect" style={field} value={aspect}
          onChange={e=>setAspect(e.target.value as typeof aspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select>
      </label>
      {(aspect==="portrait"||faceSource)&&<label style={control}>Portrait framing
        <select aria-label="Pencil portrait framing" value={framing}
          style={field} onChange={e=>setFraming(e.target.value as typeof framing)}>
          <option value="focus">Subject close-up / face crop</option>
          <option value="fit">Entire photograph / paper margins</option>
        </select>
      </label>}
      {faceGuides&&<label style={{...control,alignSelf:"end",minHeight:40,
        display:"flex",flexDirection:"row",alignItems:"center",gap:9}}>
        <input aria-label="Inspect portrait detail at three times scale" type="checkbox"
          checked={showFaceMacro} onChange={e=>setShowFaceMacro(e.target.checked)}/>
        Inspect eye / lip pencil details (3×)
      </label>}
      {faceGuides&&<label style={{...control,alignSelf:"end",minHeight:40,
        display:"flex",flexDirection:"row",alignItems:"center",gap:9}}>
        <input aria-label="Inspect full pencil head anatomy" type="checkbox"
          checked={showFullHead} onChange={e=>setShowFullHead(e.target.checked)}/>
        Full head · five-value and rooted-hair proof (experimental)
      </label>}
      {faceGuides&&showFullHead&&<label style={control}>
        Skin scumbling · {Math.round(headScumble*100)}%
        <input aria-label="Pencil portrait scumble" type="range"
          min="0" max="1" step=".05" value={headScumble}
          onChange={e=>setHeadScumble(Number(e.target.value))}/>
      </label>}
      {faceGuides&&showFullHead&&<label style={control}>
        Skin pigment coverage · {Math.round(skinCoverage*100)}%
        <input aria-label="Pencil skin coverage" type="range"
          min="0" max="1" step=".05" value={skinCoverage}
          onChange={e=>setSkinCoverage(Number(e.target.value))}/>
      </label>}
      {faceGuides&&showFullHead&&<label style={control}>
        Facial-plane pigment · {Math.round(featureDepth*100)}%
        <input aria-label="Pencil measured face pigment depth"
          type="range" min="0" max="1" step=".05" value={featureDepth}
          onChange={e=>setFeatureDepth(Number(e.target.value))}/>
      </label>}
      {faceGuides&&showFullHead&&<label style={{
        ...control,alignSelf:"end",display:"flex",alignItems:"center",
        flexDirection:"row",gap:9,minHeight:40}}>
        <input type="checkbox" aria-label="Inspect four-shot portrait storyboard"
          checked={showStoryboard}
          onChange={e=>setShowStoryboard(e.target.checked)}/>
        Four-shot pencil storyboard
      </label>}
      {faceGuides&&showFaceMacro&&<label style={control}>Facial crop
        <select aria-label="Pencil face detail region" value={faceMacroRegion}
          style={field} onChange={e=>setFaceMacroRegion(e.target.value as "eyes"|"lips")}>
          <option value="eyes">Eye and eyelid</option>
          <option value="lips">Vermilion and mouth</option>
        </select>
      </label>}
      <label style={control}>Source wash · {Math.round(wash*100)}%
        <input aria-label="Pencil photo wash" type="range" min=".25" max="1"
          step=".05" value={wash} onChange={e=>{
            setWash(Number(e.target.value));setPlaying(false);
          }}/>
      </label>
      {faceGuides&&<label style={{...control,alignSelf:"end",minHeight:40,
        display:"flex",flexDirection:"row",alignItems:"center",gap:9}}>
        <input aria-label="Apply source-based portrait pencil marks" type="checkbox"
          checked={applyFaceCraft} onChange={e=>{
            setApplyFaceCraft(e.target.checked);setPlaying(false);
          }}/>
        Draw anatomy-aligned pencil passes
      </label>}
      {faceGuides&&<label style={{...control,alignSelf:"end",minHeight:40,
        display:"flex",flexDirection:"row",alignItems:"center",gap:9}}>
        <input aria-label="Show source-measured face guides" type="checkbox"
          checked={showFaceGuides} onChange={e=>setShowFaceGuides(e.target.checked)}/>
        Source face landmarks (diagnostic)
      </label>}
      <label style={{...control,alignSelf:"end",minHeight:40,
        display:"flex",flexDirection:"row",alignItems:"center",gap:9}}>
        <input aria-label="Show pencil source comparison" type="checkbox"
          checked={showReference} onChange={e=>setShowReference(e.target.checked)}/>
        Compare with source
      </label>
      {([
        ["paper","Ivory paper lift",0,1,.05],
        ["saturation","Pencil chroma",0,1,.05],
        ["edges","Contour pressure",0,1,.05],
        ["tooth","Paper tooth",0,1,.05],
        ["density","Drawing density",.2,2,.1],
        ["focus","Foreground pigment / background restraint",0,1,.05],
        ["depth","Deep dry-pencil form shading",0,1,.05],
      ] as const).map(([key,label,min,max,step])=><label key={key} style={control}>
        {label} · {options[key].toFixed(2)}
        <input aria-label={"Pencil photo "+key} type="range"
          min={min} max={max} step={step} value={options[key]}
          onChange={e=>update(key,Number(e.target.value))}/>
      </label>)}
    </section>
    {error&&<div role="alert" style={{display:"flex",alignItems:"center",gap:12,
      flexWrap:"wrap",color:"#8F4440"}}>
      <span>{error}</span>
      <button type="button" style={btn} onClick={()=>{
        setError("");setRaw(null);setReload(n=>n+1);
      }}>Retry reference image</button>
    </div>}
    {!study&&!error&&<p role="status" style={{margin:0}}>Loading photograph…</p>}
    <div style={{display:"flex",alignItems:"start",gap:16,flexWrap:"wrap",
      maxWidth:showReference?1800:900}}>
      <figure style={{margin:0,flex:"1 1 380px",maxWidth:900}}>
        <figcaption style={{fontSize:13,fontWeight:700,marginBottom:7}}>
          Coloured-pencil rendition · code-generated mark layers
        </figcaption>
        <div style={{position:"relative",width:"100%"}}>
          <canvas ref={canvasRef} width={size.width} height={size.height}
            aria-label="Code-rendered coloured-pencil reconstruction"
            data-km-pencil-photo={study?"ready":"source-pending"}
            data-km-pencil-foundation={study?.foundationVersion}
            data-km-portrait-features={study?.portraitFeatures?"source-guided":"none"}
            style={{display:"block",width:"100%",maxWidth:900,
              height:"auto",aspectRatio:aspect==="landscape"?"16 / 9":"9 / 16",
              background:"#FAF5ED",boxShadow:"0 15px 40px #5A554E34"}}/>
          {faceGuides&&showFaceGuides&&<svg
            aria-label="CC0 photo-source aligned facial anchors"
            data-km-face-guide-overlay=""
            viewBox={`0 0 ${size.width} ${size.height}`}
            style={{position:"absolute",inset:0,width:"100%",height:"100%",
              pointerEvents:"none",overflow:"hidden"}}>
            {Object.entries(faceGuides).map(([key,[x,y]])=>
              <circle key={key} cx={x} cy={y} r={3}
                fill="#D2EF80" stroke="#24332D" strokeWidth={1.05}>
                <title>{key}</title>
              </circle>)}
          </svg>}
        </div>
        {faceGuides&&showFaceMacro&&<figure style={{margin:"12px 0 0"}}>
          <figcaption style={{fontSize:13,fontWeight:700,marginBottom:7}}>
            Native output crop · {faceMacroRegion==="eyes"?"eye / eyelid":"lips"} ·
            3× inspection only, not exported
          </figcaption>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:"1 1 300px",maxWidth:540}}>
              <p style={{fontSize:12,margin:"0 0 5px"}}>Photo-supported output</p>
              <canvas ref={faceMacroRef} width={360} height={240}
                data-km-pencil-face-macro={faceMacroRegion}
                aria-label="Magnified photo-supported coloured-pencil portrait"
                style={{display:"block",width:"100%",height:"auto",
                  aspectRatio:"3 / 2",border:"1px solid #ADA89A",
                  background:"#FAF5ED"}}/>
            </div>
            <div style={{flex:"1 1 300px",maxWidth:540}}>
              <p style={{fontSize:12,margin:"0 0 5px"}}>
                Dry-pencil construction proof · NO photographic underpaint
              </p>
              <canvas ref={dryFaceRef} width={360} height={240}
                data-km-pencil-dry-portrait={faceMacroRegion}
                data-km-pencil-raster-underpaint="none"
                aria-label="Code-drawn dry pencil facial construction without photo underpaint"
                style={{display:"block",width:"100%",height:"auto",
                  aspectRatio:"3 / 2",border:"1px solid #ADA89A",
                  background:"#FAF5ED"}}/>
            </div>
          </div>
          <p style={{fontSize:12,color:"#687A71",margin:"6px 0 0"}}>
            Value-first, cross-layer pigment strokes reconstructed from the licensed
            reference; still experimental. A paper-and-marks study is not proof of
            artist-grade facial anatomy or likeness.
          </p>
        </figure>}
        {showFullHead&&headPlate&&<section aria-label="Full-head source-measured coloured pencil study"
          style={{margin:"16px 0 0",padding:"12px",background:"#F3F0E9",
            border:"1px solid #ADA89A"}}>
          <h2 style={{font:"600 19px Georgia,serif",margin:"0 0 7px"}}>
            Full-head construction · measured silhouette & five values
          </h2>
          <p style={{fontSize:12,margin:"0 0 10px",maxWidth:850}}>
            Experimental only, not an artist-approved character. The licensed CC0
            source has manually observed head and hair contours with ±4 review-pixel
            uncertainty. Source pixels inform shape, local pigment and light; the
            dry plate is made exclusively of pencil strokes on ivory paper.
          </p>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <div style={{flex:"1 1 250px"}}>
              <p style={{fontSize:12,margin:"0 0 4px"}}>Licensed source · same measured crop</p>
              <canvas ref={fullHeadSourceRef} width={540} height={600}
                data-km-pencil-full-head-reference=""
                aria-label="Original CC0 full-head source crop for visual anatomy comparison"
                style={{display:"block",width:"100%",height:"auto",
                  border:"1px solid #A8A39A",maxWidth:540,aspectRatio:"9 / 10"}}/>
            </div>
            <div style={{flex:"1 1 250px"}}>
              <p style={{fontSize:12,margin:"0 0 4px"}}>
                Paper + value-first handlike marks · NO photographic underpaint
              </p>
              <canvas ref={fullHeadRef} width={540} height={600}
                data-km-pencil-full-head-dry=""
                data-km-pencil-raster-underpaint="none"
                aria-label="Experimental full-head coloured pencil geometry and hair constructed from strokes"
                style={{display:"block",width:"100%",height:"auto",
                  border:"1px solid #A8A39A",maxWidth:540,aspectRatio:"9 / 10"}}/>
            </div>
          </div>
          {headOcclusion&&<p
            data-km-pencil-hair-occlusion="ready"
            data-km-pencil-hair-occlusion-source={
              headOcclusion.sourceLuminance.toFixed(1)}
            data-km-pencil-hair-occlusion-drawn={
              headOcclusion.drawnLuminance.toFixed(1)}
            style={{fontSize:12,margin:"10px 0",color:"#53665E"}}>
            Source-measured ear/hair shadow (0 black → 255 paper):
            {" "+Math.round(headOcclusion.sourceLuminance)} →{" "}
            {Math.round(headOcclusion.drawnLuminance)}.
            Contact recovery: {" "+(headOcclusion.missingDarkLock?
              "NEGATIVE GATE FAILED":"TECHNICAL THRESHOLD ONLY")}.
            Artistic approval: NOT PASSED.
          </p>}
          {headToneComparison&&<div style={{marginTop:10}}
            data-km-pencil-tonal-comparison="ready"
            data-km-pencil-mean-value-error={
              headToneComparison.meanAbsoluteValueError.toFixed(2)}
            data-km-pencil-contrast-retention={
              headToneComparison.contrastRetention.toFixed(3)}>
            <p style={{fontSize:12,margin:"0 0 6px"}}>
              Five source-matched colour-pencil value probes, based on the
              actual rendered output (0 = black, 255 = paper white).
              Tone contrast retained: {" "+
                Math.round(headToneComparison.contrastRetention*100)}%.
              Mean tone difference: {" "+
                headToneComparison.meanAbsoluteValueError.toFixed(1)} / 255.
              Automated negative gate: {" "+
                (headToneComparison.severeValueCollapse?
                  "VALUE COLLAPSE / FAIL":"TECHNICAL THRESHOLD ONLY")}.
              Independent artistic approval: NOT PASSED.
            </p>
            <table style={{fontSize:12,borderCollapse:"collapse",width:"100%",
              maxWidth:580}} aria-label="Source versus dry-pencil facial tone comparison">
              <thead><tr>
                <th style={{textAlign:"left"}}>Measured facial plane</th>
                <th>Source</th><th>Dry pencil</th><th>Too light by</th>
              </tr></thead>
              <tbody>{headToneComparison.regions.map(region=>
                <tr key={region.name}>
                  <td>{region.name}</td>
                  <td style={{textAlign:"center"}}>
                    {Math.round(region.sourceLuminance)}
                  </td>
                  <td style={{textAlign:"center"}}>
                    {Math.round(region.drawnLuminance)}
                  </td>
                  <td style={{textAlign:"center"}}>
                    {Math.round(region.lightnessDeficit)}
                  </td>
                </tr>)}</tbody>
            </table>
          </div>}
          {showStoryboard&&<section
            aria-label="Four-shot dry coloured pencil portrait storyboard"
            data-km-pencil-portrait-storyboard=""
            style={{margin:"18px 0 0"}}>
            <h3 style={{font:"600 18px Georgia,serif",margin:"0 0 6px"}}>
              Portrait production storyboard · four genuine drawing beats
            </h3>
            <p style={{fontSize:13,margin:"0 0 10px",maxWidth:810}}>
              These are actual staged pencil strokes from one deterministic
              construction, not four filtered photos. Each shot builds on
              the previous mark family. The final output remains an
              unapproved anatomical study.
            </p>
            <div style={{display:"grid",gap:12,
              gridTemplateColumns:"repeat(auto-fit,minmax(205px,1fr))"}}>
              {HEAD_STORYBOARD_PHASES.map((phase,index)=>
                <figure key={phase.id} style={{
                  margin:0,padding:10,border:"1px solid #A8A39A",
                  background:"#FFFAF0",minWidth:0}}>
                  <figcaption style={{display:"grid",gap:4,marginBottom:8}}>
                    <strong style={{fontSize:14}}>{phase.label}</strong>
                    <span style={{fontSize:12,color:"#51655F"}}>
                      {phase.description}
                    </span>
                  </figcaption>
                  <canvas ref={node=>{storyboardRefs.current[index]=node;}}
                    width={270} height={300}
                    data-km-pencil-portrait-stage={phase.id}
                    data-km-pencil-raster-underpaint="none"
                    aria-label={phase.label+" · dry-pencil authored marks"}
                    style={{width:"100%",maxWidth:270,height:"auto",
                      aspectRatio:"9 / 10",display:"block",
                      border:"1px solid #C3BCAE",background:"#FAF5ED"}}/>
                </figure>)}
            </div>
          </section>}
          <label style={{display:"flex",alignItems:"center",gap:8,
            marginTop:13,fontSize:13}}>
            <input aria-label="Inspect CC0 eye nose and lip detail atlas"
              type="checkbox" checked={showFeatureAtlas}
              onChange={e=>setShowFeatureAtlas(e.target.checked)}/>
            Compare CC0 facial anatomy at 3×
          </label>
          {showFeatureAtlas&&<section
            aria-label="Source measured coloured pencil facial detail atlas"
            data-km-pencil-anatomy-atlas=""
            style={{marginTop:12}}>
            <h3 style={{font:"600 18px Georgia,serif",margin:"0 0 6px"}}>
              Eye · skin · nasal cartilage · lips / source-matched optical study
            </h3>
            <label style={{...control,maxWidth:310,marginBottom:11}}>
              Anatomy inspection crop
              <select aria-label="CC0 measured face crop"
                value={featureFocus}
                onChange={e=>setFeatureFocus(
                  e.target.value as "eyes"|"nose"|"lips"|"skin")}
                style={field}>
                <option value="eyes">Eyebrow and eyelids</option>
                <option value="nose">Nasal alae and bridge</option>
                <option value="lips">Upper and lower vermilion</option>
                <option value="skin">Cheek and nasal bridge tonal fields</option>
              </select>
            </label>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <figure style={{margin:0,flex:"1 1 220px",maxWidth:390}}>
                <figcaption style={{fontSize:12,marginBottom:5}}>
                  Licensed source · measured anatomy
                </figcaption>
                <canvas ref={featureSourceRef} width={420} height={300}
                  data-km-pencil-anatomy-source=""
                  aria-label="Licensed CC0 source enlarged facial region"
                  style={{display:"block",width:"100%",height:"auto",
                    background:"#FAF5ED",border:"1px solid #B8AEA1"}}/>
              </figure>
              <figure style={{margin:0,flex:"1 1 220px",maxWidth:390}}>
                <figcaption style={{fontSize:12,marginBottom:5}}>
                  Dry pencil · drawn optical planes, no photo underpaint
                </figcaption>
                <canvas ref={featureDryRef} width={420} height={300}
                  data-km-pencil-anatomy-dry=""
                  data-km-pencil-raster-underpaint="none"
                  aria-label="Paper-only pencil enlarged matching facial region"
                  style={{display:"block",width:"100%",height:"auto",
                    background:"#FAF5ED",border:"1px solid #B8AEA1"}}/>
              </figure>
            </div>
            <p style={{fontSize:12,margin:"8px 0 0",color:"#53665E"}}>
              Measured vermilion pigment: {" "+
                headPlate.facialPlaneCounts["lip-vermilion"]} fibres.
              Nasal alar gradients: {" "+
                headPlate.facialPlaneCounts["nasal-alar"]} fibres.
              Research only, independent likeness and artistry NOT APPROVED.
            </p>
            {vermilionEvidence&&<p
              data-km-pencil-vermilion-proof="ready"
              data-km-pencil-vermilion-upper-deficit={
                vermilionEvidence.regions[0].lightnessDeficit.toFixed(1)}
              data-km-pencil-vermilion-lower-deficit={
                vermilionEvidence.regions[1].lightnessDeficit.toFixed(1)}
              style={{fontSize:12,margin:"6px 0 0"}}>
              Licensed source → actual dry pencil, 7×7 luma (0 dark,
              255 ivory):
              {" "+vermilionEvidence.regions.map(
                r=>r.name+" "+r.sourceLuminance.toFixed(1)+"→"+
                  r.drawnLuminance.toFixed(1)).join(" · ")}.
              Negative gate: {" "+(vermilionEvidence.missingVermilionPigment?
                "MISSING PIGMENT / FAIL":"TECHNICAL THRESHOLD ONLY")}.
              No independent ArtCraft artistic approval.
            </p>}
          </section>}
          <label style={{display:"flex",alignItems:"center",gap:8,
            marginTop:13,fontSize:13}}>
            <input aria-label="Inspect portrait hairline contact at three times scale"
              type="checkbox" checked={showHairContact}
              onChange={e=>setShowHairContact(e.target.checked)}/>
            Inspect ear/hair occlusion at 3×
          </label>
          {showHairContact&&<section aria-label="Pencil face hair contact source comparison"
            data-km-pencil-portrait-contact-inspector=""
            style={{marginTop:12}}>
            <h3 style={{font:"600 17px Georgia,serif",margin:"0 0 6px"}}>
              Dark hair–skin junction · actual raster crop for QA
            </h3>
            <p style={{fontSize:12,margin:"0 0 10px",maxWidth:680}}>
              Only these two inspection canvases enlarge source and drawn
              output. Their pixels are never reused as pencil pigment.
              This crop reveals lost shadows, white seams and the ear shape.
            </p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {([
                {name:"Licensed source · ear shadow",ref:boundarySourceRef,
                  role:"source"},
                {name:"Dry strokes · ear shadow",ref:boundaryPencilRef,
                  role:"pencil"},
              ] as const).map(item=>
                <figure key={item.role} style={{margin:0,maxWidth:300,
                  flex:"1 1 220px"}}>
                  <figcaption style={{fontSize:12,marginBottom:5}}>
                    {item.name}
                  </figcaption>
                  <canvas ref={item.ref} width={300} height={320}
                    data-km-pencil-contact-image={item.role}
                    data-km-pencil-raster-underpaint={
                      item.role==="pencil"?"none":"source-only"}
                    style={{display:"block",width:"100%",height:"auto",
                      border:"1px solid #A8A39A",
                      background:"#FAF5ED"}}/>
                </figure>)}
            </div>
            <p style={{fontSize:12,margin:"8px 0 0"}}>
              Proof anchor:
              {" "+Math.round(CC0_HAIR_OCCLUSION_PROBE.x*285)+","+
                Math.round(CC0_HAIR_OCCLUSION_PROBE.y*318)}
              {" "}in the 285×318 licensed source Storybook crop.
            </p>
          </section>}
          {lightSkinEvidence&&<p
            data-km-pencil-light-skin-proof="ready"
            data-km-pencil-malar-deficit={
              lightSkinEvidence.regions[0].lightnessDeficit.toFixed(1)}
            data-km-pencil-bridge-deficit={
              lightSkinEvidence.regions[1].lightnessDeficit.toFixed(1)}
            style={{fontSize:12,margin:"11px 0 0",color:"#53665E"}}>
            Photographed luminous cheek and nasal bridge:
            {" "+lightSkinEvidence.regions.map(r=>
              r.name+" "+r.sourceLuminance.toFixed(1)+"→"+
                r.drawnLuminance.toFixed(1)).join(" · ")}.
            Material negative gate: {" "+(lightSkinEvidence.missingPhotographedLightSkin?
              "WHITE PATCH / FAIL":"TECHNICAL THRESHOLD ONLY")}.
            Independent likeness and artistry NOT APPROVED.
          </p>}
          {skinEvidence&&<p
            data-km-pencil-skin-proof="ready"
            data-km-pencil-skin-cheek-deficit={
              skinEvidence.regions[0].lightnessDeficit.toFixed(1)}
            data-km-pencil-skin-undereye-deficit={
              skinEvidence.regions[1].lightnessDeficit.toFixed(1)}
            data-km-pencil-skin-chin-deficit={
              skinEvidence.regions[2].lightnessDeficit.toFixed(1)}
            style={{fontSize:12,margin:"11px 0 0",color:"#53665E"}}>
            Licensed source vs code-drawn cheek, orbital and chin:
            {" "+skinEvidence.regions.map(r=>
              r.name+" "+r.sourceLuminance.toFixed(1)+"→"+
              r.drawnLuminance.toFixed(1)).join(" · ")}.
            Tonal negative gate: {" "+(skinEvidence.missingOpticalCoverage?
              "INSUFFICIENT COVERAGE / FAIL":
              "TECHNICAL THRESHOLD ONLY")}.
            Independent realism and artist approval: NOT PASSED.
          </p>}
          <p style={{fontSize:12,margin:"9px 0 0",color:"#53665E"}}
            data-km-pencil-head-proof-metrics="">
            Five values (deepest → reserved paper):
            {" "+headPlate.fiveValueCounts.join(" / ")}.
            Face deposits: {" "+(headPlate.materialCounts["face-value"]+
              headPlate.materialCounts["face-chroma"]+
              headPlate.materialCounts["face-form"]+
              headPlate.materialCounts["facial-planes"])}.
            Hair mass / hair shadow / hair fibres:
            {" "+headPlate.materialCounts["hair-mass"]+
              " / "+headPlate.materialCounts["hair-occlusion"]+
              " / "+headPlate.materialCounts["hair-fibre"]}.
            Independent likeness and material approval: NOT PASSED.
          </p>
        </section>}
        {study?.portraitFeatures&&<p
          data-km-portrait-craft-evidence=""
          style={{fontSize:12,color:"#687A71",margin:"8px 0 0"}}>
          Experimental CC0 source-matched construction: {Object.values(study.portraitFeatures)
            .reduce((sum,n)=>sum+n,0)} additional eye, brow, nose, lip and form-following skin pencil marks.
          {study.portraitHighlightReserves??0} iris deposits reserved for observed bright
          eye glints. Landmark alignment is manually reviewed, not independent artistic sign-off.
        </p>}
      </figure>
      {showReference&&<figure style={{margin:0,flex:"1 1 380px",maxWidth:900}}>
        <figcaption style={{fontSize:13,fontWeight:700,marginBottom:7}}>
          Reference pixels · geometry/colour evidence (not pencil output)
        </figcaption>
        <canvas width={size.width} height={size.height}
          data-km-pencil-reference=""
          ref={node=>{
            if(node&&raw){const ctx=node.getContext("2d");
              ctx?.putImageData(new ImageData(new Uint8ClampedArray(raw.data),
                raw.width,raw.height),0,0);}
          }}
          style={{width:"100%",height:"auto",background:"#FAF5ED",
            boxShadow:"0 12px 28px #5A554E25"}}/>
      </figure>}
    </div>
    <section aria-label="Pencil photo timeline" style={{
      display:"flex",flexWrap:"wrap",alignItems:"end",gap:14,maxWidth:950,
    }}>
      <label style={{...control,flex:"1 1 350px"}}>Drawing progress · {frame}/350
        <input aria-label="Pencil photo frame" type="range" min="0" max="350"
          value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <button style={btn} type="button" disabled={!study}
        onClick={()=>{if(frame>=350)setFrame(0);setPlaying(p=>!p);}}>
        {playing?"Pause":frame>=350?"Replay":"Draw"}
      </button>
      <button style={btn} type="button" disabled={!study}
        onClick={()=>{setPlaying(false);setFrame(350);}}>Completed plate</button>
      <button style={btn} type="button" disabled={!study} onClick={()=>{
        const canvas=canvasRef.current;if(!canvas)return;
        const a=document.createElement("a");a.href=canvas.toDataURL("image/png");
        a.download="kumiki-colour-pencil.png";a.click();
      }}>Export PNG</button>
    </section>
    <p style={{margin:0,fontSize:13,maxWidth:1040,color:"#61736E"}}>
      {uploaded?"Local uploaded source":photos[sample].title} ·
      {uploaded?" No network transfer.":" CC0 reference photography loaded by URL."}
      {!uploaded&&<a href={photos[sample].license} target="_blank"
         rel="noopener noreferrer" style={{marginLeft:9,color:"#275C66"}}>
         Source and license</a>}
      {" "}This is a prototype drawing renderer, not a claim of fine-art
      equivalence. Colour/contour/texture are programmable, but geometry and
      likeness fidelity still depend on the quality of the provided source.
    </p>
  </main>;
}
