import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileShortHook, SHORT_HOOK_STRATEGIES } from "../../registry/visual/short-hook-director";
import type { HookRoles, ShortHookCompilation, ShortHookStrategy } from "../../registry/visual/short-hook-director";
import { AnimationGroup } from "../../registry/motion/director-authoring";
import { compileMotionDirector, evaluateMotionDirector } from "../../registry/motion/motion-director";
import type { DirectorAnimation, MotionDirection } from "../../registry/motion/director-types";
import { MotionDirector } from "../../registry/motion/motion-director-react";
import type { MotionSample, MotionValue, Rect } from "../../registry/motion/types";
import { inspectExplainerPrinciples, inspectSeekParity } from "../../registry/visual/explainer-principles";
import type { ExplainerPrinciplesManifest, PrincipledProduction, PrincipleFact } from "../../registry/visual/explainer-principles";
import { ShortSafeFrame } from "../../registry/visual/short-safe-frame";
import type { SafeFrameProfile } from "../../registry/visual/safe-frame";
import { CaptionPerformer } from "../../registry/visual/caption-performer";
import type { CaptionDiagnostic, CaptionTrack } from "../../registry/visual/caption-track";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import { FinanceObject2D } from "../../registry/domains/finance-object-2d";
import { BusinessObject2D } from "../../registry/domains/business-object-2d";

/* One 15-second vertical explainer per topic: hook (0–90) → mechanism (90–300) → payoff (300–450).
 * Only the opening changes; body, payoff and captions after the hook are shared. */
const FPS = { num: 30, den: 1 }, TOTAL = 450, HOOK = 90;
const PROFILE: SafeFrameProfile = { id: "portrait", label: "Action column + description", width: 1080, height: 1920, padding: 0.06, reserved: [
  { id: "header", edge: "top", rect: { x: 0, y: 0, width: 1, height: 0.07 }, appearance: "header" },
  { id: "progress", edge: "bottom", rect: { x: 0, y: 0.95, width: 1, height: 0.05 }, appearance: "progress" },
  { id: "description", rect: { x: 0, y: 0.74, width: 0.8, height: 0.21 }, appearance: "description", label: "Description" },
  { id: "actions", rect: { x: 0.84, y: 0.4, width: 0.16, height: 0.55 }, appearance: "actions", label: "Actions" },
] };
const LAYOUT: Record<string, Rect> = {
  a: { x: 0.1, y: 0.12, width: 0.3, height: 0.17 },
  b: { x: 0.52, y: 0.12, width: 0.3, height: 0.17 },
  traveler: { x: 0.4, y: 0.185, width: 0.12, height: 0.04 },
  flow: { x: 0.4, y: 0.185, width: 0.12, height: 0.04 },
  card: { x: 0.1, y: 0.34, width: 0.72, height: 0.17 },
};

