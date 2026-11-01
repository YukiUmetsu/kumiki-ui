/** Compact authoring/inspection UI. Never placed in the Motion Storybook tree. */
import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../../registry/craft/hero-asset";
import { createStageSet, composeHeroScene } from "../../../registry/craft/hero-stage-set";
import { createLaptop, createSmartphone } from "../../../registry/domains/technology-3d";
import { createEverydayObject } from "../../../registry/craft/everyday-objects-3d";
import { createTravelStudyObject } from "../../../registry/craft/travel-study-3d";
import type { TravelStudyObjectKind } from "../../../registry/craft/travel-study-3d";
import { createBookHero3D } from "./scene-book-3d";
import { Everyday3DScene } from "./everyday-3d";
import { toEverydayBookSpec, EVERYDAY_LIGHTING_PRESETS } from "../../../registry/video/everyday-scenes-3d";
import type { EverydayLightingPreset, EverydayRecipeId, EverydaySceneSpec } from "../../../registry/video/everyday-scenes-3d";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";

const original = (recipeId: EverydayRecipeId, portrait = false): EverydaySceneSpec => ({
  schemaVersion: 1, recipeId, id: recipeId + (portrait ? "-portrait" : "-landscape"),
  fps: { num: 30, den: 1 }, durationFrames: 150, width: portrait ? 540 : 960, height: portrait ? 960 : 540,
  content: {
    title: recipeId === "invoice-to-software" ? "From paper to software"
      : recipeId === "epic-book-storytelling" ? "A story worth opening"
        : recipeId === "document-investigation" ? "Every detail matters"
          : recipeId === "travel-study" ? "The next destination" : "One desk. Many ideas.",
    caption: recipeId === "invoice-to-software" ? "One document, one clear destination"
      : "From a single object, a bigger idea emerges",
    document: { title: "INVOICE", sender: "NORTH STUDIO", reference: "REF · 0042",
      rows: [{ label: "Editorial research", value: "$ 220.00" },
        { label: "Visual narrative", value: "$ 360.00" }], total: "$ 580.00", status: "READY TO PROCESS" },
    highlightRow: recipeId === "document-investigation" ? 1 : undefined,
    software: { title: "RECORD UPDATED", status: "Saved to records" },
    pages: [
      { heading: "The Question", text: "Every good story begins by asking what matters." },
      { heading: "The Journey", text: "We follow the clues from small details to a wider view." },
      { heading: "The Insight", text: "The final page brings the pieces together." },
    ],
  },
});
const SCENES: Record<EverydayRecipeId, EverydaySceneSpec> = {
  "cinematic-desk-explainer": original("cinematic-desk-explainer"),
  "invoice-to-software": original("invoice-to-software"),
  "epic-book-storytelling": original("epic-book-storytelling"),
  "document-investigation": original("document-investigation"),
  "travel-study": original("travel-study"),
};
const PORTRAIT_INVOICE = original("invoice-to-software", true);
const PORTRAIT_INVESTIGATION = original("document-investigation", true);
const SCENE_LABELS: Record<EverydayRecipeId, string> = {
  "cinematic-desk-explainer": "Desk explainer", "invoice-to-software": "Invoice handoff", "epic-book-storytelling": "Epic book",
  "document-investigation": "Document investigation", "travel-study": "Travel study",
};
const DARK = "#11181c", GOLD = "#d8b88c";
const button: React.CSSProperties = { appearance: "none", padding: "8px 13px", borderRadius: 9,
  color: "#eff3f2", background: "#29383c", border: "1px solid #52666b", cursor: "pointer", fontSize: 13 };

