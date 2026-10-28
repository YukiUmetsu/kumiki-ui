import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CinematicTemplate } from "../../registry/video/cinematic-templates-react";
import { CinematicCave3D } from "../../registry/video/cinematic-cave-3d-react";
import { CinematicWalk3D } from "../../registry/video/cinematic-walk-3d-react";
import type { CinematicTemplateAssets } from "../../registry/video/cinematic-templates-react";
import {
  CINEMATIC_FPS, CINEMATIC_REEL_FRAMES, CINEMATIC_TEMPLATES, reelAt, templateDefinition, templateFrame,
} from "../../registry/video/cinematic-templates";
import type { CinematicTemplateId } from "../../registry/video/cinematic-templates";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";

import nature from "./assets/cinematic-templates/nature.webp";
import cave from "./assets/cinematic-templates/cave.webp";
import sign from "./assets/cinematic-templates/sign.webp";
import book from "./assets/cinematic-templates/book.webp";
import glass from "./assets/cinematic-templates/glass.webp";
import earth from "./assets/cinematic-templates/earth.webp";
import walk from "./assets/cinematic-templates/walk.webp";
import walker from "./assets/cinematic-templates/walker.webp";
import h0 from "./assets/cinematic-templates/history-0.webp";
import h1 from "./assets/cinematic-templates/history-1.webp";
import h2 from "./assets/cinematic-templates/history-2.webp";
import h3 from "./assets/cinematic-templates/history-3.webp";
import h4 from "./assets/cinematic-templates/history-4.webp";
import h5 from "./assets/cinematic-templates/history-5.webp";
import woodDiffuse from "./assets/cinematic-templates/cc0/wood-diffuse.jpg";
import woodNormal from "./assets/cinematic-templates/cc0/wood-normal.jpg";
import woodRoughness from "./assets/cinematic-templates/cc0/wood-rough.jpg";
import grassRockDiffuse from "./assets/cinematic-templates/cc0/grass-rock-diffuse.jpg";
import treeOak from "./assets/cinematic-templates/cc0/kenney/tree_oak.glb?url";
import treePine from "./assets/cinematic-templates/cc0/kenney/tree_pineTallA.glb?url";
import treePalm from "./assets/cinematic-templates/cc0/kenney/tree_palmDetailedTall.glb?url";
import cactus from "./assets/cinematic-templates/cc0/kenney/cactus_tall.glb?url";
import rock from "./assets/cinematic-templates/cc0/kenney/rock_largeA.glb?url";
import bush from "./assets/cinematic-templates/cc0/kenney/plant_bushDetailed.glb?url";
import houseA from "./assets/cinematic-templates/cc0/kenney/building-type-a.glb?url";
import houseG from "./assets/cinematic-templates/cc0/kenney/building-type-g.glb?url";
import houseO from "./assets/cinematic-templates/cc0/kenney/building-type-o.glb?url";
import cityColorMap from "./assets/cinematic-templates/cc0/kenney/colormap.png";
import riggedWalker from "../../assets/models/people/rocketbox-female-adult-01.glb?url";

/* An original, editable visual proof of the user's seven video references. The references themselves
 * are not bundled. These independently generated environment plates can be swapped by consumers.
 * Export at exact output size:
 * npm run video:export -- --story=video-cinematic-templates--preview-reel --output=dist/cinematic-reel.mp4
 * npm run video:export -- --story=video-cinematic-templates--nature-logo --output=dist/nature-logo.mp4
 */
const assets: CinematicTemplateAssets = { nature, cave, sign, book, glass, earth, walk, walker, history: [h0, h1, h2, h3, h4, h5] };
const ALL = [nature, cave, sign, book, glass, earth, walk, walker, h0, h1, h2, h3, h4, h5];
const ASSET_LICENSE = "Original generated environment art for Kumiki cinematic template demo; no third-party stock footage";
const WOOD_LICENSE = "Poly Haven Dark Wooden Planks, CC0 1.0, https://polyhaven.com/a/dark_wooden_planks";
const GROUND_LICENSE = "Poly Haven Aerial Grass Rock, CC0 1.0, https://polyhaven.com/a/aerial_grass_rock";
const NATURE_LICENSE = "Kenney Nature Kit, CC0 1.0, https://kenney.nl/assets/nature-kit";
const CITY_LICENSE = "Kenney City Kit (Suburban), CC0 1.0, https://kenney.nl/assets/city-kit-suburban";
const WALKER_LICENSE = "Microsoft Rocketbox Female Adult 01, MIT, assets/models/people/LICENSE-Microsoft-Rocketbox.txt";
const walkModels = { walker: riggedWalker, treeOak, treePine, treePalm, cactus, rock, bush, houses: [houseA, houseG, houseO] as [string, string, string], cityColorMap };
const FPS = CINEMATIC_FPS.num / CINEMATIC_FPS.den;