type Topic = "technology" | "finance" | "logistics";
type Opening = "action-first" | "impact-statistic" | "evidence-question";
interface TopicContent {
  a: ReactNode; b: ReactNode; traveler: string;
  claim: { id: string; concept: string; claim: string };
  fact: PrincipleFact & { display: string; caption: string };
  evidence: { lines: string[]; focusLine: number; caption: string };
  actionCaption: string; mechanismCaption: string; payoffCaption: string; payoffCard: string;
  summary: string;
}
const obj = (node: ReactNode) => node;
const TOPICS: Record<Topic, TopicContent> = {
  technology: {
    a: obj(<TechnologyObject2D spec={{ id: "hk-router", kind: "router", title: "Router" }} theme="midnight" width="100%" height="100%" />),
    b: obj(<TechnologyObject2D spec={{ id: "hk-server", kind: "server-rack", title: "Server" }} theme="midnight" width="100%" height="100%" />),
    traveler: "#8fc8ff",
    claim: { id: "next-hop", concept: "IP forwarding", claim: "Each router decides only the next hop, not the whole route." },
    fact: { id: "hops", value: "~15", unit: "router hops", illustrative: true, display: "~15", caption: "A web request can cross about 15 routers." },
    evidence: { lines: ["PACKET HEADER", "Source  198.51.100.4", "Destination  203.0.113.7", "TTL  57"], focusLine: 2, caption: "This address is all a router reads." },
    actionCaption: "Where is this packet going, and who decides?",
    mechanismCaption: "Each router checks its table and forwards the packet one hop.",
    payoffCaption: "No router knows the whole route, only the next hop.", payoffCard: "Next hop only",
    summary: "A packet travels from a router to a server; each router forwards it one hop using only the destination address.",
  },
  finance: {
    a: obj(<FinanceObject2D spec={{ id: "hk-savings", kind: "savings-account", title: "Balance" }} theme="midnight" width="100%" height="100%" />),
    b: obj(<FinanceObject2D spec={{ id: "hk-growth", kind: "growth", title: "Growth" }} theme="midnight" width="100%" height="100%" />),
    traveler: "#ffd166",
    claim: { id: "interest-on-interest", concept: "compound interest", claim: "Compounding pays interest on earlier interest." },
    fact: { id: "double-time", value: 12, unit: "years to double at 6%", sourceId: "Rule of 72: 72 ÷ 6 (exact: 11.9)", display: "≈12 yrs", caption: "At 6%, money doubles in about 12 years." },
    evidence: { lines: ["SAVINGS · 6% A YEAR", "Year 1 interest  $60.00", "Year 2 interest  $63.60", "Balance  $1,123.60"], focusLine: 2, caption: "Why is year two's interest more than $60?" },
    actionCaption: "This balance is already earning on its own interest.",
    mechanismCaption: "Each year's interest joins the balance, then earns too.",
    payoffCaption: "Year two earns on $1,060, not on $1,000.", payoffCard: "Interest on interest",
    summary: "A $1,000 balance at 6% earns $60 in year one and $63.60 in year two, because year two's interest is paid on $1,060.",
  },
  logistics: {
    a: obj(<BusinessObject2D spec={{ id: "hk-warehouse", kind: "warehouse", title: "Warehouse" }} theme="midnight" width="100%" height="100%" />),
    b: obj(<BusinessObject2D spec={{ id: "hk-truck", kind: "delivery-truck", title: "Route" }} theme="midnight" width="100%" height="100%" />),
    traveler: "#9be7c4",
    claim: { id: "consolidation", concept: "route consolidation", claim: "Grouping orders onto one planned route replaces separate trips." },
    fact: { id: "pallets", value: "~26", unit: "pallets per trailer", illustrative: true, display: "~26", caption: "One trailer can carry about 26 pallets." },
    evidence: { lines: ["SHIPPING LABEL", "Order  4471", "Route 7 · Stop 3 of 12", "Zone  North"], focusLine: 2, caption: "Why is this parcel stop three of twelve?" },
    actionCaption: "This parcel is already leaving. Which truck takes it?",
    mechanismCaption: "Orders are grouped by area, then loaded in stop order.",
    payoffCaption: "One planned route replaces a dozen separate trips.", payoffCard: "1 route · 12 stops",
    summary: "Parcels leave a warehouse on one truck; orders are grouped by area and loaded in stop order so one route replaces many trips.",
  },
};
function hookRoles(opening: Opening, content: TopicContent): HookRoles {
  switch (opening) {
    case "action-first": return { strategy: "action-first", actor: "traveler", focus: "b", startProgress: 0.35 };
    case "impact-statistic": return { strategy: "impact-statistic", metric: "metric", context: "b", fact: content.fact };
    case "evidence-question": return { strategy: "evidence-question", evidence: "evidence", focus: "evidence" };
  }
}
const hookCaption = (opening: Opening, c: TopicContent) => opening === "action-first" ? c.actionCaption : opening === "impact-statistic" ? c.fact.caption : c.evidence.caption;

