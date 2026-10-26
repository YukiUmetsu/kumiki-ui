import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileCutPlan, evaluateCutPlan } from "../../registry/motion/cut-director";
import type { CutPlanSpec, CutScene, CutShotSpec, CutTransitionSpec } from "../../registry/motion/cut-director";
import { CutStage } from "../../registry/motion/cut-stage";
import { frameCameraSubject } from "../../registry/motion/camera";
import type { Rect } from "../../registry/motion/types";
import { inspectSeekParity } from "../../registry/visual/explainer-principles";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import type { TechnologyObjectKind } from "../../registry/domains/technology-object-model";

/* Two worlds, arranged separately for each orientation (a row for 16:9, a column for 9:16).
 * "server" exists in both worlds, so a match cut can carry it across. */
type Orientation = "portrait" | "landscape";
const SCENE_SETS: Record<Orientation, CutScene[]> = {
  landscape: [
    { id: "network", subjects: { laptop: { x: 120, y: 360, width: 240, height: 200 }, router: { x: 660, y: 360, width: 240, height: 200 }, server: { x: 1220, y: 320, width: 240, height: 240 } } },
    { id: "datacenter", subjects: { server: { x: 300, y: 300, width: 240, height: 240 }, database: { x: 800, y: 310, width: 220, height: 220 },
      storage: { x: 1180, y: 310, width: 220, height: 220 }, cabinet: { x: 1500, y: 120, width: 160, height: 640 } } },
  ],
  portrait: [
    { id: "network", subjects: { laptop: { x: 330, y: 120, width: 240, height: 200 }, router: { x: 330, y: 540, width: 240, height: 200 }, server: { x: 330, y: 960, width: 240, height: 240 } } },
    { id: "datacenter", subjects: { server: { x: 330, y: 120, width: 240, height: 240 }, database: { x: 340, y: 560, width: 220, height: 220 },
      storage: { x: 340, y: 960, width: 220, height: 220 }, cabinet: { x: 700, y: 60, width: 160, height: 1300 } } },
  ],
};
const KINDS: Record<string, TechnologyObjectKind> = { laptop: "laptop", router: "router", server: "server-rack", database: "database", storage: "storage-disk" };
const union = (scenes: readonly CutScene[], scene: string, ids: string[]): Rect => {
  const rects = ids.map(id => scenes.find(s => s.id === scene)!.subjects[id]);
  const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
  return { x, y, width: Math.max(...rects.map(r => r.x + r.width)) - x, height: Math.max(...rects.map(r => r.y + r.height)) - y };
};

function buildSpec(output: { width: number; height: number }): CutPlanSpec {
  const scenes = SCENE_SETS[output.height > output.width ? "portrait" : "landscape"];
  const fit = (scene: string, ids: string[], padding: number) => frameCameraSubject(union(scenes, scene, ids), output, { padding });
  const shot = (id: string, sceneId: string, durationFrames: number, subjectIds: string[], start: ReturnType<typeof fit>, end?: ReturnType<typeof fit>): CutShotSpec =>
    ({ id, sceneId, durationFrames, subjectIds, camera: { start, end } });
  const network = ["laptop", "router", "server"], datacenter = ["server", "database", "storage"];
  const shots = [
    shot("establish", "network", 90, network, fit("network", network, 0.1), fit("network", network, 0.06)),
    shot("server-close", "network", 60, ["server"], fit("network", ["server"], 0.1)),
    shot("reveal", "datacenter", 90, ["server"], fit("datacenter", ["server"], 0.1), fit("datacenter", datacenter, 0.08)),
    shot("database-close", "datacenter", 60, ["database"], fit("datacenter", ["database"], 0.12), fit("datacenter", ["database"], 0.08)),
    shot("network-return", "network", 60, network, fit("network", network, 0.08)),
    shot("summary", "datacenter", 60, datacenter, fit("datacenter", datacenter, 0.1), fit("datacenter", datacenter, 0.07)),
  ];
  const transitions: CutTransitionSpec[] = [
    { kind: "punch-in", durationFrames: 16, matchSubjectId: "server" },
    { kind: "match-cut", matchSubjectId: "server" },
    { kind: "whip", durationFrames: 14, direction: "right" },
    { kind: "wipe", durationFrames: 18, axis: "left-to-right", foreground: { subjectId: "cabinet", widthFraction: 0.16 }, reducedMotion: "dissolve" },
    { kind: "dissolve", durationFrames: 20 },
  ];
  return { id: `cuts-${output.width}x${output.height}`, fps: { num: 30, den: 1 }, output, scenes, shots, transitions };
}

