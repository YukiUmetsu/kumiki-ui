import { useEffect, useMemo, useRef, useState } from "react";
import {
  createPencilPhotoStudy,pencilPhotoStrokeCount,PENCIL_PHOTO_DEFAULTS,
} from "./colored-pencil-photo";
import type {
  PencilPhotoPixels,PencilPhotoOptions,PencilPhotoStudy,
} from "./colored-pencil-photo";
import {mapCC0WomanPortraitFeatures} from "./colored-pencil-portrait-guides";
import {createDryPortraitPlate} from "./colored-pencil-dry-portrait";

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
export function ReferencePencilAtelier({initialSample="kingfisher"}:{initialSample?:Sample}={}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const faceMacroRef=useRef<HTMLCanvasElement>(null);
  const dryFaceRef=useRef<HTMLCanvasElement>(null);
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
  },[dryPlate]);
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