function production(content: TopicContent, opening: ShortHookCompilation["plan"]["principles"]["opening"], hookSubjects: string[]): PrincipledProduction {
  return { id: "short", totalFrames: TOTAL, closingShotId: "payoff", closingOutcomeIds: [content.claim.id], outcomes: [content.claim], shots: [
    { id: "hook", startFrame: 0, endFrame: HOOK, purpose: "attract-attention", visualObjective: "Open on the subject with a question",
      criticalSubjects: opening.visibleSubjectIds, subjectIds: ["a", "b", ...hookSubjects], actions: ["hook"], releasedSubjectIds: hookSubjects },
    { id: "mechanism", startFrame: HOOK, endFrame: 300, purpose: "explain-causality", visualObjective: "Show the step that causes the result",
      criticalSubjects: ["a", "b", "flow"], actions: ["travel"], releasedSubjectIds: ["flow"] },
    { id: "payoff", startFrame: 300, endFrame: TOTAL, purpose: "deliver-payoff", visualObjective: "State the answer on the subject",
      criticalSubjects: ["b", "payoff"], subjectIds: ["a", "b", "payoff"], actions: ["answer"], outcomeIds: [content.claim.id] },
  ] };
}
const key = (frame: number, value: MotionValue) => [frame, value] as const;
const anim = (id: string, targetId: string, property: string, valueType: DirectorAnimation["track"]["valueType"], keys: (readonly [number, MotionValue])[]): DirectorAnimation =>
  ({ kind: "animation", id, track: { id, targetId, property, valueType, easing: "ease-in-out-cubic", keyframes: keys.map(([frame, value]) => ({ frame, value })) } });

/** Hook + shared body as one MotionDirection. The body continues every hook channel from plan.endState. */
function buildFilm(topic: Topic, opening: Opening) {
  const content = TOPICS[topic];
  const subjects = opening === "action-first" ? ["traveler", "b"] : opening === "impact-statistic" ? ["metric", "b"] : ["evidence"];
  const hookOnly = subjects.filter(id => id !== "b");
  const draft = compileShortHook({ id: "hook", fps: FPS, durationFrames: HOOK, claimId: content.claim.id, payoffId: "payoff",
    subjectIds: [...new Set(subjects)], roles: hookRoles(opening, content) });
  const prod = production(content, draft.plan.principles.opening, hookOnly);
  const hook = compileShortHook({ id: "hook", fps: FPS, durationFrames: HOOK, claimId: content.claim.id, payoffId: "payoff",
    subjectIds: [...new Set(subjects)], roles: hookRoles(opening, content) },
  { production: prod, outputs: [{ profile: PROFILE, layout: { ...LAYOUT, metric: LAYOUT.card, evidence: LAYOUT.card } }] });
  const end = hook.plan.endState, last = TOTAL - HOOK - 1;
  const from = (k: string, rest: number) => typeof end[k] === "number" ? end[k] as number : rest;
  const body = AnimationGroup({ id: "body", at: HOOK, mode: "parallel", durationFrames: TOTAL - HOOK, children: [
    anim("body/flow/opacity", "flow", "opacity", "opacity", [key(0, 0), key(8, 1), key(196, 1), key(206, 0), key(last, 0)]),
    anim("body/flow/progress", "flow", "progress", "number", [key(0, 0), key(200, 1), key(last, 1)]),
    anim("body/b/emphasis", "b", "emphasis", "number", [key(0, from("b.emphasis", 0)), key(12, 0), key(210, 0), key(224, 1), key(last, 1)]),
    anim("body/payoff/opacity", "payoff", "opacity", "opacity", [key(0, 0), key(210, 0), key(222, 1), key(last, 1)]),
    ...Object.keys(end).filter(k => hookOnly.some(id => k.startsWith(`${id}.`)) && k.endsWith(".opacity"))
      .map(k => anim(`body/${k}`, k.split(".")[0], "opacity", "opacity", [key(0, end[k]), key(8, 0), key(last, 0)])),
  ] });
  const direction: MotionDirection = { schemaVersion: 1, id: `short-${topic}-${opening}`, title: content.claim.claim, fps: FPS, durationFrames: TOTAL,
    targets: ["a", "b", "traveler", "flow", "metric", "evidence", "payoff"], children: [hook.node, body] };
  const film = compileMotionDirector(direction);
  const captions: CaptionTrack = { id: `cap-${topic}-${opening}`, fps: FPS, timing: { source: "manual", reference: "authored demo timing" }, cues: [
    { id: "hook", startFrame: 0, endFrame: HOOK, text: hookCaption(opening, content), lang: "en" },
    { id: "mechanism", startFrame: 96, endFrame: 296, text: content.mechanismCaption, lang: "en" },
    { id: "payoff", startFrame: 306, endFrame: TOTAL - 4, text: content.payoffCaption, lang: "en" },
  ] };
  return { content, hook, prod, film, captions, hookOnly };
}