/* ---------------- world renderers (scene content animates on the shot-local frame) ---------------- */
function World({ scenes, sceneId, localFrame, shotId }: { scenes: readonly CutScene[]; sceneId: string; localFrame: number; shotId: string }) {
  const scene = scenes.find(s => s.id === sceneId)!, column = scenes === SCENE_SETS.portrait;
  const pattern = `grid-${sceneId}`;
  const object = (id: string) => { const r = scene.subjects[id]; return KINDS[id] ? <TechnologyObject2D key={id} x={r.x} y={r.y} width={r.width} height={r.height}
    spec={{ id: `cut-${sceneId}-${id}`, kind: KINDS[id], title: id === "storage" ? "Storage" : id[0].toUpperCase() + id.slice(1) }} theme="midnight" /> : null; };
  // Row layouts link side to side; column layouts link bottom to top.
  const ends = (a: string, b: string) => { const p = scene.subjects[a], q = scene.subjects[b];
    return column ? { x1: p.x + p.width / 2, y1: p.y + p.height, x2: q.x + q.width / 2, y2: q.y } : { x1: p.x + p.width, y1: p.y + p.height / 2, x2: q.x, y2: q.y + q.height / 2 }; };
  const link = (a: string, b: string) => <line key={`${a}-${b}`} {...ends(a, b)} stroke="#8fc8ff" strokeOpacity={0.4} strokeWidth={6} strokeDasharray="6 16" strokeLinecap="round" />;
  // A packet travels router → server during the establishing shot, using only the shot-local frame.
  const t = shotId === "establish" ? Math.min(1, localFrame / 70) : shotId === "network-return" ? 1 : -1;
  const path = sceneId === "network" ? ends("router", "server") : undefined;
  return <g>
    <defs><pattern id={pattern} width={80} height={80} patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="#2a3a55" strokeWidth={2} /></pattern></defs>
    <rect x={-3000} y={-3000} width={7600} height={6900} fill={sceneId === "network" ? "#0f1828" : "#141a2b"} />
    <rect x={-3000} y={-3000} width={7600} height={6900} fill={`url(#${pattern})`} opacity={0.6} />
    {column ? null : <rect x={40} y={600} width={1520} height={8} rx={4} fill="#2a3a55" />}
    {sceneId === "network" ? [link("laptop", "router"), link("router", "server")] : [link("server", "database"), link("database", "storage")]}
    {Object.keys(scene.subjects).map(object)}
    {path && t >= 0 ? <circle cx={path.x1 + (path.x2 - path.x1) * t} cy={path.y1 + (path.y2 - path.y1) * t} r={14} fill="#ffd166" /> : null}
  </g>;
}
const Cabinet = (rect: Rect) => <g>
  <rect {...rect} fill="#0a0f19" stroke="#2f405e" strokeWidth={4} />
  {Array.from({ length: 10 }, (_, i) => <g key={i}>
    <rect x={rect.x + rect.width * 0.14} y={rect.y + 60 + i * (rect.height - 120) / 10} width={rect.width * 0.72} height={(rect.height - 120) / 10 - 18} rx={6} fill="#141e30" />
    <circle cx={rect.x + rect.width * 0.24} cy={rect.y + 60 + i * (rect.height - 120) / 10 + ((rect.height - 120) / 10 - 18) / 2} r={6} fill={i % 3 ? "#3ddc97" : "#ffd166"} />
  </g>)}
</g>;

