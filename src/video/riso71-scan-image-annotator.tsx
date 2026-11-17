import {useEffect,useMemo,useState} from "react";
import type {RisoProofPoint,RisoScanMeasurements} from "../../registry/video/riso-scan-proof";
import {riso71BuildScanMeasurements,
  riso71DisplayToSourcePixel,riso71TargetKeys}
  from "../../registry/video/riso-scan-image-annotation";

const field={display:"grid",gap:4,font:"600 13px system-ui"} as const;
const button={border:"1px solid #988575",background:"#FFFAED",
  padding:"7px 10px",borderRadius:3,minHeight:38,color:"#293E50",
  cursor:"pointer",font:"600 13px system-ui"} as const;
const label=(key:string)=>key.startsWith("paper:")?
  "PAPER "+key.slice(6).replace(/-/g," "):
  key.replace(":"," ink · ")+" register cross";

/** RISO71: operator places actual points on a local scanned proof. Original
 * image pixels never leave the browser; no synthetic image is auto-created.
 * This is an optional diagnostic, not a scanner or printer certification. */
export function RisoScanImageAnnotator({plateIds,resetKey,onChange}:{
  plateIds:readonly string[];
  resetKey:string;
  onChange:(value:RisoScanMeasurements|null)=>void;
}){
  const keys=useMemo(()=>riso71TargetKeys(plateIds),[plateIds]);
  const [url,setUrl]=useState("");
  const [size,setSize]=useState<readonly [number,number]>([0,0]);
  const [picked,setPicked]=useState<Record<string,RisoProofPoint|undefined>>({});
  const [selected,setSelected]=useState(0);
  const [xText,setXText]=useState("");
  const [yText,setYText]=useState("");
  const [zoom,setZoom]=useState(1);
  const [error,setError]=useState("");
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  // A new original film cel, print seed or press mark plan invalidates positions.
  useEffect(()=>{
    setPicked({});setSelected(0);setXText("");setYText("");
    setError("");onChange(null);
    // resetKey is the sole reset signal, not every render's callback identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[resetKey]);
  const key=keys[selected]??keys[0];
  const complete=keys.filter(k=>picked[k]!==undefined).length;
  function choose(index:number){
    setSelected(index);
    const point=picked[keys[index]];
    setXText(point?String(point[0]):"");
    setYText(point?String(point[1]):"");
    setError("");
  }
  function record(point:RisoProofPoint){
    const next={...picked,[key]:point};
    setPicked(next);setXText(String(point[0]));setYText(String(point[1]));
    const incomplete=keys.findIndex(k=>next[k]===undefined);
    if(incomplete>=0){onChange(null);choose(incomplete);}
    else {
      try{
        onChange(riso71BuildScanMeasurements(plateIds,next,size[0],size[1]));
        setError("");
      }catch(e){
        onChange(null);
        setError(e instanceof Error?e.message:String(e));
      }
    }
  }
  function load(file:File|undefined){
    setError("");setPicked({});setSelected(0);setSize([0,0]);
    setXText("");setYText("");onChange(null);
    if(!file){setUrl("");return;}
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||
      file.size<=0||file.size>30*1024*1024){
      setUrl("");
      setError("Upload a PNG/JPEG/WebP scan smaller than 30 MB. SVG and external URLs are not accepted.");
      return;
    }
    setUrl(URL.createObjectURL(file));
  }
  return <section data-km-riso71-image-study=""
    data-km-riso71-count={complete}
    data-km-riso71-total={keys.length}
    aria-label="RISO71 annotate actual scanned print image"
    style={{display:"grid",gap:12,padding:14,
      border:"1px solid #9E927D",background:"#F8F2E8",maxWidth:1100}}>
    <div>
      <h3 style={{margin:"0 0 4px",font:"700 20px Georgia,serif"}}>
        RISO71 · Source-image registration microscope
      </h3>
      <p style={{margin:0}}>
        Upload your own photograph/scan of the printed sheet with both ink
        passes and registration crosses. Mark four PAPER corners first, then
        four original cross centers for each drum. Pixel picking never changes
        the original stencil, dry-brush pores or tonal ink layers. Only
        manually marked operator observations are reported.
      </p>
    </div>
    <label style={field}>Actual paper scan (local PNG, JPEG or WebP)
      <input type="file" accept="image/png,image/jpeg,image/webp"
        aria-label="RISO71 upload source scan image"
        onChange={e=>load(e.currentTarget.files?.[0])}/>
    </label>
    {url&&<div style={{display:"grid",gap:10}}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <label style={field}>Reference-image enlargement · {zoom}×
          <select aria-label="RISO71 microscope zoom" value={zoom}
            onChange={e=>setZoom(Number(e.target.value))}>
            <option value={1}>1× · original overview</option>
            <option value={2}>2× · ink intersections</option>
            <option value={3}>3× · dry-fibre/paper edge</option>
          </select>
        </label>
        <strong aria-live="polite">{complete} / {keys.length} points marked.
          {" "}Active: {label(key)}</strong>
      </div>
      <div style={{overflow:"auto",maxHeight:660,border:"1px solid #958A78",
        background:"#D9D0C0",maxWidth:1000}}>
        <div style={{position:"relative",width:(zoom*100)+"%",
          minWidth:0,overflow:"hidden"}}>
          <img src={url} alt="Local printed reference image; measured operator pixel annotations"
            data-km-riso71-image=""
            onLoad={e=>{
              const image=e.currentTarget,w=image.naturalWidth,h=image.naturalHeight;
              if(w<16||h<16||w>16000||h>16000){
                setSize([0,0]);setError("Image dimensions must be 16–16000 pixels.");
                onChange(null);return;
              }
              setSize([w,h]);setPicked({});onChange(null);
            }}
            style={{display:"block",width:"100%",height:"auto"}}/>
          {size[0]>0&&<>
            <svg viewBox={`0 0 ${size[0]} ${size[1]}`}
              aria-hidden="true" style={{position:"absolute",inset:0,
                width:"100%",height:"100%",pointerEvents:"none"}}>
              {keys.map((k,i)=>{
                const p=picked[k];if(!p)return null;
                const r=Math.max(4,Math.min(size[0],size[1])*.009);
                return <g key={k} data-km-riso71-marker={k}>
                  <circle cx={p[0]} cy={p[1]} r={r}
                    stroke={i<4?"#171C1F":"#CA382A"} fill="none"
                    strokeWidth={Math.max(2,r*.36)}/>
                  <path d={`M${p[0]-r*1.7} ${p[1]}h${r*3.4}M${p[0]} ${p[1]-r*1.7}v${r*3.4}`}
                    stroke={i<4?"#171C1F":"#CA382A"}
                    strokeWidth={Math.max(1.5,r*.22)} fill="none"/>
                </g>;
              })}
            </svg>
            <button type="button" aria-label={"RISO71 click image to mark "+label(key)}
              onClick={e=>{
                try{
                  const b=e.currentTarget.getBoundingClientRect();
                  record(riso71DisplayToSourcePixel(e.clientX,e.clientY,b,size[0],size[1]));
                }catch(ex){setError(ex instanceof Error?ex.message:String(ex));}
              }}
              style={{position:"absolute",inset:0,border:0,
                background:"transparent",cursor:"crosshair"}}/>
          </>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:6}}>
        {keys.map((k,i)=><button type="button" key={k}
          data-km-riso71-target={k}
          aria-pressed={i===selected}
          onClick={()=>choose(i)}
          style={{...button,borderColor:i===selected?"#293E50":"#B7AD9E",
            background:i===selected?"#E4D2B7":"#FFFAED"}}>
          {picked[k]?"● ":"○ "}{label(k)}
        </button>)}
      </div>
      <form onSubmit={e=>{
        e.preventDefault();
        if(!xText.trim()||!yText.trim()){setError("Both source pixel coordinates are required.");return;}
        const pt:[number,number]=[Number(xText),Number(yText)];
        if(pt.some(n=>!Number.isFinite(n))||pt[0]<0||pt[0]>size[0]||
          pt[1]<0||pt[1]>size[1]){
          setError("Enter pixel positions inside the uploaded scan.");return;
        }
        record(pt);
      }} style={{display:"flex",flexWrap:"wrap",gap:9,alignItems:"end"}}>
        <label style={field}>X · original image pixels
          <input type="number" step=".01" aria-label="RISO71 X image pixel"
            value={xText} onChange={e=>setXText(e.target.value)}/>
        </label>
        <label style={field}>Y · original image pixels
          <input type="number" step=".01" aria-label="RISO71 Y image pixel"
            value={yText} onChange={e=>setYText(e.target.value)}/>
        </label>
        <button type="submit" style={button}>Set selected point</button>
        <button type="button" style={button} onClick={()=>{
          setPicked({});choose(0);onChange(null);
        }}>Clear all observations</button>
      </form>
      <div>Native scan pixels: {size[0]} × {size[1]}.
        {" "}Marks are visual measurements, not computer-vision detection.
        Paper corners must be selected in feed-order, not arbitrary scanner rotation.</div>
    </div>}
    {error&&<p role="alert" data-km-riso71-error=""
      style={{color:"#943D2D",fontWeight:700,margin:0}}>{error}</p>}
    {!url&&<p style={{margin:0}}>No physical scan image loaded. Synthetic
      calibration remains a separate, explicitly labelled RISO70 demonstration.</p>}
    <p style={{fontSize:12,margin:0}}>
      Image stays in this browser session. A photo may have perspective distortion;
      source-corner affine residuals must pass RISO70 independently. Uploading or
      marking an image is not verification that it came from a real RISO press.
      Reference photos are linked in the ArtCraft study, never bundled or traced.
    </p>
  </section>;
}