/* ---------------- scene adapter: samples → positioned elements ---------------- */
const num = (samples: Record<string, MotionSample>, k: string, rest: number) => { const v = samples[k]?.value; return typeof v === "number" ? v : rest; };
const place = (r: Rect): CSSProperties => ({ position: "absolute", left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` });
const card: CSSProperties = { boxSizing: "border-box", borderRadius: "2.4cqw", background: "rgba(16, 24, 38, 0.86)", border: "0.25cqw solid rgba(143, 200, 255, 0.28)",
  color: "#f4f7fb", fontFamily: "var(--km-font-body, system-ui, sans-serif)", display: "grid", alignContent: "center", padding: "0 4.5cqw" };

function Scene({ samples, content }: { samples: Record<string, MotionSample>; content: TopicContent }) {
  const visible = (id: string, rest: number) => num(samples, `${id}.opacity`, rest);
  const glow = (id: string) => num(samples, `${id}.emphasis`, 0);
  const pathPoint = (p: number) => ({ x: LAYOUT.a.x + LAYOUT.a.width, y: LAYOUT.traveler.y + LAYOUT.traveler.height / 2, w: LAYOUT.b.x - LAYOUT.a.x - LAYOUT.a.width, p });
  const dot = (id: string) => {
    const opacity = visible(id, 0), p = num(samples, `${id}.progress`, 0), pt = pathPoint(p);
    return opacity > 0 ? <div key={id} style={{ position: "absolute", left: `${(pt.x + pt.w * p) * 100}%`, top: `${pt.y * 100}%`, width: "4.4cqw", height: "4.4cqw", marginLeft: "-2.2cqw", marginTop: "-2.2cqw",
      borderRadius: "1.2cqw", background: content.traveler, boxShadow: `0 0 3cqw ${content.traveler}`, opacity }} /> : null;
  };
  const emphasis = (id: string): CSSProperties => ({ borderRadius: "3cqw", boxShadow: `0 0 0 0.5cqw rgba(255, 209, 102, ${0.85 * glow(id)}), 0 0 6cqw rgba(255, 209, 102, ${0.35 * glow(id)})` });
  const ev = visible("evidence", 0), metric = visible("metric", 0), payoff = visible("payoff", 0), focus = glow("evidence");
  return <>
    <svg viewBox="0 0 1080 1920" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <line x1={(LAYOUT.a.x + LAYOUT.a.width) * 1080} x2={LAYOUT.b.x * 1080} y1={(LAYOUT.traveler.y + LAYOUT.traveler.height / 2) * 1920} y2={(LAYOUT.traveler.y + LAYOUT.traveler.height / 2) * 1920}
        stroke="rgba(143, 200, 255, 0.35)" strokeWidth={6} strokeDasharray="4 18" strokeLinecap="round" />
    </svg>
    <div style={{ ...place(LAYOUT.a), opacity: visible("a", 1) }}>{content.a}</div>
    <div style={{ ...place(LAYOUT.b), opacity: visible("b", 1), ...emphasis("b") }}>{content.b}</div>
    {dot("traveler")}{dot("flow")}
    {metric > 0 ? <div style={{ ...place(LAYOUT.card), ...card, opacity: metric }}>
      <div style={{ fontSize: "11cqw", fontWeight: 700, lineHeight: 1.05, color: "#ffd166" }}>{content.fact.display}</div>
      <div style={{ fontSize: "4cqw", fontWeight: 500, opacity: 0.9 }}>{content.fact.unit}</div>
      <div style={{ fontSize: "2.8cqw", opacity: 0.7, marginTop: "1cqw" }}>{content.fact.illustrative ? "Illustrative figure" : `Source: ${content.fact.sourceId}`}</div>
    </div> : null}
    {ev > 0 ? <div style={{ ...place(LAYOUT.card), ...card, opacity: ev, gap: "0.6cqw", fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>
      {content.evidence.lines.map((line, i) => <div key={i} style={{ fontSize: i === 0 ? "2.8cqw" : "3.8cqw", letterSpacing: i === 0 ? "0.1em" : 0, opacity: i === 0 ? 0.7 : 1, borderRadius: "1cqw", padding: "0.3cqw 1.2cqw", marginLeft: "-1.2cqw",
        background: i === content.evidence.focusLine ? `rgba(255, 209, 102, ${0.28 * focus})` : "transparent", color: i === content.evidence.focusLine && focus > 0.5 ? "#ffd166" : undefined }}>{line}</div>)}
    </div> : null}
    {payoff > 0 ? <div style={{ ...place(LAYOUT.card), ...card, opacity: payoff, justifyItems: "start" }}>
      <div style={{ fontSize: "2.8cqw", letterSpacing: "0.1em", opacity: 0.7 }}>THE ANSWER</div>
      <div style={{ fontSize: "8cqw", fontWeight: 700, lineHeight: 1.1, color: "#9be7c4" }}>{content.payoffCard}</div>
    </div> : null}
  </>;
}

const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const ink = { error: "var(--km-text-danger, #b91c1c)", warning: "var(--km-status-warning, #b45309)" };
function usePlayback(duration: number, initial: number) {
  const [frame, setFrame] = useState(initial);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= duration - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * FPS.num / 1000);
      if (next >= duration) { setFrame(duration - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  return { frame, setFrame: (f: number) => { setPlaying(false); setFrame(f); }, playing, toggle: () => setPlaying(p => !p) };
}

interface Args { topic: Topic; opening: Opening; guides: boolean; startFrame: number }
function ShortExplainer({ topic, opening, guides, startFrame }: Args) {
  const built = useMemo(() => buildFilm(topic, opening), [topic, opening]);
  const { content, hook, prod, film, captions, hookOnly } = built;
  const { frame, setFrame, playing, toggle } = usePlayback(TOTAL, startFrame);
  const [captionIssues, setCaptionIssues] = useState<CaptionDiagnostic[]>([]);
  const report = useMemo(() => {
    if (!film.ok) return undefined;
    const at = (f: number, ids: string[]) => ({ frame: f, subjects: Object.fromEntries(ids.map(id => [id, LAYOUT[["metric", "evidence", "payoff"].includes(id) ? "card" : id]])) });
    const manifest: ExplainerPrinciplesManifest = { schemaVersion: 1, fps: FPS, production: prod, ...hook.plan.principles,
      outputs: [{ id: PROFILE.id, width: PROFILE.width, height: PROFILE.height, composition: "authored",
        exclusionZones: PROFILE.reserved.map(r => ({ id: r.id, rect: { x: r.rect.x * 1080, y: r.rect.y * 1920, width: r.rect.width * 1080, height: r.rect.height * 1920 } })),
        samples: [at(0, ["a", "b", ...hookOnly]), at(150, ["a", "b", "flow"]), at(380, ["a", "b", "payoff"])]
          .map(s => ({ ...s, subjects: Object.fromEntries(Object.entries(s.subjects).map(([id, r]) => [id, { x: r.x * 1080, y: r.y * 1920, width: r.width * 1080, height: r.height * 1920 }])) })) }],
      accessibility: { reducedMotion: "static-equivalent", textSummary: content.summary },
      requirements: [{ capability: "font:body", kind: "font" }], facts: opening === "impact-statistic" ? [content.fact] : [] };
    const principles = inspectExplainerPrinciples(manifest, { availableCapabilities: ["font:body"] });
    const parity = inspectSeekParity(() => f => evaluateMotionDirector(film.director, f).evaluation.samples, { durationFrames: TOTAL, sampleCount: 48, seed: 7 });
    return { principles, parity };
  }, [film, prod, hook, content, hookOnly, opening]);
  const problems = [...hook.diagnostics.filter(d => d.code !== "hook-payoff-unverified"), ...(film.ok ? [] : film.diagnostics), ...(report?.principles.diagnostics ?? []), ...(report?.parity.diagnostics ?? []), ...captionIssues];
  const beat = hook.plan.beats.find(b => frame >= b.startFrame && frame < b.endFrame);
  const shot = prod.shots.find(s => frame >= s.startFrame && frame < s.endFrame);
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <figure style={{ margin: 0, width: "100%", maxWidth: 360, display: "grid", gap: 8 }}>
        <ShortSafeFrame profile={PROFILE} guides={guides} aria-label={content.summary}
          style={{ borderRadius: 12, background: "radial-gradient(120% 90% at 30% 20%, #23324a 0%, #111a29 60%, #0b111c 100%)" }}>
          {film.ok ? <MotionDirector director={film.director} frame={frame} style={{ position: "absolute", inset: 0 }}>
            {({ evaluation }) => <Scene samples={evaluation.samples} content={content} />}
          </MotionDirector> : null}
          <CaptionPerformer track={captions} frame={frame} highlight="phrase" onDiagnostics={setCaptionIssues} avoidRegions={[LAYOUT.a, LAYOUT.b, LAYOUT.card]} style={{ ["--km-caption-font-size" as string]: "5cqw" }} />
        </ShortSafeFrame>
        <figcaption style={note}>1080×1920 · {shot?.id}{beat ? ` · hook beat: ${beat.role}` : ""}</figcaption>
      </figure>
      <div style={{ display: "grid", gap: 12, flex: "1 1 320px", minWidth: 280, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={toggle} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
          <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame} / {TOTAL - 1}</span>
        </div>
        <label style={{ display: "grid", gap: 4, fontWeight: 500, fontSize: 13 }}>Seek
          <input type="range" min={0} max={TOTAL - 1} value={frame} onChange={e => setFrame(Number(e.target.value))} />
        </label>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 12px" }}>
          <dt style={{ fontWeight: 600 }}>Claim</dt><dd style={{ margin: 0 }}>{content.claim.claim}</dd>
          <dt style={{ fontWeight: 600 }}>Hook</dt><dd style={{ margin: 0 }}>{hook.plan.strategy} · {hook.plan.beats.map(b => `${b.role} ${b.startFrame}–${b.endFrame}`).join(", ")}</dd>
          <dt style={{ fontWeight: 600 }}>Payoff</dt><dd style={{ margin: 0 }}>shot “{hook.plan.payoffId}” resolves “{hook.plan.claimId}”</dd>
          <dt style={{ fontWeight: 600 }}>Seek parity</dt><dd style={{ margin: 0 }}>{report ? `${report.parity.frames.length} frames sampled in random order, ${report.parity.ok ? "all equal forward play" : "MISMATCH"}` : "—"}</dd>
        </dl>
        {problems.length ? <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>{problems.map((d, i) =>
          <li key={i}><strong style={{ color: ink[d.severity] }}>{d.code}</strong> — {d.message}</li>)}</ul>
          : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>No problems.</p>}
        <p style={note}>Captions use authored demo timing (phrase level). Facts marked “illustrative” are example figures, not sourced data.</p>
      </div>
    </div>
  </section>;
}

/* ---------------- reference: all five strategies on abstract subjects ---------------- */
const ABSTRACT_ROLES: Record<ShortHookStrategy, HookRoles> = {
  "action-first": { strategy: "action-first", actor: "a", focus: "b" },
  "unexpected-reveal": { strategy: "unexpected-reveal", familiar: "a", reveal: "b" },
  "impact-statistic": { strategy: "impact-statistic", metric: "a", context: "b", fact: { id: "example", value: 1, unit: "example unit", illustrative: true }, countUpFrames: 20 },
  "transformation": { strategy: "transformation", before: "a", after: "b" },
  "evidence-question": { strategy: "evidence-question", evidence: "a", focus: "b" },
};
function StrategyReference() {
  const { frame, setFrame, playing, toggle } = usePlayback(HOOK, 60);
  const hooks = useMemo(() => SHORT_HOOK_STRATEGIES.map(strategy => compileShortHook({ id: "hook", fps: FPS, durationFrames: HOOK, claimId: "claim", payoffId: "payoff",
    surprise: "A familiar object hides an unexpected part.", subjectIds: ["a", "b", "q"], questionId: "q", roles: ABSTRACT_ROLES[strategy] })), []);
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={toggle} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={HOOK - 1} value={frame} onChange={e => setFrame(Number(e.target.value))} style={{ flex: "1 1 240px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame}</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 16 }}>
      {hooks.map(h => {
        const s = h.compiled ? evaluateMotionDirector(h.compiled, frame).evaluation.samples : {};
        const beat = h.plan.beats.find(b => frame >= b.startFrame && frame < b.endFrame);
        const subject = (id: string, shape: "circle" | "square", x: number) => {
          const offset = s[`${id}.offset`]?.value as { x: number; y: number } | undefined;
          return <div style={{ position: "absolute", left: `${x}%`, top: "24%", width: "34%", aspectRatio: "1", borderRadius: shape === "circle" ? "50%" : "18%",
            background: shape === "circle" ? "#8fc8ff" : "#9be7c4", opacity: num(s, `${id}.opacity`, 0),
            transform: `translate(${(offset?.x ?? 0) / 4}px, ${(offset?.y ?? 0) / 4}px) scale(${num(s, `${id}.scale`, 1)})`,
            boxShadow: `0 0 0 4px rgba(255, 209, 102, ${num(s, `${id}.emphasis`, 0)})` }}>
            {s[`${id}.progress`] ? <div style={{ position: "absolute", left: "10%", right: "10%", bottom: "-18%", height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)" }}>
              <div style={{ width: `${num(s, `${id}.progress`, 0) * 100}%`, height: "100%", borderRadius: 2, background: "#ffd166" }} /></div> : null}
          </div>;
        };
        return <figure key={h.plan.strategy} style={{ margin: 0, display: "grid", gap: 6 }}>
          <div role="img" aria-label={`${h.plan.strategy} hook at frame ${frame}`} style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: 12, overflow: "hidden", background: "#111a29" }}>
            {subject("a", "circle", 10)}{subject("b", "square", 56)}
            <div style={{ position: "absolute", left: "12%", right: "12%", top: "74%", height: "8%", borderRadius: 6, background: "#f4f7fb", opacity: num(s, "q.opacity", 0) }} />
          </div>
          <figcaption style={{ display: "grid" }}><strong>{h.plan.strategy}</strong><span style={note}>beat: {beat?.role} · opening: {h.plan.principles.opening.visibleSubjectIds.join(", ")}</span></figcaption>
        </figure>;
      })}
    </div>
    <p style={note}>Circle = opening subject, square = second subject, bar = question element. Yellow ring = emphasis; yellow bar = progress.</p>
  </section>;
}

const meta = {
  title: "Video production/Short Hook Director", id: "visual-short-hook-director", component: ShortExplainer, parameters: { layout: "fullscreen" },
  argTypes: {
    topic: { control: "inline-radio", options: ["technology", "finance", "logistics"] },
    opening: { control: "inline-radio", options: ["action-first", "impact-statistic", "evidence-question"] },
    startFrame: { control: { type: "number", min: 0, max: TOTAL - 1 } },
  },
  args: { topic: "technology", opening: "action-first", guides: false, startFrame: 30 },
} satisfies Meta<typeof ShortExplainer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ShortExplainerStory: Story = { name: "15-second explainer" };
export const StrategyReferenceStory: Story = { name: "Strategy reference", render: () => <StrategyReference /> };
