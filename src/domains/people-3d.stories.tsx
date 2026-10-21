import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { GltfHeroFactory } from "../../registry/craft/hero-gltf";
import { loadPerson3D } from "../../registry/domains/people-3d";
import { PEOPLE_3D, personSpec, personWalkSpeed } from "../../registry/domains/people-model";
import type { PersonKind } from "../../registry/domains/people-model";

/** Realistic rigged people with playable actions. Capture a frozen frame from the URL:
 * ?kmPerson=contractor&kmAz=30&kmEl=8&kmZoom=1&kmTarget=x,y,z&kmAction=walk&kmActionFrame=12
 * Provenance: assets/THIRD_PARTY_ASSETS.json. */
const MODEL_URLS: Record<string, string> = {
  "rocketbox-female-adult-01.glb": new URL("../../assets/models/people/rocketbox-female-adult-01.glb", import.meta.url).href,
  "rocketbox-construction-male-04.glb": new URL("../../assets/models/people/rocketbox-construction-male-04.glb", import.meta.url).href,
};
const param = (name: string) => new URLSearchParams(window.location.search).get(name);
const num = (name: string, fallback: number) => { const v = Number(param(name)); return param(name) !== null && Number.isFinite(v) ? v : fallback; };
const font = "Geist, system-ui, sans-serif";
const chip = (active: boolean): CSSProperties => ({ font: `500 14px ${font}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer",
  border: `1px solid ${active ? "#7aa7ff" : "#2c3642"}`, background: active ? "#1d2a3d" : "#141a21", color: active ? "#fff" : "#c9d3dd" });

function Person3D({ person }: { person: PersonKind }) {
  const requested = param("kmPerson");
  const kind = PEOPLE_3D.some(p => p.kind === requested) ? requested as PersonKind : person;
  const spec = personSpec(kind);
  // A URL action freezes that frame for capture; otherwise the buttons drive live playback.
  const captured = param("kmAction");
  const [factory, setFactory] = useState<GltfHeroFactory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(captured);
  const [frame, setFrame] = useState(num("kmActionFrame", 0));
  const [playing, setPlaying] = useState(captured === null);
  useEffect(() => {
    let live = true, loaded: GltfHeroFactory | null = null;
    setFactory(null);
    loadPerson3D(kind, { resolveUrl: file => MODEL_URLS[file] })
      .then(f => { loaded = f; if (live) setFactory(() => f); else f.release(); })
      .catch(cause => live && setError(cause instanceof Error ? cause.message : String(cause)));
    return () => { live = false; loaded?.release(); };
  }, [kind]);
  const clip = factory?.actions.find(a => a.id === action);
  useEffect(() => {
    if (!clip || !playing) return;
    let raf = 0;
    const start = performance.now() - frame * 1000 / 30;
    const tick = (now: number) => {
      setFrame(Math.floor((now - start) * 30 / 1000) % clip.durationFrames);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Restart only when the clip or play state changes; `frame` is the resume point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip, playing]);
  const choose = (next: string | null) => { setAction(next); setFrame(0); setPlaying(next !== null); };
  const target = param("kmTarget")?.split(",").map(Number) as [number, number, number] | undefined;
  return <main style={{ background: "#0d1014", minHeight: "100vh", padding: 16, color: "#e8edf2", fontFamily: font }}>
    <div data-km-video-capture="" style={{ width: "min(100%, 1280px)", margin: "0 auto", aspectRatio: "16 / 9", display: "grid" }}>
      {error ? <p role="alert" style={{ placeSelf: "center", color: "#f08f7a" }}>{error}</p>
        : factory ? <HeroAssetViewer createAsset={factory} width={1280} height={720}
          azimuth={num("kmAz", 30)} elevation={num("kmEl", 8)} zoom={num("kmZoom", 1)}
          target={target?.length === 3 && target.every(Number.isFinite) ? target : undefined}
          action={action} actionFrame={frame} ariaLabel={`${spec.title}${clip ? `, ${clip.label}` : ", resting"}`} />
        : <p role="status" style={{ placeSelf: "center", color: "#7d8a98" }}>Loading model…</p>}
    </div>
    <section aria-label="Actions" style={{ maxWidth: 1280, margin: "14px auto 0", display: "grid", gap: 12 }}>
      <div role="group" aria-label="Action" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" aria-pressed={action === null} style={chip(action === null)} onClick={() => choose(null)}>Rest</button>
        {(factory?.actions ?? []).map(a => <button key={a.id} type="button" aria-pressed={action === a.id} style={chip(action === a.id)}
          title={a.meaning} onClick={() => choose(a.id)}>{a.label}</button>)}
      </div>
      {clip ? <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" style={chip(false)} onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</button>
        <label style={{ display: "flex", gap: 10, alignItems: "center", flex: "1 1 280px", fontSize: 14, color: "#aab6c2" }}>
          Frame
          <input type="range" min={0} max={clip.durationFrames - 1} value={frame} style={{ flex: 1 }}
            onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} />
          <output style={{ fontVariantNumeric: "tabular-nums", minWidth: "8ch", textAlign: "right" }}>{frame} / {clip.durationFrames - 1}</output>
        </label>
      </div> : null}
      <p style={{ margin: 0, fontSize: 14, color: "#aab6c2", lineHeight: 1.5 }}>
        <strong style={{ color: "#e8edf2" }}>{spec.title}</strong> · {clip ? clip.meaning : spec.meaning}
        {action === "walk" ? <> Travel speed {personWalkSpeed(kind).toFixed(2)} m/s ({spec.walk.metersPerCycle} m per {spec.walk.seconds} s cycle).</> : null}
        <br />{spec.license} ({spec.source}), converted to GLB.
      </p>
    </section>
  </main>;
}

const meta = { title: "Domains/People 3D", component: Person3D, parameters: { layout: "fullscreen" },
  argTypes: { person: { control: "select", options: PEOPLE_3D.map(p => p.kind) } } } satisfies Meta<typeof Person3D>;
export default meta;
export const CasualAdult: StoryObj<typeof meta> = { args: { person: "casual-adult" } };
export const Contractor: StoryObj<typeof meta> = { args: { person: "contractor" } };
