/** Unified searchable catalog for humans; uses the same source and ranking
 * as the offline agent CLI. Imports no 3D renderer, Storybook modules or LLM.
 */
import { useMemo, useState } from "react";
import { componentCatalog } from "./catalog-sources";
import { catalogStoryUrl, searchCatalog } from "./catalog-core";
import type { CatalogDomain, CatalogRenderer, CatalogEntryType,
  CatalogEntry } from "./catalog-core";

const FONT="Geist, Inter, system-ui, -apple-system, sans-serif";
const card={border:"1px solid #283C4D",borderRadius:16,background:"#12232F"} as const;
const focus={background:"#0C1924",color:"#EAF6F8",border:"1px solid #425B6C",
  borderRadius:9,padding:"9px 12px",font:"inherit",minHeight:40} as const;
const display=(s:string)=>s.replaceAll("-"," ").replace(/^\w/,c=>c.toUpperCase());
function initialSearch(){
  if(typeof window==="undefined")return "";
  const hash=window.location.hash;
  return new URLSearchParams(hash.slice(hash.indexOf("?")+1)).get("q")??"";
}
function CatalogCard({entry}:{entry:CatalogEntry}){
  const [expanded,setExpanded]=useState(false);
  const [copied,setCopied]=useState(false);
  const preview=catalogStoryUrl(entry,
    typeof window!=="undefined"&&window.location.pathname.includes("iframe.html")
      ?"/iframe.html":"http://127.0.0.1:6006/iframe.html");
  const gitFile="https://github.com/YukiUmetsu/kumiki-ui/blob/main/";
  return <article data-km-catalog-entry={entry.id} style={{...card,padding:18,
    display:"grid",gap:12,alignContent:"start",minWidth:0}}>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",
      color:"#9AB5C5",fontSize:12}}>
      <span style={{color:"#77DACA",fontWeight:750,letterSpacing:".07em"}}>
        {entry.domain.toUpperCase()}</span>
      <span>{entry.type} · {entry.renderer==="three"?"3D":entry.renderer==="svg"?"2D":entry.renderer}</span>
      {entry.review==="not-reviewed"
        ?<span style={{color:"#F0CB93"}}>Visual review pending</span>
        :null}
    </div>
    <div>
      <h2 style={{margin:"0 0 5px",fontSize:19,lineHeight:1.25,
        letterSpacing:"-.025em",color:"#F5FCFF"}}>{entry.title}</h2>
      <p style={{margin:0,color:"#B8CBD5",fontSize:13,lineHeight:1.58}}>
        {entry.description}</p>
    </div>
    <code style={{fontSize:12,color:"#80D9CA",overflowWrap:"anywhere"}}>
      {entry.id}</code>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      {preview?<a href={preview} target="_blank" rel="noreferrer"
        style={{...focus,textDecoration:"none",fontSize:13,fontWeight:700,
          background:"#B3EAD8",color:"#102632",border:"none",
          display:"inline-flex",alignItems:"center"}}>
          Storybook preview ↗</a>:null}
      <button type="button" style={{...focus,fontSize:13,cursor:"pointer"}}
        onClick={()=>{
          void navigator.clipboard?.writeText(entry.registryItem).then(
            ()=>setCopied(true),()=>setCopied(false));
        }}>{copied?"Copied ID":"Copy registry ID"}</button>
      <button type="button" aria-expanded={expanded}
        aria-controls={"catalog-detail-"+entry.id.replaceAll(":","-")}
        onClick={()=>setExpanded(v=>!v)} style={{...focus,cursor:"pointer",fontSize:13}}>
        {expanded?"Hide details":"Install details"}
      </button>
    </div>
    {expanded?<section id={"catalog-detail-"+entry.id.replaceAll(":","-")}
      style={{borderTop:"1px solid #2C4453",paddingTop:12,fontSize:12,
        color:"#C8D6DD",display:"grid",gap:10}}>
      <div><strong style={{color:"#E4F3F8"}}>Installable registry item</strong>
        <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",margin:"5px 0 0",
          color:"#7FE1CD"}}>{entry.registryItem}</pre></div>
      <div><strong style={{color:"#E4F3F8"}}>Transitive install order</strong>
        <p style={{margin:"5px 0 0",overflowWrap:"anywhere"}}>
          {entry.installOrder.join(" → ")}</p></div>
      {entry.dependencies.length?<div><strong style={{color:"#E4F3F8"}}>
        External packages</strong><p style={{margin:"5px 0 0"}}>
        {entry.dependencies.join(", ")}</p></div>:null}
      <div><strong style={{color:"#E4F3F8"}}>Source files</strong>
        <div style={{display:"grid",gap:4,marginTop:5}}>
          {entry.files.map(file=><a key={file} href={gitFile+file}
            target="_blank" rel="noreferrer" style={{color:"#89D2E5",
              overflowWrap:"anywhere"}}>{file} ↗</a>)}
        </div></div>
      {entry.docs?<a href={gitFile+entry.docs} target="_blank"
        rel="noreferrer" style={{color:"#8EE3CD"}}>Implementation documentation ↗</a>:null}
      {entry.review==="not-reviewed"?<p style={{margin:0,color:"#F0CB93"}}>
        Three.js asset has not received human photographic approval.
        Discoverable does not mean photoreal-reviewed.</p>:null}
    </section>:null}
  </article>;
}
export function ComponentCatalog(){
  const [query,setQuery]=useState(initialSearch);
  const [domain,setDomain]=useState<CatalogDomain|"all">("all");
  const [renderer,setRenderer]=useState<CatalogRenderer|"all">("all");
  const [type,setType]=useState<CatalogEntryType|"all">("all");
  const [showAll,setShowAll]=useState(false);
  const domains=useMemo(()=>
    [...new Set(componentCatalog.map(e=>e.domain))].sort(),[]);
  const renderers=useMemo(()=>
    [...new Set(componentCatalog.map(e=>e.renderer))].sort(),[]);
  const matches=useMemo(()=>searchCatalog(componentCatalog,{query,domain,renderer,type}),
    [query,domain,renderer,type]);
  const visible=showAll?matches:matches.slice(0,60);
  const counts=useMemo(()=>({
    packs:componentCatalog.filter(e=>e.type==="pack").length,
    objects:componentCatalog.filter(e=>e.type==="object").length,
    heroes:componentCatalog.filter(e=>e.type==="hero").length,
  }),[]);
  return <main data-km-component-catalog=""
    style={{fontFamily:FONT,minHeight:"100vh",background:"#091620",
      color:"#EAF5FA",padding:"clamp(20px,3vw,42px)"}}>
    <div style={{maxWidth:1450,margin:"0 auto",display:"grid",gap:26}}>
      <header style={{display:"grid",gap:10}}>
        <div style={{letterSpacing:".2em",fontSize:11,fontWeight:800,
          color:"#78D8CD"}}>KUMIKI / COMPONENT LIBRARY</div>
        <h1 style={{fontSize:"clamp(27px,3.7vw,52px)",fontWeight:780,
          margin:0,lineHeight:1.08,letterSpacing:"-.045em",maxWidth:800}}>
          Find the right building block.</h1>
        <p style={{fontSize:15,lineHeight:1.55,margin:0,color:"#ABC4D0",
          maxWidth:780}}>Explore installable source packs, semantic 2D/3D objects,
          and reference-authored 3D heroes. Every result points to real registry
          source—not generated component names or fabricated package installs.</p>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13,
          color:"#AEC5D1",marginTop:6}}>
          <span>{counts.packs} installable packs</span>
          <span>{counts.objects} semantic object variants</span>
          <span>{counts.heroes} dedicated hero assets</span>
        </div>
      </header>
      <section aria-label="Catalog search and filters" style={{...card,padding:18,display:"grid",gap:13}}>
        <label htmlFor="catalog-search" style={{fontSize:12,color:"#C3D5DE"}}>
          Search by purpose, concept or component name</label>
        <input id="catalog-search" type="search" placeholder="Try credit card, ATM, video, chart, loan…"
          autoComplete="off" value={query} onChange={event=>{
            const next=event.target.value;setQuery(next);setShowAll(false);
            if(typeof window!=="undefined"&&window.location.hash.startsWith("#/catalog")){
              const location="#/catalog"+(next?"?q="+encodeURIComponent(next):"");
              window.history.replaceState(null,"",location);
            }
          }} style={{...focus,padding:"13px 16px",width:"100%",fontSize:15}}/>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <label style={{display:"grid",gap:5,fontSize:12,color:"#AFC5D0"}}>Domain
            <select value={domain} aria-label="Filter domain"
              onChange={e=>{setDomain(e.target.value as CatalogDomain|"all");setShowAll(false);}}
              style={focus}><option value="all">All domains</option>
              {domains.map(d=><option key={d} value={d}>{display(d)}</option>)}</select>
          </label>
          <label style={{display:"grid",gap:5,fontSize:12,color:"#AFC5D0"}}>Rendering
            <select value={renderer} aria-label="Filter renderer"
              onChange={e=>{setRenderer(e.target.value as CatalogRenderer|"all");setShowAll(false);}}
              style={focus}><option value="all">All renderers</option>
              {renderers.map(d=><option key={d} value={d}>{display(d)}</option>)}</select>
          </label>
          <label style={{display:"grid",gap:5,fontSize:12,color:"#AFC5D0"}}>Level
            <select value={type} aria-label="Filter catalog entry level"
              onChange={e=>{setType(e.target.value as CatalogEntryType|"all");setShowAll(false);}}
              style={focus}><option value="all">All levels</option>
              <option value="pack">Installable packs</option><option value="object">Domain objects</option>
              <option value="hero">Crafted heroes</option></select>
          </label>
          <button type="button" style={{...focus,alignSelf:"end",cursor:"pointer"}}
            onClick={()=>{
              setQuery("");setDomain("all");setRenderer("all");setType("all");setShowAll(false);
            }}>Clear filters</button>
        </div>
      </section>
      <section aria-live="polite" aria-label="Catalog results">
        <p style={{margin:"0 0 16px",color:"#AFC6D0",fontSize:13}}>
          {matches.length} matching components{matches.length>visible.length
            ?" · showing first "+visible.length:""}</p>
        {matches.length?<div data-km-catalog-results=""
          style={{display:"grid",gap:14,
            gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,340px),1fr))"}}>
          {visible.map(e=><CatalogCard key={e.id} entry={e}/>)}
        </div>:<p role="status" style={{...card,padding:25}}>
          No matching components. Try a broader concept or clear the filters.</p>}
        {!showAll&&matches.length>visible.length?<button type="button"
          onClick={()=>setShowAll(true)} style={{...focus,marginTop:18,cursor:"pointer"}}>
          Show all {matches.length} results</button>:null}
      </section>
      <footer style={{fontSize:12,color:"#91ABBA",borderTop:"1px solid #263E4F",paddingTop:18}}>
        For machine-readable discovery: <code>npm run catalog:find -- --query="bank" --format=json</code>.
        Preview links open Storybook; start it with <code>npm run storybook</code>.
        This catalog is derived from the repository's actual component contracts.
      </footer>
    </div>
  </main>;
}