/* ---------------- story chrome ---------------- */
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
function usePlayback(duration: number, initial: number) {
  const [frame, setFrame] = useState(initial);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= duration - 1 ? 0 : frame;
    const tick = (time: number) => { origin ??= time; const next = from + Math.floor((time - origin) * 30 / 1000);
      if (next >= duration) { setFrame(duration - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  return { frame, playing, toggle: () => setPlaying(p => !p), seek: (f: number) => { setPlaying(false); setFrame(f); } };
}
function Panel({ children }: { children: ReactNode }) {
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>{children}</section>;
}

interface Args { output: "portrait" | "landscape"; transitions: "authored" | "cuts"; reducedMotion: boolean; startFrame: number }
function CutDirectorDemo({ output, transitions, reducedMotion, startFrame }: Args) {
  const size = output === "portrait" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
  const compiled = useMemo(() => compileCutPlan(buildSpec(size)), [output]); // eslint-disable-line react-hooks/exhaustive-deps -- size derives from output
  const duration = compiled.ok ? compiled.plan.durationFrames : 1;
  const { frame, playing, toggle, seek } = usePlayback(duration, startFrame);
  const parity = useMemo(() => compiled.ok ? inspectSeekParity(() => f => evaluateCutPlan(compiled.plan, f, { transitions, reducedMotion }), { durationFrames: duration, sampleCount: 60, seed: 4 }) : undefined,
    [compiled, transitions, reducedMotion, duration]);
  const state = compiled.ok ? evaluateCutPlan(compiled.plan, frame, { transitions, reducedMotion }) : undefined;
  return <Panel>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <figure style={{ margin: 0, width: "100%", maxWidth: output === "portrait" ? 340 : 620, display: "grid", gap: 8 }}>
        {compiled.ok ? <CutStage plan={compiled.plan} frame={frame} transitions={transitions} reducedMotion={reducedMotion} style={{ borderRadius: 12 }}
          ariaLabel="A laptop, router and server; the camera punches in on the server, match-cuts to a data centre, whips to a database, wipes back to the network and dissolves to a summary."
          renderScene={(sceneId, ctx) => <World scenes={compiled.plan.spec.scenes} sceneId={sceneId} localFrame={ctx.localFrame} shotId={ctx.shotId} />}
          renderForeground={(_, rect) => Cabinet(rect)} /> : null}
        <figcaption style={note}>{size.width}×{size.height} · cameras fitted per output</figcaption>
      </figure>
      <div style={{ display: "grid", gap: 12, flex: "1 1 300px", minWidth: 260 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={toggle} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
          <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame} / {duration - 1}</span>
        </div>
        <label style={{ display: "grid", gap: 4, fontWeight: 500, fontSize: 13 }}>Seek
          <input type="range" min={0} max={duration - 1} value={frame} onChange={e => seek(Number(e.target.value))} /></label>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 12px" }}>
          <dt style={{ fontWeight: 600 }}>Shot</dt><dd style={{ margin: 0 }}>{state?.shotId}{state ? ` (${state.layers.map(l => `${l.shotId}@${l.localFrame}`).join(" under ")})` : ""}</dd>
          <dt style={{ fontWeight: 600 }}>Transition</dt><dd style={{ margin: 0 }}>{state?.transition ? `${state.transition.kind}${state.transition.kind !== state.transition.authoredKind ? ` (authored ${state.transition.authoredKind})` : ""} · ${Math.round(state.transition.progress * 100)}%` : "—"}</dd>
          <dt style={{ fontWeight: 600 }}>Seek parity</dt><dd style={{ margin: 0 }}>{parity ? `${parity.frames.length} frames in random order ${parity.ok ? "equal forward play" : "DIFFER"}` : "—"}</dd>
        </dl>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 2 }}>
          {compiled.ok ? compiled.plan.transitions.map(t => <li key={t.index} style={{ fontWeight: state?.transition?.index === t.index ? 700 : 400 }}>
            {t.fromShotId} → {t.toShotId}: {t.kind}{t.spec.matchSubjectId ? ` on ${t.spec.matchSubjectId}` : ""} · frames {t.startFrame}–{t.endFrame}</li>) : null}
        </ol>
        {compiled.diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{compiled.diagnostics.map((d, i) =>
          <li key={i}><strong style={{ color: d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)" }}>{d.code}</strong> — {d.message}</li>)}</ul>
          : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Identity and framing checks pass at every boundary.</p>}
      </div>
    </div>
  </Panel>;
}

/* Plans CutDirector refuses, with the reason. */
function IdentityErrors() {
  const output = { width: 1080, height: 1920 };
  const base = buildSpec(output);
  const cases: [string, CutPlanSpec][] = [
    ["Punch-in that changes scene", { ...base, transitions: base.transitions.map((t, i) => i === 1 ? { kind: "punch-in", durationFrames: 12 } : t) }],
    ["Match cut that moves the subject", { ...base, shots: base.shots.map(s => s.id === "reveal" ? { ...s, camera: { ...s.camera, start: frameCameraSubject(union(base.scenes, "datacenter", ["server", "database"]), output, { padding: 0.1 }) } } : s) }],
    ["Critical subject cropped", { ...base, shots: base.shots.map(s => s.id === "server-close" ? { ...s, subjectIds: ["server", "router"] } : s) }],
    ["Transition longer than its shot", { ...base, transitions: base.transitions.map((t, i) => i === 4 ? { kind: "dissolve", durationFrames: 70 } : t) }],
  ];
  return <Panel>
    {cases.map(([title, spec]) => { const result = compileCutPlan(spec);
      return <div key={title} style={{ display: "grid", gap: 4 }}>
        <strong>{title}</strong>
        <ul style={{ margin: 0, paddingLeft: 20 }}>{result.diagnostics.filter(d => d.severity === "error").map((d, i) =>
          <li key={i}><code>{d.code}</code> — {d.message}</li>)}</ul>
      </div>; })}
  </Panel>;
}

const meta = {
  title: "Video production/Cut Director", id: "motion-cut-director", component: CutDirectorDemo, parameters: { layout: "fullscreen" },
  argTypes: {
    output: { control: "inline-radio", options: ["portrait", "landscape"] },
    transitions: { control: "inline-radio", options: ["authored", "cuts"] },
    startFrame: { control: { type: "number", min: 0, max: 419 } },
  },
  args: { output: "portrait", transitions: "authored", reducedMotion: false, startFrame: 82 },
} satisfies Meta<typeof CutDirectorDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Transitions: Story = {};
export const IdentityErrorsStory: Story = { name: "Identity errors", render: () => <IdentityErrors /> };
