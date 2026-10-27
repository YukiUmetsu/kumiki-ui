/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterPresenter } from "../../registry/character/character-presenter-react";
import { evaluateCharacter } from "../../registry/character/evaluate";
import type { CharacterCue, CharacterDefinition, CharacterInstance } from "../../registry/character/definition";
import { doctorQuillCharacter as owlScholarCharacter } from "./fixtures/doctor-quill";
import { pipCharacter } from "./fixtures/pip";
import {
  actionFrames, approachScale, demoActivity, DEMO_FPS, DEMO_LOOP_FRAMES, forwardWalkCues,
  loopOpacity, quillBeakSweep, showcaseCues,
} from "./character-presenter-demo";

/* Demo fixtures are drawn from user-supplied reference art (see each fixture's provenance).
 * Cues below are hand-authored for review; they are not aligned to any recording. */

/* Raster parts cut from the user-supplied sheets live in src/character/fixtures/<name>-assets/.
 * Each file becomes the asset uri `<name>/<file>`, which the presenter resolves through `assetUrls`. */
const ASSET_FILES = import.meta.glob("./fixtures/*-assets/**/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const assetUrls: Record<string, string> = Object.fromEntries(Object.entries(ASSET_FILES).map(([path, url]) => {
  const match = /fixtures\/([\w-]+)-assets\/([\w/-]+)\.png$/.exec(path);
  return [match ? `${match[1]}/${match[2]}` : path, url];
}));

const owl: CharacterInstance = { instanceId: "owl", characterId: "doctor-quill", revision: "r2", seed: 11 };
const squirrel: CharacterInstance = { instanceId: "squirrel", characterId: "pip", revision: "r1", seed: 27 };

const SLEEPY_OWL: CharacterCue[] = [{ id: "o-sleepy", instanceId: "owl", kind: "expression", startFrame: 0, name: "focused" }];

const SPEAKING_OWL: CharacterCue[] = [
  { id: "o-speech", instanceId: "owl", kind: "speech", startFrame: 0, endFrame: 90, precision: "approximate" },
  { id: "o-point", instanceId: "owl", kind: "action", startFrame: 94, name: "point" },
  { id: "o-face", instanceId: "owl", kind: "expression", startFrame: 94, name: "curious" },
];
const CHEERING_SQUIRREL: CharacterCue[] = [
  { id: "s-speech", instanceId: "squirrel", kind: "speech", startFrame: 0, endFrame: 70, precision: "approximate" },
  { id: "s-cheer", instanceId: "squirrel", kind: "action", startFrame: 78, name: "cheer" },
  { id: "s-face", instanceId: "squirrel", kind: "expression", startFrame: 78, name: "delighted" },
];

const stage: CSSProperties = {
  display: "grid", gap: 12, padding: 16, borderRadius: 16, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)",
};
const panel = (dark: boolean): CSSProperties => ({
  background: dark ? "#141b26" : "#f6f1e8", color: dark ? "#e8edf5" : "#2a2f38", borderRadius: 12, padding: 12,
  display: "grid", gap: 8, minWidth: 0,
});
const note: CSSProperties = { margin: 0, opacity: 0.8, fontSize: 13, lineHeight: 1.5 };
const figure: CSSProperties = { width: "100%", maxWidth: 360, justifySelf: "center" };

/* ------------------------------------------------------------------ */
/* 1. Two independent performers                                       */
/* ------------------------------------------------------------------ */
function TwoPerformers({ frame }: { frame: number }) {
  return <div style={stage}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      <div style={panel(false)}>
        <CharacterPresenter assetUrls={assetUrls} definition={owlScholarCharacter} instance={owl} cues={SPEAKING_OWL} frame={frame} style={figure} label="Doctor Quill speaking, then pointing" />
        <p style={note}>During speech, Quill's clean head has one articulated beak. His expression and gesture follow after speech.</p>
      </div>
      <div style={panel(true)}>
        <CharacterPresenter assetUrls={assetUrls} definition={pipCharacter} instance={squirrel} cues={CHEERING_SQUIRREL} frame={frame} style={figure} label="Pip speaking, then cheering" />
        <p style={note}>Pip uses full-face mouth drawings, then raises both paws to cheer.</p>
      </div>
    </div>
    <p style={note}>Each performer is evaluated from its own cues. Seeking to any frame gives the same pose as playing up to it.</p>
  </div>;
}

/* ------------------------------------------------------------------ */
/* 2. Lip-sync precision                                               */
/* ------------------------------------------------------------------ */
const EXACT_OWL = quillBeakSweep("owl");
const APPROX_SQUIRREL: CharacterCue[] = [
  { id: "a1", instanceId: "squirrel", kind: "speech", startFrame: 0, endFrame: 98, precision: "approximate" },
];

