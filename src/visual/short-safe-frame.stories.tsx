import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShortSafeFrame } from "../../registry/visual/short-safe-frame";
import { inspectSafeFrameSet, safeFrameProfileFromInset } from "../../registry/visual/safe-frame";
import type { SafeFrameDiagnostic, SafeFrameItem, SafeFrameProfile } from "../../registry/visual/safe-frame";
import { ExplainerStage, ExplainerText, ExplainerVisual } from "../../registry/visual/explainer-stage";
import type { ExplainerLayoutResult } from "../../registry/visual/explainer-layout";
import { videoPlatformPreset } from "../../registry/video/platform-presets";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import { FinanceObject2D } from "../../registry/domains/finance-object-2d";
import { BusinessObject2D } from "../../registry/domains/business-object-2d";
import type { Rect } from "../../registry/motion/types";

/* Profiles. "preset" converts the presets' approximate insets; "custom" is
 * hand-authored geometry with interior regions. Neither names a platform. */
const shorts = videoPlatformPreset("youtube-shorts"), landscape = videoPlatformPreset("youtube");
const PROFILES: Record<"preset" | "custom", { portrait: SafeFrameProfile; landscape: SafeFrameProfile }> = {
  preset: {
    portrait: { ...safeFrameProfileFromInset({ id: "portrait-preset", width: shorts.width, height: shorts.height, inset: shorts.safeInset }), label: "Preset insets" },
    landscape: { ...safeFrameProfileFromInset({ id: "landscape-preset", width: landscape.width, height: landscape.height, inset: landscape.safeInset }), label: "Preset insets" },
  },
  custom: {
    portrait: { id: "portrait-custom", label: "Action column + description", width: 1080, height: 1920, padding: 0.06, reserved: [
      { id: "header", edge: "top", rect: { x: 0, y: 0, width: 1, height: 0.07 }, appearance: "header" },
      { id: "progress", edge: "bottom", rect: { x: 0, y: 0.95, width: 1, height: 0.05 }, appearance: "progress" },
      { id: "description", rect: { x: 0, y: 0.74, width: 0.8, height: 0.21 }, appearance: "description", label: "Description" },
      { id: "actions", rect: { x: 0.84, y: 0.4, width: 0.16, height: 0.55 }, appearance: "actions", label: "Actions" },
    ] },
    landscape: { id: "landscape-custom", label: "Player controls", width: 1920, height: 1080, padding: 0.04, reserved: [
      { id: "title", edge: "top", rect: { x: 0, y: 0, width: 1, height: 0.08 }, appearance: "header" },
      { id: "controls", edge: "bottom", rect: { x: 0, y: 0.88, width: 1, height: 0.12 }, appearance: "progress", label: "Controls" },
    ] },
  },
};

