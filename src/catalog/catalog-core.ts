/** Canonical discovery shape for browser gallery and local CLI.
 * No network, embeddings, ML, browser APIs, or renderer dependencies.
 * The only authored data is lightweight preview metadata and search synonyms;
 * installable packs and object kinds always come from the existing contracts.
 */
export type CatalogDomain =
  | "ui" | "patterns" | "media" | "motion" | "infographic" | "visual"
  | "craft" | "finance" | "business" | "technology" | "privacy" | "home" | "scene" | "video";
export type CatalogRenderer = "dom" | "svg" | "three" | "data" | "mixed";
export type CatalogEntryType = "pack" | "object" | "hero";
export interface CatalogEntry {
  id: string;
  type: CatalogEntryType;
  name: string;
  title: string;
  description: string;
  domain: CatalogDomain;
  renderer: CatalogRenderer;
  /** Registry ID (not an invented npm package or unpublished registry URL). */
  registryItem: string;
  files: string[];
  /** Transitive install order, derived from registryDependencies. */
  installOrder: string[];
  dependencies: string[];
  keywords: string[];
  storyId?: string;
  storyParams?: Record<string,string>;
  docs?: string;
  /** Status is evidence-based; not a visual quality score. */
  review: "not-applicable" | "not-reviewed" | "approved";
}
export interface RawPack {
  name:string;
  title:string;
  description:string;
  files:{path:string;target:string}[];
  dependencies?:string[];
  registryDependencies?:string[];
}
export interface RawKind {kind:string;title:string;archetype:string}
export interface RawHero {kind:string;title:string;meaning:string;domain:"finance"|"technology"|"privacy"|"scene"}
export interface CatalogSources {
  items:readonly RawPack[];
  vocabularies:{
    finance: readonly RawKind[];
    business: readonly RawKind[];
    technology: readonly RawKind[];
  };
  heroes: readonly RawHero[];
  approvedHeroKinds?:readonly string[];
  /** Authored previews must be validated against real Storybook files in CLI. */
  previews?: Record<string,{storyId:string;params?:Record<string,string>}>;
  docs?:Record<string,string>;
}
const normalize=(v:string)=>v.toLowerCase().normalize("NFKD")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim();
const words=(s:string)=>normalize(s).split(/\s+/u).filter(Boolean);
const uniq=(values:readonly string[])=>[...new Set(values.filter(Boolean))];
const segment=(s:string)=>s.split("-").filter(Boolean);
const EXTRA_SYNONYMS:Record<string,string[]>={
  "atm":["cash withdrawal","cash machine","bank terminal"],
  "bank-account":["deposit","checking","savings","balance"],
  "credit-card":["credit card payment","chip card","contactless","bank card"],
  "stock-workstation":["trading desk","computer","market charts","candlesticks"],
  "money-printing-press":["currency printer","printing machine","press"],
  "piggy-bank":["savings","ceramic pig","coins"],
  "bull-market":["bullish","rising market"],
  "bear-market":["bearish","declining market"],
  "bank-check":["cheque","bank cheque","payment slip"],
  "org-chart":["organization chart","hierarchy","company structure"],
  "video-export-stage":["mp4","ffmpeg","youtube","tiktok","instagram","reels"],
  "hero-viewer":["product render","three js","3d studio"],
  "domain-home-3d":["house","real estate","building","cutaway","roof layers","wall layers","hvac","plumbing","home construction"],
  "domain-home-model":["house layout","floor plan","real estate","building systems","ducts","pipes","flow routes"],
  "inspectable-asset":["semantic parts","anchors","bounds","inspect","part tree","camera targets"],
  "craft-part-rig":["animate parts","pose parts","ghost","hide part","separately animatable","rig"],
  "section-reveal":["cutaway","cross section","clipping plane","x-ray","ghost","isolate","see inside","cut view"],
  "flow-path":["airflow","water flow","particles","arrows along path","energy flow","money flow","conveyor","animated flow"],
  "domain-home-floor-plan-2d":["floor plan","room layout","blueprint","plan view","furniture layout","apartment plan"],
  "craft-walk-camera":["first person","walkthrough","fps camera","explore interior","wasd","virtual tour"],
  "domain-home-section-2d":["house section","cross section drawing","cutaway 2d","building section","svg house"],
  "semantic-callouts":["labels","annotations","leader lines","callout","pointer label","part labels","tooltips 3d"],
  "animated-metric":["count up","counter","number animation","ticker","kpi","stat","odometer","animated number","savings counter","percentage"],
  "asset-state-sequence":["before after","aging","damage","repair","replacement","state change","crossfade","wipe transition","condition states"],
  "comparison-stage":["side by side","compare sizes","true scale","to scale","a vs b","versus","size comparison","tank vs tankless","equal scale"],
  "infographic-economic-charts":["waterfall chart","cost breakdown","quote breakdown","lifetime cost","total cost of ownership","tco","payback","break even","crossover","cumulative cost","savings over time","rebate","replacement cost","30 year cost","scenarios","low base high","uncertainty band","range","forecast range","what if"],
};
function domainOf(name:string,path:string):CatalogDomain{
  const parts=path.split("/");
  if(parts[0]==="registry"){
    const folder=parts[1];
    if(["ui","patterns","media","motion","infographic","visual","craft","video"].includes(folder))
      return folder as CatalogDomain;
  }
  if(name.includes("business"))return "business";
  if(name.includes("technology"))return "technology";
  if(name.includes("privacy"))return "privacy";
  if(name.includes("home"))return "home";
  return "finance";
}
function rendererOf(name:string,paths:readonly string[]):CatalogRenderer{
  if(name.endsWith("-model")||name.includes("quality")||name.includes("review")||name.includes("presets"))
    return "data";
  if(name.includes("-3d")||name.includes("hero"))return "three";
  if(name.includes("-2d")||name.includes("svg")||name.includes("illustration"))return "svg";
  if(paths.some(p=>p.includes("viewport-3d")||p.includes("-3d.")))return "three";
  if(paths.every(p=>p.endsWith(".ts")||p.endsWith(".json")))return "data";
  return "dom";
}
function closure(name:string,items:Map<string,RawPack>):string[]{
  const done=new Set<string>(),active=new Set<string>(),result:string[]=[];
  function visit(current:string){
    if(done.has(current))return;
    if(active.has(current))throw new Error("Catalog registry cycle: "+current);
    const pack=items.get(current);
    if(!pack)throw new Error("Unknown catalog registry item: "+current);
    active.add(current);
    for(const dep of pack.registryDependencies??[])
      if(items.has(dep))visit(dep);
    active.delete(current);done.add(current);result.push(current);
  }
  visit(name);return result;
}
function makeKeywords(kind:string,archetype?:string,more:readonly string[]=[]):string[]{
  return uniq([...segment(kind),kind,...(archetype?[archetype]:[]),...more,
    ...(EXTRA_SYNONYMS[kind]??[])]);
}
export function buildCatalog(sources:CatalogSources):CatalogEntry[]{
  const packs=new Map<string,RawPack>(sources.items.map(p=>[p.name,p]));
  if(packs.size!==sources.items.length)throw new Error("Catalog registry has duplicate pack names.");
  const result:CatalogEntry[]=[];
  const preview=(id:string)=>sources.previews?.[id];
  const mk=(data:Omit<CatalogEntry,"installOrder"|"dependencies">)=>{
    const pack=packs.get(data.registryItem);
    if(!pack)throw new Error("Catalog entry "+data.id+" has missing installable pack "+data.registryItem);
    const order=closure(data.registryItem,packs);
    result.push({...data,installOrder:order,
      dependencies:uniq(order.flatMap(i=>packs.get(i)?.dependencies??[]))});
  };
  for(const pack of sources.items){
    const paths=pack.files.map(f=>f.path);
    const domain=domainOf(pack.name,paths[0]??"");
    const renderer=rendererOf(pack.name,paths);
    const id="pack:"+pack.name,p=preview(id);
    mk({id,type:"pack",name:pack.name,title:pack.title,description:pack.description,
      domain,renderer,registryItem:pack.name,files:paths,
      keywords:makeKeywords(pack.name,undefined,[domain,renderer,pack.title]),
      storyId:p?.storyId,storyParams:p?.params,docs:sources.docs?.[pack.name],
      review:renderer==="three"?"not-reviewed":"not-applicable"});
  }
  const objectPacks={
    finance:{"2d":"domain-finance-objects-2d","3d":"domain-finance-objects-3d"},
    business:{"2d":"domain-business-objects-2d"},
    technology:{"2d":"domain-technology-objects-2d"},
  } as const;
  for(const domain of ["finance","business","technology"] as const){
    const seen=new Set<string>();
    for(const object of sources.vocabularies[domain]){
      if(seen.has(object.kind))throw new Error("Duplicate "+domain+" semantic kind: "+object.kind);
      seen.add(object.kind);
      for(const [medium,pack] of Object.entries(objectPacks[domain])){
        const id="object:"+domain+":"+object.kind+":"+medium,p=preview(id);
        mk({id,type:"object",name:object.kind,title:object.title,
          description:domain+" "+object.archetype+" object, "+medium.toUpperCase()+" visualization.",
          domain,renderer:medium==="3d"?"three":"svg",
          registryItem:pack,files:packs.get(pack)?.files.map(f=>f.path)??[],
          keywords:makeKeywords(object.kind,object.archetype,[domain,medium,object.title]),
          storyId:p?.storyId,storyParams:p?.params,
          docs:sources.docs?.[pack],review:medium==="3d"?"not-reviewed":"not-applicable"});
      }
    }
  }
  const approved=new Set(sources.approvedHeroKinds??[]);
  const heroPacks:Record<string,string>={
    finance:"domain-finance-hero-3d",
    technology:"crafted-3d-hero",
    privacy:"crafted-3d-hero",
    scene:"crafted-3d-hero",
  };
  const heroes=new Set<string>();
  for(const hero of sources.heroes){
    if(heroes.has(hero.kind))throw new Error("Duplicate catalog hero kind: "+hero.kind);
    heroes.add(hero.kind);
    const id="hero:"+hero.kind,p=preview(id);
    const pack=heroPacks[hero.domain];
    // Non-finance entries are authored in standalone domain modules, but the
    // generic hero toolkit alone cannot install their source. Index as a
    // discoverable catalog hero only where a source-backed pack actually exists.
    if(hero.domain!=="finance")continue;
    mk({id,type:"hero",name:hero.kind,title:hero.title,description:hero.meaning,
      domain:hero.domain,renderer:"three",registryItem:pack,
      files:packs.get(pack)?.files.map(f=>f.path)??[],
      keywords:makeKeywords(hero.kind,undefined,[hero.domain,"3d","hero",hero.meaning]),
      storyId:p?.storyId,storyParams:p?.params,docs:sources.docs?.[pack],
      review:approved.has(hero.kind)?"approved":"not-reviewed"});
  }
  if(approved.size&&[...approved].some(kind=>!heroes.has(kind)))
    throw new Error("An approved hero is not present in the catalog.");
  const ids=new Set<string>();
  for(const row of result){
    if(ids.has(row.id))throw new Error("Duplicate catalog ID: "+row.id);
    ids.add(row.id);
    if(row.storyParams&&!row.storyId)throw new Error("Preview parameters without a real story: "+row.id);
  }
  return result.sort((a,b)=>a.id.localeCompare(b.id,"en"));
}
export interface CatalogFilters {
  query?:string;
  domain?:CatalogDomain|"all";
  renderer?:CatalogRenderer|"all";
  type?:CatalogEntryType|"all";
  limit?:number;
}
function score(entry:CatalogEntry,query:string):number{
  const q=normalize(query);if(!q)return 1;
  const terms=words(query);
  const name=normalize(entry.name),title=normalize(entry.title);
  const description=normalize(entry.description);
  const termsAndSynonyms=entry.keywords.map(normalize);
  const haystack=normalize([name,title,description,...termsAndSynonyms,entry.domain,
    entry.registryItem].join(" "));
  if(!terms.every(t=>haystack.includes(t)))return 0;
  let result=1;
  if(name===q||title===q)result+=100;
  else if(name.startsWith(q)||title.startsWith(q))result+=60;
  else if(name.includes(q)||title.includes(q))result+=35;
  if(termsAndSynonyms.some(v=>v===q))result+=30;
  result+=terms.filter(t=>words(name+" "+title).some(word=>word.startsWith(t))).length*6;
  return result;
}
/** Shared deterministic lexical search. No network or hidden ranking calls. */
export function searchCatalog(entries:readonly CatalogEntry[],options:CatalogFilters={}):CatalogEntry[]{
  const filtered=entries.filter(e=>
    (!options.domain||options.domain==="all"||e.domain===options.domain)&&
    (!options.renderer||options.renderer==="all"||e.renderer===options.renderer)&&
    (!options.type||options.type==="all"||e.type===options.type));
  const ranked=filtered.map(e=>({entry:e,score:score(e,options.query??"")}))
    .filter(row=>row.score>0)
    .sort((a,b)=>b.score-a.score||a.entry.id.localeCompare(b.entry.id,"en"));
  return ranked.slice(0,options.limit??ranked.length).map(r=>r.entry);
}
/** Emit the exact Storybook ID known to the catalog, or null—not a guessed URL. */
export function catalogStoryUrl(entry:CatalogEntry,base="/iframe.html"):string|null{
  if(!entry.storyId)return null;
  const query=new URLSearchParams({id:entry.storyId,viewMode:"story",
    ...entry.storyParams});
  return base+"?"+query.toString();
}