function LipSync({ frame }: { frame: number }) {
  return <div style={stage}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      <div style={panel(false)}>
        <strong>Quill · 25-stage beak sweep</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={owlScholarCharacter} instance={owl} cues={EXACT_OWL} frame={frame} style={figure} label="Doctor Quill showing his full beak opening and closing range" reducedMotion />
        <p style={note}>All 25 registered beak openings, including in-betweens. This is a shape-alignment test, not lip-sync aligned to audio. The normal head returns during silence.</p>
      </div>
      <div style={panel(true)}>
        <strong>Pip · approximate speech</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={pipCharacter} instance={squirrel} cues={APPROX_SQUIRREL} frame={frame} style={figure} label="Squirrel with approximate speech cycling" reducedMotion />
        <p style={note}>Pip swaps registered full-face drawings at slower intervals; no audio or phoneme timing is implied.</p>
      </div>
    </div>
  </div>;
}

/* ------------------------------------------------------------------ */
/* 3. Skins and bounded params                                         */
/* ------------------------------------------------------------------ */
function SkinsAndParams({ frame, wingSpread, tailSize, headTilt }: { frame: number; wingSpread: number; tailSize: number; headTilt: number }) {
  const owlInstance: CharacterInstance = { ...owl, params: { wingSpread, headTilt } };
  const squirrelInstance: CharacterInstance = { ...squirrel, params: { tailSize } };
  return <div style={stage}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      <div style={panel(false)}>
        <strong>Owl with bounded params</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={owlScholarCharacter} instance={owlInstance} cues={[]} frame={frame} style={figure} label="Owl scholar with bounded wing spread and head tilt" />
        <CharacterPresenter assetUrls={assetUrls} definition={owlScholarCharacter} instance={owlInstance} cues={SLEEPY_OWL} frame={frame} style={figure} label="Owl scholar with the focused expression" />
      </div>
      <div style={panel(true)}>
        <strong>Squirrel with tail size</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={pipCharacter} instance={squirrelInstance} cues={[]} frame={frame} style={figure} label="Squirrel explorer with adjusted tail size" />
        <p style={note}>Skins swap palette values only; params stay inside their declared bounds.</p>
      </div>
    </div>
  </div>;
}

/* ------------------------------------------------------------------ */
/* 4. Diagnostics                                                      */
/* ------------------------------------------------------------------ */
const BROKEN_CUES: CharacterCue[] = [
  { id: "d-unknown", instanceId: "owl", kind: "action", startFrame: 10, name: "dance" },
  { id: "d-expression", instanceId: "owl", kind: "expression", startFrame: 0, name: "moonwalk" },
  { id: "d-viseme", instanceId: "owl", kind: "viseme", startFrame: 0, endFrame: 20, viseme: "th", precision: "exact" },
  { id: "d-bad", instanceId: "owl", kind: "action", startFrame: 30, name: "point" },
];

function Diagnostics({ frame }: { frame: number }) {
  const state = evaluateCharacter(owlScholarCharacter, owl, BROKEN_CUES, frame);
  return <div style={stage}>
    <div style={panel(false)}>
      <CharacterPresenter assetUrls={assetUrls} definition={owlScholarCharacter} instance={owl} cues={BROKEN_CUES} frame={frame} style={figure} label="Owl scholar with broken cues" />
      <strong>Diagnostics at frame {frame}</strong>
      {state.diagnostics.length === 0
        ? <p style={note}>No diagnostics at this frame.</p>
        : <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
          {state.diagnostics.map((d, i) => <li key={i}><code>{d.code}</code> ({d.severity}): {d.message}</li>)}
        </ul>}
      <p style={note}>Broken cues are reported and skipped; the performer never silently drops a feature into a different pose.</p>
    </div>
  </div>;
}

/* ------------------------------------------------------------------ */
/* 5. Reduced motion                                                   */
/* ------------------------------------------------------------------ */
function ReducedMotion({ frame }: { frame: number }) {
  return <div style={stage}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      <div style={panel(false)}>
        <strong>Motion on</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={pipCharacter} instance={squirrel} cues={CHEERING_SQUIRREL} frame={frame} style={figure} label="Squirrel with motion on" reducedMotion={false} />
        <p style={note}>Idle breathing and blinks run from the seed.</p>
      </div>
      <div style={panel(true)}>
        <strong>Reduced motion</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={pipCharacter} instance={squirrel} cues={CHEERING_SQUIRREL} frame={frame} style={figure} label="Squirrel with reduced motion" reducedMotion />
        <p style={note}>Idle and blinks are suppressed. Actions and expressions still show the same poses.</p>
      </div>
    </div>
  </div>;
}

