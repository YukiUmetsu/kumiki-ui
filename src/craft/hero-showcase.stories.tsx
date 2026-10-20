import { useCallback, useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroRenderOptions } from "../../registry/craft/hero-render";
import type { SculptFinish } from "../../registry/craft/sculpt-finish";
import { heroCatalog, heroCatalogEntry } from "../../registry/domains/hero-catalog";
import type { HeroDomain } from "../../registry/domains/hero-catalog";

const DOMAIN_COLOR: Record<HeroDomain, string> = {
  finance: "#e7c26b", technology: "#6aa8ff", privacy: "#7fd6b0", people: "#f08f7a", scene: "#c49cff",
};
const font = "Geist, Inter, system-ui, sans-serif";
const panel = { background: "#141920", border: "1px solid #232b36", borderRadius: 14 } as const;

function Chip({ children, color }: { children: string; color?: string }) {
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12, letterSpacing: ".04em",
    background: color ? color + "22" : "#1e2530", color: color ?? "#aab6c2", border: `1px solid ${color ? color + "55" : "#2a3340"}` }}>{children}</span>;
}

function Button({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active}
    style={{ font: `500 13px ${font}`, padding: "7px 12px", borderRadius: 9, cursor: "pointer", color: active ? "#0d1117" : "#dbe3ec",
      background: active ? "#e8edf2" : "#1b222c", border: `1px solid ${active ? "#e8edf2" : "#2a3340"}` }}>{children}</button>;
}

