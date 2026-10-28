/**
 * ST1: semantic, serializable, clock-free scene recipe contracts.
 *
 * A recipe expresses one communication intent. No synthetic facts, media,
 * source claims, audio playback or external IO are produced by this layer.
 * Rendering and output capture are delegated to consumers and existing stages.
 */
export type ImageAsset = { id: string; src: string; alt: string; licenseRef?: string; source?: string };
export type FocusRegion = { x: number; y: number; width: number; height: number };
export type LabeledAsset = { id: string; label: string; image?: ImageAsset; note?: string };
export type TimedState = { id: string; label: string; date?: string; image?: ImageAsset; description?: string };
export type Connection = { from: string; to: string; label?: string };
export type DataPoint = { id: string; label: string; value: number };
export interface SceneRecipePayloads {
  "question-reveal": { question: string; subject: ImageAsset; answer: string; answerVisual?: ImageAsset };
  "hidden-detail": { subject: ImageAsset; target: FocusRegion; detail: string; context: string };
  "before-after": { subjectId: string; before: LabeledAsset; after: LabeledAsset; changes: string[] };
  "side-by-side": { alternatives: [LabeledAsset, LabeledAsset]; criterion: string; comparison: string };
  "cause-effect": { initial: string; event: string; links: string[]; outcome: string; qualification?: string };
  "scale-reveal": { subject: { label: string; quantity: number }; reference: { label: string; quantity: number }; unit: string; mode: "proportional" | "illustrative" };
  "context-to-detail": { context: ImageAsset; target: FocusRegion; detail: ImageAsset; description: string };
  "layered-cutaway": { object: ImageAsset; layers: LabeledAsset[]; relationship: string; reconstructed?: boolean };
  "build-and-connect": { nodes: LabeledAsset[]; connections: Connection[]; result: string };
  "transform-and-track": { source: LabeledAsset[]; destination: LabeledAsset[]; mapping: Connection[]; changedProperty: string };
  "time-evolution": { milestones: TimedState[]; baseline: string; outcome: string };
  "data-story": { data: DataPoint[]; unit: string; insight: string; source: string; baseline?: number };
  "consequence-chain": { event: string; impacts: string[]; outcome: string; uncertainty?: string };
  "decision-branch": { decision: string; options: { id: string; label: string; condition: string; outcome: string }[] };
  "worked-example": { startingCase: string; operations: { id: string; instruction: string; intermediate: string }[]; result: string; unit?: string };
  "demonstration": { setup: ImageAsset; target: string; actions: string[]; result: string; simulated?: boolean };
  "guided-inspection": { scene: ImageAsset; targets: { id: string; region: FocusRegion; label: string }[]; summary: string };
  "character-discovery": { character: ImageAsset; subject: ImageAsset; attentionTarget: string; reaction: string; reveal: string };
  "evidence-reveal": { claim: string; evidence: ImageAsset; source: string; excerpt: string; qualification?: string; region?: FocusRegion };
  "environment-reveal": {
    environment: ImageAsset; foreground: ImageAsset; focal: ImageAsset; title: string;
    /** Normalized subject placement and an explicit virtual 2D camera path. */
    focalAnchor?: { x: number; y: number };
    camera?: { from: {x:number;y:number;zoom:number}; to: {x:number;y:number;zoom:number} };
    atmosphere?: { tint: string; opacity: number };
  };
  "page-turn-story": { documentTitle: string;
    pages: { id: string; heading: string; image: ImageAsset; text?: string }[];
    direction?: "left" | "right";
    paper?: { color: string; ink: string; shadowOpacity: number };
  };
  "orbit-world": { globe: ImageAsset;
    locations: { id: string; label: string; latitude: number; longitude: number; image?: ImageAsset }[];
    placement: "geographic" | "stylized"; subject?: ImageAsset;
    camera?: { latitude: number; longitude: number; orbitDegrees?: number };
    globeRadiusPercent?: number;
  };
  "timeline-journey": { events: TimedState[]; spacing: "equal" | "elapsed"; narrative: string; nonLinear?: boolean };
  "glass-data-reveal": { background: ImageAsset;
    panels: { id: string; label: string; text: string }[]; data: DataPoint[]; unit: string;
    material?: { tint: string; opacity: number; blurPx: number; borderColor?: string };
  };
}
export type SceneRecipeId = keyof SceneRecipePayloads;
export interface SceneBase {
  schemaVersion: 1;
  recipeVersion: 1;
  id: string;
  fps: { num: number; den: number };
  durationFrames: number;
  width: number;
  height: number;
  /** Optional absolute frame markers for focus, reveal and resolution. */
  cueFrames?: [number, number, number];
  background?: string;
  accent?: string;
  /** Normalized output-safe inset fractions, not arbitrary pixels. */
  safeInsets?: { top:number; right:number; bottom:number; left:number };
  reducedMotion?: boolean;
}
export type SceneTemplateSpec<K extends SceneRecipeId = SceneRecipeId> = {
  [R in K]: SceneBase & { recipeId: R; content: SceneRecipePayloads[R] };
}[K];
export type ScenePhase = "establish" | "focus" | "reveal" | "resolve";
export interface SceneTemplateFrame {
  sceneId: string;
  recipeId: SceneRecipeId;
  frame: number;
  durationFrames: number;
  phase: ScenePhase;
  phaseIndex: 0 | 1 | 2 | 3;
  phaseProgress: number;
  /** How many ordered semantic items should be visible in this frame. */
  revealedItems: number;
  activeItem: number;
  reducedMotion: boolean;
}
const nonempty = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const positive = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0;
const list = (v: unknown, min = 1) => Array.isArray(v) && v.length >= min;
function err(message: string): never { throw new Error("Scene recipe: " + message); }
function checkAsset(asset: ImageAsset | undefined, label: string): void {
  if (!asset || !nonempty(asset.id) || !nonempty(asset.src) || !nonempty(asset.alt)) err(label + " needs id, src, and alt.");
}
function checkRegion(region: FocusRegion | undefined): void {
  if (!region || ![region.x,region.y,region.width,region.height].every(n => typeof n === "number" && Number.isFinite(n)) ||
    region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 ||
    region.x + region.width > 1 || region.y + region.height > 1) err("focus region must fit within normalized image bounds.");
}
function checkIDs(items: Array<{ id: string }>, label: string) {
  if (!items.every(v => v && nonempty(v.id)) || new Set(items.map(x => x.id)).size !== items.length) err(label + " need unique stable IDs.");
}
function checkTimeline(items: TimedState[], nonLinear = false): void {
  checkIDs(items, "timeline events");
  if (!items.every(m => m && nonempty(m.label) && nonempty(m.date) && !Number.isNaN(Date.parse(m.date!)))) err("timeline events need valid dates and labels.");
  if (!nonLinear && items.some((v, i) => i > 0 && Date.parse(v.date!) <= Date.parse(items[i-1].date!))) err("timeline events must be chronological and unique.");
}
function checkData(items: DataPoint[]): void {
  checkIDs(items, "data points");
  if (!items.every(p => nonempty(p.label) && Number.isFinite(p.value))) err("data points need finite numeric values and labels.");
}
export function validateSceneTemplate(spec: SceneTemplateSpec): void {
  if (!spec || spec.schemaVersion !== 1 || spec.recipeVersion !== 1) err("unsupported schema or recipe version.");
  if (!nonempty(spec.id) || !Number.isSafeInteger(spec.durationFrames) || spec.durationFrames < 4 ||
    !Number.isSafeInteger(spec.width) || !Number.isSafeInteger(spec.height) ||
    spec.width < 2 || spec.height < 2 || !spec.fps ||
    !Number.isSafeInteger(spec.fps.num) || !Number.isSafeInteger(spec.fps.den) ||
    !positive(spec.fps.num) || !positive(spec.fps.den) ||
    spec.fps.num / spec.fps.den > 120 || spec.fps.num / spec.fps.den < 1) err("invalid ID, dimensions, FPS, or duration.");
  if (spec.safeInsets) {
    const {top,right,bottom,left}=spec.safeInsets;
    if (![top,right,bottom,left].every(n=>typeof n==="number" && Number.isFinite(n) && n>=0 && n<=.3) ||
        top+bottom>=.6 || left+right>=.6)
      err("safeInsets must be normalized nonnegative fractions with usable reading space.");
  }
  const frames = spec.cueFrames ?? [Math.floor(spec.durationFrames / 4), Math.floor(spec.durationFrames / 2), Math.floor(spec.durationFrames * 3/4)];
  if (!frames.every(f => Number.isSafeInteger(f) && f > 0 && f < spec.durationFrames) ||
    frames[0] >= frames[1] || frames[1] >= frames[2]) err("cueFrames must ascend strictly within the composition.");
  if (!spec.content || typeof spec.content !== "object") err("content is required.");
  switch (spec.recipeId) {
    case "question-reveal": checkAsset(spec.content.subject, "question subject"); if (!nonempty(spec.content.question) || !nonempty(spec.content.answer)) err("question and answer required."); if (spec.content.answerVisual) checkAsset(spec.content.answerVisual,"answer visual"); break;
    case "hidden-detail": checkAsset(spec.content.subject,"subject"); checkRegion(spec.content.target); if (!nonempty(spec.content.detail) || !nonempty(spec.content.context)) err("detail and context required."); break;
    case "before-after": if (!nonempty(spec.content.subjectId) || !nonempty(spec.content.before?.label) || !nonempty(spec.content.after?.label) || !list(spec.content.changes) || !spec.content.changes.every(nonempty)) err("before/after needs subject identity, labeled states and changes."); break;
    case "side-by-side": if (!Array.isArray(spec.content.alternatives) || spec.content.alternatives.length !== 2 || spec.content.alternatives[0]?.id === spec.content.alternatives[1]?.id || !spec.content.alternatives.every(a => a && nonempty(a.id) && nonempty(a.label)) || !nonempty(spec.content.criterion) || !nonempty(spec.content.comparison)) err("two matched alternatives and a shared criterion required."); break;
    case "cause-effect": if (![spec.content.initial,spec.content.event,spec.content.outcome].every(nonempty) || !list(spec.content.links) || !spec.content.links.every(nonempty)) err("causal path and explicit outcome required."); break;
    case "scale-reveal": if (![spec.content.subject?.label,spec.content.reference?.label,spec.content.unit].every(nonempty) || !positive(spec.content.subject?.quantity) || !positive(spec.content.reference?.quantity) || !["proportional","illustrative"].includes(spec.content.mode)) err("scale comparison requires positive quantities, shared units and declared mode."); break;
    case "context-to-detail": checkAsset(spec.content.context,"context"); checkAsset(spec.content.detail,"detail"); checkRegion(spec.content.target); if (!nonempty(spec.content.description)) err("detail description required."); break;
    case "layered-cutaway": checkAsset(spec.content.object,"whole object"); if (!list(spec.content.layers) || !nonempty(spec.content.relationship)) err("cutaway needs interior layers and relationship."); checkIDs(spec.content.layers,"cutaway layers"); spec.content.layers.forEach(l => {if(!nonempty(l.label))err("cutaway labels required.");}); break;
    case "build-and-connect": if (!list(spec.content.nodes,2) || !list(spec.content.connections) || !nonempty(spec.content.result)) err("diagram needs nodes, edges and result."); checkIDs(spec.content.nodes,"diagram nodes"); spec.content.connections.forEach(e=>{if(!spec.content.nodes.some(n=>n.id===e.from)||!spec.content.nodes.some(n=>n.id===e.to)||e.from===e.to)err("connection refers to missing or identical node.");}); break;
    case "transform-and-track": if (!list(spec.content.source) || !list(spec.content.destination) || !list(spec.content.mapping) || !nonempty(spec.content.changedProperty)) err("transformation needs mapped source/destination entities."); checkIDs(spec.content.source,"source entities"); checkIDs(spec.content.destination,"destination entities"); spec.content.mapping.forEach(m=>{if(!spec.content.source.some(s=>s.id===m.from)||!spec.content.destination.some(d=>d.id===m.to))err("transformation mapping refers to missing entity.");}); if(new Set(spec.content.mapping.map(m=>m.from)).size!==spec.content.mapping.length||new Set(spec.content.mapping.map(m=>m.to)).size!==spec.content.mapping.length)err("transformation requires one-to-one entity mapping."); break;
    case "time-evolution": if (!list(spec.content.milestones,2) || !nonempty(spec.content.baseline) || !nonempty(spec.content.outcome)) err("time evolution needs milestones, baseline and outcome."); checkTimeline(spec.content.milestones); break;
    case "data-story": if (!list(spec.content.data,2) || !nonempty(spec.content.unit) || !nonempty(spec.content.source) || !nonempty(spec.content.insight)) err("data story needs values, units, source and insight."); checkData(spec.content.data); if (spec.content.baseline!==undefined&&!Number.isFinite(spec.content.baseline)) err("baseline must be finite."); break;
    case "consequence-chain": if (!nonempty(spec.content.event) || !list(spec.content.impacts) || !spec.content.impacts.every(nonempty) || !nonempty(spec.content.outcome)) err("consequence chain needs starting event, impacts and outcome."); break;
    case "decision-branch": if (!nonempty(spec.content.decision) || !list(spec.content.options,2)) err("decision needs at least two options."); checkIDs(spec.content.options,"decision options"); spec.content.options.forEach(o=>{if(![o.label,o.condition,o.outcome].every(nonempty))err("decision options need conditions and outcomes.");}); break;
    case "worked-example": if (!nonempty(spec.content.startingCase) || !list(spec.content.operations) || !nonempty(spec.content.result)) err("worked example needs input, operations and result."); checkIDs(spec.content.operations,"operations"); spec.content.operations.forEach(o=>{if(!nonempty(o.instruction)||!nonempty(o.intermediate))err("worked steps need intermediate states.");}); break;
    case "demonstration": checkAsset(spec.content.setup,"setup"); if (!nonempty(spec.content.target)||!list(spec.content.actions)||!spec.content.actions.every(nonempty)||!nonempty(spec.content.result)) err("demonstration needs target, actions and observed result."); break;
    case "guided-inspection": checkAsset(spec.content.scene,"inspection scene"); if (!list(spec.content.targets) || !nonempty(spec.content.summary)) err("inspection needs targets and summary."); checkIDs(spec.content.targets,"inspection targets"); spec.content.targets.forEach(t=>{checkRegion(t.region); if(!nonempty(t.label))err("target label required.");}); break;
    case "character-discovery": checkAsset(spec.content.character,"character"); checkAsset(spec.content.subject,"subject"); if (![spec.content.attentionTarget,spec.content.reaction,spec.content.reveal].every(nonempty)) err("character discovery needs reaction, attention and reveal."); break;
    case "evidence-reveal": checkAsset(spec.content.evidence,"evidence"); if (![spec.content.claim,spec.content.source,spec.content.excerpt].every(nonempty)) err("claim, source and contextual excerpt required."); if(spec.content.region)checkRegion(spec.content.region); break;
    case "environment-reveal":
      checkAsset(spec.content.environment,"environment"); checkAsset(spec.content.foreground,"foreground");
      checkAsset(spec.content.focal,"focal subject");
      if(!nonempty(spec.content.title))err("reveal title required.");
      if(spec.content.focalAnchor && (![spec.content.focalAnchor.x,spec.content.focalAnchor.y].every(n=>typeof n==="number"&&n>=0&&n<=1&&Number.isFinite(n))))
        err("focal anchor needs normalized x/y.");
      if(spec.content.camera && ![spec.content.camera.from,spec.content.camera.to].every(p=>
        Number.isFinite(p.x)&&p.x>=0&&p.x<=1 && Number.isFinite(p.y)&&p.y>=0&&p.y<=1 &&
        Number.isFinite(p.zoom)&&p.zoom>=.75&&p.zoom<=2.5))
        err("camera path needs normalized x/y and zoom between .75 and 2.5.");
      if(spec.content.atmosphere && (!nonempty(spec.content.atmosphere.tint) ||
        !Number.isFinite(spec.content.atmosphere.opacity) ||
        spec.content.atmosphere.opacity<0 || spec.content.atmosphere.opacity>1))
        err("atmosphere needs tint and opacity 0..1.");
      break;
    case "page-turn-story": if (!nonempty(spec.content.documentTitle)||!list(spec.content.pages,2))err("book needs title and at least two pages."); checkIDs(spec.content.pages,"pages"); spec.content.pages.forEach(p=>{checkAsset(p.image,"page image");if(!nonempty(p.heading))err("page heading required.");}); if(spec.content.paper && (!nonempty(spec.content.paper.color)||!nonempty(spec.content.paper.ink)||!Number.isFinite(spec.content.paper.shadowOpacity)||spec.content.paper.shadowOpacity<0||spec.content.paper.shadowOpacity>1))err("paper material needs color, ink and shadowOpacity 0..1."); break;
    case "orbit-world": checkAsset(spec.content.globe,"globe"); if (!list(spec.content.locations)||!["geographic","stylized"].includes(spec.content.placement))err("orbit needs placed locations and placement type."); checkIDs(spec.content.locations,"world locations"); spec.content.locations.forEach(l=>{if(!nonempty(l.label)||![l.latitude,l.longitude].every(Number.isFinite)||Math.abs(l.latitude)>90||Math.abs(l.longitude)>180)err("world locations need valid latitude/longitude.");});if(spec.content.subject)checkAsset(spec.content.subject,"orbiter"); if(spec.content.camera && (!Number.isFinite(spec.content.camera.latitude)||Math.abs(spec.content.camera.latitude)>90||!Number.isFinite(spec.content.camera.longitude)||Math.abs(spec.content.camera.longitude)>180||!Number.isFinite(spec.content.camera.orbitDegrees??0)||Math.abs(spec.content.camera.orbitDegrees??0)>360))err("orbit camera needs valid latitude, longitude and degrees."); if(spec.content.globeRadiusPercent!==undefined && (!Number.isFinite(spec.content.globeRadiusPercent)||spec.content.globeRadiusPercent<30||spec.content.globeRadiusPercent>90))err("globe radius percent needs 30..90."); break;
    case "timeline-journey": if(!list(spec.content.events,2)||!nonempty(spec.content.narrative)||!["equal","elapsed"].includes(spec.content.spacing))err("timeline needs events, spacing and narrative.");checkTimeline(spec.content.events,spec.content.nonLinear); break;
    case "glass-data-reveal": checkAsset(spec.content.background,"glass background");if(!list(spec.content.panels)||!list(spec.content.data)||!nonempty(spec.content.unit))err("glass scene needs panels and data.");checkIDs(spec.content.panels,"glass panels");spec.content.panels.forEach(p=>{if(!nonempty(p.label)||!nonempty(p.text))err("glass panel content required.");});checkData(spec.content.data); if(spec.content.material && (!nonempty(spec.content.material.tint)||!Number.isFinite(spec.content.material.opacity)||spec.content.material.opacity<0||spec.content.material.opacity>1||!Number.isFinite(spec.content.material.blurPx)||spec.content.material.blurPx<0||spec.content.material.blurPx>40))err("glass material needs tint, opacity 0..1 and blurPx 0..40."); break;
    default: err("unknown recipe ID.");
  }
}
const sequenceSize=(s:SceneTemplateSpec):number=>{
  switch(s.recipeId){
    case "before-after": return s.content.changes.length;
    case "cause-effect": return s.content.links.length;
    case "layered-cutaway": return s.content.layers.length;
    case "build-and-connect": return s.content.nodes.length+s.content.connections.length;
    case "transform-and-track": return s.content.mapping.length;
    case "time-evolution": return s.content.milestones.length;
    case "data-story": return s.content.data.length;
    case "consequence-chain": return s.content.impacts.length;
    case "decision-branch": return s.content.options.length;
    case "worked-example": return s.content.operations.length;
    case "demonstration": return s.content.actions.length;
    case "guided-inspection": return s.content.targets.length;
    case "page-turn-story": return s.content.pages.length;
    case "orbit-world": return s.content.locations.length;
    case "timeline-journey": return s.content.events.length;
    case "glass-data-reveal": return s.content.panels.length;
    default: return 1;
  }
};
/** Immutable, repeatable random-access evaluation. No JS timers or previous-frame state. */
export function evaluateSceneTemplate(spec: SceneTemplateSpec, frame:number, reducedMotion=spec.reducedMotion??false):SceneTemplateFrame {
  validateSceneTemplate(spec);
  if(!Number.isSafeInteger(frame))err("frame must be a safe integer.");
  const at=Math.max(0,Math.min(spec.durationFrames-1,frame));
  const boundaries=[0,...(spec.cueFrames??[
    Math.floor(spec.durationFrames/4),Math.floor(spec.durationFrames/2),Math.floor(spec.durationFrames*3/4)
  ]),spec.durationFrames];
  const index=(at>=boundaries[3]?3:at>=boundaries[2]?2:at>=boundaries[1]?1:0) as 0|1|2|3;
  const phase=(["establish","focus","reveal","resolve"] as const)[index];
  const progress=(at-boundaries[index])/Math.max(1,boundaries[index+1]-boundaries[index]-1);
  const n=sequenceSize(spec);
  // Half of the ordered items enter during focus, and the rest during
  // reveal. A phase handoff never hides items shown by the preceding phase.
  const focusCount=Math.max(1,Math.ceil(n/2));
  const revealedItems=index===0?0:
    index===1?Math.max(1,Math.ceil(progress*focusCount)):
    index===2?Math.min(n,focusCount+Math.ceil(progress*(n-focusCount))):n;
  return {sceneId:spec.id,recipeId:spec.recipeId,frame:at,durationFrames:spec.durationFrames,
    phase,phaseIndex:index,phaseProgress:reducedMotion?1:progress,
    revealedItems,activeItem:Math.min(n-1,Math.max(0,revealedItems-1)),reducedMotion};
}
/** Source/rights manifest: asset provenance is retained; licensing is NOT inferred. */
export function sceneTemplateAssets(spec:SceneTemplateSpec):ImageAsset[] {
  validateSceneTemplate(spec);
  const found:ImageAsset[]=[];
  const visit=(value:unknown):void=>{
    if(!value||typeof value!=="object")return;
    if(Array.isArray(value)){value.forEach(visit);return;}
    const record=value as Record<string,unknown>;
    if(nonempty(record.id)&&nonempty(record.src)&&nonempty(record.alt)) {
      found.push(value as ImageAsset);return;
    }
    Object.values(record).forEach(visit);
  };
  visit(spec.content);
  const byId=new Map<string,ImageAsset>();
  for(const asset of found){const prior=byId.get(asset.id);if(prior&&prior.src!==asset.src)err("asset ID reused for different source: "+asset.id);byId.set(asset.id,asset);}
  return [...byId.values()];
}

