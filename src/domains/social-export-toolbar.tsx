/** Storybook-only export helper; never runs shell commands from the browser.
 * Choosing a placement re-renders at the native format before PNG/MP4 export.
 */
import { useState } from "react";
import { VIDEO_PLATFORM_PRESETS } from "../../registry/video/platform-presets";
export function SocialExportToolbar(){
  const params=new URLSearchParams(window.location.search);
  const selected=params.get("kmPreset")??"youtube";
  const [copied,setCopied]=useState(false);
  const active=VIDEO_PLATFORM_PRESETS.find(p=>p.id===selected);
  const story=params.get("id")??"";
  const command=`npm run video:export -- --story=${story} --preset=${selected}`;
  return <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",
    background:"#132C3B",padding:"12px 16px",borderRadius:12,
    color:"#DFF2F7",fontFamily:"system-ui,sans-serif",fontSize:13}}>
    <label htmlFor="km-export-destination">Export for</label>
    <select id="km-export-destination" value={active?.id??"youtube"}
      onChange={event=>{
        const next=new URL(window.location.href);
        next.searchParams.set("kmPreset",event.target.value);
        window.location.assign(next.toString());
      }}
      style={{background:"#244556",color:"white",padding:"8px 10px",
        border:"1px solid #426777",borderRadius:7}}>
      {VIDEO_PLATFORM_PRESETS.map(p=><option key={p.id} value={p.id}>
        {p.label} · {p.width}×{p.height}
      </option>)}
    </select>
    <span style={{color:"#AED0DA"}}>{active?.width??1280}×{active?.height??720}</span>
    <button type="button" onClick={async()=>{
      await navigator.clipboard.writeText(command);
      setCopied(true);
    }} style={{background:"#A5F1DF",color:"#102B38",padding:"9px 14px",
      border:0,borderRadius:7,fontWeight:700}}>
      {copied?"Copied command":"Copy MP4 export command"}
    </button>
    <span style={{color:"#85A9BB"}}>Requires local Chromium + FFmpeg</span>
  </div>;
}
