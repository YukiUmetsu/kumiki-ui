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
  "pack:process-journey":{storyId:"motion-process-journey--signal"},
  "pack:domain-home-3d":{storyId:"house-math-home-kit-3d--explorer"},
  "pack:domain-home-model":{storyId:"house-math-home-kit-3d--explorer"},
  "pack:craft-part-rig":{storyId:"house-math-home-kit-3d--explorer"},
  "pack:inspectable-asset":{storyId:"house-math-inspectable-asset--three-fixtures"},
  "pack:inspectable-asset-three":{storyId:"house-math-inspectable-asset--three-fixtures"},
  "pack:section-reveal":{storyId:"house-math-section-reveal--modes"},
  "pack:section-reveal-three":{storyId:"house-math-section-reveal--modes"},
  "pack:semantic-callouts":{storyId:"house-math-semantic-callouts--follow-parts"},
  "pack:semantic-callouts-three":{storyId:"house-math-semantic-callouts--follow-parts"},
  "pack:flow-path":{storyId:"house-math-flow-path--systems"},
  "pack:flow-path-three":{storyId:"house-math-flow-path--systems"},
  "pack:domain-home-section-2d":{storyId:"house-math-home-kit-2d--section"},
  "pack:domain-home-floor-plan-2d":{storyId:"house-math-interior-plans--plans"},
  "pack:craft-walk-camera":{storyId:"house-math-home-kit-3d--explorer"},
  "pack:infographic-economic-charts":{storyId:"house-math-economic-charts--cost-waterfall"},
  "pack:comparison-stage":{storyId:"house-math-comparison-stage--compare"},
  "pack:dimension-overlay":{storyId:"house-math-dimension-overlay--dimensions"},
  "pack:domain-home-dimensions":{storyId:"house-math-dimension-overlay--dimensions"},
  "pack:animated-metric":{storyId:"house-math-animated-metric--metrics"},
  "pack:asset-state-sequence":{storyId:"house-math-asset-state-sequence--states"},
  "pack:asset-state-sequence-three":{storyId:"house-math-asset-state-sequence--states"},
};
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
  "process-journey":"docs/component-specs/process-journey.md",
  "domain-home-model":"docs/component-specs/home-kit.md",
  "domain-home-3d":"docs/component-specs/home-kit.md",
  "craft-part-rig":"docs/component-specs/home-kit.md",
  "inspectable-asset":"docs/component-specs/inspectable-asset.md",
  "inspectable-asset-three":"docs/component-specs/inspectable-asset.md",
  "section-reveal":"docs/component-specs/section-reveal.md",
  "section-reveal-three":"docs/component-specs/section-reveal.md",
  "semantic-callouts":"docs/component-specs/semantic-callouts.md",
  "semantic-callouts-three":"docs/component-specs/semantic-callouts.md",
  "flow-path":"docs/component-specs/flow-path.md",
  "flow-path-three":"docs/component-specs/flow-path.md",
  "domain-home-section-2d":"docs/component-specs/home-kit.md",
  "domain-home-floor-plan-2d":"docs/component-specs/home-interiors.md",
  "craft-walk-camera":"docs/component-specs/home-interiors.md",
  "infographic-economic-charts":"docs/component-specs/economic-charts.md",
  "comparison-stage":"docs/component-specs/comparison-stage.md",
  "dimension-overlay":"docs/component-specs/dimension-overlay.md",
  "domain-home-dimensions":"docs/component-specs/dimension-overlay.md",
  "measure-units":"docs/component-specs/dimension-overlay.md",
  "animated-metric":"docs/component-specs/animated-metric.md",
  "asset-state-sequence":"docs/component-specs/asset-state-sequence.md",
  "asset-state-sequence-three":"docs/component-specs/asset-state-sequence.md",
};
