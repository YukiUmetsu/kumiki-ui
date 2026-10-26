/// <reference types="vite/client" />
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterPresenter } from "../../registry/character/character-presenter-react";
import { evaluateCharacter } from "../../registry/character/evaluate";
import type { CharacterCue, CharacterDefinition, CharacterInstance } from "../../registry/character/definition";
import { doctorQuillCharacter as owlScholarCharacter } from "./fixtures/doctor-quill";
import { pipCharacter } from "./fixtures/pip";

/* Demo fixtures are drawn from user-supplied reference art (see each fixture's provenance).
 * Cues below are hand-authored for review; they are not aligned to any recording. */

/* Raster parts cut from the user-supplied sheets live in src/character/fixtures/<name>-assets/.
 * Each file becomes the asset uri `<name>/<file>`, which the presenter resolves through `assetUrls`. */
const ASSET_FILES = import.meta.glob("./fixtures/*-assets/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const assetUrls: Record<string, string> = Object.fromEntries(Object.entries(ASSET_FILES).map(([path, url]) => {
  const match = /fixtures\/([\w-]+)-assets\/([\w-]+)\.png$/.exec(path);
  return [match ? `${match[1]}/${match[2]}` : path, url];
}));

const owl: CharacterInstance = { instanceId: "owl", characterId: "doctor-quill", revision: "r1", seed: 11 };
const squirrel: CharacterInstance = { instanceId: "squirrel", characterId: "pip", revision: "r1", seed: 27 };

const SLEEPY_OWL: CharacterCue[] = [{ id: "o-sleepy", instanceId: "owl", kind: "expression", startFrame: 0, name: "focused" }];

const SPEAKING_OWL: CharacterCue[] = [
  { id: "o-speech", instanceId: "owl", kind: "speech", startFrame: 0, endFrame: 150, precision: "approximate" },
  { id: "o-point", instanceId: "owl", kind: "action", startFrame: 40, name: "point" },
  { id: "o-face", instanceId: "owl", kind: "expression", startFrame: 0, name: "curious" },
];
const CHEERING_SQUIRREL: CharacterCue[] = [
  { id: "s-cheer", instanceId: "squirrel", kind: "action", startFrame: 20, name: "cheer" },
  { id: "s-speech", instanceId: "squirrel", kind: "speech", startFrame: 0, endFrame: 80, precision: "approximate" },
  { id: "s-face", instanceId: "squirrel", kind: "expression", startFrame: 0, name: "delighted" },
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
        <CharacterPresenter assetUrls={assetUrls} definition={owlScholarCharacter} instance={owl} cues={SPEAKING_OWL} frame={frame} style={figure} label="Owl scholar, speaking, pointing and looking up-right" />
        <p style={note}>Speaking, pointing and expressions run as separate channels on one frame.</p>
      </div>
      <div style={panel(true)}>
        <CharacterPresenter assetUrls={assetUrls} definition={pipCharacter} instance={squirrel} cues={CHEERING_SQUIRREL} frame={frame} style={figure} label="Squirrel explorer, cheering" />
        <p style={note}>Same clock, separate instance: nothing is shared with the owl.</p>
      </div>
    </div>
    <p style={note}>Each performer is evaluated from its own cues. Seeking to any frame gives the same pose as playing up to it.</p>
  </div>;
}

/* ------------------------------------------------------------------ */
/* 2. Lip-sync precision                                               */
/* ------------------------------------------------------------------ */
const EXACT_OWL: CharacterCue[] = [
  { id: "e1", instanceId: "owl", kind: "viseme", startFrame: 0, endFrame: 8, viseme: "closed", precision: "exact" },
  { id: "e2", instanceId: "owl", kind: "viseme", startFrame: 8, endFrame: 16, viseme: "open", precision: "exact" },
  { id: "e3", instanceId: "owl", kind: "viseme", startFrame: 16, endFrame: 24, viseme: "round", precision: "exact" },
  { id: "e4", instanceId: "owl", kind: "viseme", startFrame: 24, endFrame: 32, viseme: "wide", precision: "exact" },
  { id: "e5", instanceId: "owl", kind: "viseme", startFrame: 32, endFrame: 40, viseme: "closed", precision: "exact" },
];
const APPROX_SQUIRREL: CharacterCue[] = [
  { id: "a1", instanceId: "squirrel", kind: "speech", startFrame: 0, endFrame: 40, precision: "approximate" },
];