type Args = {
  kind: CinematicTemplateId;
  previewReel: boolean;
  startFrame: number;
  title?: string;
  subtitle?: string;
  reducedMotion: boolean;
};

const timecode = (f: number) => {
  const sec = Math.floor(f / FPS);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};

const shell: CSSProperties = {
  minHeight: "100vh", padding: "clamp(18px, 3vw, 38px)", background: "#0b0e14", color: "#eef1f6",
  font: '400 14px/1.5 "Geist Variable", Geist, system-ui, sans-serif', boxSizing: "border-box",
};
const select: CSSProperties = { background: "#1b2230", color: "#e9eef5", border: "1px solid #364356", padding: "9px 12px", borderRadius: 9, font: "inherit" };

function usePreviewClock(duration: number, initial: number, resetKey: string) {
  const [frame, setFrame] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  useEffect(() => { setFrame(Math.max(0, Math.min(duration - 1, initial))); setPlaying(false); }, [duration, initial, resetKey]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const from = frameRef.current >= duration - 1 ? 0 : frameRef.current;
    const start = performance.now() - from * (1000 / FPS);
    const tick = (now: number) => {
      const next = Math.min(duration - 1, Math.floor((now - start) * FPS / 1000));
      if (next !== frameRef.current) { frameRef.current = next; setFrame(next); }
      if (next >= duration - 1) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);
  const seek = (next: number) => { setPlaying(false); setFrame(Math.min(duration - 1, Math.max(0, Math.round(next)))); };
  return { frame, playing, seek, toggle: () => setPlaying(p => !p) };
}

function CinematicPreview({ kind, previewReel, startFrame, title, subtitle, reducedMotion }: Args) {
  const exporting = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kmExport") === "1";
  const [selected, setSelected] = useState<CinematicTemplateId>(kind);
  const [reel, setReel] = useState(previewReel);
  // Storybook arg changes keep the story selection and playback state in sync.
  useEffect(() => { setSelected(kind); setReel(previewReel); }, [kind, previewReel]);
  const activeDuration = reel ? CINEMATIC_REEL_FRAMES : templateDefinition(selected).durationFrames;
  const activeClock = usePreviewClock(activeDuration, startFrame, reel ? "reel" : selected);
  const position = reel ? reelAt(activeClock.frame) : { id: selected, localFrame: templateFrame(selected, activeClock.frame), sceneIndex: 0 };
  const manifest = useMemo<VideoExportManifest>(() => ({
    schemaVersion: 1, id: reel ? "cinematic-template-reel" : selected,
    durationFrames: activeDuration, width: 1280, height: 720, fps: CINEMATIC_FPS,
    assets: [
      ...ALL.map((url, index) => ({ id: `original-plate-${index}`, kind: "image" as const, url, licenseRef: ASSET_LICENSE })),
      ...[woodDiffuse, woodNormal, woodRoughness].map((url, index) => ({
        id: `cc0-wood-${index}`, kind: "image" as const, url, licenseRef: WOOD_LICENSE,
      })),
      { id: "cc0-grass-rock", kind: "image" as const, url: grassRockDiffuse, licenseRef: GROUND_LICENSE },
      ...[treeOak, treePine, treePalm, cactus, rock, bush].map((url, index) => ({
        id: `cc0-nature-model-${index}`, kind: "image" as const, url, licenseRef: NATURE_LICENSE,
      })),
      ...[houseA, houseG, houseO].map((url, index) => ({
        id: `cc0-city-model-${index}`, kind: "image" as const, url, licenseRef: CITY_LICENSE,
      })),
      { id: "cc0-city-colormap", kind: "image" as const, url: cityColorMap, licenseRef: CITY_LICENSE },
      { id: "mit-rigged-walker", kind: "image" as const, url: riggedWalker, licenseRef: WALKER_LICENSE },
    ],
  }), [reel, selected, activeDuration]);
  const shot = position.id === "cave-logo"
    ? <CinematicCave3D frame={position.localFrame} background={assets.cave}
      woodDiffuse={woodDiffuse} woodNormal={woodNormal} woodRoughness={woodRoughness}
      title={title || undefined} subtitle={subtitle || undefined} reducedMotion={reducedMotion} />
    : position.id === "walk-on-earth"
      ? <CinematicWalk3D frame={position.localFrame} groundTexture={grassRockDiffuse} models={walkModels}
        title={title || undefined} subtitle={subtitle || undefined} reducedMotion={reducedMotion} />
    : <CinematicTemplate kind={position.id} frame={position.localFrame} assets={assets}
      title={title || undefined} subtitle={subtitle || undefined} reducedMotion={reducedMotion} />;
  const film = <VideoExportStage manifest={manifest} frame={activeClock.frame} onSeek={activeClock.seek}>
    {shot}
  </VideoExportStage>;

  // The export CLI passes the selected Storybook args and captures this exact 1280×720 surface.
  if (exporting) return film;
  const definition = templateDefinition(position.id);
  const progress = activeClock.frame / Math.max(1, activeDuration - 1);
  return <main style={shell}>
    <div style={{ maxWidth: 1280, margin: "auto", display: "grid", gap: 18 }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".22em", color: "#87a9c8", fontWeight: 750 }}>KUMIKI / CINEMATIC MOTION LAB</div>
          <h1 style={{ fontSize: "clamp(27px, 4vw, 46px)", letterSpacing: "-.045em", lineHeight: 1.1, fontWeight: 640, margin: "7px 0 6px" }}>Animation templates, in motion.</h1>
          <p style={{ margin: 0, color: "#a6b5c6", maxWidth: 650 }}>Original scene assets, authored motion and a frame-accurate export surface. Play at normal speed or scrub to inspect transitions.</p>
        </div>
        <span style={{ border: "1px solid #38465a", padding: "5px 10px", borderRadius: 7, color: "#9db9d4", fontSize: 12 }}>30 FPS · 16:9 · 1280 × 720</span>
      </header>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>Template
          <select style={select} aria-label="Choose animation template" value={reel ? "reel" : selected} onChange={event => {
            const next = event.target.value;
            setReel(next === "reel");
            if (next !== "reel") setSelected(next as CinematicTemplateId);
          }}>
            <option value="reel">All seven · QA reel</option>
            {CINEMATIC_TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.label}</option>)}
          </select>
        </label>
        <span style={{ color: "#b0c0cf" }}>{definition.artDirection}</span>
      </div>

      <div style={{ maxWidth: 1120, width: "100%", margin: "0 auto" }}>
        <div style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 90px #0008", border: "1px solid #344052", position: "relative" }}>
          {/* Width is responsive only for viewing; export always uses the native 1280px stage. */}
          {shot}
        </div>

        <div style={{ marginTop: 0, background: "#161e2b", borderRadius: "0 0 14px 14px", padding: "17px 20px", border: "1px solid #344052", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button type="button" onClick={activeClock.toggle} aria-label={activeClock.playing ? "Pause animation" : "Play animation"}
              style={{ border: "1px solid #6d88a8", borderRadius: "50%", width: 46, height: 46, color: "#e9f3ff", background: "#294462", cursor: "pointer", flexShrink: 0, font: "700 18px system-ui" }}>
              {activeClock.playing ? "Ⅱ" : "▶"}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "#b8c9db", marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
                <span>{timecode(activeClock.frame)} / {timecode(activeDuration)}</span>
                <span>{reel ? `${position.sceneIndex + 1} / 7 · ${definition.label}` : definition.label}</span>
              </div>
              <input type="range" min={0} max={activeDuration - 1} step={1} value={activeClock.frame}
                onChange={event => activeClock.seek(Number(event.target.value))} aria-label="Seek animation timeline"
                style={{ display: "block", width: "100%", cursor: "pointer", accentColor: "#89c6e8", margin: 0,
                  background: `linear-gradient(90deg,#7ec6ec ${progress * 100}%,#39485b ${progress * 100}%)` }} />
            </div>
          </div>
        </div>
      </div>

      <footer style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "space-between", color: "#93a9be", fontSize: 13 }}>
        <span>{definition.description}</span>
        <span>Walking world: Three.js and CC0 Kenney/Poly Haven assets; cave sign: Three.js and CC0 wood texture.</span>
      </footer>
    </div>
  </main>;
}

const meta = {
  title: "Video production/Cinematic Templates",
  id: "video-cinematic-templates",
  component: CinematicPreview,
  parameters: { layout: "fullscreen" },
  args: { kind: "nature-logo", previewReel: true, startFrame: 0, reducedMotion: false },
  argTypes: {
    kind: { control: "select", options: CINEMATIC_TEMPLATES.map(template => template.id) },
    startFrame: { control: { type: "number", min: 0, max: CINEMATIC_REEL_FRAMES - 1 } },
  },
} satisfies Meta<typeof CinematicPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const PreviewReel: Story = {};
export const NatureLogo: Story = { args: { kind: "nature-logo", previewReel: false } };
export const LiquidGlass: Story = { args: { kind: "liquid-glass", previewReel: false } };
export const HistoryTimeline: Story = { args: { kind: "history-timeline", previewReel: false } };
export const EpicBook: Story = { args: { kind: "epic-book", previewReel: false } };
export const FlyAroundEarth: Story = { args: { kind: "fly-around-earth", previewReel: false } };
export const WalkOnEarth: Story = { args: { kind: "walk-on-earth", previewReel: false } };
export const CaveLogo: Story = { args: { kind: "cave-logo", previewReel: false } };
