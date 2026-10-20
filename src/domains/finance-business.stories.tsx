import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  BUSINESS_CONVERSION_FUNNEL,BUSINESS_REVENUE_TREND,
  FINANCE_PORTFOLIO_TREND,FINANCE_REVENUE_BRIDGE,
} from "../../registry/domains/metric-model";
import type { MetricVisualSpec } from "../../registry/domains/metric-model";
import { MetricVisual2D } from "../../registry/domains/metric-visual-2d";
import { MetricVisual3D } from "../../registry/domains/metric-visual-3d-stage";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import { SocialExportToolbar } from "./social-export-toolbar";
import { VIDEO_PLATFORM_PRESETS, createVideoPresetManifest } from "../../registry/video/platform-presets";
import type { VideoPlatformPresetId } from "../../registry/video/platform-presets";

const authored={id:"finance-business-demo",durationFrames:180,fps:{num:30,den:1}};
function activeManifest(){
  const id=new URLSearchParams(window.location.search).get("kmPreset");
  if(!id)return {schemaVersion:1 as const,...authored,width:1280,height:720};
  if(!VIDEO_PLATFORM_PRESETS.some(p=>p.id===id))
    throw new Error("Unknown video preset "+id+".");
  return createVideoPresetManifest(id as VideoPlatformPresetId,authored);
}
const reveal={startFrame:8,framesPerMark:22};
function DomainPreview({spec,mode}:{spec:MetricVisualSpec;mode:"2d"|"3d"}){
  const [frame,setFrame]=useState(179);
  const manifest=activeManifest();
  return <main style={{minHeight:"100vh",background:"#07151E",color:"#E7F4FA",
    padding:24,fontFamily:"Geist, Inter, system-ui, sans-serif"}}>
    <div style={{marginBottom:18,display:"flex",alignItems:"center",gap:22}}>
      <div style={{fontSize:14,letterSpacing:2,color:"#A5D8D8"}}>
        FINANCE / BUSINESS · {mode.toUpperCase()} · DETERMINISTIC
      </div>
      <label style={{marginLeft:"auto",fontSize:14}}>
        Frame {frame} / 179{" "}
        <input aria-label="Scrub domain visual" type="range" min={0} max={179}
          value={frame} onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
    </div>
    <div style={{maxWidth:1280,margin:"0 auto 18px"}}><SocialExportToolbar/></div>
    <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
      {mode==="2d"
        ?<MetricVisual2D spec={spec} frame={frame} reveal={reveal}
          width={manifest.width} height={manifest.height}/>
        :<MetricVisual3D spec={spec} frame={frame} reveal={reveal}
          width={manifest.width} height={manifest.height} durationFrames={180}/>}
    </VideoExportStage>
    <p style={{color:"#A9BEC9",fontSize:14}}>
      Export this Storybook story with: npm run video:export -- --story=&lt;this story ID&gt; --output=dist/chart.mp4
    </p>
  </main>;
}
const meta={title:"Domains/Finance & Business",component:DomainPreview,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof DomainPreview>;
export default meta;
type Story=StoryObj<typeof meta>;
export const FinanceWaterfall2D:Story={
  args:{spec:FINANCE_REVENUE_BRIDGE,mode:"2d"},
};
export const FinanceWaterfall3D:Story={
  args:{spec:FINANCE_REVENUE_BRIDGE,mode:"3d"},
};
export const FinancePortfolioTrend2D:Story={
  args:{spec:FINANCE_PORTFOLIO_TREND,mode:"2d"},
};
export const FinancePortfolioTrend3D:Story={
  args:{spec:FINANCE_PORTFOLIO_TREND,mode:"3d"},
};
export const BusinessFunnel2D:Story={
  args:{spec:BUSINESS_CONVERSION_FUNNEL,mode:"2d"},
};
export const BusinessFunnel3D:Story={
  args:{spec:BUSINESS_CONVERSION_FUNNEL,mode:"3d"},
};
export const BusinessRevenue2D:Story={
  args:{spec:BUSINESS_REVENUE_TREND,mode:"2d"},
};
export const BusinessRevenue3D:Story={
  args:{spec:BUSINESS_REVENUE_TREND,mode:"3d"},
};
/** 2D label stress: long/CJK labels, many marks, minimum canvas, both palettes. */
const CJK_FUNNEL:MetricVisualSpec={...BUSINESS_CONVERSION_FUNNEL,id:"stress-cjk-funnel",
  title:"コンバージョン",subtitle:"架空の月次パイプライン",stages:[
    {id:"visits",label:"ウェブサイト訪問者数",value:24000},
    {id:"signup",label:"無料トライアル登録",value:6200},
    {id:"qualified",label:"営業確度の高い見込み顧客",value:1800},
    {id:"customers",label:"有料契約に至った顧客",value:540}]};
const LONG_BRIDGE:MetricVisualSpec={...FINANCE_REVENUE_BRIDGE,id:"stress-long-bridge",changes:[
  {id:"new",label:"New enterprise business",delta:34000},
  {id:"upsell",label:"Expansion within accounts",delta:18000},
  {id:"price",label:"Pricing adjustments",delta:6000},
  {id:"churn",label:"Churned subscriptions",delta:-11000},
  {id:"contraction",label:"Seat contraction",delta:-5000},
  {id:"fx",label:"Foreign exchange impact",delta:-4000}]};
function LabelStress(){
  return <main style={{display:"grid",gap:16,padding:16,background:"#0B141B",justifyItems:"start"}}>
    <MetricVisual2D spec={CJK_FUNNEL} palette="paper" width={640} height={480}/>
    <MetricVisual2D spec={LONG_BRIDGE} palette="midnight" width={860} height={480}/>
    <MetricVisual2D spec={BUSINESS_REVENUE_TREND} palette="paper" width={600} height={420}/>
  </main>;
}
export const LabelStress2D:Story={render:()=> <LabelStress/>,
  args:{spec:BUSINESS_CONVERSION_FUNNEL,mode:"2d"}};