export interface SceneTemplateDiagnostic {
  severity: "error" | "warning";
  code: "invalid-recipe" | "unlicensed-asset" | "missing-evidence";
  message: string;
}
export interface CompiledSceneTemplate {
  schemaVersion: 1;
  sceneId: string;
  recipeId: SceneRecipeId;
  recipeVersion: 1;
  durationFrames: number;
  fps: { num:number;den:number };
  cueSchedule: {id:"focus"|"reveal"|"resolve";frame:number}[];
  assets:ImageAsset[];
  diagnostics:SceneTemplateDiagnostic[];
  fallback: "static-poster-frame" | "reduced-motion-cuts";
}
/** Nondestructive preflight; source/rights checks are warnings, not invented licenses. */
export function inspectSceneTemplate(spec: SceneTemplateSpec): SceneTemplateDiagnostic[] {
  try { validateSceneTemplate(spec); }
  catch(e) { return [{severity:"error",code:"invalid-recipe",
    message:e instanceof Error?e.message:String(e)}]; }
  const diagnostics:SceneTemplateDiagnostic[]=[];
  for(const asset of sceneTemplateAssets(spec)) {
    if(!nonempty(asset.licenseRef)) diagnostics.push({severity:"warning",code:"unlicensed-asset",
      message:'Asset "'+asset.id+'" has no source-rights reference; production export must block it.'});
  }
  if(["evidence-reveal","data-story"].includes(spec.recipeId)) {
    // Presence of citations is required by validation, not independent proof.
    diagnostics.push({severity:"warning",code:"missing-evidence",
      message:"Factual inputs are author-supplied; inspect real source context before release."});
  }
  return diagnostics;
}
export function compileSceneTemplate(spec:SceneTemplateSpec):CompiledSceneTemplate {
  validateSceneTemplate(spec);
  const cueFrames=spec.cueFrames??[
    Math.floor(spec.durationFrames/4),Math.floor(spec.durationFrames/2),
    Math.floor(spec.durationFrames*3/4)];
  return {
    schemaVersion:1,sceneId:spec.id,recipeId:spec.recipeId,recipeVersion:1,
    durationFrames:spec.durationFrames,fps:{...spec.fps},
    cueSchedule:(["focus","reveal","resolve"] as const).map((id,i)=>({id,frame:cueFrames[i]})),
    assets:sceneTemplateAssets(spec),diagnostics:inspectSceneTemplate(spec),
    fallback:spec.reducedMotion?"static-poster-frame":"reduced-motion-cuts",
  };
}
