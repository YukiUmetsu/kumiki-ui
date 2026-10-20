/** Only curated navigation/meaning lives here. Never duplicate registry items
 * or per-domain object kinds; those come directly from their source contracts.
 * The catalog validator checks every Storybook link and docs path.
 */
export const CATALOG_PREVIEWS:Record<string,{storyId:string;params?:Record<string,string>}>={
  "pack:domain-finance-objects-2d":{storyId:"domains-finance-objects--all-objects"},
  "pack:domain-finance-objects-3d":{storyId:"domains-finance-objects--bank-3-d"},
  "pack:domain-finance-hero-3d":{storyId:"craft-hero-asset-lab--lab"},
  "pack:domain-business-objects-2d":{storyId:"domains-business-objects--all-objects"},
  "pack:domain-technology-objects-2d":{storyId:"domains-technology-objects--all-objects"},
  "pack:domain-metric-2d":{storyId:"domains-finance-business--finance-waterfall-2-d"},
  "pack:domain-metric-3d":{storyId:"domains-finance-business--finance-waterfall-3-d"},
  "pack:crafted-3d-hero":{storyId:"craft-hero-asset-lab--lab"},
};
for(const kind of ["finance","business","technology"] as const){
  // Filled in at catalog-build time from the actual semantic vocabulary.
  // The preview is the appropriate full gallery, never a fictitious single-item story.
  void kind;
}
export function previewsForKinds(
  finance:readonly {kind:string}[],business:readonly {kind:string}[],
  technology:readonly {kind:string}[],heroes:readonly {kind:string;domain:string}[],
):Record<string,{storyId:string;params?:Record<string,string>}>{
  const out={...CATALOG_PREVIEWS};
  for(const o of finance){
    out[`object:finance:${o.kind}:2d`]={
      storyId:"domains-finance-objects--bank-2-d",params:{kmAsset:o.kind},
    };
    out[`object:finance:${o.kind}:3d`]={
      storyId:"domains-finance-objects--bank-3-d",params:{kmAsset:o.kind},
    };
  }
  for(const o of business)
    out[`object:business:${o.kind}:2d`]={storyId:"domains-business-objects--all-objects"};
  for(const o of technology)
    out[`object:technology:${o.kind}:2d`]={storyId:"domains-technology-objects--all-objects"};
  for(const hero of heroes)if(hero.domain==="finance")
    out[`hero:${hero.kind}`]={
      storyId:"craft-hero-asset-lab--lab",params:{kmHero:hero.kind},
    };
  return out;
}
export const CATALOG_DOCS:Record<string,string>={
  "domain-finance-objects-2d":"docs/component-specs/domain-illustration-2d.md",
  "domain-business-objects-2d":"docs/component-specs/domain-illustration-2d.md",
  "domain-technology-objects-2d":"docs/component-specs/domain-illustration-2d.md",
  "domain-finance-objects-3d":"docs/component-specs/finance-objects-social-export.md",
  "domain-finance-hero-3d":"docs/component-specs/finance-hero-3d.md",
  "domain-metric-2d":"docs/component-specs/finance-business-video.md",
  "domain-metric-3d":"docs/component-specs/finance-business-video.md",
  "video-platform-presets":"docs/component-specs/finance-objects-social-export.md",
  "crafted-3d-hero":"docs/component-specs/finance-hero-3d.md",
  "crafted-3d-quality":"docs/verification/hero-quality-gate.md",
};
