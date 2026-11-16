import {useEffect,useMemo,useRef,useState} from "react";
import type {ChangeEvent,PointerEvent,KeyboardEvent} from "react";
import {
  HEAD_FIDELITY_LANDMARK_IDS, HEAD_FIDELITY_TONES,
} from "./colored-pencil-head-fidelity";
import {
  emptyHeadAnnotations, annotatedPoint, annotatedTone,
  clientToNativePoint,compileHeadAnnotationManifest,removeHeadAnnotation,
  nudgeHeadAnnotation,
  type HeadAnnotationSession,type HeadAnnotationSide,
  type NativePoint,type NativeDimensions,
} from "./colored-pencil-head-annotation";
import {
  makePencilHeadAnnotationCheckpoint,restorePencilHeadAnnotationCheckpoint,
  type PencilHeadCheckpointImages,
} from "./colored-pencil-head-checkpoint";
import {reviewMeasuredHeadEvidence} from "./colored-pencil-head-evidence-review";

type Photo={url:string;name:string;sha256:string;dimensions:NativeDimensions};
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
  const request=useRef(0);
  useEffect(()=>()=>{request.current++;},[]);
  useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo.url);},[photo]);
  const load=async(file:File):Promise<boolean>=>{
    const ticket=++request.current;
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
      // Real file bytes bind saved coordinate drafts to their correct images.
      // Hash locally after native decode. Never persist pixel data or
      // substitute a mesh-derived digest. The CLI still independently hashes.
      const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
      const sha256=Array.from(new Uint8Array(digest))
        .map(byte=>byte.toString(16).padStart(2,"0")).join("");
      // Two rapid file selections must not let the older async decode/hash
      // overwrite the newer image or clear its annotations.
      if(ticket!==request.current){URL.revokeObjectURL(url);return false;}
      setPhoto({url,name:file.name,sha256,dimensions:dim});
      return true;
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
  const [zoom,setZoom]=useState(1);
  const [error,setError]=useState("");
  const current=model[side],dims=photo?.dimensions;
  // PointerEvent data must be kept separate from the SVG element.
  const actualPoint=(e:PointerEvent<SVGSVGElement>)=>
    clientToNativePoint({clientX:e.clientX,clientY:e.clientY},
      e.currentTarget.getBoundingClientRect(),dims!);
  const down=(event:PointerEvent<SVGSVGElement>)=>{
    if(!dims)return;
    // SVG numeric labels are artist-only overlays, not selectable HTML
    // text. Prevent native text-selection/drag feedback from swallowing
    // subsequent independent ROI pointer events.
    event.preventDefault();
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
  const selectedId=mode==="landmark"?
    HEAD_FIDELITY_LANDMARK_IDS[selectedPoint]:HEAD_FIDELITY_TONES[selectedTone];
  const canNudge=mode==="landmark"?
    current.landmarks.some(p=>p.id===selectedId):
    current.tones.some(t=>t.id===selectedId);
  const nudge=(dx:number,dy:number)=>{
    if(!dims||!canNudge)return;
    try{
      onChange(nudgeHeadAnnotation(model,side,mode,selectedId,{x:dx,y:dy},dims));
      setError("");
    }catch(ex){setError(ex instanceof Error?ex.message:String(ex));}
  };
  const keyDown=(event:KeyboardEvent<SVGSVGElement>)=>{
    const offset=event.shiftKey?10:1;
    const step=event.key==="ArrowLeft"?[-offset,0]:
      event.key==="ArrowRight"?[offset,0]:
      event.key==="ArrowUp"?[0,-offset]:
      event.key==="ArrowDown"?[0,offset]:null;
    if(!step)return;
    // Arrow keys correct the current native-pixel annotation instead of
    // scrolling the enlarged photo. Keyboard access requires no pointer.
    event.preventDefault();
    nudge(step[0],step[1]);
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
      <button type="button" style={{...common,alignSelf:"end",
        cursor:"pointer",fontSize:12}}
        aria-label={"Remove selected "+side+" "+
          (mode==="landmark"?"landmark":"tone")}
        disabled={mode==="landmark"?
          !current.landmarks.some(p=>p.id===HEAD_FIDELITY_LANDMARK_IDS[selectedPoint]):
          !current.tones.some(t=>t.id===HEAD_FIDELITY_TONES[selectedTone])}
        onClick={()=>{
          const id=mode==="landmark"?
            HEAD_FIDELITY_LANDMARK_IDS[selectedPoint]:
            HEAD_FIDELITY_TONES[selectedTone];
          onChange(removeHeadAnnotation(model,side,mode,id));
          setError("");
        }}>Remove selected {mode==="landmark"?"point":"value box"}</button>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
      <label style={labelStyle}>Inspection magnification
        <select aria-label={side+" native annotation magnification"}
          data-km-photo-zoom={side} style={common} value={zoom}
          onChange={e=>setZoom(Number(e.target.value))}>
          <option value={1}>Fit · whole image</option>
          <option value={2}>2× · cranial planes</option>
          <option value={4}>4× · contour joints</option>
          <option value={8}>8× · individual paper pixels</option>
        </select>
      </label>
      <div style={{display:"grid",gap:5,fontSize:12}}>
        <span>Nudge selected {mode==="landmark"?"point":"value box"} · 1 native px</span>
        <div style={{display:"flex",gap:5}}>
          {([
            ["Left",-1,0],["Up",0,-1],["Down",0,1],["Right",1,0],
          ] as const).map(([name,dx,dy])=><button key={name}
            type="button" disabled={!canNudge} style={{
              ...common,padding:"6px 10px",minHeight:37,
              cursor:canNudge?"pointer":"not-allowed",
            }} aria-label={"Nudge "+side+" selected annotation "+
              name.toLowerCase()+" by 1 native pixel"}
            onClick={()=>nudge(dx,dy)}>{name}</button>)}
        </div>
      </div>
    </div>
    <div style={{fontSize:12,color:"#59665E"}}>
      Zoom changes the display only; exported coordinates remain in
      original image pixels. Focus the image and use arrow keys
      (Shift + arrow = 10 px) for precision corrections.
    </div>
    <div data-km-photo-scroll={side} style={{background:"#D4D1C9",
      border:"1px solid #B7B4AE",borderRadius:5,minHeight:205,
      overflow:"auto",maxHeight:540}}>
      {photo&&<div style={{position:"relative",width:(zoom*100)+"%"}}>
        <img alt={side+" local photo"} src={photo.url} draggable={false}
          style={{width:"100%",height:"auto",display:"block",
            pointerEvents:"none"}}/>
        <svg data-km-head-photo-overlay={side}
          aria-label={side+" photograph annotation canvas"}
          viewBox={`0 0 ${photo.dimensions.width} ${photo.dimensions.height}`}
          preserveAspectRatio="none" onPointerDown={down}
          onPointerUp={up} onKeyDown={keyDown} tabIndex={0}
          style={{width:"100%",height:"100%",position:"absolute",
            inset:0,cursor:"crosshair",touchAction:"none",
            userSelect:"none",WebkitUserSelect:"none"}}>
          {current.tones.map(t=><g key={t.id} pointerEvents="none">
            <rect data-km-annotated-tone={t.id}
              x={t.rect.x} y={t.rect.y} width={t.rect.width}
              height={t.rect.height} fill="#63B7D02A"
              stroke="#08728C" strokeWidth={Math.max(2,photo.dimensions.width/500)}/>
            <text data-km-annotated-tone-label={t.id}
              x={t.rect.x+Math.max(3,photo.dimensions.width/600)}
              y={t.rect.y+Math.max(9,photo.dimensions.width/75)}
              fontSize={Math.max(8,photo.dimensions.width/90)}
              fontFamily="Arial,sans-serif" fontWeight="bold"
              fill="#064D64" stroke="#FEFFFF" strokeWidth=".35"
              paintOrder="stroke">
              <title>{t.id} sample region</title>
              {HEAD_FIDELITY_TONES.indexOf(t.id)+1}
            </text>
          </g>)}
          {current.landmarks.map(p=><g key={p.id}
            data-km-annotated-contour={p.id} pointerEvents="none">
            <title>{p.id}</title>
            <circle cx={p.x} cy={p.y}
              r={Math.max(9,photo.dimensions.width/60)}
              fill="#9D2D26" stroke="white"
              strokeWidth={Math.max(1.2,photo.dimensions.width/900)}/>
            <text x={p.x} y={p.y} textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.max(8,photo.dimensions.width/100)}
              fontFamily="Arial,sans-serif" fontWeight="bold"
              fill="white">{HEAD_FIDELITY_LANDMARK_IDS.indexOf(p.id)+1}</text>
          </g>)}
          {/* The full-image transparent pointer target MUST be last.
            SVG title/text labels are never input targets; each drag
            reaches the same stable SVG root even after adding a new
            tonality or correcting an anatomical point. */}
          <rect data-km-annotation-input="" x={0} y={0}
            width={photo.dimensions.width}
            height={photo.dimensions.height} fill="transparent"
            pointerEvents="all"/>
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
  const [measuredEvidence,setMeasuredEvidence]=useState<unknown|null>(null);
  const images:LocalImages={source:source.photo,output:output.photo};
  const fingerprints:PencilHeadCheckpointImages|null=images.source&&images.output?{
    source:{name:images.source.name,sha256:images.source.sha256,
      dimensions:images.source.dimensions},
    output:{name:images.output.name,sha256:images.output.sha256,
      dimensions:images.output.dimensions},
  }:null;
  const changeFile=async(side:HeadAnnotationSide,
    event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.currentTarget.files?.[0];
    if(!file)return;
    try{
      setMessage("");
      setMeasuredEvidence(null);
      const accepted=await (side==="source"?source:output).load(file);
      // Replacing an image invalidates coordinates on THAT side only.
      if(accepted)setSession(prev=>({...prev,[side]:{landmarks:[],tones:[]}}));
    }catch(ex){setMessage(ex instanceof Error?ex.message:String(ex));}
  };
  const proof=useMemo(()=>{
    if(!images.source||!images.output)return null;
    try{return compileHeadAnnotationManifest(session,reference);}
    catch{return null;}
  },[session,reference,images.source,images.output]);
  // The imported JSON must match BOTH exact local image digests,
  // currently selected semantic points, actual rectangles and license.
  // Any subsequent edit invalidates this result immediately, without
  // pretending it was still measured against the current art.
  const measuredReview=useMemo(()=>{
    if(!measuredEvidence)return null;
    if(!fingerprints)return {view:null,error:"Both original local images are required"};
    try{
      return {view:reviewMeasuredHeadEvidence(measuredEvidence,{
        images:fingerprints,annotations:session,reference,
      }),error:null};
    }catch(error){
      return {view:null,error:error instanceof Error?error.message:String(error)};
    }
  },[measuredEvidence,session,reference,images.source,images.output]);
  const importMeasuredEvidence=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.currentTarget.files?.[0];
    event.currentTarget.value="";
    if(!file)return;
    if(!fingerprints){setMessage("Load both exact original images before reviewing measured evidence.");return;}
    if(!file.size||file.size>256*1024){
      setMessage("Measured evidence JSON must be under 256 KiB");return;
    }
    try{
      const raw:unknown=JSON.parse(await file.text());
      // Preserve the import only after validating full parity.
      reviewMeasuredHeadEvidence(raw,{
        images:fingerprints,annotations:session,reference,
      });
      setMeasuredEvidence(raw);
      setMessage("Measured source/native image JSON matched the current original files and artist annotations. Independent visual approval is still required.");
    }catch(error){
      setMeasuredEvidence(null);
      setMessage(error instanceof Error?error.message:String(error));
    }
  };
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
  const saveCheckpoint=()=>{
    if(!fingerprints)return;
    try{
      const draft=makePencilHeadAnnotationCheckpoint(session,fingerprints,reference);
      const blob=new Blob([JSON.stringify(draft,null,2)+"\n"],{
        type:"application/json"});
      const url=URL.createObjectURL(blob);
      try{
        const link=document.createElement("a");
        link.href=url;link.download="pencil-head-private-checkpoint.json";
        document.body.append(link);link.click();link.remove();
        setMessage("Downloaded private draft. Restore requires both exact original image files.");
      }finally{window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
  };
  const restoreCheckpoint=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.currentTarget.files?.[0];
    event.currentTarget.value="";
    if(!file)return;
    if(!fingerprints){setMessage("Load both original local images before restoring a checkpoint.");return;}
    if(file.size>256*1024||file.size===0){
      setMessage("Checkpoint JSON must be under 256 KiB");return;
    }
    try{
      const parsed:unknown=JSON.parse(await file.text());
      const restored=restorePencilHeadAnnotationCheckpoint(parsed,fingerprints);
      setSession(restored.session);
      setReference(restored.reference);
      setMessage("Restored annotations only after matching both exact file-byte SHA-256 fingerprints. Artist review still required.");
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
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
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
        <button type="button" onClick={saveCheckpoint}
          data-km-annotation-checkpoint-save="" disabled={!fingerprints}
          style={{...common,cursor:fingerprints?"pointer":"not-allowed"}}>
          Save local checkpoint (partial annotations allowed)
        </button>
        <label style={labelStyle}>Restore checkpoint JSON
          <input type="file" accept=".json,application/json"
            aria-label="Restore checkpoint JSON" disabled={!fingerprints}
            onChange={e=>{void restoreCheckpoint(e);}}/>
        </label>
      </div>
      <p style={{margin:0,fontSize:12}}>
        No pixels are stored. A checkpoint is a private drawing draft, not
        a photographic source license, measurement, or artistic approval.
        Restoring requires both original byte-identical local images.
      </p>
      <section aria-label="Measured source versus native head evidence"
        data-km-head-evidence-status={measuredReview?.view?.report.status??
          (measuredReview?.error?"stale":"missing")}
        style={{display:"grid",gap:10,padding:"13px 15px",
          border:"1px solid #B7B4AE",background:"#F5F3ED",maxWidth:900}}>
        <strong style={{font:"600 18px Georgia,serif"}}>
          Source / native head measurement review
        </strong>
        <p style={{margin:0,fontSize:13}}>
          After placing 18+18 head points and five + five tonal rectangles,
          run the native image capture CLI with the two unmodified local
          files. Import its JSON output here. This view rejects stale,
          swapped or incorrectly attributed evidence; it cannot certify
          portrait realism or replace direct 1× / 3× visual comparison.
        </p>
        <label style={labelStyle}>Import exact-byte measured evidence JSON
          <input type="file" accept=".json,application/json"
            aria-label="Import measured head evidence JSON"
            disabled={!fingerprints}
            onChange={e=>{void importMeasuredEvidence(e);}}/>
        </label>
        {measuredReview?.error&&<p role="alert"
          data-km-evidence-invalid=""
          style={{margin:0,color:"#8A2924",fontSize:13}}>
          INVALID / STALE: {measuredReview.error}
        </p>}
        {measuredReview?.view&&<div style={{display:"grid",gap:8}}>
          <div data-km-evidence-report-status=""
            style={{fontSize:14,fontWeight:700}}>
            {measuredReview.view.report.status==="measurement-ready"?
              "MEASUREMENT READY · ARTISTIC RELEASE HELD":
              "MEASUREMENT BLOCKED · ARTISTIC RELEASE HELD"}
          </div>
          <div style={{display:"flex",gap:18,flexWrap:"wrap",fontSize:13}}>
            <span>18 independently observed contour pairs</span>
            <span>5 original/native RGB patch pairs</span>
            <span>Geometry RMS: {measuredReview.view.report.geometryRms===null?
              "invalid":measuredReview.view.report.geometryRms.toFixed(4)}</span>
            <span>Five-tone luma difference: {
              measuredReview.view.report.tonalMeanError===null?
                "invalid":measuredReview.view.report.tonalMeanError.toFixed(4)}</span>
          </div>
          {measuredReview.view.report.errors.length>0&&
            <p data-km-evidence-errors="" role="status"
              style={{margin:0,color:"#8A2924",fontSize:12}}>
              {measuredReview.view.report.errors.join(" · ")}
            </p>}
          <details>
            <summary>Five measured native RGB pairs</summary>
            <table style={{fontSize:12,borderSpacing:"11px 5px"}}>
              <thead><tr><th scope="col">Value</th><th scope="col">Original photograph</th>
                <th scope="col">Native vector render</th></tr></thead>
              <tbody>{HEAD_FIDELITY_TONES.map(id=>{
                const src=measuredReview.view!.sourceTones.find(t=>t.id===id)!;
                const out=measuredReview.view!.outputTones.find(t=>t.id===id)!;
                return <tr key={id}><th scope="row">{id}</th>
                  <td>{src.meanRgb.join(", ")}</td><td>{out.meanRgb.join(", ")}</td>
                </tr>;
              })}</tbody>
            </table>
          </details>
        </div>}
        <p style={{margin:0,fontSize:12,fontWeight:700}}>
          Artist approved: NO. Unmeasured work and mismatched data remain
          blocked. Do not draw an eye until the source silhouette is accepted.
        </p>
      </section>
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