/* ------------------------------------------------------------------ */

type Args = { frame: number };

const meta: Meta<Args> = {
  title: "Visual / Character Presenter",
  parameters: { layout: "fullscreen" },
  args: { frame: 30 },
  argTypes: { frame: { control: { type: "range", min: 0, max: 240, step: 1 } } },
};
export default meta;
type Story = StoryObj<Args>;

export const TwoIndependentPerformers: Story = {
  name: "Two independent performers",
  render: ({ frame }) => <TwoPerformers frame={frame} />,
};

export const LipSyncPrecision: Story = {
  name: "Beak range and approximate speech",
  render: ({ frame }) => <LipSync frame={frame} />,
  args: { frame: 40 },
};

export const SkinsAndBoundedParams: Story = {
  name: "Bounded params and expressions",
  render: ({ frame }) => <SkinsAndParams frame={frame} wingSpread={1.05} tailSize={1.08} headTilt={4} />,
};

export const Diagnostics_: Story = {
  render: ({ frame }) => <Diagnostics frame={frame} />,
  args: { frame: 25 },
};

export const ReducedMotionComparison: Story = {
  name: "Reduced motion",
  render: ({ frame }) => <ReducedMotion frame={frame} />,
};

/* ------------------------------------------------------------------ */
/* 6. Natural-speed previews and individual clip inspection           */
/* ------------------------------------------------------------------ */