function SeekControl({ frame, setFrame, duration, playing, setPlaying }: {
  frame: number; setFrame: (next: number) => void; duration: number;
  playing: boolean; setPlaying: (value: boolean) => void;
}) {
  return <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
    <button style={button} type="button" onClick={() => setPlaying(!playing)}
      aria-label={playing ? "Pause" : "Play"}>{playing ? "Pause" : "Play"}</button>
    <label htmlFor="everyday-seek" style={{ color: GOLD, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
      Frame {frame} / {duration - 1}</label>
    <input id="everyday-seek" aria-label="Seek video frame" type="range" min="0" max={duration - 1}
      value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}
      style={{ flex: "1 1 240px", accentColor: GOLD }} />
    {[0, 35, 85, 120, duration - 1].map(value => <button key={value} style={button} type="button"
      onClick={() => { setPlaying(false); setFrame(value); }}>{value}</button>)}
  </div>;
}

function ScenePreview({ initial }: { initial: EverydayRecipeId }) {
  const [recipe, setRecipe] = useState(initial), [portrait, setPortrait] = useState(false);
  const [lighting, setLighting] = useState<EverydayLightingPreset | "">("");
  const [frame, setFrame] = useState(35), [playing, setPlaying] = useState(false);
  const spec = useMemo(() => {
    const base = portrait ? original(recipe, true) : SCENES[recipe];
    return lighting ? { ...base, lightingPreset: lighting } : base;
  }, [recipe, portrait, lighting]);
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => setFrame(f => f >= spec.durationFrames - 1 ? 0 : f + 1), 1000 / 30);
    return () => window.clearInterval(interval);
  }, [playing, spec]);
  return <main style={{ minHeight: "100vh", padding: 20, background: DARK, color: "#f4f1e9",
    fontFamily: "system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1030, margin: "auto" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>3D Everyday Objects <span style={{ color: GOLD }}>· Scene studio</span></h1>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(Object.keys(SCENES) as EverydayRecipeId[]).map(id => <button key={id} type="button"
            aria-pressed={recipe === id} style={{ ...button, background: recipe === id ? "#63766b" : button.background }}
            onClick={() => { setRecipe(id); setFrame(0); setPlaying(false); }}>{SCENE_LABELS[id]}</button>)}
          <button type="button" aria-pressed={portrait} style={{ ...button, background: portrait ? "#63766b" : button.background }}
            onClick={() => { setPortrait(p => !p); setPlaying(false); }}> {portrait ? "9:16" : "16:9"} </button>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            Light <select aria-label="Scene lighting" value={lighting}
              onChange={e => { setLighting(e.target.value as EverydayLightingPreset | ""); setPlaying(false); }}
              style={button}>
              <option value="">Directed default</option>
              {(Object.keys(EVERYDAY_LIGHTING_PRESETS) as EverydayLightingPreset[]).map(id =>
                <option key={id} value={id}>{id.replace(/-/g, " ")}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div style={{ width: "fit-content", maxWidth: "100%", margin: "auto", overflow: "auto" }}>
        <div style={{ transformOrigin: "top left" }}><Everyday3DScene spec={spec} frame={frame}/></div>
      </div>
      <SeekControl frame={frame} setFrame={setFrame} duration={spec.durationFrames}
        playing={playing} setPlaying={setPlaying}/>
    </div>
  </main>;
}

type InspectorKind = "desk" | "white desk" | "travel desk" | "laptop" | "smartphone" | "paper" | "invoice" | "folder" | "pen" | "hardcover" | TravelStudyObjectKind;
const TRAVEL_OBJECTS: readonly TravelStudyObjectKind[] = ["chair", "world-map", "globe", "photograph", "book-stack", "clock", "desk-lamp"];
const INSPECT: InspectorKind[] = ["desk", "white desk", "travel desk", "laptop", "smartphone", "paper", "invoice", "folder", "pen", "hardcover", ...TRAVEL_OBJECTS];
const FINISH_DEFAULTS: Record<InspectorKind, string> = {
  desk: "#59371f", "white desk": "#e9e6df", "travel desk": "#59371f", laptop: "#b9bdc3",
  smartphone: "#8d9198", paper: "#f9f7f0", invoice: "#f9f7f0",
  folder: "#354f4d", pen: "#8d928d", hardcover: "#294a53", chair: "#815039",
  "world-map": "#654329", globe: "#68452b", photograph: "#f2ead9",
  "book-stack": "#6e473c", clock: "#a9a39a", "desk-lamp": "#c6a162",
};
function makeInspectionAsset(kind: InspectorKind, color: string): HeroAsset {
  if (kind === "desk" || kind === "white desk" || kind === "travel desk") return composeHeroScene(createStageSet("desk",
    { deskFinish: kind === "white desk" ? "white" : "walnut",
      deskStyle: kind === "travel desk" ? "heritage" : "modern" }), [], { id: "desk-inspection", frame: "set" });
  if (kind === "laptop") return createLaptop({ color });
  if (kind === "smartphone") return createSmartphone({ frame: color });
  if (kind === "hardcover") return createBookHero3D(toEverydayBookSpec(SCENES["epic-book-storytelling"]));
  if ((TRAVEL_OBJECTS as readonly string[]).includes(kind)) return createTravelStudyObject(kind as TravelStudyObjectKind, { color });
  return createEverydayObject(kind as "paper" | "invoice" | "folder" | "pen", { color });
}
const LIGHTS = {
  "Premium studio": { palette: "graphite" as const, keyAzimuth: -35 },
  "Warm documentary": { palette: "sand" as const, keyAzimuth: -42, rimColor: "#ffe1b4" },
  "Daylight workspace": { palette: "ivory" as const, keyAzimuth: 28, rimColor: "#c5e5f9" },
  "Dramatic evening": { palette: "midnight" as const, keyAzimuth: -70, rimColor: "#ffcf9a" },
  "Neutral product": { palette: "slate" as const, keyAzimuth: -15 },
};
function Gallery() {
  const [kind, setKind] = useState<InspectorKind>("laptop");
  const [color, setColor] = useState("#b9bdc3");
  const [light, setLight] = useState<keyof typeof LIGHTS>("Premium studio");
  const [angle, setAngle] = useState(38), [elevation, setElevation] = useState(27);
  const [zoom, setZoom] = useState(1), [frame, setFrame] = useState(40);
  const [action, setAction] = useState("open");
  const createAsset = useMemo(() => () => makeInspectionAsset(kind, color), [kind, color]);
  const options = kind === "laptop" ? ["open", "wake"] : kind === "smartphone" ? ["notify", "turn"]
    : kind === "hardcover" ? ["turn-pages"] : kind === "folder" ? ["open", "lift", "slide"]
      : kind === "globe" ? ["spin"] : kind === "clock" ? ["tick"] : kind === "desk-lamp" ? ["adjust"]
        : kind === "desk" || kind === "white desk" || kind === "travel desk" ||
            (TRAVEL_OBJECTS as readonly string[]).includes(kind) ? []
        : kind === "paper" || kind === "invoice" ? ["highlight", "lift", "slide"] : ["lift", "slide"];
  return <main style={{ minHeight: "100vh", background: DARK, color: "#eaf0ed", padding: 20,
    fontFamily: "system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1050, margin: "auto" }}>
      <h1 style={{ margin: "0 0 14px", fontSize: 21 }}>Everyday object inspector</h1>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {INSPECT.map(name => <button key={name} type="button" aria-pressed={name === kind}
          style={{ ...button, background: name === kind ? "#526d64" : button.background }}
          onClick={() => { setKind(name); setColor(FINISH_DEFAULTS[name]); setFrame(40); setZoom(1);
            setElevation(name === "world-map" || name === "photograph" ? 0 : 27);
            setAction(name === "folder" ? "open" : name === "hardcover" ? "turn-pages" :
              name === "smartphone" ? "notify" : name === "globe" ? "spin" : name === "clock" ? "tick" :
                name === "desk-lamp" ? "adjust" : name === "desk" || name === "white desk" || name === "travel desk" ||
                    (TRAVEL_OBJECTS as readonly string[]).includes(name) ? "" : name === "laptop" ? "open" : "lift"); }}>
          {name}</button>)}
      </div>
      <div style={{ maxWidth: 960, margin: "auto" }}>
        <HeroAssetViewer createAsset={createAsset} width={960} height={540} action={action || null}
          actionFrame={frame} azimuth={angle} elevation={elevation} zoom={zoom}
          studio={LIGHTS[light]} ariaLabel={`${kind} physical 3D inspection`}/>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginTop: 16 }}>
        <label>Lighting <select value={light} onChange={e => setLight(e.target.value as keyof typeof LIGHTS)}
          style={{ ...button, marginLeft: 6 }}>{Object.keys(LIGHTS).map(name => <option key={name}>{name}</option>)}</select></label>
        <label>Finish <input type="color" aria-label="Object finish" value={color}
          onChange={e => setColor(e.target.value)}/></label>
        <label>Angle <input type="range" aria-label="Viewing angle" min="-180" max="180" value={angle}
          onChange={e => setAngle(Number(e.target.value))}/></label>
        <label>Height <input type="range" aria-label="Camera elevation" min="-20" max="85" value={elevation}
          onChange={e => setElevation(Number(e.target.value))}/>{elevation}°</label>
        <label>Zoom <input type="range" aria-label="Camera zoom" min="0.6" max="2.8" step="0.1" value={zoom}
          onChange={e => setZoom(Number(e.target.value))}/>{zoom.toFixed(1)}×</label>
        <label>Action <select value={options.includes(action) ? action : ""}
          onChange={e => setAction(e.target.value)} style={{ ...button, marginLeft: 6 }}>
          <option value="">Rest</option>{options.map(id => <option key={id}>{id}</option>)}
        </select></label>
        <label>Frame <input type="range" aria-label="Action frame" min="0" max="120" value={frame}
          onChange={e => setFrame(Number(e.target.value))}/>{frame}</label>
      </div>
    </div>
  </main>;
}

function Capture({ spec }: { spec: EverydaySceneSpec }) {
  const [frame, setFrame] = useState(0);
  const manifest: VideoExportManifest = { schemaVersion: 1, id: spec.id,
    width: spec.width, height: spec.height, durationFrames: spec.durationFrames, fps: spec.fps,
    assets: [], // all meshes, material relief and typography are original/generated locally
  };
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <Everyday3DScene spec={spec} frame={frame}/>
  </VideoExportStage>;
}

const meta = { title: "Video Production/Scene Templates/3D Everyday Objects",
  component: Everyday3DScene, parameters: { layout: "fullscreen" },
  tags: ["!dev", "!autodocs", "!test"] } satisfies Meta<typeof Everyday3DScene>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ObjectGallery: Story = { args: { spec: SCENES["cinematic-desk-explainer"], frame: 30 }, render: () => <Gallery/> };
export const CinematicDeskExplainer: Story = { args: { spec: SCENES["cinematic-desk-explainer"], frame: 30 },
  render: () => <ScenePreview initial="cinematic-desk-explainer"/> };
export const InvoiceToSoftware: Story = { args: { spec: SCENES["invoice-to-software"], frame: 30 },
  render: () => <ScenePreview initial="invoice-to-software"/> };
export const EpicBookStorytelling: Story = { args: { spec: SCENES["epic-book-storytelling"], frame: 30 },
  render: () => <ScenePreview initial="epic-book-storytelling"/> };
export const DocumentInvestigation: Story = { args: { spec: SCENES["document-investigation"], frame: 30 },
  render: () => <ScenePreview initial="document-investigation"/> };
export const TravelStudy: Story = { args: { spec: SCENES["travel-study"], frame: 30 },
  render: () => <ScenePreview initial="travel-study"/> };
export const CinematicDeskExplainerCapture: Story = { args: { spec: SCENES["cinematic-desk-explainer"], frame: 0 },
  render: () => <Capture spec={SCENES["cinematic-desk-explainer"]}/> };
export const InvoiceToSoftwareCapture: Story = { args: { spec: SCENES["invoice-to-software"], frame: 0 },
  render: () => <Capture spec={SCENES["invoice-to-software"]}/> };
export const InvoiceToSoftwarePortraitCapture: Story = { args: { spec: PORTRAIT_INVOICE, frame: 0 },
  render: () => <Capture spec={PORTRAIT_INVOICE}/> };
export const EpicBookStorytellingCapture: Story = { args: { spec: SCENES["epic-book-storytelling"], frame: 0 },
  render: () => <Capture spec={SCENES["epic-book-storytelling"]}/> };
export const DocumentInvestigationCapture: Story = { args: { spec: SCENES["document-investigation"], frame: 0 },
  render: () => <Capture spec={SCENES["document-investigation"]}/> };
export const DocumentInvestigationPortraitCapture: Story = { args: { spec: PORTRAIT_INVESTIGATION, frame: 0 },
  render: () => <Capture spec={PORTRAIT_INVESTIGATION}/> };
export const TravelStudyCapture: Story = { args: { spec: SCENES["travel-study"], frame: 0 },
  render: () => <Capture spec={SCENES["travel-study"]}/> };
