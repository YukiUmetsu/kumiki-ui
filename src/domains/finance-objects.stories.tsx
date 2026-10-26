import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FINANCE_OBJECTS } from "../../registry/domains/finance-object-model";
import { FINANCE_ASSET_REVIEWS, financeAssetQualityTier } from "../../registry/domains/finance-object-review";
import type { FinanceObjectKind, FinanceObjectSpec } from "../../registry/domains/finance-object-model";
import { FinanceObject2D } from "../../registry/domains/finance-object-2d";
import { FinanceObject3D } from "../../registry/domains/finance-object-3d-stage";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import { SocialExportToolbar } from "./social-export-toolbar";
import { DomainGallery } from "./domain-gallery";
import { VIDEO_PLATFORM_PRESETS, createVideoPresetManifest } from "../../registry/video/platform-presets";
import type { VideoPlatformPresetId } from "../../registry/video/platform-presets";

const authored={id:"finance-object-catalog",durationFrames:180,
  fps:{num:30,den:1}};
const available=new Set<string>(VIDEO_PLATFORM_PRESETS.map(p=>p.id));
function activeManifest(){
  const selected=new URLSearchParams(window.location.search).get("kmPreset");
  if(!selected)return {schemaVersion:1 as const,...authored,width:1280,height:720};
  if(!available.has(selected))throw new Error("Unknown video platform preset "+selected);
  return createVideoPresetManifest(selected as VideoPlatformPresetId,authored);
}
function AssetStory({kind,mode}:{kind:FinanceObjectKind;mode:"2d"|"3d"}){
  const [frame,setFrame]=useState(179);
  const manifest=activeManifest();
  const rawView=new URLSearchParams(window.location.search).get("kmView");
  const reviewView=(["front","quarter","side","detail"].includes(rawView??"")
    ?rawView:"quarter") as "front"|"quarter"|"side"|"detail";
  const requested=new URLSearchParams(window.location.search).get("kmAsset");
  const selected=FINANCE_OBJECTS.find(entry=>entry.kind===requested)?.kind??kind;
  const descriptor=FINANCE_OBJECTS.find(entry=>entry.kind===selected)!;
  const quality=financeAssetQualityTier(selected);
  const rawFinish=new URLSearchParams(window.location.search).get("kmFinish");
  const finish=rawFinish==="natural"||rawFinish==="aged-bronze"||rawFinish==="polished-bronze"||rawFinish==="gold"?rawFinish:undefined;
  const spec:FinanceObjectSpec=useMemo(()=>({
    id:"illustrative-"+selected,kind:selected,title:descriptor.title,
  }),[selected,descriptor.title]);
  return <main style={{background:"#071722",minHeight:"100vh",color:"#F1FAFF",
    fontFamily:"Geist,Inter,system-ui,sans-serif",padding:18}}>
    <p data-km-finance-quality-status={quality} style={{margin:"0 auto 14px",maxWidth:1400,
      color:"#EDCFA0",fontSize:13}}>3D quality: {quality}. Uncertified visual prototype;
      not yet approved against multi-view photographic references.</p>
    <header style={{display:"flex",gap:28,alignItems:"center",
      maxWidth:1400,margin:"0 auto 15px"}}>
      <h1 style={{fontSize:19,margin:0}}>KUMIKI / Finance asset</h1>
      <label style={{marginLeft:"auto"}}>
        Frame {frame} <input type="range" aria-label="Scrub finance asset"
          min={0} max={179} value={frame}
          onChange={event=>setFrame(Number(event.target.value))}/>
      </label>
    </header>
    <div style={{maxWidth:1400,margin:"0 auto 18px"}}><SocialExportToolbar/></div>
    <div style={{width:"fit-content",maxWidth:"100%",margin:"auto",
      boxShadow:"0 24px 90px #0008",borderRadius:18,overflow:"hidden"}}>
      <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
        {mode==="2d"
          ?<div style={{width:"100%",height:"100%",display:"grid",
            placeItems:"center",background:"#081A27"}}>
            <FinanceObject2D spec={spec} frame={frame} width={Math.min(900,manifest.width*.84)}
              height={Math.min(750,manifest.height*.75)}/>
          </div>
          :<FinanceObject3D spec={spec} frame={frame}
             width={manifest.width} height={manifest.height}
             durationFrames={180} reviewView={reviewView} finish={finish}/>}
      </VideoExportStage>
    </div>
    <p style={{textAlign:"center",color:"#A2C2D1"}}>
      Use video:export -- --story=&lt;story id&gt; --preset=youtube-shorts
    </p>
  </main>;
}
const FINANCE_STRESS_TOKENS={accent:"#B5651D",accent2:"#6E8F2A",deep:"#5B4A6E"};
function Catalog(){
  return <DomainGallery heading="Finance & Business objects"
    description="Per-kind SVG illustrations on shared archetype sub-assemblies"
    entries={FINANCE_OBJECTS}
    renderItem={(kind,theme)=><FinanceObject2D spec={{id:"catalog-"+kind,kind:kind as FinanceObjectKind}}
      theme={theme} width={168} height={140}/>}
    stress={theme=><>
      <FinanceObject2D theme={theme} width={240} height={200}
        spec={{id:"stress-long",kind:"loan-agreement",title:"Small-business equipment financing agreement"}}/>
      <FinanceObject2D theme={theme} width={240} height={200}
        spec={{id:"stress-cjk",kind:"savings-account",title:"積立定期預金口座と利息の受け取り"}}/>
      <FinanceObject2D theme={theme} width={240} height={200} currencySymbol="¥" tokens={FINANCE_STRESS_TOKENS}
        spec={{id:"stress-tokens",kind:"coins",title:"Custom tokens · ¥ symbol"}}/>
      <FinanceObject2D theme={theme} width={240} height={200} currencySymbol="£" secondaryCurrencySymbol="¥"
        spec={{id:"stress-exchange",kind:"currency-exchange",state:"active"}}/>
      <FinanceObject2D theme={theme} width={240} height={200}
        spec={{id:"stress-complete",kind:"repayment",state:"complete"}}/>
      <FinanceObject2D theme={theme} width={96} height={80} showTitle={false}
        spec={{id:"stress-small",kind:"credit-card"}}/>
    </>}>
    <output hidden data-km-finance-audit-ledger="">
      {JSON.stringify(FINANCE_ASSET_REVIEWS)}
    </output>
  </DomainGallery>;
}
const meta={title:"Finance, business and technology/Finance Objects", id: "domains-finance-objects",component:AssetStory,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof AssetStory>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Bank2D:Story={args:{kind:"bank",mode:"2d"}};
export const Bank3D:Story={args:{kind:"bank",mode:"3d"}};
export const CreditCard2D:Story={args:{kind:"credit-card",mode:"2d"}};
export const CreditCard3D:Story={args:{kind:"credit-card",mode:"3d"}};
export const ATM2D:Story={args:{kind:"atm",mode:"2d"}};
export const ATM3D:Story={args:{kind:"atm",mode:"3d"}};
export const BankAccount2D:Story={args:{kind:"bank-account",mode:"2d"}};
export const BankAccount3D:Story={args:{kind:"bank-account",mode:"3d"}};
export const Loan2D:Story={args:{kind:"loan",mode:"2d"}};
export const Loan3D:Story={args:{kind:"loan",mode:"3d"}};
export const Dollar2D:Story={args:{kind:"dollar",mode:"2d"}};
export const Dollar3D:Story={args:{kind:"dollar",mode:"3d"}};
export const CashStack2D:Story={args:{kind:"cash-stack",mode:"2d"}};
export const CashStack3D:Story={args:{kind:"cash-stack",mode:"3d"}};
export const Insurance2D:Story={args:{kind:"insurance",mode:"2d"}};
export const Insurance3D:Story={args:{kind:"insurance",mode:"3d"}};
export const TradingWorkstation2D:Story={args:{kind:"stock-workstation",mode:"2d"}};
export const TradingWorkstation3D:Story={args:{kind:"stock-workstation",mode:"3d"}};
export const PrintingPress2D:Story={args:{kind:"money-printing-press",mode:"2d"}};
export const PrintingPress3D:Story={args:{kind:"money-printing-press",mode:"3d"}};
export const MoneyBag2D:Story={args:{kind:"money-bag",mode:"2d"}};
export const MoneyBag3D:Story={args:{kind:"money-bag",mode:"3d"}};
export const BankCheck2D:Story={args:{kind:"bank-check",mode:"2d"}};
export const BankCheck3D:Story={args:{kind:"bank-check",mode:"3d"}};
export const CorporateOffice2D:Story={args:{kind:"corporate-office",mode:"2d"}};
export const CorporateOffice3D:Story={args:{kind:"corporate-office",mode:"3d"}};
export const RetailStore3D:Story={args:{kind:"retail-store",mode:"3d"}};
export const PiggyBank3D:Story={args:{kind:"piggy-bank",mode:"3d"}};
export const PhysicalCalculator3D:Story={args:{kind:"calculator",mode:"3d"}};
export const StockMarketChart3D:Story={args:{kind:"stock-chart",mode:"3d"}};
export const BullMarket3D:Story={args:{kind:"bull-market",mode:"3d"}};
export const BearMarket3D:Story={args:{kind:"bear-market",mode:"3d"}};
export const GoldBars3D:Story={args:{kind:"gold-bars",mode:"3d"}};
export const MoneyBag3DHero:Story={args:{kind:"money-bag",mode:"3d"}};
export const AllObjects:Story={render:()=> <Catalog/>,args:{kind:"bank",mode:"2d"}};
