import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SubjectStage } from "../../../registry/video/subject-stage";
import type { SubjectAsset } from "../../../registry/video/subject-stage";

const windowSpec={startFrame:3188,endFrame:3488,changeFrame:3212,change:"connect" as const};
const dataUri=(svg:string)=>"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
/** Original illustration, not a screenshot of any vendor's product. */
const ledger=dataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 484"><rect width="860" height="484" fill="#f3f7f9"/><rect width="860" height="62" fill="#17394e"/><text x="32" y="41" font-family="Arial" font-size="27" fill="white">Invoices / General Ledger</text><rect x="34" y="99" width="792" height="50" rx="6" fill="#d5e5ed"/><text x="50" y="133" font-family="Arial" font-size="21" fill="#17394e">Date</text><text x="260" y="133" font-family="Arial" font-size="21" fill="#17394e">Invoice</text><text x="610" y="133" font-family="Arial" font-size="21" fill="#17394e">Amount</text><g font-family="Arial" font-size="21" fill="#214056"><text x="50" y="207">Oct 24</text><text x="260" y="207">INV-0128</text><text x="610" y="207">$845.00</text><text x="50" y="270">Oct 25</text><text x="260" y="270">INV-0129</text><text x="610" y="270">$390.00</text><text x="50" y="338">Oct 26</text><text x="260" y="338">INV-0130</text><text x="610" y="338">$775.00</text></g><g stroke="#cad8df" stroke-width="2"><path d="M34 225H826M34 291H826M34 358H826"/></g></svg>');
const receipt=dataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 700"><rect width="1100" height="700" fill="#7a6556"/><path d="M0 500L1100 80V700H0" fill="#b59472"/><g transform="rotate(-8 545 353)"><rect x="361" y="105" width="370" height="520" rx="5" fill="#f6eddd"/><path d="M410 190H682M410 236H682M410 305H682M410 350H631M410 420H682M410 500H682" stroke="#a1a0a0" stroke-width="12"/><path d="M409 548H650" stroke="#2e5363" stroke-width="16"/></g></svg>');
const mark=dataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280"><rect width="280" height="280" rx="42" fill="#1f5a62"/><path d="M76 60V220M76 70H222M76 120H222M76 170H222M76 220H222" stroke="#d2f4e5" stroke-width="16" stroke-linecap="round"/></svg>');
function Cause({changed}:{changed:boolean}) {
  return <svg viewBox="0 0 660 640" role="img" aria-label="Inbox connects to ledger"
    style={{width:"100%",height:"100%",display:"block"}}>
    <rect x="17" y="120" width="248" height="210" rx="25" fill="#244559" stroke="#729a9e" strokeWidth="3"/>
    <text x="140" y="237" textAnchor="middle" fill="#f5f7f8" fontSize="38" fontWeight="650">Inbox</text>
    {changed&&<path data-km-connection="" d="M265 225H384" stroke="#66ddc8" strokeWidth="9" strokeLinecap="round"/>}
    {changed&&<path d="M366 209L386 225L366 241" stroke="#66ddc8" strokeWidth="8" fill="none"/>}
    {changed&&<><rect x="395" y="120" width="248" height="210" rx="25" fill="#244559" stroke="#66ddc8" strokeWidth="3"/>
      <text x="519" y="237" textAnchor="middle" fill="#f5f7f8" fontSize="38" fontWeight="650">Ledger</text></>}
    <text x="25" y="445" fontSize="25" fill="#bed0d6">Each invoice reaches the correct record.</text>
  </svg>;
}
type Variant="laptop"|"monitor"|"phone"|"screen"|"icon"|"no-icon"|"receipt"|"diagram";
function Demo({variant}:{variant:Variant}) {
  const [frame,setFrame]=useState(3212);
  const [portrait,setPortrait]=useState(false);
  const [reduced,setReduced]=useState(false);
  const src:SubjectAsset|undefined=variant==="diagram"?undefined
    :variant==="icon"||variant==="no-icon"
      ?{mode:"icon",src:variant==="icon"?mark:undefined,name:"Accounting software",claim:"software files each invoice"}
      :variant==="receipt"
        ?{mode:"scene",src:receipt,alt:"Illustrated receipt on a desk",focalPoint:{x:.5,y:.5}}
        :variant==="screen"
          ?{mode:"screen",src:ledger,alt:"Ledger table screenshot"}
          :{mode:"device",src:ledger,alt:"Ledger interface",device:variant,
            highlight:{x:.08,y:.42,width:.84,height:.12}};
  return <main style={{background:"#101a27",color:"#eef5f7",minHeight:"100vh",padding:24,fontFamily:"system-ui"}}>
    <div style={{display:"flex",gap:18,alignItems:"center",marginBottom:16}}>
      <label><input type="checkbox" checked={portrait} onChange={e=>setPortrait(e.target.checked)}/> 9:16 portrait</label>
      <label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduced motion</label>
      <span>Absolute frame {frame}</span>
    </div>
    <div style={{maxWidth:portrait?425:1100,margin:"auto"}}>
      <SubjectStage frame={frame} window={windowSpec} orientation={portrait?"portrait":"landscape"} subject={src}
        title={variant==="receipt"?"A receipt waits until someone files it":"Where does each invoice go?"}
        caption={variant==="receipt"?"someone files the receipt":"software files each invoice"}
        explanation={sample=><Cause changed={sample.changed}/>} />
    </div>
    <label style={{display:"block",marginTop:24}}>Seek the exact reveal
      <input style={{width:"100%"}} type="range" min={3188} max={3487} value={frame}
        onChange={e=>setFrame(Number(e.target.value))}/>
    </label>
    <div style={{display:"flex",gap:12,marginTop:10}}>
      {[3188,3211,3212,3213,3400,3487].map(n=><button key={n} type="button"
        onClick={()=>setFrame(n)} style={{padding:9,color:"#172735",background:"#e0efef",borderRadius:6}}>
        {n}</button>)}
    </div>
  </main>;
}
const meta={title:"Motion/Subject Led Explainers",component:SubjectStage,
  args:{frame:3212,window:windowSpec,explanation:<Cause changed/>},
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof SubjectStage>;
export default meta;
type Story=StoryObj<typeof meta>;
export const LedgerLaptop:Story={render:()=> <Demo variant="laptop"/>};
export const LedgerMonitor:Story={render:()=> <Demo variant="monitor"/>};
export const MobileApp:Story={render:()=> <Demo variant="phone"/>};
export const ScreenshotWithoutBezel:Story={render:()=> <Demo variant="screen"/>};
export const LicensedIcon:Story={render:()=> <Demo variant="icon"/>};
export const GenericIcon:Story={render:()=> <Demo variant="no-icon"/>};
export const ReceiptScene:Story={render:()=> <Demo variant="receipt"/>};
export const DiagramOnly:Story={render:()=> <Demo variant="diagram"/>};
