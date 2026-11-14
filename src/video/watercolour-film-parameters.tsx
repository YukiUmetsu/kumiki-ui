import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

/** A responsive stage: FilmStage continues rendering at its authored pixel resolution. */
export function WatercolourFilmViewport({ width, height, children, maxWidth = 860 }: {
  width: number; height: number; maxWidth?: number; children: (scale: number) => ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [pixelWidth, setPixelWidth] = useState(Math.min(width, maxWidth));
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const update = () => setPixelWidth(Math.max(1, node.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width, maxWidth]);
  return <div ref={container} style={{width:"100%",maxWidth:Math.min(width,maxWidth),
    aspectRatio:width+" / "+height,overflow:"hidden",background:"#F7F0E4",
    boxShadow:"0 18px 46px #26343125",border:"1px solid #D5CAB9",borderRadius:4}}>
    {children(Math.max(.001, Math.min(1, pixelWidth / width)))}
  </div>;
}

const fieldStyle = {minHeight:40,font:"600 13px system-ui",padding:"8px 12px",
  border:"1px solid #C5B9A9",borderRadius:8,background:"#FFFCF6",color:"#35484A"} as const;

/** Fine tuning stays a distinct layer above the full authoring JSON, never a private clock. */
export function WatercolourSlider({label,value,min=0,max=1,step=.05,onChange,format}:{
  label:string;value:number;min?:number;max?:number;step?:number;
  onChange:(value:number)=>void;format?:(value:number)=>string;
}) {
  return <label style={{display:"grid",gap:6,font:"600 13px system-ui",minWidth:137}}>
    <span>{label}: <strong>{format?format(value):Math.round(value*100)+"%"}</strong></span>
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value}
      onChange={e=>onChange(Number(e.target.value))}
      style={{accentColor:"#476A69",minHeight:28}}/>
  </label>;
}

/** Edit the complete serializable engine data instead of exposing only cosmetic sliders.
 * Invalid edits never replace the last playable scene; no eval, remote execution or timer.
 */
export function WatercolourParameterEditor<T>({ title, value, validate, onApply, onReset, notes }: {
  title: string; value: T; validate: (candidate: unknown) => readonly string[];
  onApply: (value: T) => void; onReset: () => void; notes?: string;
}) {
  const id=useId();
  const [draft,setDraft]=useState(()=>JSON.stringify(value,null,2));
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [copyStatus,setCopyStatus]=useState("");
  useEffect(()=>{setDraft(JSON.stringify(value,null,2));setError("");setMessage("");},[value]);
  const apply=()=>{
    setError("");setMessage("");
    if(draft.length>1000000){setError("Configuration exceeds the 1 MB editor limit.");return;}
    try{
      const candidate:unknown=JSON.parse(draft);
      const problems=validate(candidate);
      if(problems.length){setError(problems.slice(0,6).join("\n"));return;}
      onApply(candidate as T);
      setMessage("Applied to this interactive preview.");
    }catch(err){setError(err instanceof Error?err.message:String(err));}
  };
  return <details style={{maxWidth:1000,border:"1px solid #CFC3B4",borderRadius:10,
    padding:"10px 14px",background:"#FCF8F0",color:"#354849",fontFamily:"system-ui,sans-serif"}}>
    <summary style={{cursor:"pointer",padding:"6px 2px",fontWeight:720,fontSize:15}}>
      {title} · advanced JSON editor
    </summary>
    <p style={{fontSize:13,lineHeight:1.6,margin:"10px 0"}}>
      Edit every authored value, including per-layer colors, timing, geometry and material controls.
      Changes are validated before they affect the preview. {notes}
    </p>
    <label htmlFor={id} style={{display:"block",fontWeight:660,fontSize:13,marginBottom:5}}>Scene configuration (JSON)</label>
    <textarea id={id} value={draft} onChange={e=>{setDraft(e.target.value);setError("");setMessage("");}}
      spellCheck={false} rows={15} style={{boxSizing:"border-box",width:"100%",
        minHeight:250,resize:"vertical",border:"1px solid #9DA8A0",borderRadius:7,
        padding:12,background:"#fff",color:"#253D40",font:"12px/1.5 ui-monospace,monospace"}}/>
    {error && <pre role="alert" style={{whiteSpace:"pre-wrap",color:"#952F2F",fontSize:13,
      margin:"7px 0"}}>{error}</pre>}
    {message && <p role="status" style={{fontSize:13,color:"#2A6057",margin:"7px 0"}}>{message}</p>}
    {copyStatus && <p role="status" style={{fontSize:13,color:"#2A6057",margin:"7px 0"}}>{copyStatus}</p>}
    <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:11}}>
      <button type="button" style={fieldStyle} onClick={apply}>Apply validated JSON</button>
      <button type="button" style={fieldStyle} onClick={()=>{onReset();setError("");setCopyStatus("");setMessage("Restored this preset.");}}>
        Reset this preset
      </button>
      <button type="button" style={fieldStyle} onClick={()=>{
        if(typeof navigator==="undefined"||!navigator.clipboard){setCopyStatus("Select the editor text to copy.");return;}
        void navigator.clipboard.writeText(draft).then(()=>setCopyStatus("JSON copied."),
          ()=>setCopyStatus("Clipboard unavailable; select text in the editor."));
      }}>Copy JSON</button>
    </div>
  </details>;
}

export function inspectJsonObject(candidate:unknown):string[]{
  return candidate!==null && typeof candidate==="object" && !Array.isArray(candidate)
    ? [] : ["Expected a JSON object."];
}
