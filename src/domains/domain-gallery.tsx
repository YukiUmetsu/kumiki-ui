/** Storybook-only gallery shared by the finance, business and technology
 * illustration packs: every kind in both themes plus stress cases. */
import type { ReactNode } from "react";
import { ILLUSTRATION_THEMES } from "../../registry/domains/illustration-2d";
import type { IllustrationThemeName } from "../../registry/domains/illustration-2d";

export interface GalleryEntry { kind:string; title:string; archetype:string }
export type GalleryThemes="both"|IllustrationThemeName;
export interface DomainGalleryProps {
  heading:string;
  description:string;
  entries:readonly GalleryEntry[];
  themes?:GalleryThemes;
  renderItem:(kind:string,theme:IllustrationThemeName)=>ReactNode;
  /** Extra cases (long/CJK titles, custom tokens, states, small sizes). */
  stress?:(theme:IllustrationThemeName)=>ReactNode;
  children?:ReactNode;
}
const FONT="Geist, Inter, system-ui, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
export function DomainGallery({heading,description,entries,themes="both",renderItem,stress,children}:DomainGalleryProps){
  const list:IllustrationThemeName[]=themes==="both"?["midnight","paper"]:[themes];
  const families=new Set(entries.map(e=>e.archetype)).size;
  return <main style={{background:"#0B141B",color:"#E6F0F5",padding:"24px 16px",fontFamily:FONT,minHeight:"100vh"}}>
    <header style={{maxWidth:1360,margin:"0 auto 20px"}}>
      <h1 style={{fontSize:24,margin:"0 0 6px"}}>{heading} · {entries.length} kinds</h1>
      <p style={{color:"#A9BFCC",margin:0,fontSize:15}}>{description} · {families} archetypes · original vector art, no external assets</p>
    </header>
    {children}
    {list.map(theme=>{
      const tokens=ILLUSTRATION_THEMES[theme];
      const light=theme==="paper";
      return <section key={theme} data-km-gallery-theme={theme} aria-label={`${heading} — ${theme} theme`}
        style={{maxWidth:1360,margin:"0 auto 28px",background:tokens.canvas,borderRadius:18,padding:20,
          border:`1px solid ${light?"#D5E0E8":"#1E3646"}`}}>
        <h2 style={{fontSize:15,letterSpacing:1.6,textTransform:"uppercase",margin:"0 0 14px",
          color:light?"#3C5568":"#9DB8C7"}}>{theme} theme</h2>
        <div data-km-gallery-grid="" style={{display:"grid",gap:12,
          gridTemplateColumns:"repeat(auto-fill,minmax(176px,1fr))"}}>
          {entries.map(entry=><figure key={entry.kind} data-km-gallery-item={entry.kind} style={{margin:0,
            borderRadius:14,padding:"8px 8px 10px",display:"grid",justifyItems:"center",gap:4,
            background:light?"#FFFFFF":"#0E2231",border:`1px solid ${light?"#E1E9EF":"#183243"}`}}>
            {renderItem(entry.kind,theme)}
            <figcaption style={{fontSize:13,color:light?"#5A7182":"#8EA9B8",fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>
              {entry.kind}</figcaption>
          </figure>)}
        </div>
        {stress?<>
          <h3 style={{fontSize:14,margin:"20px 0 10px",color:light?"#3C5568":"#9DB8C7"}}>
            Stress cases: long and Japanese titles, custom tokens, states, small size</h3>
          <div data-km-gallery-stress="" style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"end"}}>{stress(theme)}</div>
        </>:null}
      </section>;
    })}
  </main>;
}