function LipSync({ frame }: { frame: number }) {
  return <div style={stage}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      <div style={panel(false)}>
        <strong>Exact visemes (owl)</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={owlScholarCharacter} instance={owl} cues={EXACT_OWL} frame={frame} style={figure} label="Owl with exact viseme timing" reducedMotion />
        <p style={note}>Each mouth shape is a whole-face swap chosen from a supplied viseme cue. Silence returns to the neutral face.</p>
      </div>
      <div style={panel(true)}>
        <strong>Approximate speech (squirrel)</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={pipCharacter} instance={squirrel} cues={APPROX_SQUIRREL} frame={frame} style={figure} label="Squirrel with approximate speech cycling" reducedMotion />
        <p style={note}>Word-level timing only: the face cycles through mouth shapes, and the story never claims phoneme accuracy.</p>
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
  name: "Lip-sync precision",
  render: ({ frame }) => <LipSync frame={frame} />,
  args: { frame: 12 },
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
/* 6. Animated preview: talking, walking, gestures                     */
/* ------------------------------------------------------------------ */
const FPS = 30;
const LOOP_FRAMES = 240;

/** Length of an action in frames, from its own phases (so cues stay in step with the rig). */
function actionFrames(definition: CharacterDefinition, name: string): number {
  return definition.actions[name]?.phases.reduce((sum, phase) => sum + Math.max(1, phase.frames), 0) ?? 0;
}

/** Back-to-back action cues that fill [from, to) without overlapping. */
function repeatAction(definition: CharacterDefinition, instanceId: string, name: string, from: number, to: number): CharacterCue[] {
  const span = actionFrames(definition, name);
  if (span === 0) return [];
  const cues: CharacterCue[] = [];
  for (let start = from, n = 0; start + span <= to; start += span, n++) {
    cues.push({ id: `${instanceId}-${name}-${n}`, instanceId, kind: "action", startFrame: start, name });
  }
  return cues;
}

/** A walk: whole cycles of the step and its layers (body bob, arm swing, head counter-bob), all on one length. */
const WALK_LAYERS = ["walk", "bob", "walk-arms", "walk-head"] as const;
function walkCues(definition: CharacterDefinition, instanceId: string, from: number, cycles: number): CharacterCue[] {
  const span = actionFrames(definition, "walk");
  return WALK_LAYERS.flatMap(name => repeatAction(definition, instanceId, name, from, from + span * cycles));
}

/** One exact viseme per step: a mouth pattern timed to the loop. */
function talkCues(instanceId: string, from: number, visemes: readonly string[], step = 4): CharacterCue[] {
  return visemes.map((viseme, i) => ({
    id: `${instanceId}-talk-${from + i * step}`, instanceId, kind: "viseme", startFrame: from + i * step,
    endFrame: from + (i + 1) * step, viseme, precision: "exact",
  }));
}

const OWL_TALK = ["closed", "open", "wide", "round", "open", "closed", "open", "wide", "closed", "round", "open", "closed", "open", "wide", "closed"];
const SQUIRREL_TALK = ["open", "wide", "round", "closed", "open", "wide", "closed", "round", "open", "closed", "wide", "open", "closed", "round", "closed"];

function owlLoop(): CharacterCue[] {
  return [
    ...talkCues("owl", 0, OWL_TALK),
    ...walkCues(owlDefinition, "owl", 60, 2),
    { id: "owl-point", instanceId: "owl", kind: "action", startFrame: 124, name: "point" },
    { id: "owl-curious", instanceId: "owl", kind: "expression", startFrame: 150, name: "curious" },
    { id: "owl-approx", instanceId: "owl", kind: "speech", startFrame: 176, endFrame: 206, precision: "approximate" },
    { id: "owl-delighted", instanceId: "owl", kind: "expression", startFrame: 210, name: "happy" },
    { id: "owl-neutral", instanceId: "owl", kind: "expression", startFrame: 232, name: "neutral" },
  ];
}

function squirrelLoop(): CharacterCue[] {
  const waveEnd = 120 + actionFrames(squirrelDefinition, "wave");
  return [
    ...walkCues(squirrelDefinition, "squirrel", 0, 2),
    ...talkCues("squirrel", 66, SQUIRREL_TALK),
    { id: "squirrel-wave", instanceId: "squirrel", kind: "action", startFrame: 120, name: "wave" },
    { id: "squirrel-cheer", instanceId: "squirrel", kind: "action", startFrame: waveEnd + 4, name: "cheer" },
    { id: "squirrel-delighted", instanceId: "squirrel", kind: "expression", startFrame: 170, name: "delighted" },
    { id: "squirrel-sad", instanceId: "squirrel", kind: "expression", startFrame: 214, name: "sad" },
  ];
}

const owlDefinition = owlScholarCharacter;
const squirrelDefinition = pipCharacter;

/** Plays the loop from the story's own clock. Pausing and scrubbing use the same frame source. */
function AnimatedStage() {
  const [playing, setPlaying] = useState(() => typeof matchMedia !== "function" || !matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!playing) return undefined;
    const started = performance.now() - (frame / FPS) * 1000;
    let raf = 0;
    const tick = (now: number) => {
      setFrame(Math.floor(((now - started) / 1000) * FPS) % LOOP_FRAMES);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // The loop restarts from the frame shown when play is pressed; `frame` is read once on start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const owlCues = owlLoop();
  const squirrelCues = squirrelLoop();
  return <div style={stage}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={{ padding: "6px 14px", borderRadius: 8, font: "600 13px/1.2 var(--km-font-body, system-ui, sans-serif)" }}>
        {playing ? "Pause" : "Play"}
      </button>
      <label style={{ flex: 1, minWidth: 200, display: "grid", gap: 4, font: "500 13px/1.4 var(--km-font-body, system-ui, sans-serif)" }}>
        Frame {frame} of {LOOP_FRAMES} ({(frame / FPS).toFixed(1)} s)
        <input type="range" min={0} max={LOOP_FRAMES - 1} value={frame} disabled={playing} onChange={e => setFrame(Number(e.target.value))} />
      </label>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      <div style={panel(false)}>
        <strong>Owl: talks, walks, points, looks curious</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={owlDefinition} instance={owl} cues={owlCues} frame={frame} style={figure} label="Owl scholar animated preview" />
      </div>
      <div style={panel(true)}>
        <strong>Squirrel: walks, talks, waves, cheers</strong>
        <CharacterPresenter assetUrls={assetUrls} definition={squirrelDefinition} instance={squirrel} cues={squirrelCues} frame={frame} style={figure} label="Squirrel explorer animated preview" />
      </div>
    </div>
    <p style={note}>Both performers share one clock. The story plays frames at 30 fps; the presenter only draws the frame it is given.</p>
  </div>;
}

export const AnimatedPreview: Story = {
  name: "Animated preview (talk, walk, gesture)",
  render: () => <AnimatedStage />,
};
