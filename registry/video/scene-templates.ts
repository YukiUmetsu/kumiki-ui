/**
 * ST1: semantic, serializable, clock-free scene recipe contracts.
 *
 * A recipe expresses one communication intent. No synthetic facts, media,
 * source claims, audio playback or external IO are produced by this layer.
 * Rendering and output capture are delegated to consumers and existing stages.
 */
import { checkSubjectAnnotations } from "./subject-annotations";
import type { SubjectAnnotation } from "./subject-annotations";
import { TIMELINE_MIN_HOLD, resolveTimelineDate, timelineJourneySchedule, timelineWindows } from "./timeline-journey";
export type { SubjectAnnotation } from "./subject-annotations";
export type ImageAsset = { id: string; src: string; alt: string; licenseRef?: string; source?: string;
  /** Optional intrinsic pixel size. Lets overlays follow an object-fit: cover crop in any aspect. */
  width?: number; height?: number };
export type FocusRegion = { x: number; y: number; width: number; height: number };
export type LabeledAsset = { id: string; label: string; image?: ImageAsset; note?: string };
export type TimedState = { id: string; label: string; date?: string; image?: ImageAsset; description?: string };
export type Connection = { from: string; to: string; label?: string };
export type DataPoint = { id: string; label: string; value: number };
/** One answer beat. `marker` is the glyph beside its text; it should match the mark that proves it. */
export type QuestionAnswerStep = { id: string; text: string; frame?: number;
  marker?: "up" | "down" | "left" | "right" | "dot" | "none" };
/** A caller-licensed outline: every polygon part and hole as rings of [longitude, latitude] degrees.
 * All rings are outlined and masked together (even-odd fill). */
export type GeoBoundary = { rings: [number, number][][]; source: string; licenseRef?: string };
/** One photograph or clip shown inside a place silhouette. With coordinates, a pin marks where it was taken. */
export type PlaceImage = { image: ImageAsset; caption?: string; latitude?: number; longitude?: number };
export type GeoPosition = { latitude: number; longitude: number };
/** Elevation raster: Terrarium RGB (metres = R×256 + G + B/256 − 32768) covering `bounds`. */
export type ElevationModel = { heightmap: ImageAsset; encoding: "terrarium";
  bounds: { west: number; south: number; east: number; north: number };
  /** Pixel layout of the raster. Terrain Tiles are Web Mercator (default). */
  projection?: "web-mercator" | "equirectangular"; source: string };