/* Three unrelated subject areas, the same two-subject causal beat each. */
type Topic = "technology" | "finance" | "logistics";
const TOPICS: Record<Topic, { a: ReactNode; b: ReactNode; label: string; en: string; ja: string }> = {
  technology: {
    a: <TechnologyObject2D spec={{ id: "ssf-router", kind: "router", title: "Router" }} theme="midnight" width="100%" height="100%" />,
    b: <TechnologyObject2D spec={{ id: "ssf-server", kind: "server-rack", title: "Server" }} theme="midnight" width="100%" height="100%" />,
    label: "A router sending a packet to a server.",
    en: "A router forwards each packet toward its destination address.",
    ja: "ルーターは宛先アドレスに向けて各パケットを転送します。",
  },
  finance: {
    a: <FinanceObject2D spec={{ id: "ssf-savings", kind: "savings-account", title: "Balance" }} theme="midnight" width="100%" height="100%" />,
    b: <FinanceObject2D spec={{ id: "ssf-interest", kind: "interest", title: "Interest" }} theme="midnight" width="100%" height="100%" />,
    label: "A savings balance earning interest.",
    en: "Compound interest grows on the balance, including past interest.",
    ja: "複利では、過去の利息を含む残高に利息が付きます。",
  },
  logistics: {
    a: <BusinessObject2D spec={{ id: "ssf-warehouse", kind: "warehouse", title: "Warehouse" }} theme="midnight" width="100%" height="100%" />,
    b: <BusinessObject2D spec={{ id: "ssf-truck", kind: "delivery-truck", title: "Delivery" }} theme="midnight" width="100%" height="100%" />,
    label: "A warehouse dispatching a delivery truck.",
    en: "Orders leave the warehouse on a scheduled delivery route.",
    ja: "注文品は倉庫から決まった配送ルートで出荷されます。",
  },
};
/* Independently authored framing per orientation — not a crop of each other. */
const REGIONS: Record<"portrait" | "landscape", { a: Rect; b: Rect }> = {
  portrait: { a: { x: 0.12, y: 0.12, width: 0.32, height: 0.18 }, b: { x: 0.5, y: 0.34, width: 0.32, height: 0.18 } },
  landscape: { a: { x: 0.1, y: 0.22, width: 0.2, height: 0.38 }, b: { x: 0.33, y: 0.3, width: 0.2, height: 0.38 } },
};

const sceneBackground = "radial-gradient(120% 90% at 30% 20%, #23324a 0%, #111a29 60%, #0b111c 100%)";
const panelNote: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };

function Connector({ from, to, width, height }: { from: Rect; to: Rect; width: number; height: number }) {
  // Side by side: right edge → left edge. Stacked: bottom edge → top edge.
  const sideBySide = to.x >= from.x + from.width;
  const x1 = (sideBySide ? from.x + from.width : from.x + from.width / 2) * width, y1 = (sideBySide ? from.y + from.height / 2 : from.y + from.height) * height;
  const x2 = (sideBySide ? to.x : to.x + to.width / 2) * width, y2 = (sideBySide ? to.y + to.height / 2 : to.y) * height;
  const curve = sideBySide ? `C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2}` : `C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2}`;
  return <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    <defs><marker id="ssf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" fill="#8fb8ff" /></marker></defs>
    <path d={`M${x1} ${y1}${curve} ${x2} ${y2}`} fill="none" stroke="#8fb8ff" strokeWidth={width / 180} strokeLinecap="round" markerEnd="url(#ssf-arrow)" />
  </svg>;
}

function Output({ profile, topic, lang, guides, onItems }: {
  profile: SafeFrameProfile; topic: Topic; lang: "en" | "ja"; guides: boolean; onItems: (id: string, items: SafeFrameItem[] | string) => void;
}) {
  const orientation = profile.height > profile.width ? "portrait" : "landscape";
  const regions = REGIONS[orientation], content = TOPICS[topic];
  const [items, setItems] = useState<SafeFrameItem[]>();
  const subjects = useMemo(() => [{ id: "a", region: regions.a, portraitRegion: regions.a }, { id: "b", region: regions.b, portraitRegion: regions.b }], [regions]);
  const protect = useMemo(() => ["a", "b"], []);
  const onLayout = useCallback((result: ExplainerLayoutResult) => {
    if (!result.ok) { setItems(undefined); onItems(profile.id, result.diagnostics.map(d => d.message).join(" ")); return; }
    const next: SafeFrameItem[] = [
      { id: "a", kind: "subject", rect: regions.a, critical: true },
      { id: "b", kind: "subject", rect: regions.b, critical: true },
      { id: "caption", kind: "text", rect: result.text.rect },
    ];
    setItems(next); onItems(profile.id, next);
  }, [onItems, profile.id, regions]);
  return <figure style={{ margin: 0, display: "grid", gap: 8, width: "100%", maxWidth: orientation === "portrait" ? 340 : 600 }}>
    <ShortSafeFrame profile={profile} items={items} guides={guides} aria-label={`${profile.label ?? profile.id}: ${content.label}`}
      style={{ containerType: "inline-size", borderRadius: 12, background: sceneBackground }}>
      {frame => <ExplainerStage subjects={subjects} protect={protect} aspect={orientation === "portrait" ? "9:16" : "16:9"}
        safeRegion={frame.text.safeRegion} avoidRegions={frame.text.avoidRegions} gapPx={orientation === "portrait" ? 16 : 20} onLayout={onLayout}>
        <ExplainerVisual role="img" aria-label={content.label}>
          <Connector from={regions.a} to={regions.b} width={profile.width} height={profile.height} />
          {(["a", "b"] as const).map(id => <div key={id} style={{ position: "absolute", left: `${regions[id].x * 100}%`, top: `${regions[id].y * 100}%`, width: `${regions[id].width * 100}%`, height: `${regions[id].height * 100}%` }}>{content[id]}</div>)}
        </ExplainerVisual>
        <ExplainerText lang={lang} maxLines={4} style={{ color: "#f4f7fb", fontWeight: 600, fontSize: orientation === "portrait" ? "5.2cqw" : "2.5cqw", lineHeight: 1.35, textShadow: "0 2px 8px rgba(0,0,0,.55)" }}>
          {content[lang]}
        </ExplainerText>
      </ExplainerStage>}
    </ShortSafeFrame>
    <figcaption style={panelNote}>{profile.width}×{profile.height} · {profile.label}</figcaption>
  </figure>;
}