/** Demo playback never modifies the evaluator's clock or uses cumulative per-frame poses. */
function useDemoClock(duration: number) {
  const [playing, setPlaying] = useState(() => typeof matchMedia !== "function" || !matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!playing) return undefined;
    const started = performance.now() - (frame / DEMO_FPS) * 1000;
    let raf = 0;
    const tick = (now: number) => {
      setFrame(Math.floor(Math.max(0, now - started) * DEMO_FPS / 1000) % duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Start time is set on play/resume only; scrubbing is disabled during playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);
  return { playing, setPlaying, frame, setFrame };
}

const controls: CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const playButton: CSSProperties = { padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: "1px solid currentColor", background: "transparent", color: "inherit", font: "600 13px/1.2 var(--km-font-body, system-ui, sans-serif)" };

function PlaybackControls({ clock, duration }: { clock: ReturnType<typeof useDemoClock>; duration: number }) {
  return <div style={controls}>
    <button type="button" onClick={() => clock.setPlaying(p => !p)} style={playButton}>
      {clock.playing ? "Pause" : "Play"}
    </button>
    <label style={{ flex: 1, minWidth: 190, display: "grid", gap: 4, font: "500 13px/1.4 var(--km-font-body, system-ui, sans-serif)" }}>
      Frame {clock.frame} · {(clock.frame / DEMO_FPS).toFixed(1)} / {(duration / DEMO_FPS).toFixed(1)} seconds
      <input type="range" min={0} max={duration - 1} value={clock.frame} disabled={clock.playing} onChange={event => clock.setFrame(Number(event.target.value))} />
    </label>
  </div>;
}

/** A perspective approach, not sideways owl locomotion. Footfall remains a cutout animation, not IK. */
function PerformerStage({ definition, instance, cues, frame, walkStart, walkEnd, looping = false, perspectiveWalk = true, label }: {
  definition: CharacterDefinition; instance: CharacterInstance; cues: CharacterCue[]; frame: number;
  walkStart?: number; walkEnd?: number; looping?: boolean; perspectiveWalk?: boolean; label: string;
}) {
  const character = instance.instanceId === "owl" ? "quill" : "pip";
  const scale = perspectiveWalk ? approachScale(character, frame, walkStart, walkEnd) : 1;
  return <div style={{ position: "relative", height: 318, borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center", background: "linear-gradient(180deg, transparent 66%, rgba(123, 151, 133, .11))" }}>
    <div aria-hidden="true" style={{ position: "absolute", bottom: 12, left: "12%", right: "12%", height: 1, background: "currentColor", opacity: 0.14 }} />
    <div style={{ width: character === "quill" ? "76%" : "96%", maxWidth: character === "quill" ? 255 : 325, transform: `scale(${scale})`, transformOrigin: "50% 100%", opacity: looping ? loopOpacity(frame) : 1 }}>
      <CharacterPresenter assetUrls={assetUrls} definition={definition} instance={instance} cues={cues} frame={frame} label={label} />
    </div>
  </div>;
}

function AnimatedStage() {
  const clock = useDemoClock(DEMO_LOOP_FRAMES);
  const owlCues = useMemo(() => showcaseCues(owlScholarCharacter, "quill"), []);
  const squirrelCues = useMemo(() => showcaseCues(pipCharacter, "pip"), []);
  return <div style={stage}>
    <PlaybackControls clock={clock} duration={DEMO_LOOP_FRAMES} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 12 }}>
      <div style={panel(false)}>
        <strong>Dr. Quill</strong>
        <PerformerStage definition={owlScholarCharacter} instance={owl} cues={owlCues} frame={clock.frame} label="Doctor Quill showing talking, front-facing walking, pointing and nodding" looping />
        <p style={note}>{demoActivity("quill", clock.frame)}</p>
      </div>
      <div style={panel(true)}>
        <strong>Pip</strong>
        <PerformerStage definition={pipCharacter} instance={squirrel} cues={squirrelCues} frame={clock.frame} label="Pip showing front-facing walking, talking, asking a question and cheering" looping />
        <p style={note}>{demoActivity("pip", clock.frame)}</p>
      </div>
    </div>
    <p style={note}>Both performers share a deterministic 30 fps clock. Forward progress is illustrated by a slight perspective approach, with no sideways translation. Legs still use rigid cutouts, not foot-contact IK. Pause to scrub any frame.</p>
  </div>;
}

export const AnimatedPreview: Story = {
  name: "Animated preview (talk, forward walk, gesture)",
  render: () => <AnimatedStage />,
};

const CLIPS = {
  quill: ["idle", "talk", "walk", "point", "wing-open", "think", "wing-curl", "nod"],
  pip: ["idle", "talk", "walk", "point", "wave", "question", "cheer", "tail-flick"],
} as const;

/** Named gestures are inspectable in isolation so walking, mouth and shoulder errors stand out. */
function ClipInspector() {
  const [character, setCharacter] = useState<"quill" | "pip">("quill");
  const [clip, setClip] = useState<string>("walk");
  const definition = character === "quill" ? owlScholarCharacter : pipCharacter;
  const instance = character === "quill" ? owl : squirrel;
  const duration = clip === "talk" ? 98 : clip === "walk" ? actionFrames(definition, "walk") * 3 : clip === "idle" ? 120 : actionFrames(definition, clip) + 12;
  const clock = useDemoClock(duration);
  const cues = useMemo((): CharacterCue[] => {
    if (clip === "idle") return [];
    if (clip === "walk") return forwardWalkCues(definition, instance.instanceId, 0, 3);
    if (clip === "talk") return character === "quill" ? quillBeakSweep(instance.instanceId) : [
      { id: "pip-approximate", instanceId: instance.instanceId, kind: "speech", startFrame: 0, endFrame: duration, precision: "approximate" },
    ];
    return [{ id: `inspect-${clip}`, instanceId: instance.instanceId, kind: "action", startFrame: 0, name: clip }];
  }, [character, clip, definition, duration, instance.instanceId]);
  const chooseCharacter = (next: "quill" | "pip") => { clock.setPlaying(false); clock.setFrame(0); setCharacter(next); setClip("walk"); };
  const chooseClip = (next: string) => { clock.setPlaying(false); clock.setFrame(0); setClip(next); };
  return <div style={stage}>
    <div style={controls}>
      <label>Character <select value={character} onChange={event => chooseCharacter(event.target.value as "quill" | "pip")}><option value="quill">Dr. Quill</option><option value="pip">Pip</option></select></label>
      <label>Animation <select value={clip} onChange={event => chooseClip(event.target.value)}>{CLIPS[character].map(name => <option key={name} value={name}>{name}</option>)}</select></label>
    </div>
    <PlaybackControls clock={clock} duration={duration} />
    <div style={panel(false)}>
      <PerformerStage definition={definition} instance={instance} cues={cues} frame={clock.frame} label={`${character === "quill" ? "Doctor Quill" : "Pip"} ${clip} animation`} walkStart={0} walkEnd={duration} perspectiveWalk={clip === "walk"} />
      <p style={note}>Inspect <strong>{clip}</strong> on its own at 30 fps. {clip === "talk" && character === "quill" ? "Quill's full 25-stage beak sweep is an alignment demo, not spoken audio." : clip === "walk" ? "Forward approach is a story-level perspective cue; feet are not IK-planted." : "All other tracks are at rest."}</p>
    </div>
  </div>;
}

export const AnimationInspector: Story = {
  name: "Animation inspector (one action at a time)",
  render: () => <ClipInspector />,
};
