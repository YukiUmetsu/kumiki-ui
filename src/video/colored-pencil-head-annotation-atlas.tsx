import {useEffect,useMemo,useState} from "react";
import type {ChangeEvent,PointerEvent} from "react";
import {
  HEAD_FIDELITY_LANDMARK_IDS, HEAD_FIDELITY_TONES,
} from "./colored-pencil-head-fidelity";
import {
  emptyHeadAnnotations, annotatedPoint, annotatedTone,
  clientToNativePoint,compileHeadAnnotationManifest,
  type HeadAnnotationSession,type HeadAnnotationSide,
  type NativePoint,type NativeDimensions,
} from "./colored-pencil-head-annotation";

type Photo={url:string;name:string;dimensions:NativeDimensions};
type LocalImages={source:Photo|null;output:Photo|null};
type Interaction="landmark"|"tone";
const common={background:"#FCFAF5",border:"1px solid #C3BEB3",
  borderRadius:5,padding:"9px 11px",color:"#2D4447",minHeight:40} as const;
const labelStyle={display:"grid",gap:5,font:"600 12px system-ui"} as const;
const MAX_BYTES=32*1024*1024;
const supported=["image/jpeg","image/png"];

/** No use of input image in the actual film scene. Browser-only, local-file
 * photo annotation stage: creates object URLs, revokes them on replacement,
 * never transmits images, and deliberately does NOT calculate fake RGB.
 */
function usePrivateLocalImage(){
  const [photo,setPhoto]=useState<Photo|null>(null);
  useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo.url);},[photo]);
  const load=async(file:File)=>{
    if(!supported.includes(file.type)||file.size>MAX_BYTES||!file.size)
      throw new Error("Select a local JPEG/PNG file under 32 MiB");
    const url=URL.createObjectURL(file);
    try{
      const dim=await new Promise<NativeDimensions>((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>resolve({
          width:image.naturalWidth,height:image.naturalHeight,
        });
        image.onerror=()=>reject(new Error("Could not decode the chosen image"));
        image.src=url;
      });
      if(dim.width<64||dim.height<64||dim.width*dim.height>60_000_000)
        throw new Error("Image must be 64+ pixels per axis and <=60 MP");
      setPhoto({url,name:file.name,dimensions:dim});
    }catch(error){
      URL.revokeObjectURL(url);
      throw error;
    }
  };
  return {photo,load};
}

type AnnotationPanelProps={
  side:HeadAnnotationSide;
  photo:Photo|null;
  model:HeadAnnotationSession;
  onChange:(value:HeadAnnotationSession)=>void;
};