/** One asset: viewer, turntable, zoom, quality and every signature action with play/scrub. */
function HeroShowcase({ kind, finish }: { kind: string; finish?: SculptFinish }) {
  const entry = heroCatalogEntry(kind);
  const [asset, setAsset] = useState<HeroAsset | null>(null);
  const [azimuth, setAzimuth] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [quality, setQuality] = useState<"preview" | "final">("preview");
  const [action, setAction] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const create = useCallback(() => entry.create({ id: "showcase-" + entry.kind, finish }), [entry, finish]);
  useEffect(() => { setAction(null); setFrame(0); setPlaying(false); }, [kind, finish]);
  const spec = asset?.actions?.find(a => a.id === action);
  useEffect(() => {
    if (!playing || !spec) return;
    let raf = 0, last = performance.now(), acc = 0;
    const tick = (now: number) => {
      acc += (now - last) / (1000 / 30); last = now;
      if (acc >= 1) {
        const step = Math.floor(acc); acc -= step;
        setFrame(f => {
          const next = f + step;
          if (next < spec.durationFrames) return next;
          if (spec.loop) return next % spec.durationFrames;
          setPlaying(false); return spec.durationFrames - 1;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, spec]);
  // Final quality while scrubbing/playing would be slow: fewer samples during playback.
  const render: HeroRenderOptions | undefined = useMemo(() => quality === "final"
    ? { quality: "final", samples: playing ? 2 : 8, motionBlur: spec && !playing ? { shutter: .5 } : undefined }
    : undefined, [quality, playing, spec]);
  const play = (id: string) => { setAction(id); setFrame(0); setPlaying(true); };
  return <main style={{ background: "#0d1117", minHeight: "100vh", padding: 20, color: "#e8edf2", fontFamily: font }}>
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 650, letterSpacing: "-.01em" }}>{entry.title}</h1>
        <Chip color={DOMAIN_COLOR[entry.domain]}>{entry.domain}</Chip>
        {asset ? <Chip>{`1 unit = ${asset.metersPerUnit >= 1 ? asset.metersPerUnit + " m" : Math.round(asset.metersPerUnit * 1000) + " mm"}`}</Chip> : null}
        {finish ? <Chip>{finish}</Chip> : null}
        <p style={{ margin: 0, color: "#9aa7b4", flexBasis: "100%" }}>{entry.meaning}</p>
      </header>
      <div style={{ ...panel, overflow: "hidden" }}>
        <HeroAssetViewer createAsset={create} width={1280} height={720} azimuth={azimuth} elevation={12} zoom={zoom}
          action={action} actionFrame={frame} onAsset={setAsset} render={render} />
      </div>
      <section style={{ ...panel, padding: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#7d8a98", fontSize: 12, width: 64 }}>ACTIONS</span>
          <Button active={action === null} onClick={() => { setAction(null); setPlaying(false); }}>Rest</Button>
          {(asset?.actions ?? []).map(a => <Button key={a.id} active={action === a.id} onClick={() => play(a.id)}>{a.label}</Button>)}
        </div>
        {spec ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button onClick={() => { if (frame >= spec.durationFrames - 1) setFrame(0); setPlaying(p => !p); }}>{playing ? "Pause" : "Play"}</Button>
          <input type="range" aria-label="Action frame" min={0} max={spec.durationFrames - 1} value={frame} style={{ flex: 1 }}
            onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} />
          <span style={{ fontVariantNumeric: "tabular-nums", color: "#9aa7b4", fontSize: 13, width: 70 }}>{frame} / {spec.durationFrames - 1}</span>
        </div> : null}
        {spec ? <p style={{ margin: 0, color: "#9aa7b4", fontSize: 14 }}>{spec.meaning}{spec.loop ? " (loops)" : ""}</p> : null}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#9aa7b4" }}>Turntable
            <input type="range" min={-180} max={180} value={azimuth} onChange={e => setAzimuth(Number(e.target.value))} /></label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#9aa7b4" }}>Zoom
            <input type="range" min={.8} max={4} step={.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
          <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#9aa7b4" }}>Quality
            <Button active={quality === "preview"} onClick={() => setQuality("preview")}>Preview</Button>
            <Button active={quality === "final"} onClick={() => setQuality("final")}>Final (AO · 8× AA · motion blur)</Button></span>
        </div>
      </section>
      {asset ? <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div style={{ ...panel, padding: 14 }}><h2 style={{ margin: "0 0 8px", fontSize: 13, color: "#7d8a98", letterSpacing: ".06em" }}>MATERIALS</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#c9d3dd", lineHeight: 1.6, fontSize: 14 }}>{asset.craft.materials.map(m => <li key={m}>{m}</li>)}</ul></div>
        <div style={{ ...panel, padding: 14 }}><h2 style={{ margin: "0 0 8px", fontSize: 13, color: "#7d8a98", letterSpacing: ".06em" }}>CONSTRUCTION DETAILS</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#c9d3dd", lineHeight: 1.6, fontSize: 14 }}>{asset.craft.details.map(d => <li key={d}>{d}</li>)}</ul>
          {asset.craft.stylization ? <p style={{ color: "#9aa7b4", fontSize: 13, marginBottom: 0 }}>{asset.craft.stylization}</p> : null}</div>
      </section> : null}
    </div>
  </main>;
}

/** Browse every crafted asset from one page (one WebGL context at a time). */
function HeroBrowser() {
  const [kind, setKind] = useState("bull-market");
  const groups = heroCatalog().reduce<Record<string, string[]>>((acc, e) => { (acc[e.domain] ??= []).push(e.kind); return acc; }, {});
  return <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", background: "#0d1117", minHeight: "100vh", fontFamily: font }}>
    <nav aria-label="Hero assets" style={{ borderRight: "1px solid #232b36", padding: 16, display: "grid", alignContent: "start", gap: 14 }}>
      {Object.entries(groups).map(([domain, kinds]) => <div key={domain} style={{ display: "grid", gap: 4 }}>
        <span style={{ color: DOMAIN_COLOR[domain as HeroDomain], fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>{domain}</span>
        {kinds.map(k => <button key={k} type="button" onClick={() => setKind(k)} aria-current={k === kind}
          style={{ textAlign: "left", font: `500 14px ${font}`, padding: "6px 8px", borderRadius: 8, cursor: "pointer", border: 0,
            background: k === kind ? "#1e2733" : "transparent", color: k === kind ? "#fff" : "#aab6c2" }}>{heroCatalogEntry(k).title}</button>)}
      </div>)}
    </nav>
    <HeroShowcase kind={kind} />
  </div>;
}

const meta = { title: "Craft/Hero Assets", component: HeroShowcase, parameters: { layout: "fullscreen" },
  argTypes: { kind: { control: "select", options: heroCatalog().map(e => e.kind) } } } satisfies Meta<typeof HeroShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllAssets: Story = { args: { kind: "bull-market" }, render: () => <HeroBrowser /> };
export const BullMarket: Story = { args: { kind: "bull-market" } };
export const BullNatural: Story = { args: { kind: "bull-market", finish: "natural" } };
export const BearMarket: Story = { args: { kind: "bear-market" } };
export const BearNatural: Story = { args: { kind: "bear-market", finish: "natural" } };
export const CashStack: Story = { args: { kind: "cash-stack" } };
export const Banknote: Story = { args: { kind: "banknote" } };
export const Coins: Story = { args: { kind: "coins" } };
export const GoldBars: Story = { args: { kind: "gold-bars" } };
export const MoneyBag: Story = { args: { kind: "money-bag" } };
export const PaymentCards: Story = { args: { kind: "credit-card" } };
export const Bank: Story = { args: { kind: "bank" } };
export const Laptop: Story = { args: { kind: "laptop" } };
export const Smartphone: Story = { args: { kind: "smartphone" } };
export const ServerRack: Story = { args: { kind: "server-rack" } };
export const Padlock: Story = { args: { kind: "padlock" } };
export const SecurityShield: Story = { args: { kind: "security-shield" } };
export const Presenter: Story = { args: { kind: "presenter" } };
export const PresenterWithPhone: Story = { args: { kind: "presenter-with-phone" } };
export const SceneDeskPayments: Story = { args: { kind: "scene-desk-payments" } };
export const SceneStreetBank: Story = { args: { kind: "scene-street-bank" } };
export const SceneVaultReserves: Story = { args: { kind: "scene-vault-reserves" } };
