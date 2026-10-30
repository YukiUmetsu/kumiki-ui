import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FollowSubjectThroughSections } from "../../../registry/video/follow-subject-through-sections-react";
import type { FollowSubjectSpec } from "../../../registry/video/follow-subject-through-sections";
import { collectFollowSubjectAssets } from "../../../registry/video/follow-subject-through-sections";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";

type Theme = "nature" | "cosmos" | "ocean";
type Aspect = "landscape" | "portrait";
const themes: Record<Theme, { label: string; colors: [string, string][]; subject: string; title: string }> = {
  nature: { label: "Nature", title: "Follow an explorer across three landscapes", subject: "butterfly",
    colors: [["#79b7d8","#bde4d7"],["#ab89c5","#eeb98b"],["#294d70","#8aadc4"]] },
  cosmos: { label: "Space", title: "One spacecraft passes through new worlds", subject: "ship",
    colors: [["#12233e","#385c8c"],["#24153e","#8763a8"],["#1c264a","#59767c"]] },
  ocean: { label: "Ocean", title: "A traveler passes through ocean habitats", subject: "fish",
    colors: [["#245f83","#68c2ca"],["#17457a","#4c98b8"],["#09264f","#286d8d"]] },
};
const dataUri = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
function background(upper: string, lower: string): string {
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
  <defs><linearGradient id="s" x2=".3" y2="1"><stop stop-color="${upper}"/><stop offset="1" stop-color="${lower}"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#s)"/>
  <circle cx="1180" cy="240" r="110" fill="#fff5d3" opacity=".68"/>
  <circle cx="280" cy="155" r="3" fill="white" opacity=".9"/>
  <circle cx="1200" cy="90" r="3" fill="white" opacity=".7"/>
  <circle cx="870" cy="370" r="3" fill="white" opacity=".7"/>
  </svg>`);
}
function foreground(theme: Theme, step: number): string {
  const color = theme === "cosmos" ? ["#29385c","#39426b","#141d39"][step]
    : theme === "ocean" ? ["#23647a","#20536d","#153d57"][step]
    : ["#5e8a84","#775982","#3a6289"][step];
  const light = theme === "nature" ? "#e0dbba" : "#a2bed4";
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
    <path d="M0 690 L160 520 L290 615 L500 360 L730 625 L960 435 L1260 620 L1440 440 L1600 620 L1600 900 L0 900 Z" fill="${light}" opacity=".34"/>
    <path d="M0 780 L180 650 L375 730 L560 560 L800 740 L1050 605 L1220 745 L1450 560 L1600 685 L1600 900 L0 900 Z" fill="${color}" opacity=".8"/>
    <path d="M0 860 Q400 730 800 825 T1600 790 V900 H0Z" fill="${color}"/>
  </svg>`);
}
function subjectSvg(theme: Theme): string {
  if (theme === "nature") return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 350">
    <defs><linearGradient id="w" x2=".9" y2="1"><stop stop-color="#ffca74"/><stop offset="1" stop-color="#b95696"/></linearGradient></defs>
    <path d="M208 160 C95 -20 20 45 86 183 C-5 210 88 345 201 205" fill="url(#w)" stroke="#302a4e" stroke-width="8"/>
    <path d="M212 160 C325 -20 400 45 334 183 C425 210 332 345 219 205" fill="url(#w)" stroke="#302a4e" stroke-width="8"/>
    <path d="M210 100 Q200 60 178 53 M212 100 Q224 60 248 53" fill="none" stroke="#302a4e" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="210" cy="174" rx="18" ry="92" fill="#262442"/><circle cx="209" cy="112" r="20" fill="#262442"/>
  </svg>`);
  if (theme === "cosmos") return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 350">
    <path d="M80 260 L210 35 L340 260 L250 225 L210 305 L170 225Z" fill="#e4e8ec" stroke="#203a62" stroke-width="12" stroke-linejoin="round"/>
    <path d="M175 153 Q210 98 245 153 L238 198 H182Z" fill="#67b7d7" stroke="#203a62" stroke-width="10"/>
    <path d="M185 260 L210 345 L235 260" fill="#f3b45c"/>
  </svg>`);
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 350">
    <path d="M75 180 Q210 38 316 180 L406 100 V265 L316 190 Q204 330 75 180Z" fill="#efb475" stroke="#2f526a" stroke-width="10"/>
    <circle cx="150" cy="162" r="13" fill="#24425c"/><path d="M155 220 Q210 250 260 207" fill="none" stroke="#d48265" stroke-width="7"/>
  </svg>`);
}
function makeSpec(theme: Theme, aspect: Aspect, reducedMotion: boolean): FollowSubjectSpec {
  const colors = themes[theme].colors;
  const landscape = aspect === "landscape";
  const sections = colors.map(([a,b], i) => ({
    id: ["first","second","third"][i], frames: 60,
    transition: i === 1 ? "portal" as const : i === 2 ? "depth-wipe" as const : "crossfade" as const,
    transitionFrames: i === 0 ? 0 : 12,
    layers: [
      { id: "sky", src: background(a,b), depth: .2, licenseRef: "demo-generated-svg" },
      { id: "landscape", src: foreground(theme,i), depth: 1.4, licenseRef: "demo-generated-svg" },
    ],
  }));
  return {
    schemaVersion: 1, recipeId: "follow-subject-through-sections", recipeVersion: 1,
    id: "explorer-" + theme + "-" + aspect, fps: { num: 30, den: 1 },
    width: landscape ? 960 : 540, height: landscape ? 540 : 960,
    reducedMotion, sections,
    subject: {
      id: "one-persistent-" + themes[theme].subject,
      alt: themes[theme].title,
      src: subjectSvg(theme), widthPercent: landscape ? 20 : 38, licenseRef: "demo-generated-svg",
      x: 50, y: 48, pathEasing:"cinematic",
      path: [{frame:0,x:landscape?42:46,y:48},{frame:89,x:landscape?55:56,y:43},{frame:179,x:landscape?51:48,y:48}],
    },
  };
}
function AnimatedButterfly({ frame }: { frame: number }) {
  // A Storybook-only SVG rig: frame-derived wing poses, never wall-clock CSS.
  const wing = 0.62 + 0.38 * Math.cos(frame * 0.42);
  return <svg data-km-butterfly-rig="" data-km-wing-scale={wing.toFixed(4)}
    viewBox="0 0 420 350" width="100%" height="100%" role="presentation"
    style={{ display: "block", filter: "drop-shadow(0 8px 12px rgba(31,33,61,.24))" }}>
    <g transform={`translate(205 160) scale(${wing} 1) translate(-205 -160)`}>
      <path d="M208 160 C95 -20 20 45 86 183 C-5 210 88 345 201 205"
        fill="#f0b574" stroke="#342c4e" strokeWidth="8" strokeLinejoin="round" />
      <path d="M140 104 Q90 160 158 214" fill="none" stroke="#fbe6b1" strokeWidth="15" opacity=".7"/>
    </g>
    <g transform={`translate(215 160) scale(${wing} 1) translate(-215 -160)`}>
      <path d="M212 160 C325 -20 400 45 334 183 C425 210 332 345 219 205"
        fill="#b96eac" stroke="#342c4e" strokeWidth="8" strokeLinejoin="round" />
      <path d="M284 104 Q333 160 260 214" fill="none" stroke="#f9b8d7" strokeWidth="15" opacity=".7"/>
    </g>
    <path d="M210 102 Q193 65 174 58 M213 102 Q225 65 251 58" fill="none" stroke="#262442" strokeWidth="7" strokeLinecap="round" />
    <ellipse cx="210" cy="174" rx="18" ry="92" fill="#262442"/>
    <circle cx="209" cy="110" r="20" fill="#262442"/>
  </svg>;
}
function Demo() {
  const [theme,setTheme] = useState<Theme>("nature");
  const [aspect,setAspect] = useState<Aspect>("landscape");
  const [reduced,setReduced] = useState(false);
  const [frame,setFrame] = useState(0);
  const spec = useMemo(() => makeSpec(theme,aspect,reduced),[theme,aspect,reduced]);
  const section = spec.sections[Math.floor(frame / 60)].id;
  return <main className="min-h-screen bg-canvas p-6 text-foreground">
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <header>
        <p className="text-caption uppercase tracking-widest text-muted-foreground">Video recipe / FS1</p>
        <h1 className="font-serif text-heading">{themes[theme].title}</h1>
        <p className="text-body text-muted-foreground">One semantic subject · Three replaceable sections · An explicit frame clock</p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Example" className="flex gap-2">
          {(["nature","cosmos","ocean"] as const).map(v=><button key={v} type="button" aria-pressed={v===theme}
            onClick={()=>{setTheme(v);setFrame(0);}}
            className={"rounded-control border px-4 py-2 text-sm "+(v===theme?"border-primary bg-primary text-primary-foreground":"border-border bg-surface text-foreground")}>{themes[v].label}</button>)}
        </div>
        <div role="group" aria-label="Aspect" className="flex gap-2">
          {(["landscape","portrait"] as const).map(v=><button key={v} type="button" aria-pressed={v===aspect}
            onClick={()=>{setAspect(v);setFrame(0);}}
            className={"rounded-control border px-4 py-2 text-sm "+(v===aspect?"border-primary bg-primary text-primary-foreground":"border-border bg-surface text-foreground")}>{v==="landscape"?"16:9":"9:16"}</button>)}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>Reduced motion</label>
      </div>
      <section className="mx-auto w-full overflow-hidden rounded-lg border border-border bg-surface"
        style={{maxWidth:aspect==="portrait"?"390px":"1080px"}}>
        <FollowSubjectThroughSections spec={spec} frame={frame}
          renderSubject={theme === "nature" && !reduced ? (state) => <AnimatedButterfly frame={state.frame} /> : undefined} />
      </section>
      <div className="flex flex-col gap-2">
        <label htmlFor="frame" className="text-sm font-semibold">Timeline · frame {frame} / 179 · {section} section</label>
        <input id="frame" type="range" min={0} max={179} value={frame}
          onChange={e=>setFrame(Number(e.target.value))} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Beginning</span><span>Butterfly portal at 60</span><span>Depth wipe at 120</span><span>Final hold</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Illustrative SVG placeholders, not production or licensed footage. Replace the scenery and subject assets independently before export.</p>
    </div>
  </main>;
}
/** Production-style frame-seek handshake: no custom animation loop. */
const captureSpec = makeSpec("nature", "landscape", false);
const captureManifest: VideoExportManifest = {
  schemaVersion: 1, id: "follow-subject-capture",
  width: captureSpec.width!, height: captureSpec.height!,
  durationFrames: captureSpec.sections.reduce((sum, section) => sum + section.frames, 0),
  fps: captureSpec.fps!,
  assets: collectFollowSubjectAssets(captureSpec),
};
function CaptureDemo() {
  const [frame, setFrame] = useState(0);
  return <VideoExportStage manifest={captureManifest} frame={frame} onSeek={setFrame}>
    <FollowSubjectThroughSections spec={captureSpec} frame={frame}
      renderSubject={state=><AnimatedButterfly frame={state.frame}/>}/>
  </VideoExportStage>;
}
const meta = { tags: ["!dev", "!autodocs", "!test"], title: "Motion/Follow Subject Through Sections", component: FollowSubjectThroughSections,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof FollowSubjectThroughSections>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Explorer: Story = { args: { spec: makeSpec("nature", "landscape", false), frame: 0 }, render: () => <Demo /> };

export const Capture: Story = { args: { spec: captureSpec, frame: 0 }, render: () => <CaptureDemo /> };