function Diagnostics({ diagnostics, pending }: { diagnostics: readonly (SafeFrameDiagnostic | { code: string; severity: "error"; message: string })[]; pending: boolean }) {
  const ink = { error: "var(--km-text-danger, #b91c1c)", warning: "var(--km-status-warning, #b45309)" };
  return <div aria-live="polite" style={{ font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    {pending ? <p style={{ margin: 0 }}>Measuring captions…</p> : diagnostics.length === 0
      ? <p style={{ margin: 0, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Both outputs pass: subjects framed, captions clear of reserved UI, no blind crop.</p>
      : <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>{diagnostics.map((d, i) =>
        <li key={i}><strong style={{ color: ink[d.severity] }}>{d.code}</strong> — {d.message}</li>)}</ul>}
  </div>;
}

interface Args { topic: Topic; profiles: "preset" | "custom"; lang: "en" | "ja"; guides: boolean }
function IndependentOutputs({ topic, profiles, lang, guides }: Args) {
  const pair = PROFILES[profiles];
  const [measured, setMeasured] = useState<Record<string, SafeFrameItem[] | string>>({});
  const onItems = useCallback((id: string, items: SafeFrameItem[] | string) =>
    setMeasured(previous => JSON.stringify(previous[id]) === JSON.stringify(items) ? previous : { ...previous, [id]: items }), []);
  const outputs = [pair.portrait, pair.landscape];
  const entries = outputs.map(profile => ({ profile, items: measured[profile.id] }));
  const pending = entries.some(entry => entry.items === undefined);
  const layoutErrors = entries.flatMap(e => typeof e.items === "string"
    ? [{ code: "layout-impossible", severity: "error" as const, message: `${e.profile.id}: ${e.items}` }] : []);
  const set = pending || layoutErrors.length ? undefined
    : inspectSafeFrameSet(entries.map(e => ({ profile: e.profile, items: e.items as SafeFrameItem[] })));
  return <section style={{ padding: 20, display: "grid", gap: 20, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)" }}>
    <header style={{ display: "grid", gap: 4 }}>
      <h2 style={{ margin: 0, font: "600 20px/1.3 var(--km-font-body, system-ui, sans-serif)" }}>Each output composed for its own frame</h2>
      <p style={panelNote}>The caption is measured with the loaded font and placed inside the content area, clear of reserved app UI. Switch the profile to move the reserved regions without changing the scene code.</p>
    </header>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {outputs.map(profile => <Output key={`${profile.id}-${topic}-${lang}`} profile={profile} topic={topic} lang={lang} guides={guides} onItems={onItems} />)}
    </div>
    <Diagnostics pending={pending && !layoutErrors.length} diagnostics={[...layoutErrors, ...(set?.diagnostics ?? [])]} />
  </section>;
}

/* Deliberate failures: a caption in the description area, and a 9:16 that is a
 * centre crop of the 16:9 — both are reported, not silently fixed. */
function Collisions() {
  const portrait = PROFILES.custom.portrait, wide = PROFILES.preset.landscape;
  const wideItems: SafeFrameItem[] = [
    { id: "a", kind: "subject", rect: { x: 0.36, y: 0.24, width: 0.12, height: 0.36 }, critical: true },
    { id: "b", kind: "subject", rect: { x: 0.52, y: 0.3, width: 0.12, height: 0.36 }, critical: true },
  ];
  const f = (1080 / 1920) / (1920 / 1080), crop = (r: Rect): Rect => ({ x: (r.x - (1 - f) / 2) / f, y: r.y, width: r.width / f, height: r.height });
  const tallItems: SafeFrameItem[] = [...wideItems.map(i => ({ ...i, rect: crop(i.rect) })),
    { id: "caption", kind: "text", rect: { x: 0.08, y: 0.78, width: 0.7, height: 0.08 } }];
  const set = inspectSafeFrameSet([{ profile: wide, items: wideItems }, { profile: portrait, items: tallItems }]);
  const box = (items: SafeFrameItem[]) => items.map(i => <div key={i.id} style={{ position: "absolute", left: `${i.rect.x * 100}%`, top: `${i.rect.y * 100}%`, width: `${i.rect.width * 100}%`, height: `${i.rect.height * 100}%`,
    background: i.kind === "text" ? "transparent" : "#3b5b8c", borderRadius: 8, color: "#f4f7fb", font: "600 4cqw/1.3 system-ui, sans-serif" }}>{i.kind === "text" ? "Caption placed by hand" : ""}</div>);
  return <section style={{ padding: 20, display: "grid", gap: 20, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <figure style={{ margin: 0, width: "100%", maxWidth: 600, display: "grid", gap: 8 }}>
        <ShortSafeFrame profile={wide} items={wideItems} guides aria-label="Landscape source composition" style={{ containerType: "inline-size", borderRadius: 12, background: sceneBackground }}>{box(wideItems)}</ShortSafeFrame>
        <figcaption style={panelNote}>Landscape source</figcaption>
      </figure>
      <figure style={{ margin: 0, width: "100%", maxWidth: 340, display: "grid", gap: 8 }}>
        <ShortSafeFrame profile={portrait} items={tallItems} guides aria-label="Portrait made by centre-cropping the landscape, with a caption over the description area" style={{ containerType: "inline-size", borderRadius: 12, background: sceneBackground }}>{box(tallItems)}</ShortSafeFrame>
        <figcaption style={panelNote}>Centre crop + hand-placed caption</figcaption>
      </figure>
    </div>
    <Diagnostics pending={false} diagnostics={set.diagnostics} />
  </section>;
}

const meta = {
  title: "Video production/Short Safe Frame", id: "visual-short-safe-frame", component: IndependentOutputs, parameters: { layout: "fullscreen" },
  argTypes: {
    topic: { control: "inline-radio", options: ["technology", "finance", "logistics"] },
    profiles: { control: "inline-radio", options: ["preset", "custom"] },
    lang: { control: "inline-radio", options: ["en", "ja"] },
  },
  args: { topic: "technology", profiles: "custom", lang: "en", guides: true },
} satisfies Meta<typeof IndependentOutputs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const IndependentOutputsStory: Story = { name: "Independent outputs" };
export const CollisionsStory: Story = { name: "Collisions and blind crop", render: () => <Collisions /> };