function AnnotationPanel({side,photo,model,onChange}:AnnotationPanelProps){
  const [mode,setMode]=useState<Interaction>("landmark");
  const [selectedPoint,setSelectedPoint]=useState(0);
  const [selectedTone,setSelectedTone]=useState(0);
  const [start,setStart]=useState<NativePoint|null>(null);
  const [error,setError]=useState("");
  const current=model[side],dims=photo?.dimensions;
  // PointerEvent data must be kept separate from the SVG element.
  const actualPoint=(e:PointerEvent<SVGSVGElement>)=>
    clientToNativePoint({clientX:e.clientX,clientY:e.clientY},
      e.currentTarget.getBoundingClientRect(),dims!);
  const down=(event:PointerEvent<SVGSVGElement>)=>{
    if(!dims)return;
    try{
      setError("");
      const point=actualPoint(event);
      if(mode==="landmark"){
        const id=HEAD_FIDELITY_LANDMARK_IDS[selectedPoint];
        onChange(annotatedPoint(model,side,id,point,dims));
        if(selectedPoint<HEAD_FIDELITY_LANDMARK_IDS.length-1)
          setSelectedPoint(i=>i+1);
      }else{
        setStart(point);
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }catch(ex){setError(ex instanceof Error?ex.message:String(ex));}
  };
  const up=(event:PointerEvent<SVGSVGElement>)=>{
    if(!dims||mode!=="tone"||!start)return;
    try{
      setError("");
      const id=HEAD_FIDELITY_TONES[selectedTone];
      const end=actualPoint(event);
      onChange(annotatedTone(model,side,id,start,end,dims));
      if(selectedTone<HEAD_FIDELITY_TONES.length-1)setSelectedTone(i=>i+1);
    }catch(ex){setError(ex instanceof Error?ex.message:String(ex));}
    finally{setStart(null);}
  };
  const ready=current.landmarks.length===18&&current.tones.length===5;
  return <section data-km-head-photo-side={side} style={{display:"grid",gap:9,
    alignContent:"start",minWidth:260}}>
    <strong style={{font:"600 17px Georgia,serif"}}>
      {side==="source"?"1. Original reference photograph":
        "2. Native 1× vector film screenshot"}
    </strong>
    <div style={{fontSize:12}}>
      {photo?photo.name+" · "+photo.dimensions.width+"×"+
        photo.dimensions.height+" original pixels":
        "Choose an unchanged LOCAL file; no remote request"}
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
      <label style={labelStyle}>Placement mode
        <select aria-label={side+" annotation mode"} style={common}
          value={mode} onChange={e=>{setMode(e.target.value as Interaction);
            setError("");setStart(null);}}>
          <option value="landmark">18 cranial contour points</option>
          <option value="tone">Five source/output tonal rectangles</option>
        </select>
      </label>
      {mode==="landmark"?<label style={labelStyle}>Contour point
        <select aria-label={side+" contour point"} style={common}
          value={selectedPoint} onChange={e=>
            setSelectedPoint(Number(e.target.value))}>
          {HEAD_FIDELITY_LANDMARK_IDS.map((id,i)=><option key={id}
            value={i}>{i+1}. {id}</option>)}
        </select>
      </label>:<label style={labelStyle}>Sample value (drag a rectangle)
        <select aria-label={side+" tonal band"} style={common}
          value={selectedTone} onChange={e=>
            setSelectedTone(Number(e.target.value))}>
          {HEAD_FIDELITY_TONES.map((id,i)=><option key={id} value={i}>
            {i+1}. {id}</option>)}
        </select>
      </label>}
    </div>
    <div style={{background:"#D4D1C9",border:"1px solid #B7B4AE",
      borderRadius:5,minHeight:205}}>
      {photo&&<div style={{position:"relative",width:"100%"}}>
        <img alt={side+" local photo"} src={photo.url} draggable={false}
          style={{width:"100%",height:"auto",display:"block",
            pointerEvents:"none"}}/>
        <svg data-km-head-photo-overlay={side}
          aria-label={side+" photograph annotation canvas"}
          viewBox={`0 0 ${photo.dimensions.width} ${photo.dimensions.height}`}
          preserveAspectRatio="none" onPointerDown={down}
          onPointerUp={up}
          style={{width:"100%",height:"100%",position:"absolute",
            inset:0,cursor:"crosshair",touchAction:"none"}}>
          <rect x={0} y={0} width={photo.dimensions.width}
            height={photo.dimensions.height} fill="transparent"/>
          {current.tones.map(t=><rect key={t.id} data-km-annotated-tone={t.id}
            x={t.rect.x} y={t.rect.y} width={t.rect.width}
            height={t.rect.height} fill="#63B7D02A"
            stroke="#08728C" strokeWidth={Math.max(2,photo.dimensions.width/500)}
            pointerEvents="none"/>)}
          {current.landmarks.map(p=><g key={p.id}
            data-km-annotated-contour={p.id} pointerEvents="none">
            <circle cx={p.x} cy={p.y}
              r={Math.max(4,photo.dimensions.width/145)}
              fill="#CC4327" stroke="white"
              strokeWidth={Math.max(1.2,photo.dimensions.width/900)}/>
          </g>)}
        </svg>
      </div>}
    </div>
    {error&&<p role="alert" style={{color:"#8A2924",margin:0}}>{error}</p>}
    <div data-km-annotation-side-ready={ready?"yes":"no"}
      style={{fontSize:12,color:"#59665E"}}>
      {current.landmarks.length}/18 independently placed contour points ·
      {" "}{current.tones.length}/5 nonoverlapping native tonal regions
    </div>
  </section>;
}

export function PencilHeadSourceAnnotationAtlas(){
  const source=usePrivateLocalImage(),output=usePrivateLocalImage();
  const [session,setSession]=useState(emptyHeadAnnotations);
  const [reference,setReference]=useState({
    url:"",license:"",credit:"",
  });
  const [message,setMessage]=useState("");
  const images:LocalImages={source:source.photo,output:output.photo};
  const changeFile=async(side:HeadAnnotationSide,
    event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.currentTarget.files?.[0];
    if(!file)return;
    try{
      setMessage("");
      await (side==="source"?source:output).load(file);
      // Replacing an image invalidates coordinates on THAT side only.
      setSession(prev=>({...prev,[side]:{landmarks:[],tones:[]}}));
    }catch(ex){setMessage(ex instanceof Error?ex.message:String(ex));}
  };
  const proof=useMemo(()=>{
    if(!images.source||!images.output)return null;
    try{return compileHeadAnnotationManifest(session,reference);}
    catch{return null;}
  },[session,reference,images.source,images.output]);
  const exportProof=()=>{
    if(!proof){setMessage("Both original images, 18+18 contour points and 5+5 tonal boxes are required");return;}
    const blob=new Blob([JSON.stringify(proof,null,2)+"\n"],{
      type:"application/json"});
    const url=URL.createObjectURL(blob);
    try{
      const link=document.createElement("a");
      link.href=url;link.download="pencil-head-independent-annotations.json";
      document.body.append(link);link.click();link.remove();
      setMessage("Downloaded pixel coordinates only. The CLI must verify actual image hashes and RGB values.");
    }finally{
      // Downloading from a blob is synchronous after a click but browser
      // navigation can be deferred. Revoke outside the current stack.
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  };
  return <main data-km-pencils-head-annotation-atlas=""
    data-km-reference-approval="unapproved"
    style={{background:"#E8E6DC",color:"#33464A",minHeight:"100vh",
      padding:24,font:"15px/1.45 system-ui",display:"grid",
      alignContent:"start",gap:18}}>
    <header style={{maxWidth:1050}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:1.4,
        color:"#65756D"}}>ARTCRAFT · COLOURED PENCIL · STAGE 1</div>
      <h1 style={{font:"600 30px Georgia,serif",margin:"6px 0"}}>
        Human #01 · Independent source and native-image annotation
      </h1>
      <p style={{margin:0,maxWidth:1000}}>
        Annotate the SAME 18 head-contour points and five tonal patches
        separately on an authorized original photograph and on the actual
        finished SVG screenshot. These local images never enter the exported
        animation or leave your browser. Export contains coordinates only;
        the separate exact-byte CLI verifies SHA-256 and pixel values.
        This stage does not add any facial features.
      </p>
    </header>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
      gap:16,maxWidth:1250}}>
      {(["source","output"] as const).map(side=><div key={side}>
        <label style={labelStyle}>
          {side==="source"?"Load original reference JPEG/PNG":
            "Load native exported screenshot JPEG/PNG"}
          <input type="file" accept="image/png,image/jpeg"
            aria-label={side+" local image"}
            onChange={e=>{void changeFile(side,e);}}/>
        </label>
        <AnnotationPanel key={images[side]?.url??side}
          side={side} photo={images[side]}
          model={session} onChange={setSession}/>
      </div>)}
    </div>
    <section aria-label="Verified original photographer and license" style={{
      display:"flex",flexWrap:"wrap",alignItems:"end",gap:12,maxWidth:1100}}>
      <label style={labelStyle}>Original source page (HTTPS)
        <input aria-label="Original source page" style={{...common,minWidth:280}}
          type="url" value={reference.url}
          onChange={e=>setReference(prev=>({...prev,url:e.target.value}))}
          placeholder="https://commons.wikimedia.org/wiki/File:…"/>
      </label>
      <label style={labelStyle}>Verified source license
        <select aria-label="Original license" style={common}
          value={reference.license} onChange={e=>
            setReference(prev=>({...prev,license:e.target.value}))}>
          <option value="">Select a rights-verified source license</option>
          {["CC0-1.0","CC-BY-4.0","CC-BY-SA-4.0",
            "CC-BY-3.0","CC-BY-SA-3.0","PDM-1.0","PD-US"].map(id=>
            <option key={id} value={id}>{id}</option>)}
        </select>
      </label>
      <label style={labelStyle}>Photographer credit
        <input aria-label="Photographer credit" style={common}
          value={reference.credit}
          onChange={e=>setReference(prev=>({...prev,credit:e.target.value}))}
          placeholder="Actual rights holder"/>
      </label>
    </section>
    <section style={{maxWidth:1000,display:"grid",gap:8}}>
      <button type="button" data-km-annotation-export=""
        onClick={exportProof} disabled={!proof}
        style={{...common,background:proof?"#E1EBDB":"#F6F4EE",
          maxWidth:400,cursor:proof?"pointer":"not-allowed",
          fontWeight:600}}>
        Export original source/native render pixel annotations
      </button>
      <p style={{margin:0,fontSize:13}} data-km-annotation-progress="">
        {proof?"Two independent 18+5 annotation sets are ready for byte capture.":
          "BLOCKED: upload both ORIGINAL local images, place independent 18+18 head contour points and 5+5 tonal boxes, and record the rights-verified photographer."}
      </p>
      {message&&<p role="status" style={{margin:0,fontSize:13}}>{message}</p>}
      <details>
        <summary>Preview JSON-only annotation manifest (no source/render pixels)</summary>
        <textarea aria-label="Independent annotations JSON"
          readOnly value={proof?JSON.stringify(proof,null,2):""}
          style={{width:"100%",maxWidth:900,height:230,
            padding:12,font:"12px/1.4 monospace",background:"#FCFAF5"}}/>
      </details>
      <p style={{fontSize:12,color:"#596B66",margin:0}}>
        Next: run <code>node scripts/pencil-head-native-proof-capture.mjs</code>
        with both unchanged image files and this JSON. An approved numerical
        match is not an artistic realism certification.
      </p>
    </section>
  </main>;
}
