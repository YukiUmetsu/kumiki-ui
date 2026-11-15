import { useEffect, useMemo, useRef, useState } from "react";
import {
  createPencilPhotoStudy,pencilPhotoStrokeCount,PENCIL_PHOTO_DEFAULTS,
} from "./colored-pencil-photo";
import type {
  PencilPhotoPixels,PencilPhotoOptions,PencilPhotoStudy,
} from "./colored-pencil-photo";

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
} as const;
type Sample=keyof typeof photos;
const control={display:"grid",gap:5,font:"600 13px system-ui"} as const;
const field={padding:"8px 10px",border:"1px solid #AFAEA5",borderRadius:6,
  color:"#2E4147",background:"#FFFAF0",minHeight:40} as const;
const btn={...field,cursor:"pointer"} as const;
const capture=(img:HTMLImageElement,width:number,height:number):PencilPhotoPixels=>{
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d",{willReadFrequently:true});
  if(!context)throw new Error("Canvas 2D required for image-conditioned pencil mode");
  context.fillStyle="#FAF5ED";
  context.fillRect(0,0,width,height);
  // Fit image without arbitrarily cropping away the subject's eyes or feet.
  const fit=Math.min(width/img.naturalWidth,height/img.naturalHeight);
  const w=img.naturalWidth*fit,h=img.naturalHeight*fit;
  context.drawImage(img,(width-w)/2,(height-h)/2,w,h);
  return {width,height,data:context.getImageData(0,0,width,height).data};
};

/** Paint only newly deposited marks during forward playback; reconstruct on seek. */
function paintMarkRange(ctx:CanvasRenderingContext2D,
  study:PencilPhotoStudy,from:number,to:number){
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
export function ReferencePencilAtelier(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const underpaint=useRef<HTMLCanvasElement|null>(null);
  const progress=useRef<{study:PencilPhotoStudy;frame:number;drawn:number;wash:number}|null>(null);
  const localObjectUrl=useRef<string|null>(null);
  const sourceImage=useRef<HTMLImageElement>(null);
  // Kingfisher is the preferred first artwork: saturated feather detail gives
  // better immediate source-vs-pencil feedback than a shaded fox background.
  const [sample,setSample]=useState<Sample>("kingfisher");
  // Defer initial source assignment until after the first Storybook mount.
  // Explicit selections already load reliably; this avoids the premature
  // first image request being orphaned by Storybook/StrictMode setup.
  const [sourceUrl,setSourceUrl]=useState<string>("");
  const [reload,setReload]=useState(0);
  const [raw,setRaw]=useState<PencilPhotoPixels|null>(null);
  const [aspect,setAspect]=useState<"landscape"|"portrait">("landscape");
  const [frame,setFrame]=useState(350);
  const [playing,setPlaying]=useState(false);
  const [error,setError]=useState("");
  const [options,setOptions]=useState<PencilPhotoOptions>(PENCIL_PHOTO_DEFAULTS);
  const [wash,setWash]=useState(.84);
  const [showReference,setShowReference]=useState(false);
  const [uploaded,setUploaded]=useState(false);
  const size=aspect==="landscape"?{width:900,height:506}:{width:506,height:900};
  useEffect(()=>setSourceUrl(prev=>prev||photos.kingfisher.url),[]);

  // Browser-created object URLs are explicitly revoked on replace/unmount,
  // without affecting the in-flight load of the newly selected source.
  useEffect(()=>()=>{if(localObjectUrl.current){
    URL.revokeObjectURL(localObjectUrl.current);localObjectUrl.current=null;
  }},[]);
  const captureSource=(image:HTMLImageElement)=>{
    if(!image.naturalWidth||!image.naturalHeight)return;
    try{
      setRaw(capture(image,size.width,size.height));
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
  },[sourceUrl,reload,size.width,size.height]);
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
  const study=useMemo(()=>raw?createPencilPhotoStudy(raw,options):null,
    [raw,options]);
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
    // Kingfisher's bright body against green bokeh supports stronger emphasis.
    setOptions(prev=>({...prev,
      focus:subject==="fox"?.38:.91,
      paper:subject==="fox"?.18:.20,
      saturation:subject==="fox"?.92:.96,
    }));
    setWash(subject==="fox"?.94:.90);
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
        Upload a licensed photograph or inspect the two public-domain examples.
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
            setOptions(prev=>({...prev,focus:.60}));
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
      <label style={control}>Source wash · {Math.round(wash*100)}%
        <input aria-label="Pencil photo wash" type="range" min=".25" max="1"
          step=".05" value={wash} onChange={e=>{
            setWash(Number(e.target.value));setPlaying(false);
          }}/>
      </label>
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
        <canvas ref={canvasRef} width={size.width} height={size.height}
          aria-label="Code-rendered coloured-pencil reconstruction"
          data-km-pencil-photo={study?"ready":"source-pending"}
          style={{width:"100%",maxWidth:900,
            height:"auto",aspectRatio:aspect==="landscape"?"16 / 9":"9 / 16",
            background:"#FAF5ED",boxShadow:"0 15px 40px #5A554E34"}}/>
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
      {uploaded?" No network transfer.":" Public-domain reference photography only."}
      {" "}This is a prototype drawing renderer, not a claim of fine-art
      equivalence. Colour/contour/texture are programmable, but geometry and
      likeness fidelity still depend on the quality of the provided source.
    </p>
  </main>;
}