/** Shared film finish: grain and vignette strength, 0..1. */
export type SceneLook = { grain?: number; vignette?: number };
/** Historical calendar date (proleptic Gregorian): negative years are BCE, there is no year 0. */
export type TimelineDate = { year: number; month?: number; day?: number };
/** How the edit arrives at an event: a lateral camera move along time, a match cut on the focus, a dissolve or a cut. */
export type TimelineTransition = "truck" | "match-cut" | "dissolve" | "cut";
/** Archival grade for one plate; intensity 0..1. */
export type TimelineGrade = { mode?: "mono" | "sepia" | "color"; intensity?: number };
/** A dated moment. `label` is the title and `description` the caption (legacy fields, still honoured). */
export type TimelineJourneyEvent = TimedState & {
  /** Structured date; wins over the ISO `date` string. Use it for BCE or very old dates. */
  when?: TimelineDate;
  /** Verbatim date line, e.g. "c. 2560 BCE". The large year readout still rolls from `when`/`date`. */
  dateLabel?: string;
  /** Caption; falls back to `description`. */
  caption?: string;
  /** Source and credit lines, set on the plate. */
  source?: string; credit?: string;
  /** Normalized point (or region) of the image the camera moves toward. */
  focus?: { x: number; y: number; width?: number; height?: number };
  /** Ken Burns direction. "in" (default) pushes toward the focus, "out" starts tight and reveals context. */
  kenBurns?: "in" | "out" | "none";
  grade?: TimelineGrade;
  /** Frames this event owns, transition included. Omitted events share the remaining time. */
  frames?: number;
  /** How the edit arrives at this event, and over how many frames. */
  transition?: TimelineTransition; transitionFrames?: number;
  /** Copy cues in frames relative to arrival (negative anticipates). */
  cues?: { title?: number; caption?: number; source?: number };
  /** Line above the date; defaults to the event counter. */
  eyebrow?: string;
  /** SA1 marks on this event's image. Bind them with `{ step: "<event id>" }`. */
  annotations?: SubjectAnnotation[];
};
export interface SceneRecipePayloads {
  "question-reveal": { question: string; subject: ImageAsset; answer: string; answerVisual?: ImageAsset;
    /** Substring of the question that carries the stakes; set in the accent colour. */
    questionEmphasis?: string;
    /** Answer delivered as ordered beats; `answer` stays the canonical accessible text.
     * A step without `frame` lands on the reveal cue. */
    answerSteps?: QuestionAnswerStep[];
    /** Arrows, routes, rings, labels and spotlights on the subject, timed to beats or steps.
     * Subject-space points need the subject's intrinsic width/height to track a crop. */
    annotations?: SubjectAnnotation[];
    /** Reveal punctuation. "flash" adds an exposure bloom; "kick" adds a decaying camera kick. */
    revealImpact?: "none" | "flash" | "kick";
    /** Eyebrow beside the docked question. Default "Question"; "" hides it. */
    questionLabel?: string;
    /** Film treatment. Letterbox applies to landscape only. */
    look?: { letterbox?: boolean; grain?: number; vignette?: number };
  };
  "place-shaped-image-reveal": {
    /** Place name, set as the display title. */
    name: string;
    /** Short kicker above the name, e.g. a region. */
    eyebrow?: string;
    /** One line of context held beside the silhouette. */
    context?: string;
    boundary: GeoBoundary;
    /** 1–6 photographs or clips, shown in order inside the silhouette. */
    imagery: PlaceImage[];
    /** Required, localizable disclosure that the imagery is framed by the outline, not an aerial view. */
    compositeNote: string;
    /** Optional source credit line, shown verbatim beside the disclosure. */
    credit?: string;
    /** Orthographic projection centre; defaults to the boundary's spherical centroid. */
    projection?: { latitude: number; longitude: number };
    /** Context coastlines during the locate move. Default "coastlines". */
    mapContext?: "coastlines" | "none";
    /** Opening scale relative to the final framing, 0.1..1. Default 0.3. */
    locateZoom?: number;
    look?: SceneLook;
  };
  "relief-map-expedition": {
    title: string;
    eyebrow?: string;
    terrain: ElevationModel;
    /** Height multiplier, 1..5. Anything but 1 must be declared on screen via `exaggerationNote`. */
    verticalExaggeration: number;
    exaggerationNote?: string;
    /** Geographic route, in travel order, inside the terrain bounds. `smoothing` (km, 0..2, default
     * 0.6) averages the drawn line along its length to calm raster staircases; endpoints stay exact. */
    route: { points: GeoPosition[]; label?: string; smoothing?: number };
    /** Held at the end: `label` pins the place on the terrain, `detail` is the large readout
     * (e.g. an elevation) and `detailLabel` names that readout. */
    destination: GeoPosition & { label: string; detail?: string; detailLabel?: string };
    /** Honest provenance of the route line, e.g. "computed path, not a surveyed trail". */
    routeNote?: string;
    credit?: string;
    /** Sun azimuth (degrees clockwise from north) and altitude (3..80°). Default 250° / 24°. */
    light?: { azimuth: number; altitude: number };
    /** Hypsometric colour stops in metres; default is elevation-relative. */
    palette?: { elevation: number; color: string }[];
    /** Colour for elevations at or below 0 m. */
    water?: string;
    /** Oblique expedition view: yaw (0 = from the south), pitch 10..70°, distance scale 0.5..3. */
    camera?: { yaw?: number; pitch?: number; distanceScale?: number };
    look?: SceneLook;
  };
  "nature-world-identity-reveal": {
    /** Optional intimate opening plate (forest or cave interior). Foreground forms wipe from it to `environment`. */
    approach?: ImageAsset;
    /** The clearing. Needs intrinsic width/height so the mark stays planted through the cover crop. */
    environment: ImageAsset;
    /** Caller-supplied identity artwork with transparency (SVG or PNG); always an editable input, never bundled. */
    mark: ImageAsset;
    /** Optional wordmark and line set under the mark on the final beat. */
    name?: string;
    tagline?: string;
    /** Ground contact point in the environment plate (normalized) and mark height as a fraction of plate height. */
    placement: { x: number; y: number; height: number };
    /** "grounded" stands the mark in the clearing as an object; "graphic" keeps it a quiet floating sign. */
    treatment?: "grounded" | "graphic";
    /** Grounded finish: "solid" fills the artwork's silhouette with `color`; "artwork" keeps its own colours. */
    material?: { kind: "solid" | "artwork"; color?: string; thickness?: number };
    /** Foreground forms the camera moves past. Default "foliage". */
    foreground?: "foliage" | "rock" | "none";
    /** Key light position in the environment plate (normalized); drives rays, rim and shadow direction. */
    light?: { x: number; y: number; color?: string; rays?: boolean };
    /** Atmospheric depth between camera and mark, 0..1. */
    haze?: number;
    look?: SceneLook;
  };
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
  "demonstration": { setup: ImageAsset; target: string; actions: string[]; result: string; simulated?: boolean;
    /** Optional authored image state after each action; matches actions.length. */
    states?: ImageAsset[];
    /** Optional normalized cursor/focus target for every action. */
    actionTargets?: FocusRegion[];
  };
  "guided-inspection": { scene: ImageAsset; targets: { id: string; region: FocusRegion; label: string }[]; summary: string };
  "character-discovery": { character: ImageAsset; subject: ImageAsset; attentionTarget: string; reaction: string; reveal: string };
  "evidence-reveal": { claim: string; evidence: ImageAsset; source: string; excerpt: string; qualification?: string; region?: FocusRegion };
  "environment-reveal": {
    environment: ImageAsset; foreground: ImageAsset; focal: ImageAsset; title: string;
    /** Normalized subject placement and an explicit virtual 2D camera path. */
    focalAnchor?: { x: number; y: number };
    camera?: { from: {x:number;y:number;zoom:number}; to: {x:number;y:number;zoom:number} };
    atmosphere?: { tint: string; opacity: number };
    /** Screen-space depth ratio for the transparent foreground plane. */
    parallax?: { foregroundStrength?: number; haze?: number; lightRays?: boolean };
  };
  "page-turn-story": { documentTitle: string;
    pages: { id: string; heading: string; image: ImageAsset; text?: string }[];
    direction?: "left" | "right";
    paper?: { color: string; ink: string; shadowOpacity: number };
  };
  "orbit-world": { globe?: ImageAsset;
    locations: { id: string; label: string; latitude: number; longitude: number; image?: ImageAsset }[];
    placement: "geographic" | "stylized"; subject?: ImageAsset;
    camera?: { latitude: number; longitude: number; orbitDegrees?: number };
    globeRadiusPercent?: number;
  };
  "timeline-journey": { events: TimelineJourneyEvent[]; spacing: "equal" | "elapsed";
    /** Programme title, set on the time anchor. */
    narrative: string; nonLinear?: boolean;
    /** Programme eyebrow on the anchor, e.g. "A short history of flight". */
    eyebrow?: string;
    /** BCP 47 locale for every date, range and number. Default "en". */
    locale?: string;
    /** Date line precision; never finer than the data. Default "auto". */
    dateFormat?: "auto" | "year" | "month" | "day";
    /** Default transition and length for every boundary. */
    transition?: TimelineTransition; transitionFrames?: number;
    /** Event counter template with {index} and {count}; "" hides it. Default "{index} / {count}". */
    counter?: string;
    /** Final hold: the change across the period. `span` overrides the computed "N years" readout; false hides it. */
    summary?: { eyebrow?: string; statement: string; detail?: string; span?: string | false };
    /** Rail: proportional graduations (elapsed only) and which year labels show during events. */
    rail?: { graduations?: boolean; labels?: "bounds" | "none" };
    /** CSS colours. Each is also overridable from outside through --km-tj-bg, --km-tj-ink, --km-tj-muted, --km-tj-rail. */
    palette?: { background?: string; ink?: string; muted?: string; rail?: string };
    /** CSS font-family stacks for titles, body copy and the numeric readout. */
    typography?: { display?: string; text?: string; numerals?: string };
    /** Default archival grade for every plate. */
    grade?: TimelineGrade;
    /** "blur" fills the frame with a defocused, darkened copy of the current plate. Default "blur". */
    backdrop?: "blur" | "none";
    look?: SceneLook;
  };
  "glass-data-reveal": { background: ImageAsset;
    panels: { id: string; label: string; text: string }[]; data: DataPoint[]; unit: string;
    material?: { tint: string; opacity: number; blurPx: number; borderColor?: string;
      /** Subtle rim shimmer intensity 0..1, used for Fresnel-style edge shading. */
      rimIntensity?: number;
      /** Caustic / light-sweep intensity 0..1 (the panel does not claim physical raytracing). */
      causticIntensity?: number;
    };
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
  /** Authored beat boundary frames, used by frame-exact visual choreography. */
  cueFrames?: readonly [number,number,number];
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
  if ((asset.width !== undefined || asset.height !== undefined) && !(positive(asset.width) && positive(asset.height))) err(label + " intrinsic size needs positive width and height.");
}
function checkAnswerSteps(steps: QuestionAnswerStep[], durationFrames: number): void {
  checkIDs(steps, "answer steps");
  steps.forEach((step, i) => {
    if (!nonempty(step.text)) err("answer steps need text.");
    if (step.frame !== undefined && (!Number.isSafeInteger(step.frame) || step.frame < 0 || step.frame >= durationFrames)) err("answer step frames must fall within the composition.");
    const prior = steps[i-1]?.frame;
    if (step.frame !== undefined && prior !== undefined && step.frame < prior) err("answer steps must be in frame order.");
    if (step.marker !== undefined && !["up","down","left","right","dot","none"].includes(step.marker)) err("unknown answer step marker.");
  });
}
function checkRegion(region: FocusRegion | undefined): void {
  if (!region || ![region.x,region.y,region.width,region.height].every(n => typeof n === "number" && Number.isFinite(n)) ||
    region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 ||
    region.x + region.width > 1 || region.y + region.height > 1) err("focus region must fit within normalized image bounds.");
}
const lookOk=(look?:SceneLook)=>!look||[look.grain,look.vignette].every(n=>n===undefined||(Number.isFinite(n)&&n>=0&&n<=1));
const geoOk=(lat:unknown,lon:unknown)=>typeof lat==="number"&&typeof lon==="number"&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
function checkBoundary(boundary:GeoBoundary|undefined):void {
  if(!boundary||!nonempty(boundary.source)||!list(boundary.rings)) err("boundary needs rings and a source.");
  let count=0;
  for(const ring of boundary.rings){
    if(!Array.isArray(ring)||ring.length<4) err("boundary rings need at least four points.");
    for(const p of ring){ if(!Array.isArray(p)||!geoOk(p[1],p[0])) err("boundary points must be [longitude, latitude] degrees."); count++; }
  }
  if(count>20000) err("boundary is too detailed; simplify it to 20000 points or fewer.");
}
/** Angular radius (degrees) of a boundary around a centre; the orthographic silhouette stays faithful inside 60°. */
function boundarySpread(rings:[number,number][][],center?:{latitude:number;longitude:number}):number {
  const r=Math.PI/180,v=(lon:number,lat:number)=>[Math.cos(lat*r)*Math.cos(lon*r),Math.cos(lat*r)*Math.sin(lon*r),Math.sin(lat*r)];
  const points=rings.flat().map(([lon,lat])=>v(lon,lat));
  const sum=center?v(center.longitude,center.latitude):points.reduce((a,p)=>a.map((n,i)=>n+p[i]),[0,0,0]);
  const n=Math.hypot(...sum)||1;
  return Math.max(...points.map(p=>Math.acos(Math.max(-1,Math.min(1,(p[0]*sum[0]+p[1]*sum[1]+p[2]*sum[2])/n)))/r));
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
const unit01=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=1;
function checkTimelineJourney(spec: SceneTemplateSpec<"timeline-journey">): void {
  const c=spec.content;
  if(!list(c.events,2)||c.events.length>12||!nonempty(c.narrative)||!["equal","elapsed"].includes(c.spacing)) err("timeline needs 2–12 events, spacing and narrative.");
  checkIDs(c.events,"timeline events");
  const dates=c.events.map(e=>{
    if(!nonempty(e.label)) err("timeline events need a title (label).");
    const d=resolveTimelineDate(e); if(!d) err(`timeline event ${e.id} needs a valid date or when (historical year ≠ 0, real month and day).`);
    if(e.image) checkAsset(e.image,"timeline image "+e.id);
    const f=e.focus; if(f&&(!unit01(f.x)||!unit01(f.y)||(f.width!==undefined||f.height!==undefined)&&!(f.width!>0&&f.height!>0&&f.x+f.width!<=1&&f.y+f.height!<=1))) err(`timeline event ${e.id} focus must be a normalized point or region inside the image.`);
    if(e.kenBurns!==undefined&&!["in","out","none"].includes(e.kenBurns)) err("unknown kenBurns direction.");
    if(e.transition!==undefined&&!["truck","match-cut","dissolve","cut"].includes(e.transition)) err("unknown timeline transition.");
    if(e.transitionFrames!==undefined&&!(Number.isSafeInteger(e.transitionFrames)&&e.transitionFrames>=0&&e.transitionFrames<=96)) err("transitionFrames must be 0..96.");
    if(e.frames!==undefined&&!(Number.isSafeInteger(e.frames)&&e.frames>=TIMELINE_MIN_HOLD)) err(`timeline event frames must be integers of at least ${TIMELINE_MIN_HOLD}.`);
    if(e.grade&&((e.grade.mode!==undefined&&!["mono","sepia","color"].includes(e.grade.mode))||(e.grade.intensity!==undefined&&!unit01(e.grade.intensity)))) err("grade needs mode mono|sepia|color and intensity 0..1.");
    if(e.cues&&![e.cues.title,e.cues.caption,e.cues.source].every(n=>n===undefined||Number.isSafeInteger(n))) err("event cues must be whole frames.");
    return d;
  });
  if(!c.nonLinear&&dates.some((d,i)=>i>0&&d.t<=dates[i-1].t)) err("timeline events must be chronological and unique.");
  if(c.transition!==undefined&&!["truck","match-cut","dissolve","cut"].includes(c.transition)) err("unknown timeline transition.");
  if(c.transitionFrames!==undefined&&!(Number.isSafeInteger(c.transitionFrames)&&c.transitionFrames>=0&&c.transitionFrames<=96)) err("transitionFrames must be 0..96.");
  if(c.dateFormat!==undefined&&!["auto","year","month","day"].includes(c.dateFormat)) err("unknown dateFormat.");
  try { new Intl.DateTimeFormat(c.locale??"en"); } catch { err("locale must be a valid BCP 47 tag."); }
  if(c.summary&&(!nonempty(c.summary.statement)||(typeof c.summary.span==="string"&&!nonempty(c.summary.span)))) err("summary needs a statement.");
  if(c.grade&&((c.grade.mode!==undefined&&!["mono","sepia","color"].includes(c.grade.mode))||(c.grade.intensity!==undefined&&!unit01(c.grade.intensity)))) err("grade needs mode mono|sepia|color and intensity 0..1.");
  if(c.backdrop!==undefined&&!["blur","none"].includes(c.backdrop)) err("unknown backdrop.");
  if(c.rail?.labels!==undefined&&!["bounds","none"].includes(c.rail.labels)) err("unknown rail labels mode.");
  if(!lookOk(c.look)) err("look grain and vignette must be 0..1.");
  const {anchorEnd,summaryStart}=timelineWindows(spec);
  const explicit=c.events.reduce((s,e)=>s+(e.frames??0),0),implicit=c.events.filter(e=>e.frames===undefined).length;
  const room=summaryStart-anchorEnd-explicit;
  if(anchorEnd<12||summaryStart>spec.durationFrames-24||room<(implicit?implicit*TIMELINE_MIN_HOLD:0)||(!implicit&&room<0))
    err(`timeline events do not fit between the anchor (frame ${anchorEnd}) and the summary (frame ${summaryStart}); each needs at least ${TIMELINE_MIN_HOLD} frames.`);
  const schedule=timelineJourneySchedule(spec);
  const beats={dock:anchorEnd,reveal:schedule.events[0].arrive,resolve:summaryStart,durationFrames:spec.durationFrames,
    steps:Object.fromEntries(schedule.events.map(b=>[c.events[b.index].id,b.arrive]))};
  for(const e of c.events) if(e.annotations){ const problem=checkSubjectAnnotations(e.annotations,beats); if(problem) err(problem); }
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
    case "question-reveal": checkAsset(spec.content.subject, "question subject"); if (!nonempty(spec.content.question) || !nonempty(spec.content.answer)) err("question and answer required."); if (spec.content.answerVisual) checkAsset(spec.content.answerVisual,"answer visual"); if (spec.content.questionEmphasis !== undefined && (!nonempty(spec.content.questionEmphasis) || !spec.content.question.includes(spec.content.questionEmphasis))) err("questionEmphasis must be part of the question."); if (spec.content.answerSteps) { if (!list(spec.content.answerSteps)) err("answerSteps needs at least one step."); checkAnswerSteps(spec.content.answerSteps, spec.durationFrames); } if (spec.content.revealImpact !== undefined && !["none","flash","kick"].includes(spec.content.revealImpact)) err("unknown revealImpact."); { const look = spec.content.look; if (look && ([look.grain, look.vignette].some(n => n !== undefined && !(n >= 0 && n <= 1)))) err("look grain and vignette must be 0..1."); } if (spec.content.annotations) { const problem = checkSubjectAnnotations(spec.content.annotations, { dock: frames[0], reveal: frames[1], resolve: frames[2], durationFrames: spec.durationFrames, steps: Object.fromEntries((spec.content.answerSteps ?? []).map(step => [step.id, step.frame ?? frames[1]])) }); if (problem) err(problem); } break;
    case "place-shaped-image-reveal": {
      const c=spec.content;
      if(!nonempty(c.name)||!nonempty(c.compositeNote)) err("place name and composite disclosure required.");
      checkBoundary(c.boundary);
      if(!list(c.imagery)||c.imagery.length>6) err("place imagery needs one to six items.");
      c.imagery.forEach((item,i)=>{ checkAsset(item?.image,"place image "+i);
        if((item.latitude!==undefined||item.longitude!==undefined)&&!geoOk(item.latitude,item.longitude)) err("place image coordinates need both latitude and longitude."); });
      checkIDs(c.imagery.map(item=>item.image),"place images");
      if(c.projection&&!geoOk(c.projection.latitude,c.projection.longitude)) err("projection centre needs valid latitude and longitude.");
      if(boundarySpread(c.boundary.rings,c.projection)>60) err("boundary spreads more than 60° from its projection centre; its silhouette would distort.");
      if(c.mapContext!==undefined&&!["coastlines","none"].includes(c.mapContext)) err("unknown mapContext.");
      if(c.locateZoom!==undefined&&!(Number.isFinite(c.locateZoom)&&c.locateZoom>=.1&&c.locateZoom<=1)) err("locateZoom must be 0.1..1.");
      if(!lookOk(c.look)) err("look grain and vignette must be 0..1.");
      break;
    }
    case "relief-map-expedition": {
      const c=spec.content,b=c.terrain?.bounds;
      if(!nonempty(c.title)) err("relief title required.");
      if(!c.terrain||c.terrain.encoding!=="terrarium"||!nonempty(c.terrain.source)) err("terrain needs a terrarium heightmap and a source.");
      checkAsset(c.terrain.heightmap,"terrain heightmap");
      if(!b||!geoOk(b.south,b.west)||!geoOk(b.north,b.east)||b.west>=b.east||b.south>=b.north) err("terrain bounds need west < east and south < north.");
      if(c.terrain.projection!==undefined&&!["web-mercator","equirectangular"].includes(c.terrain.projection)) err("unknown terrain projection.");
      if(!(Number.isFinite(c.verticalExaggeration)&&c.verticalExaggeration>=1&&c.verticalExaggeration<=5)) err("verticalExaggeration must be 1..5.");
      if(c.verticalExaggeration!==1&&!nonempty(c.exaggerationNote)) err("vertical exaggeration must be declared with an exaggerationNote.");
      const inside=(p:GeoPosition|undefined)=>!!p&&geoOk(p.latitude,p.longitude)&&p.longitude>=b.west&&p.longitude<=b.east&&p.latitude>=b.south&&p.latitude<=b.north;
      if(!list(c.route?.points,2)||!c.route.points.every(inside)) err("route needs two or more points inside the terrain bounds.");
      if(!c.destination||!nonempty(c.destination.label)||!inside(c.destination)) err("destination needs a label and a position inside the terrain bounds.");
      if(c.route.smoothing!==undefined&&!(c.route.smoothing>=0&&c.route.smoothing<=2)) err("route smoothing must be 0..2 km.");
      if(c.light&&!(Number.isFinite(c.light.azimuth)&&Number.isFinite(c.light.altitude)&&c.light.altitude>=3&&c.light.altitude<=80)) err("light needs an azimuth and an altitude of 3..80°.");
      if(c.palette&&(!list(c.palette,2)||!c.palette.every(s=>Number.isFinite(s.elevation)&&/^#[0-9a-f]{6}$/i.test(s.color)))) err("palette needs two or more stops with #rrggbb colours.");
      if(c.water!==undefined&&!/^#[0-9a-f]{6}$/i.test(c.water)) err("water must be a #rrggbb colour.");
      const cam=c.camera;
      if(cam&&((cam.yaw!==undefined&&!(Math.abs(cam.yaw)<=180))||(cam.pitch!==undefined&&!(cam.pitch>=10&&cam.pitch<=70))||(cam.distanceScale!==undefined&&!(cam.distanceScale>=.5&&cam.distanceScale<=3)))) err("camera needs yaw ±180, pitch 10..70 and distanceScale 0.5..3.");
      if(!lookOk(c.look)) err("look grain and vignette must be 0..1.");
      break;
    }
    case "nature-world-identity-reveal": {
      const c=spec.content;
      checkAsset(c.environment,"environment"); checkAsset(c.mark,"identity mark");
      if(c.approach) checkAsset(c.approach,"approach plate");
      if(!c.environment.width||!c.mark.width) err("environment and mark need intrinsic width and height.");
      const pl=c.placement;
      if(!pl||![pl.x,pl.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)||!(pl.height>.05&&pl.height<=.8)) err("placement needs normalized x/y and a height of 0.05..0.8.");
      if(c.treatment!==undefined&&!["grounded","graphic"].includes(c.treatment)) err("unknown treatment.");
      if(c.material&&(!["solid","artwork"].includes(c.material.kind)||(c.material.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(c.material.color))||(c.material.thickness!==undefined&&!(c.material.thickness>=0&&c.material.thickness<=.2)))) err("material needs kind solid|artwork, a #rrggbb colour and thickness 0..0.2.");
      if(c.foreground!==undefined&&!["foliage","rock","none"].includes(c.foreground)) err("unknown foreground forms.");
      if(c.light&&(![c.light.x,c.light.y].every(n=>Number.isFinite(n)&&n>=-.5&&n<=1.5)||(c.light.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(c.light.color)))) err("light needs x/y near the plate and a #rrggbb colour.");
      if(c.haze!==undefined&&!(c.haze>=0&&c.haze<=1)) err("haze must be 0..1.");
      if(c.name!==undefined&&!nonempty(c.name)) err("name must not be empty when given.");
      if(!lookOk(c.look)) err("look grain and vignette must be 0..1.");
      break;
    }
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
    case "demonstration": checkAsset(spec.content.setup,"setup"); if (!nonempty(spec.content.target)||!list(spec.content.actions)||!spec.content.actions.every(nonempty)||!nonempty(spec.content.result)) err("demonstration needs target, actions and observed result."); if(spec.content.states){if(spec.content.states.length!==spec.content.actions.length)err("demonstration states must match action count.");spec.content.states.forEach((image,i)=>checkAsset(image,"demonstration state "+i));}if(spec.content.actionTargets){if(spec.content.actionTargets.length!==spec.content.actions.length)err("demonstration targets must match action count.");spec.content.actionTargets.forEach(checkRegion);} break;
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
      if(spec.content.parallax &&
        ((spec.content.parallax.foregroundStrength!==undefined&&
           (!Number.isFinite(spec.content.parallax.foregroundStrength)||
            spec.content.parallax.foregroundStrength<1||spec.content.parallax.foregroundStrength>2.5))||
         (spec.content.parallax.haze!==undefined&&
           (!Number.isFinite(spec.content.parallax.haze)||spec.content.parallax.haze<0||
            spec.content.parallax.haze>1))||
         (spec.content.parallax.lightRays!==undefined&&typeof spec.content.parallax.lightRays!=="boolean")))
        err("environment parallax needs foregroundStrength 1..2.5, haze 0..1 and a boolean lightRays.");
      if(spec.content.atmosphere && (!nonempty(spec.content.atmosphere.tint) ||
        !Number.isFinite(spec.content.atmosphere.opacity) ||
        spec.content.atmosphere.opacity<0 || spec.content.atmosphere.opacity>1))
        err("atmosphere needs tint and opacity 0..1.");
      break;
    case "page-turn-story": if (!nonempty(spec.content.documentTitle)||!list(spec.content.pages,2))err("book needs title and at least two pages."); checkIDs(spec.content.pages,"pages"); spec.content.pages.forEach(p=>{checkAsset(p.image,"page image");if(!nonempty(p.heading))err("page heading required.");}); if(spec.content.paper && (!nonempty(spec.content.paper.color)||!nonempty(spec.content.paper.ink)||!Number.isFinite(spec.content.paper.shadowOpacity)||spec.content.paper.shadowOpacity<0||spec.content.paper.shadowOpacity>1))err("paper material needs color, ink and shadowOpacity 0..1."); break;
    case "orbit-world": if(spec.content.placement==="stylized"||spec.content.globe)checkAsset(spec.content.globe,"globe"); if (!list(spec.content.locations)||!["geographic","stylized"].includes(spec.content.placement))err("orbit needs placed locations and placement type."); checkIDs(spec.content.locations,"world locations"); spec.content.locations.forEach(l=>{if(!nonempty(l.label)||![l.latitude,l.longitude].every(Number.isFinite)||Math.abs(l.latitude)>90||Math.abs(l.longitude)>180)err("world locations need valid latitude/longitude.");});if(spec.content.subject)checkAsset(spec.content.subject,"orbiter"); if(spec.content.camera && (!Number.isFinite(spec.content.camera.latitude)||Math.abs(spec.content.camera.latitude)>90||!Number.isFinite(spec.content.camera.longitude)||Math.abs(spec.content.camera.longitude)>180||!Number.isFinite(spec.content.camera.orbitDegrees??0)||Math.abs(spec.content.camera.orbitDegrees??0)>360))err("orbit camera needs valid latitude, longitude and degrees."); if(spec.content.globeRadiusPercent!==undefined && (!Number.isFinite(spec.content.globeRadiusPercent)||spec.content.globeRadiusPercent<30||spec.content.globeRadiusPercent>90))err("globe radius percent needs 30..90."); break;
    case "timeline-journey": checkTimelineJourney(spec); break;
    case "glass-data-reveal": checkAsset(spec.content.background,"glass background");if(!list(spec.content.panels)||!list(spec.content.data)||!nonempty(spec.content.unit))err("glass scene needs panels and data.");checkIDs(spec.content.panels,"glass panels");spec.content.panels.forEach(p=>{if(!nonempty(p.label)||!nonempty(p.text))err("glass panel content required.");});checkData(spec.content.data); if(spec.content.material && (!nonempty(spec.content.material.tint)||!Number.isFinite(spec.content.material.opacity)||spec.content.material.opacity<0||spec.content.material.opacity>1||!Number.isFinite(spec.content.material.blurPx)||spec.content.material.blurPx<0||spec.content.material.blurPx>40|| (spec.content.material.rimIntensity!==undefined&&(!Number.isFinite(spec.content.material.rimIntensity)||spec.content.material.rimIntensity<0||spec.content.material.rimIntensity>1))|| (spec.content.material.causticIntensity!==undefined&&(!Number.isFinite(spec.content.material.causticIntensity)||spec.content.material.causticIntensity<0||spec.content.material.causticIntensity>1))))err("glass material needs tint, opacity 0..1 and blurPx 0..40."); break;
    default: err("unknown recipe ID.");
  }
}
const sequenceSize=(s:SceneTemplateSpec):number=>{
  switch(s.recipeId){
    case "place-shaped-image-reveal": return s.content.imagery.length;
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
    cueFrames:[boundaries[1],boundaries[2],boundaries[3]],
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
